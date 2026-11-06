import type { Migration } from "./index";

const encaissementsCreditsMobileMoney: Migration = {
  version: 6,
  name: "encaissements_credits_mobile_money",
  sql: `
    CREATE TABLE encaissement (
      id_encaissement TEXT NOT NULL PRIMARY KEY,
      montant_encaisse_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_encaisse_fcfa) = 'integer'
        AND montant_encaisse_fcfa > 0
      )
    );

    CREATE TABLE mouvement_credit (
      id_mouvement_credit TEXT NOT NULL PRIMARY KEY,
      montant_mouvement_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_mouvement_fcfa) = 'integer'
      ),
      nature_mouvement TEXT NOT NULL,
      id_affectation_reglement TEXT,
      CHECK (
        (nature_mouvement = 'UTILISATION'
          AND id_affectation_reglement IS NOT NULL)
        OR (nature_mouvement <> 'UTILISATION'
          AND id_affectation_reglement IS NULL)
      ),
      UNIQUE (id_affectation_reglement),
      UNIQUE (id_affectation_reglement, id_mouvement_credit),
      FOREIGN KEY (id_affectation_reglement, id_mouvement_credit)
        REFERENCES affectation_reglement
          (id_affectation_reglement, id_mouvement_credit_utilisation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
        DEFERRABLE INITIALLY DEFERRED
    );

    CREATE TABLE affectation_reglement (
      id_affectation_reglement TEXT NOT NULL PRIMARY KEY,
      id_encaissement TEXT,
      id_mouvement_credit_utilisation TEXT,
      montant_affecte_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_affecte_fcfa) = 'integer'
        AND montant_affecte_fcfa >= 0
      ),
      CHECK (
        id_encaissement IS NOT NULL
        OR id_mouvement_credit_utilisation IS NOT NULL
      ),
      UNIQUE (id_mouvement_credit_utilisation),
      UNIQUE (id_affectation_reglement, id_mouvement_credit_utilisation),
      FOREIGN KEY (id_encaissement)
        REFERENCES encaissement (id_encaissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_affectation_reglement, id_mouvement_credit_utilisation)
        REFERENCES mouvement_credit
          (id_affectation_reglement, id_mouvement_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
        DEFERRABLE INITIALLY DEFERRED
    );

    CREATE INDEX idx_affectation_reglement_encaissement
      ON affectation_reglement (id_encaissement);

    CREATE TABLE transaction_mobile_money (
      id_transaction_mobile_money TEXT NOT NULL PRIMARY KEY,
      reference_externe TEXT NOT NULL,
      etat_synchronisation_technique TEXT NOT NULL CHECK (
        etat_synchronisation_technique IN (
          'LOCALE_NON_SYNCHRONISEE',
          'EN_ATTENTE_SYNCHRONISATION',
          'SYNCHRONISEE',
          'CONFLIT_SYNCHRONISATION'
        )
      ),
      etat_verification_financiere TEXT NOT NULL CHECK (
        etat_verification_financiere IN (
          'DECLARE', 'EN_ATTENTE_VERIFICATION', 'CONFIRME', 'REJETE'
        )
      )
    );

    CREATE INDEX idx_transaction_mobile_money_etat_sync
      ON transaction_mobile_money (etat_synchronisation_technique);
    CREATE INDEX idx_transaction_mobile_money_etat_financier
      ON transaction_mobile_money (etat_verification_financiere);
  `,
};

export default encaissementsCreditsMobileMoney;