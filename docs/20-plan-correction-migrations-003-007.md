# 20 — Plan de correction des migrations 003 à 007 (alignement du DDL réel sur `docs/19` v1.0)

**Date :** 07/11/2026
**Base de travail :** commit de gel `docs/19` v1.0 — `2740c9df191f4fa1123c915c458e45ab95913b58` (`2740c9d`)
**Référence exclusive du DDL cible :** `docs/19-mpd-financier-sqlite.md` **v1.0 (gel)** — sections §3 (tables), §4 (matérialisation des contraintes), §5 (17 triggers), §6 (14 index nommés), §8 (matrice d'écart consolidée), §9 (règles arrêtées), §10 (inventaire final).
**Nature :** Plan de correction — **aucune application du DDL, aucune exécution SQL, aucune modification des migrations, du code ou des tests** dans le cadre de la présente mission.
**Régime d'exécution :** Option A — présent fichier en commit dédié unique.
**Statut :** Prêt pour examen du propriétaire.

---

## 0. Cadre, méthode et conventions du plan

### 0.1 Périmètre

- **Dans le périmètre :** migrations `003-catalogue-frais-tarification.ts`, `004-facturation-creances.ts`, `005-echeanciers-reglements.ts`, `006-encaissements-credits-mobile-money.ts`, `007-gestion-caisse.ts`.
- **Hors périmètre :** migrations 008 (Lot 6 — frontière confirmée : zéro DDL Lots 1-5, interface par pointeur polymorphe `id_operation_source`) et 009 (Lot 7, hors inventaire MPD). Aucune proposition de delta n'est formulée à leur sujet ; toute anomalie constatée y serait un point de gouvernance sans proposition.
- **Statut des deltas :** « ferme » pour tous les deltas du §3 du mandat (décisions D-0 à D-11 ratifiées au gel v1.0). Tout écart `docs/19` v1.0 ↔ DDL réel **non couvert** par un delta ferme est consigné en **point de gouvernance** (§9), sans tranché.

### 0.2 Constat de ré-extraction

Le DDL réel ci-dessous a été **ré-extrait in extenso au commit de base `2740c9d`** par lecture directe des fichiers sources (gabarits `sql:` des objets `Migration`). Aucune extraction antérieure n'a été réutilisée.

### 0.3 Constat préalable — bases déployées (§4.1 du mandat, étape 1)

**Méthode :** inspection du code au commit de base (aucune exécution SQL, aucune base interrogée — interdit du mandat).

**Constats :**

1. **Persistance OPFS réelle :** le moteur `src/database/local/sqlite.client.ts` / `sqlite.executor.ts` / `sqlite.worker.ts` s'appuie sur `@sqlite.org/sqlite-wasm` avec persistance OPFS (`sqlite3.oo1.DB` sur fichier OPFS). Toute base créée par l'application **sur un poste utilisateur** survit aux redéploiements du code : les migrations déjà exécutées ne sont **pas** rejouées (`schema_migrations` versionné, registre `src/database/migrations/index.ts`).
2. **Table de version :** `schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL)` — créée par le runner avant la migration 001 ; chaque migration insère sa ligne dans la même transaction que son DDL (`BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` — voir `appliquerMigration` dans les `.test.ts`, qui reflète le runner).
3. **Runners :** exécution séquentielle du registre `migrations[]` par ordre de `version` ; pas de mécanisme de migration corrective rétroactive autre qu'une nouvelle entrée de registre.
4. **Environnements de démonstration :** le projet est en phase de conception (docs 00-20) ; les tests unitaires reconstruisent une base `:memory:` complète à chaque run. **Aucune base de démonstration ni fixture persistante n'est présente dans le dépôt** (constat statique ; l'existence de bases OPFS sur des postes réels ne peut être exclue ni confirmée sans exécution — voir gouvernance G-01).

**Conséquence :** l'hypothèse « aucune base déployée » **ne peut pas être établie** par inspection statique. La stratégie (α) édition in situ n'est recevable que sur confirmation explicite du propriétaire qu'aucune base OPFS déployée ne subsiste.

### 0.4 Conséquences des deux stratégies de correction (§4.1 du mandat, étape 2)

#### Stratégie (α) — Édition in situ des fichiers de migrations 003-007

- **Mécanisme :** réécriture des gabarits `sql:` aux versions corrigées ; le registre `migrations[]` est inchangé (versions 3-7 identiques).
- **Recevabilité :** uniquement si **aucune base déployée** ne subsiste (OPFS utilisateur, démonstration, poste de test persisté). À l'appui : réexécution complète de la chaîne 001→013 en test (`vitest run` + tests d'intégration `schema-integration.test.ts`).
- **Conséquences :**
  - Base reconstruite à blanc : les colonnes `NOT NULL` ajoutées sans défaut et les contraintes `CHECK` sont posées directement à la création — **aucun backfill requis**, aucune limite `ALTER TABLE`.
  - Les triggers et index cibles sont créés dans le bon ordre d'application (ex. `ref_coupure_xaf` avant la FK depuis `detail_comptage_caisse`).
  - **Risque majeur si hypothèse fausse :** une base OPFS existante conserve l'ancien schéma (version 7 déjà enregistrée) → divergence silencieuse entre code et base réelle, violations d'intégrité non détectées.
  - Les `.test.ts` existants verrouillant l'ancien schéma doivent être révisés (cf. §7.3).

#### Stratégie (β) — Migration corrective nouvelle (ALTER / rebuild)

- **Mécanisme :** nouvelle migration `014-plan-correction-migrations-003-007.ts` (ou découpage équivalent) ajoutée en fin de registre ; les migrations 003-007 restent inchangées pour les bases déjà à jour.
- **Limites documentées d'`ALTER TABLE ADD COLUMN` sous sqlite-wasm (SQLite ≥ 3.37) :**
  - Une colonne ajoutée doit avoir une **valeur par défaut constante** (ou être nullable) ; pas de `PRIMARY KEY`, pas de `UNIQUE`, pas de `REFERENCES` sur colonne ajoutée par `ALTER`.
  - Les contraintes `CHECK` et `FOREIGN KEY` **ne peuvent pas être ajoutées** à une table existante par `ALTER TABLE` — elles ne s'appliquent qu'à la création ou via **reconstruction de table** (`CREATE TABLE …_new` + `INSERT … SELECT` + `DROP` + `RENAME`, sous `PRAGMA foreign_keys = OFF` + `legacy_alter_table` maîtrisé, ou `PRAGMA defer_foreign_keys`).
  - `CREATE INDEX` (y compris partiels uniques) et `CREATE TRIGGER` sont toujours possibles a posteriori.
  - `GENERATED ALWAYS AS … STORED` ne peut pas être ajouté par `ALTER` → reconstruction de `detail_comptage_caisse`.
- **Conséquences :**
  - Compatible avec les bases déjà déployées **à condition** que les rebuilds préservent les données existantes (colonnes ajoutées `NOT NULL` ⇒ défaut constant ou backfill documenté — cf. §7.4).
  - Complexité accrue : chaque table concernée nécessite soit un simple `ALTER` (colonnes à défaut), soit un rebuild complet (contraintes, FK, colonnes générées).
  - Les triggers existants de 003-007 (ex. `trg_session_caisse_cloturee_immutable` existence-based) doivent être **supprimés et recréés** (`DROP TRIGGER` + `CREATE TRIGGER`) pour le retiming — opération supportée.
  - Ordre d'application contraignant identique (§6.4 et §8.2).

#### Recommandation (motivée, après les deux étapes ci-dessus)

**Recommandation : stratégie (β) — migration corrective nouvelle avec rebuilds ciblés.**

- **Motif :** l'application est offline-first avec persistance OPFS ; le code des migrations 003-007 est déjà dans le dépôt et la chaîne 001-013 est exécutable. L'existence de bases OPFS sur des postes (développement, démonstration, pilotes) est **probable** et ne peut être exclue statiquement (G-01). La stratégie (β) est la seule recevable sans confirmation propriétaire absolue ; elle préserve l'historique `schema_migrations` et les données.
- **Réserve :** si le propriétaire confirme **par écrit** qu'aucune base déployée ne subsiste (ni OPFS utilisateur, ni démonstration, ni poste de test persisté), la stratégie (α) devient recevable et **préférable** (DDL cible posé directement, sans rebuild, sans backfill, tests de chaîne complète à l'appui).
- **Le choix final appartient au propriétaire** (arbitrage réel documenté, non tranché par le présent plan).

---

## 1. Migration 003 — `catalogue_frais_tarification`

### 1.1 DDL réel extrait in extenso (commit `2740c9d`)

```sql
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
```

**Index automatiques (exclus du décompte §6 de docs/19) :** `sqlite_autoindex_type_frais_1` (UNIQUE `code_type_frais`), `sqlite_autoindex_periodicite_1` (UNIQUE `code_periodicite`), `sqlite_autoindex_politique_remise_1` (UNIQUE `code_politique`).

### 1.2 DDL cible — références `docs/19` v1.0

- `type_frais` : §3.1 (table 1.1) — dont `id_periodicite_defaut TEXT NULL REFERENCES periodicite(id_periodicite)` et `CHECK (length(trim(...)) > 0)` sur `code_type_frais`/`libelle`.
- `periodicite` : §3.2 (table 1.2) — dont `nombre_echeances_defaut INTEGER NOT NULL CHECK (> 0)`.
- `tarif` : §3.3 (table 1.3) — `montant_tarif_fcfa`, `est_applicable`, `id_filiere` FK, trigger d'interdiction de chevauchement (LOT1-01 à LOT1-04).
- `politique_remise` : §3.4 (table 1.4) — `taux_pourcentage` / `montant_fixe_fcfa` XOR, `est_cumulable`, `est_active`.
- `attribution_remise` : §3.5 (table 1.5) — `etat_attribution CHECK IN ('ACTIVE','SUSPENDUE','REVOQUEE')`, `date_debut_validite`/`date_fin_validite`, trigger d'exclusion temporelle (Q-02), FK `id_eleve → eleve`.
- Règle B.1 / D-7 (§9) : énumérations de statut en `TEXT CHECK (colonne IN (...))` natives.

### 1.3 Matrice des deltas — migration 003

| # | Objet | Type | Décision porteuse | Statut |
|---|---|---|---|---|
| 3.1 | `type_frais.id_periodicite_defaut` | ADD COLUMN + FK | — (docs/19 §3.1) | **Gouvernance** (non couvert par un delta ferme) |
| 3.2 | `type_frais` CHECK `length(trim())>0` | contrainte de table | — | Gouvernance |
| 3.3 | `periodicite.nombre_echeances_defaut` | ADD COLUMN | — (docs/19 §3.2) | Gouvernance |
| 3.4 | `tarif` : renommage `montant_brut_fcfa`→`montant_tarif_fcfa`, `est_applicable`, FK `id_filiere`, suppression/ refonte du modèle `type_portee` | reconstruction | — (docs/19 §3.3 vs DDL réel divergent) | Gouvernance — divergence structurelle majeure |
| 3.5 | `tarif` trigger non-chevauchement LOT1-01..04 | CREATE TRIGGER | docs/19 §3.3 / §8 | Gouvernance (absent du §3 du mandat) |
| 3.6 | `politique_remise` : modèle `taux_pourcentage`/`montant_fixe_fcfa` vs `valeur_remise TEXT` réel ; `est_cumulable` | reconstruction | — (docs/19 §3.4) | Gouvernance — divergence structurelle |
| 3.7 | `attribution_remise` : `etat_attribution` + domaine `('ACTIVE','SUSPENDUE','REVOQUEE')`, `date_debut_validite`/`date_fin_validite`, trigger exclusion temporelle Q-02, FK `id_eleve → eleve` (migration 011) | reconstruction + trigger + FK | Q-02, Q-01 (docs/19 §4) | Partiellement ferme pour l'**énumération** `etat_attribution` (B.1/D-7) ; le reste = gouvernance |
| 3.8 | Énumérations existantes déjà conformes B.1/D-7 : `type_portee`, `nature_remise`, `forme_remise`, `est_actif`, `est_active` | — | B.1 / D-7 | **Conforme — aucun delta** |

**Delta ferme B.1/D-7 sur 003 :** aucune colonne d'énumération de statut ne manque dans le DDL réel **parmi les colonnes existantes** ; les écarts portent sur des **colonnes absentes** (`etat_attribution`) ou des **modèles divergents** → renvoyés en gouvernance. Le plan ne propose donc **aucun DDL correctif ferme** pour la migration 003 au-delà de la liste d'énumérations ci-dessus ; les chantiers structurels sont subordonnés aux arbitrages de gouvernance G-02 à G-05 (§9).

### 1.4 DDL correctif proposé — migration 003

**Aucun DDL correctif ferme.** Les deltas fermes du mandat ne produisent pas de correction sur 003 (les énumérations existantes sont déjà en `CHECK IN`). Les corrections structurelles éventuelles dépendent des arbitrages de gouvernance (§9) et ne sont pas préjugées ici.

### 1.5 Assertions de test proposées — migration 003

- Aucune assertion nouvelle au titre des deltas fermes.
- À l'implémentation, si G-02/G-03/G-04 sont arbitrés : assertions de rejet des chevauchements de tarifs (LOT1-01..04), d'exclusion temporelle des remises (Q-02), de FK `id_eleve` effective après migration 011.

### 1.6 Risques et points de gouvernance — migration 003

- **G-02 :** divergence structurelle `tarif` (portée `type_portee` réelle vs modèle simplifié docs/19 §3.3 ; nommage `montant_brut_fcfa` vs `montant_tarif_fcfa` ; `est_applicable` absent ; FK `id_filiere` vers table inexistante — cf. docs/19 §7 « Point ouvert »).
- **G-03 :** divergence structurelle `politique_remise` (`valeur_remise TEXT` + `forme_remise` vs `taux_pourcentage`/`montant_fixe_fcfa` XOR de docs/19 §3.4).
- **G-04 :** divergence structurelle `attribution_remise` (colonnes réelles `motif_specifique`, `rang_fratrie`, `attribue_par`, `date_annulation` vs modèle docs/19 §3.5 ; `etat_attribution` absent).
- **G-05 :** `type_frais.id_periodicite_defaut`, `periodicite.nombre_echeances_defaut`, CHECK `length(trim())>0` — absents du DDL réel, prévus par docs/19 §3.1-3.2, non couverts par un delta ferme.
- **Risque transverse :** toute reconstruction de `tarif`/`politique_remise`/`attribution_remise` doit préserver les triggers existants (`trg_tarif_*`, `trg_classe_annee_tarif_coherente`, `trg_attribution_remise_validite_*`) et les index — à spécifier dans le mandat d'implémentation après arbitrage.

---

## 2. Migration 004 — `facturation_creances`

