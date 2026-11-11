/**
 * Tests du service de gestion des comptes utilisateurs.
 *
 * Stratégie :
 * - WebCrypto RÉEL de Node (node:crypto webcrypto) : les tests valident le
 *   vrai hachage PBKDF2/SHA-256, pas un simulacre qui se contredit ;
 * - faux exécuteur SQLite qui STOCKE les INSERT et répond aux SELECT à
 *   partir du stockage : les tests de connexion sont un vrai aller-retour
 *   (créer un compte, puis se connecter avec le même mot de passe).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { creerServiceCompte, deconnecter, recupererSession } from "./compte.service";
import type { Compte, DonneesCreationCompte, DonneesConnexion } from "./compte.service";

// Mock de localStorage pour l'environnement Node.js
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
});

// WebCrypto global : Node (>= 19, exigé par Vite 8) et les navigateurs
// exposent déjà crypto.subtle et crypto.getRandomValues — le service et
// les tests utilisent le même global, comme en production.
vi.stubGlobal("crypto", globalThis.crypto);

// Petit stockage en mémoire qui joue le rôle de la table compte_utilisateur.
let comptesEnBase: Compte[] = [];

// Mock de l'exécuteur SQLite : les INSERT alimentent le stockage, les
// SELECT y puisent — exactement comme le ferait la vraie base.
const mockQuery = vi.fn();
mockQuery.mockImplementation(async (sql: string, bind: unknown[] = []) => {
  const normalise = sql.trim().toUpperCase();

  if (normalise.startsWith("INSERT")) {
    const [
      idCompte,
      prenom,
      nom,
      telephone,
      email,
      hashMotDePasse,
      sel,
      dateCreation,
    ] = bind as [string, string, string, string, string, string, string, string];

    comptesEnBase.push({
      id_compte: idCompte,
      prenom,
      nom,
      telephone,
      email,
      hash_mot_de_passe: hashMotDePasse,
      sel,
      date_creation: dateCreation,
    });

    return [];
  }

  if (normalise.startsWith("SELECT")) {
    const email = typeof bind[0] === "string" ? bind[0] : null;
    return comptesEnBase.filter((compte) =>
      email ? compte.email === email : true,
    );
  }

  return [];
});

const mockTransaction = vi.fn();

const mockDatabase = {
  query: mockQuery,
  transaction: mockTransaction,
};

const donneesValides: DonneesCreationCompte = {
  prenom: "Jean",
  nom: "Dupont",
  telephone: "+242 06 00 00 00 00",
  email: "jean@example.com",
  mot_de_passe: "motdepasse123456",
};

async function creerCompteValide(): Promise<void> {
  await creerServiceCompte(mockDatabase).creer(donneesValides);
}

describe("Service Compte", () => {
  beforeEach(() => {
    // Réinitialiser le stockage et localStorage avant chaque test
    comptesEnBase = [];
    localStorage.clear();
    mockQuery.mockClear();
    mockTransaction.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Création de compte", () => {
    it("devrait créer un compte avec hachage PBKDF2", async () => {
      const service = creerServiceCompte(mockDatabase);

      const compte = await service.creer(donneesValides);

      expect(compte.prenom).toBe("Jean");
      expect(compte.nom).toBe("Dupont");
      expect(compte.email).toBe("jean@example.com");
      expect(compte.hash_mot_de_passe).toBeDefined();
      expect(compte.sel).toBeDefined();
      expect(compte.hash_mot_de_passe).not.toBe(donneesValides.mot_de_passe); // Le mot de passe ne doit pas être en clair
      // Le hash PBKDF2/SHA-256 sur 256 bits donne 64 caractères hexadécimaux
      expect(compte.hash_mot_de_passe).toMatch(/^[0-9a-f]{64}$/);
      // Le sel est un sel de 16 octets, soit 32 caractères hexadécimaux
      expect(compte.sel).toMatch(/^[0-9a-f]{32}$/);
      expect(mockQuery).toHaveBeenCalled();
    });

    it("devrait vérifier si un compte existe déjà", async () => {
      const service = creerServiceCompte(mockDatabase);

      await creerCompteValide();

      const existe = await service.existe(donneesValides.email);
      expect(existe).toBe(true);
    });

    it("devrait indiquer qu'un compte n'existe pas", async () => {
      const service = creerServiceCompte(mockDatabase);

      const existe = await service.existe("inconnu@example.com");
      expect(existe).toBe(false);
    });
  });

  describe("Connexion", () => {
    it("devrait connecter avec des identifiants valides", async () => {
      const service = creerServiceCompte(mockDatabase);

      await creerCompteValide();

      const donnees: DonneesConnexion = {
        email: "jean@example.com",
        mot_de_passe: "motdepasse123456",
      };

      const session = await service.connecter(donnees);

      expect(session.email).toBe("jean@example.com");
      expect(session.compte_id).toBe(comptesEnBase[0].id_compte);
      expect(localStorage.getItem("gestion_scolaire_session")).toBeTruthy();
    });

    it("devrait échouer avec un email invalide", async () => {
      const service = creerServiceCompte(mockDatabase);

      const donnees: DonneesConnexion = {
        email: "inconnu@example.com",
        mot_de_passe: "motdepasse123456",
      };

      await expect(service.connecter(donnees)).rejects.toThrow("Identifiants invalides");
    });

    it("devrait échouer avec un mot de passe invalide", async () => {
      const service = creerServiceCompte(mockDatabase);

      await creerCompteValide();

      const donnees: DonneesConnexion = {
        email: "jean@example.com",
        mot_de_passe: "mauvais_mot_de_passe",
      };

      await expect(service.connecter(donnees)).rejects.toThrow("Identifiants invalides");
    });
  });

  describe("Gestion de session", () => {
    it("devrait persister la session après connexion", async () => {
      const service = creerServiceCompte(mockDatabase);

      await creerCompteValide();

      const donnees: DonneesConnexion = {
        email: "jean@example.com",
        mot_de_passe: "motdepasse123456",
      };

      await service.connecter(donnees);
      const session = recupererSession();

      expect(session).toBeTruthy();
      expect(session?.email).toBe("jean@example.com");
    });

    it("devrait supprimer la session après déconnexion", async () => {
      localStorage.setItem(
        "gestion_scolaire_session",
        JSON.stringify({ email: "jean@example.com", compte_id: "123" })
      );

      deconnecter();
      const session = recupererSession();

      expect(session).toBeNull();
    });

    it("devrait retourner null si aucune session n'existe", () => {
      const session = recupererSession();
      expect(session).toBeNull();
    });
  });
});
