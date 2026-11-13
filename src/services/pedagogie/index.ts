import { sqliteWorkerExecutor } from "../../database/local/sqlite.executor";
import { creerServiceMatieres } from "./matieres.service";
import { creerServiceProfesseurs } from "./professeurs.service";

export { creerServiceMatieres } from "./matieres.service";
export { creerServiceProfesseurs } from "./professeurs.service";
export * from "./errors";
export * from "./types";

export function creerServicesPedagogiques(database = sqliteWorkerExecutor) {
  return {
    professeurs: creerServiceProfesseurs(database),
    matieres: creerServiceMatieres(database),
  };
}

/** Point d'entrée unique des écrans Professeurs et Matières. */
export const servicesPedagogiques = creerServicesPedagogiques();
