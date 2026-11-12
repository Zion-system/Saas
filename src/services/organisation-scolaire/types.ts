export interface Etablissement {
  id_etablissement: string;
  /**
   * Nom lisible de l'école (colonne ajoutée par la migration 018).
   * Facultatif dans le type pour rester compatible avec les anciens
   * appels qui ne connaissent que l'identifiant technique.
   */
  nom?: string;
}

export type StatutAnneeScolaire =
  | "PREPAREE"
  | "OUVERTE"
  | "CLOTUREE"
  | "ARCHIVEE";

export interface AnneeScolaire {
  id_annee_scolaire: string;
  id_etablissement: string;
  statut: StatutAnneeScolaire;
  /** Libellé lisible, ex. « 2026-2027 » (migration 018). */
  libelle?: string;
  /** Rentrée au format ISO AAAA-MM-JJ (migration 018). */
  date_debut?: string;
  /** Fin de l'année au format ISO AAAA-MM-JJ (migration 018). */
  date_fin?: string;
}

export interface PeriodePedagogique {
  id_periode: string;
  id_annee_scolaire: string;
  /** Libellé lisible, ex. « 1er trimestre » (migration 018). */
  libelle?: string;
  /** Rang d'affichage, ex. 1, 2, 3 (migration 018). */
  ordre?: number;
}

export interface CycleEnseignement {
  id_cycle: string;
}

export interface NiveauEnseignement {
  id_niveau: string;
}

export interface ModeleClasse {
  id_modele_classe: string;
  /**
   * Libellé tel que saisi (ex. « Première A ») — migration 020.
   * Facultatif : NULL pour les modèles créés avant la migration et
   * jamais complétés ; l'identifiant technique sert alors de repli.
   */
  libelle?: string | null;
}

export interface ClasseAnnuelle {
  id_classe_annuelle: string;
  id_annee_scolaire: string;
  id_niveau: string;
  id_modele_classe: string;
  id_etablissement: string;
  /** Capacité maximale (colonne nullable ajoutée par la migration 013). */
  capacite_max?: number | null;
}
