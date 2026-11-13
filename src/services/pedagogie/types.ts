/**
 * Types du référentiel pédagogique (migration 021).
 *
 * - Matiere : référentiel global des matières (MLD docs/19 — MATIERE,
 *   aucune clé étrangère locale).
 * - Professeur : référentiel local provisoire des enseignants, rattaché
 *   à un établissement (point ouvert docs/06 : le rattachement au
 *   référentiel propriétaire se décidera avec la phase C).
 */

export interface Matiere {
  id_matiere: string;
  /** Code court facultatif (ex. « MATH »), unique si renseigné. */
  code: string | null;
  libelle: string;
  /** Regroupement libre facultatif (ex. « Sciences », « Langues »). */
  categorie: string | null;
  /** 1 = visible dans la liste active ; 0 = retirée (jamais supprimée). */
  est_actif: number;
}

export interface DonneesMatiere {
  code?: string | null;
  libelle: string;
  categorie?: string | null;
}

export interface DonneesModificationMatiere extends DonneesMatiere {
  id_matiere: string;
}

export interface Professeur {
  id_enseignant: string;
  id_etablissement: string;
  nom: string;
  prenoms: string | null;
  /** Numéro enregistré avec son indicatif (« +242 06 … »). */
  telephone: string | null;
  email: string | null;
  /** Spécialité en texte libre pour l'instant ; le lien structuré
   *  matière ↔ classe (ENSEIGNEMENT du MLD) arrive avec Notes & Bulletins. */
  specialite: string | null;
  /** 1 = actif ; 0 = archivé (un professeur n'est jamais supprimé). */
  est_actif: number;
}

export interface DonneesProfesseur {
  id_etablissement: string;
  nom: string;
  prenoms?: string | null;
  telephone?: string | null;
  email?: string | null;
  specialite?: string | null;
}

export interface DonneesModificationProfesseur extends DonneesProfesseur {
  id_enseignant: string;
}
