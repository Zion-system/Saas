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

function insererSession(options: {
  id: string;
  poste?: string;
  appareil?: string;
  caissier?: string;
  fonds?: number;
  date?: string;
  etat?: string;
}): void {
  database.exec({
    sql: `
      INSERT INTO session_caisse (
        id_session_caisse, id_poste_caisse, id_appareil, id_caissier,
        fonds_initial_fcfa, date_ouverture, etat
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.poste ?? "poste-1",
      options.appareil ?? "appareil-1",
      options.caissier ?? "caissier-1",
      options.fonds ?? 10000,
      options.date ?? "2026-11-04T08:00:00+01:00",
      options.etat ?? "OUVERTE",
    ],
  });
}

function insererCloture(options: {
  id: string;
  session: string;
  solde: number;
  physique: number;
  ecart?: number;
  numeroComptage?: number;
  date?: string;
}): void {
  database.exec({
    sql: `
      INSERT INTO cloture_caisse (
        id_cloture_caisse, id_session_caisse, date_cloture,
        solde_theorique_fcfa, montant_physique_fcfa, ecart_fcfa,
        numero_comptage_retenu
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.session,
      options.date ?? "2026-11-04T17:00:00+01:00",
      options.solde,
      options.physique,
      options.ecart ?? options.physique - options.solde,
      options.numeroComptage ?? 1,
    ],
  });
}

function insererDetail(options: {
  id: string;
  cloture: string;
  tour: number;
  valeur: number;
  quantite: number;
}): void {
  database.exec({
    sql: `
      INSERT INTO detail_comptage_caisse (
        id_detail_comptage_caisse, id_cloture_caisse, numero_comptage,
        valeur_unitaire_fcfa, quantite
      ) VALUES (?, ?, ?, ?, ?);
    `,
    bind: [options.id, options.cloture, options.tour, options.valeur, options.quantite],
  });
}

function insererMouvement(options: {
  id: string;
  session: string;
  sens?: string;
  montant?: number;
  type?: string;
  operationSource?: string | null;
  date?: string;
}): void {
  database.exec({
    sql: `
      INSERT INTO mouvement_caisse (
        id_mouvement_caisse, id_session_caisse, sens, montant_fcfa,
        type_mouvement, id_operation_source, date_mouvement
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.session,
      options.sens ?? "ENTREE",
      options.montant ?? 2500,
      options.type ?? "ENCAISSEMENT",
      options.operationSource ?? null,
      options.date ?? "2026-11-04T10:00:00+01:00",
    ],
  });
}

function insererTransmission(options: {
  id: string;
  source: string;
  destination?: string | null;
  responsable?: string | null;
  nomResponsable?: string | null;
  montantEnvoye?: number;
  montantRecu?: number | null;
  etat?: string;
  dateEnvoi?: string;
  dateReception?: string | null;
}): void {
  database.exec({
    sql: `
      INSERT INTO transmission_fonds (
        id_transmission_fonds, id_session_source, id_session_destination,
        id_responsable_reception, nom_responsable_snapshot,
        montant_envoye_fcfa, montant_recu_fcfa, etat_transmission,
        date_envoi, date_reception
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.source,
      options.destination ?? null,
      options.responsable ?? null,
      options.nomResponsable ?? null,
      options.montantEnvoye ?? 5000,
      options.montantRecu ?? null,
      options.etat ?? "EMISE",
      options.dateEnvoi ?? "2026-11-04T12:00:00+01:00",
      options.dateReception ?? null,
    ],
  });
}

