import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { traduireErreurSQLite } from "./errors";
import { exigerLigne, selectionner } from "./shared";
import type { Etablissement } from "./types";

export function creerServiceEtablissements(database: SQLiteExecutor) {
  return {
    async lister(): Promise<Etablissement[]> {
      return selectionner(
        database,
        "SELECT id_etablissement FROM etablissement ORDER BY id_etablissement;",
      );
    },

    async obtenir(id: string): Promise<Etablissement> {
      const rows = await selectionner<Etablissement>(
        database,
        "SELECT id_etablissement FROM etablissement WHERE id_etablissement = ?;",
        [id],
      );
      return exigerLigne(rows, "L’établissement", id);
    },

    async creer(etablissement: Etablissement): Promise<Etablissement> {
      const rows = await traduireErreurSQLite("L’établissement", () =>
        database.query(
          "INSERT INTO etablissement (id_etablissement) VALUES (?) RETURNING id_etablissement;",
          [etablissement.id_etablissement],
        ),
      );
      return exigerLigne(
        rows,
        "L’établissement",
        etablissement.id_etablissement,
      );
    },

    async modifierIdentifiant(
      id: string,
      nouvelIdentifiant: string,
    ): Promise<Etablissement> {
      const rows = await traduireErreurSQLite("L’établissement", () =>
        database.query(
          "UPDATE etablissement SET id_etablissement = ? WHERE id_etablissement = ? RETURNING id_etablissement;",
          [nouvelIdentifiant, id],
        ),
      );
      return exigerLigne(rows, "L’établissement", id);
    },

    async supprimer(id: string): Promise<void> {
      const rows = await traduireErreurSQLite("L’établissement", () =>
        database.query(
          "DELETE FROM etablissement WHERE id_etablissement = ? RETURNING id_etablissement;",
          [id],
        ),
      );
      exigerLigne(rows, "L’établissement", id);
    },
  };
}
