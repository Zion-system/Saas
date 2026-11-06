import type { Migration } from "./index";

const candidaturesPreinscriptions: Migration = {
  version: 12,
  name: "candidatures_preinscriptions",
  sql: `
    CREATE TABLE candidature (
      id_candidature TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE preinscription (
      id_preinscription TEXT NOT NULL PRIMARY KEY,
      id_candidature TEXT,
      id_eleve TEXT,
      CHECK (
        (id_candidature IS NOT NULL AND id_eleve IS NULL)
        OR (id_candidature IS NULL AND id_eleve IS NOT NULL)
      ),
      FOREIGN KEY (id_candidature)
        REFERENCES candidature (id_candidature)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_eleve)
        REFERENCES eleve (id_eleve)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_preinscription_candidature
      ON preinscription (id_candidature);

    CREATE INDEX idx_preinscription_eleve
      ON preinscription (id_eleve);
  `,
};

export default candidaturesPreinscriptions;
