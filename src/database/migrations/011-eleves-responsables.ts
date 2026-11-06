import type { Migration } from "./index";

const elevesResponsables: Migration = {
  version: 11,
  name: "eleves_responsables",
  sql: `
    CREATE TABLE eleve (
      id_eleve TEXT NOT NULL PRIMARY KEY,
      id_etablissement TEXT NOT NULL,
      matricule TEXT CHECK (
        matricule IS NULL OR length(trim(matricule)) > 0
      ),
      UNIQUE (id_eleve, id_etablissement),
      FOREIGN KEY (id_etablissement)
        REFERENCES etablissement (id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE UNIQUE INDEX idx_eleve_matricule_etablissement
      ON eleve (id_etablissement, matricule)
      WHERE matricule IS NOT NULL;

    CREATE INDEX idx_eleve_etablissement
      ON eleve (id_etablissement);

    CREATE TRIGGER trg_eleve_non_supprimable
    BEFORE DELETE ON eleve
    BEGIN
      SELECT RAISE(ABORT, 'Un dossier élève ne peut pas être supprimé physiquement.');
    END;

    CREATE TRIGGER trg_eleve_initial_matricule_via_history
    BEFORE INSERT ON eleve
    WHEN NEW.matricule IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'Un matricule initial doit être attribué par son historique.');
    END;

    CREATE TRIGGER trg_eleve_identity_immutable
    BEFORE UPDATE OF id_eleve, id_etablissement ON eleve
    WHEN NEW.id_eleve IS NOT OLD.id_eleve
      OR NEW.id_etablissement IS NOT OLD.id_etablissement
    BEGIN
      SELECT RAISE(ABORT, 'L’identité et l’établissement d’un élève sont stables.');
    END;

    CREATE TABLE responsable (
      id_responsable TEXT NOT NULL PRIMARY KEY,
      id_etablissement TEXT NOT NULL,
      UNIQUE (id_responsable, id_etablissement),
      FOREIGN KEY (id_etablissement)
        REFERENCES etablissement (id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_responsable_etablissement
      ON responsable (id_etablissement);

    CREATE TRIGGER trg_responsable_identity_immutable
    BEFORE UPDATE OF id_responsable, id_etablissement ON responsable
    WHEN NEW.id_responsable IS NOT OLD.id_responsable
      OR NEW.id_etablissement IS NOT OLD.id_etablissement
    BEGIN
      SELECT RAISE(ABORT, 'L’identité et l’établissement d’un responsable sont stables.');
    END;

    CREATE TABLE nature_lien_responsable (
      id_nature_lien TEXT NOT NULL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      libelle TEXT NOT NULL,
      est_actif INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1))
    );

    INSERT INTO nature_lien_responsable (
      id_nature_lien, code, libelle
    ) VALUES
      ('01100000-0000-4000-8000-000000000001', 'PERE', 'Père'),
      ('01100000-0000-4000-8000-000000000002', 'MERE', 'Mère'),
      ('01100000-0000-4000-8000-000000000003', 'TUTEUR', 'Tuteur'),
      ('01100000-0000-4000-8000-000000000004', 'AUTRE_LIEN', 'Autre lien familial ou légal');

    CREATE TRIGGER trg_nature_lien_responsable_code_immutable
    BEFORE UPDATE OF code ON nature_lien_responsable
    WHEN NEW.code IS NOT OLD.code
    BEGIN
      SELECT RAISE(ABORT, 'Le code d’une nature de lien est stable.');
    END;

    CREATE TRIGGER trg_nature_lien_responsable_id_immutable
    BEFORE UPDATE OF id_nature_lien ON nature_lien_responsable
    WHEN NEW.id_nature_lien IS NOT OLD.id_nature_lien
    BEGIN
      SELECT RAISE(ABORT, 'L’identifiant d’une nature de lien est stable.');
    END;

    CREATE TRIGGER trg_nature_lien_responsable_libelle_utilise_immutable
    BEFORE UPDATE OF libelle ON nature_lien_responsable
    WHEN NEW.libelle IS NOT OLD.libelle
      AND EXISTS (
        SELECT 1 FROM relation_eleve_responsable
        WHERE id_nature_lien = OLD.id_nature_lien
      )
    BEGIN
      SELECT RAISE(ABORT, 'Le libellé d’une nature utilisée est conservé.');
    END;

    CREATE TRIGGER trg_nature_lien_responsable_utilisee_non_supprimable
    BEFORE DELETE ON nature_lien_responsable
    WHEN EXISTS (
      SELECT 1 FROM relation_eleve_responsable
      WHERE id_nature_lien = OLD.id_nature_lien
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une nature de lien utilisée est conservée.');
    END;

    CREATE TABLE relation_eleve_responsable (
      id_relation_eleve_responsable TEXT NOT NULL PRIMARY KEY,
      id_eleve TEXT NOT NULL,
      id_responsable TEXT NOT NULL,
      id_etablissement TEXT NOT NULL,
      id_nature_lien TEXT NOT NULL,
      est_representant_legal INTEGER NOT NULL CHECK (
        est_representant_legal IN (0, 1)
      ),
      est_responsable_financier INTEGER NOT NULL CHECK (
        est_responsable_financier IN (0, 1)
      ),
      date_debut_validite TEXT NOT NULL CHECK (
        date(date_debut_validite, '+0 days') IS NOT NULL
        AND date(date_debut_validite, '+0 days') = date_debut_validite
      ),
      date_fin_validite TEXT CHECK (
        date_fin_validite IS NULL OR (
          date(date_fin_validite, '+0 days') IS NOT NULL
          AND date(date_fin_validite, '+0 days') = date_fin_validite
          AND date_fin_validite > date_debut_validite
        )
      ),
      id_auteur_creation TEXT,
      id_auteur_cloture TEXT CHECK (
        id_auteur_cloture IS NULL
        OR length(trim(id_auteur_cloture)) > 0
      ),
      CHECK (
        id_auteur_cloture IS NULL OR (
          date_fin_validite IS NOT NULL
          AND length(trim(id_auteur_cloture)) > 0
        )
      ),
      FOREIGN KEY (id_eleve, id_etablissement)
        REFERENCES eleve (id_eleve, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_responsable, id_etablissement)
        REFERENCES responsable (id_responsable, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (id_nature_lien)
        REFERENCES nature_lien_responsable (id_nature_lien)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_relation_eleve_responsable_responsable
      ON relation_eleve_responsable (
        id_responsable, id_etablissement, date_fin_validite
      );

    CREATE INDEX idx_relation_eleve_responsable_eleve
      ON relation_eleve_responsable (id_eleve, id_etablissement);

    CREATE INDEX idx_relation_eleve_responsable_nature
      ON relation_eleve_responsable (id_nature_lien);

    CREATE UNIQUE INDEX idx_relation_eleve_responsable_active_pair
      ON relation_eleve_responsable (
        id_eleve, id_responsable, id_etablissement
      )
      WHERE date_fin_validite IS NULL;

    CREATE TRIGGER trg_relation_eleve_responsable_nature_active_insert
    BEFORE INSERT ON relation_eleve_responsable
    WHEN NOT EXISTS (
      SELECT 1 FROM nature_lien_responsable
      WHERE id_nature_lien = NEW.id_nature_lien
        AND est_actif = 1
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une nouvelle relation exige une nature de lien active.');
    END;

    CREATE TRIGGER trg_relation_eleve_responsable_no_overlap_insert
    BEFORE INSERT ON relation_eleve_responsable
    WHEN EXISTS (
      SELECT 1
      FROM relation_eleve_responsable AS precedente
      WHERE precedente.id_eleve = NEW.id_eleve
        AND precedente.id_responsable = NEW.id_responsable
        AND precedente.id_etablissement = NEW.id_etablissement
        AND (precedente.date_fin_validite IS NULL
          OR NEW.date_debut_validite < precedente.date_fin_validite)
        AND (NEW.date_fin_validite IS NULL
          OR precedente.date_debut_validite < NEW.date_fin_validite)
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les périodes d’un même couple élève-responsable ne peuvent pas se chevaucher.');
    END;

    CREATE TRIGGER trg_relation_eleve_responsable_close_once
    BEFORE UPDATE ON relation_eleve_responsable
    WHEN OLD.date_fin_validite IS NOT NULL
      OR NEW.date_fin_validite IS NULL
      OR NEW.id_relation_eleve_responsable IS NOT OLD.id_relation_eleve_responsable
      OR NEW.id_eleve IS NOT OLD.id_eleve
      OR NEW.id_responsable IS NOT OLD.id_responsable
      OR NEW.id_etablissement IS NOT OLD.id_etablissement
      OR NEW.id_nature_lien IS NOT OLD.id_nature_lien
      OR NEW.est_representant_legal IS NOT OLD.est_representant_legal
      OR NEW.est_responsable_financier IS NOT OLD.est_responsable_financier
      OR NEW.date_debut_validite IS NOT OLD.date_debut_validite
      OR NEW.id_auteur_creation IS NOT OLD.id_auteur_creation
    BEGIN
      SELECT RAISE(ABORT, 'Une relation active ne peut être clôturée qu’une fois, sans réécriture de son historique.');
    END;

    CREATE TRIGGER trg_relation_eleve_responsable_append_only_delete
    BEFORE DELETE ON relation_eleve_responsable
    BEGIN
      SELECT RAISE(ABORT, 'L’historique des relations élève-responsable est conservé.');
    END;

    CREATE TABLE historique_matricule (
      id_historique_matricule TEXT NOT NULL PRIMARY KEY,
      id_eleve TEXT NOT NULL,
      id_etablissement TEXT NOT NULL,
      id_historique_precedent TEXT,
      matricule TEXT NOT NULL CHECK (length(trim(matricule)) > 0),
      date_debut_validite TEXT NOT NULL CHECK (
        date(date_debut_validite, '+0 days') IS NOT NULL
        AND date(date_debut_validite, '+0 days') = date_debut_validite
      ),
      date_fin_validite TEXT CHECK (
        date_fin_validite IS NULL OR (
          date(date_fin_validite, '+0 days') IS NOT NULL
          AND date(date_fin_validite, '+0 days') = date_fin_validite
          AND date_fin_validite > date_debut_validite
        )
      ),
      motif_correction TEXT CHECK (
        motif_correction IS NULL OR length(trim(motif_correction)) > 0
      ),
      id_auteur_correction TEXT,
      UNIQUE (id_etablissement, matricule),
      UNIQUE (id_historique_matricule, id_eleve, id_etablissement),
      UNIQUE (id_historique_precedent),
      FOREIGN KEY (id_eleve, id_etablissement)
        REFERENCES eleve (id_eleve, id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
      FOREIGN KEY (
        id_historique_precedent, id_eleve, id_etablissement
      ) REFERENCES historique_matricule (
        id_historique_matricule, id_eleve, id_etablissement
      ) ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE INDEX idx_historique_matricule_eleve
      ON historique_matricule (id_eleve, id_etablissement, date_debut_validite);

    CREATE TRIGGER trg_historique_matricule_initialisation
    BEFORE INSERT ON historique_matricule
    WHEN NEW.date_fin_validite IS NOT NULL
      OR (
        NEW.id_historique_precedent IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM historique_matricule
            WHERE id_eleve = NEW.id_eleve
              AND id_etablissement = NEW.id_etablissement
          )
          OR EXISTS (
            SELECT 1 FROM eleve
            WHERE id_eleve = NEW.id_eleve
              AND id_etablissement = NEW.id_etablissement
              AND matricule IS NOT NULL
          )
        )
      )
      OR (
        NEW.id_historique_precedent IS NOT NULL
        AND (
          NEW.motif_correction IS NULL
          OR length(trim(NEW.motif_correction)) = 0
          OR NOT EXISTS (
            SELECT 1
            FROM historique_matricule AS precedent
            JOIN eleve
              ON eleve.id_eleve = precedent.id_eleve
             AND eleve.id_etablissement = precedent.id_etablissement
            WHERE precedent.id_historique_matricule = NEW.id_historique_precedent
              AND precedent.id_eleve = NEW.id_eleve
              AND precedent.id_etablissement = NEW.id_etablissement
              AND precedent.date_fin_validite IS NULL
              AND NEW.date_debut_validite > precedent.date_debut_validite
              AND eleve.matricule = precedent.matricule
          )
          OR EXISTS (
            SELECT 1 FROM historique_matricule AS active
            WHERE active.id_eleve = NEW.id_eleve
              AND active.id_etablissement = NEW.id_etablissement
              AND active.date_fin_validite IS NULL
              AND active.id_historique_matricule <> NEW.id_historique_precedent
          )
        )
      )
    BEGIN
      SELECT RAISE(ABORT, 'Une nouvelle attribution doit être courante, cohérente et justifiée si elle corrige un matricule antérieur.');
    END;

    CREATE TRIGGER trg_historique_matricule_no_overlap_insert
    BEFORE INSERT ON historique_matricule
    WHEN EXISTS (
      SELECT 1
      FROM historique_matricule AS precedente
      WHERE precedente.id_eleve = NEW.id_eleve
        AND precedente.id_etablissement = NEW.id_etablissement
        AND precedente.id_historique_matricule
          IS NOT NEW.id_historique_precedent
        AND (precedente.date_fin_validite IS NULL
          OR NEW.date_debut_validite < precedente.date_fin_validite)
        AND (NEW.date_fin_validite IS NULL
          OR precedente.date_debut_validite < NEW.date_fin_validite)
    )
    BEGIN
      SELECT RAISE(ABORT, 'Les périodes de matricule d’un même élève ne peuvent pas se chevaucher.');
    END;

    CREATE TRIGGER trg_eleve_matricule_change_through_history
    BEFORE UPDATE OF matricule ON eleve
    WHEN NEW.matricule IS NOT OLD.matricule
      AND (
        (NEW.matricule IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM historique_matricule
          WHERE id_eleve = OLD.id_eleve
            AND id_etablissement = OLD.id_etablissement
            AND matricule = NEW.matricule
            AND date_fin_validite IS NULL
        ))
        OR (NEW.matricule IS NULL AND EXISTS (
          SELECT 1 FROM historique_matricule
          WHERE id_eleve = OLD.id_eleve
            AND id_etablissement = OLD.id_etablissement
            AND date_fin_validite IS NULL
        ))
      )
    BEGIN
      SELECT RAISE(ABORT, 'Le matricule courant ne peut être modifié que par son historique.');
    END;

    CREATE TRIGGER trg_historique_matricule_sync_eleve_insert
    AFTER INSERT ON historique_matricule
    BEGIN
      UPDATE historique_matricule
      SET date_fin_validite = NEW.date_debut_validite
      WHERE id_historique_matricule = NEW.id_historique_precedent;

      UPDATE eleve
      SET matricule = NEW.matricule
      WHERE id_eleve = NEW.id_eleve
        AND id_etablissement = NEW.id_etablissement;
    END;

    CREATE TRIGGER trg_historique_matricule_close_once
    BEFORE UPDATE ON historique_matricule
    WHEN OLD.date_fin_validite IS NOT NULL
      OR NEW.date_fin_validite IS NULL
      OR NEW.id_historique_matricule IS NOT OLD.id_historique_matricule
      OR NEW.id_eleve IS NOT OLD.id_eleve
      OR NEW.id_etablissement IS NOT OLD.id_etablissement
      OR NEW.id_historique_precedent IS NOT OLD.id_historique_precedent
      OR NEW.matricule IS NOT OLD.matricule
      OR NEW.date_debut_validite IS NOT OLD.date_debut_validite
      OR NEW.motif_correction IS NOT OLD.motif_correction
      OR NEW.id_auteur_correction IS NOT OLD.id_auteur_correction
      OR NOT EXISTS (
        SELECT 1 FROM historique_matricule AS successeur
        WHERE successeur.id_historique_precedent = OLD.id_historique_matricule
          AND successeur.id_eleve = OLD.id_eleve
          AND successeur.id_etablissement = OLD.id_etablissement
          AND successeur.date_debut_validite = NEW.date_fin_validite
      )
    BEGIN
      SELECT RAISE(ABORT, 'Une attribution de matricule ne peut être clôturée qu’une fois et son historique est immuable.');
    END;

    CREATE TRIGGER trg_historique_matricule_append_only_delete
    BEFORE DELETE ON historique_matricule
    BEGIN
      SELECT RAISE(ABORT, 'L’historique des matricules ne peut pas être supprimé.');
    END;
  `,
};

export default elevesResponsables;
