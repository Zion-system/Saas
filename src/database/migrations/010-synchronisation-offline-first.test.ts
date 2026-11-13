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

function insererAppareil(id: string, etablissement: string): void {
  database.exec({
    sql: `
      INSERT INTO appareil_synchronisation (
        id_appareil, id_etablissement, date_enregistrement, etat_appareil
      ) VALUES (?, ?, ?, ?);
    `,
    bind: [id, etablissement, "2026-11-04T08:00:00Z", "ACTIF"],
  });
}

function insererInstallation(
  id: string,
  appareil: string,
  generation = 1,
): void {
  database.exec({
    sql: `
      INSERT INTO installation_locale (
        id_installation, id_appareil, date_creation,
        version_application, version_schema_local,
        etat_installation, numero_generation
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      appareil,
      "2026-11-04T08:00:00Z",
      "1.0",
      "9",
      "ACTIVE",
      generation,
    ],
  });
}

function insererFlux(
  id: string,
  origine: "INSTALLATION_LOCALE" | "SERVEUR_CENTRAL",
  sens: "APPAREIL_VERS_SERVEUR" | "SERVEUR_VERS_APPAREIL",
  installation: string | null,
  etablissement: string | null,
): void {
  database.exec({
    sql: `
      INSERT INTO flux_synchronisation (
        id_flux, origine_flux, id_installation_emettrice,
        id_etablissement_contexte, sens_flux, identifiant_partition,
        date_creation, etat_flux
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      origine,
      installation,
      etablissement,
      sens,
      `partition-${id}`,
      "2026-11-04T08:00:00Z",
      "OUVERT",
    ],
  });
}

function insererOperation(options: {
  id: string;
  origine?: "INSTALLATION_LOCALE" | "SERVEUR_CENTRAL";
  installation?: string | null;
  etablissement?: string | null;
  attendus?: number;
  domaine?: string;
  portee?: string;
  dateCreation?: string | null;
}): void {
  const origine = options.origine ?? "INSTALLATION_LOCALE";
  const installation =
    options.installation === undefined
      ? "installation-1"
      : options.installation;
  const etablissement = options.etablissement ?? null;
  const dateCreation =
    options.dateCreation === undefined
      ? origine === "INSTALLATION_LOCALE"
        ? "2026-11-04T08:00:00Z"
        : null
      : options.dateCreation;

  database.exec({
    sql: `
      INSERT INTO operation_synchronisation (
        id_operation, origine_operation, id_installation_origine,
        id_etablissement_contexte, reference_operation_metier,
        id_utilisateur_auteur_metier, domaine_proprietaire,
        portee_atomicite_declaree, nombre_evenements_attendus,
        date_creation_locale
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      origine,
      installation,
      etablissement,
      null,
      null,
      options.domaine ?? "DOMAINE_TEST",
      options.portee ?? "PORTEE_NON_ATOMIQUE",
      options.attendus ?? 1,
      dateCreation,
    ],
  });
}

function insererEvenement(options: {
  id: string;
  operation: string;
  flux: string;
  sequence: number;
  rang?: number;
  contenu?: string;
  dateCreation?: string | null;
  dateReception?: string | null;
}): void {
  database.exec({
    sql: `
      INSERT INTO enveloppe_evenement_synchronisation (
        id_evenement, id_operation, id_flux_origine,
        numero_sequence_origine, type_evenement, type_entite_source,
        id_entite_source, reference_contenu_metier_immuable,
        ordre_dans_operation, version_enveloppe, version_evenement,
        version_application_emettrice, date_creation_locale,
        date_reception_durable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      options.id,
      options.operation,
      options.flux,
      options.sequence,
      "EVENEMENT_TEST",
      "ENTITE_TEST",
      "source-1",
      options.contenu ?? "contenu-canonique",
      options.rang ?? 1,
      "1",
      "1",
      "1.0",
      options.dateCreation === undefined
        ? "2026-11-04T08:00:00Z"
        : options.dateCreation,
      options.dateReception ?? null,
    ],
  });
}