### 2.1 DDL réel extrait in extenso (commit `2740c9d`)

```sql
CREATE TABLE periode_facturation (
  id_periode_facturation TEXT NOT NULL PRIMARY KEY,
  id_annee_scolaire TEXT NOT NULL,
  date_debut_periode TEXT NOT NULL CHECK (
    date(date_debut_periode, '+0 days') IS NOT NULL
    AND date(date_debut_periode, '+0 days') = date_debut_periode
  ),
  date_fin_periode TEXT NOT NULL CHECK (
    date(date_fin_periode, '+0 days') IS NOT NULL
    AND date(date_fin_periode, '+0 days') = date_fin_periode
    AND date_fin_periode > date_debut_periode
  ),
  UNIQUE (id_periode_facturation, id_annee_scolaire),
  FOREIGN KEY (id_annee_scolaire)
    REFERENCES annee_scolaire (id_annee_scolaire)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_periode_facturation_annee
  ON periode_facturation (id_annee_scolaire);

CREATE TABLE campagne_facturation (
  id_campagne_facturation TEXT NOT NULL PRIMARY KEY,
  id_annee_scolaire TEXT NOT NULL,
  id_type_frais TEXT NOT NULL,
  id_periode_facturation TEXT NOT NULL,
  auteur_lancement TEXT NOT NULL,
  date_lancement TEXT,
  resultat_global TEXT,
  FOREIGN KEY (id_annee_scolaire)
    REFERENCES annee_scolaire (id_annee_scolaire)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_type_frais)
    REFERENCES type_frais (id_type_frais)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_periode_facturation, id_annee_scolaire)
    REFERENCES periode_facturation (id_periode_facturation, id_annee_scolaire)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_campagne_facturation_annee
  ON campagne_facturation (id_annee_scolaire);
CREATE INDEX idx_campagne_facturation_type_frais
  ON campagne_facturation (id_type_frais);
CREATE INDEX idx_campagne_facturation_periode
  ON campagne_facturation (id_periode_facturation, id_annee_scolaire);

CREATE TABLE execution_campagne_facturation (
  id_execution_campagne TEXT NOT NULL PRIMARY KEY,
  id_campagne_facturation TEXT NOT NULL,
  resultat_execution TEXT,
  traces_erreurs TEXT,
  date_tentative TEXT,
  UNIQUE (id_execution_campagne, id_campagne_facturation),
  FOREIGN KEY (id_campagne_facturation)
    REFERENCES campagne_facturation (id_campagne_facturation)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_execution_campagne_parent
  ON execution_campagne_facturation (id_campagne_facturation);

CREATE TABLE creance (
  id_creance TEXT NOT NULL PRIMARY KEY,
  id_eleve TEXT NOT NULL,
  id_annee_scolaire TEXT NOT NULL,
  id_type_frais TEXT NOT NULL,
  libelle_type_frais_snapshot TEXT NOT NULL,
  id_periode_facturation TEXT,
  id_inscription TEXT,
  id_affectation_classe TEXT,
  origine_creation TEXT NOT NULL CHECK (
    origine_creation IN ('CAMPAGNE', 'MANUELLE', 'AUTOMATIQUE')
  ),
  id_campagne_facturation TEXT,
  id_execution_campagne TEXT,
  auteur_creation TEXT,
  date_creation TEXT,
  motif_creation TEXT,
  id_evenement_declencheur TEXT,
  id_tarif_source TEXT,
  montant_brut_fcfa INTEGER NOT NULL CHECK (montant_brut_fcfa >= 0),
  id_periodicite TEXT,
  code_periodicite_snapshot TEXT,
  type_portee_tarifaire_snapshot TEXT CHECK (
    type_portee_tarifaire_snapshot IS NULL
    OR type_portee_tarifaire_snapshot IN (
      'ETABLISSEMENT', 'NIVEAU', 'FILIERE', 'NIVEAU_FILIERE', 'CLASSE'
    )
  ),
  date_debut_periode_facturee TEXT CHECK (
    date_debut_periode_facturee IS NULL OR (
      date(date_debut_periode_facturee, '+0 days') IS NOT NULL
      AND date(date_debut_periode_facturee, '+0 days') = date_debut_periode_facturee
    )
  ),
  date_fin_periode_facturee TEXT CHECK (
    date_fin_periode_facturee IS NULL OR (
      date(date_fin_periode_facturee, '+0 days') IS NOT NULL
      AND date(date_fin_periode_facturee, '+0 days') = date_fin_periode_facturee
    )
  ),
  id_politique_remise TEXT,
  id_attribution_remise TEXT,
  nature_remise_snapshot TEXT CHECK (
    nature_remise_snapshot IS NULL
    OR nature_remise_snapshot IN (
      'BOURSE', 'FRATRIE', 'SOCIALE', 'EXCEPTIONNELLE', 'EXONERATION'
    )
  ),
  forme_remise_snapshot TEXT CHECK (
    forme_remise_snapshot IS NULL
    OR forme_remise_snapshot IN ('MONTANT_FIXE', 'POURCENTAGE')
  ),
  valeur_remise_snapshot TEXT,
  motif_remise_snapshot TEXT,
  montant_remise_fcfa INTEGER NOT NULL DEFAULT 0 CHECK (montant_remise_fcfa >= 0),
  montant_net_initial_fcfa INTEGER NOT NULL CHECK (
    montant_net_initial_fcfa >= 0
    AND montant_net_initial_fcfa = montant_brut_fcfa - montant_remise_fcfa
  ),
  etat_administratif TEXT NOT NULL DEFAULT 'EMISE' CHECK (
    etat_administratif IN ('EMISE', 'ANNULEE')
  ),
  motif_annulation TEXT,
  auteur_annulation TEXT,
  date_annulation TEXT,
  CHECK (
    date_debut_periode_facturee IS NULL
    OR date_fin_periode_facturee IS NULL
    OR date_fin_periode_facturee > date_debut_periode_facturee
  ),
  CHECK (
    (origine_creation = 'CAMPAGNE'
      AND id_campagne_facturation IS NOT NULL
      AND id_execution_campagne IS NOT NULL
      AND auteur_creation IS NULL
      AND date_creation IS NULL
      AND motif_creation IS NULL
      AND id_evenement_declencheur IS NULL)
    OR (origine_creation = 'MANUELLE'
      AND id_campagne_facturation IS NULL
      AND id_execution_campagne IS NULL
      AND auteur_creation IS NOT NULL
      AND date_creation IS NOT NULL
      AND motif_creation IS NOT NULL
      AND length(trim(motif_creation)) > 0
      AND id_evenement_declencheur IS NULL)
    OR (origine_creation = 'AUTOMATIQUE'
      AND id_campagne_facturation IS NULL
      AND id_execution_campagne IS NULL
      AND auteur_creation IS NULL
      AND date_creation IS NULL
      AND motif_creation IS NULL
      AND id_evenement_declencheur IS NOT NULL)
  ),
  CHECK (
    (etat_administratif = 'EMISE'
      AND motif_annulation IS NULL
      AND auteur_annulation IS NULL
      AND date_annulation IS NULL)
    OR (etat_administratif = 'ANNULEE'
      AND motif_annulation IS NOT NULL
      AND length(trim(motif_annulation)) > 0
      AND auteur_annulation IS NOT NULL
      AND date_annulation IS NOT NULL)
  ),
  CHECK (
    (id_attribution_remise IS NULL OR id_politique_remise IS NOT NULL)
    AND (id_politique_remise IS NULL OR forme_remise_snapshot IS NOT NULL)
    AND (forme_remise_snapshot IS NULL OR valeur_remise_snapshot IS NOT NULL)
    AND (forme_remise_snapshot IS NULL OR motif_remise_snapshot IS NOT NULL)
  ),
  FOREIGN KEY (id_annee_scolaire)
    REFERENCES annee_scolaire (id_annee_scolaire)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_type_frais)
    REFERENCES type_frais (id_type_frais)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_periode_facturation, id_annee_scolaire)
    REFERENCES periode_facturation (id_periode_facturation, id_annee_scolaire)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_tarif_source)
    REFERENCES tarif (id_tarif)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_periodicite)
    REFERENCES periodicite (id_periodicite)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_politique_remise)
    REFERENCES politique_remise (id_politique_remise)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_attribution_remise)
    REFERENCES attribution_remise (id_attribution_remise)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_execution_campagne, id_campagne_facturation)
    REFERENCES execution_campagne_facturation
      (id_execution_campagne, id_campagne_facturation)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_creance_eleve_annee
  ON creance (id_eleve, id_annee_scolaire);
CREATE INDEX idx_creance_type_annee
  ON creance (id_type_frais, id_annee_scolaire);
CREATE INDEX idx_creance_campagne_execution
  ON creance (id_execution_campagne, id_campagne_facturation);
CREATE INDEX idx_creance_tarif ON creance (id_tarif_source);

CREATE TRIGGER trg_creance_snapshot_immutable
BEFORE UPDATE OF
  id_eleve, id_annee_scolaire, id_type_frais, libelle_type_frais_snapshot,
  id_periode_facturation, id_inscription, id_affectation_classe,
  origine_creation, id_campagne_facturation, id_execution_campagne,
  auteur_creation, date_creation, motif_creation, id_evenement_declencheur,
  id_tarif_source, montant_brut_fcfa, id_periodicite,
  code_periodicite_snapshot, type_portee_tarifaire_snapshot,
  date_debut_periode_facturee, date_fin_periode_facturee,
  id_politique_remise, id_attribution_remise, nature_remise_snapshot,
  forme_remise_snapshot, valeur_remise_snapshot, motif_remise_snapshot,
  montant_remise_fcfa, montant_net_initial_fcfa
ON creance
BEGIN
  SELECT RAISE(ABORT, 'Les snapshots d’une créance émise sont immuables.');
END;

CREATE TRIGGER trg_creance_non_supprimable
BEFORE DELETE ON creance
BEGIN
  SELECT RAISE(ABORT, 'Une créance émise ou annulée est conservée.');
END;

CREATE TRIGGER trg_creance_tarif_coherent_insert
BEFORE INSERT ON creance
WHEN NEW.id_tarif_source IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tarif
    WHERE id_tarif = NEW.id_tarif_source
      AND id_type_frais = NEW.id_type_frais
      AND id_annee_scolaire = NEW.id_annee_scolaire
  )
BEGIN
  SELECT RAISE(ABORT, 'Le tarif source doit correspondre au type de frais et à l’année de la créance.');
END;

CREATE TRIGGER trg_creance_tarif_coherent_update
BEFORE UPDATE OF id_tarif_source, id_type_frais, id_annee_scolaire ON creance
WHEN NEW.id_tarif_source IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tarif
    WHERE id_tarif = NEW.id_tarif_source
      AND id_type_frais = NEW.id_type_frais
      AND id_annee_scolaire = NEW.id_annee_scolaire
  )
BEGIN
  SELECT RAISE(ABORT, 'Le tarif source doit correspondre au type de frais et à l’année de la créance.');
END;

CREATE TRIGGER trg_creance_remise_coherente_insert
BEFORE INSERT ON creance
WHEN NEW.id_attribution_remise IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM attribution_remise
    WHERE id_attribution_remise = NEW.id_attribution_remise
      AND id_politique_remise = NEW.id_politique_remise
  )
BEGIN
  SELECT RAISE(ABORT, 'L’attribution doit correspondre à la politique de remise enregistrée.');
END;

CREATE TRIGGER trg_creance_remise_coherente_update
BEFORE UPDATE OF id_attribution_remise, id_politique_remise ON creance
WHEN NEW.id_attribution_remise IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM attribution_remise
    WHERE id_attribution_remise = NEW.id_attribution_remise
      AND id_politique_remise = NEW.id_politique_remise
  )
BEGIN
  SELECT RAISE(ABORT, 'L’attribution doit correspondre à la politique de remise enregistrée.');
END;
```

### 2.2 DDL cible — références `docs/19` v1.0

- `periode_facturation` : §3.6 (table 2.1) — `code_periode`, `libelle`, `est_cloturee`, `UNIQUE (id_annee_scolaire, code_periode)`.
- `campagne_facturation` : §3.7 (table 2.2) — `code_campagne UNIQUE`, `statut_campagne CHECK IN ('PREPAREE','EN_COURS','CLOTUREE','ANNULEE')`.
- `execution_campagne` : §3.8 (table 2.3) — `date_debut_execution`, `date_fin_execution`, `nombre_creances_generees`, `montant_total_genere_fcfa`, `statut_execution CHECK IN ('SUCCES','ECHEC','INTERROMPU')`.
- `creance` : §3.9 (table 2.4) — FKs `id_eleve` (NOT NULL, Q-01), `id_inscription`, `id_affectation_classe` (nullables), `id_tarif`, `etat_creance CHECK IN ('ACTIVE','SOLDEE','ANNULEE','SUSPENDUE')`, `date_emission`, `date_exigibilite_initiale`, snapshots `code_classe_snapshot`/`nom_eleve_snapshot`, CHECKs de montants `typeof() = 'integer'`.
- §4 Q-01 : FK `creance.id_eleve → eleve(id_eleve)` (migration 011), `id_inscription → inscription` (013), `id_affectation_classe → affectation_classe` (013).
- §7 : ordonnancement des FK externes (011/013 postérieures à 004).

### 2.3 Matrice des deltas — migration 004

| # | Objet | Type | Décision porteuse | Statut |
|---|---|---|---|---|
| 4.1 | `periode_facturation` : `code_periode`, `libelle`, `est_cloturee`, unicité `(id_annee_scolaire, code_periode)` vs `UNIQUE (id_periode, id_annee)` réelle | reconstruction | — (docs/19 §3.6) | Gouvernance |
| 4.2 | `campagne_facturation` : `code_campagne`, `statut_campagne` énumération | ADD COLUMN + CHECK énumération | B.1 / D-7 (partiel : énumération) | **Ferme (partiel)** — l'énumération `statut_campagne` relève de B.1/D-7 ; les autres colonnes = gouvernance |
| 4.3 | `execution_campagne_facturation` → `execution_campagne` : colonnes cibles `statut_execution` énumération, compteurs | reconstruction | B.1 / D-7 (partiel) | **Ferme (partiel)** pour l'énumération ; gouvernance pour le reste |
| 4.4 | `creance` : FKs `id_eleve`/`id_inscription`/`id_affectation_classe` ; `etat_creance` énumération `('ACTIVE','SOLDEE','ANNULEE','SUSPENDUE')` ; `date_emission`, `date_exigibilite_initiale` ; renommage `etat_administratif`→`etat_creance` ; domaine différent (`EMISE/ANNULEE` vs 4 états) | reconstruction + FK | Q-01 (docs/19 §4) ; B.1/D-7 (énumération) | **Ferme (partiel)** pour l'énumération `etat_creance` ; FK Q-01 et refonte d'état = gouvernance (non listées au §3 du mandat) |
| 4.5 | `creance` : CHECKs `typeof() = 'integer'` sur montants (ex. `montant_brut_fcfa >= 0` sans `typeof`) | contrainte de table | docs/19 §2.1 | Gouvernance |
| 4.6 | `creance` : `id_tarif` FK directe vs `id_tarif_source` réel ; `id_campagne_facturation`/`id_execution_campagne` nullables vs structure réelle | reconstruction | — | Gouvernance — divergence structurelle |

