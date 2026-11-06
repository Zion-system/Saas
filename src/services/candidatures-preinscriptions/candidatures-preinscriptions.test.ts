import sqlite3InitModule, { type SqlValue } from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  SQLiteExecutor,
  SQLiteRow,
  SQLiteStatement,
} from "../../database/local/sqlite.types";
import { executerTransactionSQLite } from "../../database/local/sqlite-operations";
import { SQLiteCommandError } from "../../database/local/sqlite.client";
import { migrations } from "../../database/migrations";
import {
  CandidatureIntrouvableError,
  ConflitIdentifiantCandidaturesError,
  IntegriteCandidaturesPreinscriptionsError,
  MESSAGE_REFERENCE_EXCLUSIVE,
  PreinscriptionIntrouvableError,
  ReferenceCandidaturesPreinscriptionsError,
  creerServicesCandidaturesPreinscriptions,
  traduireErreurCandidaturesPreinscriptions,
} from ".";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;
let services: ReturnType<typeof creerServicesCandidaturesPreinscriptions>;

function convertirErreur(error: unknown): SQLiteCommandError {
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
    throw convertirErreur(error);
  }
}

function executerControle(sql: string): void {
  try {
    database.exec(sql);
  } catch (error) {
    throw convertirErreur(error);
  }
}

function lireLignes(sql: string): SQLiteRow[] {
  return database.exec({
    sql,
    rowMode: "object",
    returnValue: "resultRows",
  });
}

function creerEleve(id = "eleve-1"): void {
  database.exec({
    sql: "INSERT INTO eleve (id_eleve, id_etablissement) VALUES (?, ?);",
    bind: [id, "etablissement-1"],
  });
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

  database.exec(`
    INSERT INTO etablissement (id_etablissement)
    VALUES ('etablissement-1');
  `);

  const executor: SQLiteExecutor = {
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
  services = creerServicesCandidaturesPreinscriptions(executor);
});

afterEach(() => {
  database.close();
});

