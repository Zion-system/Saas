import sqlite3InitModule, { type SqlValue } from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  SQLiteExecutor,
  SQLiteRow,
  SQLiteStatement,
} from "../../database/local/sqlite.types";
import { executerTransactionSQLite } from "../../database/local/sqlite-operations";
import { SQLiteCommandError } from "../../database/local/sqlite.client";
import { migrations } from "../../database/migrations";
import {
  CapaciteClasseAtteinteError,
  ConflitOrganisationError,
  ReferenceOrganisationError,
  creerServicesInscriptionsAffectations,
} from ".";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;
let services: ReturnType<typeof creerServicesInscriptionsAffectations>;

function convertirErreur(error: unknown): SQLiteCommandError {
  if (error instanceof Error) {
    const resultCode =
      typeof error === "object" &&
      error !== null &&
      "resultCode" in error &&
      typeof error.resultCode === "number"
        ? error.resultCode
        : undefined;
    return new SQLiteCommandError(error.message, resultCode);
  }
  return new SQLiteCommandError("Erreur SQLite inconnue.");
}

function executerInstruction(statement: SQLiteStatement): SQLiteRow[] {
  try {
    return database.exec({
      sql: statement.sql,
      bind: statement.bind as SqlValue[] | undefined,
      rowMode: "object",
      returnValue: "resultRows",
    });
  } catch (error) {
    throw convertirErreur(error);
  }
}

function executerControle(sql: string): void {
  try {
    database.exec(sql);
  } catch (error) {
    throw convertirErreur(error);
  }
}

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
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.exec(migration.sql);
      database.exec({
        sql: "INSERT INTO schema_migrations (version, name) VALUES (?, ?);",
        bind: [migration.version, migration.name],
      });
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  database.exec(`
    INSERT INTO etablissement (id_etablissement)
      VALUES ('etablissement-1'), ('etablissement-2');
    INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
      VALUES
        ('annee-1', 'etablissement-1'),
        ('annee-2', 'etablissement-1'),
        ('annee-autre-etablissement', 'etablissement-2');
    INSERT INTO niveau_enseignement (id_niveau) VALUES ('niveau-1');
    INSERT INTO modele_classe (id_modele_classe) VALUES ('modele-1');
    INSERT INTO classe_annuelle (
      id_classe_annuelle, id_annee_scolaire, id_niveau,
      id_modele_classe, id_etablissement, capacite_max
    ) VALUES
      ('classe-1', 'annee-1', 'niveau-1', 'modele-1', 'etablissement-1', NULL),
      ('classe-2', 'annee-1', 'niveau-1', 'modele-1', 'etablissement-1', 1),
      ('classe-sans-place', 'annee-1', 'niveau-1', 'modele-1', 'etablissement-1', 0),
      ('classe-autre-annee', 'annee-2', 'niveau-1', 'modele-1', 'etablissement-1', NULL),
      ('classe-autre-etablissement', 'annee-autre-etablissement',
       'niveau-1', 'modele-1', 'etablissement-2', NULL);
    INSERT INTO eleve (id_eleve, id_etablissement)
      VALUES
        ('eleve-1', 'etablissement-1'),
        ('eleve-2', 'etablissement-1'),
        ('eleve-3', 'etablissement-1'),
        ('eleve-autre-etablissement', 'etablissement-2');
    INSERT INTO candidature (id_candidature) VALUES ('candidature-1');
    INSERT INTO preinscription (id_preinscription, id_candidature)
      VALUES ('preinscription-1', 'candidature-1');
  `);

  const executor: SQLiteExecutor = {
    async query(sql, bind = []) {
      return executerInstruction({ sql, bind });
    },
    async transaction(statements) {
      return executerTransactionSQLite(
        executerInstruction,
        executerControle,
        statements,
      );
    },
  };
  services = creerServicesInscriptionsAffectations(executor);
});

afterEach(() => {
  database.close();
});

async function creerInscription({
  id = "inscription-1",
  eleve = "eleve-1",
  annee = "annee-1",
  etablissement = "etablissement-1",
  etat = "CONFIRMEE",
}: {
  id?: string;
  eleve?: string;
  annee?: string;
  etablissement?: string;
  etat?: "BROUILLON" | "CONFIRMEE" | "ANNULEE";
} = {}) {
  return services.inscriptions.creerDirecte({
    id_inscription: id,
    id_eleve: eleve,
    id_annee_scolaire: annee,
    id_etablissement: etablissement,
    etat_inscription: etat,
  });
}

