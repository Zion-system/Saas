import * as XLSX from "xlsx";
import type { Genre } from "../services/eleves-responsables/types";

/**
 * Lecture et contrôle d'un fichier d'élèves (étape 4 du parcours de
 * configuration) — le « poste de contrôle aux frontières » :
 *
 * 1. Choisir        : le composant ouvre la fenêtre de fichier ;
 * 2. Lire           : `lireLignesBrutes` décode le classeur en lignes de
 *                     texte, 100 % dans le navigateur (SheetJS), rien ne
 *                     quitte l'appareil ;
 * 3. Contrôler      : `analyserEleves` vérifie chaque ligne (prénom, nom,
 *                     sexe, classe existante, téléphone) et rend trois
 *                     files : élèves prêts, lignes en erreur, doublons ;
 * 4. Doublons       : ignorés par défaut (même prénom + nom + classe que
 *                     la base ou qu'une ligne précédente du fichier) ;
 * 5. Résumer        : le composant affiche les compteurs et importe les
 *                     élèves prêts via le service des dossiers.
 */

/** Colonnes attendues — identiques au modèle téléchargeable. */
export const COLONNES_MODELE = [
  "Prénom",
  "Nom",
  "Sexe",
  "Classe",
  "Nom du parent",
  "Téléphone du parent",
] as const;

/** Protection de performance de la base embarquée : 500 élèves par import. */
export const LIMITE_ELEVES_IMPORT = 500;

export class FichierElevesInvalideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FichierElevesInvalideError";
  }
}

export interface EleveAImporter {
  prenom: string;
  nom: string;
  genre: Genre | null;
  /** Libellé de la classe telle qu'elle existe dans l'école — null : sans classe. */
  classe: string | null;
  parent: string | null;
  telephone: string | null;
}

export interface ErreurLigne {
  ligne: number;
  message: string;
}

export interface DoublonIgnore {
  ligne: number;
  prenom: string;
  nom: string;
  /** « fichier » : déjà vu plus haut dans le même fichier ; « base » : déjà enregistré. */
  motif: "fichier" | "base";
}

export interface ResultatAnalyse {
  prets: EleveAImporter[];
  erreurs: ErreurLigne[];
  doublons: DoublonIgnore[];
}

/** Fabrique le classeur modèle (.xlsx réel) avec les colonnes et un exemple congolais. */
export function genererModeleEleves(): ArrayBuffer {
  const classeur = XLSX.utils.book_new();
  const feuille = XLSX.utils.aoa_to_sheet([
    [...COLONNES_MODELE],
    ["Ana", "MBOUMBA", "F", "CP1", "Mme LOUANGO", "+242 06 123 45 67"],
  ]);
  XLSX.utils.book_append_sheet(classeur, feuille, "Élèves");
  const resultat = XLSX.write(classeur, { type: "array", bookType: "xlsx" });
  return resultat as ArrayBuffer;
}

/** Décode le fichier choisi (xlsx, xls ou csv) en lignes de texte brutes. */
export async function lireLignesBrutes(fichier: File): Promise<string[][]> {
  const tampon = await fichier.arrayBuffer();
  let classeur: XLSX.WorkBook;
  try {
    classeur = XLSX.read(new Uint8Array(tampon), { type: "array" });
  } catch {
    throw new FichierElevesInvalideError(
      "Ce fichier n'a pas pu être ouvert comme classeur Excel ou CSV. Vérifiez l'extension (.xlsx, .xls ou .csv) et réessayez.",
    );
  }
  const nomFeuille = classeur.SheetNames[0];
  const feuille = nomFeuille ? classeur.Sheets[nomFeuille] : undefined;
  if (!feuille) {
    throw new FichierElevesInvalideError(
      "Le fichier ne contient aucune feuille lisible.",
    );
  }
  const lignes = XLSX.utils.sheet_to_json<string[]>(feuille, {
    header: 1,
    raw: false,
    defval: "",
  });
  return lignes.map((ligne) =>
    (ligne ?? []).map((cellule) =>
      cellule === null || cellule === undefined ? "" : String(cellule),
    ),
  );
}

/* ============================== Normalisation ============================== */

