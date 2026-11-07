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

function lireCompte(sql: string): number {
  const rows = database.exec({
    sql,
    rowMode: "object",
    returnValue: "resultRows",
  });

  return Number(rows[0]?.count);
}

function insererSession(id: string, fonds = 10000): void {
  database.exec({
    sql: `
      INSERT INTO session_caisse (
        id_session_caisse, id_poste_caisse, id_appareil, fonds_initial_fcfa
      ) VALUES (?, ?, ?, ?);
    `,
    bind: [id, "poste-1", "appareil-1", fonds],
  });
}

function insererCloture(id: string, session: string): void {
  database.exec({
    sql: `
      INSERT INTO cloture_caisse (
        id_cloture_caisse, id_session_caisse, date_cloture,
        solde_theorique_fcfa, montant_physique_fcfa, ecart_fcfa
      ) VALUES (?, ?, ?, ?, ?, ?);
    `,
    bind: [id, session, "2026-11-04T17:00:00+01:00", 12000, 11500, -500],
  });
}

describe("migration gestion_caisse", () => {
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
      INSERT INTO poste_caisse VALUES ('poste-1');
      INSERT INTO appareil VALUES ('appareil-1');
    `);
    insererSession("session-1");
    insererSession("session-2");
  });

  afterEach(() => {
    database.close();
  });

  it("applique toutes les migrations 001 à 012 dans l’ordre avec les FK actives", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(versions.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("crée les neuf relations avec leurs FK propriétaires", () => {
    const tables = database.exec({
      sql: `
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name IN (
          'poste_caisse', 'appareil', 'session_caisse', 'mouvement_caisse',
          'cloture_caisse', 'detail_comptage_caisse', 'transmission_fonds',
          'rapprochement_caisse', 'justification_ecart_caisse'
        ) ORDER BY name;
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(tables).toHaveLength(9);
    expect(() => insererSession("session-invalide", 100.5)).toThrow();
    expect(() =>
      database.exec(
        "INSERT INTO session_caisse VALUES ('session-sans-poste', 'absent', 'appareil-1', 100);",
      ),
    ).toThrow();
  });

  it("fige l’instantané de clôture et bloque les mouvements ordinaires ultérieurs", () => {
    database.exec({
      sql: "INSERT INTO mouvement_caisse VALUES (?, ?, ?);",
      bind: ["mouvement-avant-cloture", "session-1", 2500],
    });
    insererCloture("cloture-1", "session-1");

    expect(() => insererCloture("cloture-2", "session-1")).not.toThrow();
    expect(() =>
      database.exec({
        sql: "INSERT INTO mouvement_caisse VALUES (?, ?, ?);",
        bind: ["mouvement-apres-cloture", "session-1", 100],
      }),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE mouvement_caisse SET montant_fcfa = 3000 WHERE id_mouvement_caisse = 'mouvement-avant-cloture';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE cloture_caisse SET montant_physique_fcfa = 12000 WHERE id_cloture_caisse = 'cloture-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM cloture_caisse WHERE id_cloture_caisse = 'cloture-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE session_caisse SET fonds_initial_fcfa = 11000 WHERE id_session_caisse = 'session-1';",
      ),
    ).toThrow();
  });

  it("conserve les détails et recomptages sans écrasement", () => {
    insererCloture("cloture-comptage", "session-1");
    database.exec({
      sql: `
        INSERT INTO detail_comptage_caisse (
          id_detail_comptage_caisse, id_cloture_caisse, numero_comptage,
          valeur_unitaire_fcfa, quantite
        ) VALUES (?, ?, ?, ?, ?);
      `,
      bind: ["detail-initial", "cloture-comptage", 1, 1000, 5],
    });
    database.exec({
      sql: `
        INSERT INTO detail_comptage_caisse (
          id_detail_comptage_caisse, id_cloture_caisse, numero_comptage,
          valeur_unitaire_fcfa, quantite
        ) VALUES (?, ?, ?, ?, ?);
      `,
      bind: ["detail-recomptage", "cloture-comptage", 2, 1000, 4],
    });

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM detail_comptage_caisse WHERE id_cloture_caisse = 'cloture-comptage';",
      ),
    ).toBe(2);
    expect(() =>
      database.exec(
        "UPDATE detail_comptage_caisse SET quantite = 4 WHERE id_detail_comptage_caisse = 'detail-initial';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM detail_comptage_caisse WHERE id_detail_comptage_caisse = 'detail-initial';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "INSERT INTO detail_comptage_caisse VALUES ('detail-invalide', 'cloture-inconnue', 1, 1000, 1);",
      ),
    ).toThrow();
  });

  it("sépare rapprochement et clôture, et la justification ne modifie pas le snapshot", () => {
    insererCloture("cloture-rapprochee", "session-1");
    database.exec({
      sql: "INSERT INTO rapprochement_caisse VALUES (?, ?);",
      bind: ["rapprochement-1", "session-1"],
    });
    database.exec({
      sql: "INSERT INTO justification_ecart_caisse VALUES (?, ?);",
      bind: ["justification-1", "rapprochement-1"],
    });

    expect(lireCompte("SELECT COUNT(*) AS count FROM cloture_caisse;")).toBe(1);
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM rapprochement_caisse;"),
    ).toBe(1);
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM justification_ecart_caisse;"),
    ).toBe(1);
    expect(() =>
      database.exec(
        "INSERT INTO justification_ecart_caisse VALUES ('justification-invalide', 'rapprochement-inconnu');",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE cloture_caisse SET solde_theorique_fcfa = 0 WHERE id_cloture_caisse = 'cloture-rapprochee';",
      ),
    ).toThrow();
  });

  it("n’attache pas les opérations sans incidence physique aux mouvements de caisse", () => {
    database.exec({
      sql: `
        INSERT INTO transaction_mobile_money (
          id_transaction_mobile_money, fournisseur, compte_marchand,
          reference_externe, montant_declare_fcfa, date_declaration,
          etat_synchronisation_technique, etat_financier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "mobile-1", "MTN_MOMO", "compte-1", "reference-1", 3000,
        "2026-11-04T09:00:00+01:00", "CREE_LOCALEMENT", "INITIE",
      ],
    });
    database.exec({
      sql: `
        INSERT INTO mouvement_credit (
          id_mouvement_credit, montant_mouvement_fcfa, nature_mouvement
        ) VALUES (?, ?, ?);
      `,
      bind: ["credit-1", 3000, "CREDIT"],
    });

    const foreignKeys = database.exec({
      sql: "PRAGMA foreign_key_list(mouvement_caisse);",
      rowMode: "object",
      returnValue: "resultRows",
    });
    const columns = database.exec({
      sql: "PRAGMA table_info(mouvement_caisse);",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(foreignKeys.map((row) => row.table)).toEqual(["session_caisse"]);
    expect(columns.map((row) => row.name)).not.toContain(
      "id_remboursement_fonds",
    );
    expect(columns.map((row) => row.name)).not.toContain(
      "id_transaction_mobile_money",
    );
    expect(columns.map((row) => row.name)).not.toContain("id_mouvement_credit");
    expect(lireCompte("SELECT COUNT(*) AS count FROM mouvement_caisse;")).toBe(
      0,
    );
  });

  it("ne crée pas de mouvement de caisse doublon pour REMBOURSEMENT_FONDS", () => {
    const columns = database.exec({
      sql: "PRAGMA table_info(mouvement_caisse);",
      rowMode: "object",
      returnValue: "resultRows",
    });
    const foreignKeys = database.exec({
      sql: "PRAGMA foreign_key_list(mouvement_caisse);",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(columns.map((row) => row.name)).not.toContain(
      "id_remboursement_fonds",
    );
    expect(foreignKeys.map((row) => row.table)).not.toContain(
      "remboursement_fonds",
    );
    database.exec({
      sql: `
        INSERT INTO remboursement_fonds (
          id_remboursement_fonds, id_demandeur, id_payeur_initial,
          id_beneficiaire_effectif, montant_rembourse_fcfa
        ) VALUES (?, ?, ?, ?, ?);
      `,
      bind: ["remboursement-1", "demandeur-1", "payeur-1", "payeur-1", 1000],
    });

    expect(
      lireCompte("SELECT COUNT(*) AS count FROM remboursement_fonds;"),
    ).toBe(1);
    expect(lireCompte("SELECT COUNT(*) AS count FROM mouvement_caisse;")).toBe(
      0,
    );
  });

  it("représente une transmission par un événement unique avec envoi et réception", () => {
    database.exec({
      sql: `
        INSERT INTO transmission_fonds (
          id_transmission_fonds, id_session_caisse,
          montant_envoye_fcfa, montant_recu_fcfa
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["transmission-1", "session-1", 5000, null],
    });
    database.exec({
      sql: "UPDATE transmission_fonds SET montant_recu_fcfa = ? WHERE id_transmission_fonds = ?;",
      bind: [4500, "transmission-1"],
    });

    expect(
      lireCompte("SELECT COUNT(*) AS count FROM transmission_fonds;"),
    ).toBe(1);
    expect(lireCompte("SELECT COUNT(*) AS count FROM mouvement_caisse;")).toBe(
      0,
    );
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO transmission_fonds (
            id_transmission_fonds, id_session_caisse,
            montant_envoye_fcfa, montant_recu_fcfa
          ) VALUES (?, ?, ?, ?);
        `,
        bind: ["transmission-1", "session-1", 5000, 5000],
      }),
    ).toThrow();
  });
});