describe("services des inscriptions et affectations", () => {
  it("crée des inscriptions directes ou issues d’une préinscription et les consulte", async () => {
    const directe = await creerInscription({ etat: "BROUILLON" });
    const issueDePreinscription =
      await services.inscriptions.creerDepuisPreinscription({
        id_inscription: "inscription-preinscrite",
        id_eleve: "eleve-2",
        id_annee_scolaire: "annee-1",
        id_etablissement: "etablissement-1",
        id_preinscription: "preinscription-1",
        etat_inscription: "CONFIRMEE",
      });

    expect(directe.id_preinscription).toBeNull();
    expect(issueDePreinscription.id_preinscription).toBe("preinscription-1");
    expect(await services.inscriptions.obtenir("inscription-1")).toEqual(
      directe,
    );
    expect(await services.inscriptions.lister()).toHaveLength(2);
    expect(
      await services.inscriptions.listerParEleveEtAnnee("eleve-2", "annee-1"),
    ).toEqual([issueDePreinscription]);
  });

  it("refuse une seconde inscription confirmée pour le même élève et la même année", async () => {
    await creerInscription();

    await expect(
      creerInscription({ id: "inscription-double" }),
    ).rejects.toBeInstanceOf(ConflitOrganisationError);
  });

  it("refuse une préinscription déjà utilisée", async () => {
    await services.inscriptions.creerDepuisPreinscription({
      id_inscription: "inscription-preinscrite-1",
      id_eleve: "eleve-1",
      id_annee_scolaire: "annee-1",
      id_etablissement: "etablissement-1",
      id_preinscription: "preinscription-1",
      etat_inscription: "BROUILLON",
    });

    await expect(
      services.inscriptions.creerDepuisPreinscription({
        id_inscription: "inscription-preinscrite-2",
        id_eleve: "eleve-2",
        id_annee_scolaire: "annee-1",
        id_etablissement: "etablissement-1",
        id_preinscription: "preinscription-1",
        etat_inscription: "BROUILLON",
      }),
    ).rejects.toBeInstanceOf(ConflitOrganisationError);
  });

  it("respecte l’établissement de l’élève et de l’année scolaire", async () => {
    await expect(
      creerInscription({ eleve: "eleve-autre-etablissement" }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
    await expect(
      creerInscription({ annee: "annee-autre-etablissement" }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
    await expect(
      creerInscription({ etat: "BROUILLON" }),
    ).resolves.toMatchObject({
      id_etablissement: "etablissement-1",
    });
  });

  it("valide les états permis et permet leur mise à jour sans imposer de transitions", async () => {
    await creerInscription({ etat: "BROUILLON" });
    expect(
      await services.inscriptions.changerEtat("inscription-1", "CONFIRMEE"),
    ).toMatchObject({
      etat_inscription: "CONFIRMEE",
    });
    expect(
      await services.inscriptions.changerEtat("inscription-1", "ANNULEE"),
    ).toMatchObject({
      etat_inscription: "ANNULEE",
    });
  });

  it("crée une première affectation et expose l’affectation courante et l’historique", async () => {
    await creerInscription();
    expect(
      await services.affectationsClasses.obtenirCourante(
        "inscription-1",
        "etablissement-1",
      ),
    ).toBeNull();

    const affectation = await services.affectationsClasses.creerPremiere({
      id_affectation_classe: "affectation-1",
      id_inscription: "inscription-1",
      id_classe_annuelle: "classe-1",
      id_etablissement: "etablissement-1",
      date_debut: "2026-09-01",
    });

    expect(affectation.date_fin).toBeNull();
    expect(
      await services.affectationsClasses.obtenirCourante(
        "inscription-1",
        "etablissement-1",
      ),
    ).toEqual(affectation);
    expect(
      await services.affectationsClasses.listerHistorique(
        "inscription-1",
        "etablissement-1",
      ),
    ).toEqual([affectation]);
  });

  it("change de classe dans une transaction et conserve l’affectation précédente", async () => {
    await creerInscription();
    await services.affectationsClasses.creerPremiere({
      id_affectation_classe: "affectation-ancienne",
      id_inscription: "inscription-1",
      id_classe_annuelle: "classe-1",
      id_etablissement: "etablissement-1",
      date_debut: "2026-09-01",
    });

    const nouvelle = await services.affectationsClasses.changerClasse(
      "inscription-1",
      "etablissement-1",
      {
        id_affectation_classe: "affectation-nouvelle",
        id_classe_annuelle: "classe-2",
        date_debut: "2027-01-15",
      },
    );
    const historique = await services.affectationsClasses.listerHistorique(
      "inscription-1",
      "etablissement-1",
    );

    expect(nouvelle.date_fin).toBeNull();
    expect(historique).toHaveLength(2);
    expect(historique[0]).toMatchObject({
      id_affectation_classe: "affectation-ancienne",
      date_fin: "2027-01-15",
    });
    expect(historique[1]).toEqual(nouvelle);
  });

  it("annule la clôture si la nouvelle affectation échoue sur la capacité", async () => {
    await creerInscription();
    await services.affectationsClasses.creerPremiere({
      id_affectation_classe: "affectation-ancienne",
      id_inscription: "inscription-1",
      id_classe_annuelle: "classe-1",
      id_etablissement: "etablissement-1",
      date_debut: "2026-09-01",
    });

    await expect(
      services.affectationsClasses.changerClasse(
        "inscription-1",
        "etablissement-1",
        {
          id_affectation_classe: "affectation-refusee",
          id_classe_annuelle: "classe-sans-place",
          date_debut: "2027-01-15",
        },
      ),
    ).rejects.toBeInstanceOf(CapaciteClasseAtteinteError);

    expect(
      await services.affectationsClasses.obtenirCourante(
        "inscription-1",
        "etablissement-1",
      ),
    ).toMatchObject({
      id_affectation_classe: "affectation-ancienne",
      date_fin: null,
    });
    expect(
      await services.affectationsClasses.listerHistorique(
        "inscription-1",
        "etablissement-1",
      ),
    ).toHaveLength(1);
  });

  it("respecte la capacité lors d’une première affectation", async () => {
    await creerInscription({ id: "inscription-capacite-1", eleve: "eleve-1" });
    await creerInscription({ id: "inscription-capacite-2", eleve: "eleve-2" });
    await services.affectationsClasses.creerPremiere({
      id_affectation_classe: "affectation-capacite-1",
      id_inscription: "inscription-capacite-1",
      id_classe_annuelle: "classe-2",
      id_etablissement: "etablissement-1",
      date_debut: "2026-09-01",
    });

    await expect(
      services.affectationsClasses.creerPremiere({
        id_affectation_classe: "affectation-capacite-2",
        id_inscription: "inscription-capacite-2",
        id_classe_annuelle: "classe-2",
        id_etablissement: "etablissement-1",
        date_debut: "2026-09-01",
      }),
    ).rejects.toBeInstanceOf(CapaciteClasseAtteinteError);
  });

  it("refuse une classe d’une autre année ou d’un autre établissement", async () => {
    await creerInscription();

    await expect(
      services.affectationsClasses.creerPremiere({
        id_affectation_classe: "affectation-mauvaise-annee",
        id_inscription: "inscription-1",
        id_classe_annuelle: "classe-autre-annee",
        id_etablissement: "etablissement-1",
        date_debut: "2026-09-01",
      }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
    await expect(
      services.affectationsClasses.creerPremiere({
        id_affectation_classe: "affectation-mauvais-etablissement",
        id_inscription: "inscription-1",
        id_classe_annuelle: "classe-autre-etablissement",
        id_etablissement: "etablissement-1",
        date_debut: "2026-09-01",
      }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
  });

  it("refuse une première affectation si l’inscription possède déjà un historique", async () => {
    await creerInscription();
    await services.affectationsClasses.creerPremiere({
      id_affectation_classe: "affectation-1",
      id_inscription: "inscription-1",
      id_classe_annuelle: "classe-1",
      id_etablissement: "etablissement-1",
      date_debut: "2026-09-01",
    });
    await services.affectationsClasses.changerClasse(
      "inscription-1",
      "etablissement-1",
      {
        id_affectation_classe: "affectation-2",
        id_classe_annuelle: "classe-2",
        date_debut: "2027-01-15",
      },
    );

    await expect(
      services.affectationsClasses.creerPremiere({
        id_affectation_classe: "affectation-3",
        id_inscription: "inscription-1",
        id_classe_annuelle: "classe-1",
        id_etablissement: "etablissement-1",
        date_debut: "2027-02-01",
      }),
    ).rejects.toBeInstanceOf(ConflitOrganisationError);
  });
});
