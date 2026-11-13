import type { SqlValue } from "@sqlite.org/sqlite-wasm";
import type {
  SQLiteRow,
  SQLiteStatement,
} from "../../database/local/sqlite.types";
import {
  executerRequete,
  executerTransaction,
} from "../../database/local/sqlite.client";

/**
 * Service « Sauvegarde et restauration » — la photocopie du cahier.
 *
 * La base SQLite vit dans un Worker (zone gelée src/database/local/) qui
 * garde le fichier OPFS ouvert : on ne peut donc pas recopier le fichier
 * de base à la main. À la place, on fait ce que fait l'outil de ligne de
 * commande .dump de SQLite : on lit le schéma (sqlite_master) et toutes
 * les lignes de toutes les tables via l'API SQL publique du client, puis
 * on reconstruit l'ensemble dans la base au moment de la restauration,
 * dans UNE transaction unique (tout ou rien) :
 *
 *   PRAGMA foreign_keys = OFF     (hors transaction, obligatoire)
 *   BEGIN IMMEDIATE
 *     DROP de tout ce qui existe aujourd'hui
 *     CREATE de tout le schéma de la sauvegarde
 *     INSERT de toutes les données (colonnes toujours nommées)
 *   COMMIT
 *   PRAGMA foreign_keys = ON      (toujours réactivé, même en cas d'erreur)
 *
 * La table schema_migrations fait partie de la sauvegarde : restaurer
 * une sauvegarde un peu ancienne puis relancer l'application rejoue donc
 * proprement les migrations manquantes. Une sauvegarde plus récente que
 * la base actuelle est refusée (elle décrirait un schéma inconnu ici).
 *
 * Conformité aux règles d'or : rien dans src/database/local/ n'est
 * modifié ; aucune suppression définitive de dossier élève ne peut
 * passer par ce canal (les triggers anti-suppression sont recréés avec
 * le schéma) ; aucune donnée ne quitte l'appareil (tout reste local).
 */

/* ============================== Format ============================== */

/** Marqueur inscrit dans chaque fichier de sauvegarde. */
export const FORMAT_SAUVEGARDE = "sauvegarde-gestion-scolaire";

/** Version du format de fichier (évolue si le contenu change). */
export const VERSION_FORMAT_SAUVEGARDE = 1;

/** Fuseau de référence pour les dates affichées (règle d'or du projet). */
export const FUSEAU_APP = "Africa/Brazzaville";

/**
 * Limite de taille d'un fichier de sauvegarde à la restauration. Un
 * établissement de quelques centaines d'élèves reste très loin en
 * dessous ; la limite protège surtout contre un mauvais fichier choisi
 * par erreur.
 */
export const TAILLE_MAX_SAUVEGARDE_OCTETS = 40 * 1024 * 1024;

/** Nombre de lignes groupées par instruction INSERT (compactage). */
export const LIGNES_PAR_INSERT = 200;

export type TypeObjetBase = "table" | "index" | "trigger" | "view";

/**
 * Valeur telle qu'elle voyage dans le JSON : les types SQLite simples
 * passent tels quels ; les BLOB et les grands entiers prennent un
 * marqueur pour être reconstruits à l'identique.
 */
export type ValeurSauvegardee =
  | null
  | number
  | string
  | { __blob: string }
  | { __bigint: string };

export interface ObjetSauvegarde {
  type: TypeObjetBase;
  nom: string;
  /** Instruction CREATE telle qu'inscrite dans sqlite_master. */
  sql: string;
  /** Colonnes, uniquement pour les tables (ordre de définition). */
  colonnes?: string[];
  /** Lignes de la table (ordre des colonnes ci-dessus). */
  lignes?: ValeurSauvegardee[][];
}

export interface ResumeParTable {
  table: string;
  lignes: number;
}

export interface SauvegardeDonnees {
  format: typeof FORMAT_SAUVEGARDE;
  versionFormat: number;
  /** Instant de création, en ISO UTC. */
  creeeLe: string;
  /** Même instant, lisible, sur le fuseau de l'application. */
  heureLocale: string;
  fuseau: typeof FUSEAU_APP;
  /** Dernière migration appliquée dans la base sauvegardée. */
  schemaVersion: number;
  tables: ObjetSauvegarde[];
  resume: ResumeParTable[];
}

