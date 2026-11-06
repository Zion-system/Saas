import { ConflitOrganisationError, EntiteIntrouvableError } from "../organisation-scolaire/errors";
import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import type { SQLiteRow } from "../../database/local/sqlite.types";
import {
  DateCivileInvalideError,
  PeriodeRelationInvalideError,
  ResponsabiliteInvalideError,
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

export function validerDateCivileISO(date: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new DateCivileInvalideError(date);

  const annee = Number(match[1]);
  const mois = Number(match[2]);
  const jour = Number(match[3]);
  const valeur = new Date(0);
  valeur.setUTCHours(0, 0, 0, 0);
  valeur.setUTCFullYear(annee, mois - 1, jour);

  if (
    valeur.getUTCFullYear() !== annee ||
    valeur.getUTCMonth() !== mois - 1 ||
    valeur.getUTCDate() !== jour
  ) {
    throw new DateCivileInvalideError(date);
  }
}

export function validerPeriode(debut: string, fin: string | null): void {
  validerDateCivileISO(debut);
  if (fin !== null) {
    validerDateCivileISO(fin);
    if (fin <= debut) {
      throw new PeriodeRelationInvalideError(
        "La date de fin doit être strictement postérieure à la date de début.",
      );
    }
  }
}

export function conflitSiAbsent(rows: unknown[], entite: string, id: string): never {
  if (!rows[0]) throw new EntiteIntrouvableError(`${entite} « ${id} » est introuvable.`);
  throw new ConflitOrganisationError(`${entite} « ${id} » a été modifié par une opération concurrente.`);
}

export function validerDrapeau(value: number, nom: string): void {
  if (value !== 0 && value !== 1) {
    throw new ResponsabiliteInvalideError(nom);
  }
}

export function premiereLigne<T>(rows: SQLiteRow[], entite: string, id: string): T {
  return exigerLigne<T>(rows, entite, id);
}
