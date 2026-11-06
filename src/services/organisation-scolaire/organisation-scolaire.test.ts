import sqlite3InitModule, { type SqlValue } from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  SQLiteExecutor,
  SQLiteRow,
  SQLiteStatement,
} from "../../database/local/sqlite.types";
import { executerTransactionSQLite } from "../../database/local/sqlite-operations";
import { migrations } from "../../database/migrations";
import { SQLiteCommandError } from "../../database/local/sqlite.client";
import {
  ConflitOrganisationError,
  EntiteIntrouvableError,
  ReferenceOrganisationError,
  TransitionStatutError,
  creerServicesOrganisationScolaire,
} from ".";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;
let executor: SQLiteExecutor;
let services: ReturnType<typeof creerServicesOrganisationScolaire>;

function convertirErreurSQLite(error: unknown): SQLiteCommandError {
  if (error instanceof Error) {
    const resultCode =
      typeof error === "object" &&
      error !== null &&
      "resultCode" in error &&
      typeof error.resultCode === "number"
        ? error.resultCode
        : undefined;
    return new SQLiteCommandError(error.message, resultCode);
  }

  return new SQLiteCommandError("Erreur SQLite inconnue.");
}

function executerInstruction(statement: SQLiteStatement): SQLiteRow[] {
  try {
    return database.exec({
      sql: statement.sql,
      bind: statement.bind as SqlValue[] | undefined,
      rowMode: "object",
      returnValue: "resultRows",
    });
  } catch (error) {
    throw convertirErreurSQLite(error);
  }
}

