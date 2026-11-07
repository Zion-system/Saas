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

function insererPeriode(
  id: string,
  annee: string,
  debut = "2026-01-01",
  fin = "2026-06-01",
): void {
  database.exec({
    sql: `
      INSERT INTO periode_facturation (
        id_periode_facturation, id_annee_scolaire,
        date_debut_periode, date_fin_periode
      ) VALUES (?, ?, ?, ?);
    `,
    bind: [id, annee, debut, fin],
  });
}

function insererCampagne(
  id: string,
  annee: string,
  periode: string,
  typeFrais = "type-1",
): void {
  database.exec({
    sql: `
      INSERT INTO campagne_facturation (
        id_campagne_facturation, id_annee_scolaire, id_type_frais,
        id_periode_facturation, auteur_lancement
      ) VALUES (?, ?, ?, ?, ?);
    `,
    bind: [id, annee, typeFrais, periode, "utilisateur-externe"],
  });
}

function insererExecution(id: string, campagne: string): void {
  database.exec({
    sql: `
      INSERT INTO execution_campagne_facturation (
        id_execution_campagne, id_campagne_facturation
      ) VALUES (?, ?);
    `,
    bind: [id, campagne],
  });
}

function insererCreance(
  overrides: Partial<{
    id: string;
    eleve: string;
    annee: string;
    typeFrais: string;
    periode: string | null;
    origine: string;
    campagne: string | null;
    execution: string | null;
    auteur: string | null;
    dateCreation: string | null;
    motifCreation: string | null;
    declencheur: string | null;
    brut: number;
    remise: number;
    net: number;
  }> = {},
): void {
  const creance = {
    id: "creance-1",
    eleve: "eleve-externe",
    annee: "annee-1",
    typeFrais: "type-1",
    periode: null,
    origine: "MANUELLE",
    campagne: null,
    execution: null,
    auteur: "utilisateur-externe",
    dateCreation: "2026-02-01T10:00:00+01:00",
    motifCreation: "Facturation exceptionnelle",
    declencheur: null,
    brut: 10000,
    remise: 0,
    net: 10000,
    ...overrides,
  };

  database.exec({
    sql: `
      INSERT INTO creance (
        id_creance, id_eleve, id_annee_scolaire, id_type_frais,
        libelle_type_frais_snapshot, id_periode_facturation,
        origine_creation, id_campagne_facturation, id_execution_campagne,
        auteur_creation, date_creation, motif_creation,
        id_evenement_declencheur, montant_brut_fcfa,
        montant_remise_fcfa, montant_net_initial_fcfa
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      creance.id,
      creance.eleve,
      creance.annee,
      creance.typeFrais,
      "Scolarité",
      creance.periode,
      creance.origine,
      creance.campagne,
      creance.execution,
      creance.auteur,
      creance.dateCreation,
      creance.motifCreation,
      creance.declencheur,
      creance.brut,
      creance.remise,
      creance.net,
    ],
  });
}

describe("migration facturation_creances", () => {
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

    database.exec(`
      INSERT INTO etablissement VALUES ('etablissement-1');
      INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
        VALUES ('annee-1', 'etablissement-1');
      INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
        VALUES ('annee-2', 'etablissement-1');
      INSERT INTO type_frais (id_type_frais, code_type_frais, libelle)
        VALUES ('type-1', 'SCOLARITE', 'Scolarité');
    `);
  });

  afterEach(() => {
    database.close();
  });

  it("applique toutes les migrations successivement depuis la version 1", () => {
    const applied = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(applied.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("contrôle les bornes calendaires de la période sans inventer d'unicité", () => {
    insererPeriode("periode-1", "annee-1", "2026-01-01", "2026-06-01");
    insererPeriode("periode-2", "annee-1", "2026-06-01", "2026-12-01");

    expect(() =>
      insererPeriode("periode-invalide", "annee-1", "2026-02-30", "2026-06-01"),
    ).toThrow();
    expect(() =>
      insererPeriode("periode-inversee", "annee-1", "2026-06-01", "2026-06-01"),
    ).toThrow();
    expect(() =>
      insererPeriode("periode-sans-annee", "annee-inconnue"),
    ).toThrow();
  });

  it("rattache campagne et période à la même année et permet plusieurs exécutions", () => {
    insererPeriode("periode-1", "annee-1");
    insererPeriode("periode-2", "annee-2");
    insererCampagne("campagne-1", "annee-1", "periode-1");
    insererExecution("execution-1", "campagne-1");
    insererExecution("execution-2", "campagne-1");

    expect(() =>
      insererCampagne("campagne-incoherente", "annee-1", "periode-2"),
    ).toThrow();
    expect(() =>
      insererCampagne("campagne-sans-type", "annee-1", "periode-1", "absent"),
    ).toThrow();
  });

  it("contrôle les origines de créance et la cohérence de la campagne/exécution", () => {
    insererPeriode("periode-1", "annee-1");
    insererCampagne("campagne-1", "annee-1", "periode-1");
    insererCampagne("campagne-2", "annee-1", "periode-1");
    insererExecution("execution-1", "campagne-1");
    insererExecution("execution-2", "campagne-2");

    insererCreance({
      id: "creance-campagne",
      origine: "CAMPAGNE",
      periode: "periode-1",
      campagne: "campagne-1",
      execution: "execution-1",
      auteur: null,
      dateCreation: null,
      motifCreation: null,
    });

    expect(() =>
      insererCreance({
        id: "creance-mauvaise-execution",
        origine: "CAMPAGNE",
        campagne: "campagne-1",
        execution: "execution-2",
        auteur: null,
        dateCreation: null,
        motifCreation: null,
      }),
    ).toThrow();
    expect(() =>
      insererCreance({
        id: "creance-manuelle-sans-motif",
        motifCreation: null,
      }),
    ).toThrow();
    expect(() =>
      insererCreance({
        id: "creance-automatique-sans-declencheur",
        origine: "AUTOMATIQUE",
        auteur: null,
        dateCreation: null,
        motifCreation: null,
      }),
    ).toThrow();
    expect(() =>
      insererCreance({ id: "creance-net-faux", net: 9999 }),
    ).toThrow();
  });

  it("préserve les snapshots et exige une annulation motivée", () => {
    insererCreance();

    expect(() =>
      database.exec(
        "UPDATE creance SET montant_brut_fcfa = 9000 WHERE id_creance = 'creance-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec("DELETE FROM creance WHERE id_creance = 'creance-1';"),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE creance SET etat_administratif = 'ANNULEE' WHERE id_creance = 'creance-1';",
      ),
    ).toThrow();

    database.exec({
      sql: `
        UPDATE creance
        SET etat_administratif = 'ANNULEE',
            motif_annulation = ?, auteur_annulation = ?, date_annulation = ?
        WHERE id_creance = ?;
      `,
      bind: [
        "Erreur de facturation",
        "utilisateur-externe",
        "2026-02-02T10:00:00+01:00",
        "creance-1",
      ],
    });
  });

  it("annule une migration en échec et permet son rejeu dans la même connexion", () => {
    expect(() =>
      database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE migration_partielle_004 (id TEXT PRIMARY KEY);
        INSERT INTO table_absente VALUES ('echec');
        COMMIT;
      `),
    ).toThrow();

    database.exec("ROLLBACK;");
    expect(
      database.exec({
        sql: "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'migration_partielle_004';",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.count,
    ).toBe(0);
    database.exec(
      "BEGIN IMMEDIATE; CREATE TABLE migration_partielle_004 (id TEXT PRIMARY KEY); COMMIT;",
    );
  });
});
