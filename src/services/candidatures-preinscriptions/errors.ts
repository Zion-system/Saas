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
  ErreurServiceOrganisation,
  IntegriteOrganisationError,
  ReferenceOrganisationError,
  traduireErreurSQLite,
};

export const MESSAGE_REFERENCE_EXCLUSIVE =
  "Une préinscription doit référencer exactement une candidature ou un élève.";

export class CandidatureIntrouvableError extends EntiteIntrouvableError {
  constructor(id: string) {
    super(`La candidature « ${id} » est introuvable.`);
    this.name = "CandidatureIntrouvableError";
  }
}

export class PreinscriptionIntrouvableError extends EntiteIntrouvableError {
  constructor(id: string) {
    super(`La préinscription « ${id} » est introuvable.`);
    this.name = "PreinscriptionIntrouvableError";
  }
}

export class ReferenceCandidaturesPreinscriptionsError extends ReferenceOrganisationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ReferenceCandidaturesPreinscriptionsError";
  }
}

export class ConflitIdentifiantCandidaturesError extends ConflitOrganisationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ConflitIdentifiantCandidaturesError";
  }
}

export class IntegriteCandidaturesPreinscriptionsError extends IntegriteOrganisationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "IntegriteCandidaturesPreinscriptionsError";
  }
}

function messageSQLite(cause: unknown): string {
  return cause instanceof Error ? cause.message.toUpperCase() : "";
}

function estContrainteCheck(cause: unknown): boolean {
  if (cause instanceof SQLiteCommandError && cause.resultCode === 275) {
    return true;
  }
  return messageSQLite(cause).includes("CHECK CONSTRAINT");
}

export async function traduireErreurCandidaturesPreinscriptions<T>(
  entite: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await traduireErreurSQLite(entite, operation);
  } catch (error) {
    if (error instanceof ConflitOrganisationError) {
      throw new ConflitIdentifiantCandidaturesError(error.message, error.cause);
    }

    if (error instanceof ReferenceOrganisationError) {
      throw new ReferenceCandidaturesPreinscriptionsError(error.message, error.cause);
    }

    if (error instanceof IntegriteOrganisationError) {
      throw new IntegriteCandidaturesPreinscriptionsError(
        estContrainteCheck(error.cause) ? MESSAGE_REFERENCE_EXCLUSIVE : error.message,
        error.cause,
      );
    }

    throw error;
  }
}
