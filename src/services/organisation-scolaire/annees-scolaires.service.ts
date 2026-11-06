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

export function creerServiceAnneesScolaires(database: SQLiteExecutor) {
  async function obtenir(id: string): Promise<AnneeScolaire> {
    const rows = await selectionner<AnneeScolaire>(
      database,
      `SELECT id_annee_scolaire, id_etablissement, statut
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
        `SELECT id_annee_scolaire, id_etablissement, statut
         FROM annee_scolaire
         WHERE id_etablissement = ?
         ORDER BY id_annee_scolaire;`,
        [idEtablissement],
      );
    },

    obtenir,

    async creer(
      annee: Pick<AnneeScolaire, "id_annee_scolaire" | "id_etablissement">,
    ): Promise<AnneeScolaire> {
      const rows = await traduireErreurSQLite("L’année scolaire", () =>
        database.query(
          `INSERT INTO annee_scolaire (id_annee_scolaire, id_etablissement)
           VALUES (?, ?)
           RETURNING id_annee_scolaire, id_etablissement, statut;`,
          [annee.id_annee_scolaire, annee.id_etablissement],
        ),
      );
      return exigerLigne(rows, "L’année scolaire", annee.id_annee_scolaire);
    },

    async modifier(
      id: string,
      changements: Pick<
        AnneeScolaire,
        "id_annee_scolaire" | "id_etablissement"
      >,
    ): Promise<AnneeScolaire> {
      const rows = await traduireErreurSQLite("L’année scolaire", () =>
        database.query(
          `UPDATE annee_scolaire
           SET id_annee_scolaire = ?, id_etablissement = ?
           WHERE id_annee_scolaire = ?
           RETURNING id_annee_scolaire, id_etablissement, statut;`,
          [changements.id_annee_scolaire, changements.id_etablissement, id],
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
