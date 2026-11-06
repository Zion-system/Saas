import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { traduireErreurSQLite } from "../organisation-scolaire/errors";
import { exigerLigne, selectionner } from "./shared";
import type { CreerEleve, Eleve } from "./types";

export function creerServiceEleves(database: SQLiteExecutor) {
  async function obtenir(id: string): Promise<Eleve> {
    const rows = await selectionner<Eleve>(
      database,
      `SELECT id_eleve, id_etablissement, matricule
       FROM eleve WHERE id_eleve = ?;`,
      [id],
    );
    return exigerLigne(rows, "L’élève", id);
  }

  return {
    async creer(eleve: CreerEleve): Promise<Eleve> {
      const rows = await traduireErreurSQLite("L’élève", () =>
        database.query(
          `INSERT INTO eleve (id_eleve, id_etablissement)
           VALUES (?, ?)
           RETURNING id_eleve, id_etablissement, matricule;`,
          [eleve.id_eleve, eleve.id_etablissement],
        ),
      );
      return exigerLigne(rows, "L’élève", eleve.id_eleve);
    },

    obtenir,

    async listerParEtablissement(idEtablissement: string): Promise<Eleve[]> {
      return selectionner(
        database,
        `SELECT id_eleve, id_etablissement, matricule
         FROM eleve
         WHERE id_etablissement = ?
         ORDER BY id_eleve;`,
        [idEtablissement],
      );
    },

    async obtenirMatriculeCourant(id: string): Promise<string | null> {
      return (await obtenir(id)).matricule;
    },
  };
}
