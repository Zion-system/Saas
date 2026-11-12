export interface Eleve {
  id_eleve: string;
  id_etablissement: string;
  matricule: string | null;
}

/** Genre civil de l'élève (colonne ajoutée par la migration 019). */
export type Genre = "F" | "M";

export type CreerEleve = Pick<Eleve, "id_eleve" | "id_etablissement">;

export interface Responsable {
  id_responsable: string;
  id_etablissement: string;
}

export interface NatureLienResponsable {
  id_nature_lien: string;
  code: string;
  libelle: string;
  est_actif: number;
}

export type ResponsabilitesRelation = Pick<
  RelationEleveResponsable,
  "est_representant_legal" | "est_responsable_financier"
>;

export interface RelationEleveResponsable {
  id_relation_eleve_responsable: string;
  id_eleve: string;
  id_responsable: string;
  id_etablissement: string;
  id_nature_lien: string;
  est_representant_legal: number;
  est_responsable_financier: number;
  date_debut_validite: string;
  date_fin_validite: string | null;
  id_auteur_creation: string | null;
  id_auteur_cloture: string | null;
}

export type CreerRelationEleveResponsable = Pick<
  RelationEleveResponsable,
  | "id_relation_eleve_responsable"
  | "id_eleve"
  | "id_responsable"
  | "id_etablissement"
  | "id_nature_lien"
  | "est_representant_legal"
  | "est_responsable_financier"
  | "date_debut_validite"
  | "id_auteur_creation"
>;

export interface HistoriqueMatricule {
  id_historique_matricule: string;
  id_eleve: string;
  id_etablissement: string;
  id_historique_precedent: string | null;
  matricule: string;
  date_debut_validite: string;
  date_fin_validite: string | null;
  motif_correction: string | null;
  id_auteur_correction: string | null;
}

export interface AttributionInitialeMatricule {
  id_historique_matricule: string;
  id_eleve: string;
  id_etablissement: string;
  matricule: string;
  date_debut_validite: string;
}

export interface CorrectionMatricule {
  id_historique_matricule: string;
  id_eleve: string;
  id_etablissement: string;
  matricule: string;
  date_debut_validite: string;
  motif_correction: string;
  id_auteur_correction?: string | null;
}
