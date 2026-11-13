import type { Migration } from "./index";

/**
 * Migration 021 — Référentiels pédagogiques : matières et professeurs.
 *
 * Conformément au MLD (docs/19) :
 * - MATIERE est un référentiel de matières sans clé étrangère locale :
 *   elle vit au-dessus des établissements, ses liens (PROGRAMME_MATIERE,
 *   ENSEIGNEMENT) viendront avec le module Notes & Bulletins ;
 * - l'identité de l'enseignant est un point ouvert (docs/06 : « rattachement
 *   au référentiel propriétaire, sans créer de compte ni de référentiel
 *   local » — décision à confirmer avec la phase C). La table enseignant
 *   créée ici est donc un référentiel local PROVISOIRE et assumé : ses
 *   identifiants (id_enseignant) sont stables et pourront être rattachés
 *   aux comptes utilisateurs de la phase C sans réécriture.
 *
 * Règles d'or respectées :
 * - un professeur n'est jamais supprimé physiquement (déclencheur) : il
 *   est archivé (est_actif = 0), comme un élève est retiré par annulation
 *   d'inscription ;
 * - les identités (id_matiere, id_enseignant, établissement d'un
 *   professeur) sont immuables ;
 * - aucune colonne obligatoire superflue : spécialité, téléphone, e-mail
 *   et catégorie sont facultatifs.
 */
const referentielsPedagogiques: Migration = {
  version: 21,
  name: "referentiels_pedagogiques",
  sql: `
    CREATE TABLE matiere (
      id_matiere TEXT NOT NULL PRIMARY KEY,
      code TEXT CHECK (
        code IS NULL OR length(trim(code)) > 0
      ),
      libelle TEXT NOT NULL COLLATE NOCASE CHECK (
        length(trim(libelle)) > 0
      ),
      categorie TEXT CHECK (
        categorie IS NULL OR length(trim(categorie)) > 0
      ),
      est_actif INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1)),
      UNIQUE (libelle)
    );

    CREATE UNIQUE INDEX idx_matiere_code
      ON matiere (code)
      WHERE code IS NOT NULL;

    CREATE TRIGGER trg_matiere_identity_immutable
    BEFORE UPDATE OF id_matiere ON matiere
    WHEN NEW.id_matiere IS NOT OLD.id_matiere
    BEGIN
      SELECT RAISE(ABORT, 'L’identifiant d’une matière est stable.');
    END;

    CREATE TABLE enseignant (
      id_enseignant TEXT NOT NULL PRIMARY KEY,
      id_etablissement TEXT NOT NULL,
      nom TEXT NOT NULL CHECK (length(trim(nom)) > 0),
      prenoms TEXT CHECK (
        prenoms IS NULL OR length(trim(prenoms)) > 0
      ),
      telephone TEXT,
      email TEXT CHECK (
        email IS NULL OR length(trim(email)) > 0
      ),
      specialite TEXT CHECK (
        specialite IS NULL OR length(trim(specialite)) > 0
      ),
      est_actif INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1)),
      UNIQUE (id_enseignant, id_etablissement),
      FOREIGN KEY (id_etablissement)
        REFERENCES etablissement (id_etablissement)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
    );

    CREATE INDEX idx_enseignant_etablissement
      ON enseignant (id_etablissement, nom, prenoms);

    CREATE TRIGGER trg_enseignant_non_supprimable
    BEFORE DELETE ON enseignant
    BEGIN
      SELECT RAISE(ABORT, 'Un professeur ne peut pas être supprimé physiquement : archivez-le plutôt.');
    END;

    CREATE TRIGGER trg_enseignant_identity_immutable
    BEFORE UPDATE OF id_enseignant, id_etablissement ON enseignant
    WHEN NEW.id_enseignant IS NOT OLD.id_enseignant
      OR NEW.id_etablissement IS NOT OLD.id_etablissement
    BEGIN
      SELECT RAISE(ABORT, 'L’identité et l’établissement d’un professeur sont stables.');
    END;
  `,
};

export default referentielsPedagogiques;
