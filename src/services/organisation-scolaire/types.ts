export interface Etablissement {
  id_etablissement: string;
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
}

export interface PeriodePedagogique {
  id_periode: string;
  id_annee_scolaire: string;
}

export interface CycleEnseignement {
  id_cycle: string;
}

export interface NiveauEnseignement {
  id_niveau: string;
}

export interface ModeleClasse {
  id_modele_classe: string;
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
