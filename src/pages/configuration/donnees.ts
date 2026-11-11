import type { IconType } from "react-icons";
import {
  LuFlag,
  LuLayoutGrid,
  LuSchool,
  LuUserRound,
  LuUsers,
  LuWallet,
} from "react-icons/lu";

/**
 * Données et types du parcours « Configuration initiale » (maquette vidéo) :
 * École → Classes → Frais → Élèves → Équipe → Terminé.
 *
 * Les libellés de classes sont libres côté base (niveau_enseignement,
 * modele_classe et classe_annuelle sont créés à partir du libellé) : aucun
 * changement de base de données n'est nécessaire pour les classes
 * congolaises.
 */

/* ============================== Étapes ============================== */

export type CleEtape =
  | "ecole"
  | "classes"
  | "frais"
  | "eleves"
  | "equipe"
  | "termine";

export interface EtapeDef {
  cle: CleEtape;
  label: string;
  titre: string;
  sousTitre: string;
  icone: IconType;
}

export const ETAPES: EtapeDef[] = [
  {
    cle: "ecole",
    label: "École",
    icone: LuSchool,
    titre: "Votre école",
    sousTitre: "Étape 1 sur 6 — Langue et année scolaire en cours",
  },
  {
    cle: "classes",
    label: "Classes",
    icone: LuLayoutGrid,
    titre: "Vos classes",
    sousTitre: "Étape 2 sur 6 — Les niveaux et les classes de cette année",
  },
  {
    cle: "frais",
    label: "Frais",
    icone: LuWallet,
    titre: "Vos frais de scolarité",
    sousTitre:
      "Étape 3 sur 6 — Définissez vos barèmes et les frais d'inscription",
  },
  {
    cle: "eleves",
    label: "Élèves",
    icone: LuUsers,
    titre: "Vos élèves",
    sousTitre:
      "Étape 4 sur 6 — Ajoutez-en quelques-uns, ou préparez votre fichier Excel",
  },
  {
    cle: "equipe",
    label: "Équipe",
    icone: LuUserRound,
    titre: "Votre équipe",
    sousTitre: "Étape 5 sur 6 — Préparez l'arrivée de votre personnel",
  },
  {
    cle: "termine",
    label: "Terminé",
    icone: LuFlag,
    titre: "Tout est prêt",
    sousTitre: "Étape 6 sur 6 — Votre école est configurée",
  },
];

/* ============================== Référentiels ============================== */

export type Decoupage = "3 trimestres" | "2 semestres" | "Année complète";

export const DECOUPAGES: Decoupage[] = [
  "3 trimestres",
  "2 semestres",
  "Année complète",
];

export const LANGUES = [
  "Français seulement",
  "Français + Anglais",
  "Français + Arabe",
];

export const FREQUENCES = [
  "Une fois",
  "Chaque mois",
  "Chaque trimestre",
  "Chaque année",
];

export const ROLES = ["Directeur", "Enseignant", "Comptable", "Secrétaire"];

/** Congo-Brazzaville : indicatif téléphonique officiel. */
export const INDICATIF_TELEPHONE = "+242";

/* ============================== Systèmes de classes ============================== */

/**
 * Amélioration congo-centrée : le directeur choisit son système de classes.
 * Le système congolais est présélectionné par défaut (la grande majorité
 * des écoles de Brazzaville) ; le système français et la liste libre
 * couvrent les cas particuliers.
 */
export type CleSystemeClasses = "congolais" | "francais" | "libre";

export interface SystemeClasses {
  cle: CleSystemeClasses;
  libelle: string;
  familles: { titre: string; niveaux: string[] }[];
}

export const SYSTEMES_CLASSES: SystemeClasses[] = [
  {
    cle: "congolais",
    libelle: "Système congolais",
    familles: [
      {
        titre: "Préscolaire",
        niveaux: ["Petite Section", "Moyenne Section", "Grande Section"],
      },
      {
        titre: "Primaire",
        niveaux: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
      },
      { titre: "Collège", niveaux: ["6e", "5e", "4e", "3e"] },
      { titre: "Lycée", niveaux: ["Seconde", "Première", "Terminale"] },
    ],
  },
  {
    cle: "francais",
    libelle: "Système français",
    familles: [
      {
        titre: "Préscolaire",
        niveaux: ["Petite Section", "Moyenne Section", "Grande Section"],
      },
      {
        titre: "Primaire",
        niveaux: ["CP", "CE1", "CE2", "CM1", "CM2"],
      },
      { titre: "Collège", niveaux: ["6e", "5e", "4e", "3e"] },
      { titre: "Lycée", niveaux: ["Seconde", "Première", "Terminale"] },
    ],
  },
  {
    cle: "libre",
    libelle: "Ma propre liste",
    familles: [],
  },
];

