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
import { creerServiceDossiersEleves } from "./dossiers.service";
import { DossierEleveInvalideError } from "./dossiers.service";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;
let executor: SQLiteExecutor;
let dossiers: ReturnType<typeof creerServiceDossiersEleves>;

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

function lireUneLigne(sql: string, bind: SqlValue[] = []): SQLiteRow | null {
  return executerInstruction({ sql, bind })[0] ?? null;
}

function monterFixtures(): void {
  executerControle(`
    INSERT INTO etablissement (id_etablissement)
    VALUES ('etablissement-1');
    INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
    VALUES ('2026-2027', 'etablissement-1');
    INSERT INTO niveau_enseignement (id_niveau) VALUES ('cp1');
    INSERT INTO modele_classe (id_modele_classe) VALUES ('cp1');
    INSERT INTO classe_annuelle (
      id_classe_annuelle, id_annee_scolaire, id_niveau,
      id_modele_classe, id_etablissement
    )
    VALUES ('cp1', '2026-2027', 'cp1', 'cp1', 'etablissement-1');
    INSERT INTO niveau_enseignement (id_niveau) VALUES ('cp2');
    INSERT INTO modele_classe (id_modele_classe) VALUES ('cp2');
    INSERT INTO classe_annuelle (
      id_classe_annuelle, id_annee_scolaire, id_niveau,
      id_modele_classe, id_etablissement
    )
    VALUES ('cp2', '2026-2027', 'cp2', 'cp2', 'etablissement-1');
  `);
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

  monterFixtures();
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
  dossiers = creerServiceDossiersEleves(executor);
});

afterEach(() => {
  database.close();
});

function dossierComplet() {
  return dossiers.creer({
    id_etablissement: "etablissement-1",
    id_annee_scolaire: "2026-2027",
    prenom: "  Ana  ",
    nom: "  MBOUMBA ",
    genre: "F",
    id_classe_annuelle: "cp1",
    parent: { nom_complet: "Mme LOUANGO", telephone: "+242 06 12 34 56" },
  });
}

