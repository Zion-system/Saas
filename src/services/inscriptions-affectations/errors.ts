import { SQLiteCommandError } from "../../database/local/sqlite.client";
import {
  ConflitOrganisationError,
  EntiteIntrouvableError,
  ErreurServiceOrganisation,
  IntegriteOrganisationError,
  ReferenceOrganisationError,
  traduireErreurSQLite,
} from "../organisation-scolaire/errors";

export {
  ConflitOrganisationError,
  EntiteIntrouvableError,
  ReferenceOrganisationError,
};

export class InscriptionIntrouvableError extends EntiteIntrouvableError {
  constructor(id: string) {
    super(`L’inscription « ${id} » est introuvable.`);
    this.name = "InscriptionIntrouvableError";
  }
}

export class AffectationCouranteIntrouvableError extends EntiteIntrouvableError {
  constructor(idInscription: string) {
    super(
      `Aucune affectation courante n’existe pour l’inscription « ${idInscription} ».`,
    );
    this.name = "AffectationCouranteIntrouvableError";
  }
}

export class EtatInscriptionInvalideError extends ErreurServiceOrganisation {
  constructor(etat: string) {
    super(
      "ETAT_INSCRIPTION_INVALIDE",
      `L’état « ${etat} » n’est pas autorisé pour une inscription.`,
    );
    this.name = "EtatInscriptionInvalideError";
  }
}

export class DateAffectationInvalideError extends ErreurServiceOrganisation {
  constructor(date: string) {
    super(
      "DATE_AFFECTATION_INVALIDE",
      `La date « ${date} » doit être une date civile ISO YYYY-MM-DD valide.`,
    );
    this.name = "DateAffectationInvalideError";
  }
}

export class PeriodeAffectationInvalideError extends ErreurServiceOrganisation {
  constructor(message: string) {
    super("PERIODE_AFFECTATION_INVALIDE", message);
    this.name = "PeriodeAffectationInvalideError";
  }
}

export class ChevauchementAffectationError extends ConflitOrganisationError {
  constructor(cause?: unknown) {
    super("La période demandée chevauche une affectation existante.", cause);
    this.name = "ChevauchementAffectationError";
  }
}

export class CapaciteClasseAtteinteError extends ConflitOrganisationError {
  constructor(cause?: unknown) {
    super("La capacité maximale de la classe annuelle est atteinte.", cause);
    this.name = "CapaciteClasseAtteinteError";
  }
}

export function traduireErreurInscriptionsAffectations<T>(
  entite: string,
  operation: () => Promise<T>,
): Promise<T> {
  return traduireErreurSQLite(entite, operation).catch((error: unknown) => {
    if (
      error instanceof IntegriteOrganisationError &&
      error.cause instanceof SQLiteCommandError
    ) {
      const message = error.cause.message.toUpperCase();

      if (
        message.includes(
          "LA CAPACITÉ MAXIMALE DE LA CLASSE ANNUELLE EST ATTEINTE",
        )
      ) {
        throw new CapaciteClasseAtteinteError(error.cause);
      }
      if (message.includes("LES PÉRIODES D’AFFECTATION")) {
        throw new ChevauchementAffectationError(error.cause);
      }
      if (message.includes("L’AFFECTATION DOIT RELIER")) {
        throw new ReferenceOrganisationError(
          "L’affectation doit concerner une inscription et une classe annuelle du même établissement et de la même année.",
          error.cause,
        );
      }
      if (
        message.includes("L’ÉLÈVE D’UNE INSCRIPTION NE PEUT PAS ÊTRE MODIFIÉ")
      ) {
        throw new ConflitOrganisationError(
          "L’élève d’une inscription ne peut pas être modifié après une affectation de classe.",
          error.cause,
        );
      }
    }

    throw error;
  });
}