/* ============================== Données des étapes ============================== */

export interface DonneesEcole {
  nom: string;
  langue: string;
  libelle: string;
  debut: string;
  fin: string;
  decoupage: Decoupage;
}

export interface Bareme {
  id: string;
  intitule: string;
  frequence: string;
  echeance: string;
  montant: string;
  classe: string;
}

export interface FraisInscription {
  mode: "meme" | "parClasse";
  montant: string;
  parClasse: Record<string, string>;
}

export interface DonneesFrais {
  baremes: Bareme[];
  inscription: FraisInscription;
}

export interface EleveBrouillon {
  id: string;
  prenom: string;
  nom: string;
  sexe: string;
  classe: string;
  parent: string;
  telephone: string;
}

export interface DonneesEleves {
  liste: EleveBrouillon[];
  fichier: File | null;
  facturerInscription: boolean;
}

export interface MembreEquipe {
  id: string;
  nom: string;
  email: string;
  role: string;
}

/** Joint des classes conditionnelles (« a", false, "b" → "a b"). */
export function cx(
  ...classes: (string | false | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/* ============================== Utilitaires ============================== */

const MOIS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * « 2026-10-01 » → « 01 octobre 2026 », sans objet Date (déterministe,
 * pur pour le rendu React).
 */
export function formaterIsoVersFrancais(iso: string): string {
  const morceaux = iso.split("-");
  if (morceaux.length !== 3) return iso;
  const [annee, mois, jour] = morceaux;
  const indexMois = Number(mois) - 1;
  const nomMois = MOIS_FR[indexMois] ?? mois;
  return `${jour} ${nomMois} ${annee}`;
}

/** Identifiant lisible pour les clés React (jamais utilisé en base). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Transforme un libellé en identifiant stable (« Grande Section » → « grande-section »). */
export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Année scolaire par défaut, calculée au chargement du module — hors rendu
 * React (pureté) — sur le fuseau Africa/Brazzaville (la rentrée congolaise
 * démarre en octobre ; dès septembre, la nouvelle année est entamée).
 */
export function calculerAnneeScolaireParDefaut(): {
  libelle: string;
  debut: string;
  fin: string;
} {
  const parties = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Brazzaville",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const annee = Number(parties.find((p) => p.type === "year")?.value);
  const mois = Number(parties.find((p) => p.type === "month")?.value);
  const anneeDebut = mois >= 9 ? annee : annee - 1;
  const anneeFin = anneeDebut + 1;

  return {
    libelle: `${anneeDebut}-${anneeFin}`,
    debut: `${anneeDebut}-10-01`,
    fin: `${anneeFin}-06-30`,
  };
}

export const ANNEE_DEFAUT = calculerAnneeScolaireParDefaut();

/** Identifiant de l'établissement unique (application mono-école). */
export const ID_ETABLISSEMENT = "etablissement-principal";

/** Périodes pédagogiques créées selon le découpage choisi à l'étape École. */
export const PERIODES_PAR_DECOUPAGE: Record<
  Decoupage,
  { id: string; libelle: string; ordre: number }[]
> = {
  "3 trimestres": [
    { id: "T1", libelle: "1er trimestre", ordre: 1 },
    { id: "T2", libelle: "2e trimestre", ordre: 2 },
    { id: "T3", libelle: "3e trimestre", ordre: 3 },
  ],
  "2 semestres": [
    { id: "S1", libelle: "1er semestre", ordre: 1 },
    { id: "S2", libelle: "2e semestre", ordre: 2 },
  ],
  "Année complète": [{ id: "AN", libelle: "Année complète", ordre: 1 }],
};

export function nouveauBareme(): Bareme {
  return {
    id: uid(),
    intitule: "",
    frequence: "Une fois",
    echeance: "",
    montant: "",
    classe: "Toutes les classes",
  };
}

/** Un barème est complet quand intitulé, échéance et montant > 0 sont saisis. */
export function auMoinsUnBaremeComplet(baremes: Bareme[]): boolean {
  return baremes.some(
    (b) => b.intitule.trim() !== "" && Number(b.montant) > 0 && b.echeance !== "",
  );
}
