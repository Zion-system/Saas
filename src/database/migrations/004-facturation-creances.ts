import type { Migration } from "./index";

const facturationCreances: Migration = {
  version: 4,
  name: "facturation_creances",
  sql: `
    CREATE TABLE periode_facturation (
      id_periode_facturation TEXT NOT NULL PRIMARY KEY,
      id_annee_scolaire TEXT NOT NULL,
      date_debut_periode TEXT NOT NULL CHECK (
        date(date_debut_periode, '+0 days') IS NOT NULL
        AND date(date_debut_periode, '+0 days') = date_debut_periode
      ),
      date_fin_periode TEXT NOT NULL CHECK (
        date(date_fin_periode, '+0 days') IS NOT NULL
        AND date(date_fin_periode, '+0 days') = date_fin_periode
        AND date_fin_periode > date_debut_periode
      ),
      UNIQUE (id_periode_facturation, id_annee_scolaire),
      FOREIGN KEY (id_annee_scolaire)
        REFERENCES annee_scolaire (id_annee_scolaire)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_periode_facturation_annee
      ON periode_facturation (id_annee_scolaire);

    CREATE TABLE campagne_facturation (
      id_campagne_facturation TEXT NOT NULL PRIMARY KEY,
      id_annee_scolaire TEXT NOT NULL,
      id_type_frais TEXT NOT NULL,
      id_periode_facturation TEXT NOT NULL,
      auteur_lancement TEXT NOT NULL,
      date_lancement TEXT,
      resultat_global TEXT,
      FOREIGN KEY (id_annee_scolaire)
        REFERENCES annee_scolaire (id_annee_scolaire)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_type_frais)
        REFERENCES type_frais (id_type_frais)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_periode_facturation, id_annee_scolaire)
        REFERENCES periode_facturation (id_periode_facturation, id_annee_scolaire)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_campagne_facturation_annee
      ON campagne_facturation (id_annee_scolaire);
    CREATE INDEX idx_campagne_facturation_type_frais
      ON campagne_facturation (id_type_frais);
    CREATE INDEX idx_campagne_facturation_periode
      ON campagne_facturation (id_periode_facturation, id_annee_scolaire);

    CREATE TABLE execution_campagne_facturation (
      id_execution_campagne TEXT NOT NULL PRIMARY KEY,
      id_campagne_facturation TEXT NOT NULL,
      resultat_execution TEXT,
      traces_erreurs TEXT,
      date_tentative TEXT,
      UNIQUE (id_execution_campagne, id_campagne_facturation),
      FOREIGN KEY (id_campagne_facturation)
        REFERENCES campagne_facturation (id_campagne_facturation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_execution_campagne_parent
      ON execution_campagne_facturation (id_campagne_facturation);

    CREATE TABLE creance (
      id_creance TEXT NOT NULL PRIMARY KEY,
      id_eleve TEXT NOT NULL,
      id_annee_scolaire TEXT NOT NULL,
      id_type_frais TEXT NOT NULL,
      libelle_type_frais_snapshot TEXT NOT NULL,
      id_periode_facturation TEXT,
      id_inscription TEXT,
      id_affectation_classe TEXT,
      origine_creation TEXT NOT NULL CHECK (
        origine_creation IN ('CAMPAGNE', 'MANUELLE', 'AUTOMATIQUE')
      ),
      id_campagne_facturation TEXT,
      id_execution_campagne TEXT,
      auteur_creation TEXT,
      date_creation TEXT,
      motif_creation TEXT,
      id_evenement_declencheur TEXT,
      id_tarif_source TEXT,
      montant_brut_fcfa INTEGER NOT NULL CHECK (montant_brut_fcfa >= 0),
      id_periodicite TEXT,
      code_periodicite_snapshot TEXT,
      type_portee_tarifaire_snapshot TEXT CHECK (
        type_portee_tarifaire_snapshot IS NULL
        OR type_portee_tarifaire_snapshot IN (
          'ETABLISSEMENT', 'NIVEAU', 'FILIERE', 'NIVEAU_FILIERE', 'CLASSE'
        )
      ),
      date_debut_periode_facturee TEXT CHECK (
        date_debut_periode_facturee IS NULL OR (
          date(date_debut_periode_facturee, '+0 days') IS NOT NULL
          AND date(date_debut_periode_facturee, '+0 days') = date_debut_periode_facturee
        )
      ),
      date_fin_periode_facturee TEXT CHECK (
        date_fin_periode_facturee IS NULL OR (
          date(date_fin_periode_facturee, '+0 days') IS NOT NULL
          AND date(date_fin_periode_facturee, '+0 days') = date_fin_periode_facturee
        )
      ),
      id_politique_remise TEXT,
      id_attribution_remise TEXT,
      nature_remise_snapshot TEXT CHECK (
        nature_remise_snapshot IS NULL
        OR nature_remise_snapshot IN (
          'BOURSE', 'FRATRIE', 'SOCIALE', 'EXCEPTIONNELLE', 'EXONERATION'
        )
      ),
      forme_remise_snapshot TEXT CHECK (
        forme_remise_snapshot IS NULL
        OR forme_remise_snapshot IN ('MONTANT_FIXE', 'POURCENTAGE')
      ),
      valeur_remise_snapshot TEXT,
      motif_remise_snapshot TEXT,
      montant_remise_fcfa INTEGER NOT NULL DEFAULT 0 CHECK (montant_remise_fcfa >= 0),
      montant_net_initial_fcfa INTEGER NOT NULL CHECK (
        montant_net_initial_fcfa >= 0
        AND montant_net_initial_fcfa = montant_brut_fcfa - montant_remise_fcfa
      ),
      etat_administratif TEXT NOT NULL DEFAULT 'EMISE' CHECK (
        etat_administratif IN ('EMISE', 'ANNULEE')
      ),
      motif_annulation TEXT,
      auteur_annulation TEXT,
      date_annulation TEXT,
      CHECK (
        date_debut_periode_facturee IS NULL
        OR date_fin_periode_facturee IS NULL
        OR date_fin_periode_facturee > date_debut_periode_facturee
      ),
      CHECK (
        (origine_creation = 'CAMPAGNE'
          AND id_campagne_facturation IS NOT NULL
          AND id_execution_campagne IS NOT NULL
          AND auteur_creation IS NULL
          AND date_creation IS NULL
          AND motif_creation IS NULL
          AND id_evenement_declencheur IS NULL)
        OR (origine_creation = 'MANUELLE'
          AND id_campagne_facturation IS NULL
          AND id_execution_campagne IS NULL
          AND auteur_creation IS NOT NULL
          AND date_creation IS NOT NULL
          AND motif_creation IS NOT NULL
          AND length(trim(motif_creation)) > 0
          AND id_evenement_declencheur IS NULL)
        OR (origine_creation = 'AUTOMATIQUE'
          AND id_campagne_facturation IS NULL
          AND id_execution_campagne IS NULL
          AND auteur_creation IS NULL
          AND date_creation IS NULL
          AND motif_creation IS NULL
          AND id_evenement_declencheur IS NOT NULL)
      ),
      CHECK (
        (etat_administratif = 'EMISE'
          AND motif_annulation IS NULL
          AND auteur_annulation IS NULL
          AND date_annulation IS NULL)
        OR (etat_administratif = 'ANNULEE'
          AND motif_annulation IS NOT NULL
          AND length(trim(motif_annulation)) > 0
          AND auteur_annulation IS NOT NULL
          AND date_annulation IS NOT NULL)
      ),
      CHECK (
        (id_attribution_remise IS NULL OR id_politique_remise IS NOT NULL)
        AND (id_politique_remise IS NULL OR forme_remise_snapshot IS NOT NULL)
        AND (forme_remise_snapshot IS NULL OR valeur_remise_snapshot IS NOT NULL)
        AND (forme_remise_snapshot IS NULL OR motif_remise_snapshot IS NOT NULL)
      ),
      FOREIGN KEY (id_annee_scolaire)
        REFERENCES annee_scolaire (id_annee_scolaire)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_type_frais)
        REFERENCES type_frais (id_type_frais)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_periode_facturation, id_annee_scolaire)
        REFERENCES periode_facturation (id_periode_facturation, id_annee_scolaire)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_tarif_source)
        REFERENCES tarif (id_tarif)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_periodicite)
        REFERENCES periodicite (id_periodicite)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_politique_remise)
        REFERENCES politique_remise (id_politique_remise)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_attribution_remise)
        REFERENCES attribution_remise (id_attribution_remise)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_execution_campagne, id_campagne_facturation)
        REFERENCES execution_campagne_facturation
          (id_execution_campagne, id_campagne_facturation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_creance_eleve_annee
      ON creance (id_eleve, id_annee_scolaire);
    CREATE INDEX idx_creance_type_annee
      ON creance (id_type_frais, id_annee_scolaire);
    CREATE INDEX idx_creance_campagne_execution
      ON creance (id_execution_campagne, id_campagne_facturation);
    CREATE INDEX idx_creance_tarif ON creance (id_tarif_source);

    CREATE TRIGGER trg_creance_snapshot_immutable
    BEFORE UPDATE OF
      id_eleve, id_annee_scolaire, id_type_frais, libelle_type_frais_snapshot,
      id_periode_facturation, id_inscription, id_affectation_classe,
      origine_creation, id_campagne_facturation, id_execution_campagne,
      auteur_creation, date_creation, motif_creation, id_evenement_declencheur,
      id_tarif_source, montant_brut_fcfa, id_periodicite,
      code_periodicite_snapshot, type_portee_tarifaire_snapshot,
      date_debut_periode_facturee, date_fin_periode_facturee,
      id_politique_remise, id_attribution_remise, nature_remise_snapshot,
      forme_remise_snapshot, valeur_remise_snapshot, motif_remise_snapshot,
      montant_remise_fcfa, montant_net_initial_fcfa
    ON creance
    BEGIN
      SELECT RAISE(ABORT, 'Les snapshots d’une créance émise sont immuables.');
    END;

    CREATE TRIGGER trg_creance_non_supprimable
    BEFORE DELETE ON creance
    BEGIN
      SELECT RAISE(ABORT, 'Une créance émise ou annulée est conservée.');
    END;

    CREATE TRIGGER trg_creance_tarif_coherent_insert
    BEFORE INSERT ON creance
    WHEN NEW.id_tarif_source IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM tarif
        WHERE id_tarif = NEW.id_tarif_source
          AND id_type_frais = NEW.id_type_frais
          AND id_annee_scolaire = NEW.id_annee_scolaire
      )
    BEGIN
      SELECT RAISE(ABORT, 'Le tarif source doit correspondre au type de frais et à l’année de la créance.');
    END;

    CREATE TRIGGER trg_creance_tarif_coherent_update
    BEFORE UPDATE OF id_tarif_source, id_type_frais, id_annee_scolaire ON creance
    WHEN NEW.id_tarif_source IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM tarif
        WHERE id_tarif = NEW.id_tarif_source
          AND id_type_frais = NEW.id_type_frais
          AND id_annee_scolaire = NEW.id_annee_scolaire
      )
    BEGIN
      SELECT RAISE(ABORT, 'Le tarif source doit correspondre au type de frais et à l’année de la créance.');
    END;

    CREATE TRIGGER trg_creance_remise_coherente_insert
    BEFORE INSERT ON creance
    WHEN NEW.id_attribution_remise IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM attribution_remise
        WHERE id_attribution_remise = NEW.id_attribution_remise
          AND id_politique_remise = NEW.id_politique_remise
      )
    BEGIN
      SELECT RAISE(ABORT, 'L’attribution doit correspondre à la politique de remise enregistrée.');
    END;

    CREATE TRIGGER trg_creance_remise_coherente_update
    BEFORE UPDATE OF id_attribution_remise, id_politique_remise ON creance
    WHEN NEW.id_attribution_remise IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM attribution_remise
        WHERE id_attribution_remise = NEW.id_attribution_remise
          AND id_politique_remise = NEW.id_politique_remise
      )
    BEGIN
      SELECT RAISE(ABORT, 'L’attribution doit correspondre à la politique de remise enregistrée.');
    END;
  `,
};

export default facturationCreances;
