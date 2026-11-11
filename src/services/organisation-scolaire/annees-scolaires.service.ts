import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import {
  ConflitOrganisationError,
  TransitionStatutError,
  traduireErreurSQLite,
} from "./errors";
import { exigerLigne, erreurIntrouvable, selectionner } from "./shared";
import type { AnneeScolaire, StatutAnneeScolaire } from "./types";

const statutSuivant: Record<StatutAnneeScolaire, StatutAnneeScolaire | null> = {
  PREPAREE: "OUVERTE",
  OUVERTE: "CLOTUREE",
  CLOTUREE: "ARCHIVEE",
  ARCHIVEE: null,
};

/**
 * Champs lisibles ajoutés par la migration 018 : fournis en même temps que
 * les identifiants, ils sont enregistrés ; absents, ils sont ignorés
 * (COALESCE côté SQL) afin de ne rien écraser par accident.
 */
type ChampsLisibles = Partial<
  Pick<AnneeScolaire, "libelle" | "date_debut" | "date_fin">
>;

export function creerServiceAnneesScolaires(database: SQLiteExecutor) {
  async function obtenir(id: string): Promise<AnneeScolaire> {
    const rows = await selectionner<AnneeScolaire>(
      database,
      `SELECT id_annee_scolaire, id_etablissement, statut,
              libelle, date_debut, date_fin
       FROM annee_scolaire
       WHERE id_annee_scolaire = ?;`,
      [id],
    );
    return exigerLigne(rows, "L’année scolaire", id);
  }

  return {
    async listerParEtablissement(
      idEtablissement: string,
    ): Promise<AnneeScolaire[]> {
      return selectionner(
        database,
        `SELECT id_annee_scolaire, id_etablissement, statut,
                libelle, date_debut, date_fin
         FROM annee_scolaire
         WHERE id_etablissement = ?
         ORDER BY id_annee_scolaire;`,
        [idEtablissement],
      );
    },

    obtenir,

    async creer(
      annee: Pick<
        AnneeScolaire,
        "id_annee_scolaire" | "id_etablissement"
      > &
        ChampsLisibles,
    ): Promise<AnneeScolaire> {
      const rows = await traduireErreurSQLite("L’année scolaire", () =>
        database.query(
          `INSERT INTO annee_scolaire
             (id_annee_scolaire, id_etablissement, libelle, date_debut, date_fin)
           VALUES (?, ?, ?, ?, ?)
           RETURNING id_annee_scolaire, id_etablissement, statut,
                     libelle, date_debut, date_fin;`,
          [
            annee.id_annee_scolaire,
            annee.id_etablissement,
            annee.libelle ?? null,
            annee.date_debut ?? null,
            annee.date_fin ?? null,
          ],
        ),
      );
      return exigerLigne(rows, "L’année scolaire", annee.id_annee_scolaire);
    },

    async modifier(
      id: string,
      changements: Pick<
        AnneeScolaire,
        "id_annee_scolaire" | "id_etablissement"
      > &
        ChampsLisibles,
    ): Promise<AnneeScolaire> {
      const rows = await traduireErreurSQLite("L’année scolaire", () =>
        database.query(
          `UPDATE annee_scolaire
           SET id_annee_scolaire = ?, id_etablissement = ?,
               libelle = COALESCE(?, libelle),
               date_debut = COALESCE(?, date_debut),
               date_fin = COALESCE(?, date_fin)
           WHERE id_annee_scolaire = ?
           RETURNING id_annee_scolaire, id_etablissement, statut,
                     libelle, date_debut, date_fin;`,
          [
            changements.id_annee_scolaire,
            changements.id_etablissement,
            changements.libelle ?? null,
            changements.date_debut ?? null,
            changements.date_fin ?? null,
            id,
          ],
        ),
      );
      return exigerLigne(rows, "L’année scolaire", id);
    },

    async changerStatut(
      id: string,
      nouveauStatut: StatutAnneeScolaire,
    ): Promise<AnneeScolaire> {
      const actuelle = await obtenir(id);

      if (actuelle.statut === "OUVERTE" && nouveauStatut === "CLOTUREE") {
        throw new TransitionStatutError(
          "La clôture nécessite un contrôle et un audit qui ne sont pas encore disponibles.",
        );
      }

      const attendu = statutSuivant[actuelle.statut];

      if (attendu !== nouveauStatut) {
        throw new TransitionStatutError(
          `Transition d’année scolaire impossible : ${actuelle.statut} → ${nouveauStatut}.`,
        );
      }

      const rows = await traduireErreurSQLite("L’année scolaire", () =>
        database.query(
          `UPDATE annee_scolaire
           SET statut = ?
           WHERE id_annee_scolaire = ? AND statut = ?
           RETURNING id_annee_scolaire, id_etablissement, statut;`,
          [nouveauStatut, id, actuelle.statut],
        ),
      );

      if (rows.length === 0) {
        const derniereLecture = await selectionner<AnneeScolaire>(
          database,
          `SELECT id_annee_scolaire, id_etablissement, statut
           FROM annee_scolaire
           WHERE id_annee_scolaire = ?;`,
          [id],
        );
        if (derniereLecture.length === 0) {
          return erreurIntrouvable("L’année scolaire", id);
        }
        throw new ConflitOrganisationError(
          "L’année scolaire a été modifiée par une opération concurrente.",
        );
      }

      return rows[0] as unknown as AnneeScolaire;
    },

    async supprimer(id: string): Promise<void> {
      const rows = await traduireErreurSQLite("L’année scolaire", () =>
        database.query(
          "DELETE FROM annee_scolaire WHERE id_annee_scolaire = ? RETURNING id_annee_scolaire;",
          [id],
        ),
      );
      exigerLigne(rows, "L’année scolaire", id);
    },
  };
}