**Delta ferme B.1/D-7 sur 004 :** les énumérations cibles `statut_campagne` et `statut_execution`/`etat_creance` sont spécifiées par docs/19 §3, mais **les colonnes correspondantes sont absentes ou divergentes** dans le DDL réel (`resultat_global TEXT` sans CHECK, `etat_administratif` à domaine différent). L'ajout d'une énumération sur une colonne inexistante ou d'un domaine différent constitue une **refonte structurelle** non couverte par le seul verdict D-7 → renvoyé en gouvernance (G-06). **Aucun DDL correctif ferme ne peut être émis pour 004 sans arbitrage préalable.**

### 2.4 DDL correctif proposé — migration 004

**Aucun DDL correctif ferme.** Les deltas fermes du mandat ne produisent pas de correction isolée sur 004 : les énumérations cibles supposent des colonnes/modèles absents ou divergents (cf. G-06). Toute correction suppose l'arbitrage de gouvernance sur la refonte `creance`/`campagne_facturation`/`execution_campagne`.

### 2.5 Assertions de test proposées — migration 004

- Aucune assertion nouvelle au titre des deltas fermes.
- Sous réserve d'arbitrage G-06 : rejet des `etat_creance` hors domaine, FK `id_eleve` effective (post-011), unicité de campagne, CHECKs `typeof() = 'integer'`.

### 2.6 Risques et points de gouvernance — migration 004

- **G-06 :** divergence structurelle majeure de `creance` — le DDL réel est un modèle « snapshot complet » (origines, campagnes, snapshots de remise/périodicité) très différent du modèle cible docs/19 §3.9 (colonnes canoniques + FKs). Le mapping réel→cible n'est pas trivial et exige un arbitrage de refonte (reconstruction de table, sort des snapshots, des `origine_creation`, des liens campagne/exécution).
- **G-07 :** `campagne_facturation` et `execution_campagne_facturation` réels ne portent ni `code_campagne`/`statut_campagne` ni les compteurs cibles ; la table cible s'appelle `execution_campagne` (renommage).
- **G-08 :** FKs externes Q-01 (`eleve` ← 011, `inscription`/`affectation_classe` ← 013) : ordonnancement imposé par docs/19 §7 — la migration corrective devra s'insérer **après** 013 ou conditionner l'activation des FK (contrat externe).
- **Risque :** `trg_creance_snapshot_immutable` fige aujourd'hui l'essentiel des colonnes ; toute refonte doit décider explicitement du sort de ce trigger (conserver sur les colonnes conservées ? étendre ?) — à arbitrer avec G-06.

---

## 3. Migration 005 — `echeanciers_reglements`

### 3.1 DDL réel extrait in extenso (commit `2740c9d`)

```sql
CREATE TABLE modele_echeancier (
  id_modele_echeancier TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE version_modele_echeancier (
  id_version_modele_echeancier TEXT NOT NULL PRIMARY KEY,
  id_modele_echeancier TEXT NOT NULL,
  FOREIGN KEY (id_modele_echeancier)
    REFERENCES modele_echeancier (id_modele_echeancier)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_version_modele_echeancier_modele
  ON version_modele_echeancier (id_modele_echeancier);

CREATE TABLE ligne_modele_echeancier (
  id_ligne_modele_echeancier TEXT NOT NULL PRIMARY KEY,
  id_version_modele_echeancier TEXT NOT NULL,
  FOREIGN KEY (id_version_modele_echeancier)
    REFERENCES version_modele_echeancier (id_version_modele_echeancier)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_ligne_modele_echeancier_version
  ON ligne_modele_echeancier (id_version_modele_echeancier);

CREATE TABLE plan_reglement_creance (
  id_plan_reglement_creance TEXT NOT NULL PRIMARY KEY,
  id_creance TEXT NOT NULL,
  id_version_modele_echeancier TEXT,
  montant_total_planifie_fcfa INTEGER NOT NULL CHECK (
    typeof(montant_total_planifie_fcfa) = 'integer'
  ),
  UNIQUE (id_plan_reglement_creance, id_creance),
  FOREIGN KEY (id_creance)
    REFERENCES creance (id_creance)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_version_modele_echeancier)
    REFERENCES version_modele_echeancier (id_version_modele_echeancier)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_plan_reglement_creance_creance
  ON plan_reglement_creance (id_creance);
CREATE INDEX idx_plan_reglement_creance_version
  ON plan_reglement_creance (id_version_modele_echeancier);

CREATE TABLE reamenagement_echeancier (
  id_reamenagement_echeancier TEXT NOT NULL PRIMARY KEY,
  motif TEXT NOT NULL CHECK (length(trim(motif)) > 0),
  auteur TEXT NOT NULL,
  date_reamenagement TEXT NOT NULL,
  id_plan_precedent TEXT,
  id_version_modele_precedente TEXT,
  FOREIGN KEY (id_plan_precedent)
    REFERENCES plan_reglement_creance (id_plan_reglement_creance)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_version_modele_precedente)
    REFERENCES version_modele_echeancier (id_version_modele_echeancier)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_reamenagement_plan_precedent
  ON reamenagement_echeancier (id_plan_precedent);
CREATE INDEX idx_reamenagement_version_precedente
  ON reamenagement_echeancier (id_version_modele_precedente);

CREATE TABLE echeance_creance (
  id_echeance_creance TEXT NOT NULL PRIMARY KEY,
  id_creance TEXT NOT NULL,
  id_plan_reglement_creance TEXT NOT NULL,
  montant_exigible_fcfa INTEGER NOT NULL CHECK (
    typeof(montant_exigible_fcfa) = 'integer'
  ),
  date_exigibilite TEXT NOT NULL CHECK (
    date(date_exigibilite, '+0 days') IS NOT NULL
    AND date(date_exigibilite, '+0 days') = date_exigibilite
  ),
  rang INTEGER NOT NULL CHECK (typeof(rang) = 'integer'),
  etat_administratif TEXT NOT NULL,
  id_reamenagement_creation TEXT,
  id_reamenagement_remplacement TEXT,
  FOREIGN KEY (id_plan_reglement_creance, id_creance)
    REFERENCES plan_reglement_creance (id_plan_reglement_creance, id_creance)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_creance)
    REFERENCES creance (id_creance)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_reamenagement_creation)
    REFERENCES reamenagement_echeancier (id_reamenagement_echeancier)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_reamenagement_remplacement)
    REFERENCES reamenagement_echeancier (id_reamenagement_echeancier)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_echeance_creance_creance
  ON echeance_creance (id_creance);
CREATE INDEX idx_echeance_creance_plan
  ON echeance_creance (id_plan_reglement_creance, id_creance);
CREATE INDEX idx_echeance_creance_date
  ON echeance_creance (date_exigibilite);
CREATE INDEX idx_echeance_reamenagement_creation
  ON echeance_creance (id_reamenagement_creation);
CREATE INDEX idx_echeance_reamenagement_remplacement
  ON echeance_creance (id_reamenagement_remplacement);

CREATE TRIGGER trg_version_modele_utilisee_immutable
BEFORE UPDATE ON version_modele_echeancier
WHEN EXISTS (
  SELECT 1 FROM ligne_modele_echeancier
  WHERE id_version_modele_echeancier = OLD.id_version_modele_echeancier
  UNION ALL
  SELECT 1 FROM plan_reglement_creance
  WHERE id_version_modele_echeancier = OLD.id_version_modele_echeancier
)
BEGIN
  SELECT RAISE(ABORT, 'Une version utilisée reste immuable.');
END;

CREATE TRIGGER trg_echeance_historique_non_supprimable
BEFORE DELETE ON echeance_creance
BEGIN
  SELECT RAISE(ABORT, 'Une échéance est conservée dans son historique.');
END;

CREATE TABLE evenement_echeance (
  id_evenement_echeance TEXT NOT NULL PRIMARY KEY,
  id_echeance_creance TEXT NOT NULL,
  id_reamenagement_echeancier TEXT,
  type_evenement TEXT NOT NULL,
  date_evenement TEXT NOT NULL,
  FOREIGN KEY (id_echeance_creance)
    REFERENCES echeance_creance (id_echeance_creance)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  FOREIGN KEY (id_reamenagement_echeancier)
    REFERENCES reamenagement_echeancier (id_reamenagement_echeancier)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
);

CREATE INDEX idx_evenement_echeance_parent
  ON evenement_echeance (id_echeance_creance);
CREATE INDEX idx_evenement_echeance_reamenagement
  ON evenement_echeance (id_reamenagement_echeancier);
```

### 3.2 DDL cible — références `docs/19` v1.0

- `modele_echeancier` : §3.10 (table 3.1) — `code_modele UNIQUE`, `libelle`, `description`, `est_actif`.
- `version_modele` : §3.11 (table 3.2) — `numero_version`, `date_debut_validite`, `date_fin_validite`, `UNIQUE (id_modele_echeancier, numero_version)`. **NB :** le nom réel est `version_modele_echeancier` et la PK `id_version_modele_echeancier` ; docs/19 utilise `version_modele`/`id_version_modele` — divergence de nommage à arbitrer (gouvernance).
- `ligne_modele` : §3.12 (table 3.3) — `rang`, `pourcentage_repartition`, `delai_jours_apres_debut`, `UNIQUE (id_version_modele, rang)`.
- `plan_reglement_creance` : §3.13 (table 3.4) — `type_plan CHECK IN ('INITIAL','REAMENAGE')`, `etat_plan CHECK IN ('BROUILLON','ACTIF','HISTORIQUE','ANNULE')` DEFAULT `'ACTIF'` (cible ; cf. D-8 : insertion en `'BROUILLON'` puis transition), `date_validation`, `valide_par`, index partiel unique `idx_plan_creance_actif`.
- `reamenagement_echeancier` : §3.14 (table 3.5) — `id_creance`, `id_nouveau_plan`, `solde_restant_du_constate_fcfa`, `motif_reamenagement`, `auteur`, `UNIQUE (id_nouveau_plan)`, `CHECK (id_plan_precedent != id_nouveau_plan)`.
- `echeance_creance` : §3.15 (table 3.6) — `statut_echeance CHECK IN ('NON_SOLDEE','PARTIELLEMENT_SOLDEE','SOLDEE','ANNULEE')` DEFAULT `'NON_SOLDEE'`, `CHECK (rang > 0)`, `CHECK (montant_exigible_fcfa > 0)`, `UNIQUE (id_plan_reglement_creance, rang)`, trigger `trg_plan_somme_echeances` (sous réserve Q-03).
- `evenement_echeance` : §3.16 (table 3.7) — `id_plan_reglement_creance`, `type_evenement CHECK IN ('CREATION','REORGANISATION','ANNULATION')`.
- §9 B.2 / D-8 : transition atomique de validation (`etat_plan='ACTIF'`, `date_validation`, `valide_par`) + archivage ancien plan.
- §9 B.3 / D-9 : séquence transactionnelle `BEGIN IMMEDIATE` — **règle applicative**, hors DDL.
- §5 trigger n°3 `trg_plan_somme_echeances` (sous réserve Q-03).

### 3.3 Matrice des deltas — migration 005

