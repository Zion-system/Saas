import {
  ConflitOrganisationError,
  ErreurServiceOrganisation,
  traduireErreurSQLite,
} from "../organisation-scolaire/errors";

export { traduireErreurSQLite };
export { ConflitOrganisationError };
export {
  EntiteIntrouvableError,
  ReferenceOrganisationError,
} from "../organisation-scolaire/errors";

export class ErreurMetierPedagogie extends ErreurServiceOrganisation {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ErreurMetierPedagogie";
  }
}

export class ProfesseurInvalideError extends ErreurMetierPedagogie {
  constructor(message: string) {
    super("PROFESSEUR_INVALIDE", message);
    this.name = "ProfesseurInvalideError";
  }
}

export class MatiereInvalideError extends ErreurMetierPedagogie {
  constructor(message: string) {
    super("MATIERE_INVALIDE", message);
    this.name = "MatiereInvalideError";
  }
}

export class MatiereDoublonError extends ConflitOrganisationError {
  constructor(libelle: string) {
    super(`Une matière « ${libelle} » existe déjà dans le référentiel.`);
    this.name = "MatiereDoublonError";
  }
}

export class MatiereCodeDoublonError extends ConflitOrganisationError {
  constructor(code: string) {
    super(`Le code « ${code} » est déjà utilisé par une autre matière.`);
    this.name = "MatiereCodeDoublonError";
  }
}
