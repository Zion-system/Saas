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
  ConflitOrganisationError,
  DateCivileInvalideError,
  EntiteIntrouvableError,
  MatriculeInitialDejaAttribueError,
  MotifCorrectionObligatoireError,
  NatureLienInactiveError,
  ResponsabiliteInvalideError,
  ReferenceOrganisationError,
  PeriodeRelationInvalideError,
  creerServicesElevesResponsables,
} from ".";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;
let executor: SQLiteExecutor;
let services: ReturnType<typeof creerServicesElevesResponsables>;

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

function insererEtablissements(): void {
  database.exec(`
    INSERT INTO etablissement (id_etablissement)
    VALUES ('etablissement-1'), ('etablissement-2');
  `);
}

function creerEleve(id = "eleve-1", etablissement = "etablissement-1") {
  return services.eleves.creer({
    id_eleve: id,
    id_etablissement: etablissement,
  });
}

function creerResponsable(
  id = "responsable-1",
  etablissement = "etablissement-1",
) {
  return services.responsables.creer({
    id_responsable: id,
    id_etablissement: etablissement,
  });
}

function nouvelleRelation({
  id = "relation-1",
  eleve = "eleve-1",
  responsable = "responsable-1",
  etablissement = "etablissement-1",
  nature = "01100000-0000-4000-8000-000000000001",
  debut = "2026-01-01",
  legal = 0,
  financier = 0,
}: {
  id?: string;
  eleve?: string;
  responsable?: string;
  etablissement?: string;
  nature?: string;
  debut?: string;
  legal?: number;
  financier?: number;
} = {}) {
  return {
    id_relation_eleve_responsable: id,
    id_eleve: eleve,
    id_responsable: responsable,
    id_etablissement: etablissement,
    id_nature_lien: nature,
    est_representant_legal: legal,
    est_responsable_financier: financier,
    date_debut_validite: debut,
    id_auteur_creation: null,
  };
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

  insererEtablissements();
  executor = {
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
  services = creerServicesElevesResponsables(executor);
});

afterEach(() => {
  database.close();
});

