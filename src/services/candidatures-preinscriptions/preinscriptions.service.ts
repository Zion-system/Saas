import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import {
  PreinscriptionIntrouvableError,
  traduireErreurCandidaturesPreinscriptions,
} from "./errors";
import { exigerLigne, selectionner, validerReferenceExclusive } from "./shared";
import type { CreerPreinscription, Preinscription } from "./types";

export function creerServicePreinscriptions(database: SQLiteExecutor) {
  return {
    async creer(preinscription: CreerPreinscription): Promise<Preinscription> {
      validerReferenceExclusive(preinscription.id_candidature, preinscription.id_eleve);
      const rows = await traduireErreurCandidaturesPreinscriptions("La préinscription", () =>
        database.query(
          `INSERT INTO preinscription (id_preinscription, id_candidature, id_eleve)
           VALUES (?, ?, ?)
           RETURNING id_preinscription, id_candidature, id_eleve;`,
          [
            preinscription.id_preinscription,
            preinscription.id_candidature,
            preinscription.id_eleve,
          ],
        ),
      );
      return exigerLigne(rows, "La préinscription", preinscription.id_preinscription);
    },

    async obtenir(id: string): Promise<Preinscription> {
      const rows = await selectionner<Preinscription>(
        database,
        `SELECT id_preinscription, id_candidature, id_eleve
         FROM preinscription
         WHERE id_preinscription = ?;`,
        [id],
      );
      const ligne = rows[0];
      if (!ligne) throw new PreinscriptionIntrouvableError(id);
      return ligne;
    },

    async lister(): Promise<Preinscription[]> {
      return selectionner(
        database,
        `SELECT id_preinscription, id_candidature, id_eleve
         FROM preinscription
         ORDER BY id_preinscription;`,
      );
    },

    async listerParCandidature(idCandidature: string): Promise<Preinscription[]> {
      return selectionner(
        database,
        `SELECT id_preinscription, id_candidature, id_eleve
         FROM preinscription
         WHERE id_candidature = ?
         ORDER BY id_preinscription;`,
        [idCandidature],
      );
    },

    async listerParEleve(idEleve: string): Promise<Preinscription[]> {
      return selectionner(
        database,
        `SELECT id_preinscription, id_candidature, id_eleve
         FROM preinscription
         WHERE id_eleve = ?
         ORDER BY id_preinscription;`,
        [idEleve],
      );
    },
  };
}