describe("services candidatures et préinscriptions", () => {
  it("crée et consulte une candidature", async () => {
    const candidature = await services.candidatures.creer({
      id_candidature: "candidature-1",
    });

    expect(candidature).toEqual({ id_candidature: "candidature-1" });
    expect(await services.candidatures.obtenir("candidature-1")).toEqual(candidature);
    await expect(services.candidatures.obtenir("absente")).rejects.toBeInstanceOf(
      CandidatureIntrouvableError,
    );
  });

  it("liste les candidatures par identifiant", async () => {
    await services.candidatures.creer({ id_candidature: "candidature-b" });
    await services.candidatures.creer({ id_candidature: "candidature-a" });

    expect(await services.candidatures.lister()).toEqual([
      { id_candidature: "candidature-a" },
      { id_candidature: "candidature-b" },
    ]);
  });

  it("crée une préinscription rattachée à une candidature", async () => {
    await services.candidatures.creer({ id_candidature: "candidature-1" });

    const preinscription = await services.preinscriptions.creer({
      id_preinscription: "preinscription-1",
      id_candidature: "candidature-1",
      id_eleve: null,
    });

    expect(preinscription).toEqual({
      id_preinscription: "preinscription-1",
      id_candidature: "candidature-1",
      id_eleve: null,
    });
  });

  it("crée une préinscription rattachée à un élève existant", async () => {
    creerEleve();

    const preinscription = await services.preinscriptions.creer({
      id_preinscription: "preinscription-eleve",
      id_candidature: null,
      id_eleve: "eleve-1",
    });

    expect(preinscription).toEqual({
      id_preinscription: "preinscription-eleve",
      id_candidature: null,
      id_eleve: "eleve-1",
    });
  });

  it("consulte une préinscription par son identifiant", async () => {
    await services.candidatures.creer({ id_candidature: "candidature-1" });
    const creee = await services.preinscriptions.creer({
      id_preinscription: "preinscription-1",
      id_candidature: "candidature-1",
      id_eleve: null,
    });

    expect(await services.preinscriptions.obtenir("preinscription-1")).toEqual(creee);
    await expect(services.preinscriptions.obtenir("absente")).rejects.toBeInstanceOf(
      PreinscriptionIntrouvableError,
    );
  });

  it("liste les préinscriptions", async () => {
    await services.candidatures.creer({ id_candidature: "candidature-1" });
    creerEleve();
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-b",
      id_candidature: "candidature-1",
      id_eleve: null,
    });
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-a",
      id_candidature: null,
      id_eleve: "eleve-1",
    });

    expect(await services.preinscriptions.lister()).toEqual([
      {
        id_preinscription: "preinscription-a",
        id_candidature: null,
        id_eleve: "eleve-1",
      },
      {
        id_preinscription: "preinscription-b",
        id_candidature: "candidature-1",
        id_eleve: null,
      },
    ]);
  });

  it("filtre les préinscriptions d’une candidature", async () => {
    await services.candidatures.creer({ id_candidature: "candidature-1" });
    await services.candidatures.creer({ id_candidature: "candidature-2" });
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-1",
      id_candidature: "candidature-1",
      id_eleve: null,
    });
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-2",
      id_candidature: "candidature-1",
      id_eleve: null,
    });
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-3",
      id_candidature: "candidature-2",
      id_eleve: null,
    });

    expect(await services.preinscriptions.listerParCandidature("candidature-1")).toEqual([
      {
        id_preinscription: "preinscription-1",
        id_candidature: "candidature-1",
        id_eleve: null,
      },
      {
        id_preinscription: "preinscription-2",
        id_candidature: "candidature-1",
        id_eleve: null,
      },
    ]);
    expect(await services.preinscriptions.listerParCandidature("absente")).toEqual([]);
  });

  it("filtre les préinscriptions d’un élève", async () => {
    creerEleve("eleve-1");
    creerEleve("eleve-2");
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-1",
      id_candidature: null,
      id_eleve: "eleve-1",
    });
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-2",
      id_candidature: null,
      id_eleve: "eleve-2",
    });

    expect(await services.preinscriptions.listerParEleve("eleve-1")).toEqual([
      {
        id_preinscription: "preinscription-1",
        id_candidature: null,
        id_eleve: "eleve-1",
      },
    ]);
    expect(await services.preinscriptions.listerParEleve("absent")).toEqual([]);
  });

  it("refuse une préinscription dont les deux références sont nulles", async () => {
    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-vide",
        id_candidature: null,
        id_eleve: null,
      }),
    ).rejects.toMatchObject({
      name: "IntegriteCandidaturesPreinscriptionsError",
      code: "INTEGRITE",
      message: MESSAGE_REFERENCE_EXCLUSIVE,
    });
    expect(lireLignes("SELECT COUNT(*) AS count FROM preinscription;")[0]?.count).toBe(0);
  });

  it("refuse une préinscription dont les deux références sont renseignées", async () => {
    await services.candidatures.creer({ id_candidature: "candidature-1" });
    creerEleve();

    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-double",
        id_candidature: "candidature-1",
        id_eleve: "eleve-1",
      }),
    ).rejects.toBeInstanceOf(IntegriteCandidaturesPreinscriptionsError);
    expect(lireLignes("SELECT COUNT(*) AS count FROM preinscription;")[0]?.count).toBe(0);
  });

  it("refuse une préinscription rattachée à une candidature inexistante", async () => {
    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-absente",
        id_candidature: "absente",
        id_eleve: null,
      }),
    ).rejects.toMatchObject({
      name: "ReferenceCandidaturesPreinscriptionsError",
      code: "REFERENCE_INVALIDE",
    });
    expect(lireLignes("SELECT COUNT(*) AS count FROM preinscription;")[0]?.count).toBe(0);
  });

  it("refuse une préinscription rattachée à un élève inexistant", async () => {
    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-eleve-absent",
        id_candidature: null,
        id_eleve: "absent",
      }),
    ).rejects.toBeInstanceOf(ReferenceCandidaturesPreinscriptionsError);
    expect(lireLignes("SELECT COUNT(*) AS count FROM preinscription;")[0]?.count).toBe(0);
  });

  it("rejette les identifiants dupliqués sans remplacer la ligne existante", async () => {
    const candidature = await services.candidatures.creer({
      id_candidature: "candidature-1",
    });
    await expect(
      services.candidatures.creer({ id_candidature: "candidature-1" }),
    ).rejects.toBeInstanceOf(ConflitIdentifiantCandidaturesError);
    expect(await services.candidatures.obtenir("candidature-1")).toEqual(candidature);

    const preinscription = await services.preinscriptions.creer({
      id_preinscription: "preinscription-1",
      id_candidature: "candidature-1",
      id_eleve: null,
    });
    try {
      await services.preinscriptions.creer({
        id_preinscription: "preinscription-1",
        id_candidature: "candidature-1",
        id_eleve: null,
      });
      throw new Error("Une collision d’identifiant aurait dû échouer.");
    } catch (error) {
      expect(error).toBeInstanceOf(ConflitIdentifiantCandidaturesError);
      expect((error as Error).cause).toBeInstanceOf(SQLiteCommandError);
    }
    expect(await services.preinscriptions.obtenir("preinscription-1")).toEqual(preinscription);
    expect(await services.preinscriptions.lister()).toHaveLength(1);
  });

  it("laisse les données intactes après des écritures refusées", async () => {
    await services.candidatures.creer({ id_candidature: "candidature-1" });
    creerEleve();
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-1",
      id_candidature: "candidature-1",
      id_eleve: null,
    });
    await services.preinscriptions.creer({
      id_preinscription: "preinscription-2",
      id_candidature: null,
      id_eleve: "eleve-1",
    });

    const avant = {
      candidatures: lireLignes("SELECT id_candidature FROM candidature ORDER BY id_candidature;"),
      preinscriptions: lireLignes(`
        SELECT id_preinscription, id_candidature, id_eleve
        FROM preinscription
        ORDER BY id_preinscription;
      `),
    };

    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-vide",
        id_candidature: null,
        id_eleve: null,
      }),
    ).rejects.toBeInstanceOf(IntegriteCandidaturesPreinscriptionsError);
    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-double",
        id_candidature: "candidature-1",
        id_eleve: "eleve-1",
      }),
    ).rejects.toBeInstanceOf(IntegriteCandidaturesPreinscriptionsError);
    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-candidature-absente",
        id_candidature: "absente",
        id_eleve: null,
      }),
    ).rejects.toBeInstanceOf(ReferenceCandidaturesPreinscriptionsError);
    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-eleve-absent",
        id_candidature: null,
        id_eleve: "absent",
      }),
    ).rejects.toBeInstanceOf(ReferenceCandidaturesPreinscriptionsError);
    await expect(
      services.candidatures.creer({ id_candidature: "candidature-1" }),
    ).rejects.toBeInstanceOf(ConflitIdentifiantCandidaturesError);
    await expect(
      services.preinscriptions.creer({
        id_preinscription: "preinscription-1",
        id_candidature: "candidature-1",
        id_eleve: null,
      }),
    ).rejects.toBeInstanceOf(ConflitIdentifiantCandidaturesError);

    expect({
      candidatures: lireLignes("SELECT id_candidature FROM candidature ORDER BY id_candidature;"),
      preinscriptions: lireLignes(`
        SELECT id_preinscription, id_candidature, id_eleve
        FROM preinscription
        ORDER BY id_preinscription;
      `),
    }).toEqual(avant);
    expect(
      lireLignes("PRAGMA foreign_key_check;"),
    ).toEqual([]);
  });

  it("reconnaît une contrainte CHECK SQLite comme une violation d’intégrité du bloc", async () => {
    const sqlite = new SQLiteCommandError("CHECK constraint failed: preinscription", 275);

    try {
      await traduireErreurCandidaturesPreinscriptions("La préinscription", async () => {
        throw sqlite;
      });
      throw new Error("La contrainte CHECK aurait dû être traduite.");
    } catch (error) {
      expect(error).toBeInstanceOf(IntegriteCandidaturesPreinscriptionsError);
      expect((error as IntegriteCandidaturesPreinscriptionsError).message).toBe(
        MESSAGE_REFERENCE_EXCLUSIVE,
      );
      expect((error as Error).cause).toBeInstanceOf(SQLiteCommandError);
    }
  });
});