function insererRapprochement(options: {
  id: string;
  session: string;
  soldeCalcule?: number;
  physique?: number;
  ecart?: number;
  definitif?: number;
  superviseur?: string;
  date?: string;
}): void {
  database.exec({
    sql: `
      INSERT INTO rapprochement_caisse (
        id_rapprochement_caisse, id_session_caisse, date_rapprochement,
        solde_theorique_calcule_fcfa, montant_physique_confronte_fcfa,
        ecart_constate_fcfa, est_definitif, superviseur
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.session,
      options.date ?? "2026-11-04T18:00:00+01:00",
      options.soldeCalcule ?? 12000,
      options.physique ?? 12000,
      options.ecart ?? 0,
      options.definitif ?? 0,
      options.superviseur ?? "superviseur-1",
    ],
  });
}

function insererJustification(options: {
  id: string;
  rapprochement: string;
  motif?: string;
  auteur?: string;
  date?: string;
  piece?: string | null;
}): void {
  database.exec({
    sql: `
      INSERT INTO justification_ecart_caisse (
        id_justification_ecart_caisse, id_rapprochement_caisse,
        motif_ecart, auteur, date_justification, piece_justificative_ref
      ) VALUES (?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.rapprochement,
      options.motif ?? "Erreur de rendu monnaie",
      options.auteur ?? "caissier-1",
      options.date ?? "2026-11-04T19:00:00+01:00",
      options.piece ?? null,
    ],
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
      INSERT INTO poste_caisse (id_poste_caisse, code_poste, designation, est_actif)
        VALUES ('poste-1', 'CAISSE-01', 'Caisse principale', 1);
      INSERT INTO poste_caisse (id_poste_caisse, code_poste, designation, est_actif)
        VALUES ('poste-2', 'CAISSE-02', 'Caisse secondaire', 1);
      INSERT INTO appareil (id_appareil, numero_serie, nom_machine, est_autorise)
        VALUES ('appareil-1', 'SN-001', 'Machine A', 1);
      INSERT INTO appareil (id_appareil, numero_serie, nom_machine, est_autorise)
        VALUES ('appareil-2', 'SN-002', 'Machine B', 1);
    `);
    insererSession({ id: "session-1" });
    insererSession({
      id: "session-2",
      poste: "poste-2",
      appareil: "appareil-2",
      caissier: "caissier-2",
      fonds: 5000,
    });
  });

  afterEach(() => {
    database.close();
  });

  it("applique toutes les migrations 001 à 016 dans l’ordre avec les FK actives", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(versions.map((row) => row.version)).toEqual([
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

  it("référence les coupures XAF et expose les colonnes métier des postes, appareils et sessions (G-16)", () => {
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM ref_coupure_xaf;"),
    ).toBe(9);
    expect(() =>
      database.exec(
        "INSERT INTO poste_caisse (id_poste_caisse, code_poste, designation) VALUES ('poste-3', 'CAISSE-01', 'Doublon');",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "INSERT INTO poste_caisse (id_poste_caisse, code_poste, designation, est_actif) VALUES ('poste-3', 'CAISSE-03', 'Inactif', 2);",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "INSERT INTO appareil (id_appareil, numero_serie, nom_machine) VALUES ('appareil-3', 'SN-001', 'Doublon');",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "INSERT INTO appareil (id_appareil, numero_serie, nom_machine, est_autorise) VALUES ('appareil-3', 'SN-003', 'Non autorisé', 2);",
      ),
    ).toThrow();

    expect(() => insererSession({ id: "session-fonds-negatif", fonds: -1 })).toThrow();
    expect(() => insererSession({ id: "session-fonds-decimal", fonds: 100.5 })).toThrow();
    expect(() => insererSession({ id: "session-etat-invalide", etat: "INCONNU" })).toThrow();
    expect(() =>
      insererSession({ id: "session-poste-absent", poste: "absent" }),
    ).toThrow();
    expect(() =>
      insererSession({ id: "session-appareil-absent", appareil: "absent" }),
    ).toThrow();

    expect(() =>
      insererSession({ id: "session-1-bis", poste: "poste-1" }),
    ).toThrow();
    insererSession({
      id: "session-1-cloturee",
      poste: "poste-1",
      appareil: "appareil-1",
      caissier: "caissier-1",
      etat: "CLOTUREE",
    });
  });

  it("fige la clôture, exige la concordance du comptage et bloque les écritures ultérieures (FIN-LOT5-013, R-3, R-6)", () => {
    insererMouvement({ id: "mouvement-avant-cloture", session: "session-1" });
    insererCloture({ id: "cloture-1", session: "session-1", solde: 12000, physique: 12000 });
    insererDetail({ id: "detail-1", cloture: "cloture-1", tour: 1, valeur: 1000, quantite: 12 });

    expect(() => insererCloture({ id: "cloture-2", session: "session-1", solde: 1, physique: 1 })).toThrow();
    expect(() =>
      insererMouvement({ id: "mouvement-apres-cloture", session: "session-1" }),
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

    database.exec("UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = 'session-1';");
    expect(() =>
      database.exec(
        "UPDATE session_caisse SET fonds_initial_fcfa = 11000 WHERE id_session_caisse = 'session-1';",
      ),
    ).toThrow();
    expect(() =>
      insererDetail({ id: "detail-apres-cloture", cloture: "cloture-1", tour: 2, valeur: 500, quantite: 1 }),
    ).toThrow();

    insererMouvement({ id: "mouvement-session-2", session: "session-2" });
    expect(lireCompte("SELECT COUNT(*) AS count FROM mouvement_caisse;")).toBe(2);
  });

  it("refuse la clôture sans comptage concordant et accepte le tour retenu (FIN-LOT5-013)", () => {
    insererCloture({ id: "cloture-sans-comptage", session: "session-2", solde: 3000, physique: 3000 });
    expect(() =>
      database.exec("UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = 'session-2';"),
    ).toThrow();

    insererDetail({ id: "detail-s2-2000", cloture: "cloture-sans-comptage", tour: 1, valeur: 2000, quantite: 1 });
    expect(() =>
      database.exec("UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = 'session-2';"),
    ).toThrow();

    insererDetail({ id: "detail-s2-1000", cloture: "cloture-sans-comptage", tour: 1, valeur: 1000, quantite: 1 });
    database.exec("UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = 'session-2';");
    expect(
      database.exec({
        sql: "SELECT etat FROM session_caisse WHERE id_session_caisse = 'session-2';",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.etat,
    ).toBe("CLOTUREE");

    insererCloture({
      id: "cloture-tour-2",
      session: "session-1",
      solde: 5000,
      physique: 5000,
      numeroComptage: 2,
    });
    insererDetail({ id: "detail-t2-partiel", cloture: "cloture-tour-2", tour: 2, valeur: 1000, quantite: 1 });
    expect(() =>
      database.exec("UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = 'session-1';"),
    ).toThrow();
    insererDetail({ id: "detail-t2-complement", cloture: "cloture-tour-2", tour: 2, valeur: 2000, quantite: 1 });
    expect(() =>
      database.exec("UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = 'session-1';"),
    ).toThrow();
    insererDetail({ id: "detail-t2-final", cloture: "cloture-tour-2", tour: 2, valeur: 500, quantite: 4 });
    database.exec("UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = 'session-1';");
  });

  it("conserve les détails de comptage en append-only avec montant calculé et référence de coupure", () => {
    insererCloture({ id: "cloture-comptage", session: "session-1", solde: 5000, physique: 5000 });
    insererDetail({ id: "detail-initial", cloture: "cloture-comptage", tour: 1, valeur: 1000, quantite: 5 });
    insererDetail({ id: "detail-recomptage", cloture: "cloture-comptage", tour: 2, valeur: 1000, quantite: 4 });

    const detail = database.exec({
      sql: "SELECT montant_total_ligne_fcfa FROM detail_comptage_caisse WHERE id_detail_comptage_caisse = 'detail-initial';",
      rowMode: "object",
      returnValue: "resultRows",
    });
    expect(detail[0]?.montant_total_ligne_fcfa).toBe(5000);
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
      insererDetail({ id: "detail-invalide", cloture: "cloture-inconnue", tour: 1, valeur: 1000, quantite: 1 }),
    ).toThrow();
    expect(() =>
      insererDetail({ id: "detail-coupure-inconnue", cloture: "cloture-comptage", tour: 3, valeur: 333, quantite: 1 }),
    ).toThrow();
    expect(() =>
      insererDetail({ id: "detail-doublon", cloture: "cloture-comptage", tour: 1, valeur: 1000, quantite: 1 }),
    ).toThrow();
    expect(() =>
      insererDetail({ id: "detail-quantite-negative", cloture: "cloture-comptage", tour: 3, valeur: 500, quantite: -1 }),
    ).toThrow();
  });

  it("valide les mouvements de caisse, le remboursement unique et les gardes R-3", () => {
    insererMouvement({ id: "mouvement-entree", session: "session-2", sens: "ENTREE", type: "ENCAISSEMENT" });
    insererMouvement({ id: "mouvement-sortie", session: "session-2", sens: "SORTIE", type: "TRANSMISSION_SORTIE" });
    insererMouvement({
      id: "mouvement-remboursement",
      session: "session-2",
      sens: "SORTIE",
      type: "REMBOURSEMENT",
      operationSource: "remboursement-1",
    });

    expect(() =>
      insererMouvement({ id: "mouvement-remboursement-sans-source", session: "session-2", type: "REMBOURSEMENT" }),
    ).toThrow();
    expect(() =>
      insererMouvement({
        id: "mouvement-remboursement-doublon",
        session: "session-2",
        type: "REMBOURSEMENT",
        operationSource: "remboursement-1",
      }),
    ).toThrow();
    expect(() =>
      insererMouvement({ id: "mouvement-type-invalide", session: "session-2", type: "INCONNU" }),
    ).toThrow();
    expect(() =>
      insererMouvement({ id: "mouvement-sens-invalide", session: "session-2", sens: "INCONNU" }),
    ).toThrow();
    expect(() =>
      insererMouvement({ id: "mouvement-montant-zero", session: "session-2", montant: 0 }),
    ).toThrow();
    expect(() =>
      insererMouvement({ id: "mouvement-session-absente", session: "absente" }),
    ).toThrow();

    expect(() =>
      database.exec(
        "DELETE FROM mouvement_caisse WHERE id_mouvement_caisse = 'mouvement-entree';",
      ),
    ).toThrow();
    database.exec(
      "UPDATE mouvement_caisse SET montant_fcfa = 3000 WHERE id_mouvement_caisse = 'mouvement-entree';",
    );

    insererCloture({ id: "cloture-gardes", session: "session-2", solde: 5000, physique: 5000 });
    insererDetail({ id: "detail-gardes", cloture: "cloture-gardes", tour: 1, valeur: 5000, quantite: 1 });
    expect(() =>
      insererMouvement({ id: "mouvement-apres-cloture", session: "session-2" }),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE mouvement_caisse SET montant_fcfa = 4000 WHERE id_mouvement_caisse = 'mouvement-entree';",
      ),
    ).toThrow();
  });

  it("sépare rapprochement et clôture, et la justification ne modifie pas le snapshot", () => {
    insererCloture({ id: "cloture-rapprochee", session: "session-1", solde: 12000, physique: 11500 });
    insererRapprochement({ id: "rapprochement-1", session: "session-1" });
    insererJustification({ id: "justification-1", rapprochement: "rapprochement-1" });

    expect(lireCompte("SELECT COUNT(*) AS count FROM cloture_caisse;")).toBe(1);
    expect(lireCompte("SELECT COUNT(*) AS count FROM rapprochement_caisse;")).toBe(1);
    expect(lireCompte("SELECT COUNT(*) AS count FROM justification_ecart_caisse;")).toBe(1);
    expect(() =>
      insererJustification({ id: "justification-invalide", rapprochement: "rapprochement-inconnu" }),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE cloture_caisse SET solde_theorique_fcfa = 0 WHERE id_cloture_caisse = 'cloture-rapprochee';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE rapprochement_caisse SET ecart_constate_fcfa = 0 WHERE id_rapprochement_caisse = 'rapprochement-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM rapprochement_caisse WHERE id_rapprochement_caisse = 'rapprochement-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE justification_ecart_caisse SET motif_ecart = 'Autre' WHERE id_justification_ecart_caisse = 'justification-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM justification_ecart_caisse WHERE id_justification_ecart_caisse = 'justification-1';",
      ),
    ).toThrow();
  });

  it("garantit l’unicité du rapprochement définitif par session", () => {
    insererRapprochement({ id: "rapprochement-provisoire", session: "session-2", definitif: 0 });
    insererRapprochement({ id: "rapprochement-definitif-1", session: "session-2", definitif: 1 });
    expect(() =>
      insererRapprochement({ id: "rapprochement-definitif-2", session: "session-2", definitif: 1 }),
    ).toThrow();
    insererRapprochement({ id: "rapprochement-definitif-autre", session: "session-1", definitif: 1 });
    expect(() =>
      insererRapprochement({ id: "rapprochement-superviseur-vide", session: "session-1", superviseur: "  " }),
    ).toThrow();
  });

  it("représente une transmission par un événement unique avec cycle et traçabilité (G-18)", () => {
    insererTransmission({
      id: "transmission-emise",
      source: "session-2",
      responsable: "responsable-1",
      nomResponsable: "M. Kouassi",
      montantEnvoye: 5000,
    });
    expect(() =>
      database.exec(
        "UPDATE transmission_fonds SET montant_recu_fcfa = 4500 WHERE id_transmission_fonds = 'transmission-emise';",
      ),
    ).toThrow();

    insererTransmission({
      id: "transmission-recue",
      source: "session-2",
      destination: "session-1",
      montantEnvoye: 3000,
      montantRecu: 3000,
      etat: "RECUE",
      dateReception: "2026-11-04T13:00:00+01:00",
    });
    expect(() =>
      database.exec(
        "UPDATE transmission_fonds SET montant_recu_fcfa = 2500 WHERE id_transmission_fonds = 'transmission-recue';",
      ),
    ).toThrow();

    insererTransmission({
      id: "transmission-ecart",
      source: "session-1",
      destination: "session-2",
      montantEnvoye: 2000,
      montantRecu: 1900,
      etat: "ECART_CONSTATE",
      dateReception: "2026-11-04T14:00:00+01:00",
    });

    expect(() =>
      insererTransmission({
        id: "transmission-meme-session",
        source: "session-1",
        destination: "session-1",
        responsable: "responsable-1",
        nomResponsable: "M. Kouassi",
      }),
    ).toThrow();
    expect(() =>
      insererTransmission({ id: "transmission-sans-tracabilite", source: "session-1" }),
    ).toThrow();
    expect(() =>
      insererTransmission({
        id: "transmission-recue-sans-reception",
        source: "session-1",
        destination: "session-2",
        montantEnvoye: 1000,
        montantRecu: 1000,
        etat: "RECUE",
      }),
    ).toThrow();
    expect(() =>
      insererTransmission({
        id: "transmission-emise-avec-recu",
        source: "session-1",
        destination: "session-2",
        montantEnvoye: 1000,
        montantRecu: 1000,
        etat: "EMISE",
      }),
    ).toThrow();
    expect(() =>
      insererTransmission({
        id: "transmission-etat-invalide",
        source: "session-1",
        destination: "session-2",
        etat: "INCONNU",
      }),
    ).toThrow();
    expect(lireCompte("SELECT COUNT(*) AS count FROM transmission_fonds;")).toBe(3);
    expect(lireCompte("SELECT COUNT(*) AS count FROM mouvement_caisse;")).toBe(0);
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
});
