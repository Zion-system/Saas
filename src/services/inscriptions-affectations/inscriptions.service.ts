import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import {
  InscriptionIntrouvableError,
  traduireErreurInscriptionsAffectations,
} from "./errors";
import { selectionner, validerEtatInscription } from "./shared";
import type {
  CreerInscriptionDirecte,
  CreerInscriptionDepuisPreinscription,
  EtatInscription,
  Inscription,
} from "./types";

const colonnesInscription = `
  id_inscription, id_eleve, id_annee_scolaire,
  id_etablissement, id_preinscription, etat_inscription
`;

export function creerServiceInscriptions(database: SQLiteExecutor) {
  async function inserer(
    inscription: CreerInscriptionDirecte | CreerInscriptionDepuisPreinscription,
    idPreinscription: string | null,
  ): Promise<Inscription> {
    validerEtatInscription(inscription.etat_inscription);

    const rows = await traduireErreurInscriptionsAffectations(
      "L’inscription",
      () =>
        database.query(
          `INSERT INTO inscription (
             id_inscription, id_eleve, id_annee_scolaire,
             id_etablissement, id_preinscription, etat_inscription
           ) VALUES (?, ?, ?, ?, ?, ?)
           RETURNING ${colonnesInscription};`,
          [
            inscription.id_inscription,
            inscription.id_eleve,
            inscription.id_annee_scolaire,
            inscription.id_etablissement,
            idPreinscription,
            inscription.etat_inscription,
          ],
        ),
    );

    const ligne = rows[0];
    if (!ligne) {
      throw new InscriptionIntrouvableError(inscription.id_inscription);
    }
    return ligne as unknown as Inscription;
  }

  return {
    creerDirecte(inscription: CreerInscriptionDirecte): Promise<Inscription> {
      return inserer(inscription, null);
    },

    creerDepuisPreinscription(
      inscription: CreerInscriptionDepuisPreinscription,
    ): Promise<Inscription> {
      return inserer(inscription, inscription.id_preinscription);
    },

    async obtenir(id: string): Promise<Inscription> {
      const rows = await selectionner<Inscription>(
        database,
        `SELECT ${colonnesInscription}
         FROM inscription
         WHERE id_inscription = ?;`,
        [id],
      );
      const inscription = rows[0];
      if (!inscription) throw new InscriptionIntrouvableError(id);
      return inscription;
    },

    async lister(): Promise<Inscription[]> {
      return selectionner(
        database,
        `SELECT ${colonnesInscription}
         FROM inscription
         ORDER BY id_annee_scolaire, id_eleve, id_inscription;`,
      );
    },

    async listerParEleveEtAnnee(
      idEleve: string,
      idAnneeScolaire: string,
    ): Promise<Inscription[]> {
      return selectionner(
        database,
        `SELECT ${colonnesInscription}
         FROM inscription
         WHERE id_eleve = ? AND id_annee_scolaire = ?
         ORDER BY id_inscription;`,
        [idEleve, idAnneeScolaire],
      );
    },

    async changerEtat(id: string, etat: EtatInscription): Promise<Inscription> {
      validerEtatInscription(etat);
      const rows = await traduireErreurInscriptionsAffectations(
        "L’inscription",
        () =>
          database.query(
            `UPDATE inscription
             SET etat_inscription = ?
             WHERE id_inscription = ?
             RETURNING ${colonnesInscription};`,
            [etat, id],
          ),
      );
      const inscription = rows[0];
      if (!inscription) throw new InscriptionIntrouvableError(id);
      return inscription as unknown as Inscription;
    },
  };
}
