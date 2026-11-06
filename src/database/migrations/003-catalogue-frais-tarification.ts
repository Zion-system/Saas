import type { Migration } from "./index";

const catalogueFraisTarification: Migration = {
  version: 3,
  name: "catalogue_frais_tarification",
  sql: `
    CREATE TABLE type_frais (
      id_type_frais TEXT NOT NULL PRIMARY KEY,
      code_type_frais TEXT NOT NULL UNIQUE,
      libelle TEXT NOT NULL,
      description TEXT,
      est_actif INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1))
    );

    CREATE TRIGGER trg_type_frais_code_immutable
    BEFORE UPDATE OF code_type_frais ON type_frais
    WHEN NEW.code_type_frais IS NOT OLD.code_type_frais
    BEGIN
      SELECT RAISE(ABORT, 'Le code du type de frais est stable.');
    END;

    CREATE TRIGGER trg_type_frais_inactif_non_supprimable
    BEFORE DELETE ON type_frais
    WHEN OLD.est_actif = 0
    BEGIN
      SELECT RAISE(ABORT, 'Un type de frais désactivé est conservé.');
    END;

    CREATE TABLE periodicite (
      id_periodicite TEXT NOT NULL PRIMARY KEY,
      code_periodicite TEXT NOT NULL UNIQUE,
      libelle TEXT NOT NULL
    );

    CREATE TRIGGER trg_periodicite_code_immutable
    BEFORE UPDATE OF code_periodicite ON periodicite
    WHEN NEW.code_periodicite IS NOT OLD.code_periodicite
    BEGIN
      SELECT RAISE(ABORT, 'Le code de périodicité est stable.');
    END;

    CREATE TABLE tarif (
      id_tarif TEXT NOT NULL PRIMARY KEY,
      id_type_frais TEXT NOT NULL,
      id_periodicite TEXT NOT NULL,
      id_annee_scolaire TEXT NOT NULL,
      type_portee TEXT NOT NULL CHECK (
        type_portee IN (
          'ETABLISSEMENT', 'NIVEAU', 'FILIERE', 'NIVEAU_FILIERE', 'CLASSE'
        )
      ),
      id_niveau TEXT,
      id_filiere TEXT,
      id_classe_annuelle TEXT,
      montant_brut_fcfa INTEGER NOT NULL CHECK (montant_brut_fcfa >= 0),
      date_debut_effet TEXT NOT NULL CHECK (
        date(date_debut_effet, '+0 days') IS NOT NULL
        AND date(date_debut_effet, '+0 days') = date_debut_effet
      ),
      date_fin_effet TEXT CHECK (
        date_fin_effet IS NULL OR (
          date(date_fin_effet, '+0 days') IS NOT NULL
          AND date(date_fin_effet, '+0 days') = date_fin_effet
        )
      ),
      CHECK (
        date_fin_effet IS NULL OR date_fin_effet > date_debut_effet
      ),
      CHECK (
        (type_portee = 'ETABLISSEMENT'
          AND id_niveau IS NULL AND id_filiere IS NULL AND id_classe_annuelle IS NULL)
        OR (type_portee = 'NIVEAU'
          AND id_niveau IS NOT NULL AND id_filiere IS NULL AND id_classe_annuelle IS NULL)
        OR (type_portee = 'FILIERE'
          AND id_niveau IS NULL AND id_filiere IS NOT NULL AND id_classe_annuelle IS NULL)
        OR (type_portee = 'NIVEAU_FILIERE'
          AND id_niveau IS NOT NULL AND id_filiere IS NOT NULL AND id_classe_annuelle IS NULL)
        OR (type_portee = 'CLASSE'
          AND id_niveau IS NULL AND id_filiere IS NULL AND id_classe_annuelle IS NOT NULL)
      ),
      FOREIGN KEY (id_type_frais)
        REFERENCES type_frais (id_type_frais) ON UPDATE RESTRICT ON DELETE RESTRICT,
      FOREIGN KEY (id_periodicite)
        REFERENCES periodicite (id_periodicite) ON UPDATE RESTRICT ON DELETE RESTRICT,
      FOREIGN KEY (id_annee_scolaire)
        REFERENCES annee_scolaire (id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT,
      FOREIGN KEY (id_niveau)
        REFERENCES niveau_enseignement (id_niveau) ON UPDATE RESTRICT ON DELETE RESTRICT,
      FOREIGN KEY (id_classe_annuelle)
        REFERENCES classe_annuelle (id_classe_annuelle) ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE INDEX idx_tarif_type_annee_portee
      ON tarif (id_type_frais, id_annee_scolaire, type_portee);
    CREATE INDEX idx_tarif_periodicite ON tarif (id_periodicite);
    CREATE INDEX idx_tarif_niveau ON tarif (id_niveau);
    CREATE INDEX idx_tarif_classe ON tarif (id_classe_annuelle);

    CREATE TRIGGER trg_tarif_type_frais_actif_insert
    BEFORE INSERT ON tarif
    WHEN NOT EXISTS (
      SELECT 1 FROM type_frais
      WHERE id_type_frais = NEW.id_type_frais AND est_actif = 1
    )
    BEGIN
      SELECT RAISE(ABORT, 'Un type de frais inactif ne peut pas recevoir de nouveau tarif.');
    END;

    CREATE TRIGGER trg_tarif_type_frais_actif_update
    BEFORE UPDATE OF id_type_frais ON tarif
    WHEN NOT EXISTS (
      SELECT 1 FROM type_frais
      WHERE id_type_frais = NEW.id_type_frais AND est_actif = 1
    )
    BEGIN
      SELECT RAISE(ABORT, 'Un type de frais inactif ne peut pas recevoir de nouveau tarif.');
    END;

    CREATE TRIGGER trg_tarif_classe_annee_insert
    BEFORE INSERT ON tarif
    WHEN NEW.type_portee = 'CLASSE'
      AND (SELECT id_annee_scolaire FROM classe_annuelle
        WHERE id_classe_annuelle = NEW.id_classe_annuelle)
        IS NOT NEW.id_annee_scolaire
    BEGIN
      SELECT RAISE(ABORT, 'La classe tarifée doit appartenir à la même année scolaire.');
    END;

    CREATE TRIGGER trg_tarif_classe_annee_update
    BEFORE UPDATE OF id_annee_scolaire, id_classe_annuelle, type_portee ON tarif
    WHEN NEW.type_portee = 'CLASSE'
      AND (SELECT id_annee_scolaire FROM classe_annuelle
        WHERE id_classe_annuelle = NEW.id_classe_annuelle)
        IS NOT NEW.id_annee_scolaire
    BEGIN
      SELECT RAISE(ABORT, 'La classe tarifée doit appartenir à la même année scolaire.');
    END;

    CREATE TRIGGER trg_classe_annee_tarif_coherente
    BEFORE UPDATE OF id_annee_scolaire ON classe_annuelle
    WHEN EXISTS (
      SELECT 1 FROM tarif
      WHERE type_portee = 'CLASSE'
        AND id_classe_annuelle = OLD.id_classe_annuelle
        AND id_annee_scolaire IS NOT NEW.id_annee_scolaire
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une classe tarifée doit rester dans la même année scolaire.');
    END;

    CREATE TABLE politique_remise (
      id_politique_remise TEXT NOT NULL PRIMARY KEY,
      code_politique TEXT NOT NULL UNIQUE,
      libelle TEXT NOT NULL,
      nature_remise TEXT NOT NULL CHECK (
        nature_remise IN ('BOURSE', 'FRATRIE', 'SOCIALE', 'EXCEPTIONNELLE', 'EXONERATION')
      ),
      forme_remise TEXT NOT NULL CHECK (
        forme_remise IN ('MONTANT_FIXE', 'POURCENTAGE')
      ),
      valeur_remise TEXT NOT NULL CHECK (
        valeur_remise <> ''
        AND valeur_remise NOT GLOB '*[^0-9.]*'
        AND valeur_remise GLOB '[0-9]*'
        AND length(valeur_remise) - length(replace(valeur_remise, '.', '')) <= 1
        AND (instr(valeur_remise, '.') = 0 OR instr(valeur_remise, '.') < length(valeur_remise))
      ),
      id_type_frais TEXT,
      description TEXT,
      est_active INTEGER NOT NULL DEFAULT 1 CHECK (est_active IN (0, 1)),
      date_debut_validite TEXT CHECK (
        date_debut_validite IS NULL OR (
          date(date_debut_validite, '+0 days') IS NOT NULL
          AND date(date_debut_validite, '+0 days') = date_debut_validite
        )
      ),
      date_fin_validite TEXT CHECK (
        date_fin_validite IS NULL OR (
          date(date_fin_validite, '+0 days') IS NOT NULL
          AND date(date_fin_validite, '+0 days') = date_fin_validite
        )
      ),
      CHECK (
        date_debut_validite IS NULL OR date_fin_validite IS NULL
        OR date_fin_validite > date_debut_validite
      ),
      CHECK (
        (forme_remise = 'MONTANT_FIXE'
          AND instr(valeur_remise, '.') = 0
          AND CAST(valeur_remise AS INTEGER) >= 0)
        OR (forme_remise = 'POURCENTAGE'
          AND CAST(valeur_remise AS REAL) BETWEEN 0 AND 100)
      ),
      CHECK (
        nature_remise <> 'EXONERATION'
        OR (forme_remise = 'POURCENTAGE' AND CAST(valeur_remise AS REAL) = 100)
      ),
      FOREIGN KEY (id_type_frais)
        REFERENCES type_frais (id_type_frais) ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE TRIGGER trg_politique_remise_code_immutable
    BEFORE UPDATE OF code_politique ON politique_remise
    WHEN NEW.code_politique IS NOT OLD.code_politique
    BEGIN
      SELECT RAISE(ABORT, 'Le code de politique de remise est stable.');
    END;

    CREATE INDEX idx_politique_remise_type_frais
      ON politique_remise (id_type_frais);

    CREATE TABLE attribution_remise (
      id_attribution_remise TEXT NOT NULL PRIMARY KEY,
      id_politique_remise TEXT NOT NULL,
      id_eleve TEXT NOT NULL,
      id_annee_scolaire TEXT NOT NULL,
      motif_specifique TEXT NOT NULL,
      rang_fratrie INTEGER CHECK (rang_fratrie IS NULL OR rang_fratrie > 0),
      date_debut_effet TEXT CHECK (
        date_debut_effet IS NULL OR (
          date(date_debut_effet, '+0 days') IS NOT NULL
          AND date(date_debut_effet, '+0 days') = date_debut_effet
        )
      ),
      date_fin_effet TEXT CHECK (
        date_fin_effet IS NULL OR (
          date(date_fin_effet, '+0 days') IS NOT NULL
          AND date(date_fin_effet, '+0 days') = date_fin_effet
        )
      ),
      attribue_par TEXT NOT NULL,
      autorise_par TEXT,
      date_attribution TEXT NOT NULL,
      date_annulation TEXT,
      motif_annulation TEXT,
      CHECK (
        date_debut_effet IS NULL OR date_fin_effet IS NULL
        OR date_fin_effet > date_debut_effet
      ),
      CHECK (
        (date_annulation IS NULL AND motif_annulation IS NULL)
        OR (date_annulation IS NOT NULL AND motif_annulation IS NOT NULL
          AND length(trim(motif_annulation)) > 0)
      ),
      FOREIGN KEY (id_politique_remise)
        REFERENCES politique_remise (id_politique_remise) ON UPDATE RESTRICT ON DELETE RESTRICT,
      FOREIGN KEY (id_annee_scolaire)
        REFERENCES annee_scolaire (id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE INDEX idx_attribution_remise_politique
      ON attribution_remise (id_politique_remise);
    CREATE INDEX idx_attribution_remise_eleve_annee
      ON attribution_remise (id_eleve, id_annee_scolaire);

    CREATE TRIGGER trg_attribution_remise_validite_insert
    BEFORE INSERT ON attribution_remise
    WHEN EXISTS (
      SELECT 1 FROM politique_remise AS politique
      WHERE politique.id_politique_remise = NEW.id_politique_remise
        AND (
          (politique.date_debut_validite IS NOT NULL
            AND (NEW.date_debut_effet IS NULL
              OR NEW.date_debut_effet < politique.date_debut_validite))
          OR (politique.date_fin_validite IS NOT NULL
            AND (NEW.date_fin_effet IS NULL
              OR NEW.date_fin_effet > politique.date_fin_validite))
        )
    )
    BEGIN
      SELECT RAISE(ABORT, 'La période attribuée doit respecter la validité de la politique.');
    END;

    CREATE TRIGGER trg_attribution_remise_validite_update
    BEFORE UPDATE OF id_politique_remise, date_debut_effet, date_fin_effet
      ON attribution_remise
    WHEN EXISTS (
      SELECT 1 FROM politique_remise AS politique
      WHERE politique.id_politique_remise = NEW.id_politique_remise
        AND (
          (politique.date_debut_validite IS NOT NULL
            AND (NEW.date_debut_effet IS NULL
              OR NEW.date_debut_effet < politique.date_debut_validite))
          OR (politique.date_fin_validite IS NOT NULL
            AND (NEW.date_fin_effet IS NULL
              OR NEW.date_fin_effet > politique.date_fin_validite))
        )
    )
    BEGIN
      SELECT RAISE(ABORT, 'La période attribuée doit respecter la validité de la politique.');
    END;
  `,
};

export default catalogueFraisTarification;