| # | Objet | Type | Décision porteuse | Statut |
|---|---|---|---|---|
| 5.1 | `plan_reglement_creance` : ADD `type_plan TEXT NOT NULL CHECK IN ('INITIAL','REAMENAGE')`, `etat_plan TEXT NOT NULL DEFAULT 'ACTIF' CHECK IN ('BROUILLON','ACTIF','HISTORIQUE','ANNULE')`, `date_validation TEXT NULL`, `valide_par TEXT NULL` | ADD COLUMN (rebuild pour CHECK/NOT NULL sans défaut sûr) | B.2 / D-8 ; B.1 / D-7 (énumérations) | **Ferme** |
| 5.2 | `plan_reglement_creance` : `CREATE UNIQUE INDEX idx_plan_creance_actif ON plan_reglement_creance(id_creance) WHERE etat_plan = 'ACTIF'` | CREATE INDEX partiel unique | B.2 / D-8 ; docs/19 §3.13/§6 | **Ferme** — nom `idx_plan_creance_actif` (docs/19 v1.0 fait foi ; l'intitulé `idx_plan_actif_par_creance` du mandat §3.10 est écarté) |
| 5.3 | `echeance_creance` : `CHECK (rang > 0)`, `CHECK (montant_exigible_fcfa > 0)`, `statut_echeance` énumération, `UNIQUE (id_plan_reglement_creance, rang)` | reconstruction (contraintes de table) | Q-03 (docs/19 §3.15) ; B.1/D-7 | **Ferme (partiel)** — Q-03 est une matérialisation ratifiée dans docs/19 §4 ; le mandat §3.9 couvre les énumérations. Le renforcement `> 0` et l'unicité `(plan, rang)` relèvent de Q-03/docs/19 §8 (« Ajouter UNIQUE(id_plan, rang) et CHECK montant > 0 ») — **statut : ferme au titre de la matrice consolidée §8 + Q-03**, à confirmer par le propriétaire si lecture restrictive du §3 seul (voir gouvernance G-09) |
| 5.4 | `trg_plan_somme_echeances` (`AFTER INSERT/UPDATE/DELETE ON echeance_creance`, somme = `montant_total_planifie_fcfa`) | CREATE TRIGGER | Q-03 (docs/19 §3.15, §5 n°3) | **Ferme (sous réserve Q-03 maintenue)** — docs/19 §10.3 maintient la réserve Q-03 ; le trigger est spécifié « sous réserve Q-03 » |
| 5.5 | `modele_echeancier`/`version_modele`/`ligne_modele` : colonnes cibles (`code_modele`, `numero_version`, dates de validité, `pourcentage_repartition`, `delai_jours_apres_debut`, `rang`) | reconstruction | — (docs/19 §3.10-3.12) | Gouvernance — divergence structurelle |
| 5.6 | `reamenagement_echeancier` : `id_creance`, `id_nouveau_plan`, `solde_restant_du_constate_fcfa`, `UNIQUE (id_nouveau_plan)`, `CHECK (id_plan_precedent != id_nouveau_plan)` | reconstruction | — (docs/19 §3.14) | Gouvernance |
| 5.7 | `evenement_echeance` : `id_plan_reglement_creance`, `type_evenement` énumération | ADD COLUMN + CHECK | B.1 / D-7 (partiel) | **Ferme (partiel)** pour l'énumération `type_evenement` ; gouvernance pour la colonne plan |
| 5.8 | B.3 / D-9 : séquence `BEGIN IMMEDIATE` de bascule de plan | règle applicative | B.3 / D-9 | **Ferme — hors DDL** : consignée comme condition d'implémentation (transaction `BEGIN IMMEDIATE`, 5 étapes ordonnées) ; aucun besoin de contrainte différée identifié au-delà de l'index partiel 5.2 |

### 3.4 DDL correctif proposé — migration 005 (stratégie β ; sous stratégie α, intégration directe dans le gabarit)

```sql
-- 005.1 — plan_reglement_creance : colonnes de cycle de vie (D-8 / B.1-D-7)
-- NOTE Stratégie β : ALTER ADD COLUMN possible pour colonnes à défaut/nullable ;
-- les CHECK ne pouvant être ajoutés par ALTER, la pose des CHECK IN exige
-- soit la reconstruction de table, soit (recommandé) l'édition du gabarit sous
-- stratégie α. Sous β, reconstruction :
--
-- PRAGMA foreign_keys = OFF;
-- BEGIN IMMEDIATE;
-- CREATE TABLE plan_reglement_creance_new (
--   id_plan_reglement_creance TEXT NOT NULL PRIMARY KEY,
--   id_creance TEXT NOT NULL,
--   id_version_modele_echeancier TEXT,
--   montant_total_planifie_fcfa INTEGER NOT NULL CHECK (
--     typeof(montant_total_planifie_fcfa) = 'integer'
--     AND montant_total_planifie_fcfa > 0
--   ),
--   type_plan TEXT NOT NULL CHECK (type_plan IN ('INITIAL', 'REAMENAGE')),
--   etat_plan TEXT NOT NULL DEFAULT 'ACTIF' CHECK (
--     etat_plan IN ('BROUILLON', 'ACTIF', 'HISTORIQUE', 'ANNULE')
--   ),
--   date_validation TEXT,
--   valide_par TEXT,
--   UNIQUE (id_plan_reglement_creance, id_creance),
--   FOREIGN KEY (id_creance) REFERENCES creance (id_creance)
--     ON UPDATE RESTRICT ON DELETE RESTRICT,
--   FOREIGN KEY (id_version_modele_echeancier)
--     REFERENCES version_modele_echeancier (id_version_modele_echeancier)
--     ON UPDATE RESTRICT ON DELETE RESTRICT
-- );
-- INSERT INTO plan_reglement_creance_new (
--   id_plan_reglement_creance, id_creance, id_version_modele_echeancier,
--   montant_total_planifie_fcfa, type_plan, etat_plan
-- ) SELECT id_plan_reglement_creance, id_creance, id_version_modele_echeancier,
--        montant_total_planifie_fcfa, 'INITIAL', 'ACTIF'
--   FROM plan_reglement_creance;
-- DROP TABLE plan_reglement_creance;
-- ALTER TABLE plan_reglement_creance_new RENAME TO plan_reglement_creance;
-- COMMIT;
-- PRAGMA foreign_keys = ON;

-- 005.2 — index partiel unique du plan actif (D-8 ; nom docs/19 v1.0)
CREATE UNIQUE INDEX idx_plan_creance_actif
  ON plan_reglement_creance (id_creance)
  WHERE etat_plan = 'ACTIF';

-- 005.3 — echeance_creance : CHECKs Q-03 et unicité (plan, rang) — reconstruction
-- (même procédure ; cible :)
--   rang INTEGER NOT NULL CHECK (typeof(rang) = 'integer' AND rang > 0),
--   montant_exigible_fcfa INTEGER NOT NULL CHECK (
--     typeof(montant_exigible_fcfa) = 'integer' AND montant_exigible_fcfa > 0),
--   statut_echeance TEXT NOT NULL DEFAULT 'NON_SOLDEE' CHECK (
--     statut_echeance IN ('NON_SOLDEE','PARTIELLEMENT_SOLDEE','SOLDEE','ANNULEE')
--   ),
--   UNIQUE (id_plan_reglement_creance, rang)
--   (les FK composites existantes id_creance / reamenagement sont conservées
--    ou refondues selon arbitrage G-10)

-- 005.4 — trigger de somme des échéances (Q-03, sous réserve maintenue)
CREATE TRIGGER trg_plan_somme_echeances
AFTER INSERT ON echeance_creance
BEGIN
  SELECT RAISE(ABORT, 'La somme des échéances doit égaler le plan (sous réserve Q-03).')
  WHERE EXISTS (
    SELECT 1 FROM echeance_creance AS e
    JOIN plan_reglement_creance AS p
      ON p.id_plan_reglement_creance = e.id_plan_reglement_creance
    WHERE e.id_plan_reglement_creance = NEW.id_plan_reglement_creance
    GROUP BY e.id_plan_reglement_creance
    HAVING SUM(e.montant_exigible_fcfa) <> p.montant_total_planifie_fcfa
  );
END;
-- + variantes AFTER UPDATE / AFTER DELETE analogues (spec complète au mandat
-- d'implémentation ; le déclenchement exact — par plan ou par créance — est
-- subordonné à la réserve Q-03 et à l'arbitrage G-10).
```

**Ordre d'application contraignant (005) :** reconstruction `plan_reglement_creance` (avec backfill `etat_plan='ACTIF'`, `type_plan='INITIAL'`) → index `idx_plan_creance_actif` → reconstruction `echeance_creance` → trigger `trg_plan_somme_echeances`. Le tout **avant** toute utilisation applicative de la bascule D-8.

### 3.5 Assertions de test proposées — migration 005

- **D-8 :** une créance ne peut avoir qu'un plan `etat_plan='ACTIF'` (violation d'`idx_plan_creance_actif` sur second plan actif) ; transition `ACTIF → HISTORIQUE` + nouveau `BROUILLON → ACTIF` avec `date_validation`/`valide_par` renseignés ; plan en `BROUILLON`/`ANNULE` hors index.
- **Q-03 :** `rang <= 0` rejeté ; `montant_exigible_fcfa <= 0` rejeté ; doublon `(id_plan_reglement_creance, rang)` rejeté ; somme des échéances ≠ `montant_total_planifie_fcfa` rejetée par `trg_plan_somme_echeances` (sous réserve Q-03).
- **B.3/D-9 (hors DDL) :** la séquence applicative `BEGIN IMMEDIATE` (5 étapes) laisse l'ancien plan intact en cas d'échec — test d'intégration à l'étape 5-6.
- **Révision d'assertions existantes :** `005-echeanciers-reglements.test.ts` — les INSERT de plans sans `type_plan`/`etat_plan` resteront valides grâce aux défauts ; vérifier les assertions sur `UNIQUE (id_plan, id_creance)` (conservée) et ajouter les assertions ci-dessus.

### 3.6 Risques et points de gouvernance — migration 005

- **G-09 :** le mandat §3.10 cite l'index cible `idx_plan_actif_par_creance` « cible docs/19 §3.3 » ; docs/19 v1.0 nomme en réalité `idx_plan_creance_actif` (§3.13, §6). Conformément à l'ordre d'exécution (« les noms figurant dans docs/19 v1.0 font foi »), le plan retient **`idx_plan_creance_actif`** — signalé pour traçabilité.
- **G-10 :** divergences structurelles non couvertes : `modele_echeancier`/`version_modele_echeancier`/`ligne_modele_echeancier` quasi vides vs modèle cible complet ; `reamenagement_echeancier` sans `id_creance`/`id_nouveau_plan`/`solde_restant_du_constate_fcfa` ; `evenement_echeance` sans `id_plan_reglement_creance` et `type_evenement` non contraint ; `echeance_creance.etat_administratif TEXT NOT NULL` sans CHECK ni domaine cible (`statut_echeance`). Le sort de `etat_administratif` (renommage vs coexistence) est à arbitrer.
- **G-11 :** la FK composite `echeance_creance (id_plan_reglement_creance, id_creance) → plan_reglement_creance` et le `UNIQUE (id_plan_reglement_creance, id_creance)` réel : le passage à `UNIQUE (id_plan_reglement_creance, rang)` sur `echeance_creance` et la cible docs/19 `UNIQUE (id_plan_reglement_creance, rang)` supposent une refonte des FK — à coordonner avec G-10.
- **Risque Q-03 :** la réserve Q-03 est **maintenue** (docs/19 §10.3) ; le trigger de somme et le lien plan↔montant net restent « sous réserve » — ne pas durcir au-delà de la spécification sans décision propriétaire.
- **Risque backfill :** sous stratégie β, les plans existants sont backfillés `etat_plan='ACTIF'` — si une créance possède déjà plusieurs plans, l'index partiel échouera à la création : **pré-contrôle obligatoire** (détection des créances multi-plans avant création de l'index) — cf. §7.4.

---

## 4. Migration 006 — `encaissements_credits_mobile_money`

### 4.1 DDL réel extrait in extenso (commit `2740c9d`)

```sql
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
```

### 4.2 DDL cible — références `docs/19` v1.0

- `encaissement` : §3.17 (table 4.1) — `id_session_caisse` FK nullable, `mode_reglement CHECK IN ('ESPECES','MOBILE_MONEY','VIREMENT','CHEQUE','BANQUE')`, `date_encaissement`, `reference_recu UNIQUE`, `statut_encaissement CHECK IN ('VALIDE','ANNULE','CONTREPASSE')`, `date_annulation`, `motif_annulation`, trigger append-only DELETE (FIN-LOT5-035).
- `mouvement_credit` : §3.18 (table 4.2) — `id_eleve` FK, `type_mouvement CHECK IN ('OCTROI','UTILISATION','RESTITUTION')`, `date_mouvement`, `id_mouvement_credit_source` (auto-référence, cascade Lot 6).
- `affectation_reglement` : §3.19 (table 4.3) — `id_creance`, `id_echeance_creance`, `montant_affecte_fcfa > 0`, `date_affectation`, `id_affectation_contrepassee UNIQUE`, `est_contrepassation`, **XOR origine strict (Q-09)**, **XOR cible**, triggers append-only `trg_affectation_no_update`/`trg_affectation_no_delete` (Arbitrage 5), index `idx_affectation_creance`/`idx_affectation_echeance`/`idx_affectation_encaissement` (§6).
- `transaction_mobile_money` : §3.20 (table 4.4) — `id_encaissement NULL UNIQUE` FK, `fournisseur`, `compte_marchand`, `montant_declare_fcfa`, `telephone_payeur`, `date_declaration`, `date_confirmation`, `etat_synchronisation_technique` domaine cible `('CREE_LOCALEMENT','EN_ATTENTE_SERVEUR','CONFIRME_SERVEUR','EN_CONFLIT')`, `etat_financier CHECK IN ('INITIE','CONFIRME','ECHOUE','EXPIRE')`, `UNIQUE (fournisseur, compte_marchand, reference_externe)`, CHECK atomique CONFIRME (Q-04).
- §5 triggers n°4 et n°5 (`trg_affectation_no_update`, `trg_affectation_no_delete`).
- §6 index : `idx_affectation_creance`, `idx_affectation_echeance`, `idx_affectation_encaissement`.

### 4.3 Matrice des deltas — migration 006

| # | Objet | Type | Décision porteuse | Statut |
|---|---|---|---|---|
| 6.1 | `encaissement` : colonnes cibles (`id_session_caisse`, `mode_reglement`, `date_encaissement`, `reference_recu`, `statut_encaissement`, `date_annulation`, `motif_annulation`) ; énumérations `mode_reglement`/`statut_encaissement` | reconstruction | B.1 / D-7 (énumérations) ; FIN-LOT5-035 (append-only, docs/19 §3.17) | **Ferme (partiel)** pour les énumérations et le trigger DELETE (matérialisation docs/19 §4/§5) ; gouvernance pour les autres colonnes absentes |
| 6.2 | `encaissement` trigger append-only DELETE | CREATE TRIGGER | FIN-LOT5-035 (docs/19 §3.17, §5) | **Ferme** — docs/19 §8 liste « Ajouter trigger append-only interdisant DELETE » ; décision FIN-LOT5-035 ratifiée dans le MLD |
| 6.3 | `mouvement_credit` : `id_eleve` FK, `type_mouvement` énumération, `date_mouvement`, `id_mouvement_credit_source` | reconstruction | B.1 / D-7 (partiel) | **Ferme (partiel)** pour l'énumération `type_mouvement` ; gouvernance pour le reste (docs/19 §8 : « Conforme (frontière Lot 4) — Aucun » → divergence à signaler, G-12) |
| 6.4 | `affectation_reglement` : `id_creance`, `id_echeance_creance`, `montant > 0`, `date_affectation`, `id_affectation_contrepassee`, `est_contrepassation`, XOR origine (Q-09), XOR cible, triggers append-only, index §6 | reconstruction + triggers + index | Q-09, Arbitrages 1/2/5 (docs/19 §3.19, §4) | **Ferme (partiel)** — Q-09 et Arbitrage 5 sont des matérialisations ratifiées dans docs/19 §4 ; le mandat §3 ne les liste pas explicitement → **statut : ferme au titre de docs/19 §4/§8 consolidé, à confirmer par le propriétaire** (G-13) |
| 6.5 | `transaction_mobile_money` : `id_encaissement` FK nullable UNIQUE, `fournisseur`, `compte_marchand`, `montant_declare_fcfa`, `date_declaration`, `date_confirmation`, `UNIQUE (fournisseur, compte_marchand, reference_externe)`, CHECK CONFIRME, domaines d'états cibles | reconstruction | Q-04 (docs/19 §3.20, §4) | **Ferme (partiel)** — Q-04 ratifiée ; domaines d'états différents des réels → refonte (gouvernance partielle, G-14) |
| 6.6 | Renommage `etat_verification_financiere` → `etat_financier` et domaine `('INITIE','CONFIRME','ECHOUE','EXPIRE')` vs `('DECLARE','EN_ATTENTE_VERIFICATION','CONFIRME','REJETE')` réel | reconstruction | Q-04 / B.1-D-7 | Gouvernance — rupture de domaine |

### 4.4 DDL correctif proposé — migration 006

