import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { EntiteIntrouvableError } from "./errors";

export async function selectionner<T>(
  database: SQLiteExecutor,
  sql: string,
  bind: (string | number | null)[] = [],
): Promise<T[]> {
  return (await database.query(sql, bind)) as unknown as T[];
}

export function exigerLigne<T>(
  rows: unknown[],
  entite: string,
  identifiant: string,
): T {
  const row = rows[0];

  if (!row) {
    throw new EntiteIntrouvableError(
      `${entite} « ${identifiant} » est introuvable.`,
    );
  }

  return row as T;
}

export function erreurIntrouvable(entite: string, identifiant: string): never {
  throw new EntiteIntrouvableError(
    `${entite} « ${identifiant} » est introuvable.`,
  );
}