function executerControle(sql: string): void {
  try {
    database.exec(sql);
  } catch (error) {
    throw convertirErreurSQLite(error);
  }
}

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  database = new sqlite3.oo1.DB(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY CHECK (version > 0),
      name TEXT NOT NULL
    );
  `);

  for (const migration of migrations) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.exec(migration.sql);
      database.exec({
        sql: "INSERT INTO schema_migrations (version, name) VALUES (?, ?);",
        bind: [migration.version, migration.name],
      });
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  executor = {
    async query(sql, bind = []) {
      return executerInstruction({ sql, bind });
    },
    async transaction(statements) {
      return executerTransactionSQLite(
        executerInstruction,
        executerControle,
        statements,
      );
    },
  };
  services = creerServicesOrganisationScolaire(executor);
});

afterEach(() => {
  database.close();
});

async function creerSocleOrganisationnel(): Promise<void> {
  await services.etablissements.creer({ id_etablissement: "etablissement-1" });
  await services.anneesScolaires.creer({
    id_annee_scolaire: "annee-1",
    id_etablissement: "etablissement-1",
  });
  await services.cyclesEnseignement.creer({ id_cycle: "cycle-1" });
  await services.niveauxEnseignement.creer({ id_niveau: "niveau-1" });
  await services.modelesClasse.creer({ id_modele_classe: "modele-1" });
}

describe("services d’organisation scolaire", () => {
  it("crée, consulte, modifie et supprime les entités selon leurs colonnes", async () => {
    await services.etablissements.creer({
      id_etablissement: "etablissement-libre",
    });
    expect(
      await services.etablissements.modifierIdentifiant(
        "etablissement-libre",
        "etablissement-renomme",
      ),
    ).toEqual({ id_etablissement: "etablissement-renomme" });
    await services.etablissements.supprimer("etablissement-renomme");

    await creerSocleOrganisationnel();
    await services.anneesScolaires.creer({
      id_annee_scolaire: "annee-libre",
      id_etablissement: "etablissement-1",
    });
    expect(
      await services.anneesScolaires.modifier("annee-libre", {
        id_annee_scolaire: "annee-renommee",
        id_etablissement: "etablissement-1",
      }),
    ).toMatchObject({ id_annee_scolaire: "annee-renommee" });
    await services.anneesScolaires.supprimer("annee-renommee");

    const periode = await services.periodesPedagogiques.creer({
      id_periode: "periode-1",
      id_annee_scolaire: "annee-1",
    });
    expect(periode).toEqual({
      id_periode: "periode-1",
      id_annee_scolaire: "annee-1",
    });
    expect(
      await services.periodesPedagogiques.listerParAnnee("annee-1"),
    ).toHaveLength(1);
    expect(
      await services.periodesPedagogiques.modifier("periode-1", {
        id_periode: "periode-2",
        id_annee_scolaire: "annee-1",
      }),
    ).toEqual({ id_periode: "periode-2", id_annee_scolaire: "annee-1" });

    expect(
      await services.cyclesEnseignement.modifierIdentifiant(
        "cycle-1",
        "cycle-2",
      ),
    ).toEqual({ id_cycle: "cycle-2" });
    expect(
      await services.niveauxEnseignement.modifierIdentifiant(
        "niveau-1",
        "niveau-2",
      ),
    ).toEqual({ id_niveau: "niveau-2" });
    expect(
      await services.modelesClasse.modifierIdentifiant("modele-1", "modele-2"),
    ).toEqual({ id_modele_classe: "modele-2" });

    const classe = await services.classesAnnuelles.creer({
      id_classe_annuelle: "classe-1",
      id_annee_scolaire: "annee-1",
      id_niveau: "niveau-2",
      id_modele_classe: "modele-2",
      id_etablissement: "etablissement-1",
    });
    expect(await services.classesAnnuelles.obtenir("classe-1")).toEqual(classe);
    expect(
      await services.classesAnnuelles.listerParAnnee(
        "annee-1",
        "etablissement-1",
      ),
    ).toEqual([classe]);
    expect(
      await services.classesAnnuelles.modifier("classe-1", {
        ...classe,
        id_classe_annuelle: "classe-2",
      }),
    ).toEqual({ ...classe, id_classe_annuelle: "classe-2" });

    await services.classesAnnuelles.supprimer("classe-2");
    await services.periodesPedagogiques.supprimer("periode-2");
    await services.anneesScolaires.supprimer("annee-1");
    await services.cyclesEnseignement.supprimer("cycle-2");
    await services.niveauxEnseignement.supprimer("niveau-2");
    await services.modelesClasse.supprimer("modele-2");
    await services.etablissements.supprimer("etablissement-1");

    expect(await services.etablissements.lister()).toEqual([]);
    await expect(
      services.etablissements.obtenir("absent"),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);
  });

  it("respecte les statuts documentés et l’unicité de l’année ouverte", async () => {
    await creerSocleOrganisationnel();
    await services.anneesScolaires.creer({
      id_annee_scolaire: "annee-2",
      id_etablissement: "etablissement-1",
    });

    await expect(
      services.anneesScolaires.changerStatut("annee-1", "ARCHIVEE"),
    ).rejects.toBeInstanceOf(TransitionStatutError);

    expect(
      await services.anneesScolaires.changerStatut("annee-1", "OUVERTE"),
    ).toMatchObject({ statut: "OUVERTE" });
    await expect(
      services.anneesScolaires.changerStatut("annee-2", "OUVERTE"),
    ).rejects.toBeInstanceOf(ConflitOrganisationError);
    expect(await services.anneesScolaires.obtenir("annee-2")).toMatchObject({
      statut: "PREPAREE",
    });

    await expect(
      services.anneesScolaires.changerStatut("annee-1", "CLOTUREE"),
    ).rejects.toBeInstanceOf(TransitionStatutError);

    database.exec(
      "UPDATE annee_scolaire SET statut = 'CLOTUREE' WHERE id_annee_scolaire = 'annee-1';",
    );
    expect(
      await services.anneesScolaires.changerStatut("annee-1", "ARCHIVEE"),
    ).toMatchObject({ statut: "ARCHIVEE" });
    expect(
      database.exec({
        sql: "SELECT COUNT(*) AS count FROM annee_scolaire WHERE id_etablissement = ? AND statut = 'OUVERTE';",
        bind: ["etablissement-1"],
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.count,
    ).toBe(0);
  });

  it("préserve les clés étrangères et la portée établissement/année des classes", async () => {
    await expect(
      services.anneesScolaires.creer({
        id_annee_scolaire: "annee-sans-etablissement",
        id_etablissement: "absent",
      }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);

    await creerSocleOrganisationnel();
    await expect(
      services.periodesPedagogiques.creer({
        id_periode: "periode-sans-annee",
        id_annee_scolaire: "absente",
      }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);

    await services.etablissements.creer({
      id_etablissement: "etablissement-2",
    });
    await expect(
      services.classesAnnuelles.creer({
        id_classe_annuelle: "classe-portee-incorrecte",
        id_annee_scolaire: "annee-1",
        id_niveau: "niveau-1",
        id_modele_classe: "modele-1",
        id_etablissement: "etablissement-2",
      }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);

    await services.periodesPedagogiques.creer({
      id_periode: "periode-reference",
      id_annee_scolaire: "annee-1",
    });
    await expect(
      services.anneesScolaires.supprimer("annee-1"),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
    await expect(
      services.etablissements.supprimer("etablissement-1"),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
  });

  it("traduit les collisions d’identifiants en erreurs applicatives avec cause SQLite", async () => {
    await services.etablissements.creer({
      id_etablissement: "etablissement-1",
    });

    try {
      await services.etablissements.creer({
        id_etablissement: "etablissement-1",
      });
      throw new Error("Une collision d’identifiant aurait dû échouer.");
    } catch (error) {
      expect(error).toBeInstanceOf(ConflitOrganisationError);
      expect((error as Error).cause).toBeInstanceOf(SQLiteCommandError);
    }
  });

  it("annule toutes les écritures d’une transaction lorsqu’une instruction échoue", async () => {
    await expect(
      executor.transaction([
        {
          sql: "INSERT INTO etablissement (id_etablissement) VALUES (?);",
          bind: ["etablissement-transaction"],
        },
        {
          sql: "INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement) VALUES (?, ?);",
          bind: ["annee-transaction", "etablissement-absent"],
        },
      ]),
    ).rejects.toBeInstanceOf(SQLiteCommandError);

    expect(
      database.exec({
        sql: "SELECT COUNT(*) AS count FROM etablissement WHERE id_etablissement = ?;",
        bind: ["etablissement-transaction"],
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.count,
    ).toBe(0);
  });
});
