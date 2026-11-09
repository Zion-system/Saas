import type { Migration } from "./index";

const compteUtilisateur: Migration = {
  version: 17,
  name: "compte_utilisateur",
  sql: `
    CREATE TABLE compte_utilisateur (
      id_compte TEXT NOT NULL PRIMARY KEY,
      prenom TEXT NOT NULL,
      nom TEXT NOT NULL,
      telephone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      hash_mot_de_passe TEXT NOT NULL,
      sel TEXT NOT NULL,
      date_creation TEXT NOT NULL
    );

    CREATE INDEX idx_compte_utilisateur_email
      ON compte_utilisateur (email);
  `,
};

export default compteUtilisateur;
