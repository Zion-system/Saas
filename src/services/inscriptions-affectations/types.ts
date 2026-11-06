export const ETATS_INSCRIPTION = ["BROUILLON", "CONFIRMEE", "ANNULEE"] as const;

export type EtatInscription = (typeof ETATS_INSCRIPTION)[number];

export interface Inscription {
  id_inscription: string;
  id_eleve: string;
  id_annee_scolaire: string;
  id_etablissement: string;
  id_preinscription: string | null;
  etat_inscription: EtatInscription;
}

type DonneesInscription = Omit<Inscription, "id_preinscription">;

export type CreerInscriptionDirecte = DonneesInscription;

export interface CreerInscriptionDepuisPreinscription extends DonneesInscription {
  id_preinscription: string;
}

export interface AffectationClasse {
  id_affectation_classe: string;
  id_inscription: string;
  id_classe_annuelle: string;
  id_etablissement: string;
  date_debut: string;
  date_fin: string | null;
}

export interface CreerPremiereAffectation {
  id_affectation_classe: string;
  id_inscription: string;
  id_classe_annuelle: string;
  id_etablissement: string;
  date_debut: string;
}

export interface ChangerClasse {
  id_affectation_classe: string;
  id_classe_annuelle: string;
  date_debut: string;
}
