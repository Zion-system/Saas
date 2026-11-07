import type { Migration } from "./index";

/**
 * Migration corrective 014 — Lot 3 (échéanciers et règlements).
 *
 * Stratégie bêta (docs/20 §4.1) : reconstructions transactionnelles des
 * objets concernés, sans modification des migrations 001-013.
 *
 * Deltas fermes appliqués (docs/20 §3) :
 * - 5.1/5.2 : reconstruction de plan_reglement_creance (type_plan,
 *   etat_plan, date_validation, valide_par, montant_total > 0) et index
 *   partiel unique idx_plan_creance_actif (D-8 / B.2).
 * - 5.3 : reconstruction de echeance_creance (statut_echeance, rang > 0,
 *   montant_exigible > 0, UNIQUE (id_plan_reglement_creance, rang)) — Q-03.
 * - 5.4 : trigger trg_plan_somme_echeances (somme des échéances d'un plan
 *   ACTIF = montant_total_planifie_fcfa, sous réserve Q-03 maintenue).
 * - G-09 : nom d'index conforme docs/19 (idx_plan_creance_actif).
 *
 * Points de gouvernance non tranchés (docs/20) : G-10 (sort de
 * etat_administratif et des FK composites — conservées telles quelles),
 * G-11 (FK composites conservées, UNIQUE (plan, rang) ajoutée).
 *
 * Pré-contrôles bases déployées (docs/20 §7.4) : unicité (plan, rang),
 * montants > 0, plans ACTIF multiples par créance.
 */
