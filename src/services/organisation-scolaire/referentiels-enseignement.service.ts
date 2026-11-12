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
  // Service dédié (et non le générique « identifiant seul ») : depuis la
  // migration 020, modele_classe porte un libellé lisible facultatif qui
  // doit être lu, écrit et complété sans toucher l'identifiant technique.
  return {
    /** Liste tous les modèles avec leur libellé (NULL possible). */
    async lister(): Promise<ModeleClasse[]> {
      return selectionner<ModeleClasse>(
        database,
        `SELECT id_modele_classe, libelle
           FROM modele_classe
          ORDER BY id_modele_classe;`,
      );
    },

    async obtenir(id: string): Promise<ModeleClasse> {
      const rows = await selectionner<ModeleClasse>(
        database,
        `SELECT id_modele_classe, libelle
           FROM modele_classe
          WHERE id_modele_classe = ?;`,
        [id],
      );
      return exigerLigne(rows, "Le modèle de classe", id);
    },

    async creer(entite: ModeleClasse): Promise<ModeleClasse> {
      const rows = await traduireErreurSQLite("Le modèle de classe", () =>
        database.query(
          `INSERT INTO modele_classe (id_modele_classe, libelle)
           VALUES (?, ?)
           RETURNING id_modele_classe, libelle;`,
          [entite.id_modele_classe, entite.libelle ?? null],
        ),
      );
      return exigerLigne(rows, "Le modèle de classe", entite.id_modele_classe);
    },

    /**
     * Complète ou corrige le libellé d'un modèle sans toucher à
     * l'identifiant (utilisé par les écrans qui connaissent le libellé
     * d'origine : configuration initiale, catalogue officiel).
     */
    async definirLibelle(id: string, libelle: string): Promise<ModeleClasse> {
      const rows = await traduireErreurSQLite("Le modèle de classe", () =>
        database.query(
          `UPDATE modele_classe
              SET libelle = ?
            WHERE id_modele_classe = ?
            RETURNING id_modele_classe, libelle;`,
          [libelle, id],
        ),
      );
      return exigerLigne(rows, "Le modèle de classe", id);
    },

    async modifierIdentifiant(
      id: string,
      nouvelIdentifiant: string,
    ): Promise<ModeleClasse> {
      const rows = await traduireErreurSQLite("Le modèle de classe", () =>
        database.query(
          `UPDATE modele_classe
              SET id_modele_classe = ?
            WHERE id_modele_classe = ?
            RETURNING id_modele_classe, libelle;`,
          [nouvelIdentifiant, id],
        ),
      );
      return exigerLigne(rows, "Le modèle de classe", id);
    },

    async supprimer(id: string): Promise<void> {
      const rows = await traduireErreurSQLite("Le modèle de classe", () =>
        database.query(
          `DELETE FROM modele_classe
            WHERE id_modele_classe = ?
            RETURNING id_modele_classe, libelle;`,
          [id],
        ),
      );
      exigerLigne(rows, "Le modèle de classe", id);
    },
  };
}
