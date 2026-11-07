import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrations } from "./index";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;

function creerCandidature(id: string): void {
  database.exec({
    sql: "INSERT INTO candidature (id_candidature) VALUES (?);",
    bind: [id],
  });
}

function creerEleve(id: string, etablissement = "etablissement-1"): void {
  database.exec({
    sql: "INSERT INTO eleve (id_eleve, id_etablissement) VALUES (?, ?);",
    bind: [id, etablissement],
  });
}

function creerPreinscription(
  id: string,
  candidature: string | null,
  eleve: string | null,
): void {
  database.exec({
    sql: `
      INSERT INTO preinscription (id_preinscription, id_candidature, id_eleve)
      VALUES (?, ?, ?);
    `,
    bind: [id, candidature, eleve],
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
});

afterEach(() => {
  database.close();
});

describe("migration candidatures_preinscriptions", () => {
  it("applique le registre 001–013 et crée les deux tables", () => {
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    expect(migrations[11]).toMatchObject({
      version: 12,
      name: "candidatures_preinscriptions",
    });
    expect(
      database.exec({
        sql: "SELECT version, name FROM schema_migrations ORDER BY version;",
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([
      { version: 1, name: "organisation_scolaire" },
      { version: 2, name: "cycle_annee_scolaire" },
      { version: 3, name: "catalogue_frais_tarification" },
      { version: 4, name: "facturation_creances" },
      { version: 5, name: "echeanciers_reglements" },
      { version: 6, name: "encaissements_credits_mobile_money" },
      { version: 7, name: "gestion_caisse" },
      { version: 8, name: "credits_reservations_remboursements" },
      { version: 9, name: "relances_balance_agee" },
      { version: 10, name: "synchronisation_offline_first" },
      { version: 11, name: "eleves_responsables" },
      { version: 12, name: "candidatures_preinscriptions" },
      { version: 13, name: "inscriptions_affectations" },
      { version: 14, name: "correction_005_echeanciers_reglements" },
      { version: 15, name: "correction_006_encaissements_credits" },
      { version: 16, name: "correction_007_gestion_caisse" },
    ]);
    expect(
      database.exec({
        sql: `
          SELECT name FROM sqlite_master
          WHERE type = 'table' AND name IN ('candidature', 'preinscription')
          ORDER BY name;
        `,
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([{ name: "candidature" }, { name: "preinscription" }]);
    expect(
      database.exec({
        sql: `
          SELECT name FROM sqlite_master
          WHERE type = 'index' AND name IN (
            'idx_preinscription_candidature',
            'idx_preinscription_eleve'
          )
          ORDER BY name;
        `,
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([
      { name: "idx_preinscription_candidature" },
      { name: "idx_preinscription_eleve" },
    ]);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("accepte une préinscription rattachée soit à une candidature, soit à un élève", () => {
    creerCandidature("candidature-1");
    creerEleve("eleve-1");
    creerPreinscription("preinscription-candidature", "candidature-1", null);
    creerPreinscription("preinscription-eleve", null, "eleve-1");

    expect(
      database.exec({
        sql: `
          SELECT id_preinscription, id_candidature, id_eleve
          FROM preinscription
          ORDER BY id_preinscription;
        `,
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([
      {
        id_preinscription: "preinscription-candidature",
        id_candidature: "candidature-1",
        id_eleve: null,
      },
      {
        id_preinscription: "preinscription-eleve",
        id_candidature: null,
        id_eleve: "eleve-1",
      },
    ]);
    expect(
      database.exec({
        sql: "PRAGMA foreign_key_check;",
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([]);
  });

  it("refuse le XOR incomplet et les références inconnues", () => {
    creerCandidature("candidature-1");
    creerEleve("eleve-1");

    expect(() =>
      creerPreinscription("preinscription-vide", null, null),
    ).toThrow();
    expect(() =>
      creerPreinscription("preinscription-double", "candidature-1", "eleve-1"),
    ).toThrow();
    expect(() =>
      creerPreinscription(
        "preinscription-candidature-absente",
        "absente",
        null,
      ),
    ).toThrow();
    expect(() =>
      creerPreinscription("preinscription-eleve-absent", null, "absent"),
    ).toThrow();
    expect(
      database.exec({
        sql: "SELECT COUNT(*) AS count FROM preinscription;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.count,
    ).toBe(0);
    expect(
      database.exec({
        sql: "PRAGMA foreign_key_check;",
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([]);
  });
});
