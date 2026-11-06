import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import {
  DateAffectationInvalideError,
  EtatInscriptionInvalideError,
} from "./errors";
import { ETATS_INSCRIPTION, type EtatInscription } from "./types";

export async function selectionner<T>(
  database: SQLiteExecutor,
  sql: string,
  bind: (string | number | null)[] = [],
): Promise<T[]> {
  return (await database.query(sql, bind)) as unknown as T[];
}

export function validerEtatInscription(
  etat: string,
): asserts etat is EtatInscription {
  if (!ETATS_INSCRIPTION.includes(etat as EtatInscription)) {
    throw new EtatInscriptionInvalideError(etat);
  }
}

export function validerDateCivileISO(date: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new DateAffectationInvalideError(date);

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
    throw new DateAffectationInvalideError(date);
  }
}
