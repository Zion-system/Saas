import type { Migration } from "./index";

/**
 * Migration corrective 016 — Lot 5 (gestion de caisse).
 *
 * Stratégie bêta (docs/20 §4.1, §5.4) : reconstructions transactionnelles
 * des neuf tables de caisse, sans modification des migrations 001-015.
 *
 * Deltas fermes appliqués (docs/20 §5) :
 * - 5.4.1 : table de référence ref_coupure_xaf + seed (9 coupures).
 * - 7.1 : poste_caisse (code_poste UNIQUE, designation, est_actif) — G-16.
 * - 7.2 : appareil (numero_serie UNIQUE, nom_machine, est_autorise) — G-16.
 * - 7.3 : session_caisse (id_caissier, date_ouverture, etat, fonds >= 0) —
 *   G-16 ; trigger trg_session_caisse_cloturee_immutable retempe sur
 *   OLD.etat = 'CLOTUREE' (R-6) ; trigger trg_cloture_comptage_concordance
 *   (Option C, FIN-LOT5-013) ; index idx_session_active_poste (D-1).
 * - 7.4 : cloture_caisse (numero_comptage_retenu, UNIQUE session, CHECK
 *   ecart, montant_physique >= 0).
 * - 7.5 : detail_comptage_caisse (montant_total_ligne GENERATED, UNIQUE
 *   (cloture, tour, valeur), FK ref_coupure_xaf, index idx_detail_comptage_tour).
 * - 7.6 : mouvement_caisse (sens, type_mouvement, id_operation_source,
 *   date_mouvement, montant > 0, CHECK remboursement, index
 *   idx_mouvement_remboursement_unique / idx_mouvement_session, triggers
 *   append-only et gardes R-3).
 * - 7.7 : transmission_fonds (id_session_source/destination, responsable,
 *   etat_transmission, dates, CHECKs cycle et tracabilite, trigger figee).
 * - 7.8 : rapprochement_caisse (dates, montants calcules, est_definitif,
 *   superviseur, index idx_rapprochement_definitif, triggers append-only).
 * - 7.9 : justification_ecart_caisse (motif, auteur, date, piece ref,
 *   triggers append-only).
 *
 * Ordre de reconstruction : mouvement_caisse et session_caisse sont
 * reconstruites AVANT cloture_caisse afin d'éliminer les anciens triggers
 * (migration 007) qui référencent cloture_caisse ; tous les nouveaux
 * triggers sont créés en fin de migration, après la reconstruction de
 * toutes les tables, afin qu'aucun ALTER TABLE RENAME ne reparse un
 * trigger référençant une table pas encore reconstruite.
 *
 * Points de gouvernance :
 * - G-16 : colonnes ajoutees selon docs/19 §3.21-3.23 (exigees par le mandat).
 * - G-17 : garde trg_mouvement_caisse_session_cloturee_update conservee sur
 *   l'existence d'une cloture (resolution recommandee docs/20).
 * - G-18/G-19/G-20 : backfills sentinelles documentes ('A_DEFINIR',
 *   '1970-01-01', etat 'OUVERTE') — bases vides en chaine fraiche ; bases
 *   peuplees : pre-controle obligatoire (docs/20 §7.4).
 */
