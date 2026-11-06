import type { Migration } from "./index";

const synchronisationOfflineFirst: Migration = {
  version: 10,
  name: "synchronisation_offline_first",
  sql: `
    CREATE TABLE appareil_synchronisation (
      id_appareil TEXT NOT NULL PRIMARY KEY,
      id_etablissement TEXT NOT NULL,
      date_enregistrement TEXT NOT NULL,
      date_derniere_activite TEXT,
      etat_appareil TEXT NOT NULL CHECK (
        etat_appareil IN ('ENREGISTRE', 'ACTIF', 'SUSPENDU', 'REVOQUE')
      ),
      date_suspension TEXT,
      date_revocation TEXT,
      motif_suspension_revocation TEXT,
      UNIQUE (id_appareil, id_etablissement),
      FOREIGN KEY (id_etablissement)
        REFERENCES etablissement (id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_appareil_sync_etablissement
      ON appareil_synchronisation (id_etablissement);

    CREATE TABLE installation_locale (
      id_installation TEXT NOT NULL PRIMARY KEY,
      id_appareil TEXT NOT NULL,
      date_creation TEXT NOT NULL,
      date_fin TEXT,
      version_application TEXT NOT NULL,
      version_schema_local TEXT NOT NULL,
      etat_installation TEXT NOT NULL CHECK (
        etat_installation IN ('ACTIVE', 'REMPLACEE', 'INACTIVE', 'A_RECONCILIER')
      ),
      numero_generation INTEGER NOT NULL CHECK (
        typeof(numero_generation) = 'integer' AND numero_generation > 0
      ),
      UNIQUE (id_appareil, numero_generation),
      UNIQUE (id_installation, id_appareil),
      FOREIGN KEY (id_appareil)
        REFERENCES appareil_synchronisation (id_appareil)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_installation_locale_appareil
      ON installation_locale (id_appareil);

    CREATE TABLE flux_synchronisation (
      id_flux TEXT NOT NULL PRIMARY KEY,
      origine_flux TEXT NOT NULL CHECK (
        origine_flux IN ('INSTALLATION_LOCALE', 'SERVEUR_CENTRAL')
      ),
      id_installation_emettrice TEXT,
      id_etablissement_contexte TEXT,
      sens_flux TEXT NOT NULL CHECK (
        sens_flux IN ('APPAREIL_VERS_SERVEUR', 'SERVEUR_VERS_APPAREIL')
      ),
      identifiant_partition TEXT NOT NULL,
      date_creation TEXT NOT NULL,
      etat_flux TEXT NOT NULL CHECK (
        etat_flux IN ('OUVERT', 'SUSPENDU', 'CLOTURE')
      ),
      derniere_sequence_attribuee INTEGER NOT NULL DEFAULT 0 CHECK (
        typeof(derniere_sequence_attribuee) = 'integer'
        AND derniere_sequence_attribuee >= 0
      ),
      CHECK (
        (origine_flux = 'INSTALLATION_LOCALE'
          AND id_installation_emettrice IS NOT NULL
          AND id_etablissement_contexte IS NULL
          AND sens_flux = 'APPAREIL_VERS_SERVEUR')
        OR (origine_flux = 'SERVEUR_CENTRAL'
          AND id_installation_emettrice IS NULL
          AND id_etablissement_contexte IS NOT NULL
          AND sens_flux = 'SERVEUR_VERS_APPAREIL')
      ),
      FOREIGN KEY (id_installation_emettrice)
        REFERENCES installation_locale (id_installation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_etablissement_contexte)
        REFERENCES etablissement (id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_flux_synchronisation_installation
      ON flux_synchronisation (id_installation_emettrice);
    CREATE INDEX idx_flux_synchronisation_etablissement
      ON flux_synchronisation (id_etablissement_contexte);

    CREATE TABLE operation_synchronisation (
      id_operation TEXT NOT NULL PRIMARY KEY,
      origine_operation TEXT NOT NULL CHECK (
        origine_operation IN ('INSTALLATION_LOCALE', 'SERVEUR_CENTRAL')
      ),
      id_installation_origine TEXT,
      id_etablissement_contexte TEXT,
      reference_operation_metier TEXT,
      id_utilisateur_auteur_metier TEXT,
      domaine_proprietaire TEXT NOT NULL,
      portee_atomicite_declaree TEXT NOT NULL,
      nombre_evenements_attendus INTEGER NOT NULL CHECK (
        typeof(nombre_evenements_attendus) = 'integer'
        AND nombre_evenements_attendus > 0
      ),
      date_creation_locale TEXT,
      date_reception_initiale TEXT,
      date_reception_complete TEXT,
      resultat_traitement TEXT CHECK (
        resultat_traitement IS NULL OR resultat_traitement IN (
          'NON_TRAITE', 'EN_ATTENTE', 'VALIDE', 'REJETE_DEFINITIVEMENT',
          'EN_CONFLIT', 'DECISION_ARBITRAGE_EN_ATTENTE', 'ARBITRE_A_APPLIQUER',
          'ARBITRAGE_APPLIQUE', 'INCOMPATIBLE_TEMPORAIRE', 'REJET_FORMAT_DEFINITIF'
        )
      ),
      CHECK (
        (origine_operation = 'INSTALLATION_LOCALE'
          AND id_installation_origine IS NOT NULL
          AND id_etablissement_contexte IS NULL
          AND date_creation_locale IS NOT NULL)
        OR (origine_operation = 'SERVEUR_CENTRAL'
          AND id_installation_origine IS NULL
          AND id_etablissement_contexte IS NOT NULL)
      ),
      FOREIGN KEY (id_installation_origine)
        REFERENCES installation_locale (id_installation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_etablissement_contexte)
        REFERENCES etablissement (id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_operation_synchronisation_installation
      ON operation_synchronisation (id_installation_origine);
    CREATE INDEX idx_operation_synchronisation_etablissement
      ON operation_synchronisation (id_etablissement_contexte);

    CREATE TABLE enveloppe_evenement_synchronisation (
      id_evenement TEXT NOT NULL PRIMARY KEY,
      id_operation TEXT NOT NULL,
      id_flux_origine TEXT NOT NULL,
      numero_sequence_origine INTEGER NOT NULL CHECK (
        typeof(numero_sequence_origine) = 'integer'
        AND numero_sequence_origine > 0
      ),
      type_evenement TEXT NOT NULL,
      type_entite_source TEXT NOT NULL,
      id_entite_source TEXT NOT NULL,
      reference_contenu_metier_immuable TEXT NOT NULL,
      ordre_dans_operation INTEGER NOT NULL CHECK (
        typeof(ordre_dans_operation) = 'integer'
        AND ordre_dans_operation > 0
      ),
      version_enveloppe TEXT NOT NULL,
      version_evenement TEXT NOT NULL,
      version_application_emettrice TEXT NOT NULL,
      date_creation_locale TEXT,
      date_reception_durable TEXT,
      empreinte_integrite TEXT,
      motif_incompatibilite TEXT,
      UNIQUE (id_flux_origine, numero_sequence_origine),
      UNIQUE (id_operation, ordre_dans_operation),
      FOREIGN KEY (id_operation)
        REFERENCES operation_synchronisation (id_operation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_flux_origine)
        REFERENCES flux_synchronisation (id_flux)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_enveloppe_evenement_operation
      ON enveloppe_evenement_synchronisation (id_operation);
    CREATE INDEX idx_enveloppe_evenement_flux_sequence
      ON enveloppe_evenement_synchronisation (id_flux_origine, numero_sequence_origine);
    CREATE INDEX idx_enveloppe_evenement_source
      ON enveloppe_evenement_synchronisation (type_entite_source, id_entite_source);

    CREATE TABLE dependance_evenement_synchronisation (
      id_dependance TEXT NOT NULL PRIMARY KEY,
      id_evenement_dependant TEXT NOT NULL,
      id_evenement_prerequis TEXT NOT NULL,
      type_dependance TEXT NOT NULL,
      date_identification TEXT NOT NULL,
      caractere_obligatoire INTEGER NOT NULL CHECK (caractere_obligatoire IN (0, 1)),
      CHECK (id_evenement_dependant <> id_evenement_prerequis),
      FOREIGN KEY (id_evenement_dependant)
        REFERENCES enveloppe_evenement_synchronisation (id_evenement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_evenement_prerequis)
        REFERENCES enveloppe_evenement_synchronisation (id_evenement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_dependance_evenement_dependant
      ON dependance_evenement_synchronisation (id_evenement_dependant);
    CREATE INDEX idx_dependance_evenement_prerequis
      ON dependance_evenement_synchronisation (id_evenement_prerequis);

    CREATE TABLE curseur_synchronisation (
      id_curseur TEXT NOT NULL PRIMARY KEY,
      id_flux TEXT NOT NULL,
      type_recepteur TEXT NOT NULL CHECK (
        type_recepteur IN ('SERVEUR_CENTRAL', 'INSTALLATION_LOCALE')
      ),
      id_installation_recepteur TEXT,
      derniere_sequence_recue_durable_contigue INTEGER NOT NULL DEFAULT 0 CHECK (
        typeof(derniere_sequence_recue_durable_contigue) = 'integer'
        AND derniere_sequence_recue_durable_contigue >= 0
      ),
      derniere_sequence_traitee_definitivement_contigue INTEGER NOT NULL DEFAULT 0 CHECK (
        typeof(derniere_sequence_traitee_definitivement_contigue) = 'integer'
        AND derniere_sequence_traitee_definitivement_contigue >= 0
        AND derniere_sequence_traitee_definitivement_contigue <= derniere_sequence_recue_durable_contigue
      ),
      date_derniere_reception TEXT,
      date_derniere_progression_traitement TEXT,
      CHECK (
        (type_recepteur = 'SERVEUR_CENTRAL' AND id_installation_recepteur IS NULL)
        OR (type_recepteur = 'INSTALLATION_LOCALE' AND id_installation_recepteur IS NOT NULL)
      ),
      FOREIGN KEY (id_flux)
        REFERENCES flux_synchronisation (id_flux)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_installation_recepteur)
        REFERENCES installation_locale (id_installation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE UNIQUE INDEX idx_curseur_flux_serveur_unique
      ON curseur_synchronisation (id_flux)
      WHERE type_recepteur = 'SERVEUR_CENTRAL';
    CREATE UNIQUE INDEX idx_curseur_flux_installation_unique
      ON curseur_synchronisation (id_flux, id_installation_recepteur)
      WHERE type_recepteur = 'INSTALLATION_LOCALE';
    CREATE INDEX idx_curseur_installation_recepteur
      ON curseur_synchronisation (id_installation_recepteur);

    CREATE TABLE conflit_synchronisation (
      id_conflit TEXT NOT NULL PRIMARY KEY,
      type_conflit TEXT NOT NULL,
      nature_conflit TEXT NOT NULL,
      date_detection TEXT NOT NULL,
      motif_detection TEXT NOT NULL,
      etat_conflit TEXT NOT NULL CHECK (
        etat_conflit IN (
          'DETECTE', 'EN_ANALYSE', 'EN_ATTENTE_ARBITRAGE',
          'RESOLU_APRES_APPLICATION', 'CLOS'
        )
      ),
      date_resolution TEXT
    );

    CREATE TABLE association_conflit_evenement (
      id_conflit TEXT NOT NULL,
      id_evenement TEXT NOT NULL,
      role_evenement_dans_conflit TEXT NOT NULL,
      date_association TEXT NOT NULL,
      motif_association TEXT NOT NULL,
      PRIMARY KEY (id_conflit, id_evenement, role_evenement_dans_conflit),
      FOREIGN KEY (id_conflit)
        REFERENCES conflit_synchronisation (id_conflit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
        DEFERRABLE INITIALLY DEFERRED,
      FOREIGN KEY (id_evenement)
        REFERENCES enveloppe_evenement_synchronisation (id_evenement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_association_conflit_evenement_evenement
      ON association_conflit_evenement (id_evenement);

    CREATE TABLE association_conflit_operation (
      id_association_conflit_operation TEXT NOT NULL PRIMARY KEY,
      id_conflit TEXT NOT NULL,
      id_operation TEXT NOT NULL,
      role_operation_dans_conflit TEXT NOT NULL,
      date_association TEXT NOT NULL,
      motif_association TEXT NOT NULL,
      FOREIGN KEY (id_conflit)
        REFERENCES conflit_synchronisation (id_conflit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
        DEFERRABLE INITIALLY DEFERRED,
      FOREIGN KEY (id_operation)
        REFERENCES operation_synchronisation (id_operation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_association_conflit_operation_conflit
      ON association_conflit_operation (id_conflit);
    CREATE INDEX idx_association_conflit_operation_operation
      ON association_conflit_operation (id_operation);

    CREATE TRIGGER trg_conflit_requires_event_and_operation
    BEFORE INSERT ON conflit_synchronisation
    WHEN NOT EXISTS (
      SELECT 1 FROM association_conflit_evenement
      WHERE id_conflit = NEW.id_conflit
    ) OR NOT EXISTS (
      SELECT 1 FROM association_conflit_operation
      WHERE id_conflit = NEW.id_conflit
    )
    BEGIN
      SELECT RAISE(ABORT, 'Un conflit référence au moins un événement et une opération.');
    END;

    CREATE TRIGGER trg_association_conflit_evenement_append_only_update
    BEFORE UPDATE ON association_conflit_evenement
    BEGIN
      SELECT RAISE(ABORT, 'Une association conflit-événement est append-only.');
    END;

    CREATE TRIGGER trg_association_conflit_evenement_append_only_delete
    BEFORE DELETE ON association_conflit_evenement
    BEGIN
      SELECT RAISE(ABORT, 'Une association conflit-événement ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_association_conflit_operation_append_only_update
    BEFORE UPDATE ON association_conflit_operation
    BEGIN
      SELECT RAISE(ABORT, 'Une association conflit-opération est append-only.');
    END;

    CREATE TRIGGER trg_association_conflit_operation_append_only_delete
    BEFORE DELETE ON association_conflit_operation
    BEGIN
      SELECT RAISE(ABORT, 'Une association conflit-opération ne peut pas être supprimée.');
    END;

    CREATE TABLE decision_arbitrage_synchronisation (
      id_decision TEXT NOT NULL PRIMARY KEY,
      id_conflit TEXT NOT NULL,
      id_utilisateur_arbitre TEXT NOT NULL,
      type_decision TEXT NOT NULL,
      reference_version_retenue TEXT,
      date_decision TEXT NOT NULL,
      justification TEXT NOT NULL,
      FOREIGN KEY (id_conflit)
        REFERENCES conflit_synchronisation (id_conflit)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_decision_arbitrage_conflit
      ON decision_arbitrage_synchronisation (id_conflit);

    CREATE TABLE transition_applicabilite_decision (
      id_transition TEXT NOT NULL PRIMARY KEY,
      id_decision TEXT NOT NULL,
      type_transition TEXT NOT NULL CHECK (
        type_transition IN ('RETENUE', 'REMPLACEE', 'ANNULEE')
      ),
      date_transition TEXT NOT NULL,
      id_utilisateur_auteur_transition TEXT,
      id_decision_remplacante TEXT,
      CHECK (
        (type_transition = 'REMPLACEE' AND id_decision_remplacante IS NOT NULL)
        OR (type_transition <> 'REMPLACEE' AND id_decision_remplacante IS NULL)
      ),
      CHECK (
        id_decision_remplacante IS NULL OR id_decision_remplacante <> id_decision
      ),
      FOREIGN KEY (id_decision)
        REFERENCES decision_arbitrage_synchronisation (id_decision)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_decision_remplacante)
        REFERENCES decision_arbitrage_synchronisation (id_decision)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_transition_applicabilite_decision
      ON transition_applicabilite_decision (id_decision);
    CREATE INDEX idx_transition_applicabilite_remplacante
      ON transition_applicabilite_decision (id_decision_remplacante);

    CREATE TABLE application_decision_arbitrage (
      id_application TEXT NOT NULL PRIMARY KEY,
      id_decision TEXT NOT NULL,
      date_tentative TEXT NOT NULL,
      resultat_application TEXT NOT NULL CHECK (
        resultat_application IN ('APPLIQUEE', 'ECHEC')
      ),
      motif_echec TEXT,
      id_utilisateur_application TEXT,
      FOREIGN KEY (id_decision)
        REFERENCES decision_arbitrage_synchronisation (id_decision)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_application_decision
      ON application_decision_arbitrage (id_decision);

    CREATE TABLE sauvegarde_locale (
      id_sauvegarde TEXT NOT NULL PRIMARY KEY,
      id_appareil_origine TEXT NOT NULL,
      id_installation_origine TEXT NOT NULL,
      date_creation TEXT NOT NULL,
      type_sauvegarde TEXT NOT NULL,
      version_application TEXT NOT NULL,
      version_schema_local TEXT NOT NULL,
      perimetre_sauvegarde TEXT NOT NULL,
      reference_stockage TEXT NOT NULL,
      resultat_verification_integrite TEXT NOT NULL,
      date_verification TEXT,
      empreinte_integrite TEXT,
      FOREIGN KEY (id_appareil_origine)
        REFERENCES appareil_synchronisation (id_appareil)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_installation_origine, id_appareil_origine)
        REFERENCES installation_locale (id_installation, id_appareil)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_sauvegarde_appareil_origine
      ON sauvegarde_locale (id_appareil_origine);
    CREATE INDEX idx_sauvegarde_installation_origine
      ON sauvegarde_locale (id_installation_origine, id_appareil_origine);

    CREATE TABLE operation_restauration (
      id_restauration TEXT NOT NULL PRIMARY KEY,
      id_sauvegarde TEXT NOT NULL,
      id_appareil_cible TEXT NOT NULL,
      id_installation_cible TEXT NOT NULL,
      date_demande TEXT NOT NULL,
      date_debut TEXT NOT NULL,
      date_fin TEXT,
      etat_restauration TEXT NOT NULL CHECK (
        etat_restauration IN (
          'DEMANDEE', 'SOURCE_VERIFIEE', 'EN_COURS', 'EN_RECONCILIATION',
          'REPRISE_AUTORISEE', 'ECHEC'
        )
      ),
      resultat_verification TEXT NOT NULL,
      date_reconciliation_centrale TEXT,
      motif_echec TEXT,
      FOREIGN KEY (id_sauvegarde)
        REFERENCES sauvegarde_locale (id_sauvegarde)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_appareil_cible)
        REFERENCES appareil_synchronisation (id_appareil)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_installation_cible, id_appareil_cible)
        REFERENCES installation_locale (id_installation, id_appareil)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_restauration_sauvegarde
      ON operation_restauration (id_sauvegarde);
    CREATE INDEX idx_restauration_appareil_cible
      ON operation_restauration (id_appareil_cible);
    CREATE INDEX idx_restauration_installation_cible
      ON operation_restauration (id_installation_cible, id_appareil_cible);

    CREATE TABLE association_recuperation_evenement (
      id_association_recuperation TEXT NOT NULL PRIMARY KEY,
      id_restauration TEXT NOT NULL,
      id_evenement_origine TEXT NOT NULL,
      id_utilisateur_autorisateur TEXT NOT NULL,
      date_autorisation TEXT NOT NULL,
      resultat_autorisation TEXT NOT NULL,
      motif TEXT NOT NULL,
      FOREIGN KEY (id_restauration)
        REFERENCES operation_restauration (id_restauration)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_evenement_origine)
        REFERENCES enveloppe_evenement_synchronisation (id_evenement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_association_recuperation_restauration
      ON association_recuperation_evenement (id_restauration);
    CREATE INDEX idx_association_recuperation_evenement
      ON association_recuperation_evenement (id_evenement_origine);

    CREATE TABLE tentative_transmission_synchronisation (
      id_tentative TEXT NOT NULL PRIMARY KEY,
      id_evenement TEXT NOT NULL,
      id_installation_emettrice_actuelle TEXT,
      id_utilisateur_synchronisation TEXT,
      id_association_recuperation TEXT,
      date_tentative TEXT NOT NULL,
      resultat_tentative TEXT NOT NULL,
      motif_echec TEXT,
      FOREIGN KEY (id_evenement)
        REFERENCES enveloppe_evenement_synchronisation (id_evenement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_installation_emettrice_actuelle)
        REFERENCES installation_locale (id_installation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_association_recuperation)
        REFERENCES association_recuperation_evenement (id_association_recuperation)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_tentative_synchronisation_evenement
      ON tentative_transmission_synchronisation (id_evenement);
    CREATE INDEX idx_tentative_synchronisation_installation
      ON tentative_transmission_synchronisation (id_installation_emettrice_actuelle);
    CREATE INDEX idx_tentative_synchronisation_recuperation
      ON tentative_transmission_synchronisation (id_association_recuperation);

    CREATE VIEW lot8_operation_etablissement AS
      SELECT operation.id_operation,
        CASE operation.origine_operation
          WHEN 'INSTALLATION_LOCALE' THEN (
            SELECT appareil.id_etablissement
            FROM installation_locale AS installation
            JOIN appareil_synchronisation AS appareil
              ON appareil.id_appareil = installation.id_appareil
            WHERE installation.id_installation = operation.id_installation_origine
          )
          ELSE operation.id_etablissement_contexte
        END AS id_etablissement
      FROM operation_synchronisation AS operation;

    CREATE TRIGGER trg_flux_commence_sequence_zero
    BEFORE INSERT ON flux_synchronisation
    WHEN NEW.derniere_sequence_attribuee <> 0
    BEGIN
      SELECT RAISE(ABORT, 'Un flux neuf commence avant sa première séquence.');
    END;

    CREATE TRIGGER trg_flux_identite_immutable
    BEFORE UPDATE OF
      id_flux, origine_flux, id_installation_emettrice,
      id_etablissement_contexte, sens_flux, identifiant_partition, date_creation
      ON flux_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'L’identité, l’origine et le sens d’un flux sont immuables.');
    END;

    CREATE TRIGGER trg_installation_generation_immutable_update
    BEFORE UPDATE OF id_installation, id_appareil, numero_generation
      ON installation_locale
    BEGIN
      SELECT RAISE(ABORT, 'L’identité et la génération d’une installation sont stables.');
    END;

    CREATE TRIGGER trg_installation_generation_immutable_delete
    BEFORE DELETE ON installation_locale
    WHEN EXISTS (
      SELECT 1 FROM flux_synchronisation
      WHERE id_installation_emettrice = OLD.id_installation
    ) OR EXISTS (
      SELECT 1 FROM operation_synchronisation
      WHERE id_installation_origine = OLD.id_installation
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une installation présente dans l’historique est conservée.');
    END;

    CREATE TRIGGER trg_flux_sequence_monotone
    BEFORE UPDATE OF derniere_sequence_attribuee ON flux_synchronisation
    WHEN NEW.derniere_sequence_attribuee < OLD.derniere_sequence_attribuee
      OR NEW.derniere_sequence_attribuee <> COALESCE((
        SELECT MAX(numero_sequence_origine)
        FROM enveloppe_evenement_synchronisation
        WHERE id_flux_origine = OLD.id_flux
      ), 0)
    BEGIN
      SELECT RAISE(ABORT, 'La séquence du flux est monotone et correspond aux événements enregistrés.');
    END;

    CREATE TRIGGER trg_operation_manifest_idempotent_insert
    BEFORE INSERT ON operation_synchronisation
    BEGIN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM operation_synchronisation AS existante
        WHERE existante.id_operation = NEW.id_operation
          AND (
            existante.origine_operation IS NOT NEW.origine_operation
            OR existante.id_installation_origine IS NOT NEW.id_installation_origine
            OR existante.id_etablissement_contexte IS NOT NEW.id_etablissement_contexte
            OR existante.reference_operation_metier IS NOT NEW.reference_operation_metier
            OR existante.id_utilisateur_auteur_metier IS NOT NEW.id_utilisateur_auteur_metier
            OR existante.domaine_proprietaire IS NOT NEW.domaine_proprietaire
            OR existante.portee_atomicite_declaree IS NOT NEW.portee_atomicite_declaree
            OR existante.nombre_evenements_attendus IS NOT NEW.nombre_evenements_attendus
            OR existante.date_creation_locale IS NOT NEW.date_creation_locale
          )
      ) THEN RAISE(ABORT, 'Une identité d’opération ne peut pas porter un manifeste différent.') END;

      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM operation_synchronisation
        WHERE id_operation = NEW.id_operation
      ) THEN RAISE(IGNORE) END;
    END;

    CREATE TRIGGER trg_operation_manifest_immutable
    BEFORE UPDATE OF
      origine_operation, id_installation_origine, id_etablissement_contexte,
      reference_operation_metier, id_utilisateur_auteur_metier,
      domaine_proprietaire, portee_atomicite_declaree,
      nombre_evenements_attendus, date_creation_locale
      ON operation_synchronisation
    WHEN EXISTS (
      SELECT 1 FROM enveloppe_evenement_synchronisation
      WHERE id_operation = OLD.id_operation
    )
    BEGIN
      SELECT RAISE(ABORT, 'Le manifeste d’une opération est immuable dès son premier événement.');
    END;

    CREATE TRIGGER trg_operation_reception_dates_immutable
    BEFORE UPDATE OF date_reception_initiale, date_reception_complete
      ON operation_synchronisation
    WHEN (OLD.date_reception_initiale IS NOT NULL
        AND NEW.date_reception_initiale IS NOT OLD.date_reception_initiale)
      OR (OLD.date_reception_complete IS NOT NULL
        AND NEW.date_reception_complete IS NOT OLD.date_reception_complete)
    BEGIN
      SELECT RAISE(ABORT, 'Les dates de réception d’une opération sont conservées.');
    END;

    CREATE TRIGGER trg_operation_reception_complete
    BEFORE UPDATE OF date_reception_complete ON operation_synchronisation
    WHEN NEW.date_reception_complete IS NOT NULL
      AND (
        (SELECT COUNT(*) FROM enveloppe_evenement_synchronisation
          WHERE id_operation = NEW.id_operation) <> NEW.nombre_evenements_attendus
        OR (SELECT MIN(ordre_dans_operation) FROM enveloppe_evenement_synchronisation
          WHERE id_operation = NEW.id_operation) <> 1
        OR (SELECT MAX(ordre_dans_operation) FROM enveloppe_evenement_synchronisation
          WHERE id_operation = NEW.id_operation) <> NEW.nombre_evenements_attendus
      )
    BEGIN
      SELECT RAISE(ABORT, 'La réception complète exige tous les événements et rangs attendus.');
    END;

    CREATE TRIGGER trg_evenement_idempotence_et_provenance
    BEFORE INSERT ON enveloppe_evenement_synchronisation
    BEGIN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM enveloppe_evenement_synchronisation AS existant
        WHERE existant.id_evenement = NEW.id_evenement
          AND (
            existant.id_operation IS NOT NEW.id_operation
            OR existant.id_flux_origine IS NOT NEW.id_flux_origine
            OR existant.numero_sequence_origine IS NOT NEW.numero_sequence_origine
            OR existant.type_evenement IS NOT NEW.type_evenement
            OR existant.type_entite_source IS NOT NEW.type_entite_source
            OR existant.id_entite_source IS NOT NEW.id_entite_source
            OR existant.reference_contenu_metier_immuable IS NOT NEW.reference_contenu_metier_immuable
            OR existant.ordre_dans_operation IS NOT NEW.ordre_dans_operation
            OR existant.version_enveloppe IS NOT NEW.version_enveloppe
            OR existant.version_evenement IS NOT NEW.version_evenement
            OR existant.version_application_emettrice IS NOT NEW.version_application_emettrice
            OR existant.date_creation_locale IS NOT NEW.date_creation_locale
          )
      ) THEN RAISE(ABORT, 'Une identité d’événement ne peut pas porter un contenu différent.') END;

      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM enveloppe_evenement_synchronisation
        WHERE id_evenement = NEW.id_evenement
      ) THEN RAISE(IGNORE) END;

      SELECT CASE WHEN NOT EXISTS (
        SELECT 1
        FROM operation_synchronisation AS operation
        JOIN flux_synchronisation AS flux
          ON flux.id_flux = NEW.id_flux_origine
        WHERE operation.id_operation = NEW.id_operation
          AND NEW.ordre_dans_operation <= operation.nombre_evenements_attendus
          AND NEW.numero_sequence_origine = flux.derniere_sequence_attribuee + 1
          AND (
            (operation.origine_operation = 'INSTALLATION_LOCALE'
              AND flux.origine_flux = 'INSTALLATION_LOCALE'
              AND operation.id_installation_origine = flux.id_installation_emettrice
              AND NEW.date_creation_locale IS NOT NULL)
            OR (operation.origine_operation = 'SERVEUR_CENTRAL'
              AND flux.origine_flux = 'SERVEUR_CENTRAL'
              AND operation.id_etablissement_contexte = flux.id_etablissement_contexte)
          )
      ) THEN RAISE(ABORT, 'L’événement doit respecter l’origine, la séquence et le manifeste de l’opération.') END;
    END;

    CREATE TRIGGER trg_evenement_advance_flux_sequence
    AFTER INSERT ON enveloppe_evenement_synchronisation
    BEGIN
      UPDATE flux_synchronisation
      SET derniere_sequence_attribuee = NEW.numero_sequence_origine
      WHERE id_flux = NEW.id_flux_origine;
    END;

    CREATE TRIGGER trg_evenement_content_immutable
    BEFORE UPDATE OF
      id_operation, id_flux_origine, numero_sequence_origine, type_evenement,
      type_entite_source, id_entite_source, reference_contenu_metier_immuable,
      ordre_dans_operation, version_enveloppe, version_evenement,
      version_application_emettrice, date_creation_locale
      ON enveloppe_evenement_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'L’identité, la provenance et le contenu métier d’un événement sont immuables.');
    END;

    CREATE TRIGGER trg_evenement_append_only_delete
    BEFORE DELETE ON enveloppe_evenement_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'Un événement de synchronisation ne peut pas être supprimé.');
    END;

    CREATE TRIGGER trg_dependance_acyclique_insert
    BEFORE INSERT ON dependance_evenement_synchronisation
    BEGIN
      SELECT CASE WHEN EXISTS (
        WITH RECURSIVE parcours(id_evenement) AS (
          SELECT NEW.id_evenement_prerequis
          UNION
          SELECT dependance.id_evenement_prerequis
          FROM dependance_evenement_synchronisation AS dependance
          JOIN parcours ON dependance.id_evenement_dependant = parcours.id_evenement
        )
        SELECT 1 FROM parcours
        WHERE id_evenement = NEW.id_evenement_dependant
      ) THEN RAISE(ABORT, 'Une dépendance circulaire est interdite.') END;
    END;

    CREATE TRIGGER trg_dependance_append_only_update
    BEFORE UPDATE ON dependance_evenement_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'Une dépendance historique ne peut pas être modifiée.');
    END;

    CREATE TRIGGER trg_dependance_append_only_delete
    BEFORE DELETE ON dependance_evenement_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'Une dépendance historique ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_curseur_receiver_flux_insert
    BEFORE INSERT ON curseur_synchronisation
    WHEN NOT EXISTS (
      SELECT 1 FROM flux_synchronisation AS flux
      WHERE flux.id_flux = NEW.id_flux
        AND (
          (flux.sens_flux = 'APPAREIL_VERS_SERVEUR'
            AND NEW.type_recepteur = 'SERVEUR_CENTRAL'
            AND NEW.id_installation_recepteur IS NULL)
          OR (flux.sens_flux = 'SERVEUR_VERS_APPAREIL'
            AND NEW.type_recepteur = 'INSTALLATION_LOCALE'
            AND NEW.id_installation_recepteur IS NOT NULL)
        )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Le récepteur du curseur doit correspondre au sens du flux.');
    END;

    CREATE TRIGGER trg_curseur_receiver_flux_update
    BEFORE UPDATE OF id_flux, type_recepteur, id_installation_recepteur
      ON curseur_synchronisation
    WHEN NOT EXISTS (
      SELECT 1 FROM flux_synchronisation AS flux
      WHERE flux.id_flux = NEW.id_flux
        AND (
          (flux.sens_flux = 'APPAREIL_VERS_SERVEUR'
            AND NEW.type_recepteur = 'SERVEUR_CENTRAL'
            AND NEW.id_installation_recepteur IS NULL)
          OR (flux.sens_flux = 'SERVEUR_VERS_APPAREIL'
            AND NEW.type_recepteur = 'INSTALLATION_LOCALE'
            AND NEW.id_installation_recepteur IS NOT NULL)
        )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Le récepteur du curseur doit correspondre au sens du flux.');
    END;

    CREATE TRIGGER trg_curseur_reception_contigue
    BEFORE UPDATE OF derniere_sequence_recue_durable_contigue
      ON curseur_synchronisation
    WHEN NEW.derniere_sequence_recue_durable_contigue > OLD.derniere_sequence_recue_durable_contigue
      AND (
        (SELECT COUNT(*) FROM enveloppe_evenement_synchronisation
          WHERE id_flux_origine = NEW.id_flux
            AND numero_sequence_origine <= NEW.derniere_sequence_recue_durable_contigue
            AND date_reception_durable IS NOT NULL)
          <> NEW.derniere_sequence_recue_durable_contigue
      )
    BEGIN
      SELECT RAISE(ABORT, 'Le curseur de réception ne franchit pas de séquence absente ou non durable.');
    END;

    CREATE TRIGGER trg_curseur_traitement_contigu
    BEFORE UPDATE OF derniere_sequence_traitee_definitivement_contigue
      ON curseur_synchronisation
    WHEN NEW.derniere_sequence_traitee_definitivement_contigue > OLD.derniere_sequence_traitee_definitivement_contigue
      AND (
        (SELECT COUNT(*) FROM enveloppe_evenement_synchronisation
          WHERE id_flux_origine = NEW.id_flux
            AND numero_sequence_origine <= NEW.derniere_sequence_traitee_definitivement_contigue)
          <> NEW.derniere_sequence_traitee_definitivement_contigue
      )
    BEGIN
      SELECT RAISE(ABORT, 'Le curseur de traitement ne franchit pas de séquence absente.');
    END;

    CREATE TRIGGER trg_conflict_event_same_establishment_insert
    BEFORE INSERT ON association_conflit_evenement
    WHEN EXISTS (
      SELECT 1
      FROM enveloppe_evenement_synchronisation AS nouvel_evenement
      JOIN lot8_operation_etablissement AS nouvel_etablissement
        ON nouvel_etablissement.id_operation = nouvel_evenement.id_operation
      JOIN association_conflit_evenement AS ancien_lien
        ON ancien_lien.id_conflit = NEW.id_conflit
      JOIN enveloppe_evenement_synchronisation AS ancien_evenement
        ON ancien_evenement.id_evenement = ancien_lien.id_evenement
      JOIN lot8_operation_etablissement AS ancien_etablissement
        ON ancien_etablissement.id_operation = ancien_evenement.id_operation
      WHERE nouvel_evenement.id_evenement = NEW.id_evenement
        AND ancien_etablissement.id_etablissement IS NOT nouvel_etablissement.id_etablissement
    ) OR EXISTS (
      SELECT 1
      FROM enveloppe_evenement_synchronisation AS nouvel_evenement
      JOIN lot8_operation_etablissement AS nouvel_etablissement
        ON nouvel_etablissement.id_operation = nouvel_evenement.id_operation
      JOIN association_conflit_operation AS ancien_lien
        ON ancien_lien.id_conflit = NEW.id_conflit
      JOIN lot8_operation_etablissement AS ancien_etablissement
        ON ancien_etablissement.id_operation = ancien_lien.id_operation
      WHERE nouvel_evenement.id_evenement = NEW.id_evenement
        AND ancien_etablissement.id_etablissement IS NOT nouvel_etablissement.id_etablissement
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les associations d’un conflit restent dans le même établissement.');
    END;

    CREATE TRIGGER trg_conflict_operation_same_establishment_insert
    BEFORE INSERT ON association_conflit_operation
    WHEN EXISTS (
      SELECT 1
      FROM lot8_operation_etablissement AS nouvelle_operation
      JOIN association_conflit_operation AS ancien_lien
        ON ancien_lien.id_conflit = NEW.id_conflit
      JOIN lot8_operation_etablissement AS ancienne_operation
        ON ancienne_operation.id_operation = ancien_lien.id_operation
      WHERE nouvelle_operation.id_operation = NEW.id_operation
        AND ancienne_operation.id_etablissement IS NOT nouvelle_operation.id_etablissement
    ) OR EXISTS (
      SELECT 1
      FROM lot8_operation_etablissement AS nouvelle_operation
      JOIN association_conflit_evenement AS ancien_lien
        ON ancien_lien.id_conflit = NEW.id_conflit
      JOIN enveloppe_evenement_synchronisation AS ancien_evenement
        ON ancien_evenement.id_evenement = ancien_lien.id_evenement
      JOIN lot8_operation_etablissement AS ancienne_operation
        ON ancienne_operation.id_operation = ancien_evenement.id_operation
      WHERE nouvelle_operation.id_operation = NEW.id_operation
        AND ancienne_operation.id_etablissement IS NOT nouvelle_operation.id_etablissement
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les opérations d’un conflit restent dans le même établissement.');
    END;

    CREATE TRIGGER trg_decision_arbitrage_immutable_update
    BEFORE UPDATE ON decision_arbitrage_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'Le contenu d’une décision d’arbitrage est immuable.');
    END;

    CREATE TRIGGER trg_decision_arbitrage_immutable_delete
    BEFORE DELETE ON decision_arbitrage_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'Une décision d’arbitrage ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_transition_decision_meme_conflit_insert
    BEFORE INSERT ON transition_applicabilite_decision
    WHEN NEW.id_decision_remplacante IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM decision_arbitrage_synchronisation AS decision
        JOIN decision_arbitrage_synchronisation AS remplacante
          ON remplacante.id_decision = NEW.id_decision_remplacante
        WHERE decision.id_decision = NEW.id_decision
          AND decision.id_conflit = remplacante.id_conflit
      )
    BEGIN
      SELECT RAISE(ABORT, 'Une décision ne peut être remplacée que par une décision du même conflit.');
    END;

    CREATE TRIGGER trg_transition_applicabilite_append_only_update
    BEFORE UPDATE ON transition_applicabilite_decision
    BEGIN
      SELECT RAISE(ABORT, 'Une transition d’applicabilité est append-only.');
    END;

    CREATE TRIGGER trg_transition_applicabilite_append_only_delete
    BEFORE DELETE ON transition_applicabilite_decision
    BEGIN
      SELECT RAISE(ABORT, 'Une transition d’applicabilité ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_application_decision_append_only_update
    BEFORE UPDATE ON application_decision_arbitrage
    BEGIN
      SELECT RAISE(ABORT, 'Une tentative d’application d’arbitrage est append-only.');
    END;

    CREATE TRIGGER trg_application_decision_append_only_delete
    BEFORE DELETE ON application_decision_arbitrage
    BEGIN
      SELECT RAISE(ABORT, 'Une tentative d’application d’arbitrage ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_sauvegarde_immutable_update
    BEFORE UPDATE ON sauvegarde_locale
    BEGIN
      SELECT RAISE(ABORT, 'Une référence de sauvegarde est immuable.');
    END;

    CREATE TRIGGER trg_sauvegarde_immutable_delete
    BEFORE DELETE ON sauvegarde_locale
    BEGIN
      SELECT RAISE(ABORT, 'Une sauvegarde historique ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_restauration_meme_establissement_insert
    BEFORE INSERT ON operation_restauration
    WHEN NOT EXISTS (
      SELECT 1
      FROM sauvegarde_locale AS sauvegarde
      JOIN appareil_synchronisation AS appareil_origine
        ON appareil_origine.id_appareil = sauvegarde.id_appareil_origine
      JOIN appareil_synchronisation AS appareil_cible
        ON appareil_cible.id_appareil = NEW.id_appareil_cible
      WHERE sauvegarde.id_sauvegarde = NEW.id_sauvegarde
        AND appareil_origine.id_etablissement = appareil_cible.id_etablissement
    )
    BEGIN
      SELECT RAISE(ABORT, 'La restauration doit rester dans l’établissement de la sauvegarde.');
    END;

    CREATE TRIGGER trg_restauration_meme_establissement_update
    BEFORE UPDATE OF id_sauvegarde, id_appareil_cible, id_installation_cible
      ON operation_restauration
    WHEN NOT EXISTS (
      SELECT 1
      FROM sauvegarde_locale AS sauvegarde
      JOIN appareil_synchronisation AS appareil_origine
        ON appareil_origine.id_appareil = sauvegarde.id_appareil_origine
      JOIN appareil_synchronisation AS appareil_cible
        ON appareil_cible.id_appareil = NEW.id_appareil_cible
      WHERE sauvegarde.id_sauvegarde = NEW.id_sauvegarde
        AND appareil_origine.id_etablissement = appareil_cible.id_etablissement
    )
    BEGIN
      SELECT RAISE(ABORT, 'La restauration doit rester dans l’établissement de la sauvegarde.');
    END;

    CREATE TRIGGER trg_recuperation_meme_etablissement_insert
    BEFORE INSERT ON association_recuperation_evenement
    WHEN NOT EXISTS (
      SELECT 1
      FROM operation_restauration AS restauration
      JOIN sauvegarde_locale AS sauvegarde
        ON sauvegarde.id_sauvegarde = restauration.id_sauvegarde
      JOIN appareil_synchronisation AS appareil_origine
        ON appareil_origine.id_appareil = sauvegarde.id_appareil_origine
      JOIN enveloppe_evenement_synchronisation AS evenement
        ON evenement.id_evenement = NEW.id_evenement_origine
      JOIN lot8_operation_etablissement AS operation
        ON operation.id_operation = evenement.id_operation
      WHERE restauration.id_restauration = NEW.id_restauration
        AND appareil_origine.id_etablissement = operation.id_etablissement
    )
    BEGIN
      SELECT RAISE(ABORT, 'La récupération doit rester dans l’établissement de l’événement.');
    END;

    CREATE TRIGGER trg_recuperation_append_only_update
    BEFORE UPDATE ON association_recuperation_evenement
    BEGIN
      SELECT RAISE(ABORT, 'Une autorisation de récupération est append-only.');
    END;

    CREATE TRIGGER trg_recuperation_append_only_delete
    BEFORE DELETE ON association_recuperation_evenement
    BEGIN
      SELECT RAISE(ABORT, 'Une autorisation de récupération ne peut pas être supprimée.');
    END;

    CREATE TRIGGER trg_tentative_recuperation_requise_insert
    BEFORE INSERT ON tentative_transmission_synchronisation
    WHEN (
      NEW.id_installation_emettrice_actuelle IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM enveloppe_evenement_synchronisation AS evenement
        JOIN operation_synchronisation AS operation
          ON operation.id_operation = evenement.id_operation
        WHERE evenement.id_evenement = NEW.id_evenement
          AND (
            (operation.origine_operation = 'INSTALLATION_LOCALE'
              AND NEW.id_installation_emettrice_actuelle IS NOT operation.id_installation_origine)
            OR operation.origine_operation = 'SERVEUR_CENTRAL'
          )
      )
      AND NEW.id_association_recuperation IS NULL
    ) OR (
      NEW.id_association_recuperation IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM association_recuperation_evenement AS recuperation
        JOIN operation_restauration AS restauration
          ON restauration.id_restauration = recuperation.id_restauration
        WHERE recuperation.id_association_recuperation = NEW.id_association_recuperation
          AND recuperation.id_evenement_origine = NEW.id_evenement
          AND restauration.id_installation_cible = NEW.id_installation_emettrice_actuelle
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une récupération inter-installation exige son autorisation pour cet événement et cette cible.');
    END;

    CREATE TRIGGER trg_tentative_synchronisation_append_only_update
    BEFORE UPDATE ON tentative_transmission_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'Une tentative de transmission de synchronisation est append-only.');
    END;

    CREATE TRIGGER trg_tentative_synchronisation_append_only_delete
    BEFORE DELETE ON tentative_transmission_synchronisation
    BEGIN
      SELECT RAISE(ABORT, 'Une tentative de transmission de synchronisation ne peut pas être supprimée.');
    END;
  `,
};

export default synchronisationOfflineFirst;