export interface ResumeRestauration {
  tablesRestaurees: number;
  lignesRestaurees: number;
  schemaVersion: number;
  heureLocale: string;
}

/* ============================== Erreurs ============================== */

export class FichierSauvegardeInvalideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FichierSauvegardeInvalideError";
  }
}

export class SauvegardePlusRecenteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SauvegardePlusRecenteError";
  }
}

/* ============================== Dates ============================== */

const FORMATEUR_NOM_FICHIER = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_APP,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const FORMATEUR_LISIBLE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_APP,
  dateStyle: "long",
  timeStyle: "short",
});

/** Nom de fichier horodaté sur le fuseau de Brazzaville, triable. */
export function nomFichierSauvegarde(date: Date = new Date()): string {
  const parties = new Map(
    FORMATEUR_NOM_FICHIER.formatToParts(date).map((partie) => [
      partie.type as Intl.DateTimeFormatPartTypes,
      partie.value,
    ]),
  );
  const valeur = (type: Intl.DateTimeFormatPartTypes) =>
    parties.get(type) ?? "";

  return (
    "sauvegarde-gestion-scolaire-" +
    `${valeur("year")}-${valeur("month")}-${valeur("day")}` +
    `_${valeur("hour")}-${valeur("minute")}-${valeur("second")}.json`
  );
}

/** Même instant, en français lisible (« 13 novembre 2026 à 09:30 »). */
export function heureLocaleLisible(date: Date = new Date()): string {
  return FORMATEUR_LISIBLE.format(date);
}

/* ============================== Encodage ============================== */

function enBase64(octets: Uint8Array): string {
  let texte = "";

  for (let debut = 0; debut < octets.length; debut += 8192) {
    texte += String.fromCharCode(...octets.subarray(debut, debut + 8192));
  }

  return btoa(texte);
}

function depuisBase64(base64: string): Uint8Array {
  const texte = atob(base64);
  const octets = new Uint8Array(texte.length);

  for (let index = 0; index < texte.length; index++) {
    octets[index] = texte.charCodeAt(index);
  }

  return octets;
}

/** Prépare une valeur SQL pour le JSON de sauvegarde. */
export function encoderValeur(valeur: SqlValue): ValeurSauvegardee {
  if (valeur instanceof Uint8Array) {
    return { __blob: enBase64(valeur) };
  }

  // Les BLOB peuvent aussi arriver sous ces deux formes (selon le
  // runtime) : on les ramène à une vue octets sans copier le contenu.
  if (valeur instanceof Int8Array) {
    return {
      __blob: enBase64(
        new Uint8Array(valeur.buffer, valeur.byteOffset, valeur.byteLength),
      ),
    };
  }

  if (valeur instanceof ArrayBuffer) {
    return { __blob: enBase64(new Uint8Array(valeur)) };
  }

  if (typeof valeur === "bigint") {
    return { __bigint: valeur.toString() };
  }

  return valeur;
}

/** Reconstruit la valeur SQL d'origine depuis le JSON. */
export function decoderValeur(valeur: ValeurSauvegardee): SqlValue {
  if (
    valeur === null ||
    typeof valeur === "number" ||
    typeof valeur === "string"
  ) {
    return valeur;
  }

  if ("__blob" in valeur && typeof valeur.__blob === "string") {
    return depuisBase64(valeur.__blob);
  }

  if ("__bigint" in valeur && typeof valeur.__bigint === "string") {
    try {
      return BigInt(valeur.__bigint);
    } catch {
      throw new FichierSauvegardeInvalideError(
        "La sauvegarde contient un grand nombre illisible.",
      );
    }
  }

  throw new FichierSauvegardeInvalideError(
    "La sauvegarde contient une donnée dans un format inattendu.",
  );
}

/* ============================== Lecture de la base ============================== */

type LectureRequete = (sql: string, bind?: SqlValue[]) => Promise<SQLiteRow[]>;

function citerIdentifiant(nom: string): string {
  return `"${nom.replaceAll('"', '""')}"`;
}

const SQL_OBJETS = `
  SELECT type, name, sql
  FROM sqlite_master
  WHERE sql IS NOT NULL
    AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'
  ORDER BY
    CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1
              WHEN 'trigger' THEN 2 ELSE 3 END,
    name ASC;
`;

