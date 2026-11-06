import type { SQLiteExecutor, SQLiteStatement } from "../../database/local/sqlite.types";
import {
  ConflitOrganisationError,
  traduireErreurSQLite,
} from "../organisation-scolaire/errors";
import {
  exigerLigne,
  selectionner,
  validerDrapeau,
  validerPeriode,
} from "./shared";
import { creerServiceNaturesLiens } from "./natures-liens.service";
import type {
  CreerRelationEleveResponsable,
  RelationEleveResponsable,
} from "./types";

const colonnesRelation = `
  id_relation_eleve_responsable, id_eleve, id_responsable,
  id_etablissement, id_nature_lien, est_representant_legal,
  est_responsable_financier, date_debut_validite, date_fin_validite,
  id_auteur_creation, id_auteur_cloture
`;

function validerCreation(relation: CreerRelationEleveResponsable): void {
  validerPeriode(relation.date_debut_validite, null);
  validerDrapeau(relation.est_representant_legal, "est_representant_legal");
  validerDrapeau(relation.est_responsable_financier, "est_responsable_financier");
}

async function verifierEleve(database: SQLiteExecutor, idEleve: string): Promise<void> {
  const rows = await database.query(
    "SELECT id_eleve FROM eleve WHERE id_eleve = ?;",
    [idEleve],
  );
  exigerLigne(rows, "L’élève", idEleve);
}

