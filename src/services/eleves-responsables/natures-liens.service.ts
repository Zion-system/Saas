import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { NatureLienInactiveError } from "./errors";
import { selectionner } from "./shared";
import type { NatureLienResponsable } from "./types";

export function creerServiceNaturesLiens(database: SQLiteExecutor) {
  return {
    async listerActives(): Promise<NatureLienResponsable[]> {
      return selectionner(
        database,
        `SELECT id_nature_lien, code, libelle, est_actif
         FROM nature_lien_responsable
         WHERE est_actif = 1
         ORDER BY code;`,
      );
    },

    async obtenirActive(id: string): Promise<NatureLienResponsable> {
      const rows = await selectionner<NatureLienResponsable>(
        database,
        `SELECT id_nature_lien, code, libelle, est_actif
         FROM nature_lien_responsable
         WHERE id_nature_lien = ? AND est_actif = 1;`,
        [id],
      );
      const nature = rows[0];
      if (!nature) throw new NatureLienInactiveError(id);
      return nature;
    },
  };
}
