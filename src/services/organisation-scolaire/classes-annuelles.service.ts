import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { traduireErreurSQLite } from "./errors";
import { exigerLigne, selectionner } from "./shared";
import type { ClasseAnnuelle } from "./types";

export function creerServiceClassesAnnuelles(database: SQLiteExecutor) {
  return {
    async listerParAnnee(
      idAnneeScolaire: string,
      idEtablissement: string,
    ): Promise<ClasseAnnuelle[]> {
      return selectionner(
        database,
        `SELECT id_classe_annuelle, id_annee_scolaire, id_niveau,
                id_modele_classe, id_etablissement, capacite_max
         FROM classe_annuelle
         WHERE id_annee_scolaire = ? AND id_etablissement = ?
         ORDER BY id_classe_annuelle;`,
        [idAnneeScolaire, idEtablissement],
      );
    },

    async obtenir(id: string): Promise<ClasseAnnuelle> {
      const rows = await selectionner<ClasseAnnuelle>(
        database,
        `SELECT id_classe_annuelle, id_annee_scolaire, id_niveau,
                id_modele_classe, id_etablissement, capacite_max
         FROM classe_annuelle
         WHERE id_classe_annuelle = ?;`,
        [id],
      );
      return exigerLigne(rows, "La classe annuelle", id);
    },

    async creer(classe: ClasseAnnuelle): Promise<ClasseAnnuelle> {
      const rows = await traduireErreurSQLite("La classe annuelle", () =>
        database.query(
          `INSERT INTO classe_annuelle (
             id_classe_annuelle, id_annee_scolaire, id_niveau,
             id_modele_classe, id_etablissement, capacite_max
           ) VALUES (?, ?, ?, ?, ?, ?)
           RETURNING id_classe_annuelle, id_annee_scolaire, id_niveau,
                     id_modele_classe, id_etablissement, capacite_max;`,
          [
            classe.id_classe_annuelle,
            classe.id_annee_scolaire,
            classe.id_niveau,
            classe.id_modele_classe,
            classe.id_etablissement,
            classe.capacite_max ?? null,
          ],
        ),
      );
      return exigerLigne(rows, "La classe annuelle", classe.id_classe_annuelle);
    },

    async modifier(
      id: string,
      changements: ClasseAnnuelle,
    ): Promise<ClasseAnnuelle> {
      const rows = await traduireErreurSQLite("La classe annuelle", () =>
        database.query(
          `UPDATE classe_annuelle
           SET id_classe_annuelle = ?, id_annee_scolaire = ?, id_niveau = ?,
               id_modele_classe = ?, id_etablissement = ?, capacite_max = ?
           WHERE id_classe_annuelle = ?
           RETURNING id_classe_annuelle, id_annee_scolaire, id_niveau,
                     id_modele_classe, id_etablissement, capacite_max;`,
          [
            changements.id_classe_annuelle,
            changements.id_annee_scolaire,
            changements.id_niveau,
            changements.id_modele_classe,
            changements.id_etablissement,
            changements.capacite_max ?? null,
            id,
          ],
        ),
      );
      return exigerLigne(rows, "La classe annuelle", id);
    },

    async supprimer(id: string): Promise<void> {
      const rows = await traduireErreurSQLite("La classe annuelle", () =>
        database.query(
          "DELETE FROM classe_annuelle WHERE id_classe_annuelle = ? RETURNING id_classe_annuelle;",
          [id],
        ),
      );
      exigerLigne(rows, "La classe annuelle", id);
    },
  };
}