describe("service des dossiers élèves (étape 4 du parcours)", () => {
  it("crée un dossier complet : élève, inscription confirmée, classe, parent", async () => {
    const dossier = await dossierComplet();

    expect(dossier.prenom).toBe("Ana");
    expect(dossier.nom).toBe("MBOUMBA");
    expect(dossier.genre).toBe("F");
    expect(dossier.etat_inscription).toBe("CONFIRMEE");
    expect(dossier.id_classe_annuelle).toBe("cp1");

    const eleve = lireUneLigne(
      "SELECT prenom, nom, genre, matricule FROM eleve WHERE id_eleve = ?;",
      [dossier.id_eleve],
    );
    expect(eleve).toMatchObject({
      prenom: "Ana",
      nom: "MBOUMBA",
      genre: "F",
      matricule: null,
    });

    const inscription = lireUneLigne(
      `SELECT etat_inscription FROM inscription
       WHERE id_eleve = ? AND id_etablissement = 'etablissement-1';`,
      [dossier.id_eleve],
    );
    expect(inscription?.etat_inscription).toBe("CONFIRMEE");

    const affectation = lireUneLigne(
      `SELECT a.date_debut, a.date_fin
       FROM affectation_classe a
       JOIN inscription i ON i.id_inscription = a.id_inscription
       WHERE i.id_eleve = ?;`,
      [dossier.id_eleve],
    );
    expect(affectation?.date_fin).toBeNull();
    expect(affectation?.date_debut).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const responsable = lireUneLigne(
      `SELECT r.nom_complet, r.telephone, rel.id_nature_lien,
              rel.est_representant_legal, rel.est_responsable_financier
       FROM relation_eleve_responsable rel
       JOIN responsable r ON r.id_responsable = rel.id_responsable
       WHERE rel.id_eleve = ?;`,
      [dossier.id_eleve],
    );
    expect(responsable).toMatchObject({
      nom_complet: "Mme LOUANGO",
      telephone: "+242 06 12 34 56",
      id_nature_lien: "01100000-0000-4000-8000-000000000003",
      est_representant_legal: 1,
      est_responsable_financier: 1,
    });
  });

  it("crée un élève sans classe et sans parent", async () => {
    const dossier = await dossiers.creer({
      id_etablissement: "etablissement-1",
      id_annee_scolaire: "2026-2027",
      prenom: "Junior",
      nom: "BALOU",
      genre: null,
    });

    expect(dossier.id_classe_annuelle).toBeNull();

    expect(
      lireUneLigne(
        "SELECT COUNT(*) AS n FROM inscription WHERE id_eleve = ?;",
        [dossier.id_eleve],
      )?.n,
    ).toBe(1);
    expect(
      lireUneLigne(
        "SELECT COUNT(*) AS n FROM affectation_classe;",
      )?.n,
    ).toBe(0);
    expect(
      lireUneLigne("SELECT COUNT(*) AS n FROM responsable;")?.n,
    ).toBe(0);
  });

  it("refuse un dossier incomplet sans rien écrire", async () => {
    await expect(
      dossiers.creer({
        id_etablissement: "etablissement-1",
        id_annee_scolaire: "2026-2027",
        prenom: "   ",
        nom: "MBOUMBA",
        genre: null,
      }),
    ).rejects.toBeInstanceOf(DossierEleveInvalideError);

    await expect(
      dossiers.creer({
        id_etablissement: "etablissement-1",
        id_annee_scolaire: "2026-2027",
        prenom: "Ana",
        nom: "",
        genre: null,
      }),
    ).rejects.toBeInstanceOf(DossierEleveInvalideError);

    await expect(
      dossiers.creer({
        id_etablissement: "etablissement-1",
        id_annee_scolaire: "2026-2027",
        prenom: "Ana",
        nom: "MBOUMBA",
        genre: "X" as never,
      }),
    ).rejects.toBeInstanceOf(DossierEleveInvalideError);

    await expect(
      dossiers.creer({
        id_etablissement: "etablissement-1",
        id_annee_scolaire: "",
        prenom: "Ana",
        nom: "MBOUMBA",
        genre: null,
      }),
    ).rejects.toBeInstanceOf(DossierEleveInvalideError);

    expect(
      lireUneLigne("SELECT COUNT(*) AS n FROM eleve;")?.n,
    ).toBe(0);
  });

  it("annule l'inscription sans jamais supprimer le dossier", async () => {
    const dossier = await dossierComplet();

    await dossiers.annuler(dossier.id_eleve, "etablissement-1");

    expect(
      lireUneLigne(
        "SELECT etat_inscription FROM inscription WHERE id_eleve = ?;",
        [dossier.id_eleve],
      )?.etat_inscription,
    ).toBe("ANNULEE");

    // Affectation créée le jour même : la base interdit une durée nulle,
    // elle reste ouverte ; l'état « ANNULEE » fait foi pour les effectifs.
    const memeJour = lireUneLigne(
      `SELECT a.date_fin FROM affectation_classe a
       JOIN inscription i ON i.id_inscription = a.id_inscription
       WHERE i.id_eleve = ?;`,
      [dossier.id_eleve],
    );
    expect(memeJour?.date_fin).toBeNull();

    expect(lireUneLigne("SELECT COUNT(*) AS n FROM eleve;")?.n).toBe(1);
  });

  it("clôt l'affectation commencée avant le jour de la clôture", async () => {
    // Élève sans classe, puis affectation historique insérée à la main
    // (début antérieur à aujourd'hui) pour représenter un élève arrivé
    // plus tôt dans l'année.
    const dossier = await dossiers.creer({
      id_etablissement: "etablissement-1",
      id_annee_scolaire: "2026-2027",
      prenom: "Ana",
      nom: "MBOUMBA",
      genre: "F",
    });

    executerControle(
      `INSERT INTO affectation_classe (
         id_affectation_classe, id_inscription, id_classe_annuelle,
         id_etablissement, date_debut, date_fin
       )
       SELECT '${"0".repeat(8)}a000-4000-8000-00000000c1a5', i.id_inscription,
              'cp1', i.id_etablissement, '2026-01-05', NULL
       FROM inscription i
       WHERE i.id_eleve = '${dossier.id_eleve}';`,
    );

    await dossiers.annuler(dossier.id_eleve, "etablissement-1");

    const cloturee = lireUneLigne(
      `SELECT a.date_fin FROM affectation_classe a
       WHERE a.id_inscription IN (
         SELECT id_inscription FROM inscription WHERE id_eleve = ?
       );`,
      [dossier.id_eleve],
    );
    expect(cloturee?.date_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("liste les dossiers visibles et cache ceux retirés", async () => {
    const premier = await dossierComplet();
    const deuxieme = await dossiers.creer({
      id_etablissement: "etablissement-1",
      id_annee_scolaire: "2026-2027",
      prenom: "Junior",
      nom: "BALOU",
      genre: "M",
      id_classe_annuelle: "cp1",
    });

    const visibles = await dossiers.listerParEtablissement("etablissement-1");
    expect(visibles).toHaveLength(2);
    expect(visibles[0].nom).toBe("BALOU");
    expect(visibles[1].nom).toBe("MBOUMBA");
    expect(visibles[0].id_classe_annuelle).toBe("cp1");

    await dossiers.annuler(premier.id_eleve, "etablissement-1");

    const restants = await dossiers.listerParEtablissement("etablissement-1");
    expect(restants).toHaveLength(1);
    expect(restants[0].id_eleve).toBe(deuxieme.id_eleve);
  });
});

describe("modification d'un dossier (page Élèves)", () => {
  it("corrige l'identité et les coordonnées du parent déclaré", async () => {
    const dossier = await dossierComplet();

    const modifie = await dossiers.modifier({
      id_eleve: dossier.id_eleve,
      id_etablissement: "etablissement-1",
      prenom: "  Ana-Marie  ",
      nom: "  MBOUMBA-LOUANGO ",
      genre: "F",
      id_classe_annuelle: "cp1",
      parent: {
        nom_complet: " Mme LOUANGO-RANGIRA ",
        telephone: " 06 99 88 77 66 ",
      },
    });

    expect(modifie.prenom).toBe("Ana-Marie");
    expect(modifie.nom).toBe("MBOUMBA-LOUANGO");
    expect(modifie.id_classe_annuelle).toBe("cp1");
    expect(modifie.parent).toMatchObject({
      nom_complet: "Mme LOUANGO-RANGIRA",
      telephone: "06 99 88 77 66",
    });

    expect(
      lireUneLigne("SELECT prenom, nom FROM eleve WHERE id_eleve = ?;", [
        dossier.id_eleve,
      ]),
    ).toMatchObject({ prenom: "Ana-Marie", nom: "MBOUMBA-LOUANGO" });
  });

  it("change la classe d'un élève arrivé avant aujourd'hui : clôture puis nouvelle affectation", async () => {
    const dossier = await dossiers.creer({
      id_etablissement: "etablissement-1",
      id_annee_scolaire: "2026-2027",
      prenom: "Ana",
      nom: "MBOUMBA",
      genre: "F",
    });

    // Affectation historique insérée à la main (début antérieur à
    // aujourd'hui) pour représenter un élève arrivé plus tôt dans l'année.
    executerControle(
      `INSERT INTO affectation_classe (
         id_affectation_classe, id_inscription, id_classe_annuelle,
         id_etablissement, date_debut, date_fin
       )
       SELECT '00000000a000-4000-8000-00000000e001', i.id_inscription,
              'cp1', i.id_etablissement, '2026-01-05', NULL
       FROM inscription i
       WHERE i.id_eleve = '${dossier.id_eleve}';`,
    );

    const modifie = await dossiers.modifier({
      id_eleve: dossier.id_eleve,
      id_etablissement: "etablissement-1",
      prenom: "Ana",
      nom: "MBOUMBA",
      genre: "F",
      id_classe_annuelle: "cp2",
    });

    expect(modifie.id_classe_annuelle).toBe("cp2");

    const ancienne = lireUneLigne(
      "SELECT date_fin FROM affectation_classe WHERE id_classe_annuelle = 'cp1';",
    );
    expect(ancienne?.date_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const nouvelle = lireUneLigne(
      `SELECT date_debut FROM affectation_classe
       WHERE id_classe_annuelle = 'cp2' AND date_fin IS NULL;`,
    );
    expect(nouvelle?.date_debut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("repousse à demain le changement de classe fait le jour même, sans erreur", async () => {
    const dossier = await dossierComplet(); // affectation cp1 créée aujourd'hui

    const modifie = await dossiers.modifier({
      id_eleve: dossier.id_eleve,
      id_etablissement: "etablissement-1",
      prenom: "Ana",
      nom: "MBOUMBA",
      genre: "F",
      id_classe_annuelle: "cp2",
      parent: { nom_complet: "Mme LOUANGO", telephone: null },
    });

    // La base conserve chaque affectation au moins un jour : la classe du
    // jour reste en place ; l'écran signale ce report honnêtement.
    expect(modifie.id_classe_annuelle).toBe("cp1");
    expect(
      lireUneLigne("SELECT COUNT(*) AS n FROM affectation_classe;")?.n,
    ).toBe(1);
  });

  it("ajoute un parent à un élève qui n'en avait pas", async () => {
    const dossier = await dossiers.creer({
      id_etablissement: "etablissement-1",
      id_annee_scolaire: "2026-2027",
      prenom: "Junior",
      nom: "BALOU",
      genre: null,
    });

    const modifie = await dossiers.modifier({
      id_eleve: dossier.id_eleve,
      id_etablissement: "etablissement-1",
      prenom: "Junior",
      nom: "BALOU",
      genre: null,
      parent: { nom_complet: "M. NTARI", telephone: null },
    });

    expect(modifie.parent).toMatchObject({ nom_complet: "M. NTARI" });
    expect(
      lireUneLigne(
        "SELECT COUNT(*) AS n FROM relation_eleve_responsable WHERE id_eleve = ?;",
        [dossier.id_eleve],
      )?.n,
    ).toBe(1);
  });

  it("retire la classe et le parent d'un dossier ancien", async () => {
    const dossier = await dossiers.creer({
      id_etablissement: "etablissement-1",
      id_annee_scolaire: "2026-2027",
      prenom: "Ana",
      nom: "MBOUMBA",
      genre: "F",
    });

    // Dossier ancien : affectation + relation commencées avant aujourd'hui.
    executerControle(`
      INSERT INTO affectation_classe (
        id_affectation_classe, id_inscription, id_classe_annuelle,
        id_etablissement, date_debut, date_fin
      )
      SELECT '00000000a000-4000-8000-00000000e002', i.id_inscription,
             'cp1', i.id_etablissement, '2026-01-05', NULL
      FROM inscription i WHERE i.id_eleve = '${dossier.id_eleve}';

      INSERT INTO responsable (id_responsable, id_etablissement, nom_complet)
      VALUES ('00000000r000-4000-8000-00000000e003', 'etablissement-1', 'Mme LOUANGO');

      INSERT INTO relation_eleve_responsable (
        id_relation_eleve_responsable, id_eleve, id_responsable,
        id_etablissement, id_nature_lien,
        est_representant_legal, est_responsable_financier,
        date_debut_validite, date_fin_validite, id_auteur_creation
      )
      VALUES ('00000000l000-4000-8000-00000000e004', '${dossier.id_eleve}',
              '00000000r000-4000-8000-00000000e003', 'etablissement-1',
              '01100000-0000-4000-8000-000000000003', 1, 1, '2026-01-05', NULL, NULL);
    `);

    const modifie = await dossiers.modifier({
      id_eleve: dossier.id_eleve,
      id_etablissement: "etablissement-1",
      prenom: "Ana",
      nom: "MBOUMBA",
      genre: "F",
      id_classe_annuelle: null,
      parent: null,
    });

    expect(modifie.id_classe_annuelle).toBeNull();
    expect(modifie.parent).toBeNull();

    expect(
      lireUneLigne(
        "SELECT date_fin FROM affectation_classe WHERE date_fin IS NOT NULL;",
      )?.date_fin,
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      lireUneLigne(
        `SELECT date_fin_validite FROM relation_eleve_responsable
         WHERE date_fin_validite IS NOT NULL;`,
      )?.date_fin_validite,
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("refuse une modification sans prénom ou sans nom", async () => {
    const dossier = await dossierComplet();

    await expect(
      dossiers.modifier({
        id_eleve: dossier.id_eleve,
        id_etablissement: "etablissement-1",
        prenom: "   ",
        nom: "MBOUMBA",
        genre: null,
      }),
    ).rejects.toBeInstanceOf(DossierEleveInvalideError);

    await expect(
      dossiers.modifier({
        id_eleve: dossier.id_eleve,
        id_etablissement: "etablissement-1",
        prenom: "Ana",
        nom: "",
        genre: null,
      }),
    ).rejects.toBeInstanceOf(DossierEleveInvalideError);
  });
});
