import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import type { SqlValue } from "@sqlite.org/sqlite-wasm";
import { migrations, type Migration } from "../migrations";
import { executerTransactionSQLite } from "./sqlite-operations";
import type { SQLiteRow, SQLiteStatement } from "./sqlite.types";

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["OpfsDb"]
>;

interface MigrationRow {
  version: number;
  name: string;
  applied_at: string;
  sql_hash: string | null;
}

function lireInstruction(value: unknown): SQLiteStatement {
  if (
    typeof value !== "object" ||
    value === null ||
    !("sql" in value) ||
    typeof value.sql !== "string" ||
    ("bind" in value && value.bind !== undefined && !Array.isArray(value.bind))
  ) {
    throw new Error("Une instruction SQL transmise est invalide.");
  }

  return value as SQLiteStatement;
}

function executerInstruction(db: Database, instruction: SQLiteStatement) {
  return db.exec({
    sql: instruction.sql,
    bind: instruction.bind,
    rowMode: "object",
    returnValue: "resultRows",
  });
}

function executerTransaction(
  db: Database,
  instructions: unknown,
): SQLiteRow[][] {
  if (!Array.isArray(instructions) || instructions.length === 0) {
    throw new Error("La transaction doit contenir au moins une instruction.");
  }

  return executerTransactionSQLite(
    (instruction) => executerInstruction(db, instruction),
    (sql) => db.exec(sql),
    instructions.map(lireInstruction),
  );
}

function lireMigrationAppliquee(row: Record<string, SqlValue>): MigrationRow {
  const version = row.version;
  const name = row.name;
  const appliedAt = row.applied_at;
  const sqlHash = row.sql_hash;

  if (typeof version !== "number" && typeof version !== "bigint") {
    throw new Error("Une version de migration enregistrée est invalide.");
  }

  const versionNumerique = Number(version);

  if (!Number.isSafeInteger(versionNumerique)) {
    throw new Error("Une version de migration enregistrée est invalide.");
  }

  if (typeof name !== "string" || typeof appliedAt !== "string") {
    throw new Error(
      "Les métadonnées d'une migration enregistrée sont invalides.",
    );
  }

  if (sqlHash !== null && typeof sqlHash !== "string") {
    throw new Error("L'empreinte d'une migration enregistrée est invalide.");
  }

  return {
    version: versionNumerique,
    name,
    applied_at: appliedAt,
    sql_hash: sqlHash,
  };
}

async function calculerEmpreinteSql(sql: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Web Crypto est indisponible pour vérifier les migrations.",
    );
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(sql),
  );

  return Array.from(new Uint8Array(digest), (octet) =>
    octet.toString(16).padStart(2, "0"),
  ).join("");
}

let database: Database | null = null;

let initializationPromise: Promise<number> | null = null;
let schemaVersion = 0;

function activerClesEtrangeres(db: Database): void {
  db.exec("PRAGMA foreign_keys = ON;");

  const rows = db.exec({
    sql: "PRAGMA foreign_keys;",
    rowMode: "object",
    returnValue: "resultRows",
  });

  if (Number(rows[0]?.foreign_keys) !== 1) {
    throw new Error("Les clés étrangères SQLite ne sont pas activées.");
  }
}

