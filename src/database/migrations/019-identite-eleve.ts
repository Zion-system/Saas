import type { Migration } from "./index";

/**
 * Migration 019 — Identité de l'élève et du responsable.
 *
 * Le socle B0 (migration 011) portait l'identifiant et le matricule de
 * l'élève, mais pas son identité : le parcours de configuration (étape 4)
 * ne pouvait donc pas enregistrer de vrai élève. Conformément au MLD
 * (docs/19 : « Matricule et identité élève » portés par ELEVE), ajout en
 * colonnes — aucune table créée ni supprimée :
 * - eleve.prenom / eleve.nom : identité de l'élève ;
 * - eleve.genre              : « F » (fille) ou « M » (garçon) ;
 * - responsable.nom_complet / responsable.telephone : coordonnées du
 *   parent ou tuteur déclaré à l'étape 4.
 *
 * Colonnes facultatives (NULL autorisé) : les dossiers créés avant cette
 * migration et les montages des tests du socle restent valides. Le
 * caractère obligatoire du prénom et du nom est contrôlé par le service
 * (dossiers.service.ts), pas par la base.
 */
const identiteEleve: Migration = {
  version: 19,
  name: "identite_eleve",
  sql: `
    ALTER TABLE eleve
      ADD COLUMN prenom TEXT;

    ALTER TABLE eleve
      ADD COLUMN nom TEXT;

    ALTER TABLE eleve
      ADD COLUMN genre TEXT CHECK (
        genre IS NULL OR genre IN ('F', 'M')
      );

    ALTER TABLE responsable
      ADD COLUMN nom_complet TEXT;

    ALTER TABLE responsable
      ADD COLUMN telephone TEXT;

    CREATE INDEX idx_eleve_identite
      ON eleve (id_etablissement, nom, prenom);
  `,
};

export default identiteEleve;
