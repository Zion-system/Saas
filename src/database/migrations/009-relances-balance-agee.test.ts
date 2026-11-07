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

function insererRelance(id: string, eleve: string): void {
  database.exec({
    sql: "INSERT INTO relance_financiere (id_relance, id_eleve) VALUES (?, ?);",
    bind: [id, eleve],
  });
}

function insererLigne(
  id: string,
  relance: string,
  montant: number,
  creance: string | null = null,
  echeance: string | null = null,
): void {
  database.exec({
    sql: `
      INSERT INTO ligne_relance_financiere (
        id_ligne_relance, id_relance, id_creance,
        id_echeance_creance, montant_reference_fcfa
      ) VALUES (?, ?, ?, ?, ?);
    `,
    bind: [id, relance, creance, echeance, montant],
  });
}

function insererDestinataire(id: string, relance: string): void {
  database.exec({
    sql: `
      INSERT INTO destinataire_relance_financiere (
        id_destinataire_relance, id_relance, coordonnees_reference
      ) VALUES (?, ?, ?);
    `,
    bind: [id, relance, "coordonnees-historiques"],
  });
}

function insererTentative(
  id: string,
  relance: string,
  destinataire: string,
): void {
  database.exec({
    sql: `
      INSERT INTO tentative_transmission_relance (
        id_tentative, id_relance, id_destinataire_relance,
        date_tentative, canal, resultat, motif_echec, contact_utilise
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      relance,
      destinataire,
      "2026-11-04T10:00:00+01:00",
      "CANAL_NON_ENUMERE",
      "RESULTAT_NON_ENUMERE",
      null,
      "contact-utilise",
    ],
  });
}

describe("migration relances_balance_agee", () => {
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
      INSERT INTO type_frais (id_type_frais, code_type_frais, libelle)
        VALUES ('type-1', 'SCOLARITE', 'Scolarité');
      INSERT INTO creance (
        id_creance, id_eleve, id_annee_scolaire, id_type_frais,
        libelle_type_frais_snapshot, origine_creation, auteur_creation,
        date_creation, motif_creation, montant_brut_fcfa,
        montant_remise_fcfa, montant_net_initial_fcfa
      ) VALUES (
        'creance-1', 'eleve-1', 'annee-1', 'type-1',
        'Scolarité', 'MANUELLE', 'utilisateur-externe',
        '2026-01-01T10:00:00Z', 'Création manuelle', 1000, 0, 1000
      );
      INSERT INTO creance (
        id_creance, id_eleve, id_annee_scolaire, id_type_frais,
        libelle_type_frais_snapshot, origine_creation, auteur_creation,
        date_creation, motif_creation, montant_brut_fcfa,
        montant_remise_fcfa, montant_net_initial_fcfa
      ) VALUES (
        'creance-2', 'eleve-2', 'annee-1', 'type-1',
        'Scolarité', 'MANUELLE', 'utilisateur-externe',
        '2026-01-01T10:00:00Z', 'Création manuelle', 2000, 0, 2000
      );
      INSERT INTO plan_reglement_creance (
        id_plan_reglement_creance, id_creance, montant_total_planifie_fcfa,
        type_plan
      ) VALUES ('plan-1', 'creance-1', 1000, 'INITIAL');
      INSERT INTO echeance_creance (
        id_echeance_creance, id_creance, id_plan_reglement_creance,
        montant_exigible_fcfa, date_exigibilite, rang, etat_administratif
      ) VALUES ('echeance-1', 'creance-1', 'plan-1', 1000, '2026-10-01', 1, 'ADMIN');
    `);
  });

  afterEach(() => {
    database.close();
  });

  it("applique toutes les migrations 001 à 012 en ordre avec les clés étrangères actives", () => {
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

  it("crée les six relations Lot 7 et leurs FKs disponibles", () => {
    const tables = database.exec({
      sql: `
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name IN (
          'relance_financiere', 'ligne_relance_financiere',
          'destinataire_relance_financiere', 'tentative_transmission_relance',
          'parametrage_balance_agee', 'tranche_balance_agee'
        ) ORDER BY name;
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(tables).toHaveLength(6);
    insererRelance("relance-1", "eleve-1");
    insererLigne("ligne-creance", "relance-1", 1000, "creance-1");

    expect(() =>
      insererLigne("ligne-creance-inconnue", "relance-1", 1000, "absente"),
    ).toThrow();
    expect(() =>
      insererLigne(
        "ligne-echeance-inconnue",
        "relance-1",
        1000,
        null,
        "absente",
      ),
    ).toThrow();
  });

  it("impose le XOR CREANCE/ECHEANCE et interdit le mélange d’une créance avec ses échéances", () => {
    insererRelance("relance-1", "eleve-1");

    expect(() => insererLigne("ligne-vide", "relance-1", 1000)).toThrow();
    expect(() =>
      insererLigne(
        "ligne-double-cible",
        "relance-1",
        1000,
        "creance-1",
        "echeance-1",
      ),
    ).toThrow();

    insererLigne("ligne-creance", "relance-1", 1000, "creance-1");
    expect(() =>
      insererLigne(
        "ligne-echeance-melangee",
        "relance-1",
        1000,
        null,
        "echeance-1",
      ),
    ).toThrow();

    insererRelance("relance-echeance", "eleve-1");
    insererLigne(
      "ligne-echeance",
      "relance-echeance",
      1000,
      null,
      "echeance-1",
    );
    expect(() =>
      insererLigne(
        "ligne-creance-melangee",
        "relance-echeance",
        1000,
        "creance-1",
      ),
    ).toThrow();
    expect(() =>
      insererLigne("ligne-mauvais-eleve", "relance-1", 1000, "creance-2"),
    ).toThrow();
    expect(() =>
      insererLigne("ligne-decimale", "relance-1", 1.5, "creance-1"),
    ).toThrow();
  });

  it("conserve les relances, lignes et tentatives en append-only", () => {
    insererRelance("relance-1", "eleve-1");
    insererLigne("ligne-1", "relance-1", 1000, "creance-1");
    insererDestinataire("destinataire-1", "relance-1");
    insererTentative("tentative-1", "relance-1", "destinataire-1");
    insererTentative("tentative-2", "relance-1", "destinataire-1");

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM tentative_transmission_relance;",
      ),
    ).toBe(2);
    expect(() =>
      database.exec(
        "UPDATE relance_financiere SET id_eleve = 'eleve-2' WHERE id_relance = 'relance-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM relance_financiere WHERE id_relance = 'relance-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE ligne_relance_financiere SET montant_reference_fcfa = 500 WHERE id_ligne_relance = 'ligne-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM ligne_relance_financiere WHERE id_ligne_relance = 'ligne-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE tentative_transmission_relance SET resultat = 'AUTRE' WHERE id_tentative = 'tentative-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM tentative_transmission_relance WHERE id_tentative = 'tentative-1';",
      ),
    ).toThrow();
  });

  it("lie chaque tentative au destinataire de la même relance et garde ses coordonnées", () => {
    insererRelance("relance-1", "eleve-1");
    insererRelance("relance-2", "eleve-1");
    insererDestinataire("destinataire-1", "relance-1");
    insererTentative("tentative-1", "relance-1", "destinataire-1");

    expect(() =>
      insererTentative("tentative-incoherente", "relance-2", "destinataire-1"),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE destinataire_relance_financiere SET coordonnees_reference = 'nouveau-contact' WHERE id_destinataire_relance = 'destinataire-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM destinataire_relance_financiere WHERE id_destinataire_relance = 'destinataire-1';",
      ),
    ).toThrow();
    expect(() =>
      insererDestinataire("destinataire-sans-relance", "absente"),
    ).toThrow();
  });

  it("paramètre les tranches contiguës, non chevauchantes et la borne finale ouverte", () => {
    database.exec({
      sql: `
        INSERT INTO parametrage_balance_agee (id_parametrage, version)
        VALUES (?, ?);
      `,
      bind: ["parametrage-1", "version-A"],
    });
    expect(
      database.exec({
        sql: `
          SELECT fuseau_reference, tolerance_jours
          FROM parametrage_balance_agee WHERE id_parametrage = 'parametrage-1';
        `,
        rowMode: "object",
        returnValue: "resultRows",
      })[0],
    ).toEqual({ fuseau_reference: "Africa/Brazzaville", tolerance_jours: 0 });

    database.exec({
      sql: `
        INSERT INTO tranche_balance_agee (
          id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["tranche-1", "parametrage-1", 1, 31],
    });
    database.exec({
      sql: `
        INSERT INTO tranche_balance_agee (
          id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["tranche-2", "parametrage-1", 31, 61],
    });
    database.exec({
      sql: `
        INSERT INTO tranche_balance_agee (
          id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["tranche-3", "parametrage-1", 61, null],
    });

    expect(() =>
      database.exec({
        sql: `
          INSERT INTO tranche_balance_agee (
            id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
          ) VALUES (?, ?, ?, ?);
        `,
        bind: ["tranche-chevauchement", "parametrage-1", 30, 40],
      }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO tranche_balance_agee (
            id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
          ) VALUES (?, ?, ?, ?);
        `,
        bind: ["tranche-borne-inversee", "parametrage-1", 70, 60],
      }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO tranche_balance_agee (
            id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
          ) VALUES (?, ?, ?, ?);
        `,
        bind: ["tranche-deuxieme-ouverte", "parametrage-1", 61, null],
      }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO tranche_balance_agee (
            id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
          ) VALUES (?, ?, ?, ?);
        `,
        bind: ["tranche-manquante", "parametrage-absent", 1, null],
      }),
    ).toThrow();

    database.exec({
      sql: `
        INSERT INTO parametrage_balance_agee (
          id_parametrage, version, tolerance_jours
        ) VALUES (?, ?, ?);
      `,
      bind: ["parametrage-2", "version-B", 0],
    });
    database.exec({
      sql: `
        INSERT INTO tranche_balance_agee (
          id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["tranche-gap-1", "parametrage-2", 1, 10],
    });
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO tranche_balance_agee (
            id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
          ) VALUES (?, ?, ?, ?);
        `,
        bind: ["tranche-gap-2", "parametrage-2", 11, 20],
      }),
    ).toThrow();
    expect(() =>
      database.exec(
        "INSERT INTO parametrage_balance_agee (id_parametrage, version, tolerance_jours) VALUES ('parametrage-invalide', 'version-C', -1);",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE parametrage_balance_agee SET tolerance_jours = 5 WHERE id_parametrage = 'parametrage-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM tranche_balance_agee WHERE id_tranche = 'tranche-1';",
      ),
    ).toThrow();
  });
});
