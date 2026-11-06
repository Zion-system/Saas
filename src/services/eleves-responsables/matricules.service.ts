import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import {
  ConflitOrganisationError,
  traduireErreurSQLite,
} from "../organisation-scolaire/errors";
import {
  CorrectionMatriculeSansHistoriqueError,
  MatriculeInitialDejaAttribueError,
  MotifCorrectionObligatoireError,
} from "./errors";
import { exigerLigne, selectionner, validerPeriode } from "./shared";
import type {
  AttributionInitialeMatricule,
  CorrectionMatricule,
  HistoriqueMatricule,
} from "./types";

const colonnesHistorique = `
  id_historique_matricule, id_eleve, id_etablissement,
  id_historique_precedent, matricule, date_debut_validite,
  date_fin_validite, motif_correction, id_auteur_correction
`;

async function verifierEleve(
  database: SQLiteExecutor,
  idEleve: string,
  idEtablissement: string,
): Promise<void> {
  const rows = await database.query(
    `SELECT id_eleve FROM eleve
     WHERE id_eleve = ? AND id_etablissement = ?;`,
    [idEleve, idEtablissement],
  );

  exigerLigne(rows, "L’élève", idEleve);
}

export function creerServiceMatricules(database: SQLiteExecutor) {
  async function obtenirCourant(
    idEleve: string,
    idEtablissement: string,
  ): Promise<HistoriqueMatricule | null> {
    const rows = await selectionner<HistoriqueMatricule>(
      database,
      `SELECT ${colonnesHistorique}
       FROM historique_matricule
       WHERE id_eleve = ? AND id_etablissement = ?
         AND date_fin_validite IS NULL;`,
      [idEleve, idEtablissement],
    );

    return rows[0] ?? null;
  }

  return {
    async obtenirCourant(
      idEleve: string,
      idEtablissement: string,
    ): Promise<HistoriqueMatricule | null> {
      await verifierEleve(database, idEleve, idEtablissement);

      return obtenirCourant(idEleve, idEtablissement);
    },

    async listerHistorique(
      idEleve: string,
      idEtablissement: string,
    ): Promise<HistoriqueMatricule[]> {
      await verifierEleve(database, idEleve, idEtablissement);

      return selectionner(
        database,
        `SELECT ${colonnesHistorique}
         FROM historique_matricule
         WHERE id_eleve = ? AND id_etablissement = ?
         ORDER BY date_debut_validite, id_historique_matricule;`,
        [idEleve, idEtablissement],
      );
    },

    async attribuerInitial(
      attribution: AttributionInitialeMatricule,
    ): Promise<HistoriqueMatricule> {
      validerPeriode(attribution.date_debut_validite, null);

      await verifierEleve(
        database,
        attribution.id_eleve,
        attribution.id_etablissement,
      );

      const rows = await traduireErreurSQLite("L’historique de matricule", () =>
        database.query(
          `INSERT INTO historique_matricule (
               id_historique_matricule,
               id_eleve,
               id_etablissement,
               id_historique_precedent,
               matricule,
               date_debut_validite,
               motif_correction,
               id_auteur_correction
             )
             SELECT ?, ?, ?, NULL, ?, ?, NULL, NULL
             WHERE NOT EXISTS (
               SELECT 1
               FROM historique_matricule
               WHERE id_eleve = ?
                 AND id_etablissement = ?
             )
             RETURNING ${colonnesHistorique};`,
          [
            attribution.id_historique_matricule,
            attribution.id_eleve,
            attribution.id_etablissement,
            attribution.matricule,
            attribution.date_debut_validite,
            attribution.id_eleve,
            attribution.id_etablissement,
          ],
        ),
      );

      if (rows.length === 0) {
        throw new MatriculeInitialDejaAttribueError(attribution.id_eleve);
      }

      return exigerLigne(
        rows,
        "L’historique de matricule",
        attribution.id_historique_matricule,
      );
    },

    async corriger(
      correction: CorrectionMatricule,
    ): Promise<HistoriqueMatricule> {
      const motif = correction.motif_correction.trim();

      if (!motif) {
        throw new MotifCorrectionObligatoireError();
      }

      validerPeriode(correction.date_debut_validite, null);

      await verifierEleve(
        database,
        correction.id_eleve,
        correction.id_etablissement,
      );

      const precedent = await obtenirCourant(
        correction.id_eleve,
        correction.id_etablissement,
      );

      if (!precedent) {
        throw new CorrectionMatriculeSansHistoriqueError(correction.id_eleve);
      }

      if (correction.date_debut_validite <= precedent.date_debut_validite) {
        throw new ConflitOrganisationError(
          "La date d’effet d’une correction doit être postérieure à celle du matricule précédent.",
        );
      }

      const rows = await traduireErreurSQLite("L’historique de matricule", () =>
        database.query(
          `INSERT INTO historique_matricule (
               id_historique_matricule,
               id_eleve,
               id_etablissement,
               id_historique_precedent,
               matricule,
               date_debut_validite,
               motif_correction,
               id_auteur_correction
             )
             SELECT ?, ?, ?, precedent.id_historique_matricule,
                    ?, ?, ?, ?
             FROM historique_matricule AS precedent
             JOIN eleve
               ON eleve.id_eleve = precedent.id_eleve
              AND eleve.id_etablissement = precedent.id_etablissement
             WHERE precedent.id_historique_matricule = ?
               AND precedent.id_eleve = ?
               AND precedent.id_etablissement = ?
               AND precedent.date_fin_validite IS NULL
               AND ? > precedent.date_debut_validite
               AND eleve.matricule = precedent.matricule
             RETURNING ${colonnesHistorique};`,
          [
            correction.id_historique_matricule,
            correction.id_eleve,
            correction.id_etablissement,
            correction.matricule,
            correction.date_debut_validite,
            motif,
            correction.id_auteur_correction ?? null,
            precedent.id_historique_matricule,
            correction.id_eleve,
            correction.id_etablissement,
            correction.date_debut_validite,
          ],
        ),
      );

      if (rows.length === 0) {
        throw new ConflitOrganisationError(
          "Le matricule courant a changé depuis sa lecture. Rechargez l’historique avant de réessayer.",
        );
      }

      return exigerLigne(
        rows,
        "L’historique de matricule",
        correction.id_historique_matricule,
      );
    },
  };
}
