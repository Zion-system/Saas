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

export class ErreurMetierElevesResponsables extends ErreurServiceOrganisation {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ErreurMetierElevesResponsables";
  }
}

export class DateCivileInvalideError extends ErreurMetierElevesResponsables {
  constructor(date: string) {
    super("DATE_INVALIDE", `La date « ${date} » doit être une date civile ISO YYYY-MM-DD valide.`);
    this.name = "DateCivileInvalideError";
  }
}

export class NatureLienInactiveError extends ErreurMetierElevesResponsables {
  constructor(id: string) {
    super("NATURE_LIEN_INACTIVE", `La nature de lien « ${id} » est absente ou inactive.`);
    this.name = "NatureLienInactiveError";
  }
}

export class MatriculeInitialDejaAttribueError extends ConflitOrganisationError {
  constructor(idEleve: string) {
    super(`L’élève « ${idEleve} » possède déjà un matricule courant.`);
    this.name = "MatriculeInitialDejaAttribueError";
  }
}

export class CorrectionMatriculeSansHistoriqueError extends ErreurMetierElevesResponsables {
  constructor(idEleve: string) {
    super("CORRECTION_SANS_MATRICULE_COURANT", `L’élève « ${idEleve} » ne possède pas de matricule à corriger.`);
    this.name = "CorrectionMatriculeSansHistoriqueError";
  }
}

export class MotifCorrectionObligatoireError extends ErreurMetierElevesResponsables {
  constructor() {
    super("MOTIF_OBLIGATOIRE", "Un motif non vide est obligatoire pour corriger un matricule.");
    this.name = "MotifCorrectionObligatoireError";
  }
}

export class PeriodeRelationInvalideError extends ErreurMetierElevesResponsables {
  constructor(message: string) {
    super("PERIODE_RELATION_INVALIDE", message);
    this.name = "PeriodeRelationInvalideError";
  }
}

export class ResponsabiliteInvalideError extends ErreurMetierElevesResponsables {
  constructor(nom: string) {
    super("RESPONSABILITE_INVALIDE", `${nom} doit valoir 0 ou 1.`);
    this.name = "ResponsabiliteInvalideError";
  }
}