const correction005EcheanciersReglements: Migration = {
  version: 14,
  name: "correction_005_echeanciers_reglements",
  sql: `
    DROP TRIGGER trg_version_modele_utilisee_immutable;
    DROP TRIGGER trg_ligne_relance_meme_eleve_echeance;
    DROP TRIGGER trg_ligne_relance_pas_creance_et_echeances_insert;

    CREATE TABLE plan_reglement_creance_new (
      id_plan_reglement_creance TEXT NOT NULL PRIMARY KEY,
      id_creance TEXT NOT NULL,
      id_version_modele_echeancier TEXT,
      montant_total_planifie_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_total_planifie_fcfa) = 'integer'
        AND montant_total_planifie_fcfa > 0
      ),
      type_plan TEXT NOT NULL CHECK (type_plan IN ('INITIAL', 'REAMENAGE')),
      etat_plan TEXT NOT NULL DEFAULT 'ACTIF' CHECK (
        etat_plan IN ('BROUILLON', 'ACTIF', 'HISTORIQUE', 'ANNULE')
      ),
      date_validation TEXT,
      valide_par TEXT,
      UNIQUE (id_plan_reglement_creance, id_creance),
      FOREIGN KEY (id_creance)
        REFERENCES creance (id_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_version_modele_echeancier)
        REFERENCES version_modele_echeancier (id_version_modele_echeancier)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO plan_reglement_creance_new (
      id_plan_reglement_creance, id_creance, id_version_modele_echeancier,
      montant_total_planifie_fcfa, type_plan, etat_plan
    )
    SELECT
      id_plan_reglement_creance, id_creance, id_version_modele_echeancier,
      montant_total_planifie_fcfa, 'INITIAL', 'ACTIF'
    FROM plan_reglement_creance;

    DROP TABLE plan_reglement_creance;
    ALTER TABLE plan_reglement_creance_new RENAME TO plan_reglement_creance;

    CREATE INDEX idx_plan_reglement_creance_creance
      ON plan_reglement_creance (id_creance);
    CREATE INDEX idx_plan_reglement_creance_version
      ON plan_reglement_creance (id_version_modele_echeancier);
    CREATE UNIQUE INDEX idx_plan_creance_actif
      ON plan_reglement_creance (id_creance)
      WHERE etat_plan = 'ACTIF';

    CREATE TABLE echeance_creance_new (
      id_echeance_creance TEXT NOT NULL PRIMARY KEY,
      id_creance TEXT NOT NULL,
      id_plan_reglement_creance TEXT NOT NULL,
      montant_exigible_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_exigible_fcfa) = 'integer'
        AND montant_exigible_fcfa > 0
      ),
      date_exigibilite TEXT NOT NULL CHECK (
        date(date_exigibilite, '+0 days') IS NOT NULL
        AND date(date_exigibilite, '+0 days') = date_exigibilite
      ),
      rang INTEGER NOT NULL CHECK (typeof(rang) = 'integer' AND rang > 0),
      etat_administratif TEXT NOT NULL,
      statut_echeance TEXT NOT NULL DEFAULT 'NON_SOLDEE' CHECK (
        statut_echeance IN (
          'NON_SOLDEE', 'PARTIELLEMENT_SOLDEE', 'SOLDEE', 'ANNULEE'
        )
      ),
      id_reamenagement_creation TEXT,
      id_reamenagement_remplacement TEXT,
      UNIQUE (id_plan_reglement_creance, rang),
      FOREIGN KEY (id_plan_reglement_creance, id_creance)
        REFERENCES plan_reglement_creance (id_plan_reglement_creance, id_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_creance)
        REFERENCES creance (id_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_reamenagement_creation)
        REFERENCES reamenagement_echeancier (id_reamenagement_echeancier)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_reamenagement_remplacement)
        REFERENCES reamenagement_echeancier (id_reamenagement_echeancier)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO echeance_creance_new (
      id_echeance_creance, id_creance, id_plan_reglement_creance,
      montant_exigible_fcfa, date_exigibilite, rang, etat_administratif,
      statut_echeance, id_reamenagement_creation, id_reamenagement_remplacement
    )
    SELECT
      id_echeance_creance, id_creance, id_plan_reglement_creance,
      montant_exigible_fcfa, date_exigibilite, rang, etat_administratif,
      'NON_SOLDEE', id_reamenagement_creation, id_reamenagement_remplacement
    FROM echeance_creance;

    DROP TABLE echeance_creance;
    ALTER TABLE echeance_creance_new RENAME TO echeance_creance;

    CREATE INDEX idx_echeance_creance_creance
      ON echeance_creance (id_creance);
    CREATE INDEX idx_echeance_creance_plan
      ON echeance_creance (id_plan_reglement_creance, id_creance);
    CREATE INDEX idx_echeance_creance_date
      ON echeance_creance (date_exigibilite);
    CREATE INDEX idx_echeance_reamenagement_creation
      ON echeance_creance (id_reamenagement_creation);
    CREATE INDEX idx_echeance_reamenagement_remplacement
      ON echeance_creance (id_reamenagement_remplacement);

    CREATE TRIGGER trg_echeance_historique_non_supprimable
    BEFORE DELETE ON echeance_creance
    BEGIN
      SELECT RAISE(ABORT, 'Une échéance est conservée dans son historique.');
    END;

    CREATE TRIGGER trg_version_modele_utilisee_immutable
    BEFORE UPDATE ON version_modele_echeancier
    WHEN EXISTS (
      SELECT 1 FROM ligne_modele_echeancier
      WHERE id_version_modele_echeancier = OLD.id_version_modele_echeancier
      UNION ALL
      SELECT 1 FROM plan_reglement_creance
      WHERE id_version_modele_echeancier = OLD.id_version_modele_echeancier
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une version utilisée reste immuable.');
    END;

    CREATE TRIGGER trg_ligne_relance_meme_eleve_echeance
    BEFORE INSERT ON ligne_relance_financiere
    WHEN NEW.id_echeance_creance IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM relance_financiere AS relance
        JOIN echeance_creance AS echeance
          ON echeance.id_echeance_creance = NEW.id_echeance_creance
        JOIN creance ON creance.id_creance = echeance.id_creance
        WHERE relance.id_relance = NEW.id_relance
          AND creance.id_eleve = relance.id_eleve
      )
    BEGIN
      SELECT RAISE(ABORT, 'L’échéance ciblée doit appartenir à l’élève de la relance.');
    END;

    CREATE TRIGGER trg_ligne_relance_pas_creance_et_echeances_insert
    BEFORE INSERT ON ligne_relance_financiere
    WHEN (
      NEW.id_creance IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM ligne_relance_financiere AS ligne
        JOIN echeance_creance AS echeance
          ON echeance.id_echeance_creance = ligne.id_echeance_creance
        WHERE ligne.id_relance = NEW.id_relance
          AND echeance.id_creance = NEW.id_creance
      )
    ) OR (
      NEW.id_echeance_creance IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM ligne_relance_financiere AS ligne
        WHERE ligne.id_relance = NEW.id_relance
          AND ligne.id_creance = (
            SELECT id_creance FROM echeance_creance
            WHERE id_echeance_creance = NEW.id_echeance_creance
          )
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une relance ne mélange pas une créance et ses échéances.');
    END;

    CREATE TRIGGER trg_plan_somme_echeances_insert
    AFTER INSERT ON echeance_creance
    BEGIN
      SELECT RAISE(
        ABORT,
        'La somme des échéances doit égaler le montant total du plan actif (Q-03).'
      )
      WHERE EXISTS (
        SELECT 1
        FROM plan_reglement_creance AS p
        WHERE p.id_plan_reglement_creance = NEW.id_plan_reglement_creance
          AND p.etat_plan = 'ACTIF'
          AND COALESCE((
            SELECT SUM(e.montant_exigible_fcfa)
            FROM echeance_creance AS e
            WHERE e.id_plan_reglement_creance = NEW.id_plan_reglement_creance
          ), 0) <> p.montant_total_planifie_fcfa
      );
    END;

    CREATE TRIGGER trg_plan_somme_echeances_update
    AFTER UPDATE ON echeance_creance
    BEGIN
      SELECT RAISE(
        ABORT,
        'La somme des échéances doit égaler le montant total du plan actif (Q-03).'
      )
      WHERE EXISTS (
        SELECT 1
        FROM plan_reglement_creance AS p
        WHERE p.etat_plan = 'ACTIF'
          AND p.id_plan_reglement_creance IN (
            OLD.id_plan_reglement_creance, NEW.id_plan_reglement_creance
          )
          AND COALESCE((
            SELECT SUM(e.montant_exigible_fcfa)
            FROM echeance_creance AS e
            WHERE e.id_plan_reglement_creance = p.id_plan_reglement_creance
          ), 0) <> p.montant_total_planifie_fcfa
      );
    END;

    CREATE TRIGGER trg_plan_somme_echeances_delete
    AFTER DELETE ON echeance_creance
    BEGIN
      SELECT RAISE(
        ABORT,
        'La somme des échéances doit égaler le montant total du plan actif (Q-03).'
      )
      WHERE EXISTS (
        SELECT 1
        FROM plan_reglement_creance AS p
        WHERE p.id_plan_reglement_creance = OLD.id_plan_reglement_creance
          AND p.etat_plan = 'ACTIF'
          AND COALESCE((
            SELECT SUM(e.montant_exigible_fcfa)
            FROM echeance_creance AS e
            WHERE e.id_plan_reglement_creance = OLD.id_plan_reglement_creance
          ), 0) <> p.montant_total_planifie_fcfa
      );
    END;
  `,
};

export default correction005EcheanciersReglements;
