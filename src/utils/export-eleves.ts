import * as XLSX from "xlsx";

/**
 * Export Excel de la liste des élèves (page « Élèves ») — l'outil jumeau
 * de `import-eleves.ts` :
 *
 * - l'école qui a créé ses élèves à la main, ou par import, peut à tout
 *   moment ressortir sa liste en vrai fichier .xlsx (à imprimer, à envoyer
 *   au ministre, à retravailler dans Excel) ;
 * - l'export respecte les filtres actifs à l'écran : ce que le directeur
 *   voit est exactement ce qui sort ;
 * - les colonnes reprennent celles du tableau et du modèle d'import :
 *   boucler la boucle export → correction → import ne coûte rien.
 */

/** Colonnes de l'export — même esprit que COLONNES_MODELE de l'import. */
export const COLONNES_EXPORT = [
  "Prénom",
  "Nom",
  "Sexe",
  "Matricule",
  "Classe",
  "Nom du parent",
  "Téléphone du parent",
  "Statut",
] as const;

/** Une ligne d'export : un dossier élève déjà aplati et libellé par l'écran. */
export interface LigneExportEleve {
  prenom: string;
  nom: string;
  /** « F » ou « M » — null si le sexe n'est pas renseigné. */
  sexe: string | null;
  matricule: string | null;
  /** Libellé de la classe — null si l'élève est sans classe. */
  classe: string | null;
  parent: string | null;
  telephone: string | null;
  /** « Inscrit » ou « Sans inscription » (déjà libellé par l'écran). */
  statut: string;
}

/**
 * Construit les lignes du classeur : une ligne d'en-têtes puis une ligne
 * par élève. Les valeurs manquantes deviennent des cellules vides — jamais
 * « null » ou « undefined » qui s'afficheraient tels quels dans Excel.
 */
export function lignesExportEleves(eleves: LigneExportEleve[]): string[][] {
  const entete: string[] = [...COLONNES_EXPORT];
  const corps = eleves.map((eleve) => [
    eleve.prenom,
    eleve.nom,
    eleve.sexe ?? "",
    eleve.matricule ?? "",
    eleve.classe ?? "",
    eleve.parent ?? "",
    eleve.telephone ?? "",
    eleve.statut,
  ]);
  return [entete, ...corps];
}

/** Fabrique le classeur .xlsx réel (feuille « Élèves »). */
export function genererExportEleves(
  eleves: LigneExportEleve[],
): ArrayBuffer {
  const classeur = XLSX.utils.book_new();
  const feuille = XLSX.utils.aoa_to_sheet(lignesExportEleves(eleves));
  XLSX.utils.book_append_sheet(classeur, feuille, "Élèves");
  const resultat = XLSX.write(classeur, { type: "array", bookType: "xlsx" });
  return resultat as ArrayBuffer;
}
