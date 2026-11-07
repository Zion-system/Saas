import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrations } from "./index";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;

function appliquerMigration(sql: string): void {
  database.exec("BEGIN IMMEDIATE;");

  try {
    database.exec(sql);
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

function insererTarif(
  overrides: Partial<{
    id: string;
    type: string;
    periodicite: string;
    annee: string;
    portee: string;
    niveau: string | null;
    filiere: string | null;
    classe: string | null;
    montant: number;
    debut: string;
    fin: string | null;
  }> = {},
): void {
  const tarif = {
    id: "tarif-1",
    type: "type-1",
    periodicite: "periodicite-1",
    annee: "annee-1",
    portee: "ETABLISSEMENT",
    niveau: null,
    filiere: null,
    classe: null,
    montant: 10000,
    debut: "2026-01-01",
    fin: null,
    ...overrides,
  };

  database.exec({
    sql: `
      INSERT INTO tarif (
        id_tarif, id_type_frais, id_periodicite, id_annee_scolaire,
        type_portee, id_niveau, id_filiere, id_classe_annuelle,
        montant_brut_fcfa, date_debut_effet, date_fin_effet
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      tarif.id,
      tarif.type,
      tarif.periodicite,
      tarif.annee,
      tarif.portee,
      tarif.niveau,
      tarif.filiere,
      tarif.classe,
      tarif.montant,
      tarif.debut,
      tarif.fin,
    ],
  });
}

function insererPolitique(
  id: string,
  code: string,
  nature: string,
  forme: string,
  valeur: string,
  debut: string | null = null,
  fin: string | null = null,
): void {
  database.exec({
    sql: `
      INSERT INTO politique_remise (
        id_politique_remise, code_politique, libelle, nature_remise,
        forme_remise, valeur_remise, date_debut_validite, date_fin_validite
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [id, code, code, nature, forme, valeur, debut, fin],
  });
}

describe("migration catalogue_frais_tarification", () => {
  beforeEach(async () => {
    const sqlite3 = await sqlite3InitModule();
    database = new sqlite3.oo1.DB(":memory:");
    database.exec("PRAGMA foreign_keys = ON;");

    for (const migration of migrations) {
      appliquerMigration(migration.sql);
    }

    database.exec(`
      INSERT INTO etablissement VALUES ('etablissement-1');
      INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
        VALUES ('annee-1', 'etablissement-1');
      INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
        VALUES ('annee-2', 'etablissement-1');
      INSERT INTO niveau_enseignement VALUES ('niveau-1');
      INSERT INTO modele_classe VALUES ('modele-1');
      INSERT INTO classe_annuelle (
        id_classe_annuelle, id_annee_scolaire, id_niveau,
        id_modele_classe, id_etablissement
      ) VALUES ('classe-1', 'annee-1', 'niveau-1', 'modele-1', 'etablissement-1');
      INSERT INTO classe_annuelle (
        id_classe_annuelle, id_annee_scolaire, id_niveau,
        id_modele_classe, id_etablissement
      ) VALUES ('classe-2', 'annee-2', 'niveau-1', 'modele-1', 'etablissement-1');
      INSERT INTO type_frais (id_type_frais, code_type_frais, libelle)
        VALUES ('type-1', 'SCOLARITE', 'Scolarité');
      INSERT INTO periodicite (id_periodicite, code_periodicite, libelle)
        VALUES ('periodicite-1', 'ANNUELLE', 'Annuelle');
    `);
  });

  afterEach(() => {
    database.close();
  });

  it("applique le registre en SQLite WASM avec les clés étrangères activées", () => {
    const rows = database.exec({
      sql: "PRAGMA foreign_keys;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(rows[0]?.foreign_keys).toBe(1);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
  });

  it("garantit les codes uniques et stables des référentiels", () => {
    expect(() =>
      database.exec(
        "INSERT INTO type_frais (id_type_frais, code_type_frais, libelle) VALUES ('type-2', 'SCOLARITE', 'Autre');",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE periodicite SET code_periodicite = 'MENSUELLE' WHERE id_periodicite = 'periodicite-1';",
      ),
    ).toThrow();
  });

  it("contrôle portée, montant, dates, références et classe du tarif", () => {
    insererTarif({ portee: "NIVEAU", niveau: "niveau-1" });

    expect(() =>
      insererTarif({ id: "tarif-bad-scope", portee: "NIVEAU" }),
    ).toThrow();
    expect(() => insererTarif({ id: "tarif-negative", montant: -1 })).toThrow();
    expect(() =>
      insererTarif({
        id: "tarif-bad-date",
        debut: "2026-02-01",
        fin: "2026-02-01",
      }),
    ).toThrow();
    expect(() =>
      insererTarif({ id: "tarif-impossible-date", debut: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      insererTarif({
        id: "tarif-bad-class-year",
        portee: "CLASSE",
        classe: "classe-2",
      }),
    ).toThrow();
    expect(() =>
      insererTarif({ id: "tarif-bad-type", type: "absent" }),
    ).toThrow();
  });

  it("n'autorise pas de nouveaux tarifs pour un type inactif et préserve ses références", () => {
    insererTarif();
    database.exec(
      "INSERT INTO type_frais (id_type_frais, code_type_frais, libelle, est_actif) VALUES ('type-inutilise', 'AUTRE', 'Autre', 0);",
    );
    database.exec(
      "UPDATE type_frais SET est_actif = 0 WHERE id_type_frais = 'type-1';",
    );

    expect(() => insererTarif({ id: "tarif-disabled" })).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM type_frais WHERE id_type_frais = 'type-inutilise';",
      ),
    ).toThrow();
    expect(() =>
      database.exec("DELETE FROM type_frais WHERE id_type_frais = 'type-1';"),
    ).toThrow();
  });

  it("borne les remises et conserve une attribution annulée", () => {
    insererPolitique(
      "politique-1",
      "FRATRIE",
      "FRATRIE",
      "POURCENTAGE",
      "25.5",
      "2026-01-01",
      "2026-12-31",
    );
    insererPolitique(
      "politique-2",
      "EXONERATION",
      "EXONERATION",
      "POURCENTAGE",
      "100",
    );

    expect(() =>
      insererPolitique(
        "bad-percent",
        "BAD_PERCENT",
        "SOCIALE",
        "POURCENTAGE",
        "100.01",
      ),
    ).toThrow();
    expect(() =>
      insererPolitique(
        "bad-fixed",
        "BAD_FIXED",
        "SOCIALE",
        "MONTANT_FIXE",
        "12.5",
      ),
    ).toThrow();
    expect(() =>
      insererPolitique(
        "bad-exoneration",
        "BAD_EXONERATION",
        "EXONERATION",
        "POURCENTAGE",
        "99",
      ),
    ).toThrow();

    database.exec({
      sql: `
        INSERT INTO attribution_remise (
          id_attribution_remise, id_politique_remise, id_eleve,
          id_annee_scolaire, motif_specifique, rang_fratrie,
          date_debut_effet, date_fin_effet, attribue_par,
          date_attribution, date_annulation, motif_annulation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "attribution-1",
        "politique-1",
        "eleve-a-confirmer",
        "annee-1",
        "Attribution familiale",
        2,
        "2026-02-01",
        "2026-06-30",
        "utilisateur-1",
        "2026-01-15T10:00:00+01:00",
        "2026-03-01T10:00:00+01:00",
        "Correction administrative",
      ],
    });

    expect(() =>
      database.exec({
        sql: `
          INSERT INTO attribution_remise (
            id_attribution_remise, id_politique_remise, id_eleve,
            id_annee_scolaire, motif_specifique, rang_fratrie,
            attribue_par, date_attribution
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        bind: [
          "attribution-hors-periode",
          "politique-1",
          "eleve-2",
          "annee-1",
          "Hors période",
          0,
          "utilisateur-1",
          "2026-01-15T10:00:00+01:00",
        ],
      }),
    ).toThrow();
  });

  it("annule le DDL d'une migration échouée et autorise sa reprise", () => {
    expect(() => {
      database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE migration_partielle (id TEXT PRIMARY KEY);
        INSERT INTO table_absente VALUES ('echec');
        COMMIT;
      `);
    }).toThrow();

    database.exec("ROLLBACK;");
    expect(() =>
      database.exec(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'migration_partielle';",
      ),
    ).not.toThrow();
    expect(
      database.exec({
        sql: "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'migration_partielle';",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.count,
    ).toBe(0);
    database.exec(
      "BEGIN IMMEDIATE; CREATE TABLE migration_partielle (id TEXT PRIMARY KEY); COMMIT;",
    );
  });
});
