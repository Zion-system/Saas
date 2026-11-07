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

function insererEcheance(
  id: string,
  creance: string,
  plan: string,
  montant: number,
  rang: number,
  etat = "CODE_NON_SPECIFIE",
  reamenagementCreation: string | null = null,
  reamenagementRemplacement: string | null = null,
): void {
  database.exec({
    sql: `
      INSERT INTO echeance_creance (
        id_echeance_creance, id_creance, id_plan_reglement_creance,
        montant_exigible_fcfa, date_exigibilite, rang, etat_administratif,
        id_reamenagement_creation, id_reamenagement_remplacement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      creance,
      plan,
      montant,
      "2026-03-01",
      rang,
      etat,
      reamenagementCreation,
      reamenagementRemplacement,
    ],
  });
}

describe("migration echeanciers_reglements", () => {
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
    `);
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

  it("relie les versions et lignes à leurs parents par FK", () => {
    database.exec("INSERT INTO modele_echeancier VALUES ('modele-1');");
    database.exec({
      sql: "INSERT INTO version_modele_echeancier VALUES (?, ?);",
      bind: ["version-1", "modele-1"],
    });
    database.exec({
      sql: "INSERT INTO ligne_modele_echeancier VALUES (?, ?);",
      bind: ["ligne-1", "version-1"],
    });

    expect(() =>
      database.exec(
        "INSERT INTO version_modele_echeancier VALUES ('version-absente', 'modele-inconnu');",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE version_modele_echeancier SET id_modele_echeancier = 'modele-1' WHERE id_version_modele_echeancier = 'version-1';",
      ),
    ).toThrow();
  });

  it("rattache plans et échéances à la même créance et garde les montants entiers FCFA", () => {
    database.exec("INSERT INTO modele_echeancier VALUES ('modele-1');");
    database.exec({
      sql: "INSERT INTO version_modele_echeancier VALUES (?, ?);",
      bind: ["version-1", "modele-1"],
    });
    database.exec({
      sql: `
        INSERT INTO plan_reglement_creance (
          id_plan_reglement_creance, id_creance,
          id_version_modele_echeancier, montant_total_planifie_fcfa,
          type_plan, etat_plan
        ) VALUES (?, ?, ?, ?, 'INITIAL', 'BROUILLON');
      `,
      bind: ["plan-1", "creance-1", "version-1", 10000],
    });

    insererEcheance("echeance-1", "creance-1", "plan-1", 5000, 1);
    insererEcheance("echeance-2", "creance-1", "plan-1", 5000, 2);

    expect(() =>
      insererEcheance(
        "echeance-mauvaise-creance",
        "creance-2",
        "plan-1",
        1000,
        3,
      ),
    ).toThrow();
    expect(() =>
      insererEcheance(
        "echeance-rang-decimal",
        "creance-1",
        "plan-1",
        1000,
        1.5,
      ),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO plan_reglement_creance (
            id_plan_reglement_creance, id_creance, montant_total_planifie_fcfa
          ) VALUES (?, ?, ?);
        `,
        bind: ["plan-decimal", "creance-1", 1000.5],
      }),
    ).toThrow();
    expect(() =>
      insererEcheance(
        "echeance-date-invalide",
        "creance-1",
        "plan-1",
        1,
        3,
        "CODE",
        null,
        null,
      ),
    ).not.toThrow();
    expect(() =>
      database.exec(
        "UPDATE echeance_creance SET date_exigibilite = '2026-02-30' WHERE id_echeance_creance = 'echeance-date-invalide';",
      ),
    ).toThrow();
  });

  it("préserve les liens de réaménagement et les événements d’échéance", () => {
    database.exec("INSERT INTO modele_echeancier VALUES ('modele-1');");
    database.exec({
      sql: "INSERT INTO version_modele_echeancier VALUES (?, ?);",
      bind: ["version-1", "modele-1"],
    });
    database.exec({
      sql: `
        INSERT INTO plan_reglement_creance (
          id_plan_reglement_creance, id_creance,
          id_version_modele_echeancier, montant_total_planifie_fcfa,
          type_plan, etat_plan
        ) VALUES (?, ?, ?, ?, 'INITIAL', 'BROUILLON');
      `,
      bind: ["plan-1", "creance-1", "version-1", 10000],
    });
    database.exec({
      sql: `
        INSERT INTO reamenagement_echeancier (
          id_reamenagement_echeancier, motif, auteur, date_reamenagement,
          id_plan_precedent, id_version_modele_precedente
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "reamenagement-1",
        "Révision du calendrier",
        "utilisateur-externe",
        "2026-02-01T10:00:00+01:00",
        "plan-1",
        "version-1",
      ],
    });
    insererEcheance(
      "echeance-remplacee",
      "creance-1",
      "plan-1",
      10000,
      1,
      "CODE_NON_SPECIFIE",
      null,
      "reamenagement-1",
    );
    insererEcheance(
      "echeance-nouvelle",
      "creance-1",
      "plan-1",
      10000,
      2,
      "CODE_NON_SPECIFIE",
      "reamenagement-1",
    );

    database.exec({
      sql: `
        INSERT INTO evenement_echeance (
          id_evenement_echeance, id_echeance_creance,
          id_reamenagement_echeancier, type_evenement, date_evenement
        ) VALUES (?, ?, ?, ?, ?);
      `,
      bind: [
        "evenement-1",
        "echeance-remplacee",
        "reamenagement-1",
        "CODE_NON_SPECIFIE",
        "2026-02-01T10:00:00+01:00",
      ],
    });

    expect(() =>
      database.exec(
        "INSERT INTO evenement_echeance (id_evenement_echeance, id_echeance_creance, type_evenement, date_evenement) VALUES ('evenement-invalide', 'echeance-inconnue', 'CODE', '2026-02-01');",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM echeance_creance WHERE id_echeance_creance = 'echeance-remplacee';",
      ),
    ).toThrow();
  });

  it("garantit l’unicité du plan actif par créance et la somme des échéances (D-8, Q-03)", () => {
    database.exec("INSERT INTO modele_echeancier VALUES ('modele-1');");
    database.exec({
      sql: "INSERT INTO version_modele_echeancier VALUES (?, ?);",
      bind: ["version-1", "modele-1"],
    });
    database.exec({
      sql: `
        INSERT INTO plan_reglement_creance (
          id_plan_reglement_creance, id_creance,
          id_version_modele_echeancier, montant_total_planifie_fcfa,
          type_plan, etat_plan
        ) VALUES (?, ?, ?, ?, 'INITIAL', 'BROUILLON');
      `,
      bind: ["plan-brouillon", "creance-1", "version-1", 10000],
    });
    insererEcheance("echeance-b1", "creance-1", "plan-brouillon", 6000, 1);
    insererEcheance("echeance-b2", "creance-1", "plan-brouillon", 4000, 2);

    database.exec({
      sql: `
        INSERT INTO plan_reglement_creance (
          id_plan_reglement_creance, id_creance,
          id_version_modele_echeancier, montant_total_planifie_fcfa,
          type_plan, etat_plan
        ) VALUES (?, ?, ?, ?, 'INITIAL', 'ACTIF');
      `,
      bind: ["plan-actif-creance-2", "creance-2", "version-1", 8000],
    });
    expect(() =>
      insererEcheance("echeance-actif-partiel", "creance-2", "plan-actif-creance-2", 5000, 1),
    ).toThrow();
    insererEcheance("echeance-actif-complet", "creance-2", "plan-actif-creance-2", 8000, 1);
    expect(() =>
      insererEcheance("echeance-actif-supplement", "creance-2", "plan-actif-creance-2", 1000, 2),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE echeance_creance SET montant_exigible_fcfa = 7000 WHERE id_echeance_creance = 'echeance-actif-complet';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM echeance_creance WHERE id_echeance_creance = 'echeance-actif-complet';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE echeance_creance SET date_exigibilite = '2026-04-01' WHERE id_echeance_creance = 'echeance-actif-complet';",
      ),
    ).not.toThrow();

    database.exec(
      "UPDATE plan_reglement_creance SET etat_plan = 'ACTIF' WHERE id_plan_reglement_creance = 'plan-brouillon';",
    );
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO plan_reglement_creance (
            id_plan_reglement_creance, id_creance,
            id_version_modele_echeancier, montant_total_planifie_fcfa,
            type_plan, etat_plan
          ) VALUES (?, ?, ?, ?, 'INITIAL', 'ACTIF');
        `,
        bind: ["plan-actif-second", "creance-1", "version-1", 10000],
      }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO plan_reglement_creance (
            id_plan_reglement_creance, id_creance,
            id_version_modele_echeancier, montant_total_planifie_fcfa,
            type_plan, etat_plan
          ) VALUES (?, ?, ?, ?, 'INITIAL', 'BROUILLON');
        `,
        bind: ["plan-brouillon-second", "creance-1", "version-1", 10000],
      }),
    ).not.toThrow();
    expect(() =>
      insererEcheance("echeance-brouillon-activee", "creance-1", "plan-brouillon", 1, 3),
    ).toThrow();

    expect(() =>
      database.exec({
        sql: `
          INSERT INTO plan_reglement_creance (
            id_plan_reglement_creance, id_creance,
            id_version_modele_echeancier, montant_total_planifie_fcfa,
            type_plan, etat_plan
          ) VALUES (?, ?, ?, ?, 'INITIAL', 'BROUILLON');
        `,
        bind: ["plan-mauvais-type", "creance-2", "version-1", 100],
      }),
    ).not.toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO plan_reglement_creance (
            id_plan_reglement_creance, id_creance,
            id_version_modele_echeancier, montant_total_planifie_fcfa,
            type_plan, etat_plan
          ) VALUES (?, ?, ?, ?, 'INCONNU', 'BROUILLON');
        `,
        bind: ["plan-type-invalide", "creance-2", "version-1", 100],
      }),
    ).toThrow();

    expect(() =>
      insererEcheance("echeance-rang-zero", "creance-1", "plan-brouillon", 100, 0),
    ).toThrow();
    expect(() =>
      insererEcheance("echeance-montant-zero", "creance-1", "plan-brouillon", 0, 3),
    ).toThrow();
    expect(() =>
      insererEcheance("echeance-rang-duplique", "creance-1", "plan-brouillon", 100, 1),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO echeance_creance (
            id_echeance_creance, id_creance, id_plan_reglement_creance,
            montant_exigible_fcfa, date_exigibilite, rang, etat_administratif,
            statut_echeance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        bind: ["echeance-statut-invalide", "creance-1", "plan-brouillon", 100, "2026-05-01", 4, "ADMIN", "INCONNU"],
      }),
    ).toThrow();
  });
});
