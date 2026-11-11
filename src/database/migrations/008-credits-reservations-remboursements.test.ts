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

function insererMouvementCredit(
  id: string,
  montant: number,
  nature: string,
): void {
  database.exec({
    sql: `
      INSERT INTO mouvement_credit (
        id_mouvement_credit, montant_mouvement_fcfa, nature_mouvement
      ) VALUES (?, ?, ?);
    `,
    bind: [id, montant, nature],
  });
}

function insererReservation(id: string, source: string, montant: number): void {
  database.exec({
    sql: `
      INSERT INTO reservation_credit (
        id_reservation_credit, id_mouvement_credit_source, montant_reserve_fcfa
      ) VALUES (?, ?, ?);
    `,
    bind: [id, source, montant],
  });
}

function insererArbitrage(
  id: string,
  reservation: string,
  acceptee: boolean,
): void {
  database.exec({
    sql: `
      INSERT INTO arbitrage_reservation_credit (
        id_arbitrage_reservation_credit, id_reservation_credit,
        est_acceptee, id_serveur, date_arbitrage
      ) VALUES (?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      reservation,
      acceptee ? 1 : 0,
      "serveur-central",
      "2026-11-04T12:00:00Z",
    ],
  });
}

function insererMouvementCreditUtilisation(
  id: string,
  montant: number,
  affectation: string,
): void {
  database.exec({
    sql: `
      INSERT INTO mouvement_credit (
        id_mouvement_credit, montant_mouvement_fcfa,
        nature_mouvement, id_affectation_reglement
      ) VALUES (?, ?, 'UTILISATION', ?);
    `,
    bind: [id, montant, affectation],
  });
}

function insererAffectationEtUtilisation(
  affectation: string,
  mouvement: string,
  montant: number,
): void {
  database.exec("BEGIN IMMEDIATE;");
  insererMouvementCreditUtilisation(mouvement, montant, affectation);
  database.exec({
    sql: `
      INSERT INTO affectation_reglement (
        id_affectation_reglement, id_mouvement_credit_utilisation,
        id_creance, montant_affecte_fcfa, date_affectation
      ) VALUES (?, ?, 'creance-1', ?, ?);
    `,
    bind: [affectation, mouvement, montant, "2026-11-04T10:00:00+01:00"],
  });
  database.exec("COMMIT;");
}

function insererVentilation(
  id: string,
  utilisation: string,
  source: string,
  rang: number,
  montant: number,
  reservation: string | null = null,
): void {
  database.exec({
    sql: `
      INSERT INTO consommation_credit_source (
        id_consommation_credit_source, id_mouvement_credit_utilisation,
        id_mouvement_credit_source, id_reservation_credit,
        ordre_cascade, montant_consomme_fcfa
      ) VALUES (?, ?, ?, ?, ?, ?);
    `,
    bind: [id, utilisation, source, reservation, rang, montant],
  });
}

describe("migration credits_reservations_remboursements", () => {
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
        '2026-01-01T10:00:00Z', 'Création manuelle', 10000, 0, 10000
      );
    `);
  });

  afterEach(() => {
    database.close();
  });

  it("applique toutes les migrations 001 à 012 successivement avec les FK actives", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(versions.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("réserve un crédit positif par identité et conserve les réservations provisoires distinctes", () => {
    insererMouvementCredit("credit-source-1", 1000, "CREDIT");
    insererReservation("reservation-1", "credit-source-1", 700);
    insererReservation("reservation-2", "credit-source-1", 700);

    expect(
      database.exec({
        sql: `
          SELECT id_reservation_credit, est_provisoire
          FROM reservation_credit ORDER BY id_reservation_credit;
        `,
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([
      { id_reservation_credit: "reservation-1", est_provisoire: 1 },
      { id_reservation_credit: "reservation-2", est_provisoire: 1 },
    ]);

    expect(() =>
      insererReservation("reservation-nulle", "credit-source-1", 0),
    ).toThrow();
    expect(() =>
      insererReservation("reservation-absente", "source-absente", 1),
    ).toThrow();
    insererAffectationEtUtilisation(
      "affectation-utilisation-source-interdite",
      "credit-utilisation-non-source",
      100,
    );
    expect(() =>
      insererReservation(
        "reservation-utilisation",
        "credit-utilisation-non-source",
        50,
      ),
    ).toThrow();
  });

  it("historise les collisions et exige une décision serveur avant finalisation", () => {
    insererMouvementCredit("credit-source-1", 1000, "CREDIT");
    insererReservation("reservation-1", "credit-source-1", 700);
    insererReservation("reservation-2", "credit-source-1", 700);

    database.exec({
      sql: `
        INSERT INTO collision_reservation_credit (
          id_collision_reservation_credit, id_reservation_credit_1,
          id_reservation_credit_2, date_detection
        ) VALUES (?, ?, ?, ?);
      `,
      bind: [
        "collision-1",
        "reservation-1",
        "reservation-2",
        "2026-11-04T11:00:00Z",
      ],
    });

    expect(() =>
      database.exec(
        "UPDATE reservation_credit SET est_provisoire = 0 WHERE id_reservation_credit = 'reservation-1';",
      ),
    ).toThrow();
    insererArbitrage("arbitrage-1", "reservation-1", true);
    database.exec(
      "UPDATE reservation_credit SET est_provisoire = 0 WHERE id_reservation_credit = 'reservation-1';",
    );

    expect(
      lireCompte("SELECT COUNT(*) AS count FROM reservation_credit;"),
    ).toBe(2);
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM collision_reservation_credit;"),
    ).toBe(1);
    expect(() =>
      database.exec(
        "UPDATE collision_reservation_credit SET date_detection = '2026-11-05' WHERE id_collision_reservation_credit = 'collision-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE arbitrage_reservation_credit SET est_acceptee = 0 WHERE id_arbitrage_reservation_credit = 'arbitrage-1';",
      ),
    ).toThrow();
  });

  it("arbitre les réservations sans dépasser le crédit source", () => {
    insererMouvementCredit("credit-source-1", 1000, "CREDIT");
    insererReservation("reservation-1", "credit-source-1", 700);
    insererReservation("reservation-2", "credit-source-1", 500);

    insererArbitrage("arbitrage-1", "reservation-1", true);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM reservation_credit WHERE id_reservation_credit = 'reservation-1' AND est_provisoire = 0;",
      ),
    ).toBe(1);

    database.exec("BEGIN IMMEDIATE;");
    expect(() =>
      insererArbitrage("arbitrage-2", "reservation-2", true),
    ).toThrow();
    database.exec("ROLLBACK;");

    insererArbitrage("arbitrage-2-rejet", "reservation-2", false);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM reservation_credit WHERE id_reservation_credit = 'reservation-2' AND est_provisoire = 0;",
      ),
    ).toBe(1);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM arbitrage_reservation_credit WHERE est_acceptee = 0;",
      ),
    ).toBe(1);
  });

  it("ventile une utilisation en cascade par source, en ordre traçable", () => {
    insererMouvementCredit("credit-source-1", 600, "CREDIT");
    insererMouvementCredit("credit-source-2", 500, "CREDIT");
    insererReservation("reservation-source-1", "credit-source-1", 600);
    insererArbitrage("arbitrage-source-1", "reservation-source-1", true);
    database.exec(
      "UPDATE reservation_credit SET est_provisoire = 0 WHERE id_reservation_credit = 'reservation-source-1';",
    );
    insererAffectationEtUtilisation("affectation-1", "utilisation-1", 1000);

    insererVentilation(
      "ventilation-1",
      "utilisation-1",
      "credit-source-1",
      1,
      600,
      "reservation-source-1",
    );
    insererVentilation(
      "ventilation-2",
      "utilisation-1",
      "credit-source-2",
      2,
      400,
    );

    expect(
      database.exec({
        sql: `
          SELECT id_mouvement_credit_source, ordre_cascade, montant_consomme_fcfa
          FROM consommation_credit_source
          WHERE id_mouvement_credit_utilisation = 'utilisation-1'
          ORDER BY ordre_cascade;
        `,
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([
      {
        id_mouvement_credit_source: "credit-source-1",
        ordre_cascade: 1,
        montant_consomme_fcfa: 600,
      },
      {
        id_mouvement_credit_source: "credit-source-2",
        ordre_cascade: 2,
        montant_consomme_fcfa: 400,
      },
    ]);
    expect(() =>
      insererVentilation(
        "ventilation-depasse-utilisation",
        "utilisation-1",
        "credit-source-2",
        3,
        1,
      ),
    ).toThrow();
    expect(() =>
      insererVentilation(
        "ventilation-source-epuisee",
        "utilisation-1",
        "credit-source-1",
        3,
        1,
      ),
    ).toThrow();
    expect(() =>
      insererVentilation(
        "ventilation-ordre-duplique",
        "utilisation-1",
        "credit-source-2",
        2,
        1,
      ),
    ).toThrow();
  });

  it("conserve une échéance réglée séparément d’un crédit source ultérieur", () => {
    database.exec(`
      INSERT INTO plan_reglement_creance (
        id_plan_reglement_creance, id_creance, montant_total_planifie_fcfa,
        type_plan
      ) VALUES ('plan-1', 'creance-1', 1000, 'INITIAL');
      INSERT INTO echeance_creance (
        id_echeance_creance, id_creance, id_plan_reglement_creance,
        montant_exigible_fcfa, date_exigibilite, rang, etat_administratif
      ) VALUES ('echeance-1', 'creance-1', 'plan-1', 1000, '2026-01-31', 1, 'ADMIN');
    `);

    insererMouvementCredit("credit-apres-echeance", 500, "CREDIT");

    const echeance = database.exec({
      sql: `
        SELECT montant_exigible_fcfa, date_exigibilite
        FROM echeance_creance WHERE id_echeance_creance = 'echeance-1';
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });
    const creditFks = database.exec({
      sql: "PRAGMA foreign_key_list(consommation_credit_source);",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(echeance[0]).toEqual({
      montant_exigible_fcfa: 1000,
      date_exigibilite: "2026-01-31",
    });
    expect(creditFks.map((row) => row.table)).not.toContain("echeance_creance");
  });

  it("exige un mandat valide correspondant si le bénéficiaire diffère du payeur", () => {
    database.exec({
      sql: `
        INSERT INTO remboursement_fonds (
          id_remboursement_fonds, id_demandeur, id_payeur_initial,
          id_beneficiaire_effectif, montant_rembourse_fcfa
        ) VALUES (?, ?, ?, ?, ?);
      `,
      bind: [
        "remboursement-meme-beneficiaire",
        "demandeur-1",
        "payeur-1",
        "payeur-1",
        5000,
      ],
    });

    const insertRefundWithMandate = (id: string, mandat: string | null) =>
      database.exec({
        sql: `
          INSERT INTO remboursement_fonds (
            id_remboursement_fonds, id_demandeur, id_payeur_initial,
            id_beneficiaire_effectif, montant_rembourse_fcfa, id_mandat_restitution
          ) VALUES (?, ?, ?, ?, ?, ?);
        `,
        bind: [id, "demandeur-2", "payeur-2", "beneficiaire-2", 7500, mandat],
      });

    expect(() =>
      insertRefundWithMandate("remboursement-sans-mandat", null),
    ).toThrow();
    database.exec({
      sql: `
        INSERT INTO mandat_restitution (
          id_mandat_restitution, id_payeur_initial,
          id_beneficiaire_effectif, mandat_valide
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["mandat-invalide", "payeur-2", "beneficiaire-2", 0],
    });
    expect(() =>
      insertRefundWithMandate(
        "remboursement-mandat-invalide",
        "mandat-invalide",
      ),
    ).toThrow();

    database.exec({
      sql: `
        INSERT INTO mandat_restitution (
          id_mandat_restitution, id_payeur_initial,
          id_beneficiaire_effectif, mandat_valide
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["mandat-valide", "payeur-2", "beneficiaire-2", 1],
    });
    insertRefundWithMandate("remboursement-avec-mandat", "mandat-valide");

    expect(
      lireCompte("SELECT COUNT(*) AS count FROM remboursement_fonds;"),
    ).toBe(2);
    expect(() =>
      insertRefundWithMandate(
        "remboursement-mandat-mauvais-beneficiaire",
        "mandat-invalide",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE mandat_restitution SET mandat_valide = 0 WHERE id_mandat_restitution = 'mandat-valide';",
      ),
    ).toThrow();
  });

  it("représente les remboursements hors de la table des mouvements physiques de caisse", () => {
    const refundFks = database.exec({
      sql: "PRAGMA foreign_key_list(remboursement_fonds);",
      rowMode: "object",
      returnValue: "resultRows",
    });
    const movementCount = lireCompte(
      "SELECT COUNT(*) AS count FROM mouvement_caisse;",
    );

    expect(refundFks.map((row) => row.table)).not.toContain("mouvement_caisse");
    expect(movementCount).toBe(0);
  });
});
