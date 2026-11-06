import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

self.onmessage = async () => {
  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.OpfsDb("/gestion_scolaire.sqlite3");

  try {
    db.exec("PRAGMA foreign_keys = ON;");

    const foreignKeys = db.exec({
      sql: "PRAGMA foreign_keys;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    if (Number(foreignKeys[0]?.foreign_keys) !== 1) {
      throw new Error("Les clés étrangères SQLite ne sont pas activées.");
    }

    const migrations = db.exec({
      sql: "SELECT version, name FROM schema_migrations ORDER BY version;",
      rowMode: "object",
      returnValue: "resultRows",
    });
    const testTables = db.exec({
      sql: `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('migration_test_success', 'migration_test_rollback')
        ORDER BY name;
      `,
      rowMode: "object",
      returnValue: "resultRows",
    });
    const successfulRows = db.exec({
      sql: "SELECT COUNT(*) AS count FROM migration_test_success;",
      rowMode: "object",
      returnValue: "resultRows",
    });

    db.exec(`
      DROP TABLE IF EXISTS migration_test_success;
      DROP TABLE IF EXISTS migration_test_rollback;
      DROP TABLE IF EXISTS test_persistance;
      DROP TABLE IF EXISTS schema_migrations;
    `);

    self.postMessage({
      type: "VERIFIED_AND_CLEANED",
      migrations,
      testTables,
      successfulRows,
    });
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      message:
        error instanceof Error ? error.message : "Erreur de vérification.",
    });
  } finally {
    db.close();
  }
};