const correction007GestionCaisse: Migration = {
  version: 16,
  name: "correction_007_gestion_caisse",
  sql: `
    CREATE TABLE ref_coupure_xaf (
      valeur_unitaire_fcfa REAL NOT NULL PRIMARY KEY CHECK (valeur_unitaire_fcfa > 0),
      type_coupure TEXT NOT NULL CHECK (type_coupure IN ('BILLET', 'PIECE')),
      libelle TEXT NOT NULL
    );

    INSERT INTO ref_coupure_xaf (valeur_unitaire_fcfa, type_coupure, libelle) VALUES
      (10000, 'BILLET', 'Dix mille francs CFA'),
      (5000, 'BILLET', 'Cinq mille francs CFA'),
      (2000, 'BILLET', 'Deux mille francs CFA'),
      (1000, 'BILLET', 'Mille francs CFA'),
      (500, 'BILLET', 'Cinq cents francs CFA'),
      (100, 'PIECE', 'Cent francs CFA'),
      (50, 'PIECE', 'Cinquante francs CFA'),
      (25, 'PIECE', 'Vingt-cinq francs CFA'),
      (10, 'PIECE', 'Dix francs CFA');

    CREATE TABLE poste_caisse_new (
      id_poste_caisse TEXT NOT NULL PRIMARY KEY,
      code_poste TEXT NOT NULL UNIQUE CHECK (length(trim(code_poste)) > 0),
      designation TEXT NOT NULL,
      est_actif INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1))
    );

    INSERT INTO poste_caisse_new (id_poste_caisse, code_poste, designation, est_actif)
    SELECT id_poste_caisse, 'A_DEFINIR-' || id_poste_caisse, 'À RENSEIGNER', 1
    FROM poste_caisse;

    DROP TABLE poste_caisse;
    ALTER TABLE poste_caisse_new RENAME TO poste_caisse;

    CREATE TABLE appareil_new (
      id_appareil TEXT NOT NULL PRIMARY KEY,
      numero_serie TEXT NOT NULL UNIQUE CHECK (length(trim(numero_serie)) > 0),
      nom_machine TEXT NOT NULL,
      est_autorise INTEGER NOT NULL DEFAULT 1 CHECK (est_autorise IN (0, 1))
    );

    INSERT INTO appareil_new (id_appareil, numero_serie, nom_machine, est_autorise)
    SELECT id_appareil, 'A_DEFINIR-' || id_appareil, 'À RENSEIGNER', 1
    FROM appareil;

    DROP TABLE appareil;
    ALTER TABLE appareil_new RENAME TO appareil;

    CREATE TABLE mouvement_caisse_new (
      id_mouvement_caisse TEXT NOT NULL PRIMARY KEY,
      id_session_caisse TEXT NOT NULL,
      sens TEXT NOT NULL CHECK (sens IN ('ENTREE', 'SORTIE')),
      montant_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_fcfa) = 'integer' AND montant_fcfa > 0
      ),
      type_mouvement TEXT NOT NULL CHECK (
        type_mouvement IN (
          'ENCAISSEMENT', 'TRANSMISSION_SORTIE', 'TRANSMISSION_ENTREE',
          'REMBOURSEMENT', 'AJUSTEMENT'
        )
      ),
      id_operation_source TEXT,
      date_mouvement TEXT NOT NULL,
      CHECK (
        type_mouvement <> 'REMBOURSEMENT' OR id_operation_source IS NOT NULL
      ),
      FOREIGN KEY (id_session_caisse)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO mouvement_caisse_new (
      id_mouvement_caisse, id_session_caisse, sens, montant_fcfa,
      type_mouvement, id_operation_source, date_mouvement
    )
    SELECT id_mouvement_caisse, id_session_caisse, 'ENTREE', montant_fcfa,
           'AJUSTEMENT', NULL, '1970-01-01'
    FROM mouvement_caisse;

    DROP TABLE mouvement_caisse;
    ALTER TABLE mouvement_caisse_new RENAME TO mouvement_caisse;

    CREATE UNIQUE INDEX idx_mouvement_remboursement_unique
      ON mouvement_caisse (id_operation_source, id_session_caisse)
      WHERE type_mouvement = 'REMBOURSEMENT';
    CREATE INDEX idx_mouvement_session
      ON mouvement_caisse (id_session_caisse, sens, montant_fcfa);

    CREATE TABLE session_caisse_new (
      id_session_caisse TEXT NOT NULL PRIMARY KEY,
      id_poste_caisse TEXT NOT NULL,
      id_appareil TEXT NOT NULL,
      id_caissier TEXT NOT NULL,
      fonds_initial_fcfa INTEGER NOT NULL CHECK (
        typeof(fonds_initial_fcfa) = 'integer' AND fonds_initial_fcfa >= 0
      ),
      date_ouverture TEXT NOT NULL,
      etat TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (etat IN ('OUVERTE', 'CLOTUREE')),
      FOREIGN KEY (id_poste_caisse)
        REFERENCES poste_caisse (id_poste_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_appareil)
        REFERENCES appareil (id_appareil)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO session_caisse_new (
      id_session_caisse, id_poste_caisse, id_appareil, id_caissier,
      fonds_initial_fcfa, date_ouverture, etat
    )
    SELECT id_session_caisse, id_poste_caisse, id_appareil, 'A_DEFINIR',
           fonds_initial_fcfa, '1970-01-01', 'OUVERTE'
    FROM session_caisse;

    DROP TABLE session_caisse;
    ALTER TABLE session_caisse_new RENAME TO session_caisse;

    CREATE INDEX idx_session_caisse_poste
      ON session_caisse (id_poste_caisse);
    CREATE INDEX idx_session_caisse_appareil
      ON session_caisse (id_appareil);
    CREATE UNIQUE INDEX idx_session_active_poste
      ON session_caisse (id_poste_caisse)
      WHERE etat = 'OUVERTE';

    CREATE TABLE cloture_caisse_new (
      id_cloture_caisse TEXT NOT NULL PRIMARY KEY,
      id_session_caisse TEXT NOT NULL,
      date_cloture TEXT NOT NULL,
      solde_theorique_fcfa INTEGER NOT NULL CHECK (
        typeof(solde_theorique_fcfa) = 'integer'
      ),
      montant_physique_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_physique_fcfa) = 'integer' AND montant_physique_fcfa >= 0
      ),
      ecart_fcfa INTEGER NOT NULL CHECK (typeof(ecart_fcfa) = 'integer'),
      numero_comptage_retenu INTEGER NOT NULL DEFAULT 1 CHECK (
        typeof(numero_comptage_retenu) = 'integer' AND numero_comptage_retenu > 0
      ),
      CHECK (ecart_fcfa = montant_physique_fcfa - solde_theorique_fcfa),
      UNIQUE (id_session_caisse),
      FOREIGN KEY (id_session_caisse)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO cloture_caisse_new (
      id_cloture_caisse, id_session_caisse, date_cloture,
      solde_theorique_fcfa, montant_physique_fcfa, ecart_fcfa,
      numero_comptage_retenu
    )
    SELECT id_cloture_caisse, id_session_caisse, date_cloture,
           solde_theorique_fcfa, montant_physique_fcfa, ecart_fcfa, 1
    FROM cloture_caisse;

    DROP TABLE cloture_caisse;
    ALTER TABLE cloture_caisse_new RENAME TO cloture_caisse;

    CREATE INDEX idx_cloture_caisse_session
      ON cloture_caisse (id_session_caisse);

    CREATE TABLE detail_comptage_caisse_new (
      id_detail_comptage_caisse TEXT NOT NULL PRIMARY KEY,
      id_cloture_caisse TEXT NOT NULL,
      numero_comptage INTEGER NOT NULL CHECK (
        typeof(numero_comptage) = 'integer' AND numero_comptage > 0
      ),
      valeur_unitaire_fcfa INTEGER NOT NULL,
      quantite INTEGER NOT NULL CHECK (
        typeof(quantite) = 'integer' AND quantite >= 0
      ),
      montant_total_ligne_fcfa INTEGER GENERATED ALWAYS AS (
        valeur_unitaire_fcfa * quantite
      ) STORED,
      UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa),
      FOREIGN KEY (id_cloture_caisse)
        REFERENCES cloture_caisse (id_cloture_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (valeur_unitaire_fcfa)
        REFERENCES ref_coupure_xaf (valeur_unitaire_fcfa)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO detail_comptage_caisse_new (
      id_detail_comptage_caisse, id_cloture_caisse, numero_comptage,
      valeur_unitaire_fcfa, quantite
    )
    SELECT id_detail_comptage_caisse, id_cloture_caisse, numero_comptage,
           valeur_unitaire_fcfa, quantite
    FROM detail_comptage_caisse;

    DROP TABLE detail_comptage_caisse;
    ALTER TABLE detail_comptage_caisse_new RENAME TO detail_comptage_caisse;

    CREATE INDEX idx_detail_comptage_tour
      ON detail_comptage_caisse (id_cloture_caisse, numero_comptage);

    CREATE TABLE transmission_fonds_new (
      id_transmission_fonds TEXT NOT NULL PRIMARY KEY,
      id_session_source TEXT NOT NULL,
      id_session_destination TEXT,
      id_responsable_reception TEXT,
      nom_responsable_snapshot TEXT,
      montant_envoye_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_envoye_fcfa) = 'integer' AND montant_envoye_fcfa > 0
      ),
      montant_recu_fcfa INTEGER CHECK (
        montant_recu_fcfa IS NULL
        OR (typeof(montant_recu_fcfa) = 'integer' AND montant_recu_fcfa >= 0)
      ),
      etat_transmission TEXT NOT NULL DEFAULT 'EMISE' CHECK (
        etat_transmission IN ('EMISE', 'RECUE', 'ECART_CONSTATE')
      ),
      date_envoi TEXT NOT NULL,
      date_reception TEXT,
      CHECK (id_session_destination IS NULL OR id_session_destination != id_session_source),
      CHECK (
        id_session_destination IS NOT NULL
        OR (id_responsable_reception IS NOT NULL AND nom_responsable_snapshot IS NOT NULL)
      ),
      CHECK (
        (etat_transmission IN ('RECUE', 'ECART_CONSTATE')
          AND montant_recu_fcfa IS NOT NULL
          AND date_reception IS NOT NULL)
        OR (etat_transmission = 'EMISE' AND montant_recu_fcfa IS NULL)
      ),
      FOREIGN KEY (id_session_source)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_session_destination)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO transmission_fonds_new (
      id_transmission_fonds, id_session_source, id_responsable_reception,
      nom_responsable_snapshot, montant_envoye_fcfa, montant_recu_fcfa,
      etat_transmission, date_envoi, date_reception
    )
    SELECT id_transmission_fonds, id_session_caisse, 'A_DEFINIR', 'A_DEFINIR',
           montant_envoye_fcfa, montant_recu_fcfa,
           CASE WHEN montant_recu_fcfa IS NOT NULL THEN 'RECUE' ELSE 'EMISE' END,
           '1970-01-01',
           CASE WHEN montant_recu_fcfa IS NOT NULL THEN '1970-01-01' ELSE NULL END
    FROM transmission_fonds;

    DROP TABLE transmission_fonds;
    ALTER TABLE transmission_fonds_new RENAME TO transmission_fonds;

    CREATE INDEX idx_transmission_source_dest
      ON transmission_fonds (id_session_source, id_session_destination);

    CREATE TABLE rapprochement_caisse_new (
      id_rapprochement_caisse TEXT NOT NULL PRIMARY KEY,
      id_session_caisse TEXT NOT NULL,
      date_rapprochement TEXT NOT NULL,
      solde_theorique_calcule_fcfa INTEGER NOT NULL,
      montant_physique_confronte_fcfa INTEGER NOT NULL CHECK (
        montant_physique_confronte_fcfa >= 0
      ),
      ecart_constate_fcfa INTEGER NOT NULL,
      est_definitif INTEGER NOT NULL DEFAULT 0 CHECK (est_definitif IN (0, 1)),
      superviseur TEXT NOT NULL CHECK (length(trim(superviseur)) > 0),
      FOREIGN KEY (id_session_caisse)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO rapprochement_caisse_new (
      id_rapprochement_caisse, id_session_caisse, date_rapprochement,
      solde_theorique_calcule_fcfa, montant_physique_confronte_fcfa,
      ecart_constate_fcfa, est_definitif, superviseur
    )
    SELECT id_rapprochement_caisse, id_session_caisse, '1970-01-01',
           0, 0, 0, 0, 'A_DEFINIR'
    FROM rapprochement_caisse;

    DROP TABLE rapprochement_caisse;
    ALTER TABLE rapprochement_caisse_new RENAME TO rapprochement_caisse;

    CREATE UNIQUE INDEX idx_rapprochement_definitif
      ON rapprochement_caisse (id_session_caisse)
      WHERE est_definitif = 1;

    CREATE TABLE justification_ecart_caisse_new (
      id_justification_ecart_caisse TEXT NOT NULL PRIMARY KEY,
      id_rapprochement_caisse TEXT NOT NULL,
      motif_ecart TEXT NOT NULL CHECK (length(trim(motif_ecart)) > 0),
      auteur TEXT NOT NULL CHECK (length(trim(auteur)) > 0),
      date_justification TEXT NOT NULL,
      piece_justificative_ref TEXT,
      FOREIGN KEY (id_rapprochement_caisse)
        REFERENCES rapprochement_caisse (id_rapprochement_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    INSERT INTO justification_ecart_caisse_new (
      id_justification_ecart_caisse, id_rapprochement_caisse,
      motif_ecart, auteur, date_justification, piece_justificative_ref
    )
    SELECT id_justification_ecart_caisse, id_rapprochement_caisse,
           'A_DEFINIR', 'A_DEFINIR', '1970-01-01', NULL
    FROM justification_ecart_caisse;

    DROP TABLE justification_ecart_caisse;
    ALTER TABLE justification_ecart_caisse_new RENAME TO justification_ecart_caisse;

    CREATE TRIGGER trg_session_caisse_cloturee_immutable
    BEFORE UPDATE ON session_caisse
    WHEN OLD.etat = 'CLOTUREE'
    BEGIN
      SELECT RAISE(ABORT, 'Une session clôturée est irréversible (R-6).');
    END;

    CREATE TRIGGER trg_cloture_comptage_concordance
    BEFORE UPDATE OF etat ON session_caisse
    WHEN NEW.etat = 'CLOTUREE' AND OLD.etat IS NOT 'CLOTUREE'
    BEGIN
      SELECT RAISE(ABORT, 'Aucun détail de comptage pour le tour retenu (FIN-LOT5-013).')
      WHERE NOT EXISTS (
        SELECT 1
        FROM detail_comptage_caisse AS d
        JOIN cloture_caisse AS c ON c.id_cloture_caisse = d.id_cloture_caisse
        WHERE c.id_session_caisse = NEW.id_session_caisse
          AND d.numero_comptage = (
            SELECT numero_comptage_retenu FROM cloture_caisse
            WHERE id_session_caisse = NEW.id_session_caisse
          )
      );
      SELECT RAISE(ABORT, 'Concordance arithmetique du comptage en echec (FIN-LOT5-013).')
      WHERE EXISTS (
        SELECT 1
        FROM cloture_caisse AS c
        WHERE c.id_session_caisse = NEW.id_session_caisse
          AND c.montant_physique_fcfa <> COALESCE((
            SELECT SUM(d.montant_total_ligne_fcfa)
            FROM detail_comptage_caisse AS d
            WHERE d.id_cloture_caisse = c.id_cloture_caisse
              AND d.numero_comptage = c.numero_comptage_retenu
          ), 0)
      );
    END;

    CREATE TRIGGER trg_cloture_caisse_immutable_update
    BEFORE UPDATE ON cloture_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Une clôture validée est append-only.');
    END;

    CREATE TRIGGER trg_cloture_caisse_immutable_delete
    BEFORE DELETE ON cloture_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Une clôture validée est append-only.');
    END;

    CREATE TRIGGER trg_detail_comptage_no_update
    BEFORE UPDATE ON detail_comptage_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Un détail de comptage est append-only.');
    END;

    CREATE TRIGGER trg_detail_comptage_no_delete
    BEFORE DELETE ON detail_comptage_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Un détail de comptage est append-only.');
    END;

    CREATE TRIGGER trg_detail_comptage_no_insert_closed
    BEFORE INSERT ON detail_comptage_caisse
    WHEN EXISTS (
      SELECT 1
      FROM session_caisse AS s
      WHERE s.id_session_caisse = (
        SELECT c.id_session_caisse FROM cloture_caisse AS c
        WHERE c.id_cloture_caisse = NEW.id_cloture_caisse
      )
        AND s.etat = 'CLOTUREE'
    )
    BEGIN
      SELECT RAISE(ABORT, 'La session est clôturée : aucun détail de comptage ne peut être ajouté.');
    END;

    CREATE TRIGGER trg_mouvement_caisse_no_delete
    BEFORE DELETE ON mouvement_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Un mouvement de caisse validé est append-only.');
    END;

    CREATE TRIGGER trg_mouvement_caisse_no_update_closed
    BEFORE UPDATE ON mouvement_caisse
    WHEN EXISTS (
      SELECT 1 FROM session_caisse AS s
      WHERE s.id_session_caisse = OLD.id_session_caisse AND s.etat = 'CLOTUREE'
    )
    BEGIN
      SELECT RAISE(ABORT, 'Un mouvement rattaché à une session clôturée est immuable.');
    END;

    CREATE TRIGGER trg_mouvement_caisse_session_cloturee_insert
    BEFORE INSERT ON mouvement_caisse
    WHEN EXISTS (
      SELECT 1 FROM cloture_caisse AS c
      WHERE c.id_session_caisse = NEW.id_session_caisse
    )
    BEGIN
      SELECT RAISE(ABORT, 'La session possède une clôture : aucun mouvement ordinaire ne peut être ajouté (R-3).');
    END;

    CREATE TRIGGER trg_mouvement_caisse_session_cloturee_update
    BEFORE UPDATE ON mouvement_caisse
    WHEN EXISTS (
      SELECT 1 FROM cloture_caisse AS c
      WHERE c.id_session_caisse = NEW.id_session_caisse
    )
    BEGIN
      SELECT RAISE(ABORT, 'La session possède une clôture : aucun mouvement ordinaire ne peut être modifié (R-3).');
    END;

    CREATE TRIGGER trg_transmission_figee_reception
    BEFORE UPDATE ON transmission_fonds
    WHEN OLD.etat_transmission IN ('RECUE', 'ECART_CONSTATE')
    BEGIN
      SELECT RAISE(ABORT, 'Une transmission reçue ou constatée en écart est figée.');
    END;

    CREATE TRIGGER trg_rapprochement_caisse_no_update
    BEFORE UPDATE ON rapprochement_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Un rapprochement de caisse est append-only.');
    END;

    CREATE TRIGGER trg_rapprochement_caisse_no_delete
    BEFORE DELETE ON rapprochement_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Un rapprochement de caisse est append-only.');
    END;

    CREATE TRIGGER trg_justification_ecart_no_update
    BEFORE UPDATE ON justification_ecart_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Une justification d’écart est append-only.');
    END;

    CREATE TRIGGER trg_justification_ecart_no_delete
    BEFORE DELETE ON justification_ecart_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Une justification d’écart est append-only.');
    END;
  `,
};

export default correction007GestionCaisse;
