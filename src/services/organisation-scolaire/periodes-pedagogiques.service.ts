import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { traduireErreurSQLite } from "./errors";
import { exigerLigne, selectionner } from "./shared";
import type { PeriodePedagogique } from "./types";

export function creerServicePeriodesPedagogiques(database: SQLiteExecutor) {
  return {
    async listerParAnnee(
      idAnneeScolaire: string,
    ): Promise<PeriodePedagogique[]> {
      return selectionner(
        database,
        `SELECT id_periode, id_annee_scolaire, libelle, ordre
         FROM periode_pedagogique
         WHERE id_annee_scolaire = ?
         ORDER BY COALESCE(ordre, 2147483647), id_periode;`,
        [idAnneeScolaire],
      );
    },

    async obtenir(id: string): Promise<PeriodePedagogique> {
      const rows = await selectionner<PeriodePedagogique>(
        database,
        `SELECT id_periode, id_annee_scolaire, libelle, ordre
         FROM periode_pedagogique
         WHERE id_periode = ?;`,
        [id],
      );
      return exigerLigne(rows, "La période pédagogique", id);
    },

    async creer(periode: PeriodePedagogique): Promise<PeriodePedagogique> {
      const rows = await traduireErreurSQLite("La période pédagogique", () =>
        database.query(
          `INSERT INTO periode_pedagogique
             (id_periode, id_annee_scolaire, libelle, ordre)
           VALUES (?, ?, ?, ?)
           RETURNING id_periode, id_annee_scolaire, libelle, ordre;`,
          [
            periode.id_periode,
            periode.id_annee_scolaire,
            periode.libelle ?? null,
            periode.ordre ?? null,
          ],
        ),
      );
      return exigerLigne(rows, "La période pédagogique", periode.id_periode);
    },

    async modifier(
      id: string,
      changements: PeriodePedagogique,
    ): Promise<PeriodePedagogique> {
      const rows = await traduireErreurSQLite("La période pédagogique", () =>
        database.query(
          `UPDATE periode_pedagogique
           SET id_periode = ?, id_annee_scolaire = ?,
               libelle = COALESCE(?, libelle),
               ordre = COALESCE(?, ordre)
           WHERE id_periode = ?
           RETURNING id_periode, id_annee_scolaire, libelle, ordre;`,
          [
            changements.id_periode,
            changements.id_annee_scolaire,
            changements.libelle ?? null,
            changements.ordre ?? null,
            id,
          ],
        ),
      );
      return exigerLigne(rows, "La période pédagogique", id);
    },

    async supprimer(id: string): Promise<void> {
      const rows = await traduireErreurSQLite("La période pédagogique", () =>
        database.query(
          "DELETE FROM periode_pedagogique WHERE id_periode = ? RETURNING id_periode;",
          [id],
        ),
      );
      exigerLigne(rows, "La période pédagogique", id);
    },
  };
}
