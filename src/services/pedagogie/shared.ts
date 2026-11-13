import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { EntiteIntrouvableError } from "../organisation-scolaire/errors";

export async function selectionner<T>(
  database: SQLiteExecutor,
  sql: string,
  bind: (string | number | null)[] = [],
): Promise<T[]> {
  return (await database.query(sql, bind)) as unknown as T[];
}

/** Exige qu'une opération ait retourné une ligne, sinon entité introuvable. */
export function exigerLigne<T>(
  rows: unknown[],
  entite: string,
  id: string,
): T {
  if (!rows[0]) {
    throw new EntiteIntrouvableError(
      `${entite} « ${id} » est introuvable.`,
    );
  }
  return rows[0] as T;
}

/** Nettoie une saisie : espaces de bord retirés, espaces internes compactés. */
export function textePropre(valeur: string): string {
  return valeur.trim().replace(/\s+/g, " ");
}

/** Transforme une saisie facultative en valeur de colonne (null si vide). */
export function texteFacultatif(
  valeur: string | null | undefined,
): string | null {
  const propre =
    valeur === null || valeur === undefined ? "" : textePropre(valeur);
  return propre === "" ? null : propre;
}
