import sqlite3InitModule, { type SqlValue } from "@sqlite.org/sqlite-wasm";
import { beforeAll, describe, expect, it } from "vitest";
import type {
  SQLiteRow,
  SQLiteStatement,
} from "../../database/local/sqlite.types";
import { migrations } from "../../database/migrations";
import {
  FichierSauvegardeInvalideError,
  FORMAT_SAUVEGARDE,
  LIGNES_PAR_INSERT,
  SauvegardePlusRecenteError,
  VERSION_FORMAT_SAUVEGARDE,
  appliquerSauvegarde,
  construireInstructionsRestauration,
  decoderValeur,
  encoderValeur,
  genererSauvegardeDepuisBase,
  nomFichierSauvegarde,
  validerSauvegarde,
  type SauvegardeDonnees,
} from "./sauvegarde.service";

/**
 * Tests du service de sauvegarde/restauration, avec un vrai SQLite
 * (en mémoire) et les vraies migrations : on sauvegarde une base A
 * puis on la restaure dans une base B « vivante » (qui contient ses
 * propres données et une table en plus) et on vérifie que B finit
 * identique à A — le test de fin demandé par la feuille de route.
 */

type Database = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["DB"]
>;

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;

async function empreinteSha256(texte: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(texte),
  );

  return Array.from(new Uint8Array(digest), (octet) =>
    octet.toString(16).padStart(2, "0"),
  ).join("");
}

function executerInstruction(
  db: Database,
  instruction: SQLiteStatement,
): SQLiteRow[] {
  return db.exec({
    sql: instruction.sql,
    bind: instruction.bind as SqlValue[] | undefined,
    rowMode: "object",
    returnValue: "resultRows",
  }) as unknown as SQLiteRow[];
}

function creerAcces(db: Database) {
  return {
    requeter: async (
      sql: string,
      bind: SqlValue[] = [],
    ): Promise<SQLiteRow[]> =>
      executerInstruction(db, { sql, bind }),
    transactionner: async (statements: SQLiteStatement[]) => {
      db.exec("BEGIN IMMEDIATE;");

      try {
        const rows = statements.map((instruction) =>
          executerInstruction(db, instruction),
        );
        db.exec("COMMIT;");
        return rows;
      } catch (error) {
        try {
          db.exec("ROLLBACK;");
        } catch {
          // Préserver l'erreur initiale.
        }
        throw error;
      }
    },
  };
}