describe("services élèves et responsables", () => {
  it("crée et consulte des élèves sans imposer de matricule", async () => {
    const eleve = await creerEleve();
    await creerEleve("eleve-2", "etablissement-1");
    await creerEleve("eleve-3", "etablissement-2");

    expect(eleve).toEqual({
      id_eleve: "eleve-1",
      id_etablissement: "etablissement-1",
      matricule: null,
    });
    expect(await services.eleves.obtenir("eleve-1")).toEqual(eleve);
    expect(await services.eleves.obtenirMatriculeCourant("eleve-1")).toBeNull();
    expect(await services.eleves.listerParEtablissement("etablissement-1")).toHaveLength(2);
    await expect(services.eleves.obtenir("absent")).rejects.toBeInstanceOf(
      EntiteIntrouvableError,
    );
    await expect(creerEleve("eleve-invalide", "absent")).rejects.toBeInstanceOf(
      ReferenceOrganisationError,
    );
  });

  it("crée, consulte et isole les responsables par établissement", async () => {
    const responsable = await creerResponsable();
    await creerResponsable("responsable-2", "etablissement-1");
    await creerResponsable("responsable-3", "etablissement-2");

    expect(await services.responsables.obtenir("responsable-1")).toEqual(responsable);
    expect(
      await services.responsables.listerParEtablissement("etablissement-1"),
    ).toHaveLength(2);
    expect(
      await services.responsables.listerParEtablissement("etablissement-2"),
    ).toHaveLength(1);
    await expect(
      creerResponsable("responsable-invalide", "absent"),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
  });

  it("ne propose et ne retourne que les natures de lien actives", async () => {
    expect(await services.naturesLiens.listerActives()).toHaveLength(4);
    await services.naturesLiens.obtenirActive(
      "01100000-0000-4000-8000-000000000001",
    );
    database.exec(
      "UPDATE nature_lien_responsable SET est_actif = 0 WHERE code = 'MERE';",
    );
    expect(await services.naturesLiens.listerActives()).toHaveLength(3);
    await expect(
      services.naturesLiens.obtenirActive(
        "01100000-0000-4000-8000-000000000002",
      ),
    ).rejects.toBeInstanceOf(NatureLienInactiveError);
  });

  it("crée plusieurs relations et garde indépendantes les responsabilités", async () => {
    await creerEleve();
    await creerEleve("eleve-2");
    await creerResponsable();
    await creerResponsable("responsable-2");

    const lienLegal = await services.relations.creer(
      nouvelleRelation({ legal: 1 }),
    );
    await services.relations.creer(
      nouvelleRelation({
        id: "relation-financiere",
        responsable: "responsable-2",
        nature: "01100000-0000-4000-8000-000000000003",
        financier: 1,
      }),
    );
    await services.relations.creer(
      nouvelleRelation({
        id: "relation-eleve-2",
        eleve: "eleve-2",
        legal: 1,
        financier: 1,
      }),
    );

    expect(await services.relations.obtenir("relation-1")).toEqual(lienLegal);
    expect(await services.relations.listerParEleve("eleve-1")).toHaveLength(2);
    expect(
      await services.relations.listerActivesA("eleve-1", "2026-02-01"),
    ).toHaveLength(2);
    expect(
      await services.relations.listerActivesA("eleve-1", "2026-03-01"),
    ).toHaveLength(2);
    expect(
      await services.relations.listerActivesA("eleve-1", "2025-12-31"),
    ).toHaveLength(0);
  });

  it("rejette les références croisées, les natures inactives et les responsabilités invalides", async () => {
    await creerEleve();
    await creerResponsable("responsable-2", "etablissement-2");
    await expect(
      services.relations.creer(
        nouvelleRelation({ responsable: "responsable-2" }),
      ),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
    await expect(
      services.relations.creer(
        nouvelleRelation({ legal: 2 }),
      ),
    ).rejects.toBeInstanceOf(ResponsabiliteInvalideError);

    database.exec(
      "UPDATE nature_lien_responsable SET est_actif = 0 WHERE code = 'PERE';",
    );
    await expect(
      services.relations.creer(nouvelleRelation()),
    ).rejects.toBeInstanceOf(NatureLienInactiveError);
  });

  it("clôture et remplace une relation dans une transaction atomique", async () => {
    await creerEleve();
    await creerResponsable();
    await services.relations.creer(nouvelleRelation({ debut: "2026-01-01" }));

    const remplaçante = await services.relations.remplacer(
      "relation-1",
      "2026-04-01",
      nouvelleRelation({
        id: "relation-2",
        nature: "01100000-0000-4000-8000-000000000002",
        debut: "2026-04-01",
        financier: 1,
      }),
    );

    expect(remplaçante.date_debut_validite).toBe("2026-04-01");
    expect(
      await services.relations.listerActivesA("eleve-1", "2026-03-31"),
    ).toHaveLength(1);
    expect(
      await services.relations.listerActivesA("eleve-1", "2026-04-01"),
    ).toEqual([remplaçante]);
    expect(await services.relations.listerParEleve("eleve-1")).toHaveLength(2);

    const clôturée = await services.relations.cloturer(
      "relation-2",
      "2026-06-01",
    );
    expect(clôturée.date_fin_validite).toBe("2026-06-01");
    expect(
      await services.relations.listerActivesA("eleve-1", "2026-06-01"),
    ).toHaveLength(0);
    await expect(
      services.relations.cloturer("relation-2", "2026-07-01"),
    ).rejects.toBeInstanceOf(ConflitOrganisationError);

    await expect(
      services.relations.cloturer("relation-2", "2026-04-01"),
    ).rejects.toBeInstanceOf(PeriodeRelationInvalideError);
  });

  it("annule la clôture si l’insertion de la remplaçante échoue", async () => {
    await creerEleve();
    await creerResponsable();
    await services.relations.creer(nouvelleRelation());

    database.exec(`
      CREATE TRIGGER test_fail_relation_replacement
      BEFORE INSERT ON relation_eleve_responsable
      WHEN NEW.id_relation_eleve_responsable = 'relation-invalide'
      BEGIN
        SELECT RAISE(ABORT, 'Échec de remplacement simulé.');
      END;
    `);
    await expect(
      services.relations.remplacer(
        "relation-1",
        "2026-04-01",
        nouvelleRelation({
          id: "relation-invalide",
          debut: "2026-04-01",
        }),
      ),
    ).rejects.toThrow();
    database.exec("DROP TRIGGER test_fail_relation_replacement;");

    const ancienne = await services.relations.obtenir("relation-1");
    expect(ancienne.date_fin_validite).toBeNull();
    expect(await services.relations.listerParEleve("eleve-1")).toHaveLength(1);
  });

  it("attribue puis corrige un matricule sans réutiliser l’ancienne valeur", async () => {
    await creerEleve();
    await creerEleve("eleve-2");

    const initial = await services.matricules.attribuerInitial({
      id_historique_matricule: "matricule-h-1",
      id_eleve: "eleve-1",
      id_etablissement: "etablissement-1",
      matricule: "MAT-001",
      date_debut_validite: "2026-01-01",
    });
    expect(initial.id_historique_precedent).toBeNull();
    expect(await services.eleves.obtenirMatriculeCourant("eleve-1")).toBe("MAT-001");

    const correction = await services.matricules.corriger({
      id_historique_matricule: "matricule-h-2",
      id_eleve: "eleve-1",
      id_etablissement: "etablissement-1",
      matricule: "MAT-002",
      date_debut_validite: "2026-02-01",
      motif_correction: "Erreur de saisie",
    });
    expect(correction.id_historique_precedent).toBe("matricule-h-1");
    expect(await services.eleves.obtenirMatriculeCourant("eleve-1")).toBe("MAT-002");
    expect(await services.matricules.listerHistorique("eleve-1", "etablissement-1")).toHaveLength(2);

    await expect(
      services.matricules.attribuerInitial({
        id_historique_matricule: "matricule-h-3",
        id_eleve: "eleve-1",
        id_etablissement: "etablissement-1",
        matricule: "MAT-003",
        date_debut_validite: "2026-03-01",
      }),
    ).rejects.toBeInstanceOf(MatriculeInitialDejaAttribueError);
    await expect(
      services.matricules.corriger({
        id_historique_matricule: "matricule-h-4",
        id_eleve: "eleve-1",
        id_etablissement: "etablissement-1",
        matricule: "MAT-003",
        date_debut_validite: "2026-03-01",
        motif_correction: "   ",
      }),
    ).rejects.toBeInstanceOf(MotifCorrectionObligatoireError);
    await expect(
      services.matricules.attribuerInitial({
        id_historique_matricule: "matricule-h-5",
        id_eleve: "eleve-2",
        id_etablissement: "etablissement-1",
        matricule: "MAT-001",
        date_debut_validite: "2026-03-01",
      }),
    ).rejects.toBeInstanceOf(ConflitOrganisationError);
  });

  it("traduit les clés étrangères et valide les dates avant envoi SQL", async () => {
    await expect(
      services.matricules.attribuerInitial({
        id_historique_matricule: "matricule-invalide",
        id_eleve: "absent",
        id_etablissement: "etablissement-1",
        matricule: "MAT-X",
        date_debut_validite: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);
    await expect(
      services.relations.listerActivesA("eleve-absent", "2026-02-30"),
    ).rejects.toBeInstanceOf(DateCivileInvalideError);
  });
});
