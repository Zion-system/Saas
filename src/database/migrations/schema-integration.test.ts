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

describe("intégrité globale du schéma SQLite V1", () => {
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

  it("applique 001–013 en ordre et crée les objets SQL attendus sans collisions de noms", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });
    const objectCounts = database.exec({
      sql: `
        SELECT type, COUNT(*) AS count
        FROM sqlite_master
        WHERE name NOT LIKE 'sqlite_%'
        GROUP BY type ORDER BY type;
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });
    const duplicateNames = database.exec({
      sql: `
        SELECT name FROM sqlite_master
        WHERE name NOT LIKE 'sqlite_%'
        GROUP BY name HAVING COUNT(*) > 1;
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(versions.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(objectCounts).toContainEqual({ type: "table", count: 75 });
    expect(objectCounts).toContainEqual({ type: "view", count: 1 });
    expect(
      Number(objectCounts.find((row) => row.type === "index")?.count),
    ).toBeGreaterThan(0);
    expect(
      Number(objectCounts.find((row) => row.type === "trigger")?.count),
    ).toBeGreaterThan(0);
    expect(duplicateNames).toEqual([]);
  });

  it("active les clés étrangères et passe les contrôles d’intégrité à vide puis après un parcours inter-lots", () => {
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
    expect(
      database.exec({
        sql: "PRAGMA foreign_key_check;",
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([]);
    expect(
      database.exec({
        sql: "PRAGMA integrity_check;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.integrity_check,
    ).toBe("ok");

    database.exec(`
      INSERT INTO etablissement VALUES ('etablissement-1');
      INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
        VALUES ('annee-1', 'etablissement-1');
      INSERT INTO type_frais (id_type_frais, code_type_frais, libelle)
        VALUES ('type-1', 'SCOLARITE', 'Scolarité');
      INSERT INTO periode_facturation (
        id_periode_facturation, id_annee_scolaire,
        date_debut_periode, date_fin_periode
      ) VALUES ('periode-1', 'annee-1', '2026-09-01', '2027-06-01');
      INSERT INTO campagne_facturation (
        id_campagne_facturation, id_annee_scolaire, id_type_frais,
        id_periode_facturation, auteur_lancement
      ) VALUES ('campagne-1', 'annee-1', 'type-1', 'periode-1', 'utilisateur-externe');
      INSERT INTO execution_campagne_facturation (
        id_execution_campagne, id_campagne_facturation
      ) VALUES ('execution-1', 'campagne-1');
      INSERT INTO creance (
        id_creance, id_eleve, id_annee_scolaire, id_type_frais,
        libelle_type_frais_snapshot, id_periode_facturation,
        origine_creation, id_campagne_facturation, id_execution_campagne,
        montant_brut_fcfa, montant_remise_fcfa, montant_net_initial_fcfa
      ) VALUES (
        'creance-1', 'eleve-1', 'annee-1', 'type-1',
        'Scolarité', 'periode-1', 'CAMPAGNE', 'campagne-1', 'execution-1',
        12000, 0, 12000
      );
      INSERT INTO plan_reglement_creance (
        id_plan_reglement_creance, id_creance, montant_total_planifie_fcfa,
        type_plan
      ) VALUES ('plan-1', 'creance-1', 12000, 'INITIAL');
      INSERT INTO echeance_creance (
        id_echeance_creance, id_creance, id_plan_reglement_creance,
        montant_exigible_fcfa, date_exigibilite, rang, etat_administratif
      ) VALUES ('echeance-1', 'creance-1', 'plan-1', 12000, '2026-10-01', 1, 'CODE_SOURCE');
      INSERT INTO encaissement VALUES ('encaissement-1', 12000);
      INSERT INTO affectation_reglement (
        id_affectation_reglement, id_encaissement, id_creance,
        montant_affecte_fcfa, date_affectation
      ) VALUES ('affectation-1', 'encaissement-1', 'creance-1', 12000, '2026-11-04T10:00:00+01:00');
      INSERT INTO relance_financiere VALUES ('relance-1', 'eleve-1');
      INSERT INTO ligne_relance_financiere (
        id_ligne_relance, id_relance, id_echeance_creance, montant_reference_fcfa
      ) VALUES ('ligne-relance-1', 'relance-1', 'echeance-1', 12000);
      INSERT INTO destinataire_relance_financiere (
        id_destinataire_relance, id_relance, coordonnees_reference
      ) VALUES ('destinataire-1', 'relance-1', 'coordonnees-historiques');
      INSERT INTO tentative_transmission_relance (
        id_tentative, id_relance, id_destinataire_relance,
        date_tentative, canal, resultat, contact_utilise
      ) VALUES (
        'tentative-relance-1', 'relance-1', 'destinataire-1',
        '2026-11-04T10:00:00+01:00', 'CANAL_SOURCE', 'RESULTAT_SOURCE', 'contact-1'
      );
      INSERT INTO parametrage_balance_agee (id_parametrage, version)
        VALUES ('parametrage-1', 'version-1');
      INSERT INTO tranche_balance_agee (
        id_tranche, id_parametrage, borne_basse_jours, borne_haute_jours
      ) VALUES ('tranche-1', 'parametrage-1', 1, NULL);
    `);

    database.exec(`
      INSERT INTO appareil_synchronisation (
        id_appareil, id_etablissement, date_enregistrement, etat_appareil
      ) VALUES ('appareil-sync-1', 'etablissement-1', '2026-11-04T08:00:00Z', 'ACTIF');
      INSERT INTO installation_locale (
        id_installation, id_appareil, date_creation,
        version_application, version_schema_local, etat_installation, numero_generation
      ) VALUES (
        'installation-1', 'appareil-sync-1', '2026-11-04T08:00:00Z',
        '1.0', '10', 'ACTIVE', 1
      );
      INSERT INTO flux_synchronisation (
        id_flux, origine_flux, id_installation_emettrice,
        sens_flux, identifiant_partition, date_creation, etat_flux
      ) VALUES (
        'flux-1', 'INSTALLATION_LOCALE', 'installation-1',
        'APPAREIL_VERS_SERVEUR', 'partition-1', '2026-11-04T08:00:00Z', 'OUVERT'
      );
      INSERT INTO operation_synchronisation (
        id_operation, origine_operation, id_installation_origine,
        domaine_proprietaire, portee_atomicite_declaree,
        nombre_evenements_attendus, date_creation_locale
      ) VALUES (
        'operation-1', 'INSTALLATION_LOCALE', 'installation-1',
        'DOMAINE_FINANCIER', 'NON_ATOMIQUE', 1, '2026-11-04T08:00:00Z'
      );
      INSERT INTO enveloppe_evenement_synchronisation (
        id_evenement, id_operation, id_flux_origine, numero_sequence_origine,
        type_evenement, type_entite_source, id_entite_source,
        reference_contenu_metier_immuable, ordre_dans_operation,
        version_enveloppe, version_evenement, version_application_emettrice,
        date_creation_locale
      ) VALUES (
        'evenement-1', 'operation-1', 'flux-1', 1,
        'EVENEMENT_SOURCE', 'CREANCE', 'creance-1', '{"id":"creance-1"}', 1,
        '1', '1', '1.0', '2026-11-04T08:00:00Z'
      );
    `);

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM enveloppe_evenement_synchronisation;",
      ),
    ).toBe(1);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM tentative_transmission_relance;",
      ),
    ).toBe(1);
    expect(
      database.exec({
        sql: "PRAGMA foreign_key_check;",
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toEqual([]);
    expect(
      database.exec({
        sql: "PRAGMA integrity_check;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.integrity_check,
    ).toBe("ok");
  });
});