export function creerServiceRelationsEleveResponsable(
  database: SQLiteExecutor,
) {
  const naturesLiens = creerServiceNaturesLiens(database);

  async function obtenir(id: string): Promise<RelationEleveResponsable> {
    const rows = await selectionner<RelationEleveResponsable>(
      database,
      `SELECT ${colonnesRelation}
       FROM relation_eleve_responsable
       WHERE id_relation_eleve_responsable = ?;`,
      [id],
    );
    return exigerLigne(rows, "La relation élève-responsable", id);
  }

  return {
    async creer(
      relation: CreerRelationEleveResponsable,
    ): Promise<RelationEleveResponsable> {
      validerCreation(relation);
      await naturesLiens.obtenirActive(relation.id_nature_lien);
      const rows = await traduireErreurSQLite("La relation élève-responsable", () =>
        database.query(
          `INSERT INTO relation_eleve_responsable (
             id_relation_eleve_responsable, id_eleve, id_responsable,
             id_etablissement, id_nature_lien, est_representant_legal,
             est_responsable_financier, date_debut_validite,
             id_auteur_creation
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING ${colonnesRelation};`,
          [
            relation.id_relation_eleve_responsable,
            relation.id_eleve,
            relation.id_responsable,
            relation.id_etablissement,
            relation.id_nature_lien,
            relation.est_representant_legal,
            relation.est_responsable_financier,
            relation.date_debut_validite,
            relation.id_auteur_creation,
          ],
        ),
      );
      return exigerLigne(rows, "La relation élève-responsable", relation.id_relation_eleve_responsable);
    },

    obtenir,

    async listerParEleve(idEleve: string): Promise<RelationEleveResponsable[]> {
      await verifierEleve(database, idEleve);
      return selectionner(
        database,
        `SELECT ${colonnesRelation}
         FROM relation_eleve_responsable
         WHERE id_eleve = ?
         ORDER BY date_debut_validite, id_relation_eleve_responsable;`,
        [idEleve],
      );
    },

    async listerActivesA(
      idEleve: string,
      date: string,
    ): Promise<RelationEleveResponsable[]> {
      validerPeriode(date, null);
      await verifierEleve(database, idEleve);
      return selectionner(
        database,
        `SELECT ${colonnesRelation}
         FROM relation_eleve_responsable
         WHERE id_eleve = ?
           AND date_debut_validite <= ?
           AND (date_fin_validite IS NULL OR ? < date_fin_validite)
         ORDER BY date_debut_validite, id_relation_eleve_responsable;`,
        [idEleve, date, date],
      );
    },

    async cloturer(
      id: string,
      dateFin: string,
      idAuteurCloture: string | null = null,
    ): Promise<RelationEleveResponsable> {
      validerPeriode(dateFin, null);
      const actuelle = await obtenir(id);
      validerPeriode(actuelle.date_debut_validite, dateFin);

      const rows = await traduireErreurSQLite("La clôture de la relation", () =>
        database.query(
          `UPDATE relation_eleve_responsable
           SET date_fin_validite = ?, id_auteur_cloture = ?
           WHERE id_relation_eleve_responsable = ?
             AND date_fin_validite IS NULL
           RETURNING ${colonnesRelation};`,
          [dateFin, idAuteurCloture, id],
        ),
      );

      if (rows.length === 0) {
        throw new ConflitOrganisationError(
          "La relation a déjà été clôturée par une opération concurrente.",
        );
      }
      return rows[0] as unknown as RelationEleveResponsable;
    },

    async remplacer(
      id: string,
      dateFinPrecedente: string,
      nouvelle: CreerRelationEleveResponsable,
      idAuteurCloture: string | null = null,
    ): Promise<RelationEleveResponsable> {
      validerCreation(nouvelle);
      const actuelle = await obtenir(id);
      validerPeriode(actuelle.date_debut_validite, dateFinPrecedente);

      if (
        nouvelle.id_eleve !== actuelle.id_eleve ||
        nouvelle.id_responsable !== actuelle.id_responsable ||
        nouvelle.id_etablissement !== actuelle.id_etablissement
      ) {
        throw new ConflitOrganisationError(
          "Une relation remplaçante doit conserver le même élève, le même responsable et le même établissement.",
        );
      }
      if (nouvelle.date_debut_validite < dateFinPrecedente) {
        throw new ConflitOrganisationError(
          "La relation remplaçante ne peut pas commencer avant la fin de la relation précédente.",
        );
      }
      await naturesLiens.obtenirActive(nouvelle.id_nature_lien);

      const statements: SQLiteStatement[] = [
        {
          sql: `UPDATE relation_eleve_responsable
                SET date_fin_validite = ?, id_auteur_cloture = ?
                WHERE id_relation_eleve_responsable = ?
                  AND date_fin_validite IS NULL
                RETURNING id_relation_eleve_responsable;`,
          bind: [dateFinPrecedente, idAuteurCloture, id],
        },
        {
          sql: `INSERT INTO relation_eleve_responsable (
                  id_relation_eleve_responsable, id_eleve, id_responsable,
                  id_etablissement, id_nature_lien, est_representant_legal,
                  est_responsable_financier, date_debut_validite,
                  id_auteur_creation
                )
                SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
                WHERE EXISTS (
                  SELECT 1 FROM relation_eleve_responsable
                  WHERE id_relation_eleve_responsable = ?
                    AND date_fin_validite = ?
                )
                RETURNING ${colonnesRelation};`,
          bind: [
            nouvelle.id_relation_eleve_responsable,
            nouvelle.id_eleve,
            nouvelle.id_responsable,
            nouvelle.id_etablissement,
            nouvelle.id_nature_lien,
            nouvelle.est_representant_legal,
            nouvelle.est_responsable_financier,
            nouvelle.date_debut_validite,
            nouvelle.id_auteur_creation,
            id,
            dateFinPrecedente,
          ],
        },
      ];

      const rows = await traduireErreurSQLite("Le remplacement de relation", () =>
        database.transaction(statements),
      );
      if (rows[0]?.length !== 1 || rows[1]?.length !== 1) {
        throw new ConflitOrganisationError(
          "La relation précédente n’a pas pu être clôturée; aucune remplaçante n’a été créée.",
        );
      }
      return rows[1][0] as unknown as RelationEleveResponsable;
    },
  };
}