async function listerObjetsBase(
  requeter: LectureRequete,
): Promise<ObjetSauvegarde[]> {
  const lignes = await requeter(SQL_OBJETS);

  return lignes.map((ligne) => {
    const type = String(ligne.type);

    if (!["table", "index", "trigger", "view"].includes(type)) {
      throw new FichierSauvegardeInvalideError(
        `Objet de base de type inattendu : ${type}.`,
      );
    }

    return {
      type: type as TypeObjetBase,
      nom: String(ligne.name),
      sql: String(ligne.sql),
    };
  });
}

async function colonnesTable(
  requeter: LectureRequete,
  nomTable: string,
): Promise<string[]> {
  const lignes = await requeter(
    `PRAGMA table_info(${citerIdentifiant(nomTable)});`,
  );

  return lignes.map((ligne) => String(ligne.name));
}

async function lignesTable(
  requeter: LectureRequete,
  nomTable: string,
): Promise<ValeurSauvegardee[][]> {
  const lignes = await requeter(`SELECT * FROM ${citerIdentifiant(nomTable)};`);

  return lignes.map((ligne) =>
    Object.keys(ligne).map((colonne) =>
      encoderValeur(ligne[colonne] as SqlValue),
    ),
  );
}

async function lireVersionSchema(requeter: LectureRequete): Promise<number> {
  const lignes = await requeter(
    "SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;",
  );
  const version = Number(lignes[0]?.version ?? 0);

  return Number.isSafeInteger(version) ? version : 0;
}

/**
 * Construit la sauvegarde complète (schéma + données) en lisant la base
 * via la fonction de requête fournie (client réel ou SQLite de test).
 */
export async function genererSauvegardeDepuisBase(
  requeter: LectureRequete,
): Promise<SauvegardeDonnees> {
  const objets = await listerObjetsBase(requeter);
  const tables: ObjetSauvegarde[] = [];

  for (const objet of objets) {
    if (objet.type !== "table") {
      tables.push(objet);
      continue;
    }

    const colonnes = await colonnesTable(requeter, objet.nom);
    const lignes = await lignesTable(requeter, objet.nom);

    tables.push({ ...objet, colonnes, lignes });
  }

  const resume: ResumeParTable[] = tables
    .filter((objet) => objet.type === "table")
    .map((objet) => ({ table: objet.nom, lignes: objet.lignes?.length ?? 0 }));

  const maintenant = new Date();

  return {
    format: FORMAT_SAUVEGARDE,
    versionFormat: VERSION_FORMAT_SAUVEGARDE,
    creeeLe: maintenant.toISOString(),
    heureLocale: heureLocaleLisible(maintenant),
    fuseau: FUSEAU_APP,
    schemaVersion: await lireVersionSchema(requeter),
    tables,
    resume,
  };
}

/* ============================== Validation ============================== */

function validerStructure(objetInconnu: unknown): SauvegardeDonnees {
  if (typeof objetInconnu !== "object" || objetInconnu === null) {
    throw new FichierSauvegardeInvalideError(
      "Ce fichier n'est pas une sauvegarde de l'application.",
    );
  }

  const donnees = objetInconnu as Record<string, unknown>;

  if (donnees.format !== FORMAT_SAUVEGARDE) {
    throw new FichierSauvegardeInvalideError(
      "Ce fichier ne vient pas de la sauvegarde de Gestion scolaire. " +
        "Choisissez un fichier .json téléchargé avec le bouton « Sauvegarder ».",
    );
  }

  if (donnees.versionFormat !== VERSION_FORMAT_SAUVEGARDE) {
    throw new FichierSauvegardeInvalideError(
      "Ce fichier a été créé par une version différente de l'application. " +
        "Mettez l'application à jour, puis réessayez.",
    );
  }

  if (
    typeof donnees.schemaVersion !== "number" ||
    typeof donnees.heureLocale !== "string" ||
    !Array.isArray(donnees.tables)
  ) {
    throw new FichierSauvegardeInvalideError(
      "La sauvegarde est incomplète ou abîmée.",
    );
  }

  for (const objet of donnees.tables) {
    if (typeof objet !== "object" || objet === null) {
      throw new FichierSauvegardeInvalideError(
        "La sauvegarde contient un objet de base illisible.",
      );
    }

    const decrit = objet as Record<string, unknown>;

    if (
      !["table", "index", "trigger", "view"].includes(String(decrit.type)) ||
      typeof decrit.nom !== "string" ||
      !decrit.nom.trim() ||
      typeof decrit.sql !== "string" ||
      !decrit.sql.trim()
    ) {
      throw new FichierSauvegardeInvalideError(
        "La sauvegarde contient une instruction de reconstruction illisible.",
      );
    }

    if (
      decrit.type === "table" &&
      (!Array.isArray(decrit.colonnes) ||
        !Array.isArray(decrit.lignes) ||
        decrit.colonnes.some((colonne) => typeof colonne !== "string"))
    ) {
      throw new FichierSauvegardeInvalideError(
        `Les données de la table « ${String(decrit.nom)} » sont illisibles.`,
      );
    }
  }

  return donnees as unknown as SauvegardeDonnees;
}

