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

describe("migration libelle_modele_classe", () => {
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

  it("applique 001–021 en ordre et ajoute la colonne libelle sans créer d'objet", () => {
    const versions = database.exec({
      sql: "SELECT version FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });
    expect(versions.map((row) => row.version)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);

    const colonnes = database.exec({
      sql: "PRAGMA table_info(modele_classe);",
      rowMode: "object",
      returnValue: "resultRows",
    });
    expect(colonnes.map((colonne) => colonne.name)).toEqual([
      "id_modele_classe",
      "libelle",
    ]);

    // Colonne facultative : aucune obligation NOT NULL ni valeur par
    // défaut, les modèles existants continuent de fonctionner.
    expect(colonnes.find((c) => c.name === "libelle")?.notnull).toBe(0);
  });

  it("conserve le libellé saisi et le repli NULL pour les modèles sans libellé", () => {
    database.exec(`
      INSERT INTO modele_classe (id_modele_classe, libelle)
        VALUES ('premiere-a', 'Première A');
      INSERT INTO modele_classe (id_modele_classe)
        VALUES ('cp1');
    `);

    const lignes = database.exec({
      sql: "SELECT id_modele_classe, libelle FROM modele_classe ORDER BY id_modele_classe;",
      rowMode: "object",
      returnValue: "resultRows",
    });
    expect(lignes).toEqual([
      { id_modele_classe: "cp1", libelle: null },
      { id_modele_classe: "premiere-a", libelle: "Première A" },
    ]);

    // Complétion a posteriori (écran de configuration) sans toucher à
    // l'identifiant.
    database.exec(
      "UPDATE modele_classe SET libelle = 'CP1' WHERE id_modele_classe = 'cp1';",
    );
    const completee = database.exec({
      sql: "SELECT libelle FROM modele_classe WHERE id_modele_classe = 'cp1';",
      rowMode: "object",
      returnValue: "resultRows",
    });
    expect(completee[0]?.libelle).toBe("CP1");

    // Renommer l'identifiant technique conserve le libellé.
    database.exec(
      "UPDATE modele_classe SET id_modele_classe = 'premiere-2' WHERE id_modele_classe = 'premiere-a';",
    );
    const renommee = database.exec({
      sql: "SELECT id_modele_classe, libelle FROM modele_classe WHERE libelle = 'Première A';",
      rowMode: "object",
      returnValue: "resultRows",
    });
    expect(renommee).toEqual([
      { id_modele_classe: "premiere-2", libelle: "Première A" },
    ]);
  });
});
