export interface Candidature {
  id_candidature: string;
}

export type CreerCandidature = Candidature;

export interface Preinscription {
  id_preinscription: string;
  id_candidature: string | null;
  id_eleve: string | null;
}

export type CreerPreinscription = Preinscription;
