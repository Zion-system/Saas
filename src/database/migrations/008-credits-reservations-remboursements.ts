import type { Migration } from "./index";

const creditsReservationsRemboursements: Migration = {
  version: 8,
  name: "credits_reservations_remboursements",
  sql: `
    CREATE TABLE reservation_credit (
      id_reservation_credit TEXT NOT NULL PRIMARY KEY,
      id_mouvement_credit_source TEXT NOT NULL,
      montant_reserve_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_reserve_fcfa) = 'integer'
        AND montant_reserve_fcfa > 0
      ),
      est_provisoire INTEGER NOT NULL DEFAULT 1 CHECK (est_provisoire IN (0, 1)),
      FOREIGN KEY (id_mouvement_credit_source)
        REFERENCES mouvement_credit (id_mouvement_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_reservation_credit_source
      ON reservation_credit (id_mouvement_credit_source);

    CREATE TRIGGER trg_reservation_credit_source_positive_insert
    BEFORE INSERT ON reservation_credit
    WHEN NOT EXISTS (
      SELECT 1 FROM mouvement_credit
      WHERE id_mouvement_credit = NEW.id_mouvement_credit_source
        AND montant_mouvement_fcfa > 0
        AND nature_mouvement <> 'UTILISATION'
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une réservation doit référencer un mouvement de crédit source positif.');
    END;

    CREATE TRIGGER trg_reservation_credit_source_positive_update
    BEFORE UPDATE OF id_mouvement_credit_source ON reservation_credit
    WHEN NOT EXISTS (
      SELECT 1 FROM mouvement_credit
      WHERE id_mouvement_credit = NEW.id_mouvement_credit_source
        AND montant_mouvement_fcfa > 0
        AND nature_mouvement <> 'UTILISATION'
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une réservation doit référencer un mouvement de crédit source positif.');
    END;

    CREATE TRIGGER trg_reservation_credit_initialement_provisoire
    BEFORE INSERT ON reservation_credit
    WHEN NEW.est_provisoire <> 1
    BEGIN
      SELECT RAISE(ABORT, 'Une réservation est provisoire jusqu’à son arbitrage serveur.');
    END;

    CREATE TRIGGER trg_reservation_credit_arbitrage_requis
    BEFORE UPDATE OF est_provisoire ON reservation_credit
    WHEN OLD.est_provisoire = 1
      AND NEW.est_provisoire = 0
      AND NOT EXISTS (
        SELECT 1 FROM arbitrage_reservation_credit
        WHERE id_reservation_credit = OLD.id_reservation_credit
      )
    BEGIN
      SELECT RAISE(ABORT, 'Une réservation ne peut être finalisée sans trace d’arbitrage.');
    END;

    CREATE TRIGGER trg_reservation_credit_ne_peut_redevenir_provisoire
    BEFORE UPDATE OF est_provisoire ON reservation_credit
    WHEN OLD.est_provisoire = 0 AND NEW.est_provisoire <> 0
    BEGIN
      SELECT RAISE(ABORT, 'Une réservation arbitrée ne peut pas redevenir provisoire.');
    END;

    CREATE TRIGGER trg_reservation_credit_donnees_immuables
    BEFORE UPDATE OF id_mouvement_credit_source, montant_reserve_fcfa
      ON reservation_credit
    BEGIN
      SELECT RAISE(ABORT, 'La source et le montant d’une réservation sont conservés.');
    END;

    CREATE TRIGGER trg_reservation_credit_non_supprimable
    BEFORE DELETE ON reservation_credit
    BEGIN
      SELECT RAISE(ABORT, 'L’historique des réservations de crédit est conservé.');
    END;

    CREATE TABLE arbitrage_reservation_credit (
      id_arbitrage_reservation_credit TEXT NOT NULL PRIMARY KEY,
      id_reservation_credit TEXT NOT NULL UNIQUE,
      est_acceptee INTEGER NOT NULL CHECK (est_acceptee IN (0, 1)),
      id_serveur TEXT NOT NULL,
      date_arbitrage TEXT NOT NULL,
      FOREIGN KEY (id_reservation_credit)
        REFERENCES reservation_credit (id_reservation_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE TRIGGER trg_arbitrage_reservation_provisoire
    BEFORE INSERT ON arbitrage_reservation_credit
    WHEN NOT EXISTS (
      SELECT 1 FROM reservation_credit
      WHERE id_reservation_credit = NEW.id_reservation_credit
        AND est_provisoire = 1
    )
    BEGIN
      SELECT RAISE(ABORT, 'Seule une réservation provisoire peut être arbitrée.');
    END;

    CREATE TRIGGER trg_arbitrage_reservation_capacite
    BEFORE UPDATE OF est_provisoire ON reservation_credit
    WHEN OLD.est_provisoire = 1
      AND NEW.est_provisoire = 0
      AND EXISTS (
        SELECT 1 FROM arbitrage_reservation_credit AS arbitrage
        WHERE arbitrage.id_reservation_credit = OLD.id_reservation_credit
          AND arbitrage.est_acceptee = 1
          AND NEW.montant_reserve_fcfa + COALESCE((
            SELECT SUM(consommation.montant_consomme_fcfa)
            FROM consommation_credit_source AS consommation
            WHERE consommation.id_mouvement_credit_source = NEW.id_mouvement_credit_source
          ), 0) + COALESCE((
            SELECT SUM(MAX(reservation.montant_reserve_fcfa - COALESCE((
              SELECT SUM(consommation_reservee.montant_consomme_fcfa)
              FROM consommation_credit_source AS consommation_reservee
              WHERE consommation_reservee.id_reservation_credit = reservation.id_reservation_credit
            ), 0), 0))
            FROM reservation_credit AS reservation
            JOIN arbitrage_reservation_credit AS decision
              ON decision.id_reservation_credit = reservation.id_reservation_credit
            WHERE reservation.id_mouvement_credit_source = NEW.id_mouvement_credit_source
              AND reservation.id_reservation_credit <> NEW.id_reservation_credit
              AND reservation.est_provisoire = 0
              AND decision.est_acceptee = 1
          ), 0) > (
            SELECT montant_mouvement_fcfa FROM mouvement_credit
            WHERE id_mouvement_credit = NEW.id_mouvement_credit_source
          )
      )
    BEGIN
      SELECT RAISE(ABORT, 'L’arbitrage accepté dépasse le crédit source disponible.');
    END;

    CREATE TRIGGER trg_arbitrage_reservation_immutable_update
    BEFORE UPDATE ON arbitrage_reservation_credit
    BEGIN
      SELECT RAISE(ABORT, 'La décision d’arbitrage est conservée.');
    END;

    CREATE TRIGGER trg_arbitrage_reservation_finalise
    AFTER INSERT ON arbitrage_reservation_credit
    BEGIN
      UPDATE reservation_credit
      SET est_provisoire = 0
      WHERE id_reservation_credit = NEW.id_reservation_credit;
    END;

    CREATE TRIGGER trg_arbitrage_reservation_immutable_delete
    BEFORE DELETE ON arbitrage_reservation_credit
    BEGIN
      SELECT RAISE(ABORT, 'La décision d’arbitrage ne peut pas être supprimée.');
    END;

    CREATE TABLE collision_reservation_credit (
      id_collision_reservation_credit TEXT NOT NULL PRIMARY KEY,
      id_reservation_credit_1 TEXT NOT NULL,
      id_reservation_credit_2 TEXT NOT NULL,
      date_detection TEXT NOT NULL,
      CHECK (id_reservation_credit_1 <> id_reservation_credit_2),
      FOREIGN KEY (id_reservation_credit_1)
        REFERENCES reservation_credit (id_reservation_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_reservation_credit_2)
        REFERENCES reservation_credit (id_reservation_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_collision_reservation_credit_1
      ON collision_reservation_credit (id_reservation_credit_1);
    CREATE INDEX idx_collision_reservation_credit_2
      ON collision_reservation_credit (id_reservation_credit_2);

    CREATE TRIGGER trg_collision_reservation_credit_immutable_update
    BEFORE UPDATE ON collision_reservation_credit
    BEGIN
      SELECT RAISE(ABORT, 'Une collision de réservations est historisée.');
    END;

    CREATE TRIGGER trg_collision_reservation_credit_immutable_delete
    BEFORE DELETE ON collision_reservation_credit
    BEGIN
      SELECT RAISE(ABORT, 'Une collision de réservations ne peut pas être supprimée.');
    END;

    CREATE TABLE consommation_credit_source (
      id_consommation_credit_source TEXT NOT NULL PRIMARY KEY,
      id_mouvement_credit_utilisation TEXT NOT NULL,
      id_mouvement_credit_source TEXT NOT NULL,
      id_reservation_credit TEXT,
      ordre_cascade INTEGER NOT NULL CHECK (
        typeof(ordre_cascade) = 'integer' AND ordre_cascade > 0
      ),
      montant_consomme_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_consomme_fcfa) = 'integer'
        AND montant_consomme_fcfa > 0
      ),
      UNIQUE (id_mouvement_credit_utilisation, ordre_cascade),
      FOREIGN KEY (id_mouvement_credit_utilisation)
        REFERENCES mouvement_credit (id_mouvement_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_mouvement_credit_source)
        REFERENCES mouvement_credit (id_mouvement_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_reservation_credit)
        REFERENCES reservation_credit (id_reservation_credit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_consommation_credit_utilisation
      ON consommation_credit_source (id_mouvement_credit_utilisation);
    CREATE INDEX idx_consommation_credit_source
      ON consommation_credit_source (id_mouvement_credit_source);
    CREATE INDEX idx_consommation_credit_reservation
      ON consommation_credit_source (id_reservation_credit);

    CREATE TRIGGER trg_consommation_credit_utilisation_valide
    BEFORE INSERT ON consommation_credit_source
    WHEN NOT EXISTS (
      SELECT 1 FROM mouvement_credit
      WHERE id_mouvement_credit = NEW.id_mouvement_credit_utilisation
        AND nature_mouvement = 'UTILISATION'
    )
    BEGIN
      SELECT RAISE(ABORT, 'La ventilation doit viser un mouvement de crédit UTILISATION.');
    END;

    CREATE TRIGGER trg_consommation_credit_source_positive
    BEFORE INSERT ON consommation_credit_source
    WHEN NOT EXISTS (
      SELECT 1 FROM mouvement_credit
      WHERE id_mouvement_credit = NEW.id_mouvement_credit_source
        AND montant_mouvement_fcfa > 0
        AND nature_mouvement <> 'UTILISATION'
    )
    BEGIN
      SELECT RAISE(ABORT, 'La ventilation doit préserver un mouvement source positif.');
    END;

    CREATE TRIGGER trg_consommation_credit_reservation_valide
    BEFORE INSERT ON consommation_credit_source
    WHEN NEW.id_reservation_credit IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM reservation_credit AS reservation
        JOIN arbitrage_reservation_credit AS arbitrage
          ON arbitrage.id_reservation_credit = reservation.id_reservation_credit
        WHERE reservation.id_reservation_credit = NEW.id_reservation_credit
          AND reservation.id_mouvement_credit_source = NEW.id_mouvement_credit_source
          AND reservation.est_provisoire = 0
          AND arbitrage.est_acceptee = 1
      )
    BEGIN
      SELECT RAISE(ABORT, 'La consommation réservée exige un arbitrage serveur accepté sur la même source.');
    END;

    CREATE TRIGGER trg_consommation_credit_reservation_plafond
    BEFORE INSERT ON consommation_credit_source
    WHEN NEW.id_reservation_credit IS NOT NULL
      AND NEW.montant_consomme_fcfa + COALESCE((
        SELECT SUM(consommation.montant_consomme_fcfa)
        FROM consommation_credit_source AS consommation
        WHERE consommation.id_reservation_credit = NEW.id_reservation_credit
      ), 0) > COALESCE((
        SELECT montant_reserve_fcfa FROM reservation_credit
        WHERE id_reservation_credit = NEW.id_reservation_credit
      ), 0)
    BEGIN
      SELECT RAISE(ABORT, 'La consommation dépasse le montant de la réservation arbitrée.');
    END;

    CREATE TRIGGER trg_consommation_credit_capacite_source
    BEFORE INSERT ON consommation_credit_source
    WHEN NEW.montant_consomme_fcfa > COALESCE((
      SELECT source.montant_mouvement_fcfa
        - COALESCE((
            SELECT SUM(consommation.montant_consomme_fcfa)
            FROM consommation_credit_source AS consommation
            WHERE consommation.id_mouvement_credit_source = NEW.id_mouvement_credit_source
          ), 0)
        - COALESCE((
            SELECT SUM(MAX(reservation.montant_reserve_fcfa - COALESCE((
              SELECT SUM(consommation_reservee.montant_consomme_fcfa)
              FROM consommation_credit_source AS consommation_reservee
              WHERE consommation_reservee.id_reservation_credit = reservation.id_reservation_credit
            ), 0), 0))
            FROM reservation_credit AS reservation
            JOIN arbitrage_reservation_credit AS arbitrage
              ON arbitrage.id_reservation_credit = reservation.id_reservation_credit
            WHERE reservation.id_mouvement_credit_source = NEW.id_mouvement_credit_source
              AND reservation.est_provisoire = 0
              AND arbitrage.est_acceptee = 1
          ), 0)
        + CASE WHEN NEW.id_reservation_credit IS NULL THEN 0 ELSE COALESCE((
            SELECT MAX(reservation.montant_reserve_fcfa - COALESCE((
              SELECT SUM(consommation_reservee.montant_consomme_fcfa)
              FROM consommation_credit_source AS consommation_reservee
              WHERE consommation_reservee.id_reservation_credit = reservation.id_reservation_credit
            ), 0), 0)
            FROM reservation_credit AS reservation
            JOIN arbitrage_reservation_credit AS arbitrage
              ON arbitrage.id_reservation_credit = reservation.id_reservation_credit
            WHERE reservation.id_reservation_credit = NEW.id_reservation_credit
              AND reservation.est_provisoire = 0
              AND arbitrage.est_acceptee = 1
          ), 0) END
      FROM mouvement_credit AS source
      WHERE source.id_mouvement_credit = NEW.id_mouvement_credit_source
        AND source.montant_mouvement_fcfa > 0
    ), 0)
    BEGIN
      SELECT RAISE(ABORT, 'La consommation dépasse le crédit source non réservé disponible.');
    END;

    CREATE TRIGGER trg_consommation_credit_capacite_utilisation
    BEFORE INSERT ON consommation_credit_source
    WHEN NEW.montant_consomme_fcfa + COALESCE((
      SELECT SUM(consommation.montant_consomme_fcfa)
      FROM consommation_credit_source AS consommation
      WHERE consommation.id_mouvement_credit_utilisation = NEW.id_mouvement_credit_utilisation
    ), 0) > COALESCE((
      SELECT ABS(montant_mouvement_fcfa)
      FROM mouvement_credit
      WHERE id_mouvement_credit = NEW.id_mouvement_credit_utilisation
        AND nature_mouvement = 'UTILISATION'
    ), 0)
    BEGIN
      SELECT RAISE(ABORT, 'La ventilation dépasse le montant de l’utilisation de crédit.');
    END;

    CREATE TRIGGER trg_consommation_credit_immutable_update
    BEFORE UPDATE ON consommation_credit_source
    BEGIN
      SELECT RAISE(ABORT, 'La provenance d’une consommation de crédit est conservée.');
    END;

    CREATE TRIGGER trg_consommation_credit_immutable_delete
    BEFORE DELETE ON consommation_credit_source
    BEGIN
      SELECT RAISE(ABORT, 'La provenance d’une consommation de crédit ne peut pas être supprimée.');
    END;

    CREATE TABLE mandat_restitution (
      id_mandat_restitution TEXT NOT NULL PRIMARY KEY,
      id_payeur_initial TEXT NOT NULL,
      id_beneficiaire_effectif TEXT NOT NULL,
      mandat_valide INTEGER NOT NULL CHECK (mandat_valide IN (0, 1))
    );

    CREATE TABLE remboursement_fonds (
      id_remboursement_fonds TEXT NOT NULL PRIMARY KEY,
      id_demandeur TEXT NOT NULL,
      id_payeur_initial TEXT NOT NULL,
      id_beneficiaire_effectif TEXT NOT NULL,
      montant_rembourse_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_rembourse_fcfa) = 'integer'
        AND montant_rembourse_fcfa > 0
      ),
      id_mandat_restitution TEXT,
      FOREIGN KEY (id_mandat_restitution)
        REFERENCES mandat_restitution (id_mandat_restitution)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_remboursement_fonds_payeur_beneficiaire
      ON remboursement_fonds (id_payeur_initial, id_beneficiaire_effectif);
    CREATE INDEX idx_remboursement_fonds_mandat
      ON remboursement_fonds (id_mandat_restitution);

    CREATE TRIGGER trg_remboursement_mandat_requis_insert
    BEFORE INSERT ON remboursement_fonds
    WHEN (NEW.id_beneficiaire_effectif <> NEW.id_payeur_initial
        AND NEW.id_mandat_restitution IS NULL)
      OR (NEW.id_mandat_restitution IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM mandat_restitution AS mandat
        WHERE mandat.id_mandat_restitution = NEW.id_mandat_restitution
          AND mandat.id_payeur_initial = NEW.id_payeur_initial
          AND mandat.id_beneficiaire_effectif = NEW.id_beneficiaire_effectif
          AND mandat.mandat_valide = 1
      ))
    BEGIN
      SELECT RAISE(ABORT, 'Un bénéficiaire différent du payeur initial exige un mandat valide correspondant.');
    END;

    CREATE TRIGGER trg_remboursement_mandat_requis_update
    BEFORE UPDATE OF id_payeur_initial, id_beneficiaire_effectif, id_mandat_restitution
      ON remboursement_fonds
    WHEN (NEW.id_beneficiaire_effectif <> NEW.id_payeur_initial
        AND NEW.id_mandat_restitution IS NULL)
      OR (NEW.id_mandat_restitution IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM mandat_restitution AS mandat
        WHERE mandat.id_mandat_restitution = NEW.id_mandat_restitution
          AND mandat.id_payeur_initial = NEW.id_payeur_initial
          AND mandat.id_beneficiaire_effectif = NEW.id_beneficiaire_effectif
          AND mandat.mandat_valide = 1
      ))
    BEGIN
      SELECT RAISE(ABORT, 'Un bénéficiaire différent du payeur initial exige un mandat valide correspondant.');
    END;

    CREATE TRIGGER trg_mandat_restitution_immutable_utilise
    BEFORE UPDATE ON mandat_restitution
    WHEN EXISTS (
      SELECT 1 FROM remboursement_fonds
      WHERE id_mandat_restitution = OLD.id_mandat_restitution
    )
    BEGIN
      SELECT RAISE(ABORT, 'Un mandat utilisé par un remboursement est conservé.');
    END;

    CREATE TRIGGER trg_mandat_restitution_non_supprimable_utilise
    BEFORE DELETE ON mandat_restitution
    WHEN EXISTS (
      SELECT 1 FROM remboursement_fonds
      WHERE id_mandat_restitution = OLD.id_mandat_restitution
    )
    BEGIN
      SELECT RAISE(ABORT, 'Un mandat utilisé par un remboursement ne peut pas être supprimé.');
    END;
  `,
};

export default creditsReservationsRemboursements;