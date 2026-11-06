import type { Migration } from "./index";

const cycleAnneeScolaire: Migration = {
  version: 2,
  name: "cycle_annee_scolaire",
  sql: `
    ALTER TABLE annee_scolaire
      ADD COLUMN statut TEXT NOT NULL DEFAULT 'PREPAREE'
      CHECK (statut IN ('PREPAREE', 'OUVERTE', 'CLOTUREE', 'ARCHIVEE'));

    CREATE UNIQUE INDEX idx_annee_scolaire_ouverte_par_etablissement
      ON annee_scolaire (id_etablissement)
      WHERE statut = 'OUVERTE';
  `,
};

export default cycleAnneeScolaire;
