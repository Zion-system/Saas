import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrations } from "./index";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let database: Database;

function executerTransaction(operation: () => void): void {
  database.exec("BEGIN IMMEDIATE;");
  try {
    operation();
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

function creerEleve(
  id: string,
  etablissement: string,
  matricule: string | null = null,
): void {
  database.exec({
    sql: "INSERT INTO eleve (id_eleve, id_etablissement, matricule) VALUES (?, ?, ?);",
    bind: [id, etablissement, matricule],
  });
}

function creerResponsable(id: string, etablissement: string): void {
  database.exec({
    sql: "INSERT INTO responsable (id_responsable, id_etablissement) VALUES (?, ?);",
    bind: [id, etablissement],
  });
}

function ajouterHistoriqueMatricule({
  id,
  eleve,
  etablissement = "etablissement-1",
  precedent = null,
  matricule,
  debut,
  motif = null,
}: {
  id: string;
  eleve: string;
  etablissement?: string;
  precedent?: string | null;
  matricule: string;
  debut: string;
  motif?: string | null;
}): void {
  database.exec({
    sql: `
      INSERT INTO historique_matricule (
        id_historique_matricule, id_eleve, id_etablissement,
        id_historique_precedent, matricule, date_debut_validite,
        motif_correction
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [id, eleve, etablissement, precedent, matricule, debut, motif],
  });
}

function creerRelation({
  id,
  eleve = "eleve-1",
  responsable = "responsable-1",
  etablissement = "etablissement-1",
  nature = "01100000-0000-4000-8000-000000000001",
  debut = "2026-01-01",
  fin = null,
  legal = 0,
  financier = 0,
  auteurCreation = null,
}: {
  id: string;
  eleve?: string;
  responsable?: string;
  etablissement?: string;
  nature?: string;
  debut?: string;
  fin?: string | null;
  legal?: number;
  financier?: number;
  auteurCreation?: string | null;
}): void {
  database.exec({
    sql: `
      INSERT INTO relation_eleve_responsable (
        id_relation_eleve_responsable, id_eleve, id_responsable,
        id_etablissement, id_nature_lien, est_representant_legal,
        est_responsable_financier, date_debut_validite,
        date_fin_validite, id_auteur_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    bind: [
      id,
      eleve,
      responsable,
      etablissement,
      nature,
      legal,
      financier,
      debut,
      fin,
      auteurCreation,
    ],
  });
}

function lireCompte(
  sql: string,
  bind: (string | number | null)[] = [],
): number {
  return Number(
    database.exec({
      sql,
      bind,
      rowMode: "object",
      returnValue: "resultRows",
    })[0]?.count,
  );
}

function lireMatricule(idEleve: string): string | null {
  return database.exec({
    sql: "SELECT matricule FROM eleve WHERE id_eleve = ?;",
    bind: [idEleve],
    rowMode: "object",
    returnValue: "resultRows",
  })[0]?.matricule as string | null;
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
});

afterEach(() => {
  database.close();
});

describe("migration eleves_responsables", () => {
  it("applique le registre 001–013 et crée les cinq tables métier", () => {
    expect(migrations.map((migration) => migration.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    expect(
      database
        .exec({
          sql: "SELECT version FROM schema_migrations ORDER BY version;",
          rowMode: "object",
          returnValue: "resultRows",
        })
        .map((row) => row.version),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(
      database.exec({
        sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (
          'eleve', 'responsable', 'nature_lien_responsable',
          'relation_eleve_responsable', 'historique_matricule'
        ) ORDER BY name;`,
        rowMode: "object",
        returnValue: "resultRows",
      }),
    ).toHaveLength(5);
    expect(
      database.exec({
        sql: "PRAGMA foreign_keys;",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.foreign_keys,
    ).toBe(1);
  });

  it("rattache élèves et responsables, et protège les clés composites", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerResponsable("responsable-1", "etablissement-1");
    creerResponsable("responsable-2", "etablissement-2");

    expect(() =>
      creerEleve("eleve-matricule-direct", "etablissement-1", "MAT-9"),
    ).toThrow();
    expect(() =>
      database.exec("DELETE FROM eleve WHERE id_eleve = 'eleve-1';"),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: "UPDATE eleve SET id_eleve = ? WHERE id_eleve = ?;",
        bind: ["eleve-renomme", "eleve-1"],
      }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: "UPDATE responsable SET id_etablissement = ? WHERE id_responsable = ?;",
        bind: ["etablissement-2", "responsable-1"],
      }),
    ).toThrow();

    expect(() =>
      creerEleve("eleve-invalide", "etablissement-absent"),
    ).toThrow();
    expect(() =>
      creerRelation({
        id: "relation-etablissement-croise",
        etablissement: "etablissement-2",
      }),
    ).toThrow();
    expect(() =>
      creerRelation({
        id: "relation-responsable-croise",
        responsable: "responsable-2",
      }),
    ).toThrow();
  });

  it("permet l’attribution différée, l’unicité locale et réserve définitivement les anciennes valeurs", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerEleve("eleve-2", "etablissement-1");
    creerEleve("eleve-3", "etablissement-2");

    ajouterHistoriqueMatricule({
      id: "matricule-h-1",
      eleve: "eleve-1",
      matricule: "MAT-001",
      debut: "2026-01-01",
    });
    expect(lireMatricule("eleve-1")).toBe("MAT-001");
    expect(() =>
      ajouterHistoriqueMatricule({
        id: "matricule-h-2",
        eleve: "eleve-2",
        matricule: "MAT-001",
        debut: "2026-01-01",
      }),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM historique_matricule WHERE id_historique_matricule = 'matricule-h-1';",
      ),
    ).toThrow();

    ajouterHistoriqueMatricule({
      id: "matricule-h-3",
      eleve: "eleve-3",
      etablissement: "etablissement-2",
      matricule: "MAT-001",
      debut: "2026-01-01",
    });
    expect(lireMatricule("eleve-3")).toBe("MAT-001");
  });

  it("historise une correction motivée et interdit la réattribution ainsi que les changements directs", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerEleve("eleve-2", "etablissement-1");
    ajouterHistoriqueMatricule({
      id: "matricule-h-1",
      eleve: "eleve-1",
      matricule: "MAT-001",
      debut: "2026-01-01",
    });

    expect(() =>
      database.exec(
        "UPDATE historique_matricule SET date_fin_validite = '2026-03-01' WHERE id_historique_matricule = 'matricule-h-1';",
      ),
    ).toThrow();
    ajouterHistoriqueMatricule({
      id: "matricule-h-2",
      eleve: "eleve-1",
      precedent: "matricule-h-1",
      matricule: "MAT-002",
      debut: "2026-03-01",
      motif: "Correction d’une erreur de saisie",
    });

    expect(lireMatricule("eleve-1")).toBe("MAT-002");
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM historique_matricule WHERE id_eleve = ?;",
        ["eleve-1"],
      ),
    ).toBe(2);
    expect(() =>
      database.exec({
        sql: "UPDATE eleve SET matricule = ? WHERE id_eleve = ?;",
        bind: ["MAT-999", "eleve-1"],
      }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: "UPDATE eleve SET matricule = NULL WHERE id_eleve = ?;",
        bind: ["eleve-1"],
      }),
    ).toThrow();
    expect(() =>
      ajouterHistoriqueMatricule({
        id: "matricule-h-3",
        eleve: "eleve-2",
        matricule: "MAT-001",
        debut: "2026-04-01",
        motif: "Tentative de réutilisation",
      }),
    ).toThrow();
    expect(() =>
      ajouterHistoriqueMatricule({
        id: "matricule-h-4",
        eleve: "eleve-1",
        matricule: "MAT-003",
        debut: "2026-04-01",
      }),
    ).toThrow();
  });

  it("annule intégralement la correction si la synchronisation du matricule échoue", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerEleve("eleve-2", "etablissement-1");
    ajouterHistoriqueMatricule({
      id: "matricule-h-1",
      eleve: "eleve-1",
      matricule: "MAT-001",
      debut: "2026-01-01",
    });
    database.exec(`
      CREATE TRIGGER test_fail_matricule_sync
      BEFORE UPDATE OF matricule ON eleve
      WHEN NEW.id_eleve = 'eleve-1'
      BEGIN
        SELECT RAISE(ABORT, 'Échec de synchronisation simulé.');
      END;
    `);

    expect(() =>
      ajouterHistoriqueMatricule({
        id: "matricule-h-2",
        eleve: "eleve-1",
        precedent: "matricule-h-1",
        matricule: "MAT-003",
        debut: "2026-03-01",
        motif: "Correction devant échouer",
      }),
    ).toThrow();
    database.exec("DROP TRIGGER test_fail_matricule_sync;");

    expect(lireMatricule("eleve-1")).toBe("MAT-001");
    expect(
      database.exec({
        sql: "SELECT date_fin_validite FROM historique_matricule WHERE id_historique_matricule = 'matricule-h-1';",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.date_fin_validite,
    ).toBeNull();
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM historique_matricule WHERE id_eleve = ?;",
        ["eleve-1"],
      ),
    ).toBe(1);
  });

  it("crée des relations N et conserve séparément leurs responsabilités", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerEleve("eleve-2", "etablissement-1");
    creerResponsable("responsable-1", "etablissement-1");
    creerResponsable("responsable-2", "etablissement-1");

    creerRelation({ id: "relation-1", legal: 1 });
    creerRelation({
      id: "relation-2",
      responsable: "responsable-2",
      financier: 1,
    });
    creerRelation({
      id: "relation-3",
      eleve: "eleve-2",
      legal: 1,
      financier: 1,
    });

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM relation_eleve_responsable WHERE id_eleve = ?;",
        ["eleve-1"],
      ),
    ).toBe(2);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM relation_eleve_responsable WHERE id_responsable = ?;",
        ["responsable-1"],
      ),
    ).toBe(2);
    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM relation_eleve_responsable WHERE est_representant_legal = 1 AND est_responsable_financier = 1;",
      ),
    ).toBe(1);
  });

  it("clôture une relation et interdit les versions qui chevauchent son intervalle", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerResponsable("responsable-1", "etablissement-1");
    creerRelation({ id: "relation-1", debut: "2026-01-01" });

    executerTransaction(() => {
      database.exec({
        sql: `UPDATE relation_eleve_responsable
          SET date_fin_validite = ?
          WHERE id_relation_eleve_responsable = ?;`,
        bind: ["2026-04-01", "relation-1"],
      });
      creerRelation({ id: "relation-2", debut: "2026-04-01" });
    });

    expect(
      lireCompte(
        "SELECT COUNT(*) AS count FROM relation_eleve_responsable WHERE date_fin_validite IS NULL;",
      ),
    ).toBe(1);
    expect(() =>
      creerRelation({ id: "relation-chevauchante", debut: "2026-03-31" }),
    ).toThrow();
    expect(() =>
      database.exec({
        sql: "UPDATE relation_eleve_responsable SET date_fin_validite = '2026-05-01', id_auteur_cloture = 'acteur-2' WHERE id_relation_eleve_responsable = 'relation-1';",
      }),
    ).toThrow();
    expect(() =>
      database.exec(
        "DELETE FROM relation_eleve_responsable WHERE id_relation_eleve_responsable = 'relation-1';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE relation_eleve_responsable SET est_responsable_financier = 1 WHERE id_relation_eleve_responsable = 'relation-1';",
      ),
    ).toThrow();
  });

  it("annule la clôture d’une relation si sa remplaçante échoue", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerResponsable("responsable-1", "etablissement-1");
    creerRelation({ id: "relation-1", debut: "2026-01-01" });

    expect(() =>
      executerTransaction(() => {
        database.exec({
          sql: "UPDATE relation_eleve_responsable SET date_fin_validite = ? WHERE id_relation_eleve_responsable = ?;",
          bind: ["2026-04-01", "relation-1"],
        });
        creerRelation({
          id: "relation-2",
          debut: "2026-04-01",
          nature: "nature-inexistante",
        });
      }),
    ).toThrow();

    expect(
      database.exec({
        sql: "SELECT date_fin_validite FROM relation_eleve_responsable WHERE id_relation_eleve_responsable = 'relation-1';",
        rowMode: "object",
        returnValue: "resultRows",
      })[0]?.date_fin_validite,
    ).toBeNull();
    expect(
      lireCompte("SELECT COUNT(*) AS count FROM relation_eleve_responsable;"),
    ).toBe(1);
  });

  it("valide les dates civiles et l’ordre strict des bornes", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerResponsable("responsable-1", "etablissement-1");

    expect(() =>
      creerRelation({ id: "date-invalide", debut: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      creerRelation({
        id: "bornes-egales",
        debut: "2026-03-01",
        fin: "2026-03-01",
      }),
    ).toThrow();
    expect(() =>
      creerRelation({
        id: "bornes-inversees",
        debut: "2026-03-02",
        fin: "2026-03-01",
      }),
    ).toThrow();
  });

  it("protège le référentiel utilisé et bloque les natures désactivées", () => {
    creerEleve("eleve-1", "etablissement-1");
    creerResponsable("responsable-1", "etablissement-1");
    creerRelation({ id: "relation-1" });

    expect(() =>
      database.exec(
        "UPDATE nature_lien_responsable SET code = 'PARENT' WHERE code = 'PERE';",
      ),
    ).toThrow();
    expect(() =>
      database.exec(`
        INSERT INTO nature_lien_responsable (id_nature_lien, code, libelle)
        VALUES ('nature-duplicate', 'PERE', 'Père bis');
      `),
    ).toThrow();
    expect(() =>
      database.exec(
        "UPDATE nature_lien_responsable SET libelle = 'Parent' WHERE code = 'PERE';",
      ),
    ).toThrow();
    expect(() =>
      database.exec("DELETE FROM nature_lien_responsable WHERE code = 'PERE';"),
    ).toThrow();

    database.exec(
      "UPDATE nature_lien_responsable SET est_actif = 0 WHERE code = 'MERE';",
    );
    expect(() =>
      creerRelation({
        id: "relation-nature-inactive",
        responsable: "responsable-1",
        nature: "01100000-0000-4000-8000-000000000002",
      }),
    ).toThrow();
  });
});
