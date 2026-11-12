import { sqliteWorkerExecutor } from "../../database/local/sqlite.executor";
import { creerServiceDossiersEleves } from "./dossiers.service";
import { creerServiceEleves } from "./eleves.service";
import { creerServiceMatricules } from "./matricules.service";
import { creerServiceNaturesLiens } from "./natures-liens.service";
import { creerServiceRelationsEleveResponsable } from "./relations.service";
import { creerServiceResponsables } from "./responsables.service";

export { creerServiceDossiersEleves } from "./dossiers.service";
export type {
  DonneesDossierEleve,
  DonneesModificationEleve,
  DossierEleve,
  ParentDeclare,
} from "./dossiers.service";
export { creerServiceEleves } from "./eleves.service";
export { creerServiceMatricules } from "./matricules.service";
export { creerServiceNaturesLiens } from "./natures-liens.service";
export { creerServiceRelationsEleveResponsable } from "./relations.service";
export { creerServiceResponsables } from "./responsables.service";
export * from "./errors";
export * from "./types";

export function creerServicesElevesResponsables(database = sqliteWorkerExecutor) {
  return {
    dossiers: creerServiceDossiersEleves(database),
    eleves: creerServiceEleves(database),
    responsables: creerServiceResponsables(database),
    naturesLiens: creerServiceNaturesLiens(database),
    relations: creerServiceRelationsEleveResponsable(database),
    matricules: creerServiceMatricules(database),
  };
}

export const servicesElevesResponsables = creerServicesElevesResponsables();
