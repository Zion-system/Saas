import type { Migration } from "./index";

const inscriptionsAffectations: Migration = {
  version: 13,
  name: "inscriptions_affectations",
  sql: `
    ALTER TABLE classe_annuelle
      ADD COLUMN capacite_max INTEGER CHECK (
        capacite_max IS NULL OR (
          typeof(capacite_max) = 'integer'
          AND capacite_max >= 0
        )
      );

    CREATE TABLE inscription (
      id_inscription TEXT NOT NULL PRIMARY KEY,
      id_eleve TEXT NOT NULL,
      id_annee_scolaire TEXT NOT NULL,
      id_etablissement TEXT NOT NULL,
      id_preinscription TEXT UNIQUE,
      etat_inscription TEXT NOT NULL CHECK (
        etat_inscription IN ('BROUILLON', 'CONFIRMEE', 'ANNULEE')
      ),
      UNIQUE (id_inscription, id_etablissement),
      FOREIGN KEY (id_eleve, id_etablissement)
        REFERENCES eleve (id_eleve, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_annee_scolaire, id_etablissement)
        REFERENCES annee_scolaire (id_annee_scolaire, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_preinscription)
        REFERENCES preinscription (id_preinscription)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE UNIQUE INDEX idx_inscription_confirmee_eleve_annee
      ON inscription (id_eleve, id_annee_scolaire)
      WHERE etat_inscription = 'CONFIRMEE';

    CREATE INDEX idx_inscription_eleve_annee
      ON inscription (id_eleve, id_annee_scolaire);

    CREATE TRIGGER trg_inscription_preinscription_eleve_insert
    BEFORE INSERT ON inscription
    WHEN NEW.id_preinscription IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM preinscription
        WHERE id_preinscription = NEW.id_preinscription
          AND id_eleve IS NOT NULL
          AND id_eleve IS NOT NEW.id_eleve
      )
    BEGIN
      SELECT RAISE(ABORT, 'La préinscription de l’élève connu doit concerner le même élève.');
    END;

    CREATE TRIGGER trg_inscription_preinscription_eleve_update
    BEFORE UPDATE OF id_preinscription, id_eleve ON inscription
    WHEN NEW.id_preinscription IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM preinscription
        WHERE id_preinscription = NEW.id_preinscription
          AND id_eleve IS NOT NULL
          AND id_eleve IS NOT NEW.id_eleve
      )
    BEGIN
      SELECT RAISE(ABORT, 'La préinscription de l’élève connu doit concerner le même élève.');
    END;

    CREATE TRIGGER trg_inscription_annulee_non_supprimable
    BEFORE DELETE ON inscription
    WHEN OLD.etat_inscription = 'ANNULEE'
    BEGIN
      SELECT RAISE(ABORT, 'Une inscription annulée est conservée.');
    END;

    CREATE TRIGGER trg_preinscription_eleve_coherent_avec_inscription
    BEFORE UPDATE OF id_eleve ON preinscription
    WHEN EXISTS (
      SELECT 1 FROM inscription
      WHERE id_preinscription = OLD.id_preinscription
        AND (
          (OLD.id_eleve IS NOT NULL AND NEW.id_eleve IS NOT OLD.id_eleve)
          OR (
            OLD.id_eleve IS NULL
            AND NEW.id_eleve IS NOT NULL
            AND NEW.id_eleve IS NOT inscription.id_eleve
          )
        )
    )
    BEGIN
      SELECT RAISE(ABORT, 'L’élève d’une préinscription liée doit correspondre à celui de l’inscription.');
    END;

    CREATE TABLE affectation_classe (
      id_affectation_classe TEXT NOT NULL PRIMARY KEY,
      id_inscription TEXT NOT NULL,
      id_classe_annuelle TEXT NOT NULL,
      id_etablissement TEXT NOT NULL,
      date_debut TEXT NOT NULL CHECK (
        date(date_debut, '+0 days') IS NOT NULL
        AND date(date_debut, '+0 days') = date_debut
      ),
      date_fin TEXT CHECK (
        date_fin IS NULL OR (
          date(date_fin, '+0 days') IS NOT NULL
          AND date(date_fin, '+0 days') = date_fin
          AND date_fin > date_debut
        )
      ),
      FOREIGN KEY (id_inscription, id_etablissement)
        REFERENCES inscription (id_inscription, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_classe_annuelle, id_etablissement)
        REFERENCES classe_annuelle (id_classe_annuelle, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE UNIQUE INDEX idx_affectation_classe_courante_inscription
      ON affectation_classe (id_inscription, id_etablissement)
      WHERE date_fin IS NULL;

    CREATE INDEX idx_affectation_classe_historique_inscription
      ON affectation_classe (id_inscription, id_etablissement, date_debut);

    CREATE INDEX idx_affectation_classe_courante_classe
      ON affectation_classe (id_classe_annuelle, id_etablissement)
      WHERE date_fin IS NULL;

    CREATE TRIGGER trg_affectation_classe_no_overlap_insert
    BEFORE INSERT ON affectation_classe
    WHEN EXISTS (
      SELECT 1 FROM affectation_classe
      WHERE id_inscription = NEW.id_inscription
        AND id_etablissement = NEW.id_etablissement
        AND (NEW.date_fin IS NULL OR date_debut < NEW.date_fin)
        AND (date_fin IS NULL OR date_fin > NEW.date_debut)
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les périodes d’affectation d’une inscription ne peuvent pas se chevaucher.');
    END;

    CREATE TRIGGER trg_affectation_classe_coherence_insert
    BEFORE INSERT ON affectation_classe
    WHEN NOT EXISTS (
      SELECT 1
      FROM inscription
      JOIN classe_annuelle
        ON classe_annuelle.id_classe_annuelle = NEW.id_classe_annuelle
       AND classe_annuelle.id_etablissement = NEW.id_etablissement
      WHERE inscription.id_inscription = NEW.id_inscription
        AND inscription.id_etablissement = NEW.id_etablissement
        AND inscription.id_annee_scolaire = classe_annuelle.id_annee_scolaire
    )
    BEGIN
      SELECT RAISE(ABORT, 'L’affectation doit relier une inscription et une classe annuelle du même établissement et de la même année.');
    END;

    CREATE TRIGGER trg_affectation_classe_capacite_insert
    BEFORE INSERT ON affectation_classe
    WHEN NEW.date_fin IS NULL
      AND (
        SELECT capacite_max FROM classe_annuelle
        WHERE id_classe_annuelle = NEW.id_classe_annuelle
          AND id_etablissement = NEW.id_etablissement
      ) IS NOT NULL
      AND (
        SELECT COUNT(*) FROM affectation_classe
        WHERE id_classe_annuelle = NEW.id_classe_annuelle
          AND id_etablissement = NEW.id_etablissement
          AND date_fin IS NULL
      ) >= (
        SELECT capacite_max FROM classe_annuelle
        WHERE id_classe_annuelle = NEW.id_classe_annuelle
          AND id_etablissement = NEW.id_etablissement
      )
    BEGIN
      SELECT RAISE(ABORT, 'La capacité maximale de la classe annuelle est atteinte.');
    END;

    CREATE TRIGGER trg_affectation_classe_dates_immutable
    BEFORE UPDATE ON affectation_classe
    WHEN OLD.date_fin IS NOT NULL
      OR NEW.date_fin IS NULL
      OR NEW.id_affectation_classe IS NOT OLD.id_affectation_classe
      OR NEW.id_inscription IS NOT OLD.id_inscription
      OR NEW.id_classe_annuelle IS NOT OLD.id_classe_annuelle
      OR NEW.id_etablissement IS NOT OLD.id_etablissement
      OR NEW.date_debut IS NOT OLD.date_debut
    BEGIN
      SELECT RAISE(ABORT, 'Une affectation ne peut être modifiée que pour clôturer une affectation courante.');
    END;

    CREATE TRIGGER trg_affectation_classe_non_supprimable
    BEFORE DELETE ON affectation_classe
    BEGIN
      SELECT RAISE(ABORT, 'Les affectations de classe historiques sont conservées.');
    END;

    CREATE TRIGGER trg_inscription_annee_affectation_immutable
    BEFORE UPDATE OF id_annee_scolaire ON inscription
    WHEN EXISTS (
      SELECT 1
      FROM affectation_classe
      JOIN classe_annuelle
        ON classe_annuelle.id_classe_annuelle = affectation_classe.id_classe_annuelle
       AND classe_annuelle.id_etablissement = affectation_classe.id_etablissement
      WHERE affectation_classe.id_inscription = OLD.id_inscription
        AND classe_annuelle.id_annee_scolaire IS NOT NEW.id_annee_scolaire
    )
    BEGIN
      SELECT RAISE(ABORT, 'L’année d’une inscription affectée ne peut pas être modifiée si elle rompt la cohérence de l’affectation.');
    END;

    CREATE TRIGGER trg_inscription_eleve_immutable_apres_affectation
    BEFORE UPDATE OF id_eleve ON inscription
    WHEN NEW.id_eleve IS NOT OLD.id_eleve
      AND EXISTS (
        SELECT 1 FROM affectation_classe
        WHERE id_inscription = OLD.id_inscription
      )
    BEGIN
      SELECT RAISE(ABORT, 'L’élève d’une inscription ne peut pas être modifié après une affectation de classe.');
    END;

    CREATE TRIGGER trg_classe_annuelle_annee_affectation_immutable
    BEFORE UPDATE OF id_annee_scolaire ON classe_annuelle
    WHEN EXISTS (
      SELECT 1
      FROM affectation_classe
      JOIN inscription
        ON inscription.id_inscription = affectation_classe.id_inscription
       AND inscription.id_etablissement = affectation_classe.id_etablissement
      WHERE affectation_classe.id_classe_annuelle = OLD.id_classe_annuelle
        AND affectation_classe.id_etablissement = OLD.id_etablissement
        AND inscription.id_annee_scolaire IS NOT NEW.id_annee_scolaire
    )
    BEGIN
      SELECT RAISE(ABORT, 'L’année d’une classe affectée ne peut pas être modifiée si elle rompt la cohérence de l’affectation.');
    END;

    CREATE TRIGGER trg_classe_annuelle_capacite_update
    BEFORE UPDATE OF capacite_max ON classe_annuelle
    WHEN NEW.capacite_max IS NOT NULL
      AND (
        SELECT COUNT(*) FROM affectation_classe
        WHERE id_classe_annuelle = OLD.id_classe_annuelle
          AND id_etablissement = OLD.id_etablissement
          AND date_fin IS NULL
      ) > NEW.capacite_max
    BEGIN
      SELECT RAISE(ABORT, 'La capacité maximale ne peut pas être inférieure aux affectations courantes.');
    END;
  `,
};

export default inscriptionsAffectations;
