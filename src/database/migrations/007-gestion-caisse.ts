import type { Migration } from "./index";

const gestionCaisse: Migration = {
  version: 7,
  name: "gestion_caisse",
  sql: `
    CREATE TABLE poste_caisse (
      id_poste_caisse TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE appareil (
      id_appareil TEXT NOT NULL PRIMARY KEY
    );

    CREATE TABLE session_caisse (
      id_session_caisse TEXT NOT NULL PRIMARY KEY,
      id_poste_caisse TEXT NOT NULL,
      id_appareil TEXT NOT NULL,
      fonds_initial_fcfa INTEGER NOT NULL CHECK (
        typeof(fonds_initial_fcfa) = 'integer'
      ),
      FOREIGN KEY (id_poste_caisse)
        REFERENCES poste_caisse (id_poste_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_appareil)
        REFERENCES appareil (id_appareil)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_session_caisse_poste
      ON session_caisse (id_poste_caisse);
    CREATE INDEX idx_session_caisse_appareil
      ON session_caisse (id_appareil);

    CREATE TABLE cloture_caisse (
      id_cloture_caisse TEXT NOT NULL PRIMARY KEY,
      id_session_caisse TEXT NOT NULL,
      date_cloture TEXT NOT NULL,
      solde_theorique_fcfa INTEGER NOT NULL CHECK (
        typeof(solde_theorique_fcfa) = 'integer'
      ),
      montant_physique_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_physique_fcfa) = 'integer'
      ),
      ecart_fcfa INTEGER NOT NULL CHECK (typeof(ecart_fcfa) = 'integer'),
      FOREIGN KEY (id_session_caisse)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_cloture_caisse_session
      ON cloture_caisse (id_session_caisse);

    CREATE TRIGGER trg_cloture_caisse_immutable_update
    BEFORE UPDATE ON cloture_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Une clôture est un instantané historique immuable.');
    END;

    CREATE TRIGGER trg_cloture_caisse_immutable_delete
    BEFORE DELETE ON cloture_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Une clôture historique ne peut pas être supprimée.');
    END;

    CREATE TABLE mouvement_caisse (
      id_mouvement_caisse TEXT NOT NULL PRIMARY KEY,
      id_session_caisse TEXT NOT NULL,
      montant_fcfa INTEGER NOT NULL CHECK (typeof(montant_fcfa) = 'integer'),
      FOREIGN KEY (id_session_caisse)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_mouvement_caisse_session
      ON mouvement_caisse (id_session_caisse);

    CREATE TRIGGER trg_mouvement_caisse_session_cloturee_insert
    BEFORE INSERT ON mouvement_caisse
    WHEN EXISTS (
      SELECT 1 FROM cloture_caisse
      WHERE id_session_caisse = NEW.id_session_caisse
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une session clôturée ne reçoit plus de mouvements ordinaires.');
    END;

    CREATE TRIGGER trg_mouvement_caisse_session_cloturee_update
    BEFORE UPDATE ON mouvement_caisse
    WHEN EXISTS (
      SELECT 1 FROM cloture_caisse
      WHERE id_session_caisse IN (OLD.id_session_caisse, NEW.id_session_caisse)
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les mouvements d’une session clôturée ne sont pas modifiables.');
    END;

    CREATE TRIGGER trg_session_caisse_cloturee_immutable
    BEFORE UPDATE ON session_caisse
    WHEN EXISTS (
      SELECT 1 FROM cloture_caisse
      WHERE id_session_caisse = OLD.id_session_caisse
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une session clôturée conserve son identité et son historique.');
    END;

    CREATE TABLE detail_comptage_caisse (
      id_detail_comptage_caisse TEXT NOT NULL PRIMARY KEY,
      id_cloture_caisse TEXT NOT NULL,
      numero_comptage INTEGER NOT NULL CHECK (
        typeof(numero_comptage) = 'integer' AND numero_comptage > 0
      ),
      valeur_unitaire_fcfa INTEGER NOT NULL CHECK (
        typeof(valeur_unitaire_fcfa) = 'integer' AND valeur_unitaire_fcfa > 0
      ),
      quantite INTEGER NOT NULL CHECK (
        typeof(quantite) = 'integer' AND quantite >= 0
      ),
      FOREIGN KEY (id_cloture_caisse)
        REFERENCES cloture_caisse (id_cloture_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_detail_comptage_caisse_cloture
      ON detail_comptage_caisse (id_cloture_caisse, numero_comptage);

    CREATE TRIGGER trg_detail_comptage_caisse_immutable_update
    BEFORE UPDATE ON detail_comptage_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Un détail de comptage ou de recomptage est conservé.');
    END;

    CREATE TRIGGER trg_detail_comptage_caisse_immutable_delete
    BEFORE DELETE ON detail_comptage_caisse
    BEGIN
      SELECT RAISE(ABORT, 'Un détail de comptage ou de recomptage ne peut pas être supprimé.');
    END;

    CREATE TABLE transmission_fonds (
      id_transmission_fonds TEXT NOT NULL PRIMARY KEY,
      id_session_caisse TEXT NOT NULL,
      montant_envoye_fcfa INTEGER NOT NULL CHECK (
        typeof(montant_envoye_fcfa) = 'integer'
      ),
      montant_recu_fcfa INTEGER CHECK (
        montant_recu_fcfa IS NULL OR typeof(montant_recu_fcfa) = 'integer'
      ),
      FOREIGN KEY (id_session_caisse)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_transmission_fonds_session
      ON transmission_fonds (id_session_caisse);

    CREATE TABLE rapprochement_caisse (
      id_rapprochement_caisse TEXT NOT NULL PRIMARY KEY,
      id_session_caisse TEXT NOT NULL,
      FOREIGN KEY (id_session_caisse)
        REFERENCES session_caisse (id_session_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_rapprochement_caisse_session
      ON rapprochement_caisse (id_session_caisse);

    CREATE TABLE justification_ecart_caisse (
      id_justification_ecart_caisse TEXT NOT NULL PRIMARY KEY,
      id_rapprochement_caisse TEXT NOT NULL,
      FOREIGN KEY (id_rapprochement_caisse)
        REFERENCES rapprochement_caisse (id_rapprochement_caisse)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_justification_ecart_rapprochement
      ON justification_ecart_caisse (id_rapprochement_caisse);
  `,
};

export default gestionCaisse;