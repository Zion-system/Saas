import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { traduireErreurSQLite } from "./errors";
import { exigerLigne, selectionner } from "./shared";
import type {
  CycleEnseignement,
  ModeleClasse,
  NiveauEnseignement,
} from "./types";

function creerServiceIdentifiant<T extends object, K extends keyof T & string>(
  database: SQLiteExecutor,
  table: string,
  colonne: K,
  libelle: string,
) {
  return {
    async lister(): Promise<T[]> {
      return selectionner(
        database,
        `SELECT ${colonne} FROM ${table} ORDER BY ${colonne};`,
      );
    },

    async obtenir(id: string): Promise<T> {
      const rows = await selectionner<T>(
        database,
        `SELECT ${colonne} FROM ${table} WHERE ${colonne} = ?;`,
        [id],
      );
      return exigerLigne(rows, libelle, id);
    },

    async creer(entite: T): Promise<T> {
      const rows = await traduireErreurSQLite(libelle, () =>
        database.query(
          `INSERT INTO ${table} (${colonne}) VALUES (?) RETURNING ${colonne};`,
          [entite[colonne] as string],
        ),
      );
      return exigerLigne(rows, libelle, entite[colonne] as string);
    },

    async modifierIdentifiant(
      id: string,
      nouvelIdentifiant: string,
    ): Promise<T> {
      const rows = await traduireErreurSQLite(libelle, () =>
        database.query(
          `UPDATE ${table} SET ${colonne} = ? WHERE ${colonne} = ? RETURNING ${colonne};`,
          [nouvelIdentifiant, id],
        ),
      );
      return exigerLigne(rows, libelle, id);
    },

    async supprimer(id: string): Promise<void> {
      const rows = await traduireErreurSQLite(libelle, () =>
        database.query(
          `DELETE FROM ${table} WHERE ${colonne} = ? RETURNING ${colonne};`,
          [id],
        ),
      );
      exigerLigne(rows, libelle, id);
    },
  };
}

export function creerServiceCyclesEnseignement(database: SQLiteExecutor) {
  return creerServiceIdentifiant<CycleEnseignement, "id_cycle">(
    database,
    "cycle_enseignement",
    "id_cycle",
    "Le cycle d’enseignement",
  );
}

export function creerServiceNiveauxEnseignement(database: SQLiteExecutor) {
  return creerServiceIdentifiant<NiveauEnseignement, "id_niveau">(
    database,
    "niveau_enseignement",
    "id_niveau",
    "Le niveau d’enseignement",
  );
}

export function creerServiceModelesClasse(database: SQLiteExecutor) {
  return creerServiceIdentifiant<ModeleClasse, "id_modele_classe">(
    database,
    "modele_classe",
    "id_modele_classe",
    "Le modèle de classe",
  );
}
