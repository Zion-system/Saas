import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { nouvelIdentifiant } from "../../utils/identifiants";
import {
  MatiereCodeDoublonError,
  MatiereDoublonError,
  MatiereInvalideError,
  traduireErreurSQLite,
} from "./errors";
import { exigerLigne, selectionner, texteFacultatif, textePropre } from "./shared";
import type {
  DonneesModificationMatiere,
  DonneesMatiere,
  Matiere,
} from "./types";

/** Entité affichée dans les messages d'erreur du service. */
const ENTITE = "La matière";

const COLONNES = `
  id_matiere, code, libelle, categorie, est_actif
`;

/**
 * Référentiel des matières (migration 021 — MLD docs/19 : MATIERE, sans
 * clé étrangère locale). Une matière retirée de la liste active est
 * désactivée (est_actif = 0) : rien n'est jamais supprimé physiquement,
 * ses futurs enseignements et notes resteront rattachables.
 */
export function creerServiceMatieres(database: SQLiteExecutor) {
  async function obtenir(id: string): Promise<Matiere> {
    const rows = await selectionner<Matiere>(
      database,
      `SELECT ${COLONNES} FROM matiere WHERE id_matiere = ?;`,
      [id],
    );
    return exigerLigne(rows, ENTITE, id);
  }

  function valider(donnees: DonneesMatiere): { libelle: string; code: string | null; categorie: string | null } {
    const libelle = textePropre(donnees.libelle);
    if (libelle === "") {
      throw new MatiereInvalideError("Le nom de la matière est obligatoire.");
    }
    const code = texteFacultatif(donnees.code);
    const categorie = texteFacultatif(donnees.categorie);
    return { libelle, code, categorie };
  }

  /** Doublons écartés AVANT l'écriture, avec un message compréhensible. */
  async function refuserDoublons(
    libelle: string,
    code: string | null,
    idMatiere: string | null,
  ): Promise<void> {
    const memeNom = await selectionner<Matiere>(
      database,
      `SELECT id_matiere FROM matiere
       WHERE libelle = ? -- la colonne porte COLLATE NOCASE
         AND id_matiere IS NOT ?;`,
      [libelle, idMatiere],
    );
    if (memeNom.length > 0) {
      throw new MatiereDoublonError(libelle);
    }
    if (code !== null) {
      const memeCode = await selectionner<Matiere>(
        database,
        `SELECT id_matiere FROM matiere
         WHERE code = ? AND id_matiere IS NOT ?;`,
        [code, idMatiere],
      );
      if (memeCode.length > 0) {
        throw new MatiereCodeDoublonError(code);
      }
    }
  }

  return {
    obtenir,

    async creer(donnees: DonneesMatiere): Promise<Matiere> {
      const { libelle, code, categorie } = valider(donnees);
      await refuserDoublons(libelle, code, null);

      const id = nouvelIdentifiant();
      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `INSERT INTO matiere (id_matiere, code, libelle, categorie)
           VALUES (?, ?, ?, ?)
           RETURNING ${COLONNES};`,
          [id, code, libelle, categorie],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },

    async modifier(donnees: DonneesModificationMatiere): Promise<Matiere> {
      const { libelle, code, categorie } = valider(donnees);
      const id = donnees.id_matiere.trim();
      if (id === "") {
        throw new MatiereInvalideError("La matière à modifier est introuvable.");
      }
      await refuserDoublons(libelle, code, id);

      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `UPDATE matiere
           SET code = ?, libelle = ?, categorie = ?
           WHERE id_matiere = ?
           RETURNING ${COLONNES};`,
          [code, libelle, categorie, id],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },

    /** Toutes les matières, actives d'abord, ordre alphabétique ensuite. */
    async lister(): Promise<Matiere[]> {
      return selectionner<Matiere>(
        database,
        `SELECT ${COLONNES} FROM matiere
         ORDER BY est_actif DESC, libelle;`,
      );
    },

    /** Seulement les matières actives (ex. menu d'une future fiche). */
    async listerActives(): Promise<Matiere[]> {
      return selectionner<Matiere>(
        database,
        `SELECT ${COLONNES} FROM matiere
         WHERE est_actif = 1
         ORDER BY libelle;`,
      );
    },

    /** Retire la matière de la liste active — sans rien supprimer. */
    async desactiver(id: string): Promise<Matiere> {
      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `UPDATE matiere SET est_actif = 0
           WHERE id_matiere = ? AND est_actif = 1
           RETURNING ${COLONNES};`,
          [id],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },

    /** Remet la matière dans la liste active. */
    async reactiver(id: string): Promise<Matiere> {
      const rows = await traduireErreurSQLite(ENTITE, () =>
        database.query(
          `UPDATE matiere SET est_actif = 1
           WHERE id_matiere = ? AND est_actif = 0
           RETURNING ${COLONNES};`,
          [id],
        ),
      );
      return exigerLigne(rows, ENTITE, id);
    },
  };
}