**Aucun DDL correctif ferme isolé.** Les deltas fermes (énumérations B.1/D-7, trigger DELETE FIN-LOT5-035) sont applicables mais **insuffisants seuls** : les tables cibles diffèrent structurellement du DDL réel (colonnes absentes, domaines d'états divergents, XOR à reconstruire). Le trigger append-only DELETE sur `encaissement` est le seul objet **autonome** proposable sans refonte :

```sql
-- 006.a — trigger append-only DELETE sur encaissement (FIN-LOT5-035 ; docs/19 §3.17)
CREATE TRIGGER trg_encaissement_no_delete
BEFORE DELETE ON encaissement
BEGIN
  SELECT RAISE(ABORT, 'Un encaissement validé n''est jamais supprimé (FIN-LOT5-035).');
END;
```

Le surplus (colonnes, énumérations, XOR, index, trigger `trg_affectation_*`) est subordonné aux arbitrages G-12 à G-14 et sera spécifié dans le mandat d'implémentation.

### 4.5 Assertions de test proposées — migration 006

- **006.a :** `DELETE FROM encaissement` rejeté par `trg_encaissement_no_delete` ; UPDATE non interdit par ce trigger (l'annulation reste un événement `statut_encaissement` — cible).
- Sous réserve d'arbitrage : rejet des affectations violant le XOR origine (Q-09) et le XOR cible ; rejet UPDATE/DELETE sur `affectation_reglement` ; unicité `(fournisseur, compte_marchand, reference_externe)` ; CHECK atomique CONFIRME (Q-04).
- **Révision d'assertions existantes :** `006-encaissements-credits-mobile-money.test.ts` — vérifier les INSERT `mouvement_credit`/`affectation_reglement` (les CHECKs XOR réels autorisent aujourd'hui `id_encaissement` seul **ou** `id_mouvement_credit_utilisation` seul, mais pas les deux ; la cible Q-09 exige exactement un des deux — le CHECK réel `id_encaissement IS NOT NULL OR id_mouvement_credit_utilisation IS NOT NULL` est **plus laxiste** que le XOR strict : les deux colonnes peuvent être simultanément non nulles → assertion de rejet du cas « les deux » à ajouter après arbitrage).

### 4.6 Risques et points de gouvernance — migration 006

- **G-12 :** docs/19 §8 déclare `mouvement_credit` « Conforme (frontière Lot 4) — Aucun », mais le DDL réel ne porte ni `id_eleve`, ni `type_mouvement` énuméré, ni `date_mouvement`, ni `id_mouvement_credit_source` — **contradiction entre la matrice §8 et le DDL réel** : signalée, non tranchée.
- **G-13 :** le statut « ferme » des matérialisations Q-09 / Arbitrages 1-2-5 / Q-04 / FIN-LOT5-035 : ratifiées dans docs/19 §4 (table des contraintes) et §8, mais **non listées au §3 du mandat** — le plan les traite comme fermes au titre de la matrice consolidée §8 ; confirmation propriétaire requise si lecture restrictive.
- **G-14 :** `transaction_mobile_money` : domaines d'états réels (`LOCALE_NON_SYNCHRONISEE`, `DECLARE`, `REJETE`…) **totalement différents** des domaines cibles (`CREE_LOCALEMENT`, `INITIE`, `ECHOUE`, `EXPIRE`…) — refonte avec mapping de données obligatoire sous stratégie β (table de correspondance à définir) ; colonnes `fournisseur`/`compte_marchand`/`montant_declare_fcfa` absentes.
- **Risque :** les FK `DEFERRABLE INITIALLY DEFERRED` croisées `mouvement_credit ↔ affectation_reglement` (cycle) — toute reconstruction doit préserver la déférabilité ou arbitrer le cycle (docs/19 cible une FK simple `id_mouvement_credit_utilisation → mouvement_credit`).
- **Risque :** `affectation_reglement.montant_affecte_fcfa >= 0` réel vs `> 0` cible (Arbitrage 3) — le passage à `> 0` invaliderait d'éventuelles lignes à 0 : pré-contrôle §7.4.

---

## 5. Migration 007 — `gestion_caisse`

*Cœur des deltas fermes du mandat (§3.1 à §3.8). Toutes les références `docs/19` v1.0 sont au gel `2740c9d`.*

### 5.1 DDL réel extrait in extenso (commit `2740c9d`)

```sql
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
```

### 5.2 DDL cible — références `docs/19` v1.0

- `poste_caisse` : §3.21 (table 5.1) — `code_poste UNIQUE`, `designation`, `est_actif`.
- `appareil` : §3.22 (table 5.2) — `numero_serie UNIQUE`, `nom_machine`, `est_autorise`.
- `session_caisse` : §3.23 (table 5.3) — `id_caissier`, `etat CHECK IN ('OUVERTE','CLOTUREE') DEFAULT 'OUVERTE'`, index partiel unique `idx_session_active_poste`, trigger `trg_session_caisse_cloturee_immutable` armé `WHEN OLD.etat = 'CLOTUREE'` (R-6/D-5).
- `mouvement_caisse` : §3.24 (table 5.4) — `sens`, `type_mouvement`, `id_operation_source` (pointeur polymorphe sans REFERENCES), `date_mouvement`, CHECK remboursement (D-3), index `idx_mouvement_remboursement_unique`, `idx_mouvement_session`, triggers `trg_mouvement_caisse_no_delete`/`trg_mouvement_caisse_no_update_closed`, règle R-3.
- `cloture_caisse` : §3.25 (table 5.5) — `numero_comptage_retenu`, `UNIQUE (id_session_caisse)`, `CHECK (ecart_fcfa = montant_physique_fcfa - solde_theorique_fcfa)`, séquence Option C.
- `detail_comptage_caisse` : §3.26 (table 5.6) — `montant_total_ligne_fcfa` GENERATED, `UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)`, FK `valeur_unitaire_fcfa → ref_coupure_xaf`, triggers append-only + `trg_detail_comptage_no_insert_closed`.
- `ref_coupure_xaf` : §3.27 (table 5.6bis) — table nouvelle D-6a/D-6b.
- `transmission_fonds` : §3.28 (table 5.7) — `id_session_source`, `id_session_destination` NULL, `id_responsable_reception`, `nom_responsable_snapshot`, `etat_transmission`, `date_envoi`, `date_reception`, 3 CHECKs, trigger `trg_transmission_figee_reception` (D-11).
- `rapprochement_caisse` : §3.29 (table 5.8) — `date_rapprochement`, `solde_theorique_calcule_fcfa`, `montant_physique_confronte_fcfa`, `ecart_constate_fcfa`, `est_definitif`, `superviseur`, index `idx_rapprochement_definitif`, 2 triggers append-only.
- `justification_ecart_caisse` : §3.30 (table 5.9) — `motif_ecart`, `auteur`, `date_justification`, `piece_justificative_ref`, 2 triggers append-only.
- §5 triggers n°6-17 ; §6 index `idx_session_active_poste`, `idx_mouvement_remboursement_unique`, `idx_mouvement_session`, `idx_detail_comptage_tour`, `idx_transmission_source_dest`, `idx_rapprochement_definitif`.

### 5.3 Matrice des deltas — migration 007

| # | Objet | Type | Décision porteuse | Statut |
|---|---|---|---|---|
| 7.1 | `session_caisse` : ADD `etat TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (etat IN ('OUVERTE','CLOTUREE'))` | ADD COLUMN (rebuild pour CHECK) | B.4/Q-05 — D-1 ; B.8/D-5 | **Ferme** |
| 7.2 | `session_caisse` : `CREATE UNIQUE INDEX idx_session_active_poste ON session_caisse(id_poste_caisse) WHERE etat = 'OUVERTE'` | CREATE INDEX partiel unique | Q-05 / D-1 | **Ferme** |
| 7.3 | `session_caisse` : retiming `trg_session_caisse_cloturee_immutable` — `DROP TRIGGER` + `CREATE TRIGGER … WHEN OLD.etat = 'CLOTUREE'` | retiming de trigger | Réserve R-6 / D-5 (mandat §3.7) | **Ferme** |
| 7.4 | `mouvement_caisse` : ADD `sens`, `type_mouvement`, `id_operation_source TEXT NULL` (sans REFERENCES), `date_mouvement` ; CHECKs `sens`/`type_mouvement` ; CHECK remboursement D-3 ; index `idx_mouvement_remboursement_unique` ; `idx_mouvement_session` | reconstruction + index | B.5/Q-06 — D-2+R-1, D-3 ; GAP-14 | **Ferme** |
| 7.5 | `mouvement_caisse` : `trg_mouvement_caisse_no_delete` + `trg_mouvement_caisse_no_update_closed` ; sort des triggers existence-based `trg_mouvement_caisse_session_cloturee_insert/update` (cf. §7.2 fenêtre R-3) | CREATE/DROP TRIGGER | GAP-14 / FIN-LOT5-035 ; R-3 | **Ferme** (triggers) ; fenêtre R-3 = option (i) recommandée, conforme par défaut |
| 7.6 | `cloture_caisse` : ADD `numero_comptage_retenu INTEGER NOT NULL DEFAULT 1 CHECK (> 0)` ; `UNIQUE (id_session_caisse)` ; CHECK `ecart_fcfa = montant_physique_fcfa - solde_theorique_fcfa` ; **retrait** de l'armement automatique de fermeture (pas de trigger `trg_cloture_fermeture_session` — il n'existe pas dans le DDL réel ; le retrait vise l'**absence** de création de ce trigger et la conservation du comportement Option C) | reconstruction | B.8/Q-08/Q-07 — D-5 Option C ; FIN-LOT5-013 | **Ferme** |
| 7.7 | `detail_comptage_caisse` : `montant_total_ligne_fcfa INTEGER GENERATED ALWAYS AS (valeur_unitaire_fcfa * quantite) STORED` ; `UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)` ; FK `valeur_unitaire_fcfa → ref_coupure_xaf` ; triggers `trg_detail_comptage_no_update`/`no_delete` (renommage des existants `trg_detail_comptage_caisse_immutable_*` ou création des noms cibles — cf. gouvernance G-15) ; `trg_detail_comptage_no_insert_closed` (17ᵉ trigger) ; index `idx_detail_comptage_tour` | reconstruction + triggers + index | Q-08 / D-5 / D-6a | **Ferme** |
| 7.8 | `ref_coupure_xaf` : CREATE TABLE + seed 9 valeurs/10 formes ≥ 25 FCFA | table nouvelle + données | B.9 — D-6a Option 1 + D-6b / R-4 | **Ferme** |
| 7.9 | `transmission_fonds` : `id_session_caisse` → `id_session_source` ; ADD `id_session_destination NULL` FK, `id_responsable_reception`, `nom_responsable_snapshot`, `etat_transmission CHECK IN ('EMISE','RECUE','ECART_CONSTATE') DEFAULT 'EMISE'`, `date_envoi`, `date_reception` ; 3 CHECKs (auto-session, traçabilité récepteur, cycle de réception) ; `trg_transmission_figee_reception` ; index `idx_transmission_source_dest` | reconstruction | B.6/B.10 — D-10, D-11 ; Q-06 ; FIN-LOT5-007 | **Ferme** |
| 7.10 | `rapprochement_caisse` : ADD `date_rapprochement`, `solde_theorique_calcule_fcfa`, `montant_physique_confronte_fcfa`, `ecart_constate_fcfa`, `est_definitif INTEGER NOT NULL DEFAULT 0 CHECK IN (0,1)`, `superviseur` ; `idx_rapprochement_definitif` ; `trg_rapprochement_caisse_no_update`/`no_delete` | reconstruction + index + triggers | B.7/Q-07/GAP-15 — D-4 | **Ferme** |
| 7.11 | `justification_ecart_caisse` : ADD `motif_ecart`, `auteur`, `date_justification`, `piece_justificative_ref` ; `trg_justification_ecart_no_update`/`no_delete` | reconstruction + triggers | GAP-16 / Q-07 — D-4 | **Ferme** |
| 7.12 | `trg_cloture_comptage_concordance` (16ᵉ trigger, `BEFORE UPDATE OF etat ON session_caisse`) | CREATE TRIGGER | B.8/Q-07 — D-5 Option C ; FIN-LOT5-013 | **Ferme** |
| 7.13 | `poste_caisse`/`appareil` : colonnes cibles (`code_poste`, `designation`, `est_actif` ; `numero_serie`, `nom_machine`, `est_autorise`) | ADD COLUMN | — (docs/19 §3.21-3.22) | Gouvernance — docs/19 §8 dit « Conforme » à tort (G-16) |
| 7.14 | `session_caisse` : `id_caissier`, `date_ouverture` ; CHECK `fonds_initial_fcfa >= 0` | ADD COLUMN | — (docs/19 §3.23) | Gouvernance (G-16) |

### 5.4 DDL correctif proposé — migration 007

**Ordre d'application contraignant :**

1. `ref_coupure_xaf` (table + seed) — **avant** la FK depuis `detail_comptage_caisse`.
2. Reconstructions de tables dans l'ordre des dépendances : `session_caisse` → `cloture_caisse` → `detail_comptage_caisse` (FK vers `ref_coupure_xaf`) → `mouvement_caisse` → `transmission_fonds` → `rapprochement_caisse` → `justification_ecart_caisse`.
3. Triggers en dernier (notamment `trg_cloture_comptage_concordance` et `trg_detail_comptage_no_insert_closed` qui référencent `session_caisse.etat`).

#### 5.4.1 `ref_coupure_xaf` — table nouvelle (D-6a/D-6b ; B.9)

```sql
CREATE TABLE ref_coupure_xaf (
  valeur_unitaire_fcfa INTEGER PRIMARY KEY CHECK (
    typeof(valeur_unitaire_fcfa) = 'integer' AND valeur_unitaire_fcfa > 0
  ),
  type_coupure TEXT NOT NULL CHECK (
    type_coupure IN ('BILLET', 'PIECE', 'BILLET ET PIECE')
  ),
  libelle TEXT NOT NULL CHECK (length(trim(libelle)) > 0),
  est_active INTEGER NOT NULL DEFAULT 1 CHECK (est_active IN (0, 1))
);

-- Seed D-6b (9 valeurs / 10 formes >= 25 FCFA ; sources BEAC au 07/11/2026 :
-- gammes billets 2002/2020, pièces 2006/2024, pièce 200 FCFA « Type 2024 »
-- mise en circulation le 02/04/2025 ; démonétisation des pièces pré-2006
-- au 01/11/2026 — décision UMAC N'Djamena 07/10/2026).
INSERT INTO ref_coupure_xaf (valeur_unitaire_fcfa, type_coupure, libelle, est_active) VALUES
  (10000, 'BILLET',        'Billet de 10 000 FCFA', 1),
  (5000,  'BILLET',        'Billet de 5 000 FCFA',  1),
  (2000,  'BILLET',        'Billet de 2 000 FCFA',  1),
  (1000,  'BILLET',        'Billet de 1 000 FCFA',  1),
  (500,   'BILLET ET PIECE','Billet et Pièce de 500 FCFA', 1),
  (200,   'PIECE',         'Pièce de 200 FCFA',     1),
  (100,   'PIECE',         'Pièce de 100 FCFA',     1),
  (50,    'PIECE',         'Pièce de 50 FCFA',      1),
  (25,    'PIECE',         'Pièce de 25 FCFA',      1);
-- Valeurs 10/5/2/1 FCFA : hors référentiel initial (révisable par données, R-4).
```

#### 5.4.2 `session_caisse` — cible (D-1, D-5/R-6)

```sql
-- Reconstruction (stratégie β) ou édition du gabarit (stratégie α) :
CREATE TABLE session_caisse (
  id_session_caisse TEXT NOT NULL PRIMARY KEY,
  id_poste_caisse TEXT NOT NULL,
  id_appareil TEXT NOT NULL,
  fonds_initial_fcfa INTEGER NOT NULL CHECK (
    typeof(fonds_initial_fcfa) = 'integer' AND fonds_initial_fcfa >= 0
  ),
  etat TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (etat IN ('OUVERTE', 'CLOTUREE')),
  FOREIGN KEY (id_poste_caisse) REFERENCES poste_caisse (id_poste_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (id_appareil) REFERENCES appareil (id_appareil)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);
-- Backfill : etat = 'OUVERTE' pour les sessions existantes (pré-contrôle :
-- une session avec cloture_caisse existante devrait être 'CLOTUREE' —
-- cf. §7.4 ; par défaut 'OUVERTE' car la clôture Option C n'existe pas encore).

CREATE UNIQUE INDEX idx_session_active_poste
  ON session_caisse (id_poste_caisse)
  WHERE etat = 'OUVERTE';

-- Retiming R-6/D-5 : DROP de l'ancien trigger existence-based, création du
-- trigger armé sur l'état (autorise OUVERTE -> CLOTUREE, bloque tout UPDATE
-- ultérieur dont le retour à 'OUVERTE').
DROP TRIGGER trg_session_caisse_cloturee_immutable;
CREATE TRIGGER trg_session_caisse_cloturee_immutable
BEFORE UPDATE ON session_caisse
WHEN OLD.etat = 'CLOTUREE'
BEGIN
  SELECT RAISE(ABORT, 'Une session clôturée est irréversible (R-6).');
END;
```

#### 5.4.3 `mouvement_caisse` — cible (D-2, D-3, GAP-14, R-3)

```sql
CREATE TABLE mouvement_caisse (
  id_mouvement_caisse TEXT NOT NULL PRIMARY KEY,
  id_session_caisse TEXT NOT NULL,
  sens TEXT NOT NULL CHECK (sens IN ('ENTREE', 'SORTIE')),
  montant_fcfa INTEGER NOT NULL CHECK (
    typeof(montant_fcfa) = 'integer' AND montant_fcfa > 0
  ),
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN (
    'ENCAISSEMENT', 'TRANSMISSION_SORTIE', 'TRANSMISSION_ENTREE',
    'REMBOURSEMENT', 'AJUSTEMENT'
  )),
  id_operation_source TEXT,               -- pointeur polymorpme SANS REFERENCES (D-2/R-2)
  date_mouvement TEXT NOT NULL,
  CHECK (type_mouvement <> 'REMBOURSEMENT' OR id_operation_source IS NOT NULL),
  FOREIGN KEY (id_session_caisse) REFERENCES session_caisse (id_session_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_mouvement_remboursement_unique
  ON mouvement_caisse (id_operation_source, id_session_caisse)
  WHERE type_mouvement = 'REMBOURSEMENT';
CREATE INDEX idx_mouvement_session
  ON mouvement_caisse (id_session_caisse, sens, montant_fcfa);

CREATE TRIGGER trg_mouvement_caisse_no_delete
BEFORE DELETE ON mouvement_caisse
BEGIN
  SELECT RAISE(ABORT, 'Un mouvement de caisse validé n''est jamais supprimé (GAP-14).');
END;

CREATE TRIGGER trg_mouvement_caisse_no_update_closed
BEFORE UPDATE ON mouvement_caisse
WHEN EXISTS (
  SELECT 1 FROM session_caisse
  WHERE id_session_caisse = OLD.id_session_caisse AND etat = 'CLOTUREE'
)
BEGIN
  SELECT RAISE(ABORT, 'Les mouvements d''une session clôturée ne sont pas modifiables.');
END;
```

**Fenêtre R-3 (garde INSERT) — option (i) recommandée, conforme par défaut :** conserver une garde `BEFORE INSERT` fondée sur l'**existence** d'une `cloture_caisse` (couvre la fenêtre dès l'ouverture de la clôture, plus strictement que R-3). Le trigger cible peut conserver le nom réel `trg_mouvement_caisse_session_cloturee_insert` (renommage cosmétique non exigé par docs/19) ou adopter un nom aligné — **décision de nommage laissée à l'implémentation**, la règle fonctionnelle R-3 est ferme. L'option (ii) (retime sur `etat='CLOTUREE'`) n'est recevable que sur amendement de R-3 — non sollicité.

```sql
-- Garde fenêtre R-3 (option i — conservée, éventuellement renommée) :
CREATE TRIGGER trg_mouvement_caisse_session_cloturee_insert
BEFORE INSERT ON mouvement_caisse
WHEN EXISTS (
  SELECT 1 FROM cloture_caisse
  WHERE id_session_caisse = NEW.id_session_caisse
)
BEGIN
  SELECT RAISE(ABORT, 'Aucun mouvement après ouverture de clôture (R-3).');
END;
```

Le trigger `trg_mouvement_caisse_session_cloturee_update` existence-based est **redondant** avec `trg_mouvement_caisse_no_update_closed` (qui couvre `etat='CLOTUREE'`) mais **plus strict** (couvre aussi la fenêtre pré-scellement) : le conserver ou le remplacer par une variante existence-based cohérente avec R-3 — **recommandation : conserver la sémantique existence-based pour UPDATE également** (cohérence avec la fenêtre R-3), à confirmer à l'implémentation ; signalé en gouvernance G-17.

#### 5.4.4 `cloture_caisse` — cible (D-5 Option C, Q-07, Q-08)

```sql
CREATE TABLE cloture_caisse (
  id_cloture_caisse TEXT NOT NULL PRIMARY KEY,
  id_session_caisse TEXT NOT NULL,
  date_cloture TEXT NOT NULL,
  solde_theorique_fcfa INTEGER NOT NULL CHECK (typeof(solde_theorique_fcfa) = 'integer'),
  montant_physique_fcfa INTEGER NOT NULL CHECK (
    typeof(montant_physique_fcfa) = 'integer' AND montant_physique_fcfa >= 0
  ),
  ecart_fcfa INTEGER NOT NULL CHECK (typeof(ecart_fcfa) = 'integer'),
  numero_comptage_retenu INTEGER NOT NULL DEFAULT 1 CHECK (numero_comptage_retenu > 0),
  CHECK (ecart_fcfa = montant_physique_fcfa - solde_theorique_fcfa),
  UNIQUE (id_session_caisse),
  FOREIGN KEY (id_session_caisse) REFERENCES session_caisse (id_session_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- Triggers append-only existants conservés (trg_cloture_caisse_immutable_update/delete)
-- — conformes à l'esprit Option C (la ligne de clôture est immuable une fois insérée).
-- AUCUN trigger d'armement automatique de fermeture à l'INSERT (retrait M-4 / Option C) :
-- la bascule session_caisse.etat = 'CLOTUREE' est une commande UPDATE explicite.
```

#### 5.4.5 `detail_comptage_caisse` — cible (Q-08, D-5, D-6a)

```sql
CREATE TABLE detail_comptage_caisse (
  id_detail_comptage_caisse TEXT NOT NULL PRIMARY KEY,
  id_cloture_caisse TEXT NOT NULL,
  numero_comptage INTEGER NOT NULL CHECK (
    typeof(numero_comptage) = 'integer' AND numero_comptage > 0
  ),
  valeur_unitaire_fcfa INTEGER NOT NULL,
  quantite INTEGER NOT NULL CHECK (typeof(quantite) = 'integer' AND quantite >= 0),
  montant_total_ligne_fcfa INTEGER GENERATED ALWAYS AS
    (valeur_unitaire_fcfa * quantite) STORED,
  UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa),
  FOREIGN KEY (id_cloture_caisse) REFERENCES cloture_caisse (id_cloture_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (valeur_unitaire_fcfa) REFERENCES ref_coupure_xaf (valeur_unitaire_fcfa)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_detail_comptage_tour
  ON detail_comptage_caisse (id_cloture_caisse, numero_comptage);

-- Append-only (noms cibles docs/19 §5 n°11-12 ; les triggers réels
-- trg_detail_comptage_caisse_immutable_update/delete sont DROP puis recréés
-- sous les noms cibles, ou aliasés — cf. G-15) :
CREATE TRIGGER trg_detail_comptage_no_update
BEFORE UPDATE ON detail_comptage_caisse
BEGIN
  SELECT RAISE(ABORT, 'Un détail de comptage est conservé (Q-08).');
END;
CREATE TRIGGER trg_detail_comptage_no_delete
BEFORE DELETE ON detail_comptage_caisse
BEGIN
  SELECT RAISE(ABORT, 'Un détail de comptage ne peut pas être supprimé (Q-08).');
END;

-- 17e trigger (D-5) : verrou d'insertion post-scellement
CREATE TRIGGER trg_detail_comptage_no_insert_closed
BEFORE INSERT ON detail_comptage_caisse
WHEN EXISTS (
  SELECT 1 FROM cloture_caisse AS c
  JOIN session_caisse AS s ON s.id_session_caisse = c.id_session_caisse
  WHERE c.id_cloture_caisse = NEW.id_cloture_caisse AND s.etat = 'CLOTUREE'
)
BEGIN
  SELECT RAISE(ABORT, 'Session clôturée : insertion de détail interdite (D-5).');
END;
```

#### 5.4.6 `transmission_fonds` — cible (D-10, D-11, Q-06, FIN-LOT5-007)

```sql
CREATE TABLE transmission_fonds (
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
      AND montant_recu_fcfa IS NOT NULL AND date_reception IS NOT NULL)
    OR (etat_transmission = 'EMISE' AND montant_recu_fcfa IS NULL)
  ),
  FOREIGN KEY (id_session_source) REFERENCES session_caisse (id_session_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (id_session_destination) REFERENCES session_caisse (id_session_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_transmission_source_dest
  ON transmission_fonds (id_session_source, id_session_destination);

-- D-11 : figeage à deux temps
CREATE TRIGGER trg_transmission_figee_reception
BEFORE UPDATE ON transmission_fonds
BEGIN
  -- Etape 1 : des 'EMISE', colonnes d'emission inaltérables
  SELECT RAISE(ABORT, 'Transmission émise : champs d''émission figés (D-11).')
  WHERE OLD.etat_transmission = 'EMISE' AND (
    NEW.id_session_source IS NOT OLD.id_session_source
    OR NEW.montant_envoye_fcfa IS NOT OLD.montant_envoye_fcfa
    OR NEW.date_envoi IS NOT OLD.date_envoi
    OR NEW.id_transmission_fonds IS NOT OLD.id_transmission_fonds
  );
  -- Etape 2 : des 'RECUE'/'ECART_CONSTATE', ligne totalement immuable
  SELECT RAISE(ABORT, 'Transmission réceptionnée : ligne figée (D-11).')
  WHERE OLD.etat_transmission IN ('RECUE', 'ECART_CONSTATE');
END;
```

**Backfill (stratégie β) :** `id_session_caisse` → `id_session_source` ; `etat_transmission='EMISE'` ; `date_envoi` depuis une source à définir (pas de colonne date réelle — **pré-contrôle/gouvernance G-18** : valeur par défaut documentée, ex. date de migration ou NULL interdit par NOT NULL → backfill avec date sentinelle à arbitrer).

#### 5.4.7 `rapprochement_caisse` — cible (D-4, GAP-15, Q-07)

```sql
CREATE TABLE rapprochement_caisse (
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
  FOREIGN KEY (id_session_caisse) REFERENCES session_caisse (id_session_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_rapprochement_definitif
  ON rapprochement_caisse (id_session_caisse)
  WHERE est_definitif = 1;

CREATE TRIGGER trg_rapprochement_caisse_no_update
BEFORE UPDATE ON rapprochement_caisse
BEGIN
  SELECT RAISE(ABORT, 'Un rapprochement est un acte append-only (D-4).');
END;
CREATE TRIGGER trg_rapprochement_caisse_no_delete
BEFORE DELETE ON rapprochement_caisse
BEGIN
  SELECT RAISE(ABORT, 'Un rapprochement ne peut pas être supprimé (D-4).');
END;
```

#### 5.4.8 `justification_ecart_caisse` — cible (GAP-16, Q-07)

```sql
CREATE TABLE justification_ecart_caisse (
  id_justification_ecart_caisse TEXT NOT NULL PRIMARY KEY,
  id_rapprochement_caisse TEXT NOT NULL,
  motif_ecart TEXT NOT NULL CHECK (length(trim(motif_ecart)) > 0),
  auteur TEXT NOT NULL CHECK (length(trim(auteur)) > 0),
  date_justification TEXT NOT NULL,
  piece_justificative_ref TEXT,
  FOREIGN KEY (id_rapprochement_caisse) REFERENCES rapprochement_caisse (id_rapprochement_caisse)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER trg_justification_ecart_no_update
BEFORE UPDATE ON justification_ecart_caisse
BEGIN
  SELECT RAISE(ABORT, 'Une justification est append-only (GAP-16).');
END;
CREATE TRIGGER trg_justification_ecart_no_delete
BEFORE DELETE ON justification_ecart_caisse
BEGIN
  SELECT RAISE(ABORT, 'Une justification ne peut pas être supprimée (GAP-16).');
END;
```

#### 5.4.9 `trg_cloture_comptage_concordance` — 16ᵉ trigger (D-5 Option C, FIN-LOT5-013)

```sql
CREATE TRIGGER trg_cloture_comptage_concordance
BEFORE UPDATE OF etat ON session_caisse
WHEN NEW.etat = 'CLOTUREE' AND OLD.etat IS NOT 'CLOTUREE'
BEGIN
  -- (a) existence d'au moins une ligne du tour retenu
  SELECT RAISE(ABORT, 'Aucun détail de comptage pour le tour retenu (FIN-LOT5-013).')
  WHERE NOT EXISTS (
    SELECT 1
    FROM cloture_caisse AS c
    JOIN detail_comptage_caisse AS d
      ON d.id_cloture_caisse = c.id_cloture_caisse
     AND d.numero_comptage = c.numero_comptage_retenu
    WHERE c.id_session_caisse = NEW.id_session_caisse
  );
  -- (b) egalite arithmetique stricte somme(quantite * valeur) = montant_physique_fcfa
  SELECT RAISE(ABORT, 'Concordance arithmetique du comptage en echec (FIN-LOT5-013).')
  WHERE EXISTS (
    SELECT 1
    FROM cloture_caisse AS c
    WHERE c.id_session_caisse = NEW.id_session_caisse
      AND COALESCE((
        SELECT SUM(d.quantite * d.valeur_unitaire_fcfa)
        FROM detail_comptage_caisse AS d
        WHERE d.id_cloture_caisse = c.id_cloture_caisse
          AND d.numero_comptage = c.numero_comptage_retenu
      ), 0) <> c.montant_physique_fcfa
  );
END;
```

**Ordre des triggers sur `session_caisse` :** `trg_cloture_comptage_concordance` (BEFORE UPDATE OF etat) et `trg_session_caisse_cloturee_immutable` (BEFORE UPDATE, WHEN OLD.etat='CLOTUREE') — **compatibles** : lors du scellement `OLD.etat='OUVERTE'` donc le second ne s'arme pas ; après scellement, le premier ne se réarme pas (`OLD.etat='CLOTUREE'`). SQLite exécute les triggers BEFORE dans l'ordre de création — la concordance doit être vérifiée **avant** tout autre garde ; à fixer à l'implémentation (recommandation : créer `trg_cloture_comptage_concordance` avant ou après sans impact fonctionnel, les deux RAISE ABORT).

### 5.5 Assertions de test proposées — migration 007

- **7.1/7.2 (D-1/Q-05) :** deux sessions `OUVERTE` sur le même `id_poste_caisse` → seconde rejetée (index partiel) ; une session `CLOTUREE` + une `OUVERTE` sur le même poste → acceptées ; même caissier/appareil sur postes différents → acceptés (pas de contrainte Q-05 élargie).
- **7.3/immutabilité (R-6/D-5) — assertions explicites exigées :**
  - **(i)** `UPDATE session_caisse SET etat='CLOTUREE'` réussit **alors que la ligne `cloture_caisse` existe déjà** (séquence Option C : INSERT cloture → INSERT détails → UPDATE etat) ;
  - **(ii)** après scellement, **toute** modification de la session échoue — y compris `UPDATE session_caisse SET etat='OUVERTE'` (réouverture impossible), `UPDATE fonds_initial_fcfa`, etc.
- **7.4/7.5 (D-2/D-3/GAP-14) :** `sens`/`type_mouvement` hors domaine rejetés ; `REMBOURSEMENT` sans `id_operation_source` rejeté ; second `REMBOURSEMENT` même `(id_operation_source, id_session_caisse)` rejeté ; `DELETE` rejeté ; `UPDATE` sur session `CLOTUREE` rejeté ; INSERT mouvement après INSERT `cloture_caisse` (fenêtre R-3) rejeté ; `id_operation_source` **sans FK** (vérifier `PRAGMA foreign_key_list(mouvement_caisse)` ne contient que `session_caisse`).
- **7.6/7.7/7.12 (D-5 Option C, Q-07/Q-08, FIN-LOT5-013) :** second `cloture_caisse` même session rejeté (UNIQUE) ; `ecart_fcfa ≠ montant_physique - solde_theorique` rejeté ; UPDATE/DELETE `cloture_caisse` rejetés ; INSERT détail avec `numero_comptage` dupliqué même valeur rejeté ; UPDATE/DELETE détail rejetés ; INSERT détail après `etat='CLOTUREE'` rejeté (17ᵉ trigger) ; scellement avec tour retenu absent → rejet ; scellement avec somme ≠ `montant_physique_fcfa` → rejet ; scellement avec somme conforme → succès ; `valeur_unitaire_fcfa` hors `ref_coupure_xaf` rejeté (FK) ; `montant_total_ligne_fcfa` calculée correctement.
- **7.8 (D-6a/D-6b) :** `ref_coupure_xaf` contient exactement 9 lignes actives ≥ 25 FCFA ; `type_coupure='BILLET ET PIECE'` pour 500 ; UPDATE/DELETE sur `ref_coupure_xaf` **non** interdits (R-4, mutable).
- **7.9 (D-10/D-11) :** `id_session_destination = id_session_source` rejeté ; destination NULL sans `id_responsable_reception`/`nom_responsable_snapshot` rejeté ; `etat='RECUE'` sans `montant_recu_fcfa`/`date_reception` rejeté ; UPDATE des champs d'émission après `EMISE` rejeté ; UPDATE quelconque après `RECUE`/`ECART_CONSTATE` rejeté ; UPDATE `montant_recu_fcfa`/`date_reception` pendant `EMISE`→`RECUE` autorisé (transition).
- **7.10 (D-4/GAP-15) :** second `est_definitif=1` même session rejeté ; UPDATE/DELETE rapprochement rejetés ; insertion directe `est_definitif=1` acceptée.
- **7.11 (GAP-16) :** UPDATE/DELETE justification rejetés.
- **Révision d'assertions existantes (§4.3 du mandat) — `007-gestion-caisse.test.ts` :**
  - `insererCloture`/`insererSession` : les INSERT à colonnes positionnelles (`INSERT INTO session_caisse VALUES (...)`, `INSERT INTO cloture_caisse VALUES (...)`, `INSERT INTO mouvement_caisse VALUES (?, ?, ?)`, `INSERT INTO transmission_fonds VALUES` à 4 colonnes, `INSERT INTO rapprochement_caisse VALUES (?, ?)`, `INSERT INTO justification_ecart_caisse VALUES (?, ?)`) **cassent** dès que des colonnes NOT NULL sans défaut ou des réorganisations surviennent — **réécriture obligatoire** en INSERT nommés ;
  - test « fige l'instantané de clôture… » : `expect(insererCloture("cloture-2","session-1")).not.toThrow()` **deviendra faux** (UNIQUE `id_session_caisse`) → inverser ;
  - `UPDATE session_caisse SET fonds_initial_fcfa=11000` après clôture : aujourd'hui rejeté par trigger existence-based ; après retiming `OLD.etat='CLOTUREE'`, la session n'est `CLOTUREE` que si le test la scelle explicitement — **adapter le test** pour sceller puis tenter la mutation (assertion (ii) ci-dessus) ;
  - test « n'attache pas les opérations sans incidence… » : assertions `PRAGMA table_info(mouvement_caisse)` — `id_operation_source` **ajouté** (polymorphe, sans FK) : les assertions `not.toContain('id_remboursement_fonds')` restent vraies ; ajouter assertion `foreignKeys` = `['session_caisse']` uniquement (déjà présente) ;
  - test « transmission par un événement unique » : `UPDATE transmission_fonds SET montant_recu_fcfa` pendant `EMISE` — avec le trigger D-11, la transition `EMISE → RECUE` exige `etat_transmission` + `date_reception` : **adapter** l'UPDATE pour renseigner le cycle complet ;
  - `schema-integration.test.ts` et tests 003-006, 008-013 : vérifier les comptages d'objets (tables/triggers/index) si des assertions de inventaire existent.

### 5.6 Risques et points de gouvernance — migration 007

- **G-15 :** noms des triggers append-only `detail_comptage_caisse` : le DDL réel utilise `trg_detail_comptage_caisse_immutable_update/delete` ; docs/19 §5 exige `trg_detail_comptage_no_update`/`no_delete`. Le plan retient les **noms cibles docs/19** (DROP + CREATE) — les noms docs/19 font foi ; signalé pour traçabilité.
- **G-16 :** `poste_caisse`/`appareil`/`session_caisse` : colonnes cibles absentes (`code_poste`, `designation`, `est_actif`, `numero_serie`, `nom_machine`, `est_autorise`, `id_caissier`, `date_ouverture`) alors que docs/19 §8 les déclare « Conforme » — **contradiction §8 vs DDL réel** ; non couvertes par un delta ferme → gouvernance. NOT NULL sans défaut → backfill/rebuild à arbitrer (§7.4).
- **G-17 :** sort du trigger `trg_mouvement_caisse_session_cloturee_update` (existence-based) : le conserver (cohérent fenêtre R-3) ou le retimer sur `etat='CLOTUREE'` comme `no_update_closed` — recommandation : conserver existence-based ; à confirmer.
- **G-18 :** backfill `transmission_fonds.date_envoi NOT NULL` : aucune date réelle n'existe — valeur sentinelle à arbitrer (date de migration documentée).
- **G-19 :** backfill `session_caisse.etat` : les sessions existantes avec `cloture_caisse` déjà insérée — les passer à `'CLOTUREE'` ou `'OUVERTE'` ? Effet sur `idx_session_active_poste` (deux sessions `'OUVERTE'` même poste → échec de création d'index) : **pré-contrôle obligatoire**.
- **Risque circularité Option C :** la séquence INSERT cloture → INSERT détails → UPDATE etat exige que `trg_session_caisse_cloturee_immutable` soit armé sur `OLD.etat='CLOTUREE'` (retimé) — sinon le scellement est bloqué par l'existence de la clôture (c'est pourquoi le retiming 7.3 est ferme et préalable).
- **Risque ordre de création :** `detail_comptage_caisse` référence `ref_coupure_xaf` → création de la table de référence **strictement avant** (ordre 5.4).
- **Risque seed :** `ref_coupure_xaf` est mutable (R-4) — le seed est une donnée initiale, pas du DDL ; sous stratégie β, l'INSERT seed fait partie de la migration corrective ; conventions du dépôt pour les données de référence à vérifier à l'implémentation (aucune table de seed existante dans 001-013 — à documenter).

---

## 6. Points transverses instruits (§4 du mandat)

### 6.1 Fenêtre clôture → scellement et mouvements `AJUSTEMENT` (§4.2)

- **Fait établi :** le DDL réel de 007 comporte `trg_mouvement_caisse_session_cloturee_insert` (`BEFORE INSERT`, garde existence-based sur `cloture_caisse`) et `trg_mouvement_caisse_session_cloturee_update` (idem pour UPDATE).
- **Règle R-3 gelée (docs/19 §9 B.8.5) :** aucune nouvelle écriture dans `mouvement_caisse` dès l'insertion de l'enregistrement `cloture_caisse`.
- **Conclusion du plan :** la garde existence-based existante est **conforme par défaut** — option (i) recommandée : elle couvre la fenêtre dès l'ouverture de la clôture, **plus strictement** que R-3 (qui interdit déjà toute écriture dès l'INSERT de clôture). Aucune retime sur `etat='CLOTUREE'` n'est proposée (option ii recevable seulement sur amendement de R-3 — non sollicité).
- **`AJUSTEMENT` dans la fenêtre :** le type `AJUSTEMENT` existe dans le domaine cible de `type_mouvement`, mais R-3 interdit **toute** écriture pendant la fenêtre — un ajustement éventuel ne peut intervenir qu'**après** scellement… ce qui est également interdit par `trg_mouvement_caisse_no_update_closed`/`no_delete` et par l'immutabilité post-clôture. **Si une règle `FIN-LOT5` exigeait un `AJUSTEMENT` dans la fenêtre ou post-clôture, ce serait un point de gouvernance** — à ce stade, aucune règle `FIN-LOT5` citée n'exige d'écriture de mouvement après ouverture de clôture ; le plan retient la lecture stricte R-3 sans trancher au-delà (cf. G-17 pour le sort du trigger UPDATE existence-based, par cohérence).

### 6.2 Compatibilité des tests existants (§4.3)

Inventaire des assertions verrouillant l'état actuel et à réviser à l'implémentation (aucune modification dans la présente mission) :

| Fichier test | Assertions concernées | Révision requise |
|---|---|---|
| `007-gestion-caisse.test.ts` | INSERT positionnels `session_caisse`/`cloture_caisse`/`mouvement_caisse`/`transmission_fonds`/`rapprochement_caisse`/`justification_ecart_caisse` | Réécriture en INSERT nommés (colonnes ajoutées) |
| `007-gestion-caisse.test.ts` | `expect(insererCloture("cloture-2","session-1")).not.toThrow()` | **Inverser** — UNIQUE `(id_session_caisse)` |
| `007-gestion-caisse.test.ts` | `UPDATE session_caisse SET fonds_initial_fcfa=11000` rejeté après clôture | Adapter : sceller explicitement (`etat='CLOTUREE'`) puis tenter — assertion (ii) R-6 |
| `007-gestion-caisse.test.ts` | `UPDATE transmission_fonds SET montant_recu_fcfa` seul | Compléter le cycle `EMISE→RECUE` (`etat_transmission`, `date_reception`) — trigger D-11 |
| `007-gestion-caisse.test.ts` | `PRAGMA table_info(mouvement_caisse)` / `foreign_key_list` | `id_operation_source` ajouté, toujours sans FK — assertions à enrichir |
| `005-echeanciers-reglements.test.ts` | INSERT plans/échéances | Valides grâce aux défauts `etat_plan`/`type_plan` ; ajouter assertions D-8/Q-03 |
| `006-encaissements-credits-mobile-money.test.ts` | INSERT `mouvement_credit`/`affectation_reglement` | CHECK XOR réel plus laxiste que Q-09 — assertion « les deux origines » à ajouter après arbitrage G-13 |
| `003/004-*.test.ts` | INSERT tarif/créance | Inchangés tant que G-02/G-06 ne sont pas arbitrés ; à réviser si refonte |
| `schema-integration.test.ts` | Inventaire tables/triggers/index | Mettre à jour les comptages (30 tables / 17 triggers / 14 index nommés cible) |
| Tests 008-013 | Frontières Lots 6-7, eleves, inscriptions | Vérifier l'absence d'impact (008 : `id_operation_source` polymorphe sans FK — aucun DDL Lot 6 modifié) |

### 6.3 Colonnes `NOT NULL` ajoutées sur tables susceptibles de porter des lignes (§4.4)

| Colonne | Table | Défaut proposé | Données réelles possibles ? | Stratégie |
|---|---|---|---|---|
| `etat` | `session_caisse` | `'OUVERTE'` | Oui (sessions existantes) | Backfill `'OUVERTE'` ; **pré-contrôle** : sessions avec `cloture_caisse` → `'CLOTUREE'` ? (G-19) ; risque index partiel si 2 `'OUVERTE'`/poste |
| `numero_comptage_retenu` | `cloture_caisse` | `1` | Oui | Backfill `1` (tour unique existant) |
| `est_definitif` | `rapprochement_caisse` | `0` | Oui | Backfill `0` — **attention** : si une ligne existante était le « définitif » de fait, l'index partiel n'est pas violé (0 partout) mais la sémantique est perdue → backfill documenté ou arbitrage |
| `etat_plan`/`type_plan` | `plan_reglement_creance` | `'ACTIF'`/`'INITIAL'` | Oui | Backfill ; **pré-contrôle multi-plans par créance** avant index partiel |
| `statut_echeance` | `echeance_creance` | `'NON_SOLDEE'` | Oui | Backfill ; mapping depuis `etat_administratif` réel à définir (G-10) |
| `montant_total_ligne_fcfa` | `detail_comptage_caisse` | GENERATED | Oui | Recalcul automatique à la reconstruction |
| `etat_transmission` | `transmission_fonds` | `'EMISE'` | Oui | Backfill ; `date_envoi` sentinelle (G-18) |
| `sens`/`type_mouvement`/`date_mouvement` | `mouvement_caisse` | **aucun défaut sûr** | Oui | **Problème majeur** : `NOT NULL` sans défaut → backfill impossible sans règle métier (deviner `sens`/`type`/`date` des mouvements existants) → **gouvernance G-20** : soit reconstruction avec valeurs sentinelles documentées, soit arbitrage sur traitement des mouvements legacy |
| `date_rapprochement`, `solde_theorique_calcule_fcfa`, `montant_physique_confronte_fcfa`, `ecart_constate_fcfa`, `superviseur` | `rapprochement_caisse` | **aucun** | Oui | Idem — valeurs sentinelles ou arbitrage (G-20) |
| `motif_ecart`, `auteur`, `date_justification` | `justification_ecart_caisse` | **aucun** | Oui | Idem (G-20) |
| `id_responsable_reception`, `nom_responsable_snapshot` | `transmission_fonds` | NULL | Oui | Nullable — OK si `id_session_destination` backfillée non NULL ; sinon CHECK traçabilité violé → pré-contrôle |

**Règle générale :** sous stratégie β, **toute base déployée avec des lignes** dans les tables reconstruites exige un backfill documenté par colonne ; si une colonne `NOT NULL` cible n'a pas de source de backfill évidente, le plan ne tranche pas — point de gouvernance G-20. Sous stratégie α (base à blanc), aucune donnée n'existe : non-sujet.

---

## 7. Inventaire consolidé cible et ordre global

### 7.1 Inventaire cible (réconciliation docs/19 v1.0 §10)

**Tables : 30** (29 métier + `ref_coupure_xaf`)

| Migration | Tables cibles | Détail |
|---|---|---|
| 001-002 | (hors périmètre correctif) | `annee_scolaire`, `niveau_enseignement`, `classe_annuelle`, etc. — préexistantes, référencées |
| 003 | 5 | `type_frais`, `periodicite`, `tarif`, `politique_remise`, `attribution_remise` |
| 004 | 4 | `periode_facturation`, `campagne_facturation`, `execution_campagne`, `creance` |
| 005 | 7 | `modele_echeancier`, `version_modele`, `ligne_modele`, `plan_reglement_creance`, `reamenagement_echeancier`, `echeance_creance`, `evenement_echeance` |
| 006 | 4 | `encaissement`, `mouvement_credit`, `affectation_reglement`, `transaction_mobile_money` |
| 007 | 10 | `poste_caisse`, `appareil`, `session_caisse`, `mouvement_caisse`, `cloture_caisse`, `detail_comptage_caisse`, `ref_coupure_xaf`, `transmission_fonds`, `rapprochement_caisse`, `justification_ecart_caisse` |
| **Total Lots 1-5** | **30** | 5+4+7+4+10 = 30 ✓ (réconcilié avec docs/19 §10.2 ; `execution_campagne` et `version_modele`/`ligne_modele`/`evenement_echeance` selon nommage cible — divergences de nommage réel signalées G-07/G-10) |

**Triggers : 17** (docs/19 §5)

| # | Trigger | Migration | Statut dans le plan |
|---|---|---|---|
| 1 | `trg_attribution_remise_check_overlap` | 003 | Gouvernance (Q-02, G-04) |
| 2 | `trg_creance_immutable_snapshots` | 004 | Existant `trg_creance_snapshot_immutable` — renommage/alignement gouvernance G-06 |
| 3 | `trg_plan_somme_echeances` | 005 | **Ferme** (sous réserve Q-03) |
| 4-5 | `trg_affectation_no_update`/`no_delete` | 006 | Ferme partiel (G-13) |
| 6 | `trg_mouvement_caisse_no_delete` | 007 | **Ferme** |
| 7 | `trg_mouvement_caisse_no_update_closed` | 007 | **Ferme** |
| 8 | `trg_session_caisse_cloturee_immutable` | 007 | **Ferme** (retiming R-6) |
| 9 | `trg_cloture_comptage_concordance` | 007 | **Ferme** (16ᵉ) |
| 10 | `trg_detail_comptage_no_insert_closed` | 007 | **Ferme** (17ᵉ) |
| 11-12 | `trg_detail_comptage_no_update`/`no_delete` | 007 | **Ferme** (renommage G-15) |
| 13 | `trg_transmission_figee_reception` | 007 | **Ferme** (D-11) |
| 14-15 | `trg_rapprochement_caisse_no_update`/`no_delete` | 007 | **Ferme** (D-4) |
| 16-17 | `trg_justification_ecart_no_update`/`no_delete` | 007 | **Ferme** (GAP-16) |

+ triggers réels conservés hors inventaire cible : `trg_type_frais_*`, `trg_periodicite_*`, `trg_tarif_*`, `trg_classe_annee_tarif_coherente`, `trg_politique_remise_*`, `trg_attribution_remise_validite_*`, `trg_creance_*`, `trg_version_modele_utilisee_immutable`, `trg_echeance_historique_non_supprimable`, `trg_cloture_caisse_immutable_*`, `trg_mouvement_caisse_session_cloturee_*` (fenêtre R-3), `trg_encaissement_no_delete` — **leur sort est à arbitrer avec les gouvernances** (conservation par défaut sauf mention contraire).

**Index nommés : 14** (docs/19 §6)

| Index | Migration | Statut |
|---|---|---|
| `idx_creance_eleve_annee` | 004 | Existant réel ✓ (nom identique) |
| `idx_creance_etat_active` | 004 | Gouvernance (domaine `etat_creance` cible) |
| `idx_attribution_eleve_politique` | 003 | Gouvernance (modèle attribution divergent) |
| `idx_plan_creance_actif` | 005 | **Ferme** (partiel unique) |
| `idx_echeance_plan_rang` | 005 | Gouvernance (unicité plan/rang) |
| `idx_affectation_creance` | 006 | Ferme partiel (G-13) |
| `idx_affectation_echeance` | 006 | Ferme partiel (G-13) |
| `idx_affectation_encaissement` | 006 | Existant `idx_affectation_reglement_encaissement` — renommage gouvernance |
| `idx_session_active_poste` | 007 | **Ferme** (partiel unique) |
| `idx_mouvement_remboursement_unique` | 007 | **Ferme** (partiel unique) |
| `idx_mouvement_session` | 007 | **Ferme** |
| `idx_detail_comptage_tour` | 007 | **Ferme** |
| `idx_transmission_source_dest` | 007 | **Ferme** |
| `idx_rapprochement_definitif` | 007 | **Ferme** (partiel unique) |

### 7.2 Ordre global d'application (stratégie β — migration corrective unique `014`)

1. **Pré-contrôles** (lecture seule, §7.4) : multi-plans par créance, sessions `'OUVERTE'` multiples par poste, mouvements legacy sans source de backfill, transmissions sans date.
2. `ref_coupure_xaf` (CREATE + seed) — **premier** (FK cible).
3. Migration 003 : aucune correction ferme → selon arbitrages G-02..G-05.
4. Migration 004 : selon arbitrages G-06..G-08 (après 011/013 si FKs externes — **contrat §7 docs/19** : la corrective interviendra après la migration 013 ou conditionnera les FK).
5. Migration 005 : reconstruction `plan_reglement_creance` → `idx_plan_creance_actif` → reconstruction `echeance_creance` → `trg_plan_somme_echeances`.
6. Migration 006 : `trg_encaissement_no_delete` (autonome) + corrections selon G-12..G-14.
7. Migration 007 : `session_caisse` (etat + index + retiming trigger) → `cloture_caisse` → `detail_comptage_caisse` → `mouvement_caisse` (+gardes R-3) → `transmission_fonds` → `rapprochement_caisse` → `justification_ecart_caisse` → triggers `trg_cloture_comptage_concordance`, `trg_detail_comptage_no_insert_closed`.
8. **Stratégie α alternative :** si aucune base déployée confirmée, les mêmes DDL sont intégrés directement dans les gabarits 003-007 (ordre interne identique) et la chaîne 001→013 est réexécutée en test.

### 7.3 Plan de revalidation (étape 6)

1. `npx vitest run` — les 16 fichiers de tests doivent passer après révision des assertions listées §6.2.
2. Test d'intégration `schema-integration.test.ts` — inventaire 30 tables / 17 triggers / 14 index nommés.
3. Test fonctionnel de la séquence Option C de bout en bout : ouverture session → mouvements → INSERT cloture → INSERT détails (tour retenu) → UPDATE `etat='CLOTUREE'` (concordance OK) → tentative réouverture rejetée.
4. Test de non-régression Lots 6-7 (008/009) : `id_operation_source` sans FK, aucun DDL Lot 6 modifié.
5. Exécution réelle sur base SQLite (sqlite-wasm) — hors tests `:memory:` — à l'étape 6 du mandat d'implémentation.

### 7.4 Pré-contrôles obligatoires avant application (stratégie β)

- `SELECT id_creance, COUNT(*) FROM plan_reglement_creance GROUP BY id_creance HAVING COUNT(*) > 1` — bloque `idx_plan_creance_actif` si backfill `ACTIF` global.
- `SELECT id_poste_caisse, COUNT(*) FROM session_caisse WHERE etat='OUVERTE' GROUP BY id_poste_caisse HAVING COUNT(*) > 1` — bloque `idx_session_active_poste`.
- Sessions avec `cloture_caisse` existante : décision backfill `etat` (G-19).
- Mouvements/rapprochements/justifications legacy : colonnes `NOT NULL` sans source de backfill (G-20).
- Transmissions legacy : `id_session_destination`/`date_envoi`/`etat_transmission` backfill (G-18).

---

## 8. Points de gouvernance consolidés

| Réf. | Objet | Question pour le propriétaire |
|---|---|---|
| **G-01** | Bases déployées | Confirmer l'existence ou non de bases OPFS (utilisateurs, démo, tests persistés) — conditionne le choix α/β |
| **G-02** | `tarif` (003) | Divergence structurelle (portée `type_portee`, `montant_brut_fcfa`, `est_applicable`, FK `filiere`) vs cible §3.3 — refonte à arbitrer |
| **G-03** | `politique_remise` (003) | `valeur_remise TEXT`/`forme_remise` vs `taux_pourcentage`/`montant_fixe_fcfa` XOR — refonte à arbitrer |
| **G-04** | `attribution_remise` (003) | Modèle réel (motif, fratrie, annulation) vs cible (`etat_attribution`, validités, Q-02) — refonte à arbitrer |
| **G-05** | `type_frais`/`periodicite` (003) | Colonnes cibles absentes (`id_periodicite_defaut`, `nombre_echeances_defaut`, CHECK trim) — à ajouter ? |
| **G-06** | `creance` (004) | Refonte majeure modèle snapshot vs canonique + FKs Q-01 (post-011/013) — arbitrage requis |
| **G-07** | `campagne_facturation`/`execution_campagne` (004) | Renommage `execution_campagne_facturation`→`execution_campagne`, colonnes cibles absentes |
| **G-08** | Ordonnancement FKs externes | La corrective 004 suppose-t-elle une insertion après migration 013 ? |
| **G-09** | Nom index plan actif | Confirmé : `idx_plan_creance_actif` (docs/19 v1.0 fait foi sur `idx_plan_actif_par_creance` du mandat) |
| **G-10** | `echeance_creance`/`evenement_echeance`/`reamenagement`/`modele_*` (005) | Sort de `etat_administratif`, nommage `version_modele*`, colonnes cibles absentes |
| **G-11** | FK composite plan/échéance | Cohérence `UNIQUE (plan, rang)` vs FK composite existante |
| **G-12** | `mouvement_credit` (006) | docs/19 §8 « Conforme » contredit par le DDL réel — corriger la matrice ou le DDL ? |
| **G-13** | Matérialisations Q-04/Q-09/Arbitrages 1-2-5/FIN-LOT5-035 (006) | Statut ferme retenu au titre de docs/19 §4/§8 — confirmation si lecture restrictive du §3 du mandat |
| **G-14** | `transaction_mobile_money` (006) | Domaines d'états incompatibles + colonnes absentes — mapping de données requis |
| **G-15** | Noms triggers détail comptage | `trg_detail_comptage_caisse_immutable_*` → `trg_detail_comptage_no_*` (DROP+CREATE) — confirmé |
| **G-16** | `poste_caisse`/`appareil`/`session_caisse` colonnes | docs/19 §8 « Conforme » contredit — colonnes cibles absentes (`code_poste`, `id_caissier`, `date_ouverture`…) |
| **G-17** | `trg_mouvement_caisse_session_cloturee_update` | Conserver existence-based (recommandé, cohérent R-3) ou retimer `etat='CLOTUREE'` |
| **G-18** | Backfill `transmission_fonds.date_envoi` | Valeur sentinelle à définir |
| **G-19** | Backfill `session_caisse.etat` | Sessions legacy avec clôture : `'CLOTUREE'` ou `'OUVERTE'` ? |
| **G-20** | Colonnes NOT NULL sans backfill | `mouvement_caisse` (sens/type/date), `rapprochement_caisse`, `justification_ecart_caisse` : valeurs sentinelles, reconstruction à blanc, ou arbitrage métier |

**Total : 20 points de gouvernance** (G-01 à G-20) — aucun n'est tranché par le présent plan.

---

## 9. Verdict

**PLAN DE CORRECTION DES MIGRATIONS 003-007 PRODUIT** — aucune application, aucune SQL — **régime A, commit dédié `docs/20`** — deltas fermes : **12** (7.1-7.12 sur migration 007 ; 5.1-5.4 sur migration 005 ; 6.2 trigger `encaissement` ; B.1/D-7 énumérations listées ; B.3/D-9 consigné hors DDL) — points instruits : **4** (§4.1 stratégies α/β avec recommandation β, §4.2 fenêtre R-3 option i, §4.3 inventaire des tests à réviser, §4.4 colonnes NOT NULL/backfill) — points de gouvernance : **20** (G-01 à G-20) — **prêt pour examen du propriétaire**.

*Note de diagnostic jointe (point 5 de l'ordre d'exécution) : le run `vitest` a été ré-exécuté au commit de base — **120/120 tests passent, exit code 0** ; le code 1 observé précédemment provenait d'un artefact PowerShell `NativeCommandError` lié à la redirection `2>&1` du stderr (journalisation attendue des tests négatifs `SQLITE_CONSTRAINT_*`), et non d'un échec de test. Aucun test n'a échoué.*