/**
 * Contrôle un texte de sauvegarde avant de l'appliquer : format, version
 * du format, structure des objets, et fraîcheur par rapport à la base
 * actuelle (une sauvegarde plus récente que la base est refusée).
 */
export function validerSauvegarde(
  texte: string,
  versionSchemaActuelle: number,
): SauvegardeDonnees {
  let objetInconnu: unknown;

  try {
    objetInconnu = JSON.parse(texte);
  } catch {
    throw new FichierSauvegardeInvalideError(
      "Ce fichier n'est pas lisible : ce n'est pas un fichier de sauvegarde JSON.",
    );
  }

  const sauvegarde = validerStructure(objetInconnu);

  if (sauvegarde.schemaVersion > versionSchemaActuelle) {
    throw new SauvegardePlusRecenteError(
      `Cette sauvegarde vient d'une version plus récente de l'application ` +
        `(base v${sauvegarde.schemaVersion} ici v${versionSchemaActuelle}). ` +
        "Mettez d'abord l'application à jour, puis réessayez.",
    );
  }

  return sauvegarde;
}

/* ============================== Reconstruction ============================== */

const VERBES_DROP: Record<TypeObjetBase, string> = {
  table: "DROP TABLE",
  view: "DROP VIEW",
  trigger: "DROP TRIGGER",
  index: "DROP INDEX",
};

/** Tables d'abord, puis le reste (les IF EXISTS tolèrent l'ordre). */
function priorite(type: TypeObjetBase): number {
  return type === "table" ? 0 : 1;
}

/**
 * Ordre de recréation des objets NON tables, après l'insertion des
 * données : les vues (certains index ou triggers peuvent s'y référer),
 * puis les index, puis les triggers métier — qui font des contrôles
 * croisés entre tables et doivent donc n'exister qu'UNE fois les
 * données en place.
 */
function prioriteRecreation(type: TypeObjetBase): number {
  if (type === "view") return 0;
  if (type === "index") return 1;

  return 2; // trigger
}

function compacter<T>(elements: T[], taille: number): T[][] {
  const paquets: T[][] = [];

  for (let debut = 0; debut < elements.length; debut += taille) {
    paquets.push(elements.slice(debut, debut + taille));
  }

  return paquets;
}

/**
 * Prépare la liste ordonnée d'instructions : nettoyage de l'existant,
 * reconstruction des TABLES, insertion des données (colonnes toujours
 * nommées, valeurs toujours paramétrées), puis seulement à la fin la
 * recréation des vues, index et TRIGGERS métier — ces derniers font des
 * contrôles croisés entre tables et doivent n'exister qu'une fois les
 * données en place, sinon chaque INSERT serait jugé sur une base à
 * moitié vide et refusé.
 */
