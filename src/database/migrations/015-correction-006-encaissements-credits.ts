import type { Migration } from "./index";

/**
 * Migration corrective 015 — Lot 4 (encaissements, crédits, Mobile Money).
 *
 * Stratégie bêta (docs/20 §4.1) : reconstructions transactionnelles des
 * objets concernés, sans modification des migrations 001-014.
 *
 * Deltas fermes appliqués (docs/20 §4, §6) :
 * - 6.2 : trigger trg_encaissement_no_delete (append-only, FIN-LOT5-035).
 * - 6.4 : reconstruction de affectation_reglement — colonnes id_creance et
 *   id_echeance_creance, XOR strict d'origine (Q-09 / Arbitrage 2), XOR
 *   strict de cible (Arbitrage 1), montant_affecte_fcfa > 0 (Arbitrage 3),
 *   date_affectation, id_affectation_contrepassee, est_contrepassation,
 *   triggers append-only (Arbitrage 5), index docs/19 §6.
 * - 6.5 : reconstruction de transaction_mobile_money — id_encaissement
 *   nullable UNIQUE (Q-04), fournisseur, compte_marchand, montant_declare,
 *   telephone_payeur, date_declaration, date_confirmation, domaines
 *   d'états corrigés (G-13/G-14), UNIQUE composite externe (Q-04),
 *   CHECK atomique CONFIRME (Q-04).
 *
 * Points de gouvernance :
 * - G-12 (mouvement_credit) : NON TRANCHE — table conservee telle quelle ;
 *   la paire UNIQUE (id_affectation_reglement, id_mouvement_credit_utilisation)
 *   est conservee sur affectation_reglement pour preserver la FK composite
 *   DEFERRABLE de mouvement_credit.
 * - G-14 : domaines d'etats corriges selon docs/19 §3.20 ; le mapping des
 *   donnees existantes n'est pas defini — backfill sentinelle documente
 *   (bases vides en chaine fraiche ; bases peuplees : pre-controle requis).
 * - 6.1 : colonnes d'encaissement absentes du DDL reel — gouvernance, non
 *   tranchee (seul le trigger DELETE est ferme et autonome).
 */
