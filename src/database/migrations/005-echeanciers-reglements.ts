import type { Migration } from "./index";

const echeanciersReglements: Migration = {
  version: 5,
  name: "echeanciers_reglements",
  sql: `
    CREATE TABLE modele_echeancier (
      id_modele_echeancier TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE version_modele_echeancier (
      id_version_modele_echeancier TEXT NOT NULL PRIMARY KEY,
      id_modele_echeancier TEXT NOT NULL,
      FOREIGN KEY (id_modele_echeancier)
        REFERENCES modele_echeancier (id_modele_echeancier)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_version_modele_echeancier_modele
      ON version_modele_echeancier (id_modele_echeancier);

    CREATE TABLE ligne_modele_echeancier (
      id_ligne_modele_echeancier TEXT NOT NULL PRIMARY KEY,
      id_version_modele_echeancier TEXT NOT NULL,
      FOREIGN KEY (id_version_modele_echeancier)
        REFERENCES version_modele_echeancier (id_version_modele_echeancier)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_ligne_modele_echeancier_version
      ON ligne_modele_echeancier (id_version_modele_echeancier);

    CREATE TABLE plan_reglement_creance (
      id_plan_reglement_creance TEXT NOT NULL PRIMARY KEY,
      id_creance TEXT NOT NULL,
      id_version_modele_echeancier TEXT,
      montant_total_planifie_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_total_planifie_fcfa) = 'integer'
      ),
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

    CREATE INDEX idx_plan_reglement_creance_creance
      ON plan_reglement_creance (id_creance);
    CREATE INDEX idx_plan_reglement_creance_version
      ON plan_reglement_creance (id_version_modele_echeancier);

    CREATE TABLE reamenagement_echeancier (
      id_reamenagement_echeancier TEXT NOT NULL PRIMARY KEY,
      motif TEXT NOT NULL CHECK (length(trim(motif)) > 0),
      auteur TEXT NOT NULL,
      date_reamenagement TEXT NOT NULL,
      id_plan_precedent TEXT,
      id_version_modele_precedente TEXT,
      FOREIGN KEY (id_plan_precedent)
        REFERENCES plan_reglement_creance (id_plan_reglement_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_version_modele_precedente)
        REFERENCES version_modele_echeancier (id_version_modele_echeancier)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_reamenagement_plan_precedent
      ON reamenagement_echeancier (id_plan_precedent);
    CREATE INDEX idx_reamenagement_version_precedente
      ON reamenagement_echeancier (id_version_modele_precedente);

    CREATE TABLE echeance_creance (
      id_echeance_creance TEXT NOT NULL PRIMARY KEY,
      id_creance TEXT NOT NULL,
      id_plan_reglement_creance TEXT NOT NULL,
      montant_exigible_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_exigible_fcfa) = 'integer'
      ),
      date_exigibilite TEXT NOT NULL CHECK (
        date(date_exigibilite, '+0 days') IS NOT NULL
        AND date(date_exigibilite, '+0 days') = date_exigibilite
      ),
      rang INTEGER NOT NULL CHECK (typeof(rang) = 'integer'),
      etat_administratif TEXT NOT NULL,
      id_reamenagement_creation TEXT,
      id_reamenagement_remplacement TEXT,
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

    CREATE TRIGGER trg_echeance_historique_non_supprimable
    BEFORE DELETE ON echeance_creance
    BEGIN
      SELECT RAISE(ABORT, 'Une échéance est conservée dans son historique.');
    END;

    CREATE TABLE evenement_echeance (
      id_evenement_echeance TEXT NOT NULL PRIMARY KEY,
      id_echeance_creance TEXT NOT NULL,
      id_reamenagement_echeancier TEXT,
      type_evenement TEXT NOT NULL,
      date_evenement TEXT NOT NULL,
      FOREIGN KEY (id_echeance_creance)
        REFERENCES echeance_creance (id_echeance_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_reamenagement_echeancier)
        REFERENCES reamenagement_echeancier (id_reamenagement_echeancier)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_evenement_echeance_parent
      ON evenement_echeance (id_echeance_creance);
    CREATE INDEX idx_evenement_echeance_reamenagement
      ON evenement_echeance (id_reamenagement_echeancier);
  `,
};

export default echeanciersReglements;