async function appliquerMigrations(db: Database): Promise<number> {
  const migrationsConnues = new Map<number, Migration>();
  let versionPrecedente = 0;

  for (const migration of migrations) {
    if (!Number.isSafeInteger(migration.version) || migration.version <= 0) {
      throw new Error("Une version de migration est invalide.");
    }

    if (migrationsConnues.has(migration.version)) {
      throw new Error("Deux migrations possèdent la même version.");
    }

    if (migration.version <= versionPrecedente) {
      throw new Error(
        "Les migrations doivent être classées par version croissante.",
      );
    }

    if (typeof migration.name !== "string" || !migration.name.trim()) {
      throw new Error("Le nom d'une migration est obligatoire.");
    }

    if (typeof migration.sql !== "string" || !migration.sql.trim()) {
      throw new Error(
        "Les instructions SQL d'une migration sont obligatoires.",
      );
    }

    migrationsConnues.set(migration.version, migration);
    versionPrecedente = migration.version;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY CHECK (version > 0),
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sql_hash TEXT
    );
  `);

  const colonnes = db
    .exec({
      sql: "PRAGMA table_info(schema_migrations);",
      rowMode: "object",
      returnValue: "resultRows",
    })
    .map((row) => row.name);
  const empreinteDisponible = colonnes.includes("sql_hash");

  const migrationsAppliquees = db
    .exec({
      sql: `
      SELECT version, name, applied_at, ${empreinteDisponible ? "sql_hash" : "NULL AS sql_hash"}
      FROM schema_migrations
      ORDER BY version ASC;
    `,
      rowMode: "object",
      returnValue: "resultRows",
    })
    .map(lireMigrationAppliquee);

  const versionsAppliquees = new Set(
    migrationsAppliquees.map((migration) => migration.version),
  );

  for (let index = 0; index < migrationsAppliquees.length; index++) {
    const migrationAppliquee = migrationsAppliquees[index];
    const migrationConnue = migrationsConnues.get(migrationAppliquee.version);

    if (!migrationConnue) {
      throw new Error(
        `Migration ${migrationAppliquee.version} absente du registre. Mise à jour incompatible.`,
      );
    }

    if (migrations[index]?.version !== migrationAppliquee.version) {
      throw new Error(
        `Historique des migrations discontinu à la version ${migrationAppliquee.version}.`,
      );
    }

    if (migrationConnue.name !== migrationAppliquee.name) {
      throw new Error(
        `Le nom de la migration ${migrationAppliquee.version} ne correspond pas au registre actuel.`,
      );
    }
  }

  const empreintes = new Map<number, string>();

  for (const migration of migrations) {
    empreintes.set(
      migration.version,
      await calculerEmpreinteSql(migration.sql),
    );
  }

  for (const migrationAppliquee of migrationsAppliquees) {
    const empreinteAttendue = empreintes.get(migrationAppliquee.version);

    if (
      migrationAppliquee.sql_hash !== null &&
      migrationAppliquee.sql_hash !== empreinteAttendue
    ) {
      throw new Error(
        `Le SQL de la migration ${migrationAppliquee.version} a changé depuis son application.`,
      );
    }
  }

  if (
    !empreinteDisponible ||
    migrationsAppliquees.some((migration) => migration.sql_hash === null)
  ) {
    db.exec("BEGIN IMMEDIATE;");

    try {
      if (!empreinteDisponible) {
        db.exec("ALTER TABLE schema_migrations ADD COLUMN sql_hash TEXT;");
      }

      for (const migrationAppliquee of migrationsAppliquees) {
        if (migrationAppliquee.sql_hash !== null) {
          continue;
        }

        db.exec({
          sql: "UPDATE schema_migrations SET sql_hash = ? WHERE version = ?;",
          bind: [
            empreintes.get(migrationAppliquee.version)!,
            migrationAppliquee.version,
          ],
        });
      }

      db.exec("COMMIT;");
    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch {
        // Préserver l'erreur initiale.
      }

      throw error;
    }
  }

  // Application des migrations manquantes.
  for (const migration of migrations) {
    if (versionsAppliquees.has(migration.version)) {
      continue;
    }

    db.exec("BEGIN IMMEDIATE;");

    try {
      db.exec(migration.sql);

      db.exec({
        sql: `
          INSERT INTO schema_migrations (version, name, sql_hash)
          VALUES (?, ?, ?);
        `,
        bind: [
          migration.version,
          migration.name,
          empreintes.get(migration.version)!,
        ],
      });

      db.exec("COMMIT;");
    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch {
        // Préserver l'erreur initiale.
      }

      throw new Error(
        `Échec de la migration ${migration.version} (${migration.name}). ${
          error instanceof Error ? error.message : "Erreur inconnue."
        }`,
      );
    }
  }

  return migrations.length > 0 ? migrations[migrations.length - 1].version : 0;
}

async function initializeDatabase(): Promise<number> {
  if (database) {
    return schemaVersion;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const sqlite3 = await sqlite3InitModule();

      if (!sqlite3.oo1.OpfsDb) {
        throw new Error(
          "OPFS indisponible. Impossible de garantir la persistance.",
        );
      }

      const db = new sqlite3.oo1.OpfsDb("/gestion_scolaire.sqlite3");

      try {
        activerClesEtrangeres(db);
        const version = await appliquerMigrations(db);

        // Table temporaire conservée uniquement pour notre test OPFS.
        db.exec(`
          CREATE TABLE IF NOT EXISTS test_persistance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        database = db;
        schemaVersion = version;

        return version;
      } catch (error) {
        db.close();
        throw error;
      }
    })();
  }

  try {
    return await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { type, payload, requestId } = event.data;

  try {
    if (type === "INIT") {
      const currentSchemaVersion = await initializeDatabase();

      self.postMessage({
        type: "READY",
        requestId,
        message: "SQLite initialisé avec OPFS.",
        schemaVersion: currentSchemaVersion,
      });

      return;
    }

    if (!database) {
      throw new Error("La base SQLite n'est pas initialisée.");
    }

    if (type === "QUERY") {
      const instruction = lireInstruction(payload);

      self.postMessage({
        type: "QUERY_SUCCESS",
        requestId,
        rows: executerInstruction(database, instruction),
      });

      return;
    }

    if (type === "TRANSACTION") {
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("statements" in payload)
      ) {
        throw new Error("Les instructions de la transaction sont absentes.");
      }

      self.postMessage({
        type: "TRANSACTION_SUCCESS",
        requestId,
        rows: executerTransaction(database, payload.statements),
      });

      return;
    }

    if (type === "TEST_WRITE") {
      const message = String(payload?.message ?? "");

      if (!message.trim()) {
        throw new Error("Le message de test est obligatoire.");
      }

      database.exec({
        sql: "INSERT INTO test_persistance (message) VALUES (?);",
        bind: [message],
      });

      self.postMessage({
        type: "WRITE_SUCCESS",
        requestId,
        message: "Enregistrement effectué.",
      });

      return;
    }

    if (type === "TEST_READ") {
      const rows = database.exec({
        sql: `
          SELECT id, message, created_at
          FROM test_persistance
          ORDER BY id DESC;
        `,
        rowMode: "object",
        returnValue: "resultRows",
      });

      self.postMessage({
        type: "READ_SUCCESS",
        requestId,
        rows,
      });

      return;
    }

    throw new Error(`Commande inconnue : ${type}`);
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      requestId,
      message:
        error instanceof Error ? error.message : "Erreur SQLite inconnue.",
      resultCode:
        typeof error === "object" &&
        error !== null &&
        "resultCode" in error &&
        typeof error.resultCode === "number"
          ? error.resultCode
          : undefined,
    });
  }
};
