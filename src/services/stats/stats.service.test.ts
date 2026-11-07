import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SQLiteExecutor, SQLiteRow } from "../../database/local/sqlite.types";
import { migrations } from "../../database/migrations";
import { cleMoisCourant, decalerCleMois } from "../../utils/date";
import { creerServiceStats } from "./stats.service";

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

/** Adaptateur SQLiteExecutor en lecture/écriture sur la base :memory:. */
function creerExecuteur(db: Database): SQLiteExecutor {
  return {
    async query(sql: string, bind: (string | number | null)[] = []) {
      return db.exec({
        sql,
        bind,
        rowMode: "object",
        returnValue: "resultRows",
      }) as unknown as SQLiteRow[];
    },
    async transaction(statements) {
      db.exec("BEGIN IMMEDIATE;");

      try {
        const resultats = statements.map((statement) =>
          db.exec({
            sql: statement.sql,
            bind: statement.bind ?? [],
            rowMode: "object",
            returnValue: "resultRows",
          }),
        ) as unknown as SQLiteRow[][];

        db.exec("COMMIT;");
        return resultats;
      } catch (error) {
        try {
          db.exec("ROLLBACK;");
        } catch {
          // Préserver l'erreur initiale.
        }

        throw error;
      }
    },
  };
}

function inserer(sql: string): void {
  database.exec(sql);
}

describe("statsService — statistiques du tableau de bord", () => {
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
      appliquerMigration(migration);
    }
  });

  afterEach(() => {
    database.close();
  });

  it("retourne des zéros et une fenêtre de 12 mois sur base vierge", async () => {
    const service = creerServiceStats(creerExecuteur(database));

    const stats = await service.chargerTableauBord();

    expect(stats.nombreEleves).toBe(0);
    expect(stats.nombreClasses).toBe(0);
    expect(stats.soldeTresorerieFcfa).toBe(0);
    expect(stats.impayesFcfa).toBeNull();
    expect(stats.totalEncaissementsFcfa).toBe(0);
    expect(stats.encaissementsParMois).toHaveLength(12);
    expect(
      stats.encaissementsParMois.every((m) => m.totalFcfa === 0),
    ).toBe(true);
    // La dernière barre correspond au mois courant.
    expect(stats.encaissementsParMois[11]?.cle).toBe(cleMoisCourant());
  });

  it("calcule élèves, classes, trésorerie et encaissements mensuels sur données réelles", async () => {
    const moisCourant = cleMoisCourant();
    const moisPrecedent = decalerCleMois(moisCourant, -1);

    inserer(`
      INSERT INTO etablissement VALUES ('etab-1');
      INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
        VALUES ('annee-1', 'etab-1');
      INSERT INTO niveau_enseignement VALUES ('niv-1');
      INSERT INTO modele_classe VALUES ('mod-1');
      INSERT INTO classe_annuelle (
        id_classe_annuelle, id_annee_scolaire, id_niveau,
        id_modele_classe, id_etablissement
      ) VALUES ('classe-1', 'annee-1', 'niv-1', 'mod-1', 'etab-1');
      INSERT INTO eleve (id_eleve, id_etablissement) VALUES
        ('eleve-1', 'etab-1'), ('eleve-2', 'etab-1');
      INSERT INTO poste_caisse (id_poste_caisse, code_poste, designation)
        VALUES ('poste-1', 'Caisse 1', 'Caisse principale');
      INSERT INTO appareil (id_appareil, numero_serie, nom_machine)
        VALUES ('app-1', 'SN-001', 'PC Caissier');
      INSERT INTO session_caisse (
        id_session_caisse, id_poste_caisse, id_appareil, id_caissier,
        fonds_initial_fcfa, date_ouverture
      ) VALUES ('sess-1', 'poste-1', 'app-1', 'caissier-1', 10000, '${moisCourant}-01');
      INSERT INTO mouvement_caisse (
        id_mouvement_caisse, id_session_caisse, sens, montant_fcfa,
        type_mouvement, id_operation_source, date_mouvement
      ) VALUES
        ('mv-1', 'sess-1', 'ENTREE', 50000, 'ENCAISSEMENT', 'enc-1', '${moisCourant}-05'),
        ('mv-2', 'sess-1', 'ENTREE', 30000, 'ENCAISSEMENT', 'enc-2', '${moisPrecedent}-15'),
        ('mv-3', 'sess-1', 'SORTIE', 10000, 'REMBOURSEMENT', 'rem-1', '${moisCourant}-06');
    `);

    const service = creerServiceStats(creerExecuteur(database));
    const stats = await service.chargerTableauBord();

    expect(stats.nombreEleves).toBe(2);
    expect(stats.nombreClasses).toBe(1);
    // 50 000 + 30 000 − 10 000 = 70 000
    expect(stats.soldeTresorerieFcfa).toBe(70000);
    expect(stats.impayesFcfa).toBeNull();
    expect(stats.totalEncaissementsFcfa).toBe(80000);

    const parCle = new Map(
      stats.encaissementsParMois.map((m) => [m.cle, m.totalFcfa]),
    );
    expect(parCle.get(moisCourant)).toBe(50000);
    expect(parCle.get(moisPrecedent)).toBe(30000);
    expect(stats.encaissementsParMois).toHaveLength(12);
  });

  it("n'expose aucune écriture : seules des requêtes SELECT sont émises", async () => {
    const sqlEmis: string[] = [];
    const executeur: SQLiteExecutor = {
      async query(sql: string, bind: (string | number | null)[] = []) {
        sqlEmis.push(sql.trim().split(/\s+/)[0]?.toUpperCase() ?? "");
        return creerExecuteur(database).query(sql, bind);
      },
      transaction: creerExecuteur(database).transaction,
    };

    const service = creerServiceStats(executeur);
    await service.chargerTableauBord();

    expect(sqlEmis.length).toBeGreaterThan(0);
    expect(sqlEmis.every((verbe) => verbe === "SELECT")).toBe(true);
  });
});
