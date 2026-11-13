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

function insererAffectation(options: {
  id: string;
  encaissement?: string | null;
  mouvementCredit?: string | null;
  creance?: string | null;
  echeance?: string | null;
  montant: number;
  date?: string;
}): void {
  database.exec({
    sql: `
      INSERT INTO affectation_reglement (
        id_affectation_reglement, id_encaissement,
        id_mouvement_credit_utilisation, id_creance,
        id_echeance_creance, montant_affecte_fcfa, date_affectation
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.encaissement ?? null,
      options.mouvementCredit ?? null,
      options.creance ?? null,
      options.echeance ?? null,
      options.montant,
      options.date ?? "2026-11-04T10:00:00+01:00",
    ],
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

function insererTransactionMobileMoney(options: {
  id: string;
  reference: string;
  etatSync?: string;
  etatFinancier?: string;
  encaissement?: string | null;
  dateConfirmation?: string | null;
  fournisseur?: string;
  compteMarchand?: string;
  montant?: number;
}): void {
  database.exec({
    sql: `
      INSERT INTO transaction_mobile_money (
        id_transaction_mobile_money, id_encaissement, fournisseur,
        compte_marchand, reference_externe, montant_declare_fcfa,
        telephone_payeur, date_declaration, date_confirmation,
        etat_synchronisation_technique, etat_financier
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.encaissement ?? null,
      options.fournisseur ?? "MTN_MOMO",
      options.compteMarchand ?? "compte-1",
      options.reference,
      options.montant ?? 5000,
      "+242060000000",
      "2026-11-04T09:00:00+01:00",
      options.dateConfirmation ?? null,
      options.etatSync ?? "CREE_LOCALEMENT",
      options.etatFinancier ?? "INITIE",
    ],
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

    database.exec(`
      INSERT INTO etablissement (id_etablissement) VALUES ('etablissement-1');
      INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
        VALUES ('annee-1', 'etablissement-1');
      INSERT INTO type_frais (id_type_frais, code_type_frais, libelle)
        VALUES ('type-1', 'SCOLARITE', 'Scolarité');
      INSERT INTO creance (
        id_creance, id_eleve, id_annee_scolaire, id_type_frais,
        libelle_type_frais_snapshot, origine_creation, auteur_creation,
        date_creation, motif_creation, montant_brut_fcfa,
        montant_remise_fcfa, montant_net_initial_fcfa
      ) VALUES (
        'creance-1', 'eleve-externe', 'annee-1', 'type-1',
        'Scolarité', 'MANUELLE', 'utilisateur-externe',
        '2026-01-01T10:00:00+01:00', 'Création manuelle',
        10000, 0, 10000
      );
      INSERT INTO creance (
        id_creance, id_eleve, id_annee_scolaire, id_type_frais,
        libelle_type_frais_snapshot, origine_creation, auteur_creation,
        date_creation, motif_creation, montant_brut_fcfa,
        montant_remise_fcfa, montant_net_initial_fcfa
      ) VALUES (
        'creance-2', 'eleve-externe', 'annee-1', 'type-1',
        'Scolarité', 'MANUELLE', 'utilisateur-externe',
        '2026-01-01T10:00:00+01:00', 'Création manuelle',
        8000, 0, 8000
      );
      INSERT INTO plan_reglement_creance (
        id_plan_reglement_creance, id_creance,
        montant_total_planifie_fcfa, type_plan, etat_plan
      ) VALUES ('plan-1', 'creance-1', 10000, 'INITIAL', 'BROUILLON');
      INSERT INTO echeance_creance (
        id_echeance_creance, id_creance, id_plan_reglement_creance,
        montant_exigible_fcfa, date_exigibilite, rang, etat_administratif
      ) VALUES ('echeance-1', 'creance-1', 'plan-1', 10000, '2026-10-01', 1, 'ADMIN');
    `);
  });

  afterEach(() => {
    database.close();
  });

  it("applique successivement les migrations 001 à 015 avec les FK actives", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(versions.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("n’enregistre un encaissement que comme montant reçu, entier et positif, jamais supprimé", () => {
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
    expect(() =>
      database.exec("DELETE FROM encaissement WHERE id_encaissement = 'encaissement-1';"),
    ).toThrow();
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM encaissement;"),
    ).toBe(1);
  });

  it("exige le XOR strict d’origine et de cible, un montant positif et une date (Q-09, Arbitrages 1 et 3)", () => {
    database.exec({
      sql: "INSERT INTO encaissement VALUES (?, ?);",
      bind: ["encaissement-1", 12500],
    });
    insererAffectation({
      id: "affectation-1",
      encaissement: "encaissement-1",
      creance: "creance-1",
      montant: 8000,
    });
    insererAffectation({
      id: "affectation-2",
      encaissement: "encaissement-1",
      echeance: "echeance-1",
      montant: 4500,
    });

    expect(() =>
      insererAffectation({ id: "affectation-sans-source", creance: "creance-1", montant: 1000 }),
    ).toThrow();
    expect(() =>
      insererAffectation({
        id: "affectation-double-source",
        encaissement: "encaissement-1",
        mouvementCredit: "mouvement-credit-x",
        creance: "creance-1",
        montant: 1000,
      }),
    ).toThrow();
    expect(() =>
      insererAffectation({
        id: "affectation-sans-cible",
        encaissement: "encaissement-1",
        montant: 1000,
      }),
    ).toThrow();
    expect(() =>
      insererAffectation({
        id: "affectation-double-cible",
        encaissement: "encaissement-1",
        creance: "creance-1",
        echeance: "echeance-1",
        montant: 1000,
      }),
    ).toThrow();
    expect(() =>
      insererAffectation({
        id: "affectation-montant-zero",
        encaissement: "encaissement-1",
        creance: "creance-1",
        montant: 0,
      }),
    ).toThrow();
    expect(() =>
      insererAffectation({
        id: "affectation-montant-decimal",
        encaissement: "encaissement-1",
        creance: "creance-1",
        montant: 10.5,
      }),
    ).toThrow();
    expect(() =>
      insererAffectation({
        id: "affectation-creance-absente",
        encaissement: "encaissement-1",
        creance: "absente",
        montant: 1000,
      }),
    ).toThrow();
    expect(() =>
      insererAffectation({
        id: "affectation-echeance-absente",
        encaissement: "encaissement-1",
        echeance: "absente",
        montant: 1000,
      }),
    ).toThrow();

    expect(
      lireCompte("SELECT COUNT(*) AS count FROM affectation_reglement;"),
    ).toBe(2);
    const indexNames = database.exec({
      sql: `
        SELECT name FROM sqlite_master
        WHERE type = 'index' AND name IN (
          'idx_affectation_creance', 'idx_affectation_echeance',
          'idx_affectation_encaissement'
        ) ORDER BY name;
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });
    expect(indexNames.map((row) => row.name)).toEqual([
      "idx_affectation_creance",
      "idx_affectation_echeance",
      "idx_affectation_encaissement",
    ]);
  });

  it("conserve les affectations en append-only (Arbitrage 5)", () => {
    database.exec({
      sql: "INSERT INTO encaissement VALUES (?, ?);",
      bind: ["encaissement-1", 12500],
    });
    insererAffectation({
      id: "affectation-1",
      encaissement: "encaissement-1",
      creance: "creance-1",
      montant: 8000,
    });

    expect(() =>
      database.exec(
        "UPDATE affectation_reglement SET montant_affecte_fcfa = 9000 WHERE id_affectation_reglement = 'affectation-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM affectation_reglement WHERE id_affectation_reglement = 'affectation-1';",
      ),
    ).toThrow();
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM affectation_reglement;"),
    ).toBe(1);
  });

  it("exige la création atomique et 1:1 du mouvement UTILISATION et de l’affectation", () => {
    database.exec("BEGIN IMMEDIATE;");
    insererMouvementCredit(
      "mouvement-credit-1",
      3000,
      "UTILISATION",
      "affectation-credit-1",
    );
    insererAffectation({
      id: "affectation-credit-1",
      mouvementCredit: "mouvement-credit-1",
      creance: "creance-1",
      montant: 3000,
    });
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
      insererAffectation({
        id: "affectation-credit-incomplete",
        mouvementCredit: "mouvement-credit-absent",
        creance: "creance-1",
        montant: 500,
      });
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

  it("sépare les états Mobile Money et n’active l’encaissement qu’à la confirmation (Q-04)", () => {
    database.exec({
      sql: "INSERT INTO encaissement VALUES (?, ?);",
      bind: ["encaissement-confirme", 5000],
    });
    insererTransactionMobileMoney({
      id: "transaction-locale",
      reference: "ref-locale",
      etatSync: "CREE_LOCALEMENT",
      etatFinancier: "INITIE",
    });
    insererTransactionMobileMoney({
      id: "transaction-en-attente",
      reference: "ref-attente",
      etatSync: "EN_ATTENTE_SERVEUR",
      etatFinancier: "INITIE",
    });
    insererTransactionMobileMoney({
      id: "transaction-confirmee",
      reference: "ref-confirmee",
      etatSync: "CONFIRME_SERVEUR",
      etatFinancier: "CONFIRME",
      encaissement: "encaissement-confirme",
      dateConfirmation: "2026-11-04T10:30:00+01:00",
    });

    expect(lireCompte("SELECT COUNT(*) AS count FROM encaissement;")).toBe(1);
    expect(() =>
      insererTransactionMobileMoney({
        id: "transaction-etat-sync-invalide",
        reference: "ref-invalide-sync",
        etatSync: "AUCUN",
      }),
    ).toThrow();
    expect(() =>
      insererTransactionMobileMoney({
        id: "transaction-etat-financier-invalide",
        reference: "ref-invalide-financier",
        etatFinancier: "DECLARE",
      }),
    ).toThrow();
    expect(() =>
      insererTransactionMobileMoney({
        id: "transaction-confirmee-sans-encaissement",
        reference: "ref-confirmee-sans-encaissement",
        etatFinancier: "CONFIRME",
        dateConfirmation: "2026-11-04T10:30:00+01:00",
      }),
    ).toThrow();
    expect(() =>
      insererTransactionMobileMoney({
        id: "transaction-confirmee-sans-date",
        reference: "ref-confirmee-sans-date",
        etatFinancier: "CONFIRME",
        encaissement: "encaissement-confirme",
      }),
    ).toThrow();
    expect(() =>
      insererTransactionMobileMoney({
        id: "transaction-initie-avec-encaissement",
        reference: "ref-initie-avec-encaissement",
        encaissement: "encaissement-confirme",
      }),
    ).toThrow();
    expect(() =>
      insererTransactionMobileMoney({
        id: "transaction-reference-dupliquee",
        reference: "ref-locale",
      }),
    ).toThrow();
    expect(() =>
      insererTransactionMobileMoney({
        id: "transaction-montant-zero",
        reference: "ref-montant-zero",
        montant: 0,
      }),
    ).toThrow();
  });
});