const correction006EncaissementsCredits: Migration = {
  version: 15,
  name: "correction_006_encaissements_credits",
  sql: `
    CREATE TRIGGER trg_encaissement_no_delete
    BEFORE DELETE ON encaissement
    BEGIN
      SELECT RAISE(
        ABORT,
        'Un encaissement validé n''est jamais supprimé (FIN-LOT5-035).'
      );
    END;

    CREATE TABLE affectation_reglement_new (
      id_affectation_reglement TEXT NOT NULL PRIMARY KEY,
      id_encaissement TEXT,
      id_mouvement_credit_utilisation TEXT,
      id_creance TEXT,
      id_echeance_creance TEXT,
      montant_affecte_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_affecte_fcfa) = 'integer'
        AND montant_affecte_fcfa > 0
      ),
      date_affectation TEXT NOT NULL,
      id_affectation_contrepassee TEXT,
      est_contrepassation INTEGER NOT NULL DEFAULT 0 CHECK (
        est_contrepassation IN (0, 1)
      ),
      CHECK (
        (id_encaissement IS NOT NULL AND id_mouvement_credit_utilisation IS NULL)
        OR (id_encaissement IS NULL AND id_mouvement_credit_utilisation IS NOT NULL)
      ),
      CHECK (
        (id_creance IS NOT NULL AND id_echeance_creance IS NULL)
        OR (id_creance IS NULL AND id_echeance_creance IS NOT NULL)
      ),
      UNIQUE (id_mouvement_credit_utilisation),
      UNIQUE (id_affectation_reglement, id_mouvement_credit_utilisation),
      UNIQUE (id_affectation_contrepassee),
      FOREIGN KEY (id_encaissement)
        REFERENCES encaissement (id_encaissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_mouvement_credit_utilisation)
        REFERENCES mouvement_credit (id_mouvement_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_creance)
        REFERENCES creance (id_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_echeance_creance)
        REFERENCES echeance_creance (id_echeance_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_affectation_contrepassee)
        REFERENCES affectation_reglement (id_affectation_reglement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO affectation_reglement_new (
      id_affectation_reglement, id_encaissement,
      id_mouvement_credit_utilisation, montant_affecte_fcfa,
      date_affectation, est_contrepassation
    )
    SELECT
      id_affectation_reglement, id_encaissement,
      id_mouvement_credit_utilisation, montant_affecte_fcfa,
      '1970-01-01', 0
    FROM affectation_reglement;

    DROP TABLE affectation_reglement;
    ALTER TABLE affectation_reglement_new RENAME TO affectation_reglement;

    CREATE INDEX idx_affectation_creance
      ON affectation_reglement (id_creance)
      WHERE id_creance IS NOT NULL;
    CREATE INDEX idx_affectation_echeance
      ON affectation_reglement (id_echeance_creance)
      WHERE id_echeance_creance IS NOT NULL;
    CREATE INDEX idx_affectation_encaissement
      ON affectation_reglement (id_encaissement);

    CREATE TRIGGER trg_affectation_no_update
    BEFORE UPDATE ON affectation_reglement
    BEGIN
      SELECT RAISE(
        ABORT,
        'Une affectation validée est append-only (Arbitrage 5).'
      );
    END;

    CREATE TRIGGER trg_affectation_no_delete
    BEFORE DELETE ON affectation_reglement
    BEGIN
      SELECT RAISE(
        ABORT,
        'Une affectation validée ne peut pas être supprimée (Arbitrage 5).'
      );
    END;

    CREATE TABLE transaction_mobile_money_new (
      id_transaction_mobile_money TEXT NOT NULL PRIMARY KEY,
      id_encaissement TEXT,
      fournisseur TEXT NOT NULL CHECK (length(trim(fournisseur)) > 0),
      compte_marchand TEXT NOT NULL CHECK (length(trim(compte_marchand)) > 0),
      reference_externe TEXT NOT NULL CHECK (length(trim(reference_externe)) > 0),
      montant_declare_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_declare_fcfa) = 'integer'
        AND montant_declare_fcfa > 0
      ),
      telephone_payeur TEXT,
      date_declaration TEXT NOT NULL,
      date_confirmation TEXT,
      etat_synchronisation_technique TEXT NOT NULL DEFAULT 'CREE_LOCALEMENT'
        CHECK (
          etat_synchronisation_technique IN (
            'CREE_LOCALEMENT', 'EN_ATTENTE_SERVEUR',
            'CONFIRME_SERVEUR', 'EN_CONFLIT'
          )
        ),
      etat_financier TEXT NOT NULL DEFAULT 'INITIE' CHECK (
        etat_financier IN ('INITIE', 'CONFIRME', 'ECHOUE', 'EXPIRE')
      ),
      UNIQUE (fournisseur, compte_marchand, reference_externe),
      CHECK (
        (etat_financier = 'CONFIRME'
          AND id_encaissement IS NOT NULL
          AND date_confirmation IS NOT NULL)
        OR (etat_financier != 'CONFIRME' AND id_encaissement IS NULL)
      ),
      FOREIGN KEY (id_encaissement)
        REFERENCES encaissement (id_encaissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO transaction_mobile_money_new (
      id_transaction_mobile_money, id_encaissement, fournisseur,
      compte_marchand, reference_externe, montant_declare_fcfa,
      telephone_payeur, date_declaration, date_confirmation,
      etat_synchronisation_technique, etat_financier
    )
    SELECT
      id_transaction_mobile_money, NULL, 'A_DEFINIR', 'A_DEFINIR',
      reference_externe, 1, NULL, '1970-01-01', NULL,
      'CREE_LOCALEMENT', 'INITIE'
    FROM transaction_mobile_money;

    DROP TABLE transaction_mobile_money;
    ALTER TABLE transaction_mobile_money_new RENAME TO transaction_mobile_money;
  `,
};

export default correction006EncaissementsCredits;
