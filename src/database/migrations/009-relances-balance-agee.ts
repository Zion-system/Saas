import type { Migration } from "./index";

const relancesBalanceAgee: Migration = {
  version: 9,
  name: "relances_balance_agee",
  sql: `
    CREATE TABLE relance_financiere (
      id_relance TEXT NOT NULL PRIMARY KEY,
      id_eleve TEXT NOT NULL
    );

    CREATE TABLE ligne_relance_financiere (
      id_ligne_relance TEXT NOT NULL PRIMARY KEY,
      id_relance TEXT NOT NULL,
      id_creance TEXT,
      id_echeance_creance TEXT,
      montant_reference_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_reference_fcfa) = 'integer'
      ),
      CHECK (
        (id_creance IS NOT NULL AND id_echeance_creance IS NULL)
        OR (id_creance IS NULL AND id_echeance_creance IS NOT NULL)
      ),
      FOREIGN KEY (id_relance)
        REFERENCES relance_financiere (id_relance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_creance)
        REFERENCES creance (id_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_echeance_creance)
        REFERENCES echeance_creance (id_echeance_creance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_ligne_relance_parent
      ON ligne_relance_financiere (id_relance);
    CREATE INDEX idx_ligne_relance_creance
      ON ligne_relance_financiere (id_creance);
    CREATE INDEX idx_ligne_relance_echeance
      ON ligne_relance_financiere (id_echeance_creance);

    CREATE TRIGGER trg_ligne_relance_meme_eleve_creance
    BEFORE INSERT ON ligne_relance_financiere
    WHEN NEW.id_creance IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM relance_financiere AS relance
        JOIN creance ON creance.id_eleve = relance.id_eleve
        WHERE relance.id_relance = NEW.id_relance
          AND creance.id_creance = NEW.id_creance
      )
    BEGIN
      SELECT RAISE(ABORT, 'La créance ciblée doit appartenir à l’élève de la relance.');
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

    CREATE TRIGGER trg_relance_financiere_append_only_update
    BEFORE UPDATE ON relance_financiere
    BEGIN
      SELECT RAISE(ABORT, 'Une relance créée est conservée sans réécriture.');
    END;

    CREATE TRIGGER trg_relance_financiere_append_only_delete
    BEFORE DELETE ON relance_financiere
    BEGIN
      SELECT RAISE(ABORT, 'Une relance créée ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_ligne_relance_append_only_update
    BEFORE UPDATE ON ligne_relance_financiere
    BEGIN
      SELECT RAISE(ABORT, 'Les lignes et montants de référence d’une relance sont immuables.');
    END;

    CREATE TRIGGER trg_ligne_relance_append_only_delete
    BEFORE DELETE ON ligne_relance_financiere
    BEGIN
      SELECT RAISE(ABORT, 'Les lignes historiques d’une relance ne peuvent pas être supprimées.');
    END;

    CREATE TABLE destinataire_relance_financiere (
      id_destinataire_relance TEXT NOT NULL PRIMARY KEY,
      id_relance TEXT NOT NULL,
      coordonnees_reference TEXT NOT NULL,
      UNIQUE (id_relance, id_destinataire_relance),
      FOREIGN KEY (id_relance)
        REFERENCES relance_financiere (id_relance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_destinataire_relance_parent
      ON destinataire_relance_financiere (id_relance);

    CREATE TRIGGER trg_destinataire_relance_reference_immutable_update
    BEFORE UPDATE ON destinataire_relance_financiere
    BEGIN
      SELECT RAISE(ABORT, 'Les coordonnées historiques du destinataire sont conservées.');
    END;

    CREATE TRIGGER trg_destinataire_relance_reference_immutable_delete
    BEFORE DELETE ON destinataire_relance_financiere
    BEGIN
      SELECT RAISE(ABORT, 'Un destinataire historique ne peut pas être supprimé.');
    END;

    CREATE TABLE tentative_transmission_relance (
      id_tentative TEXT NOT NULL PRIMARY KEY,
      id_relance TEXT NOT NULL,
      id_destinataire_relance TEXT NOT NULL,
      date_tentative TEXT NOT NULL,
      canal TEXT NOT NULL,
      resultat TEXT NOT NULL,
      motif_echec TEXT,
      contact_utilise TEXT NOT NULL,
      FOREIGN KEY (id_relance, id_destinataire_relance)
        REFERENCES destinataire_relance_financiere
          (id_relance, id_destinataire_relance)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_tentative_relance_destinataire
      ON tentative_transmission_relance (id_relance, id_destinataire_relance);
    CREATE INDEX idx_tentative_relance_date
      ON tentative_transmission_relance (date_tentative);

    CREATE TRIGGER trg_tentative_transmission_append_only_update
    BEFORE UPDATE ON tentative_transmission_relance
    BEGIN
      SELECT RAISE(ABORT, 'Une tentative de transmission est append-only.');
    END;

    CREATE TRIGGER trg_tentative_transmission_append_only_delete
    BEFORE DELETE ON tentative_transmission_relance
    BEGIN
      SELECT RAISE(ABORT, 'Une tentative de transmission ne peut pas être supprimée.');
    END;

    CREATE TABLE parametrage_balance_agee (
      id_parametrage TEXT NOT NULL PRIMARY KEY,
      version TEXT NOT NULL,
      fuseau_reference TEXT NOT NULL DEFAULT 'Africa/Brazzaville'
        CHECK (fuseau_reference = 'Africa/Brazzaville'),
      tolerance_jours INTEGER NOT NULL DEFAULT 0 CHECK (
        typeof(tolerance_jours) = 'integer' AND tolerance_jours >= 0
      ),
      date_reference_par_defaut TEXT CHECK (
        date_reference_par_defaut IS NULL OR (
          date(date_reference_par_defaut, '+0 days') IS NOT NULL
          AND date(date_reference_par_defaut, '+0 days') = date_reference_par_defaut
        )
      )
    );

    CREATE TABLE tranche_balance_agee (
      id_tranche TEXT NOT NULL PRIMARY KEY,
      id_parametrage TEXT NOT NULL,
      borne_basse_jours INTEGER NOT NULL CHECK (
        typeof(borne_basse_jours) = 'integer'
      ),
      borne_haute_jours INTEGER CHECK (
        borne_haute_jours IS NULL OR typeof(borne_haute_jours) = 'integer'
      ),
      CHECK (
        borne_haute_jours IS NULL OR borne_basse_jours < borne_haute_jours
      ),
      UNIQUE (id_parametrage, borne_basse_jours),
      FOREIGN KEY (id_parametrage)
        REFERENCES parametrage_balance_agee (id_parametrage)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE TRIGGER trg_parametrage_balance_agee_versionne_update
    BEFORE UPDATE ON parametrage_balance_agee
    BEGIN
      SELECT RAISE(ABORT, 'Un paramétrage versionné ne peut pas être modifié.');
    END;

    CREATE TRIGGER trg_parametrage_balance_agee_versionne_delete
    BEFORE DELETE ON parametrage_balance_agee
    BEGIN
      SELECT RAISE(ABORT, 'Un paramétrage versionné ne peut pas être supprimé.');
    END;

    CREATE TRIGGER trg_tranche_balance_agee_versionnee_update
    BEFORE UPDATE ON tranche_balance_agee
    BEGIN
      SELECT RAISE(ABORT, 'Une tranche versionnée ne peut pas être modifiée.');
    END;

    CREATE TRIGGER trg_tranche_balance_agee_versionnee_delete
    BEFORE DELETE ON tranche_balance_agee
    BEGIN
      SELECT RAISE(ABORT, 'Une tranche versionnée ne peut pas être supprimée.');
    END;

    CREATE UNIQUE INDEX idx_tranche_balance_agee_ouverte
      ON tranche_balance_agee (id_parametrage)
      WHERE borne_haute_jours IS NULL;
    CREATE INDEX idx_tranche_balance_agee_parametrage
      ON tranche_balance_agee (id_parametrage);

    CREATE TRIGGER trg_tranche_balance_agee_non_chevauchante_insert
    BEFORE INSERT ON tranche_balance_agee
    WHEN EXISTS (
      SELECT 1 FROM tranche_balance_agee AS tranche
      WHERE tranche.id_parametrage = NEW.id_parametrage
        AND (NEW.borne_haute_jours IS NULL
          OR tranche.borne_basse_jours < NEW.borne_haute_jours)
        AND (tranche.borne_haute_jours IS NULL
          OR NEW.borne_basse_jours < tranche.borne_haute_jours)
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les tranches d’un paramétrage ne se chevauchent pas.');
    END;

    CREATE TRIGGER trg_tranche_balance_agee_contigue_insert
    BEFORE INSERT ON tranche_balance_agee
    WHEN EXISTS (
      SELECT 1 FROM tranche_balance_agee
      WHERE id_parametrage = NEW.id_parametrage
    ) AND NOT EXISTS (
      SELECT 1 FROM tranche_balance_agee AS tranche
      WHERE tranche.id_parametrage = NEW.id_parametrage
        AND (
          tranche.borne_haute_jours = NEW.borne_basse_jours
          OR NEW.borne_haute_jours = tranche.borne_basse_jours
        )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les tranches configurées sont contiguës.');
    END;

    CREATE TRIGGER trg_tranche_balance_agee_coherence_update
    BEFORE UPDATE OF id_parametrage, borne_basse_jours, borne_haute_jours
      ON tranche_balance_agee
    WHEN EXISTS (
      SELECT 1 FROM tranche_balance_agee AS tranche
      WHERE tranche.id_parametrage = NEW.id_parametrage
        AND tranche.id_tranche <> OLD.id_tranche
        AND (NEW.borne_haute_jours IS NULL
          OR tranche.borne_basse_jours < NEW.borne_haute_jours)
        AND (tranche.borne_haute_jours IS NULL
          OR NEW.borne_basse_jours < tranche.borne_haute_jours)
    ) OR (
      EXISTS (
        SELECT 1 FROM tranche_balance_agee
        WHERE id_parametrage = NEW.id_parametrage
          AND id_tranche <> OLD.id_tranche
      ) AND NOT EXISTS (
        SELECT 1 FROM tranche_balance_agee AS tranche
        WHERE tranche.id_parametrage = NEW.id_parametrage
          AND tranche.id_tranche <> OLD.id_tranche
          AND (
            tranche.borne_haute_jours = NEW.borne_basse_jours
            OR NEW.borne_haute_jours = tranche.borne_basse_jours
          )
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les tranches restent contiguës et non chevauchantes.');
    END;
  `,
};

export default relancesBalanceAgee;