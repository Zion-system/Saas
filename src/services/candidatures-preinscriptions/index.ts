import { sqliteWorkerExecutor } from "../../database/local/sqlite.executor";
import { creerServiceCandidatures } from "./candidatures.service";
import { creerServicePreinscriptions } from "./preinscriptions.service";

export { creerServiceCandidatures } from "./candidatures.service";
export { creerServicePreinscriptions } from "./preinscriptions.service";
export * from "./errors";
export * from "./types";

export function creerServicesCandidaturesPreinscriptions(
  database = sqliteWorkerExecutor,
) {
  return {
    candidatures: creerServiceCandidatures(database),
    preinscriptions: creerServicePreinscriptions(database),
  };
}

export const servicesCandidaturesPreinscriptions =
  creerServicesCandidaturesPreinscriptions();
