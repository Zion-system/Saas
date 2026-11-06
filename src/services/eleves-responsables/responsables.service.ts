import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { traduireErreurSQLite } from "../organisation-scolaire/errors";
import { exigerLigne, selectionner } from "./shared";
import type { Responsable } from "./types";

export function creerServiceResponsables(database: SQLiteExecutor) {
  return {
    async creer(responsable: Responsable): Promise<Responsable> {
      const rows = await traduireErreurSQLite("Le responsable", () =>
        database.query(
          `INSERT INTO responsable (id_responsable, id_etablissement)
           VALUES (?, ?)
           RETURNING id_responsable, id_etablissement;`,
          [responsable.id_responsable, responsable.id_etablissement],
        ),
      );
      return exigerLigne(rows, "Le responsable", responsable.id_responsable);
    },

    async obtenir(id: string): Promise<Responsable> {
      const rows = await selectionner<Responsable>(
        database,
        `SELECT id_responsable, id_etablissement
         FROM responsable WHERE id_responsable = ?;`,
        [id],
      );
      return exigerLigne(rows, "Le responsable", id);
    },

    async listerParEtablissement(idEtablissement: string): Promise<Responsable[]> {
      return selectionner(
        database,
        `SELECT id_responsable, id_etablissement
         FROM responsable
         WHERE id_etablissement = ?
         ORDER BY id_responsable;`,
        [idEtablissement],
      );
    },
  };
}