/** Minuscule, sans accents, sans espaces superflus — pour comparer sans punir. */
export function normaliserComparaison(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normaliserTexte(valeur: string): string {
  return valeur.replace(/\s+/g, " ").trim();
}

/** « f », « Fille », « féminin » → « F » ; « garçon » → « M » ; vide → null. */
export function normaliserGenre(valeur: string): Genre | null | "invalide" {
  const propre = normaliserComparaison(valeur);
  if (propre === "") return null;
  if (propre === "f" || propre === "fille" || propre === "feminin") return "F";
  if (propre === "m" || propre === "garcon" || propre === "masculin") {
    return "M";
  }
  return "invalide";
}

/** Retire espaces, points et tirets pour valider un numéro de téléphone. */
export function normaliserTelephone(valeur: string): string | null | "invalide" {
  const propre = normaliserTexte(valeur);
  if (propre === "") return null;
  const chiffres = propre.replace(/[\s.\-()]/g, "");
  if (!/^\+?\d{9,15}$/.test(chiffres)) return "invalide";
  return propre;
}

function trouverColonne(
  entetes: string[],
  cibles: string[],
): number {
  for (let index = 0; index < entetes.length; index++) {
    const normalise = normaliserComparaison(entetes[index]);
    if (cibles.includes(normalise)) return index;
  }
  return -1;
}

/* ============================== Analyse ============================== */

/**
 * Contrôle ligne par ligne. Les lignes en erreur et les doublons sont
 * écartés des « prêts » ; l'import ne porte que les élèves valides.
 */
export function analyserEleves(
  lignes: string[][],
  contexte: {
    libellesClasses: string[];
    existants: { prenom: string; nom: string; classe: string | null }[];
  },
): ResultatAnalyse {
  const indexEntetes = lignes.findIndex((ligne) => {
    const prenom = trouverColonne(ligne, ["prenom"]);
    const nom = trouverColonne(ligne, ["nom"]);
    return prenom !== -1 && nom !== -1;
  });
  if (indexEntetes === -1) {
    throw new FichierElevesInvalideError(
      "Le fichier doit contenir une ligne d'en-têtes avec au moins les colonnes « Prénom » et « Nom ». Téléchargez le modèle pour partir sur de bonnes bases.",
    );
  }

  const entetes = lignes[indexEntetes];
  const colonnes = {
    prenom: trouverColonne(entetes, ["prenom"]),
    nom: trouverColonne(entetes, ["nom"]),
    sexe: trouverColonne(entetes, ["sexe"]),
    classe: trouverColonne(entetes, ["classe"]),
    parent: trouverColonne(entetes, ["nom du parent", "parent", "responsable"]),
    telephone: trouverColonne(entetes, [
      "telephone du parent",
      "telephone",
      "tel",
    ]),
  };

  const lignesDonnees = lignes.slice(indexEntetes + 1);
  const lignesRemplies = lignesDonnees.filter((ligne) =>
    ligne.some((cellule) => cellule.trim() !== ""),
  );
  if (lignesRemplies.length > LIMITE_ELEVES_IMPORT) {
    return {
      prets: [],
      erreurs: [
        {
          ligne: 0,
          message: `Le fichier contient ${lignesRemplies.length} lignes d'élèves : la limite est de ${LIMITE_ELEVES_IMPORT} par import. Découpez votre fichier en plusieurs fois.`,
        },
      ],
      doublons: [],
    };
  }

  const classesNormalisees = contexte.libellesClasses.map((libelle) => ({
    libelle,
    normalise: normaliserComparaison(libelle),
  }));

  const clesBase = new Set(
    contexte.existants.map((eleve) =>
      [
        normaliserComparaison(eleve.prenom),
        normaliserComparaison(eleve.nom),
        eleve.classe === null ? "" : normaliserComparaison(eleve.classe),
      ].join("|"),
    ),
  );
  const clesVues = new Set<string>();

  const prets: EleveAImporter[] = [];
  const erreurs: ErreurLigne[] = [];
  const doublons: DoublonIgnore[] = [];

  lignesDonnees.forEach((ligne, rang) => {
    const numero = indexEntetes + rang + 2; // Numéro de ligne dans le fichier (1 = en-têtes).

    // Les lignes entièrement vides sont ignorées en silence, sans fausse
    // erreur, mais leur position reste comptée pour numéroter les suivantes.
    if (ligne.every((cellule) => cellule.trim() === "")) return;

    const prenom = normaliserTexte(ligne[colonnes.prenom] ?? "");
    const nom = normaliserTexte(ligne[colonnes.nom] ?? "");

    if (prenom === "" && nom === "") {
      erreurs.push({
        ligne: numero,
        message: "Prénom et nom manquants — la ligne a été ignorée.",
      });
      return;
    }
    if (prenom === "") {
      erreurs.push({ ligne: numero, message: "Prénom manquant." });
      return;
    }
    if (nom === "") {
      erreurs.push({ ligne: numero, message: "Nom manquant." });
      return;
    }

    const genreBrut =
      colonnes.sexe === -1 ? "" : (ligne[colonnes.sexe] ?? "");
    const genre = normaliserGenre(genreBrut);
    if (genre === "invalide") {
      erreurs.push({
        ligne: numero,
        message: `Le sexe « ${genreBrut.trim()} » n'est pas reconnu : écrivez F (fille) ou M (garçon).`,
      });
      return;
    }

    let classe: string | null = null;
    if (colonnes.classe !== -1) {
      const classeBrute = normaliserTexte(ligne[colonnes.classe] ?? "");
      if (classeBrute !== "") {
        const normalise = normaliserComparaison(classeBrute);
        const trouve = classesNormalisees.find(
          (candidate) => candidate.normalise === normalise,
        );
        if (!trouve) {
          erreurs.push({
            ligne: numero,
            message: `La classe « ${classeBrute} » n'existe pas dans votre école (créez-la à l'étape Classes ou corrigez le fichier).`,
          });
          return;
        }
        classe = trouve.libelle;
      }
    }

    let parent: string | null = null;
    if (colonnes.parent !== -1) {
      const parentBrut = normaliserTexte(ligne[colonnes.parent] ?? "");
      parent = parentBrut === "" ? null : parentBrut;
    }

    let telephone: string | null = null;
    if (colonnes.telephone !== -1) {
      const telephoneBrut = ligne[colonnes.telephone] ?? "";
      const telephoneNormalise = normaliserTelephone(telephoneBrut);
      if (telephoneNormalise === "invalide") {
        erreurs.push({
          ligne: numero,
          message: `Le téléphone « ${normaliserTexte(telephoneBrut)} » n'est pas un numéro valable (au moins 9 chiffres, indicatif +242 accepté).`,
        });
        return;
      }
      telephone = telephoneNormalise;
    }

    const cle = [
      normaliserComparaison(prenom),
      normaliserComparaison(nom),
      classe === null ? "" : normaliserComparaison(classe),
    ].join("|");

    if (clesBase.has(cle)) {
      doublons.push({
        ligne: numero,
        prenom,
        nom,
        motif: "base",
      });
      return;
    }
    if (clesVues.has(cle)) {
      doublons.push({ ligne: numero, prenom, nom, motif: "fichier" });
      return;
    }
    clesVues.add(cle);

    prets.push({ prenom, nom, genre, classe, parent, telephone });
  });

  return { prets, erreurs, doublons };
}
