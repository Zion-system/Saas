import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { traduireErreurSQLite } from "./errors";
import { exigerLigne, selectionner } from "./shared";
import type { Etablissement } from "./types";

export function creerServiceEtablissements(database: SQLiteExecutor) {
  return {
    async lister(): Promise<Etablissement[]> {
      return selectionner(
        database,
        "SELECT id_etablissement, nom FROM etablissement ORDER BY id_etablissement;",
      );
    },

    async obtenir(id: string): Promise<Etablissement> {
      const rows = await selectionner<Etablissement>(
        database,
        "SELECT id_etablissement, nom FROM etablissement WHERE id_etablissement = ?;",
        [id],
      );
      return exigerLigne(rows, "L’établissement", id);
    },

    async creer(etablissement: Etablissement): Promise<Etablissement> {
      const rows = await traduireErreurSQLite("L’établissement", () =>
        database.query(
          "INSERT INTO etablissement (id_etablissement, nom) VALUES (?, ?) RETURNING id_etablissement, nom;",
          [etablissement.id_etablissement, etablissement.nom ?? ""],
        ),
      );
      return exigerLigne(
        rows,
        "L’établissement",
        etablissement.id_etablissement,
      );
    },

    /**
     * Enregistre (ou corrige) le nom lisible de l'école — laissé vide par
     * les anciens parcours qui ne manipulaient que l'identifiant technique.
     */
    async definirNom(id: string, nom: string): Promise<Etablissement> {
      const rows = await traduireErreurSQLite("L’établissement", () =>
        database.query(
          "UPDATE etablissement SET nom = ? WHERE id_etablissement = ? RETURNING id_etablissement, nom;",
          [nom, id],
        ),
      );
      return exigerLigne(rows, "L’établissement", id);
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
