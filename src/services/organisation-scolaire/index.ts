import { sqliteWorkerExecutor } from "../../database/local/sqlite.executor";
import { creerServiceAnneesScolaires } from "./annees-scolaires.service";
import { creerServiceClassesAnnuelles } from "./classes-annuelles.service";
import { creerServiceEtablissements } from "./etablissements.service";
import { creerServicePeriodesPedagogiques } from "./periodes-pedagogiques.service";
import {
  creerServiceCyclesEnseignement,
  creerServiceModelesClasse,
  creerServiceNiveauxEnseignement,
} from "./referentiels-enseignement.service";

export { creerServiceAnneesScolaires } from "./annees-scolaires.service";
export { creerServiceClassesAnnuelles } from "./classes-annuelles.service";
export { creerServiceEtablissements } from "./etablissements.service";
export { creerServicePeriodesPedagogiques } from "./periodes-pedagogiques.service";
export {
  creerServiceCyclesEnseignement,
  creerServiceModelesClasse,
  creerServiceNiveauxEnseignement,
} from "./referentiels-enseignement.service";
export * from "./errors";
export * from "./types";

export function creerServicesOrganisationScolaire(
  database = sqliteWorkerExecutor,
) {
  return {
    etablissements: creerServiceEtablissements(database),
    anneesScolaires: creerServiceAnneesScolaires(database),
    periodesPedagogiques: creerServicePeriodesPedagogiques(database),
    cyclesEnseignement: creerServiceCyclesEnseignement(database),
    niveauxEnseignement: creerServiceNiveauxEnseignement(database),
    modelesClasse: creerServiceModelesClasse(database),
    classesAnnuelles: creerServiceClassesAnnuelles(database),
  };
}

export const servicesOrganisationScolaire = creerServicesOrganisationScolaire();
