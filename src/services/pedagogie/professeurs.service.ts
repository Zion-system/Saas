import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { nouvelIdentifiant } from "../../utils/identifiants";
import {
  ProfesseurInvalideError,
  traduireErreurSQLite,
} from "./errors";
import { exigerLigne, selectionner, texteFacultatif, textePropre } from "./shared";
import type {
  DonneesModificationProfesseur,
  DonneesProfesseur,
  Professeur,
} from "./types";

/** Entité affichée dans les messages d'erreur du service. */
const ENTITE = "Le professeur";

const COLONNES = `
  id_enseignant, id_etablissement, nom, prenoms, telephone, email,
  specialite, est_actif
`;

/**
 * Référentiel local des professeurs (migration 021). Un professeur qui
 * quitte l'école est archivé (est_actif = 0) — la base refuse toute
 * suppression physique, comme pour un dossier élève. Le rattachement de
 * ces identifiants stables aux comptes de la phase C est prévu dans la
 * migration future qui tranchera le point ouvert docs/06.
 */
export function creerServiceProfesseurs(database: SQLiteExecutor) {
  function valider(donnees: DonneesProfesseur): {
    nom: string;
    prenoms: string | null;
    telephone: string | null;
    email: string | null;
    specialite: string | null;
  } {
    if (donnees.id_etablissement.trim() === "") {
      throw new ProfesseurInvalideError(
        "Le professeur doit être rattaché à votre école (créez d'abord votre école).",
      );
    }
    const nom = textePropre(donnees.nom);
    if (nom === "") {
      throw new ProfesseurInvalideError("Le nom du professeur est obligatoire.");
    }
    return {
      nom,
      prenoms: texteFacultatif(donnees.prenoms),
      telephone: texteFacultatif(donnees.telephone),
      email: texteFacultatif(donnees.email),
      specialite: texteFacultatif(donnees.specialite),
    };
  }

  return {
    async obtenir(id: string): Promise<Professeur> {
      const rows = await selectionner<Professeur>(
        database,
        `SELECT ${COLONNES} FROM enseignant WHERE id_enseignant = ?;`,
        [id],
      );
      return exigerLigne(rows, ENTITE, id);
    },

    async creer(donnees: DonneesProfesseur): Promise<Professeur> {
      const { nom, prenoms, telephone, email, specialite } = valider(donnees);

      const id = nouvelIdentifiant();
      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `INSERT INTO enseignant (
             id_enseignant, id_etablissement, nom, prenoms,
             telephone, email, specialite
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)
           RETURNING ${COLONNES};`,
          [
            id,
            donnees.id_etablissement.trim(),
            nom,
            prenoms,
            telephone,
            email,
            specialite,
          ],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },

    async modifier(donnees: DonneesModificationProfesseur): Promise<Professeur> {
      const { nom, prenoms, telephone, email, specialite } = valider(donnees);
      const id = donnees.id_enseignant.trim();

      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `UPDATE enseignant
           SET nom = ?, prenoms = ?, telephone = ?, email = ?, specialite = ?
           WHERE id_enseignant = ? AND id_etablissement = ?
           RETURNING ${COLONNES};`,
          [
            nom,
            prenoms,
            telephone,
            email,
            specialite,
            id,
            donnees.id_etablissement.trim(),
          ],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },

    /** Tous les professeurs de l'école, actifs d'abord, alphabétique ensuite. */
    async listerParEtablissement(idEtablissement: string): Promise<Professeur[]> {
      return selectionner<Professeur>(
        database,
        `SELECT ${COLONNES} FROM enseignant
         WHERE id_etablissement = ?
         ORDER BY est_actif DESC, nom COLLATE NOCASE, prenoms COLLATE NOCASE;`,
        [idEtablissement],
      );
    },

    /** Seulement les professeurs actifs (ex. affectations futures). */
    async listerActifsParEtablissement(
      idEtablissement: string,
    ): Promise<Professeur[]> {
      return selectionner<Professeur>(
        database,
        `SELECT ${COLONNES} FROM enseignant
         WHERE id_etablissement = ? AND est_actif = 1
         ORDER BY nom COLLATE NOCASE, prenoms COLLATE NOCASE;`,
        [idEtablissement],
      );
    },

    /**
     * Archive un professeur qui quitte l'école — jamais une suppression :
     * la base refuse physiquement le DELETE (déclencheur), la fiche et
     * son historique restent conservés.
     */
    async archiver(id: string, idEtablissement: string): Promise<Professeur> {
      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `UPDATE enseignant SET est_actif = 0
           WHERE id_enseignant = ? AND id_etablissement = ? AND est_actif = 1
           RETURNING ${COLONNES};`,
          [id, idEtablissement],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },

    /** Réintègre un professeur archivé dans la liste active. */
    async reactiver(id: string, idEtablissement: string): Promise<Professeur> {
      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `UPDATE enseignant SET est_actif = 1
           WHERE id_enseignant = ? AND id_etablissement = ? AND est_actif = 0
           RETURNING ${COLONNES};`,
          [id, idEtablissement],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },
  };
}
