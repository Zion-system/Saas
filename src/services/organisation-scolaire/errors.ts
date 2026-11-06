import { SQLiteCommandError } from "../../database/local/sqlite.client";

export class ErreurServiceOrganisation extends Error {
  readonly code: string;

  constructor(code: string, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ErreurServiceOrganisation";
    this.code = code;
  }
}

export class EntiteIntrouvableError extends ErreurServiceOrganisation {
  constructor(message: string) {
    super("ENTITE_INTROUVABLE", message);
    this.name = "EntiteIntrouvableError";
  }
}

export class ConflitOrganisationError extends ErreurServiceOrganisation {
  constructor(message: string, cause?: unknown) {
    super("CONFLIT", message, cause);
    this.name = "ConflitOrganisationError";
  }
}

export class ReferenceOrganisationError extends ErreurServiceOrganisation {
  constructor(message: string, cause?: unknown) {
    super("REFERENCE_INVALIDE", message, cause);
    this.name = "ReferenceOrganisationError";
  }
}

export class IntegriteOrganisationError extends ErreurServiceOrganisation {
  constructor(message: string, cause?: unknown) {
    super("INTEGRITE", message, cause);
    this.name = "IntegriteOrganisationError";
  }
}

export class TransitionStatutError extends ErreurServiceOrganisation {
  constructor(message: string) {
    super("TRANSITION_STATUT_INVALIDE", message);
    this.name = "TransitionStatutError";
  }
}

export function traduireErreurSQLite<T>(
  entite: string,
  operation: () => Promise<T>,
): Promise<T> {
  return operation().catch((error: unknown) => {
    if (!(error instanceof SQLiteCommandError)) {
      throw error;
    }

    const resultCode = error.resultCode;
    const message = error.message.toUpperCase();

    if (resultCode === 787 || message.includes("FOREIGN KEY CONSTRAINT")) {
      throw new ReferenceOrganisationError(
        `${entite} : une référence inexistante ou utilisée empêche cette opération.`,
        error,
      );
    }

    if (
      resultCode === 1555 ||
      resultCode === 2067 ||
      message.includes("UNIQUE CONSTRAINT") ||
      message.includes("PRIMARY KEY")
    ) {
      throw new ConflitOrganisationError(
        `${entite} : une contrainte d’unicité est violée.`,
        error,
      );
    }

    // Conflits métier déclenchés explicitement par les triggers.
    const conflitsMetier = [
      "LES PÉRIODES D’UN MÊME COUPLE ÉLÈVE-RESPONSABLE NE PEUVENT PAS SE CHEVAUCHER",
      "LES PÉRIODES DE MATRICULE D’UN MÊME ÉLÈVE NE PEUVENT PAS SE CHEVAUCHER",
      "UNE NOUVELLE ATTRIBUTION DOIT ÊTRE COURANTE",
      "UNE RELATION ACTIVE NE PEUT ÊTRE CLÔTURÉE QU’UNE FOIS",
      "UNE ATTRIBUTION DE MATRICULE NE PEUT ÊTRE CLÔTURÉE QU’UNE FOIS",
    ];

    if (conflitsMetier.some((fragment) => message.includes(fragment))) {
      throw new ConflitOrganisationError(
        `${entite} : l’opération entre en conflit avec l’historique ou l’état actuel des données.`,
        error,
      );
    }

    if (
      resultCode === 275 ||
      resultCode === 1299 ||
      resultCode === 1811 ||
      message.includes("CHECK CONSTRAINT") ||
      message.includes("NOT NULL CONSTRAINT")
    ) {
      throw new IntegriteOrganisationError(
        `${entite} : les données ne respectent pas une contrainte SQLite.`,
        error,
      );
    }

    throw error;
  });
}
