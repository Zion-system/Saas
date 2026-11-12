import type { Migration } from "./index";

/**
 * Migration 020 — Libellé lisible des modèles de classe.
 *
 * Problème constaté : une classe créée hors du catalogue officiel (« Ma
 * propre liste » ou « Ajouter une autre classe » à l'étape Classes) était
 * enregistrée sous son identifiant technique (ex. « premiere-a »). À la
 * réouverture de l'application, l'identifiant technique s'affichait
 * (filtre de la page Élèves, liste d'élèves, étape Classes) au lieu du
 * libellé saisi (ex. « Première A »).
 *
 * Cause : la table modele_classe ne conservait que l'identifiant ; le
 * libellé saisi vivait uniquement dans la mémoire de l'écran, perdue à la
 * fermeture de l'application.
 *
 * Correction (extension additive, conforme à l'esprit de la migration 018) :
 * - modele_classe.libelle : le libellé tel que saisi (ex. « Première A »).
 *   Colonne facultative (NULL) : les modèles du catalogue officiel la
 *   remplissent au premier lancement, les autres continuent d'afficher
 *   leur identifiant technique en repli.
 *
 * Divergence documentée par rapport au MLD docs/19 (MODELE_CLASSE ne
 * porte que id_modele_classe) : colonne d'affichage pure, jamais
 * utilisée dans les clés étrangères ni les règles financières.
 */
const libelleModeleClasse: Migration = {
  version: 20,
  name: "libelle_modele_classe",
  sql: `
    ALTER TABLE modele_classe
      ADD COLUMN libelle TEXT;
  `,
};

export default libelleModeleClasse;
