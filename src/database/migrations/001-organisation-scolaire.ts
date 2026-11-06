import type { Migration } from "./index";

const organisationScolaire: Migration = {
  version: 1,
  name: "organisation_scolaire",
  sql: `
    CREATE TABLE etablissement (
      id_etablissement TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE annee_scolaire (
      id_annee_scolaire TEXT NOT NULL PRIMARY KEY,
      id_etablissement TEXT NOT NULL,
      UNIQUE (id_annee_scolaire, id_etablissement),
      FOREIGN KEY (id_etablissement)
        REFERENCES etablissement (id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_annee_scolaire_etablissement
      ON annee_scolaire (id_etablissement);

    CREATE TABLE periode_pedagogique (
      id_periode TEXT NOT NULL PRIMARY KEY,
      id_annee_scolaire TEXT NOT NULL,
      FOREIGN KEY (id_annee_scolaire)
        REFERENCES annee_scolaire (id_annee_scolaire)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_periode_pedagogique_annee
      ON periode_pedagogique (id_annee_scolaire);

    CREATE TABLE cycle_enseignement (
      id_cycle TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE niveau_enseignement (
      id_niveau TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE modele_classe (
      id_modele_classe TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE classe_annuelle (
      id_classe_annuelle TEXT NOT NULL PRIMARY KEY,
      id_annee_scolaire TEXT NOT NULL,
      id_niveau TEXT NOT NULL,
      id_modele_classe TEXT NOT NULL,
      id_etablissement TEXT NOT NULL,
      UNIQUE (id_classe_annuelle, id_etablissement),
      FOREIGN KEY (id_annee_scolaire, id_etablissement)
        REFERENCES annee_scolaire (id_annee_scolaire, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_niveau)
        REFERENCES niveau_enseignement (id_niveau)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_modele_classe)
        REFERENCES modele_classe (id_modele_classe)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_classe_annuelle_annee_etablissement
      ON classe_annuelle (id_annee_scolaire, id_etablissement);
    CREATE INDEX idx_classe_annuelle_niveau
      ON classe_annuelle (id_niveau);
    CREATE INDEX idx_classe_annuelle_modele
      ON classe_annuelle (id_modele_classe);
  `,
};

export default organisationScolaire;
