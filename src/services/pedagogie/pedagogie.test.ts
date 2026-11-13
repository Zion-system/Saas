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
  EntiteIntrouvableError,
  MatiereCodeDoublonError,
  MatiereDoublonError,
  MatiereInvalideError,
  ProfesseurInvalideError,
  ReferenceOrganisationError,
  creerServicesPedagogiques,
} from ".";

/**
 * Tests du référentiel pédagogique (migration 021) sur un vrai SQLite en
 * mémoire avec toutes les migrations : mêmes garanties que l'application.
 */

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;
let executor: SQLiteExecutor;
let services: ReturnType<typeof creerServicesPedagogiques>;

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
  `);

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
  services = creerServicesPedagogiques(executor);
});

afterEach(() => {
  database.close();
});

describe("référentiel des matières", () => {
  it("crée, consulte et liste les matières en ordre alphabétique", async () => {
    const math = await services.matieres.creer({
      libelle: "Mathématiques",
      code: "MATH",
      categorie: "Sciences",
    });

    expect(math.libelle).toBe("Mathématiques");
    expect(math.code).toBe("MATH");
    expect(math.categorie).toBe("Sciences");
    expect(math.est_actif).toBe(1);

    const francais = await services.matieres.creer({ libelle: "Français" });
    expect(francais.code).toBeNull();

    const liste = await services.matieres.lister();
    expect(liste.map((matiere) => matiere.libelle)).toEqual([
      "Français",
      "Mathématiques",
    ]);

    await expect(
      services.matieres.obtenir(math.id_matiere),
    ).resolves.toMatchObject({ libelle: "Mathématiques" });
    await expect(services.matieres.obtenir("absent")).rejects.toBeInstanceOf(
      EntiteIntrouvableError,
    );
  });

  it("refuse une matière sans nom et refuse deux matières du même nom (majuscules comprises)", async () => {
    await expect(
      services.matieres.creer({ libelle: "   " }),
    ).rejects.toBeInstanceOf(MatiereInvalideError);

    await services.matieres.creer({ libelle: "Histoire" });

    await expect(
      services.matieres.creer({ libelle: "Histoire" }),
    ).rejects.toBeInstanceOf(MatiereDoublonError);
    // La colonne porte COLLATE NOCASE : « histoire » est un doublon aussi.
    await expect(
      services.matieres.creer({ libelle: "histoire" }),
    ).rejects.toBeInstanceOf(MatiereDoublonError);
  });

  it("refuse un code déjà pris par une autre matière, accepte plusieurs sans code", async () => {
    await services.matieres.creer({ libelle: "Mathématiques", code: "MATH" });
    await services.matieres.creer({ libelle: "Français", code: null });

    await expect(
      services.matieres.creer({ libelle: "Algèbre", code: "MATH" }),
    ).rejects.toBeInstanceOf(MatiereCodeDoublonError);

    await services.matieres.creer({ libelle: "Éducation physique" });
    await expect(await services.matieres.lister()).toHaveLength(3);
  });

  it("modifie une matière en re-refusant les doublons et garde l'identifiant stable", async () => {
    const math = await services.matieres.creer({
      libelle: "Mathématiques",
      code: "MATH",
      categorie: null,
    });
    await services.matieres.creer({ libelle: "Français", code: "FRAN" });

    const modifiee = await services.matieres.modifier({
      id_matiere: math.id_matiere,
      libelle: "Mathématiques",
      code: "MAT",
      categorie: "Sciences exactes",
    });
    expect(modifiee).toMatchObject({
      id_matiere: math.id_matiere,
      code: "MAT",
      categorie: "Sciences exactes",
    });

    await expect(
      services.matieres.modifier({
        id_matiere: math.id_matiere,
        libelle: "Français",
        code: null,
        categorie: null,
      }),
    ).rejects.toBeInstanceOf(MatiereDoublonError);
    await expect(
      services.matieres.modifier({
        id_matiere: math.id_matiere,
        libelle: "Mathématiques",
        code: "FRAN",
        categorie: null,
      }),
    ).rejects.toBeInstanceOf(MatiereCodeDoublonError);
    await expect(
      services.matieres.modifier({
        id_matiere: "absent",
        libelle: "Phantom",
        code: null,
        categorie: null,
      }),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);
  });

  it("désactive puis réactive une matière sans jamais la supprimer", async () => {
    const sport = await services.matieres.creer({
      libelle: "Éducation physique",
    });

    const retiree = await services.matieres.desactiver(sport.id_matiere);
    expect(retiree.est_actif).toBe(0);

    // La liste complète la conserve, la liste active l'oublie.
    expect((await services.matieres.lister())).toHaveLength(1);
    expect(await services.matieres.listerActives()).toHaveLength(0);

    const remise = await services.matieres.reactiver(sport.id_matiere);
    expect(remise.est_actif).toBe(1);
    expect(await services.matieres.listerActives()).toHaveLength(1);

    await expect(
      services.matieres.desactiver("absent"),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);
    await expect(
      services.matieres.reactiver(sport.id_matiere),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);
  });

  it("garde l'identifiant d'une matière immuable (déclencheur)", async () => {
    const matiere = await services.matieres.creer({ libelle: "Géographie" });

    expect(() =>
      executerControle(
        `UPDATE matiere SET id_matiere = 'autre' WHERE id_matiere = '${matiere.id_matiere}';`,
      ),
    ).toThrow(/stable/);
    await expect(
      services.matieres.obtenir(matiere.id_matiere),
    ).resolves.toMatchObject({ libelle: "Géographie" });
  });
});

describe("référentiel des professeurs", () => {
  it("crée, consulte et liste les professeurs d'un établissement", async () => {
    const professeur = await services.professeurs.creer({
      id_etablissement: "etablissement-1",
      nom: "Mabiala",
      prenoms: "Jean",
      telephone: "+242 06 123 45 67",
      email: "j.mabiala@ecole.cg",
      specialite: "Mathématiques",
    });

    expect(professeur.est_actif).toBe(1);
    expect(professeur.telephone).toBe("+242 06 123 45 67");

    await services.professeurs.creer({
      id_etablissement: "etablissement-1",
      nom: "Nguembu",
      prenoms: null,
    });
    await services.professeurs.creer({
      id_etablissement: "etablissement-2",
      nom: "Ibinga",
      prenoms: "Marie",
    });

    const liste = await services.professeurs.listerParEtablissement(
      "etablissement-1",
    );
    expect(liste.map((p) => p.nom)).toEqual(["Mabiala", "Nguembu"]);
    expect(
      await services.professeurs.listerActifsParEtablissement(
        "etablissement-1",
      ),
    ).toHaveLength(2);

    await expect(
      services.professeurs.obtenir(professeur.id_enseignant),
    ).resolves.toMatchObject({ nom: "Mabiala" });
  });

  it("exige un nom et un établissement existant", async () => {
    await expect(
      services.professeurs.creer({
        id_etablissement: "etablissement-1",
        nom: "   ",
      }),
    ).rejects.toBeInstanceOf(ProfesseurInvalideError);
    await expect(
      services.professeurs.creer({
        id_etablissement: "   ",
        nom: "Sans école",
      }),
    ).rejects.toBeInstanceOf(ProfesseurInvalideError);
    await expect(
      services.professeurs.creer({
        id_etablissement: "absent",
        nom: "École inconnue",
      }),
    ).rejects.toBeInstanceOf(ReferenceOrganisationError);
  });

  it("modifie une fiche et refuse l'inconnu au grand jour", async () => {
    const professeur = await services.professeurs.creer({
      id_etablissement: "etablissement-1",
      nom: "Mabiala",
      prenoms: "Jean",
    });

    const modifie = await services.professeurs.modifier({
      id_enseignant: professeur.id_enseignant,
      id_etablissement: "etablissement-1",
      nom: "Mabiala",
      prenoms: "Jean-Paul",
      telephone: null,
      email: "jp.mabiala@ecole.cg",
      specialite: "Français",
    });
    expect(modifie).toMatchObject({
      prenoms: "Jean-Paul",
      email: "jp.mabiala@ecole.cg",
      specialite: "Français",
    });

    await expect(
      services.professeurs.modifier({
        id_enseignant: "absent",
        id_etablissement: "etablissement-1",
        nom: "Phantom",
      }),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);
    await expect(
      services.professeurs.modifier({
        id_enseignant: professeur.id_enseignant,
        id_etablissement: "etablissement-2",
        nom: "Autre école",
      }),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);
  });

  it("archive et réactive sans jamais supprimer physiquement (déclencheur)", async () => {
    const professeur = await services.professeurs.creer({
      id_etablissement: "etablissement-1",
      nom: "Mabiala",
      prenoms: "Jean",
      specialite: "Mathématiques",
    });

    const archive = await services.professeurs.archiver(
      professeur.id_enseignant,
      "etablissement-1",
    );
    expect(archive.est_actif).toBe(0);
    expect(
      await services.professeurs.listerActifsParEtablissement(
        "etablissement-1",
      ),
    ).toHaveLength(0);
    expect(
      await services.professeurs.listerParEtablissement("etablissement-1"),
    ).toHaveLength(1);

    const remis = await services.professeurs.reactiver(
      professeur.id_enseignant,
      "etablissement-1",
    );
    expect(remis.est_actif).toBe(1);

    await expect(
      services.professeurs.archiver("absent", "etablissement-1"),
    ).rejects.toBeInstanceOf(EntiteIntrouvableError);

    // La règle d'or tient aussi au niveau de la base : un DELETE physique
    // est refusé par le déclencheur, quel que soit le canal utilisé.
    expect(() =>
      executerControle(
        `DELETE FROM enseignant WHERE id_enseignant = '${professeur.id_enseignant}';`,
      ),
    ).toThrow(/supprimé/i);
  });

  it("garde l'identité et l'établissement d'un professeur immuables", async () => {
    const professeur = await services.professeurs.creer({
      id_etablissement: "etablissement-1",
      nom: "Mabiala",
    });

    expect(() =>
      executerControle(
        `UPDATE enseignant SET id_enseignant = 'autre' WHERE id_enseignant = '${professeur.id_enseignant}';`,
      ),
    ).toThrow(/stables/);
    expect(() =>
      executerControle(
        `UPDATE enseignant SET id_etablissement = 'etablissement-2' WHERE id_enseignant = '${professeur.id_enseignant}';`,
      ),
    ).toThrow(/stables/);
    await expect(
      services.professeurs.obtenir(professeur.id_enseignant),
    ).resolves.toMatchObject({ nom: "Mabiala", id_etablissement: "etablissement-1" });
  });
});
