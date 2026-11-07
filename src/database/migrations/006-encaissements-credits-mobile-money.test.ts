import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrations } from "./index";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;

function appliquerMigration(migration: (typeof migrations)[number]): void {
  database.exec("BEGIN IMMEDIATE;");

  try {
    database.exec(migration.sql);
    database.exec({
      sql: "INSERT INTO schema_migrations (version, name) VALUES (?, ?);",
      bind: [migration.version, migration.name],
    });
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // Préserver l'erreur initiale.
    }

    throw error;
  }
}

function insererAffectation(
  id: string,
  encaissement: string | null,
  mouvementCredit: string | null,
  montant: number,
): void {
  database.exec({
    sql: `
      INSERT INTO affectation_reglement (
        id_affectation_reglement, id_encaissement,
        id_mouvement_credit_utilisation, montant_affecte_fcfa
      ) VALUES (?, ?, ?, ?);
    `,
    bind: [id, encaissement, mouvementCredit, montant],
  });
}

function insererMouvementCredit(
  id: string,
  montant: number,
  nature: string,
  affectation: string | null,
): void {
  database.exec({
    sql: `
      INSERT INTO mouvement_credit (
        id_mouvement_credit, montant_mouvement_fcfa,
        nature_mouvement, id_affectation_reglement
      ) VALUES (?, ?, ?, ?);
    `,
    bind: [id, montant, nature, affectation],
  });
}

function lireCompte(sql: string): number {
  const rows = database.exec({
    sql,
    rowMode: "object",
    returnValue: "resultRows",
  });

  return Number(rows[0]?.count);
}

describe("migration encaissements_credits_mobile_money", () => {
  beforeEach(async () => {
    const sqlite3 = await sqlite3InitModule();
    database = new sqlite3.oo1.DB(":memory:");
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    for (const migration of migrations) {
      appliquerMigration(migration);
    }
  });

  afterEach(() => {
    database.close();
  });

  it("applique successivement les migrations 001 à 012 avec les FK actives", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(versions.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("n’enregistre un encaissement que comme montant reçu, entier et positif", () => {
    database.exec({
      sql: "INSERT INTO encaissement VALUES (?, ?);",
      bind: ["encaissement-1", 12500],
    });

    expect(() =>
      database.exec({
        sql: "INSERT INTO encaissement VALUES (?, ?);",
        bind: ["encaissement-zero", 0],
      }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: "INSERT INTO encaissement VALUES (?, ?);",
        bind: ["encaissement-decimal", 12.5],
      }),
    ).toThrow();
  });

  it("rattache une affectation à un encaissement réel sans imposer de cible non documentée", () => {
    database.exec({
      sql: "INSERT INTO encaissement VALUES (?, ?);",
      bind: ["encaissement-1", 12500],
    });
    insererAffectation("affectation-1", "encaissement-1", null, 8000);
    insererAffectation("affectation-2", "encaissement-1", null, 4500);

    expect(() =>
      insererAffectation("affectation-sans-source", null, null, 1000),
    ).toThrow();
    expect(() =>
      insererAffectation(
        "affectation-encaissement-absent",
        "absent",
        null,
        1000,
      ),
    ).toThrow();
  });

  it("exige la création atomique et 1:1 du mouvement UTILISATION et de l’affectation", () => {
    database.exec("BEGIN IMMEDIATE;");
    insererAffectation(
      "affectation-credit-1",
      null,
      "mouvement-credit-1",
      3000,
    );
    insererMouvementCredit(
      "mouvement-credit-1",
      3000,
      "UTILISATION",
      "affectation-credit-1",
    );
    database.exec("COMMIT;");

    expect(lireCompte("SELECT COUNT(*) AS count FROM encaissement;")).toBe(0);
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM affectation_reglement;"),
    ).toBe(1);
    expect(lireCompte("SELECT COUNT(*) AS count FROM mouvement_credit;")).toBe(
      1,
    );
    expect(() =>
      insererMouvementCredit(
        "mouvement-credit-double",
        3000,
        "UTILISATION",
        "affectation-credit-1",
      ),
    ).toThrow();

    expect(() => {
      database.exec("BEGIN IMMEDIATE;");
      insererAffectation(
        "affectation-credit-incomplete",
        null,
        "mouvement-credit-absent",
        500,
      );
      database.exec("COMMIT;");
    }).toThrow();
    database.exec("ROLLBACK;");

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM affectation_reglement WHERE id_affectation_reglement = 'affectation-credit-incomplete';",
      ),
    ).toBe(0);

    expect(() =>
      insererMouvementCredit(
        "mouvement-utilisation-sans-affectation",
        500,
        "UTILISATION",
        null,
      ),
    ).toThrow();
    expect(() =>
      insererMouvementCredit(
        "mouvement-autre-avec-affectation",
        500,
        "CREDIT",
        "affectation-credit-1",
      ),
    ).toThrow();
  });

  it("sépare les états Mobile Money et ne crée pas d’encaissement lors d’une déclaration hors ligne", () => {
    database.exec({
      sql: `
        INSERT INTO transaction_mobile_money (
          id_transaction_mobile_money, reference_externe,
          etat_synchronisation_technique, etat_verification_financiere
        ) VALUES (?, ?, ?, ?);
      `,
      bind: [
        "transaction-locale",
        "ref-locale",
        "LOCALE_NON_SYNCHRONISEE",
        "DECLARE",
      ],
    });
    database.exec({
      sql: `
        INSERT INTO transaction_mobile_money (
          id_transaction_mobile_money, reference_externe,
          etat_synchronisation_technique, etat_verification_financiere
        ) VALUES (?, ?, ?, ?);
      `,
      bind: [
        "transaction-synchronisee-non-verifiee",
        "ref-synchronisee",
        "SYNCHRONISEE",
        "EN_ATTENTE_VERIFICATION",
      ],
    });

    expect(lireCompte("SELECT COUNT(*) AS count FROM encaissement;")).toBe(0);
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO transaction_mobile_money (
            id_transaction_mobile_money, reference_externe,
            etat_synchronisation_technique, etat_verification_financiere
          ) VALUES (?, ?, ?, ?);
        `,
        bind: ["transaction-etat-invalide", "ref-invalide", "AUCUN", "DECLARE"],
      }),
    ).toThrow();
  });
});
