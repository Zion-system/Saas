import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { EntiteIntrouvableError } from "../organisation-scolaire/errors";
import {
  IntegriteCandidaturesPreinscriptionsError,
  MESSAGE_REFERENCE_EXCLUSIVE,
} from "./errors";

export async function selectionner<T>(
  database: SQLiteExecutor,
  sql: string,
  bind: (string | number | null)[] = [],
): Promise<T[]> {
  return (await database.query(sql, bind)) as unknown as T[];
}

export function exigerLigne<T>(rows: unknown[], entite: string, id: string): T {
  if (!rows[0]) {
    throw new EntiteIntrouvableError(`${entite} « ${id} » est introuvable.`);
  }
  return rows[0] as T;
}

export function validerReferenceExclusive(
  idCandidature: string | null,
  idEleve: string | null,
): void {
  const candidatureRenseignee = idCandidature !== null;
  const eleveRenseigne = idEleve !== null;
  if (candidatureRenseignee === eleveRenseigne) {
    throw new IntegriteCandidaturesPreinscriptionsError(MESSAGE_REFERENCE_EXCLUSIVE);
  }
}