export function construireInstructionsRestauration(
  sauvegarde: SauvegardeDonnees,
  objetsActuels: ObjetSauvegarde[],
): SQLiteStatement[] {
  const instructions: SQLiteStatement[] = [];

  for (const objet of [...objetsActuels].sort(
    (a, b) => priorite(a.type) - priorite(b.type),
  )) {
    instructions.push({
      sql: `${VERBES_DROP[objet.type]} IF EXISTS ${citerIdentifiant(objet.nom)};`,
    });
  }

  // 2) Tables de la sauvegarde (les vues/index/triggers viendront plus tard).
  for (const objet of sauvegarde.tables) {
    if (objet.type !== "table") continue;

    instructions.push({
      sql: objet.sql.endsWith(";") ? objet.sql : `${objet.sql};`,
    });
  }

  // 3) Données — clés étrangères désactivées : l'ordre des tables est libre.
  for (const objet of sauvegarde.tables) {
    if (objet.type !== "table") continue;

    const colonnes = objet.colonnes ?? [];
    const lignes = objet.lignes ?? [];

    if (colonnes.length === 0 || lignes.length === 0) continue;

    const prefixe = `INSERT INTO ${citerIdentifiant(objet.nom)} (${colonnes
      .map(citerIdentifiant)
      .join(", ")}) VALUES `;

    for (const paquet of compacter(lignes, LIGNES_PAR_INSERT)) {
      const placeholders = paquet
        .map(() => `(${colonnes.map(() => "?").join(", ")})`)
        .join(", ");
      const bind = paquet.flat().map(decoderValeur);

      instructions.push({ sql: `${prefixe}${placeholders};`, bind });
    }
  }

  // 4) Vues, index et triggers métier, une fois les données en place.
  for (const objet of [...sauvegarde.tables]
    .filter((objet) => objet.type !== "table")
    .sort(
      (a, b) => prioriteRecreation(a.type) - prioriteRecreation(b.type),
    )) {
    instructions.push({
      sql: objet.sql.endsWith(";") ? objet.sql : `${objet.sql};`,
    });
  }

  return instructions;
}

/* ============================== Application ============================== */

/**
 * Applique la sauvegarde dans la base : tout ou rien, dans une
 * transaction unique. Le PRAGMA foreign_keys est désactivé avant le
 * BEGIN (il serait ignoré à l'intérieur) et TOUJOURS réactivé ensuite,
 * y compris en cas d'échec.
 */
export async function appliquerSauvegarde(
  requeter: LectureRequete,
  transactionner: (statements: SQLiteStatement[]) => Promise<unknown>,
  sauvegarde: SauvegardeDonnees,
): Promise<{ tablesRestaurees: number; lignesRestaurees: number }> {
  await requeter("PRAGMA foreign_keys = OFF;");

  try {
    const objetsActuels = await listerObjetsBase(requeter);
    const instructions = construireInstructionsRestauration(
      sauvegarde,
      objetsActuels,
    );

    if (instructions.length === 0) {
      throw new FichierSauvegardeInvalideError(
        "La sauvegarde ne contient rien à restaurer.",
      );
    }

    await transactionner(instructions);

    const tablesRestaurees = sauvegarde.tables.filter(
      (objet) => objet.type === "table",
    ).length;
    const lignesRestaurees = sauvegarde.resume.reduce(
      (total, table) => total + table.lignes,
      0,
    );

    return { tablesRestaurees, lignesRestaurees };
  } finally {
    await requeter("PRAGMA foreign_keys = ON;");
  }
}

/* ============================== Actions de haut niveau ============================== */

export interface ResultatSauvegarde {
  nomFichier: string;
  contenu: string;
  tailleOctets: number;
  donnees: SauvegardeDonnees;
}

/** Lit la base réelle et produit le contenu JSON à télécharger. */
export async function faireSauvegarde(): Promise<ResultatSauvegarde> {
  const donnees = await genererSauvegardeDepuisBase(executerRequete);
  const contenu = JSON.stringify(donnees);

  return {
    nomFichier: nomFichierSauvegarde(new Date()),
    contenu,
    tailleOctets: new TextEncoder().encode(contenu).length,
    donnees,
  };
}

/**
 * Valide puis applique un fichier choisi par l'utilisateur dans la base
 * réelle. Ne touche pas à la zone gelée : tout passe par l'API publique
 * du client SQLite.
 */
export async function restaurerDepuisFichier(
  fichier: File,
): Promise<ResumeRestauration> {
  if (fichier.size > TAILLE_MAX_SAUVEGARDE_OCTETS) {
    throw new FichierSauvegardeInvalideError(
      "Ce fichier est trop volumineux. La limite est de 40 Mo.",
    );
  }

  const texte = await fichier.text();
  const versionSchemaActuelle = await lireVersionSchema(executerRequete);
  const sauvegarde = validerSauvegarde(texte, versionSchemaActuelle);
  const { tablesRestaurees, lignesRestaurees } = await appliquerSauvegarde(
    executerRequete,
    executerTransaction,
    sauvegarde,
  );

  return {
    tablesRestaurees,
    lignesRestaurees,
    schemaVersion: sauvegarde.schemaVersion,
    heureLocale: sauvegarde.heureLocale,
  };
}
