/**
 * Catalogue des matières courantes au Congo-Brazzaville, utilisé par la
 * page « Matières » pour la création en une minute : on coche, on ajoute.
 *
 * Sources consultées (13 novembre 2026) :
 * - Complexe Scolaire Regard d'Afrique (Brazzaville), page « Collège » :
 *   mathématiques, histoire-géographie, SVT, anglais, espagnol, chinois,
 *   arts plastiques, musique, informatique, EPS, sciences physiques
 *   (https://ecoleregardafrique.cg/cycle/college) ;
 * - Groupe Scolaire REMO (Brazzaville), page « Lycée » : français,
 *   mathématiques, philosophie, histoire-géographie, sciences physiques,
 *   SVT, langues vivantes, éducation physique ; séries A, C et D
 *   (https://ecoleremo.com/lycee) ;
 * - ecolesAuCongo.com, page « Séries » : A (lettres et philosophie),
 *   C (maths et sciences physiques), D (maths et SVT)
 *   (https://ecolesaucongo.com/series.html) ;
 * - loi n° 20/80 (art. 4) et décret du 15 octobre 2015 : le lingala et
 *   le kituba sont les langues nationales véhiculaires du Congo,
 *   enseignées comme disciplines dans plusieurs écoles
 *   (https://www.axl.cefan.ulaval.ca/afrique/congo.htm).
 *
 * Deux mises en garde honnêtes :
 * - le catalogue est une aide au choix, pas le programme officiel :
 *   l'école renomme (un clic sur le nom) ou complète librement ;
 * - les sous-disciplines du collège (orthographe, expression écrite,
 *   activité de lecture…) ne sont pas cochables ici pour garder la liste
 *   courte : elles se créent en une ligne via « Une matière absente de
 *   la liste ? ». La discipline civique est proposée sous la
 *   dénomination la plus répandue (« Éducation civique et morale ») ;
 *   une école qui emploie « ECMP » ou « ECDH » renomme la matière en un
 *   clic après l'avoir cochée.
 */

export const CATEGORIES_MATIERES = [
  "Langues",
  "Sciences",
  "Humanités",
  "Arts et sport",
] as const;

export type CategorieMatiere = (typeof CATEGORIES_MATIERES)[number];

export interface MatiereProposee {
  libelle: string;
  code: string;
  categorie: CategorieMatiere;
}

export type CycleId = "primaire" | "college" | "lycee";

export interface OngletCycle {
  id: CycleId;
  libelle: string;
  sousTitre: string;
}

export const ONGLETS_CYCLES: OngletCycle[] = [
  { id: "primaire", libelle: "Primaire", sousTitre: "CP1 → CM2" },
  { id: "college", libelle: "Collège", sousTitre: "6e → 3e" },
  { id: "lycee", libelle: "Lycée", sousTitre: "2nde → Terminale" },
];

