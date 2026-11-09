/**
 * Service de gestion des comptes utilisateurs (100 % local).
 *
 * Fonctionnalités :
 * - Création de compte avec hachage PBKDF2/SHA-256
 * - Vérification des identifiants
 * - Gestion de session persistante
 * - Reprise de session
 */

import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { selectionner } from "./shared";

export interface Compte {
  id_compte: string;
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  hash_mot_de_passe: string;
  sel: string;
  date_creation: string;
}

export interface SessionUtilisateur {
  compte_id: string;
  email: string;
  date_connexion: string;
}

export interface DonneesCreationCompte {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  mot_de_passe: string;
}

export interface DonneesConnexion {
  email: string;
  mot_de_passe: string;
}

const CLE_SESSION = "gestion_scolaire_session";
const ITERATIONS_PBKDF2 = 100000;
const LONGUEUR_HASH = 32; // 256 bits

/**
 * Génère un sel aléatoire pour le hachage.
 */
async function genererSel(): Promise<string> {
  const sel = new Uint8Array(16);
  crypto.getRandomValues(sel);
  return Array.from(sel)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hache un mot de passe avec PBKDF2/SHA-256.
 */
async function hacherMotDePasse(
  motDePasse: string,
  sel: string
): Promise<string> {
  const encoder = new TextEncoder();
  const selBytes = new Uint8Array(
    sel.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
  );
  const motDePasseBytes = encoder.encode(motDePasse);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    motDePasseBytes,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: selBytes,
      iterations: ITERATIONS_PBKDF2,
      hash: "SHA-256",
    },
    baseKey,
    LONGUEUR_HASH * 8
  );

  const hashArray = new Uint8Array(derivedBits);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Vérifie un mot de passe contre un hash.
 */
async function verifierMotDePasse(
  motDePasse: string,
  hash: string,
  sel: string
): Promise<boolean> {
  const hashCalcule = await hacherMotDePasse(motDePasse, sel);
  return hashCalcule === hash;
}

/**
 * Génère un UUID v4.
 */
function genererUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
}

export function creerServiceCompte(database: SQLiteExecutor) {
  return {
    /**
     * Crée un nouveau compte.
     */
    async creer(donnees: DonneesCreationCompte): Promise<Compte> {
      const sel = await genererSel();
      const hash = await hacherMotDePasse(donnees.mot_de_passe, sel);

      const idCompte = genererUUID();
      const dateCreation = new Date().toISOString();

      await database.query(
        `INSERT INTO compte_utilisateur 
         (id_compte, prenom, nom, telephone, email, hash_mot_de_passe, sel, date_creation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          idCompte,
          donnees.prenom,
          donnees.nom,
          donnees.telephone,
          donnees.email,
          hash,
          sel,
          dateCreation,
        ]
      );

      return {
        id_compte: idCompte,
        prenom: donnees.prenom,
        nom: donnees.nom,
        telephone: donnees.telephone,
        email: donnees.email,
        hash_mot_de_passe: hash,
        sel,
        date_creation: dateCreation,
      };
    },

    /**
     * Vérifie les identifiants et crée une session.
     */
    async connecter(donnees: DonneesConnexion): Promise<SessionUtilisateur> {
      const rows = await selectionner<Compte>(
        database,
        "SELECT * FROM compte_utilisateur WHERE email = ?;",
        [donnees.email]
      );

      if (rows.length === 0) {
        throw new Error("Identifiants invalides.");
      }

      const compte = rows[0];
      const valide = await verifierMotDePasse(
        donnees.mot_de_passe,
        String(compte.hash_mot_de_passe),
        String(compte.sel)
      );

      if (!valide) {
        throw new Error("Identifiants invalides.");
      }

      const session: SessionUtilisateur = {
        compte_id: String(compte.id_compte),
        email: String(compte.email),
        date_connexion: new Date().toISOString(),
      };

      localStorage.setItem(CLE_SESSION, JSON.stringify(session));
      return session;
    },

    /**
     * Récupère un compte par email.
     */
    async recupererParEmail(email: string): Promise<Compte | null> {
      const rows = await selectionner<Compte>(
        database,
        "SELECT * FROM compte_utilisateur WHERE email = ?;",
        [email]
      );
      return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Vérifie si un compte existe.
     */
    async existe(email: string): Promise<boolean> {
      const compte = await this.recupererParEmail(email);
      return compte !== null;
    },
  };
}

/**
 * Déconnecte l'utilisateur.
 */
export function deconnecter(): void {
  localStorage.removeItem(CLE_SESSION);
}

/**
 * Récupère la session active.
 */
export function recupererSession(): SessionUtilisateur | null {
  const donnees = localStorage.getItem(CLE_SESSION);
  return donnees ? JSON.parse(donnees) : null;
}
