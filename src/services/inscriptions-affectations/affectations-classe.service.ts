import type {
  SQLiteExecutor,
  SQLiteStatement,
} from "../../database/local/sqlite.types";
import {
  AffectationCouranteIntrouvableError,
  ConflitOrganisationError,
  EntiteIntrouvableError,
  InscriptionIntrouvableError,
  PeriodeAffectationInvalideError,
  traduireErreurInscriptionsAffectations,
} from "./errors";
import { selectionner, validerDateCivileISO } from "./shared";
import type {
  AffectationClasse,
  ChangerClasse,
  CreerPremiereAffectation,
} from "./types";

const colonnesAffectation = `
  id_affectation_classe, id_inscription, id_classe_annuelle,
  id_etablissement, date_debut, date_fin
`;

export function creerServiceAffectationsClasse(database: SQLiteExecutor) {
  async function obtenirCourante(
    idInscription: string,
    idEtablissement: string,
  ): Promise<AffectationClasse | null> {
    const rows = await selectionner<AffectationClasse>(
      database,
      `SELECT ${colonnesAffectation}
       FROM affectation_classe
       WHERE id_inscription = ?
         AND id_etablissement = ?
         AND date_fin IS NULL;`,
      [idInscription, idEtablissement],
    );
    return rows[0] ?? null;
  }

  return {
    async creerPremiere(
      affectation: CreerPremiereAffectation,
    ): Promise<AffectationClasse> {
      validerDateCivileISO(affectation.date_debut);

      const rows = await traduireErreurInscriptionsAffectations(
        "La première affectation de classe",
        () =>
          database.query(
            `INSERT INTO affectation_classe (
               id_affectation_classe, id_inscription, id_classe_annuelle,
               id_etablissement, date_debut, date_fin
             )
             SELECT ?, ?, ?, ?, ?, NULL
             WHERE EXISTS (
               SELECT 1 FROM inscription
               WHERE id_inscription = ? AND id_etablissement = ?
             )
               AND NOT EXISTS (
                 SELECT 1 FROM affectation_classe
                 WHERE id_inscription = ?
               )
             RETURNING ${colonnesAffectation};`,
            [
              affectation.id_affectation_classe,
              affectation.id_inscription,
              affectation.id_classe_annuelle,
              affectation.id_etablissement,
              affectation.date_debut,
              affectation.id_inscription,
              affectation.id_etablissement,
              affectation.id_inscription,
            ],
          ),
      );

      const ligne = rows[0];
      if (ligne) return ligne as unknown as AffectationClasse;

      const inscriptions = await selectionner<{ id_inscription: string }>(
        database,
        `SELECT id_inscription
         FROM inscription
         WHERE id_inscription = ? AND id_etablissement = ?;`,
        [affectation.id_inscription, affectation.id_etablissement],
      );
      if (!inscriptions[0]) {
        throw new InscriptionIntrouvableError(affectation.id_inscription);
      }
      throw new ConflitOrganisationError(
        `L’inscription « ${affectation.id_inscription} » possède déjà un historique d’affectation.`,
      );
    },

    async changerClasse(
      idInscription: string,
      idEtablissement: string,
      nouvelle: ChangerClasse,
    ): Promise<AffectationClasse> {
      validerDateCivileISO(nouvelle.date_debut);

      const actuelle = await obtenirCourante(idInscription, idEtablissement);
      if (!actuelle) {
        throw new AffectationCouranteIntrouvableError(idInscription);
      }
      if (nouvelle.date_debut <= actuelle.date_debut) {
        throw new PeriodeAffectationInvalideError(
          "La date du changement doit être postérieure au début de l’affectation courante.",
        );
      }

      const statements: SQLiteStatement[] = [
        {
          sql: `UPDATE affectation_classe
                SET date_fin = ?
                WHERE id_affectation_classe = ?
                  AND id_inscription = ?
                  AND id_etablissement = ?
                  AND date_fin IS NULL
                RETURNING id_affectation_classe;`,
          bind: [
            nouvelle.date_debut,
            actuelle.id_affectation_classe,
            idInscription,
            idEtablissement,
          ],
        },
        {
          sql: `INSERT INTO affectation_classe (
                  id_affectation_classe, id_inscription, id_classe_annuelle,
                  id_etablissement, date_debut, date_fin
                )
                SELECT ?, ?, ?, ?, ?, NULL
                WHERE changes() = 1
                RETURNING ${colonnesAffectation};`,
          bind: [
            nouvelle.id_affectation_classe,
            idInscription,
            nouvelle.id_classe_annuelle,
            idEtablissement,
            nouvelle.date_debut,
          ],
        },
      ];

      const rows = await traduireErreurInscriptionsAffectations(
        "Le changement de classe",
        () => database.transaction(statements),
      );
      if (rows[0]?.length !== 1 || rows[1]?.length !== 1) {
        throw new ConflitOrganisationError(
          "L’affectation courante a été modifiée par une opération concurrente; le changement n’a pas été appliqué.",
        );
      }
      return rows[1][0] as unknown as AffectationClasse;
    },

    obtenirCourante,

    async listerHistorique(
      idInscription: string,
      idEtablissement: string,
    ): Promise<AffectationClasse[]> {
      const inscriptions = await selectionner<{ id_inscription: string }>(
        database,
        `SELECT id_inscription
         FROM inscription
         WHERE id_inscription = ? AND id_etablissement = ?;`,
        [idInscription, idEtablissement],
      );
      if (!inscriptions[0]) {
        throw new EntiteIntrouvableError(
          `L’inscription « ${idInscription} » est introuvable dans cet établissement.`,
        );
      }

      return selectionner(
        database,
        `SELECT ${colonnesAffectation}
         FROM affectation_classe
         WHERE id_inscription = ? AND id_etablissement = ?
         ORDER BY date_debut, id_affectation_classe;`,
        [idInscription, idEtablissement],
      );
    },
  };
}