export const CATALOGUE_MATIERES: Record<CycleId, MatiereProposee[]> = {
  primaire: [
    { libelle: "Français", code: "FRA", categorie: "Langues" },
    { libelle: "Anglais", code: "ANG", categorie: "Langues" },
    { libelle: "Kituba", code: "KIT", categorie: "Langues" },
    { libelle: "Lingala", code: "LIN", categorie: "Langues" },
    { libelle: "Mathématiques", code: "MATH", categorie: "Sciences" },
    { libelle: "Éveil au milieu", code: "EVE", categorie: "Sciences" },
    { libelle: "Informatique", code: "INFO", categorie: "Sciences" },
    { libelle: "Histoire-Géographie", code: "HGE", categorie: "Humanités" },
    {
      libelle: "Éducation civique et morale",
      code: "ECM",
      categorie: "Humanités",
    },
    { libelle: "Éducation artistique", code: "ART", categorie: "Arts et sport" },
    {
      libelle: "Éducation physique et sportive",
      code: "EPS",
      categorie: "Arts et sport",
    },
  ],

  college: [
    { libelle: "Français", code: "FRA", categorie: "Langues" },
    { libelle: "Anglais", code: "ANG", categorie: "Langues" },
    { libelle: "Espagnol", code: "ESP", categorie: "Langues" },
    { libelle: "Chinois", code: "CHI", categorie: "Langues" },
    { libelle: "Kituba", code: "KIT", categorie: "Langues" },
    { libelle: "Lingala", code: "LIN", categorie: "Langues" },
    { libelle: "Mathématiques", code: "MATH", categorie: "Sciences" },
    { libelle: "Sciences physiques", code: "SPH", categorie: "Sciences" },
    {
      libelle: "Sciences de la Vie et de la Terre",
      code: "SVT",
      categorie: "Sciences",
    },
    { libelle: "Informatique", code: "INFO", categorie: "Sciences" },
    { libelle: "Histoire-Géographie", code: "HGE", categorie: "Humanités" },
    {
      libelle: "Éducation civique et morale",
      code: "ECM",
      categorie: "Humanités",
    },
    { libelle: "Arts plastiques", code: "PLAS", categorie: "Arts et sport" },
    { libelle: "Éducation musicale", code: "MUS", categorie: "Arts et sport" },
    {
      libelle: "Éducation physique et sportive",
      code: "EPS",
      categorie: "Arts et sport",
    },
  ],

  lycee: [
    { libelle: "Français", code: "FRA", categorie: "Langues" },
    { libelle: "Anglais", code: "ANG", categorie: "Langues" },
    { libelle: "Espagnol", code: "ESP", categorie: "Langues" },
    { libelle: "Allemand", code: "ALL", categorie: "Langues" },
    { libelle: "Mathématiques", code: "MATH", categorie: "Sciences" },
    { libelle: "Sciences physiques", code: "SPH", categorie: "Sciences" },
    {
      libelle: "Sciences de la Vie et de la Terre",
      code: "SVT",
      categorie: "Sciences",
    },
    { libelle: "Informatique", code: "INFO", categorie: "Sciences" },
    { libelle: "Histoire-Géographie", code: "HGE", categorie: "Humanités" },
    { libelle: "Philosophie", code: "PHI", categorie: "Humanités" },
    {
      libelle: "Éducation civique et morale",
      code: "ECM",
      categorie: "Humanités",
    },
    { libelle: "Éducation artistique", code: "ART", categorie: "Arts et sport" },
    {
      libelle: "Éducation physique et sportive",
      code: "EPS",
      categorie: "Arts et sport",
    },
  ],
};

/**
 * Suggestion de code dérivée du nom : majuscules, sans accents, sans
 * séparateur, tronquée à 4 caractères. « Français » → FRAN,
 * « Mathématiques » → MATH, « EPS » → EPS, « Éveil au milieu » → EVEI.
 * La proposition reste modifiable : le directeur garde le dernier mot.
 */
export function suggererCode(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

/**
 * Clé de comparaison des noms pour détecter un doublon pendant la frappe,
 * alignée sur la base (COLLATE NOCASE) : trim, espaces compactés,
 * minuscules. « Mathématiques  » et « mathématiques » sont le même nom.
 */
export function normaliserLibelle(valeur: string): string {
  return valeur.trim().replace(/\s+/g, " ").toLowerCase();
}

export interface GroupeCategorie<T> {
  /** Catégorie telle que stockée en base (null = sans catégorie). */
  categorie: string | null;
  /** Libellé affiché de l'en-tête de groupe (« Autres » pour null). */
  libelle: string;
  matieres: T[];
}

/**
 * Regroupe par catégorie dans l'ordre du catalogue (Langues, Sciences,
 * Humanités, Arts et sport), puis les catégories libres par ordre
 * alphabétique, puis « Autres » (sans catégorie) en dernier.
 */
export function grouperParCategorie<T extends { categorie: string | null }>(
  matieres: T[],
): GroupeCategorie<T>[] {
  const groupes = new Map<
    string,
    { categorie: string | null; matieres: T[] }
  >();
  for (const matiere of matieres) {
    const cle = matiere.categorie ?? "";
    if (!groupes.has(cle)) {
      groupes.set(cle, { categorie: matiere.categorie, matieres: [] });
    }
    groupes.get(cle)?.matieres.push(matiere);
  }

  const rangStandard = (categorie: string | null): number => {
    const index = (CATEGORIES_MATIERES as readonly string[]).indexOf(
      categorie ?? "",
    );
    return index === -1 ? CATEGORIES_MATIERES.length : index;
  };

  return [...groupes.values()]
    .sort((a, b) => {
      const rangA = rangStandard(a.categorie);
      const rangB = rangStandard(b.categorie);
      if (rangA !== rangB) return rangA - rangB;
      if (a.categorie === null || b.categorie === null) {
        if (a.categorie === b.categorie) return 0;
        return a.categorie === null ? 1 : -1;
      }
      return a.categorie.localeCompare(b.categorie, "fr");
    })
    .map((groupe) => ({ ...groupe, libelle: groupe.categorie ?? "Autres" }));
}