async function creerBaseAvecMigrations(): Promise<Database> {
  const db = new sqlite3.oo1.DB(":memory:");

  db.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY CHECK (version > 0),
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sql_hash TEXT
    );
  `);

  for (const migration of migrations) {
    db.exec(migration.sql);
    db.exec({
      sql: "INSERT INTO schema_migrations (version, name, sql_hash) VALUES (?, ?, ?);",
      bind: [migration.version, migration.name, await empreinteSha256(migration.sql)],
    });
  }

  return db;
}

/** Données de démo : une école, deux cycles, deux élèves, une photo. */
async function peuplerBaseA(db: Database): Promise<Uint8Array> {
  db.exec({
    sql: "INSERT INTO etablissement (id_etablissement) VALUES (?);",
    bind: ["ecole-demo"],
  });
  db.exec({
    sql: "INSERT INTO cycle_enseignement (id_cycle) VALUES (?), (?);",
    bind: ["primaire", "college"],
  });
  db.exec({
    sql: "INSERT INTO eleve (id_eleve, id_etablissement, prenom, nom, genre) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?);",
    bind: [
      "eleve-1",
      "ecole-demo",
      "Ana",
      "MBOUMBA",
      "F",
      "eleve-2",
      "ecole-demo",
      "Jean",
      "NGOMA",
      "M",
    ],
  });

  const photo = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 255, 0, 42]);

  db.exec("CREATE TABLE photo_test (id_photo TEXT NOT NULL PRIMARY KEY, contenu BLOB);");
  db.exec({
    sql: "INSERT INTO photo_test (id_photo, contenu) VALUES (?, ?);",
    bind: ["photo-1", photo],
  });

  // Une table avec un TRIGGER de validation croisée, comme les vraies
  // règles métier de l'application (ex. : « l'affectation doit relier
  // une inscription et une classe du même établissement »). Le trigger
  // ne doit être recréé qu'APRÈS l'insertion des données, sinon chaque
  // INSERT est jugé sur une base à moitié vide et refusé.
  db.exec(`
    CREATE TABLE reference_test (id TEXT NOT NULL PRIMARY KEY);
    CREATE TABLE regle_test (
      id TEXT NOT NULL PRIMARY KEY,
      id_reference TEXT NOT NULL,
      FOREIGN KEY (id_reference) REFERENCES reference_test (id)
    );
    CREATE TRIGGER trg_regle_verifie_reference
    BEFORE INSERT ON regle_test
    WHEN NEW.id_reference NOT IN (SELECT id FROM reference_test)
    BEGIN
      SELECT RAISE(ABORT, 'La règle doit pointer vers une référence existante.');
    END;
  `);
  db.exec({
    sql: "INSERT INTO reference_test (id) VALUES (?);",
    bind: ["ref-1"],
  });
  db.exec({
    sql: "INSERT INTO regle_test (id, id_reference) VALUES (?, ?);",
    bind: ["regle-1", "ref-1"],
  });

  return photo;
}

let baseA: Database;
let baseB: Database;
let photoOriginale: Uint8Array;

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();

  baseA = await creerBaseAvecMigrations();
  photoOriginale = await peuplerBaseA(baseA);

  baseB = await creerBaseAvecMigrations();
  baseB.exec({
    sql: "INSERT INTO etablissement (id_etablissement) VALUES (?);",
    bind: ["autre-ecole"],
  });
  baseB.exec({
    sql: "INSERT INTO cycle_enseignement (id_cycle) VALUES (?);",
    bind: ["lycee"],
  });
  baseB.exec({
    sql: "INSERT INTO eleve (id_eleve, id_etablissement, prenom, nom, genre) VALUES (?, ?, ?, ?, ?);",
    bind: ["eleve-autre", "autre-ecole", "Paul", "LOUMOU", "M"],
  });
  // Une table qui n'existe pas dans la sauvegarde (comme si B était
  // « plus récente ») : elle doit disparaître à la restauration.
  baseB.exec("CREATE TABLE table_surplus (id INTEGER PRIMARY KEY);");
});

describe("nom de fichier horodaté (fuseau Africa/Brazzaville)", () => {
  it("horodate l'heure locale de Brazzaville (UTC+1)", () => {
    expect(nomFichierSauvegarde(new Date("2026-11-13T08:30:45Z"))).toBe(
      "sauvegarde-gestion-scolaire-2026-11-13_09-30-45.json",
    );
  });

  it("passe proprement à minuit local (jamais « 24 » comme heure)", () => {
    expect(nomFichierSauvegarde(new Date("2026-11-13T23:30:45Z"))).toBe(
      "sauvegarde-gestion-scolaire-2026-11-14_00-30-45.json",
    );
  });
});

describe("encodage des valeurs spéciales", () => {
  it("fait l'aller-retour d'un BLOB à l'octet près", () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
    const decode = decoderValeur(encoderValeur(original));

    expect(decode).toBeInstanceOf(Uint8Array);
    expect(Array.from(decode as Uint8Array)).toEqual(Array.from(original));
  });

  it("fait l'aller-retour d'un grand entier", () => {
    const original = 123456789012345678901234567890n;
    const decode = decoderValeur(encoderValeur(original));

    expect(decode).toBe(original);
  });

  it("laisse passer les valeurs simples telles quelles", () => {
    expect(decoderValeur(encoderValeur(null))).toBeNull();
    expect(decoderValeur(encoderValeur("texto"))).toBe("texto");
    expect(decoderValeur(encoderValeur(42))).toBe(42);
  });
});

describe("génération de la sauvegarde", () => {
  let sauvegarde: SauvegardeDonnees;

  beforeAll(async () => {
    sauvegarde = await genererSauvegardeDepuisBase(creerAcces(baseA).requeter);
  });

  it("porte l'en-tête du format et la version du schéma (v20)", () => {
    expect(sauvegarde.format).toBe(FORMAT_SAUVEGARDE);
    expect(sauvegarde.versionFormat).toBe(VERSION_FORMAT_SAUVEGARDE);
    expect(sauvegarde.schemaVersion).toBe(migrations[migrations.length - 1].version);
    expect(sauvegarde.fuseau).toBe("Africa/Brazzaville");
  });

  it("capture tables, index, triggers et vues du schéma", () => {
    const noms = sauvegarde.tables.map((objet) => objet.nom);

    expect(noms).toContain("eleve");
    expect(noms).toContain("schema_migrations");
    expect(noms).toContain("idx_eleve_etablissement");
    expect(noms).toContain("trg_eleve_non_supprimable");
  });

  it("relève les lignes de chaque table (2 élèves, 2 cycles, 1 photo)", () => {
    const resume = new Map(
      sauvegarde.resume.map((ligne) => [ligne.table, ligne.lignes]),
    );

    expect(resume.get("eleve")).toBe(2);
    expect(resume.get("cycle_enseignement")).toBe(2);
    expect(resume.get("photo_test")).toBe(1);
  });

  it("nomme les colonnes de chaque table", () => {
    const eleve = sauvegarde.tables.find((objet) => objet.nom === "eleve");

    expect(eleve?.type).toBe("table");
    expect(eleve?.colonnes).toContain("id_eleve");
    expect(eleve?.colonnes).toContain("prenom");
    expect(eleve?.lignes).toHaveLength(2);
  });
});

describe("validation d'un fichier de sauvegarde", () => {
  const sauvegardeValide = JSON.stringify({
    format: FORMAT_SAUVEGARDE,
    versionFormat: VERSION_FORMAT_SAUVEGARDE,
    creeeLe: "2026-11-13T08:00:00.000Z",
    heureLocale: "13 novembre 2026 à 09:00",
    fuseau: "Africa/Brazzaville",
    schemaVersion: migrations[migrations.length - 1].version,
    tables: [
      { type: "table", nom: "t", sql: "CREATE TABLE t (a TEXT);", colonnes: ["a"], lignes: [] },
    ],
    resume: [{ table: "t", lignes: 0 }],
  });

  it("accepte une sauvegarde correcte", () => {
    const donnees = validerSauvegarde(
      sauvegardeValide,
      migrations[migrations.length - 1].version,
    );

    expect(donnees.tables).toHaveLength(1);
    expect(donnees.tables[0].nom).toBe("t");
  });

  it("refuse un texte qui n'est pas du JSON", () => {
    expect(() =>
      validerSauvegarde("ceci n'est pas un JSON", migrations[migrations.length - 1].version),
    ).toThrow(
      FichierSauvegardeInvalideError,
    );
  });

  it("refuse un JSON qui n'est pas une sauvegarde de l'application", () => {
    expect(() =>
      validerSauvegarde(
        JSON.stringify({ format: "autre-chose" }),
        migrations[migrations.length - 1].version,
      ),
    ).toThrow(FichierSauvegardeInvalideError);
  });

  it("refuse une version de format inconnue", () => {
    const autre = JSON.parse(sauvegardeValide) as Record<string, unknown>;
    autre.versionFormat = 99;

    expect(() =>
      validerSauvegarde(JSON.stringify(autre), migrations[migrations.length - 1].version),
    ).toThrow(
      FichierSauvegardeInvalideError,
    );
  });

  it("refuse une sauvegarde plus récente que la base actuelle", () => {
    const autre = JSON.parse(sauvegardeValide) as Record<string, unknown>;
    autre.schemaVersion = migrations[migrations.length - 1].version + 1;

    expect(() =>
      validerSauvegarde(JSON.stringify(autre), migrations[migrations.length - 1].version),
    ).toThrow(
      SauvegardePlusRecenteError,
    );
  });
});

describe("reconstruction des instructions", () => {
  it("groupe les INSERT par paquets (250 lignes → 2 instructions)", () => {
    const lignes = Array.from({ length: LIGNES_PAR_INSERT + 50 }, () => [
      "x",
      1,
    ]);

    const instructions = construireInstructionsRestauration(
      {
        format: FORMAT_SAUVEGARDE,
        versionFormat: 1,
        creeeLe: "",
        heureLocale: "",
        fuseau: "Africa/Brazzaville",
        schemaVersion: 20,
        tables: [
          {
            type: "table",
            nom: "t",
            sql: "CREATE TABLE t (a TEXT, b INTEGER);",
            colonnes: ["a", "b"],
            lignes,
          },
        ],
        resume: [],
      },
      [],
    );

    const inserts = instructions.filter((instruction) =>
      instruction.sql.startsWith("INSERT"),
    );

    expect(inserts).toHaveLength(2);
    expect(inserts[0].bind).toHaveLength(LIGNES_PAR_INSERT * 2);
    expect(inserts[1].bind).toHaveLength(50 * 2);
  });

  it("nomme toujours les colonnes et cite les identifiants", () => {
    const instructions = construireInstructionsRestauration(
      {
        format: FORMAT_SAUVEGARDE,
        versionFormat: 1,
        creeeLe: "",
        heureLocale: "",
        fuseau: "Africa/Brazzaville",
        schemaVersion: 20,
        tables: [
          {
            type: "table",
            nom: "t",
            sql: "CREATE TABLE t (a TEXT);",
            colonnes: ["a"],
            lignes: [["valeur d'Ana"]],
          },
        ],
        resume: [],
      },
      [],
    );

    const insert = instructions.find((instruction) =>
      instruction.sql.startsWith("INSERT"),
    );

    expect(insert?.sql).toContain('INSERT INTO "t" ("a") VALUES (?)');
    expect(insert?.bind).toEqual(["valeur d'Ana"]);
  });
});

describe("restauration complète (sauvegarder → restaurer → retrouver)", () => {
  it("remplace le contenu de B par celui de A, à l'octet près", async () => {
    const sauvegarde = await genererSauvegardeDepuisBase(
      creerAcces(baseA).requeter,
    );
    const accesB = creerAcces(baseB);
    const { tablesRestaurees, lignesRestaurees } = await appliquerSauvegarde(
      accesB.requeter,
      accesB.transactionner,
      sauvegarde,
    );

    expect(tablesRestaurees).toBeGreaterThan(0);
    expect(lignesRestaurees).toBeGreaterThan(0);

    // Les élèves de A sont revenus, l'élève de B n'y est plus.
    const cycles = await accesB.requeter("SELECT id_cycle FROM cycle_enseignement;");
    expect(cycles.map((ligne) => ligne.id_cycle).sort()).toEqual([
      "college",
      "primaire",
    ]);

    const eleves = await accesB.requeter(
      "SELECT prenom, nom, genre FROM eleve ORDER BY prenom;",
    );
    expect(eleves).toHaveLength(2);
    expect(eleves[0]).toMatchObject({ prenom: "Ana", nom: "MBOUMBA", genre: "F" });
    expect(eleves[1]).toMatchObject({ prenom: "Jean", nom: "NGOMA", genre: "M" });

    // Le BLOB est revenu à l'octet près.
    const photo = await accesB.requeter(
      "SELECT contenu FROM photo_test WHERE id_photo = 'photo-1';",
    );
    expect(photo[0].contenu).toBeInstanceOf(Uint8Array);
    expect(Array.from(photo[0].contenu as Uint8Array)).toEqual(
      Array.from(photoOriginale),
    );

    // La table avec trigger de validation croisée est revenue intacte :
    // le trigger existe (il refuse une référence absente) et les
    // données ont passé le contrôle.
    expect(() =>
      baseB.exec({
        sql: "INSERT INTO regle_test (id, id_reference) VALUES (?, ?);",
        bind: ["regle-2", "ref-absente"],
      }),
    ).toThrow("La règle doit pointer vers une référence existante.");
    const regles = await accesB.requeter("SELECT COUNT(*) AS n FROM regle_test;");
    expect(Number(regles[0].n)).toBe(1);

    // Les triggers anti-suppression sont revenus avec le schéma : une
    // suppression physique est refusée (l'« alarme » voulue), et les
    // deux élèves sont toujours là.
    expect(() =>
      baseB.exec({ sql: "DELETE FROM eleve WHERE id_eleve = 'eleve-1';" }),
    ).toThrow("Un dossier élève ne peut pas être supprimé physiquement.");
    const restants = await accesB.requeter("SELECT COUNT(*) AS n FROM eleve;");
    expect(Number(restants[0].n)).toBe(2);

    // Le journal des migrations est celui de la sauvegarde (v20).
    const journal = await accesB.requeter(
      "SELECT MAX(version) AS version FROM schema_migrations;",
    );
    expect(Number(journal[0].version)).toBe(
      migrations[migrations.length - 1].version,
    );

    // La table qui n'existait pas dans la sauvegarde a disparu.
    const surplus = await accesB.requeter(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'table_surplus';",
    );
    expect(Number(surplus[0].n)).toBe(0);

    // Les clés étrangères sont réactivées après la restauration.
    const fk = await accesB.requeter("PRAGMA foreign_keys;");
    expect(Number(fk[0].foreign_keys)).toBe(1);
  });
});
