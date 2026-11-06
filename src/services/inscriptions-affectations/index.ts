import { sqliteWorkerExecutor } from "../../database/local/sqlite.executor";
import { creerServiceAffectationsClasse } from "./affectations-classe.service";
import { creerServiceInscriptions } from "./inscriptions.service";

export { creerServiceAffectationsClasse } from "./affectations-classe.service";
export { creerServiceInscriptions } from "./inscriptions.service";
export * from "./errors";
export * from "./types";

export function creerServicesInscriptionsAffectations(
  database = sqliteWorkerExecutor,
) {
  return {
    inscriptions: creerServiceInscriptions(database),
    affectationsClasses: creerServiceAffectationsClasse(database),
  };
}

export const servicesInscriptionsAffectations =
  creerServicesInscriptionsAffectations();
