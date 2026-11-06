import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import {
  CandidatureIntrouvableError,
  traduireErreurCandidaturesPreinscriptions,
} from "./errors";
import { exigerLigne, selectionner } from "./shared";
import type { Candidature, CreerCandidature } from "./types";

export function creerServiceCandidatures(database: SQLiteExecutor) {
  return {
    async creer(candidature: CreerCandidature): Promise<Candidature> {
      const rows = await traduireErreurCandidaturesPreinscriptions("La candidature", () =>
        database.query(
          `INSERT INTO candidature (id_candidature)
           VALUES (?)
           RETURNING id_candidature;`,
          [candidature.id_candidature],
        ),
      );
      return exigerLigne(rows, "La candidature", candidature.id_candidature);
    },

    async obtenir(id: string): Promise<Candidature> {
      const rows = await selectionner<Candidature>(
        database,
        `SELECT id_candidature
         FROM candidature
         WHERE id_candidature = ?;`,
        [id],
      );
      const candidature = rows[0];
      if (!candidature) throw new CandidatureIntrouvableError(id);
      return candidature;
    },

    async lister(): Promise<Candidature[]> {
      return selectionner(
        database,
        `SELECT id_candidature
         FROM candidature
         ORDER BY id_candidature;`,
      );
    },
  };
}