function insererSauvegarde(
  id: string,
  appareil: string,
  installation: string,
): void {
  database.exec({
    sql: `
      INSERT INTO sauvegarde_locale (
        id_sauvegarde, id_appareil_origine, id_installation_origine,
        date_creation, type_sauvegarde, version_application,
        version_schema_local, perimetre_sauvegarde, reference_stockage,
        resultat_verification_integrite
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      appareil,
      installation,
      "2026-11-04T09:00:00Z",
      "TYPE_NON_ENUMERE",
      "1.0",
      "9",
      "evenements-non-acquittes",
      `stockage-${id}`,
      "VERIFIEE",
    ],
  });
}

function insererRestauration(
  id: string,
  sauvegarde: string,
  appareilCible: string,
  installationCible: string,
): void {
  database.exec({
    sql: `
      INSERT INTO operation_restauration (
        id_restauration, id_sauvegarde, id_appareil_cible,
        id_installation_cible, date_demande, date_debut,
        etat_restauration, resultat_verification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      sauvegarde,
      appareilCible,
      installationCible,
      "2026-11-04T10:00:00Z",
      "2026-11-04T10:01:00Z",
      "EN_RECONCILIATION",
      "VERIFIEE",
    ],
  });
}

describe("migration synchronisation_offline_first", () => {
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
      INSERT INTO etablissement (id_etablissement) VALUES ('etablissement-2');
    `);
    insererAppareil("appareil-1", "etablissement-1");
    insererAppareil("appareil-2", "etablissement-1");
    insererAppareil("appareil-3", "etablissement-2");
    insererInstallation("installation-1", "appareil-1");
    insererInstallation("installation-2", "appareil-2");
    insererInstallation("installation-3", "appareil-3");
  });

  afterEach(() => {
    database.close();
  });

  it("applique les migrations 001 à 012 en ordre et crée les 17 concepts", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });
    const tables = database.exec({
      sql: `
        SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (
          'appareil_synchronisation', 'installation_locale', 'flux_synchronisation',
          'operation_synchronisation', 'enveloppe_evenement_synchronisation',
          'dependance_evenement_synchronisation', 'curseur_synchronisation',
          'conflit_synchronisation', 'association_conflit_evenement',
          'association_conflit_operation', 'decision_arbitrage_synchronisation',
          'transition_applicabilite_decision', 'application_decision_arbitrage',
          'sauvegarde_locale', 'operation_restauration',
          'association_recuperation_evenement',
          'tentative_transmission_synchronisation'
        );
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });

    expect(versions.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
    expect(tables).toHaveLength(17);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("garde l’identité d’opération idempotente et bloque un manifeste différent", () => {
    insererFlux(
      "flux-1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-1" });
    insererOperation({ id: "operation-1" });

    expect(
      lireCompte("SELECT COUNT(*) AS count FROM operation_synchronisation;"),
    ).toBe(1);
    expect(() =>
      insererOperation({ id: "operation-1", domaine: "AUTRE_DOMAINE" }),
    ).toThrow();
  });

  it("reconnaît un événement retransmis sans doublon et bloque tout contenu différent", () => {
    insererFlux(
      "flux-1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-1" });
    const evenement = {
      id: "evenement-1",
      operation: "operation-1",
      flux: "flux-1",
      sequence: 1,
    };

    insererEvenement(evenement);
    insererEvenement(evenement);

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM enveloppe_evenement_synchronisation;",
      ),
    ).toBe(1);
    expect(
      database.exec({
        sql: "SELECT derniere_sequence_attribuee FROM flux_synchronisation WHERE id_flux = 'flux-1';",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.derniere_sequence_attribuee,
    ).toBe(1);
    expect(() =>
      insererEvenement({ ...evenement, contenu: "contenu-different" }),
    ).toThrow();
    expect(() =>
      insererEvenement({ ...evenement, id: "evenement-autre" }),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE enveloppe_evenement_synchronisation SET reference_contenu_metier_immuable = 'corrige' WHERE id_evenement = 'evenement-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE flux_synchronisation SET identifiant_partition = 'autre' WHERE id_flux = 'flux-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM enveloppe_evenement_synchronisation WHERE id_evenement = 'evenement-1';",
      ),
    ).toThrow();
  });

  it("préserve les séquences contiguës, les rangs de manifeste et la complétude", () => {
    insererFlux(
      "flux-1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-2", attendus: 2 });
    insererEvenement({
      id: "evenement-1",
      operation: "operation-2",
      flux: "flux-1",
      sequence: 1,
      rang: 1,
      dateReception: "2026-11-04T08:01:00Z",
    });

    expect(() =>
      database.exec({
        sql: "UPDATE operation_synchronisation SET date_reception_complete = ? WHERE id_operation = ?;",
        bind: ["2026-11-04T08:02:00Z", "operation-2"],
      }),
    ).toThrow();
    expect(() =>
      insererEvenement({
        id: "evenement-rang-trop-haut",
        operation: "operation-2",
        flux: "flux-1",
        sequence: 2,
        rang: 3,
      }),
    ).toThrow();

    insererEvenement({
      id: "evenement-2",
      operation: "operation-2",
      flux: "flux-1",
      sequence: 2,
      rang: 2,
      dateReception: "2026-11-04T08:02:00Z",
    });
    database.exec({
      sql: "UPDATE operation_synchronisation SET date_reception_complete = ? WHERE id_operation = ?;",
      bind: ["2026-11-04T08:02:00Z", "operation-2"],
    });
    expect(() =>
      database.exec(
        "UPDATE operation_synchronisation SET nombre_evenements_attendus = 3 WHERE id_operation = 'operation-2';",
      ),
    ).toThrow();
  });

  it("refuse les chemins d’origine ou de flux incompatibles", () => {
    expect(() =>
      insererFlux(
        "flux-xor-invalide",
        "INSTALLATION_LOCALE",
        "APPAREIL_VERS_SERVEUR",
        null,
        "etablissement-1",
      ),
    ).toThrow();
    expect(() =>
      insererFlux(
        "flux-sens-invalide",
        "SERVEUR_CENTRAL",
        "APPAREIL_VERS_SERVEUR",
        null,
        "etablissement-1",
      ),
    ).toThrow();

    insererFlux(
      "flux-local-1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererFlux(
      "flux-local-2",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-2",
      null,
    );
    insererOperation({
      id: "operation-locale",
      installation: "installation-1",
    });
    expect(() =>
      insererEvenement({
        id: "evenement-mauvais-flux",
        operation: "operation-locale",
        flux: "flux-local-2",
        sequence: 1,
      }),
    ).toThrow();

    insererFlux(
      "flux-central-1",
      "SERVEUR_CENTRAL",
      "SERVEUR_VERS_APPAREIL",
      null,
      "etablissement-1",
    );
    insererFlux(
      "flux-central-2",
      "SERVEUR_CENTRAL",
      "SERVEUR_VERS_APPAREIL",
      null,
      "etablissement-2",
    );
    insererOperation({
      id: "operation-centrale",
      origine: "SERVEUR_CENTRAL",
      installation: null,
      etablissement: "etablissement-1",
      dateCreation: null,
    });
    expect(() =>
      insererEvenement({
        id: "evenement-autre-etablissement",
        operation: "operation-centrale",
        flux: "flux-central-2",
        sequence: 1,
        dateCreation: null,
      }),
    ).toThrow();
  });

  it("bloque les cycles de dépendances", () => {
    insererFlux(
      "flux-1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-1", attendus: 2 });
    insererEvenement({
      id: "evenement-1",
      operation: "operation-1",
      flux: "flux-1",
      sequence: 1,
      rang: 1,
    });
    insererEvenement({
      id: "evenement-2",
      operation: "operation-1",
      flux: "flux-1",
      sequence: 2,
      rang: 2,
    });
    database.exec({
      sql: `
        INSERT INTO dependance_evenement_synchronisation (
          id_dependance, id_evenement_dependant, id_evenement_prerequis,
          type_dependance, date_identification, caractere_obligatoire
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "dependance-1",
        "evenement-2",
        "evenement-1",
        "TYPE_LIBRE",
        "2026-11-04",
        1,
      ],
    });

    expect(() =>
      database.exec({
        sql: `
          INSERT INTO dependance_evenement_synchronisation (
            id_dependance, id_evenement_dependant, id_evenement_prerequis,
            type_dependance, date_identification, caractere_obligatoire
          ) VALUES (?, ?, ?, ?, ?, ?);
        `,
        bind: [
          "dependance-cyclique",
          "evenement-1",
          "evenement-2",
          "TYPE_LIBRE",
          "2026-11-04",
          1,
        ],
      }),
    ).toThrow();
  });

  it("garde un curseur unique par flux et récepteur et bloque les trous de réception", () => {
    insererFlux(
      "flux-entrant",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-1" });
    insererEvenement({
      id: "evenement-1",
      operation: "operation-1",
      flux: "flux-entrant",
      sequence: 1,
    });
    database.exec({
      sql: "INSERT INTO curseur_synchronisation (id_curseur, id_flux, type_recepteur) VALUES (?, ?, ?);",
      bind: ["curseur-serveur", "flux-entrant", "SERVEUR_CENTRAL"],
    });

    expect(() =>
      database.exec(
        "INSERT INTO curseur_synchronisation (id_curseur, id_flux, type_recepteur) VALUES ('curseur-serveur-double', 'flux-entrant', 'SERVEUR_CENTRAL');",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE curseur_synchronisation SET derniere_sequence_recue_durable_contigue = 1 WHERE id_curseur = 'curseur-serveur';",
      ),
    ).toThrow();

    database.exec(
      "UPDATE enveloppe_evenement_synchronisation SET date_reception_durable = '2026-11-04T08:01:00Z' WHERE id_evenement = 'evenement-1';",
    );
    database.exec(
      "UPDATE curseur_synchronisation SET derniere_sequence_recue_durable_contigue = 1, derniere_sequence_traitee_definitivement_contigue = 1 WHERE id_curseur = 'curseur-serveur';",
    );
    expect(() =>
      database.exec(
        "UPDATE curseur_synchronisation SET derniere_sequence_traitee_definitivement_contigue = 2 WHERE id_curseur = 'curseur-serveur';",
      ),
    ).toThrow();
  });

  it("trace conflits par événement et opération et garde les décisions append-only", () => {
    insererFlux(
      "flux-1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-1" });
    insererEvenement({
      id: "evenement-1",
      operation: "operation-1",
      flux: "flux-1",
      sequence: 1,
    });
    expect(() =>
      database.exec(`
        INSERT INTO conflit_synchronisation (
          id_conflit, type_conflit, nature_conflit,
          date_detection, motif_detection, etat_conflit
        ) VALUES ('conflit-sans-liens', 'TYPE', 'NATURE', '2026-11-04', 'Divergence', 'DETECTE');
      `),
    ).toThrow();
    database.exec("BEGIN IMMEDIATE;");
    database.exec({
      sql: `
        INSERT INTO association_conflit_evenement (
          id_conflit, id_evenement, role_evenement_dans_conflit,
          date_association, motif_association
        ) VALUES (?, ?, ?, ?, ?);
      `,
      bind: [
        "conflit-1",
        "evenement-1",
        "VERSION_CONCURRENTE",
        "2026-11-04",
        "Conflit détecté",
      ],
    });
    database.exec({
      sql: `
        INSERT INTO association_conflit_operation (
          id_association_conflit_operation, id_conflit, id_operation,
          role_operation_dans_conflit, date_association, motif_association
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "assoc-op-1",
        "conflit-1",
        "operation-1",
        "AFFECTEE",
        "2026-11-04",
        "Opération liée",
      ],
    });
    database.exec({
      sql: `
        INSERT INTO conflit_synchronisation (
          id_conflit, type_conflit, nature_conflit,
          date_detection, motif_detection, etat_conflit
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "conflit-1",
        "TYPE_LIBRE",
        "NATURE_LIBRE",
        "2026-11-04",
        "Divergence",
        "DETECTE",
      ],
    });
    database.exec("COMMIT;");
    database.exec({
      sql: `
        INSERT INTO decision_arbitrage_synchronisation (
          id_decision, id_conflit, id_utilisateur_arbitre,
          type_decision, date_decision, justification
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "decision-1",
        "conflit-1",
        "utilisateur-externe",
        "TYPE_LIBRE",
        "2026-11-04",
        "Justification",
      ],
    });
    database.exec({
      sql: `
        INSERT INTO transition_applicabilite_decision (
          id_transition, id_decision, type_transition, date_transition
        ) VALUES (?, ?, ?, ?);
      `,
      bind: ["transition-1", "decision-1", "RETENUE", "2026-11-04"],
    });
    database.exec({
      sql: `
        INSERT INTO application_decision_arbitrage (
          id_application, id_decision, date_tentative, resultat_application
        ) VALUES (?, ?, ?, ?);
      `,
      bind: [
        "application-1",
        "decision-1",
        "2026-11-04T12:00:00Z",
        "APPLIQUEE",
      ],
    });

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM association_conflit_evenement;",
      ),
    ).toBe(1);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM association_conflit_operation;",
      ),
    ).toBe(1);
    expect(() =>
      database.exec(
        "UPDATE decision_arbitrage_synchronisation SET justification = 'réécrite' WHERE id_decision = 'decision-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM association_conflit_evenement WHERE id_conflit = 'conflit-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE association_conflit_operation SET role_operation_dans_conflit = 'AUTRE' WHERE id_association_conflit_operation = 'assoc-op-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM application_decision_arbitrage WHERE id_application = 'application-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: `
          INSERT INTO transition_applicabilite_decision (
            id_transition, id_decision, type_transition, date_transition,
            id_decision_remplacante
          ) VALUES (?, ?, ?, ?, ?);
        `,
        bind: [
          "transition-invalid",
          "decision-1",
          "REMPLACEE",
          "2026-11-04",
          "decision-inconnue",
        ],
      }),
    ).toThrow();
  });

  it("isole les conflits et les restaurations par établissement", () => {
    insererFlux(
      "flux-e1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-e1" });
    insererEvenement({
      id: "evenement-e1",
      operation: "operation-e1",
      flux: "flux-e1",
      sequence: 1,
    });
    insererSauvegarde("sauvegarde-e1", "appareil-1", "installation-1");
    insererRestauration(
      "restauration-e1",
      "sauvegarde-e1",
      "appareil-2",
      "installation-2",
    );

    expect(() =>
      insererRestauration(
        "restauration-croisee",
        "sauvegarde-e1",
        "appareil-3",
        "installation-3",
      ),
    ).toThrow();
    expect(() =>
      insererSauvegarde(
        "sauvegarde-installation-incoherente",
        "appareil-2",
        "installation-1",
      ),
    ).toThrow();

    database.exec({
      sql: `
        INSERT INTO association_recuperation_evenement (
          id_association_recuperation, id_restauration, id_evenement_origine,
          id_utilisateur_autorisateur, date_autorisation,
          resultat_autorisation, motif
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "recuperation-1",
        "restauration-e1",
        "evenement-e1",
        "utilisateur-externe",
        "2026-11-04T13:00:00Z",
        "AUTORISEE",
        "Récupération contrôlée",
      ],
    });
    insererFlux(
      "flux-e2",
      "SERVEUR_CENTRAL",
      "SERVEUR_VERS_APPAREIL",
      null,
      "etablissement-2",
    );
    insererOperation({
      id: "operation-e2",
      origine: "SERVEUR_CENTRAL",
      installation: null,
      etablissement: "etablissement-2",
      dateCreation: null,
    });
    insererEvenement({
      id: "evenement-e2",
      operation: "operation-e2",
      flux: "flux-e2",
      sequence: 1,
      dateCreation: null,
    });

    expect(() =>
      database.exec({
        sql: `
          INSERT INTO association_recuperation_evenement (
            id_association_recuperation, id_restauration, id_evenement_origine,
            id_utilisateur_autorisateur, date_autorisation,
            resultat_autorisation, motif
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        bind: [
          "recuperation-croisee",
          "restauration-e1",
          "evenement-e2",
          "utilisateur-externe",
          "2026-11-04T13:00:00Z",
          "AUTORISEE",
          "Établissement différent",
        ],
      }),
    ).toThrow();
  });

  it("exige une autorisation de récupération pour retransmettre depuis une autre installation", () => {
    insererFlux(
      "flux-e1",
      "INSTALLATION_LOCALE",
      "APPAREIL_VERS_SERVEUR",
      "installation-1",
      null,
    );
    insererOperation({ id: "operation-e1" });
    insererEvenement({
      id: "evenement-e1",
      operation: "operation-e1",
      flux: "flux-e1",
      sequence: 1,
    });
    insererSauvegarde("sauvegarde-e1", "appareil-1", "installation-1");
    insererRestauration(
      "restauration-e1",
      "sauvegarde-e1",
      "appareil-2",
      "installation-2",
    );

    expect(() =>
      database.exec({
        sql: `
          INSERT INTO tentative_transmission_synchronisation (
            id_tentative, id_evenement, id_installation_emettrice_actuelle,
            date_tentative, resultat_tentative
          ) VALUES (?, ?, ?, ?, ?);
        `,
        bind: [
          "tentative-non-autorisee",
          "evenement-e1",
          "installation-2",
          "2026-11-04T14:00:00Z",
          "TRANSMIS",
        ],
      }),
    ).toThrow();

    database.exec({
      sql: `
        INSERT INTO association_recuperation_evenement (
          id_association_recuperation, id_restauration, id_evenement_origine,
          id_utilisateur_autorisateur, date_autorisation,
          resultat_autorisation, motif
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "recuperation-1",
        "restauration-e1",
        "evenement-e1",
        "utilisateur-externe",
        "2026-11-04T13:00:00Z",
        "AUTORISEE",
        "Récupération contrôlée",
      ],
    });
    database.exec({
      sql: `
        INSERT INTO tentative_transmission_synchronisation (
          id_tentative, id_evenement, id_installation_emettrice_actuelle,
          id_association_recuperation, date_tentative, resultat_tentative
        ) VALUES (?, ?, ?, ?, ?, ?);
      `,
      bind: [
        "tentative-recuperation-1",
        "evenement-e1",
        "installation-2",
        "recuperation-1",
        "2026-11-04T14:00:00Z",
        "TRANSMIS",
      ],
    });
    expect(() =>
      database.exec(
        "DELETE FROM tentative_transmission_synchronisation WHERE id_tentative = 'tentative-recuperation-1';",
      ),
    ).toThrow();
  });
});
