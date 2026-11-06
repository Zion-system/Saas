# 19 — Modèle Physique de Données (MPD) Financier SQLite — Lots 1 à 5

**Version :** 0.1  
**Date :** 07/11/2026  
**Statut :** Proposition fondée sur VAL-017 — En attente de ratification des propositions B.1 à B.10  
**Périmètre :** Domaine Financier — Lots 1 à 5 (29 tables physiques)  
**Référence normative :** Décision propriétaire VAL-017 prononcée le 07/11/2026 (`docs/07 §10`), MLD financier reconstitué validé (`docs/18`), DDL réel des migrations 003 à 007 (`src/database/migrations/`).

---

## 1. En-tête normatif et cadre de référence

Le présent Modèle Physique de Données (MPD) traduit la cible logique et relationnelle validée sous **VAL-017 avec réserves** le 07/11/2026 (`docs/07 §10`) en spécifications d'ingénierie physique pour le moteur de base de données **SQLite WASM + OPFS** (VAL-004).

### 1.1 Régime du document
- **Nature :** Document de conception physique pure (aucune exécution SQL, aucune modification des fichiers de migration existants).
- **Statut :** Proposition technique d'architecture physique soumise à l'approbation du propriétaire.
- **Préalable formel :** Ce MPD constitue le document de référence préalable obligatoire au futur mandat de confection du plan correctif des migrations 003 à 007.

### 1.2 Réserves normatives intégrées
Conformément au procès-verbal de validation VAL-017 (`docs/07 §10`) :
1. **Réserve VAL-016 :** Le MPD matérialise la reconstitution traçable et ordonnée des tables financières ; il ne prétend pas reconstituer les fichiers sources originaux perdus.
2. **Réserve Q-03 :** Le lien direct entre le montant total du plan initial (`montant_total_planifie_fcfa`) et le montant net de la créance (`montant_net_initial_fcfa`), ainsi que la lecture exacte du terme « plusieurs échéances », demeurent sous réserve Q-03.
3. **Réserve Offline-First (B.4 / VAL-014) :** Les règles d'arbitrage central des conflits concurrents relèvent du serveur (VAL-014) ; le MPD local ne met en œuvre aucune règle de dernière écriture gagnante (pas de LWW) et consigne les ouvertures conflictuelles.

---

## 2. Conventions physiques générales

### 2.1 Types de données SQLite
SQLite utilisant un typage dynamique (« type affinity »), les colonnes sont normalisées selon les affinités strictes suivantes :
- **Identifiants primaires et étrangers :** Affinité `TEXT`, formatés en chaînes UUID canoniques v4 (36 caractères en minuscules avec tirets, ex. `550e8400-e29b-41d4-a716-446655440000`).
- **Montants monétaires :** Affinité `INTEGER`. Tous les montants sont exprimés en Francs CFA (FCFA) entiers, sans subdivision centimale. Ils sont systématiquement assortis d'une contrainte `CHECK (typeof(colonne) = 'integer')` et bornés selon le contexte métier :
  - `CHECK (montant >= 0)` pour les montants autorisant le solde nul ou les totaux de référence.
  - `CHECK (montant > 0)` pour les montants strictement positifs requis par les arbitrages (échéances exigibles, affectations nettes, fonds envoyés).
- **Quantités et dénombrements :** Affinité `INTEGER`, `CHECK (typeof(colonne) = 'integer' AND colonne >= 0)`.
- **Rangs et numéros de tours :** Affinité `INTEGER`, `CHECK (typeof(colonne) = 'integer' AND colonne > 0)`.
- **Indicateurs booléens :** Affinité `INTEGER`, contrainte stricte `CHECK (colonne IN (0, 1))`.
- **Chaînes descriptives et libellés :** Affinité `TEXT`, nettoyées par `CHECK (length(trim(colonne)) > 0)` lorsqu'elles sont obligatoires.

### 2.2 Horodatage et calendrier
Conformément au standard unifié observé dans les migrations de référence 003 à 007 (`[Vérifié contre le DDL réel]`) :
- **Dates de calendrier civil (`YYYY-MM-DD`) :** Type `TEXT NOT NULL`, validées par la fonction native SQLite :
  `CHECK (date(colonne, '+0 days') IS NOT NULL AND date(colonne, '+0 days') = colonne)`.
- **Horodatages précis (instants ISO-8601 UTC) :** Type `TEXT NOT NULL`, formatés en `YYYY-MM-DDTHH:MM:SSZ` ou `YYYY-MM-DD HH:MM:SS`.

### 2.3 Conventions de nommage physique
- Tables : `snake_case` au singulier (ex. `type_frais`, `creance`, `session_caisse`).
- Clés primaires : préfixées par `id_` suivi du nom de la table (ex. `id_creance`).
- Clés étrangères : nom identique à la clé primaire de la table parente ciblée (ex. `id_session_caisse`), sauf en cas de rôles multiples sur la même table parente où un suffixe qualificatif est ajouté (ex. `id_session_source`, `id_session_destination`).
- Colonnes de montants : suffixées par `_fcfa` (ex. `montant_exigible_fcfa`).

---

## 3. Spécification détaillée table par table (29 tables)

### LOT 1 — CATALOGUE DES FRAIS ET TARIFICATION (Migration 003)

#### Table 1.1 : `type_frais`
Référentiel des catégories de frais scolaires administrés par l'établissement.
- **Colonnes :**
  - `id_type_frais` : `TEXT PRIMARY KEY` (UUID).
  - `code_type_frais` : `TEXT NOT NULL` (Code d'affaires stable, ex. `'SCOLARITE'`, `'INSCRIPTION'`).
  - `libelle` : `TEXT NOT NULL` (Libellé descriptif).
  - `description` : `TEXT NULL`.
  - `est_actif` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1))`.
  - `id_periodicite_defaut` : `TEXT NULL REFERENCES periodicite(id_periodicite) ON UPDATE RESTRICT ON DELETE RESTRICT`.
- **Contraintes :**
  - `UNIQUE (code_type_frais)`.
  - `CHECK (length(trim(code_type_frais)) > 0)`.
  - `CHECK (length(trim(libelle)) > 0)`.

#### Table 1.2 : `periodicite`
Nomenclature des cadences temporelles de paiement des frais.
- **Colonnes :**
  - `id_periodicite` : `TEXT PRIMARY KEY` (UUID).
  - `code_periodicite` : `TEXT NOT NULL` (ex. `'MENSUEL'`, `'TRIMESTRIEL'`, `'ANNUEL'`).
  - `libelle` : `TEXT NOT NULL`.
  - `nombre_echeances_defaut` : `INTEGER NOT NULL CHECK (nombre_echeances_defaut > 0)`.
- **Contraintes :**
  - `UNIQUE (code_periodicite)`.

#### Table 1.3 : `tarif`
Grille tarifaire associant un montant à un type de frais pour une année scolaire et une portée donnée.
- **Colonnes :**
  - `id_tarif` : `TEXT PRIMARY KEY` (UUID).
  - `id_type_frais` : `TEXT NOT NULL REFERENCES type_frais(id_type_frais) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_periodicite` : `TEXT NOT NULL REFERENCES periodicite(id_periodicite) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_filiere` : `TEXT NULL REFERENCES filiere(id_filiere) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Interface externe)*.
  - `montant_tarif_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_tarif_fcfa) = 'integer' AND montant_tarif_fcfa >= 0)`.
  - `date_debut_effet` : `TEXT NOT NULL CHECK (date(date_debut_effet, '+0 days') = date_debut_effet)`.
  - `date_fin_effet` : `TEXT NULL CHECK (date_fin_effet IS NULL OR (date(date_fin_effet, '+0 days') = date_fin_effet AND date_fin_effet > date_debut_effet))`.
  - `est_applicable` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_applicable IN (0, 1))`.
- **Contraintes :**
  - `CHECK (date_fin_effet IS NULL OR date_fin_effet > date_debut_effet)`.
  - Trigger d'intégrité interdisant le chevauchement de tarifs applicables pour un même type de frais, une même année et une même portée (`LOT1-01 à LOT1-04`).

#### Table 1.4 : `politique_remise`
Règles d'abattement et politiques d'exonération de frais.
- **Colonnes :**
  - `id_politique_remise` : `TEXT PRIMARY KEY` (UUID).
  - `code_politique` : `TEXT NOT NULL UNIQUE CHECK (length(trim(code_politique)) > 0)`.
  - `libelle` : `TEXT NOT NULL CHECK (length(trim(libelle)) > 0)`.
  - `nature_remise` : `TEXT NOT NULL CHECK (nature_remise IN ('POURCENTAGE', 'FORFAIT'))`.
  - `taux_pourcentage` : `INTEGER NULL CHECK (taux_pourcentage IS NULL OR (taux_pourcentage > 0 AND taux_pourcentage <= 100))`.
  - `montant_forfait_fcfa` : `INTEGER NULL CHECK (montant_forfait_fcfa IS NULL OR montant_forfait_fcfa > 0)`.
  - `id_type_frais` : `TEXT NULL REFERENCES type_frais(id_type_frais) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `cumulable` : `INTEGER NOT NULL DEFAULT 0 CHECK (cumulable IN (0, 1))`.
- **Contraintes :**
  - `CHECK ((nature_remise = 'POURCENTAGE' AND taux_pourcentage IS NOT NULL AND montant_forfait_fcfa IS NULL) OR (nature_remise = 'FORFAIT' AND montant_forfait_fcfa IS NOT NULL AND taux_pourcentage IS NULL))`.

#### Table 1.5 : `attribution_remise`
Octroi individuel d'une réduction financière à un élève pour une année scolaire.
- **Colonnes :**
  - `id_attribution_remise` : `TEXT PRIMARY KEY` (UUID).
  - `id_politique_remise` : `TEXT NOT NULL REFERENCES politique_remise(id_politique_remise) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_eleve` : `TEXT NOT NULL REFERENCES eleve(id_eleve) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Cible Q-01)*.
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_debut_validite` : `TEXT NOT NULL CHECK (date(date_debut_validite, '+0 days') = date_debut_validite)`.
  - `date_fin_validite` : `TEXT NULL CHECK (date_fin_validite IS NULL OR (date(date_fin_validite, '+0 days') = date_fin_validite AND date_fin_validite > date_debut_validite))`.
  - `etat_attribution` : `TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (etat_attribution IN ('ACTIVE', 'SUSPENDUE', 'ANNULEE'))`.
  - `motif_attribution` : `TEXT NULL`.
  - `date_annulation` : `TEXT NULL`.
  - `motif_annulation` : `TEXT NULL`.
- **Contraintes :**
  - `CHECK ((etat_attribution = 'ANNULEE' AND date_annulation IS NOT NULL AND motif_annulation IS NOT NULL) OR (etat_attribution != 'ANNULEE' AND date_annulation IS NULL))`.
  - **Matérialisation Q-02 :** Trigger `trg_attribution_remise_non_chevauchement` interdisant deux attributions actives dont les fenêtres `[date_debut_validite, date_fin_validite[` se chevauchent pour un même triplet `(id_eleve, id_politique_remise, id_annee_scolaire)`.

---

### LOT 2 — FACTURATION ET CRÉANCES (Migration 004)

#### Table 2.1 : `periode_facturation`
Fenêtres temporelles de découpage des émissions de factures.
- **Colonnes :**
  - `id_periode_facturation` : `TEXT PRIMARY KEY` (UUID).
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `code_periode` : `TEXT NOT NULL CHECK (length(trim(code_periode)) > 0)`.
  - `date_debut_periode` : `TEXT NOT NULL CHECK (date(date_debut_periode, '+0 days') = date_debut_periode)`.
  - `date_fin_periode` : `TEXT NOT NULL CHECK (date(date_fin_periode, '+0 days') = date_fin_periode AND date_fin_periode > date_debut_periode)`.
- **Contraintes :**
  - `UNIQUE (id_annee_scolaire, code_periode)`.

#### Table 2.2 : `campagne_facturation`
Paramétrage d'un lot d'émission groupée de créances.
- **Colonnes :**
  - `id_campagne_facturation` : `TEXT PRIMARY KEY` (UUID).
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_type_frais` : `TEXT NOT NULL REFERENCES type_frais(id_type_frais) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_periode_facturation` : `TEXT NOT NULL REFERENCES periode_facturation(id_periode_facturation) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `titre_campagne` : `TEXT NOT NULL CHECK (length(trim(titre_campagne)) > 0)`.
  - `etat_campagne` : `TEXT NOT NULL DEFAULT 'PREPAREE' CHECK (etat_campagne IN ('PREPAREE', 'EN_COURS', 'CLOTUREE', 'ANNULEE'))`.
  - `date_lancement` : `TEXT NULL`.
- **Contraintes :**
  - `UNIQUE (id_campagne_facturation, id_annee_scolaire)`.

#### Table 2.3 : `execution_campagne_facturation`
Historique d'exécution technique des vagues de facturation collective.
- **Colonnes :**
  - `id_execution_campagne` : `TEXT PRIMARY KEY` (UUID).
  - `id_campagne_facturation` : `TEXT NOT NULL REFERENCES campagne_facturation(id_campagne_facturation) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_execution` : `TEXT NOT NULL`.
  - `nombre_creances_generees` : `INTEGER NOT NULL DEFAULT 0 CHECK (nombre_creances_generees >= 0)`.
  - `montant_total_brut_fcfa` : `INTEGER NOT NULL DEFAULT 0 CHECK (montant_total_brut_fcfa >= 0)`.
  - `resultat_execution` : `TEXT NOT NULL CHECK (resultat_execution IN ('SUCCES', 'ECHEC_PARTIEL', 'ECHEC_TOTAL'))`.
  - `traces_erreurs` : `TEXT NULL`.

#### Table 2.4 : `creance`
Titre exécutoire individuel d'obligation financière scolaire.
- **Colonnes :**
  - `id_creance` : `TEXT PRIMARY KEY` (UUID).
  - `id_eleve` : `TEXT NOT NULL REFERENCES eleve(id_eleve) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-01, FK obligatoire)*.
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_type_frais` : `TEXT NOT NULL REFERENCES type_frais(id_type_frais) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_inscription` : `TEXT NULL REFERENCES inscription(id_inscription) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-01, nullable)*.
  - `id_affectation_classe` : `TEXT NULL REFERENCES affectation_classe(id_affectation_classe) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-01, nullable)*.
  - `id_periode_facturation` : `TEXT NULL REFERENCES periode_facturation(id_periode_facturation) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_tarif` : `TEXT NOT NULL REFERENCES tarif(id_tarif) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_periodicite` : `TEXT NOT NULL REFERENCES periodicite(id_periodicite) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_politique_remise` : `TEXT NULL REFERENCES politique_remise(id_politique_remise) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_attribution_remise` : `TEXT NULL REFERENCES attribution_remise(id_attribution_remise) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_execution_campagne` : `TEXT NULL REFERENCES execution_campagne_facturation(id_execution_campagne) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_evenement_declencheur` : `TEXT NULL` *(Identifiant stable Lot 8 / GAP-05)*.
  - `montant_brut_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_brut_fcfa) = 'integer' AND montant_brut_fcfa > 0)`.
  - `montant_remise_fcfa` : `INTEGER NOT NULL DEFAULT 0 CHECK (typeof(montant_remise_fcfa) = 'integer' AND montant_remise_fcfa >= 0)`.
  - `montant_net_initial_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_net_initial_fcfa) = 'integer' AND montant_net_initial_fcfa >= 0)`.
  - `etat_creance` : `TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (etat_creance IN ('ACTIVE', 'SUSPENDUE', 'ANNULEE'))`.
  - `date_emission` : `TEXT NOT NULL CHECK (date(date_emission, '+0 days') = date_emission)`.
  - `date_annulation` : `TEXT NULL`.
  - `motif_annulation` : `TEXT NULL`.
  - Snapshots tarifaires immuables : `code_periodicite_snapshot TEXT NOT NULL`, `type_portee_tarifaire_snapshot TEXT NOT NULL`, `nature_remise_snapshot TEXT NULL`, `taux_remise_snapshot INTEGER NULL`, `montant_forfait_remise_snapshot INTEGER NULL`.
- **Contraintes :**
  - `CHECK (montant_remise_fcfa <= montant_brut_fcfa)`.
  - `CHECK (montant_net_initial_fcfa = montant_brut_fcfa - montant_remise_fcfa)`.
  - `CHECK ((etat_creance = 'ANNULEE' AND date_annulation IS NOT NULL AND motif_annulation IS NOT NULL) OR (etat_creance != 'ANNULEE' AND date_annulation IS NULL))`.
  - **Triggers d'immutabilité :** Interdiction stricte de modifier les montants et snapshots d'une créance après émission (`FIN-LOT2-SNAPSHOT`).

---

### LOT 3 — ÉCHÉANCIERS ET PLANS DE RÈGLEMENT (Migration 005)

#### Table 3.1 : `modele_echeancier`
Définition d'un gabarit type de ventilation temporelle des paiements.
- **Colonnes :**
  - `id_modele_echeancier` : `TEXT PRIMARY KEY` (UUID).
  - `code_modele` : `TEXT NOT NULL UNIQUE CHECK (length(trim(code_modele)) > 0)`.
  - `libelle` : `TEXT NOT NULL`.
  - `est_actif` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1))`.

#### Table 3.2 : `version_modele_echeancier`
Versionnage horodaté d'un modèle d'échéancier garantissant la non-rétroactivité.
- **Colonnes :**
  - `id_version_modele_echeancier` : `TEXT PRIMARY KEY` (UUID).
  - `id_modele_echeancier` : `TEXT NOT NULL REFERENCES modele_echeancier(id_modele_echeancier) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `numero_version` : `INTEGER NOT NULL CHECK (numero_version > 0)`.
  - `date_version` : `TEXT NOT NULL`.
- **Contraintes :**
  - `UNIQUE (id_modele_echeancier, numero_version)`.

#### Table 3.3 : `ligne_modele_echeancier`
Ligne de proportion ou de découpage individuel d'un modèle.
- **Colonnes :**
  - `id_ligne_modele_echeancier` : `TEXT PRIMARY KEY` (UUID).
  - `id_version_modele_echeancier` : `TEXT NOT NULL REFERENCES version_modele_echeancier(id_version_modele_echeancier) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `rang` : `INTEGER NOT NULL CHECK (rang > 0)`.
  - `pourcentage_repartition` : `INTEGER NOT NULL CHECK (pourcentage_repartition > 0 AND pourcentage_repartition <= 100)`.
  - `delai_jours_exigibilite` : `INTEGER NOT NULL CHECK (delai_jours_exigibilite >= 0)`.
- **Contraintes :**
  - `UNIQUE (id_version_modele_echeancier, rang)`.

#### Table 3.4 : `plan_reglement_creance`
Engagement contractuel d'échéancier rattaché à une créance.
- **Colonnes :**
  - `id_plan_reglement_creance` : `TEXT PRIMARY KEY` (UUID).
  - `id_creance` : `TEXT NOT NULL REFERENCES creance(id_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_version_modele_echeancier` : `TEXT NULL REFERENCES version_modele_echeancier(id_version_modele_echeancier) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `type_plan` : `TEXT NOT NULL DEFAULT 'INITIAL' CHECK (type_plan IN ('INITIAL', 'REAMENAGE'))` *(Lien B.1)*.
  - `etat_plan` : `TEXT NOT NULL DEFAULT 'ACTIF' CHECK (etat_plan IN ('BROUILLON', 'ACTIF', 'HISTORIQUE', 'ANNULE'))` *(Lien B.1)*.
  - `montant_total_planifie_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_total_planifie_fcfa) = 'integer' AND montant_total_planifie_fcfa >= 0)`.
  - `date_creation` : `TEXT NOT NULL`.
  - `date_validation` : `TEXT NULL`.
- **Contraintes :**
  - `INDEX PARTIEL UNIQUE` d'exclusivité : `CREATE UNIQUE INDEX idx_plan_actif_par_creance ON plan_reglement_creance(id_creance) WHERE etat_plan = 'ACTIF'`. *(Garantit au maximum un plan actif par créance, règle Lot 3)*.
  - `INDEX PARTIEL UNIQUE` du plan initial : `CREATE UNIQUE INDEX idx_plan_initial_par_creance ON plan_reglement_creance(id_creance) WHERE type_plan = 'INITIAL'`. *(Garantit 0..1 plan initial)*.
  - *Note :* L'égalité entre `montant_total_planifie_fcfa` du plan initial et `montant_net_initial_fcfa` de la créance reste « sous réserve Q-03 ».

#### Table 3.5 : `reamenagement_echeancier`
Acte formel de restructuration d'un plan de paiement.
- **Colonnes :**
  - `id_reamenagement_echeancier` : `TEXT PRIMARY KEY` (UUID).
  - `id_creance` : `TEXT NOT NULL REFERENCES creance(id_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_plan_source` : `TEXT NOT NULL REFERENCES plan_reglement_creance(id_plan_reglement_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_plan_cible` : `TEXT NOT NULL REFERENCES plan_reglement_creance(id_plan_reglement_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `solde_restant_du_reparti_fcfa` : `INTEGER NOT NULL CHECK (solde_restant_du_reparti_fcfa >= 0)`.
  - `date_reamenagement` : `TEXT NOT NULL`.
  - `auteur` : `TEXT NOT NULL CHECK (length(trim(auteur)) > 0)`.
  - `motif` : `TEXT NOT NULL CHECK (length(trim(motif)) > 0)`.
- **Contraintes :**
  - `UNIQUE (id_plan_source)`.
  - `UNIQUE (id_plan_cible)`.
  - `CHECK (id_plan_source != id_plan_cible)`.

#### Table 3.6 : `echeance_creance`
Terme d'exigibilité unitaire au sein d'un plan.
- **Colonnes :**
  - `id_echeance_creance` : `TEXT PRIMARY KEY` (UUID).
  - `id_creance` : `TEXT NOT NULL REFERENCES creance(id_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_plan_reglement_creance` : `TEXT NOT NULL REFERENCES plan_reglement_creance(id_plan_reglement_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `rang` : `INTEGER NOT NULL CHECK (typeof(rang) = 'integer' AND rang > 0)` *(Matérialisation Q-03)*.
  - `date_echeance` : `TEXT NOT NULL CHECK (date(date_echeance, '+0 days') = date_echeance)`.
  - `montant_exigible_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_exigible_fcfa) = 'integer' AND montant_exigible_fcfa > 0)` *(Matérialisation Q-03)*.
  - `etat_echeance` : `TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (etat_echeance IN ('EN_ATTENTE', 'PARTIELLEMENT_REGLEE', 'REGLEE', 'REMPLACEE', 'ANNULEE'))`.
  - `id_reamenagement_source` : `TEXT NULL REFERENCES reamenagement_echeancier(id_reamenagement_echeancier) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_reamenagement_remplacement` : `TEXT NULL REFERENCES reamenagement_echeancier(id_reamenagement_echeancier) ON UPDATE RESTRICT ON DELETE RESTRICT`.
- **Contraintes :**
  - `UNIQUE (id_plan_reglement_creance, rang)` *(Matérialisation Q-03)*.
  - `CHECK (montant_exigible_fcfa > 0)` *(Matérialisation Q-03)*.
  - Trigger de validation vérifiant que la somme des montants d'échéances d'un plan égale exactement son montant total planifié *(Sous réserve Q-03)*.

#### Table 3.7 : `composition_plan_echeancier` (ou `evenement_echeance`)
Table d'association et d'historique rattachant explicitement les échéances aux plans successifs.
- **Colonnes :**
  - `id_evenement_echeance` : `TEXT PRIMARY KEY` (UUID).
  - `id_echeance_creance` : `TEXT NOT NULL REFERENCES echeance_creance(id_echeance_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_plan_reglement_creance` : `TEXT NOT NULL REFERENCES plan_reglement_creance(id_plan_reglement_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_reamenagement_echeancier` : `TEXT NULL REFERENCES reamenagement_echeancier(id_reamenagement_echeancier) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `type_evenement` : `TEXT NOT NULL CHECK (type_evenement IN ('CREATION', 'REORGANISATION', 'ANNULATION'))`.
  - `date_evenement` : `TEXT NOT NULL`.

---

### LOT 4 — ENCAISSEMENTS, AFFECTATIONS ET MOBILE MONEY (Migration 006)

#### Table 4.1 : `encaissement`
Fait financier constatant l'entrée de fonds monétaires effectifs.
- **Colonnes :**
  - `id_encaissement` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_caisse` : `TEXT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Si encaissé en caisse)*.
  - `montant_encaisse_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_encaisse_fcfa) = 'integer' AND montant_encaisse_fcfa > 0)`.
  - `mode_reglement` : `TEXT NOT NULL CHECK (mode_reglement IN ('ESPECES', 'MOBILE_MONEY', 'VIREMENT', 'CHEQUE', 'BANQUE'))`.
  - `date_encaissement` : `TEXT NOT NULL`.
  - `reference_recu` : `TEXT NULL UNIQUE`.
  - `statut_encaissement` : `TEXT NOT NULL DEFAULT 'VALIDE' CHECK (statut_encaissement IN ('VALIDE', 'ANNULE', 'CONTREPASSE'))`.
  - `date_annulation` : `TEXT NULL`.
  - `motif_annulation` : `TEXT NULL`.
- **Contraintes :**
  - Immutabilité par trigger append-only : un encaissement validé n'est jamais supprimé (`DELETE` interdit) ; une annulation se fait par événement référencé (`FIN-LOT5-035`).

#### Table 4.2 : `mouvement_credit`
Interface pivot de gestion des avoirs et crédits disponibles pour règlements au niveau Lot 4.
- **Colonnes :**
  - `id_mouvement_credit` : `TEXT PRIMARY KEY` (UUID).
  - `id_eleve` : `TEXT NOT NULL REFERENCES eleve(id_eleve) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `montant_mouvement_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_mouvement_fcfa) = 'integer' AND montant_mouvement_fcfa > 0)`.
  - `type_mouvement` : `TEXT NOT NULL CHECK (type_mouvement IN ('OCTROI', 'UTILISATION', 'RESTITUTION'))`.
  - `date_mouvement` : `TEXT NOT NULL`.
  - `id_mouvement_credit_source` : `TEXT NULL REFERENCES mouvement_credit(id_mouvement_credit) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Cascade Lot 6)*.

#### Table 4.3 : `affectation_reglement`
Table centrale de ventilation N:N reliant une source de fonds à une cible de dette.
- **Colonnes :**
  - `id_affectation_reglement` : `TEXT PRIMARY KEY` (UUID).
  - `id_encaissement` : `TEXT NULL REFERENCES encaissement(id_encaissement) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Origine encaissement)*.
  - `id_mouvement_credit_utilisation` : `TEXT NULL REFERENCES mouvement_credit(id_mouvement_credit) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Origine crédit)*.
  - `id_creance` : `TEXT NULL REFERENCES creance(id_creance) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Cible créance directe)*.
  - `id_echeance_creance` : `TEXT NULL REFERENCES echeance_creance(id_echeance_creance) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Cible échéance de plan)*.
  - `montant_affecte_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_affecte_fcfa) = 'integer' AND montant_affecte_fcfa > 0)` *(Arbitrage 3)*.
  - `date_affectation` : `TEXT NOT NULL`.
  - `id_affectation_contrepassee` : `TEXT NULL UNIQUE REFERENCES affectation_reglement(id_affectation_reglement) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Contre-écriture)*.
  - `est_contrepassation` : `INTEGER NOT NULL DEFAULT 0 CHECK (est_contrepassation IN (0, 1))`.
- **Contraintes (Arbitrages 1, 2, 5 et Q-09) :**
  - **XOR strict d'origine (Q-09 / Arbitrage 2) :**  
    `CHECK ((id_encaissement IS NOT NULL AND id_mouvement_credit_utilisation IS NULL) OR (id_encaissement IS NULL AND id_mouvement_credit_utilisation IS NOT NULL))`.
  - **XOR strict de cible (Arbitrage 1) :**  
    `CHECK ((id_creance IS NOT NULL AND id_echeance_creance IS NULL) OR (id_creance IS NULL AND id_echeance_creance IS NOT NULL))`.
  - **Immutabilité append-only (Arbitrage 5) :** `UPDATE` et `DELETE` formellement interdits par triggers sur les affectations existantes. Une annulation produit une nouvelle ligne d'affectation avec `est_contrepassation = 1` et montant compensateur.

#### Table 4.4 : `transaction_mobile_money`
Traçabilité et réconciliation des paiements par opérateur mobile.
- **Colonnes :**
  - `id_transaction_mobile_money` : `TEXT PRIMARY KEY` (UUID).
  - `id_encaissement` : `TEXT NULL UNIQUE REFERENCES encaissement(id_encaissement) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-04, nullable)*.
  - `fournisseur` : `TEXT NOT NULL CHECK (length(trim(fournisseur)) > 0)`.
  - `compte_marchand` : `TEXT NOT NULL CHECK (length(trim(compte_marchand)) > 0)`.
  - `reference_externe` : `TEXT NOT NULL CHECK (length(trim(reference_externe)) > 0)`.
  - `montant_declare_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_declare_fcfa) = 'integer' AND montant_declare_fcfa > 0)`.
  - `telephone_payeur` : `TEXT NULL`.
  - `date_declaration` : `TEXT NOT NULL`.
  - `date_confirmation` : `TEXT NULL`.
  - `etat_synchronisation_technique` : `TEXT NOT NULL DEFAULT 'CREE_LOCALEMENT' CHECK (etat_synchronisation_technique IN ('CREE_LOCALEMENT', 'EN_ATTENTE_SERVEUR', 'CONFIRME_SERVEUR', 'EN_CONFLIT'))`.
  - `etat_financier` : `TEXT NOT NULL DEFAULT 'INITIE' CHECK (etat_financier IN ('INITIE', 'CONFIRME', 'ECHOUE', 'EXPIRE'))`.
- **Contraintes (Matérialisation Q-04) :**
  - **Clé composite unique externe :** `UNIQUE (fournisseur, compte_marchand, reference_externe)`.
  - **Invariant atomique CONFIRME :**  
    `CHECK ((etat_financier = 'CONFIRME' AND id_encaissement IS NOT NULL AND date_confirmation IS NOT NULL) OR (etat_financier != 'CONFIRME' AND id_encaissement IS NULL))`.

---

### LOT 5 — GESTION DE CAISSE (Migration 007)

#### Table 5.1 : `poste_caisse`
Guichet ou poste physique de perception d'espèces.
- **Colonnes :**
  - `id_poste_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `code_poste` : `TEXT NOT NULL UNIQUE CHECK (length(trim(code_poste)) > 0)`.
  - `designation` : `TEXT NOT NULL`.
  - `est_actif` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1))`.

#### Table 5.2 : `appareil`
Terminal informatique d'enregistrement de caisse.
- **Colonnes :**
  - `id_appareil` : `TEXT PRIMARY KEY` (UUID).
  - `numero_serie` : `TEXT NOT NULL UNIQUE CHECK (length(trim(numero_serie)) > 0)`.
  - `nom_machine` : `TEXT NOT NULL`.
  - `est_autorise` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_autorise IN (0, 1))`.

#### Table 5.3 : `session_caisse`
Période opérationnelle d'activité de caisse sur un poste.
- **Colonnes :**
  - `id_session_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_poste_caisse` : `TEXT NOT NULL REFERENCES poste_caisse(id_poste_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_appareil` : `TEXT NOT NULL REFERENCES appareil(id_appareil) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_caissier` : `TEXT NOT NULL` *(Identifiant acteur, non exclusif selon Q-05)*.
  - `fonds_initial_fcfa` : `INTEGER NOT NULL CHECK (typeof(fonds_initial_fcfa) = 'integer' AND fonds_initial_fcfa >= 0)`.
  - `date_ouverture` : `TEXT NOT NULL`.
  - `etat` : `TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (etat IN ('OUVERTE', 'CLOTUREE'))` *(Matérialisation Q-05 / Lien B.1)*.
- **Contraintes (Matérialisation Q-05) :**
  - **Index Partiel Unique d'exclusivité active :**  
    `CREATE UNIQUE INDEX idx_session_active_poste ON session_caisse(id_poste_caisse) WHERE etat = 'OUVERTE';`  
    *(Garantit strictement qu'un poste de caisse n'a qu'une seule session active à un instant T ; n'impose aucune contrainte sur caissier ou appareil)*.

#### Table 5.4 : `mouvement_caisse`
Flux physique d'espèces lié aux opérations journalières de session.
- **Colonnes :**
  - `id_mouvement_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_caisse` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `sens` : `TEXT NOT NULL CHECK (sens IN ('ENTREE', 'SORTIE'))`.
  - `montant_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_fcfa) = 'integer' AND montant_fcfa > 0)`.
  - `type_mouvement` : `TEXT NOT NULL CHECK (type_mouvement IN ('ENCAISSEMENT', 'TRANSMISSION_SORTIE', 'TRANSMISSION_ENTREE', 'REMBOURSEMENT', 'AJUSTEMENT'))`.
  - `id_operation_source` : `TEXT NULL` *(Identifiant de l'encaissement ou transmission source, sans doublon)*.
  - `date_mouvement` : `TEXT NOT NULL`.
- **Contraintes (Matérialisation GAP-14 / FIN-LOT5-035) :**
  - Trigger `trg_mouvement_caisse_no_delete` : `DELETE` strictement interdit en toute circonstance.
  - Trigger `trg_mouvement_caisse_no_update_closed` : `UPDATE` interdit si la session est clôturée (`etat = 'CLOTUREE'`).

#### Table 5.5 : `cloture_caisse`
Arrêté comptable définitif scellant l'exploitation d'une session.
- **Colonnes :**
  - `id_cloture_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_caisse` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_cloture` : `TEXT NOT NULL`.
  - `solde_theorique_fcfa` : `INTEGER NOT NULL CHECK (typeof(solde_theorique_fcfa) = 'integer')`.
  - `montant_physique_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_physique_fcfa) = 'integer' AND montant_physique_fcfa >= 0)`.
  - `ecart_fcfa` : `INTEGER NOT NULL CHECK (typeof(ecart_fcfa) = 'integer')`.
  - `numero_comptage_retenu` : `INTEGER NOT NULL DEFAULT 1 CHECK (numero_comptage_retenu > 0)` *(Lien B.8)*.
- **Contraintes (Matérialisation Q-07) :**
  - **Unicité stricte de clôture par session :** `UNIQUE (id_session_caisse)`.
  - `CHECK (ecart_fcfa = montant_physique_fcfa - solde_theorique_fcfa)`.
  - Trigger post-insertion : passe automatiquement `session_caisse.etat` à `'CLOTUREE'`.

#### Table 5.6 : `detail_comptage_caisse`
Dénombrement physique des billets et pièces par coupure monétaire.
- **Colonnes :**
  - `id_detail_comptage_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_cloture_caisse` : `TEXT NOT NULL REFERENCES cloture_caisse(id_cloture_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `numero_comptage` : `INTEGER NOT NULL CHECK (typeof(numero_comptage) = 'integer' AND numero_comptage > 0)` *(Tour de comptage, Q-08)*.
  - `valeur_unitaire_fcfa` : `INTEGER NOT NULL CHECK (typeof(valeur_unitaire_fcfa) = 'integer' AND valeur_unitaire_fcfa > 0)` *(Coupure, Lien B.9)*.
  - `quantite` : `INTEGER NOT NULL CHECK (typeof(quantite) = 'integer' AND quantite >= 0)`.
  - `montant_total_ligne_fcfa` : `INTEGER GENERATED ALWAYS AS (valeur_unitaire_fcfa * quantite) STORED`.
- **Contraintes (Matérialisation Q-08) :**
  - **Clé composite unique par tour :** `UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)`.
  - Triggers append-only : `UPDATE` et `DELETE` interdits sur les lignes de détail.

#### Table 5.7 : `transmission_fonds`
Transferts sécurisés d'espèces d'une session vers une autre session ou un responsable.
- **Colonnes :**
  - `id_transmission_fonds` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_source` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_session_destination` : `TEXT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-06, nullable)*.
  - `id_responsable_reception` : `TEXT NULL` *(Si remise à un responsable hors session, FIN-LOT5-007 / Lien B.6)*.
  - `montant_envoye_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_envoye_fcfa) = 'integer' AND montant_envoye_fcfa > 0)`.
  - `montant_recu_fcfa` : `INTEGER NULL CHECK (montant_recu_fcfa IS NULL OR (typeof(montant_recu_fcfa) = 'integer' AND montant_recu_fcfa >= 0))`.
  - `etat_transmission` : `TEXT NOT NULL DEFAULT 'EMISE' CHECK (etat_transmission IN ('EMISE', 'RECUE', 'ECART_CONSTATE'))`.
  - `date_envoi` : `TEXT NOT NULL`.
  - `date_reception` : `TEXT NULL`.
- **Contraintes :**
  - `CHECK (id_session_destination IS NULL OR id_session_destination != id_session_source)`.
  - `CHECK ((etat_transmission IN ('RECUE', 'ECART_CONSTATE') AND montant_recu_fcfa IS NOT NULL AND date_reception IS NOT NULL) OR (etat_transmission = 'EMISE' AND montant_recu_fcfa IS NULL))`.
  - Figeage post-réception par trigger *(Lien B.10)*.

#### Table 5.8 : `rapprochement_caisse`
Constat de contrôle comparant les écritures au tiroir-caisse.
- **Colonnes :**
  - `id_rapprochement_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_caisse` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_rapprochement` : `TEXT NOT NULL`.
  - `solde_theorique_calcule_fcfa` : `INTEGER NOT NULL`.
  - `montant_physique_confronte_fcfa` : `INTEGER NOT NULL CHECK (montant_physique_confronte_fcfa >= 0)`.
  - `ecart_constate_fcfa` : `INTEGER NOT NULL`.
  - `est_definitif` : `INTEGER NOT NULL DEFAULT 0 CHECK (est_definitif IN (0, 1))` *(Marqueur rapprochement final, Lien B.7)*.
  - `superviseur` : `TEXT NOT NULL CHECK (length(trim(superviseur)) > 0)`.
- **Contraintes (Matérialisation GAP-15 / GAP-16 / Q-07) :**
  - Cardinalité `SESSION 0..N RAPPROCHEMENT_CAISSE` (historique conservé sans réécriture).
  - `CREATE UNIQUE INDEX idx_rapprochement_definitif ON rapprochement_caisse(id_session_caisse) WHERE est_definitif = 1;`
  - Trigger append-only : `UPDATE` et `DELETE` interdits sur les rapprochements enregistrés.

#### Table 5.9 : `justification_ecart_caisse`
Motif d'affaires expliquant les écarts constatés lors d'un rapprochement.
- **Colonnes :**
  - `id_justification_ecart_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_rapprochement_caisse` : `TEXT NOT NULL REFERENCES rapprochement_caisse(id_rapprochement_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `motif_ecart` : `TEXT NOT NULL CHECK (length(trim(motif_ecart)) > 0)`.
  - `auteur` : `TEXT NOT NULL CHECK (length(trim(auteur)) > 0)`.
  - `date_justification` : `TEXT NOT NULL`.
  - `piece_justificative_ref` : `TEXT NULL`.
- **Contraintes (Matérialisation GAP-16 / Q-07) :**
  - Triggers append-only : `UPDATE` et `DELETE` formellement interdits sur les justifications.

---

## 4. Matérialisation des contraintes ratifiées

| Réf. Décision / GAP | Règle normative ratifiée | Spécification physique SQLite | Type d'objet DDL cible |
|---|---|---|---|
| **Q-01** | Rattachement créance vers identité canonique élève obligatoire | `creance.id_eleve TEXT NOT NULL REFERENCES eleve(id_eleve)` ; `id_inscription TEXT NULL REFERENCES inscription(id_inscription)` ; `id_affectation_classe TEXT NULL REFERENCES affectation_classe(id_affectation_classe)` | Colonnes & FKs |
| **Q-02** | Interdiction du chevauchement actif des remises | Trigger `trg_attribution_remise_non_chevauchement` vérifiant : `NOT EXISTS (SELECT 1 FROM attribution_remise WHERE id_eleve = NEW.id_eleve AND id_politique_remise = NEW.id_politique_remise AND id_annee_scolaire = NEW.id_annee_scolaire AND etat_attribution = 'ACTIVE' AND id_attribution_remise != NEW.id_attribution_remise AND (NEW.date_fin_validite IS NULL OR date_debut_validite < NEW.date_fin_validite) AND (date_fin_validite IS NULL OR date_fin_validite > NEW.date_debut_validite))` | Trigger SQLite |
| **Q-03** | Rangs uniques > 0, échéances > 0, somme = plan | `UNIQUE (id_plan_reglement_creance, rang)`, `CHECK (rang > 0)`, `CHECK (montant_exigible_fcfa > 0)`. Trigger de validation de somme totale *(sous réserve Q-03)* | Contraintes de table & Trigger |
| **Q-04** | Transaction Mobile Money confirmée liée à 0..1 encaissement | `transaction_mobile_money.id_encaissement TEXT NULL UNIQUE REFERENCES encaissement(id_encaissement)` ; `UNIQUE (fournisseur, compte_marchand, reference_externe)` ; `CHECK ((etat_financier = 'CONFIRME' AND id_encaissement IS NOT NULL) OR (etat_financier != 'CONFIRME' AND id_encaissement IS NULL))` | Colonne, UNIQUE & CHECK |
| **Q-05** | Exclusivité de session active sur poste de caisse seul | `session_caisse.etat TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (etat IN ('OUVERTE', 'CLOTUREE'))` ; `CREATE UNIQUE INDEX idx_session_active_poste ON session_caisse(id_poste_caisse) WHERE etat = 'OUVERTE'` | Colonne, CHECK & Index partiel |
| **Q-06** | Destination facultative sur transmission de fonds | `transmission_fonds.id_session_destination TEXT NULL REFERENCES session_caisse(id_session_caisse)` | Colonne & FK nullable |
| **Q-07** | Clôture unique par session et rapprochements historiques conservés | `cloture_caisse` : `UNIQUE (id_session_caisse)` ; `rapprochement_caisse` et `justification_ecart_caisse` : Triggers `BEFORE UPDATE` et `BEFORE DELETE` levant une erreur SQL | Contrainte UNIQUE & Triggers |
| **Q-08** | Tour de comptage unique par valeur et conservation append-only | `detail_comptage_caisse` : `UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)` ; Triggers `BEFORE UPDATE` et `BEFORE DELETE` levant une erreur SQL | Contrainte UNIQUE & Triggers |
| **Q-09** | Frontière nette Lot 4 / Lot 6 et deux XOR stricts sur affectation | `affectation_reglement` : `CHECK ((id_encaissement IS NOT NULL AND id_mouvement_credit_utilisation IS NULL) OR (id_encaissement IS NULL AND id_mouvement_credit_utilisation IS NOT NULL))` ; `CHECK ((id_creance IS NOT NULL AND id_echeance_creance IS NULL) OR (id_creance IS NULL AND id_echeance_creance IS NOT NULL))` | Contraintes CHECK |
| **GAP-14** | Protection append-only de `mouvement_caisse` (FIN-LOT5-035) | `trg_mouvement_caisse_no_delete` (bloque tout DELETE) ; `trg_mouvement_caisse_no_update_closed` (bloque UPDATE si la session rattachée est passée à l'état `'CLOTUREE'`) | Triggers SQLite |
| **GAP-15 / GAP-16** | Absence de triggers UPDATE/DELETE sur rapprochements et justifications | `trg_rapprochement_caisse_no_update`, `trg_rapprochement_caisse_no_delete`, `trg_justification_ecart_no_update`, `trg_justification_ecart_no_delete` | Triggers SQLite |

---

## 5. Inventaire fonctionnel des triggers cibles

*Spécification fonctionnelle des règles transactionnelles (sans code SQL brut).*

| Nom du trigger | Table cible | Événement | Règle fonctionnelle appliquée |
|---|---|---|---|
| `trg_attribution_remise_check_overlap` | `attribution_remise` | `BEFORE INSERT / UPDATE` | Vérifie l'absence de chevauchement temporel actif pour l'élève, l'année et la politique de remise (Q-02). |
| `trg_creance_immutable_snapshots` | `creance` | `BEFORE UPDATE` | Interdit la modification des montants brut/remise/net, de l'élève et des snapshots après émission. |
| `trg_plan_somme_echeances` | `echeance_creance` | `AFTER INSERT / UPDATE / DELETE` | Vérifie que la somme des échéances d'un plan actif égale `plan_reglement_creance.montant_total_planifie_fcfa` (sous réserve Q-03). |
| `trg_affectation_no_update` | `affectation_reglement` | `BEFORE UPDATE` | Interdit formellement toute modification d'une affectation validée (immuabilité append-only). |
| `trg_affectation_no_delete` | `affectation_reglement` | `BEFORE DELETE` | Interdit formellement la suppression physique d'une affectation validée (compensation par contre-écriture uniquement). |
| `trg_mouvement_caisse_no_delete` | `mouvement_caisse` | `BEFORE DELETE` | Interdit la suppression de tout mouvement de caisse physique validé (GAP-14 / FIN-LOT5-035). |
| `trg_mouvement_caisse_no_update_closed`| `mouvement_caisse` | `BEFORE UPDATE` | Bloque toute mise à jour si la session rattachée possède l'état `'CLOTUREE'` (GAP-14). |
| `trg_cloture_fermeture_session` | `cloture_caisse` | `AFTER INSERT` | Met à jour immédiatement et atomiquement `session_caisse.etat` vers `'CLOTUREE'` pour le poste concerné (Q-05 / Q-07). |
| `trg_cloture_comptage_concordance`| `cloture_caisse` | `AFTER INSERT / UPDATE` | Vérifie l'existence du tour `numero_comptage_retenu` et l'égalité arithmétique stricte entre la somme du tour et `montant_physique_fcfa` (FIN-LOT5-013 / Lien B.8). |
| `trg_detail_comptage_no_update` | `detail_comptage_caisse` | `BEFORE UPDATE` | Fige les lignes de comptage physique après insertion (Q-08). |
| `trg_detail_comptage_no_delete` | `detail_comptage_caisse` | `BEFORE DELETE` | Interdit la suppression de tout tour de comptage physique (Q-08). |
| `trg_transmission_figee_reception` | `transmission_fonds` | `BEFORE UPDATE` | Fige irréversiblement les colonnes d'émission et de réception dès que le statut passe à `'RECUE'` (Lien B.10). |
| `trg_rapprochement_caisse_no_update` | `rapprochement_caisse` | `BEFORE UPDATE` | Interdit la réécriture d'un rapprochement de caisse historique (GAP-15 / Q-07). |
| `trg_rapprochement_caisse_no_delete` | `rapprochement_caisse` | `BEFORE DELETE` | Interdit la suppression d'un rapprochement de caisse historique (GAP-15 / Q-07). |
| `trg_justification_ecart_no_update` | `justification_ecart_caisse` | `BEFORE UPDATE` | Interdit la modification d'une justification d'écart enregistrée (GAP-16 / Q-07). |
| `trg_justification_ecart_no_delete` | `justification_ecart_caisse` | `BEFORE DELETE` | Interdit la suppression d'une justification d'écart enregistrée (GAP-16 / Q-07). |

---

## 6. Propositions d'index de performance (Résidu 6)

*Index physiques recommandés pour fluidifier les calculs de balances âgées, de soldes théoriques et d'historiques sans pénaliser le débit d'écriture.*

| Table | Index proposé | Type / Colonnes | Justification lecture / écriture |
|---|---|---|---|
| `creance` | `idx_creance_eleve_annee` | `(id_eleve, id_annee_scolaire)` | Accélération de la consultation de l'état de compte élève et calcul du solde restant dû. |
| `creance` | `idx_creance_etat_active` | Partiel : `(id_annee_scolaire) WHERE etat_creance = 'ACTIVE'` | Optimisation du calcul de la balance âgée et des relances (Lot 7). |
| `attribution_remise` | `idx_attribution_eleve_politique`| `(id_eleve, id_politique_remise, id_annee_scolaire)` | Performance du contrôle de non-chevauchement lors des inscriptions. |
| `plan_reglement_creance`| `idx_plan_creance_actif` | Partiel : `(id_creance) WHERE etat_plan = 'ACTIF'` | Détection instantanée du plan de règlement en cours pour les affectations. |
| `echeance_creance` | `idx_echeance_plan_rang` | `(id_plan_reglement_creance, rang)` | Ordonnancement séquentiel lors de l'application de paiements partiels. |
| `affectation_reglement`| `idx_affectation_creance` | `(id_creance) WHERE id_creance IS NOT NULL` | Calcul rapide du cumul réglé au niveau de la créance (RAP direct). |
| `affectation_reglement`| `idx_affectation_echeance` | `(id_echeance_creance) WHERE id_echeance_creance IS NOT NULL` | Calcul rapide du reste à payer par échéance individuelle. |
| `affectation_reglement`| `idx_affectation_encaissement`| `(id_encaissement)` | Vérification du solde résiduel disponible sur un encaissement pour ventilation N:N. |
| `session_caisse` | `idx_session_poste_active` | Partiel UNIQUE : `(id_poste_caisse) WHERE etat = 'OUVERTE'` | Garantie d'exclusivité Q-05 et recherche instantanée de la session opérationnelle. |
| `mouvement_caisse` | `idx_mouvement_session` | `(id_session_caisse, sens, montant_fcfa)` | Agrégation rapide pour calcul du solde théorique lors de la clôture de caisse. |
| `detail_comptage_caisse`| `idx_detail_comptage_tour` | `(id_cloture_caisse, numero_comptage)` | Sommation rapide par tour de recomptage physique. |
| `transmission_fonds` | `idx_transmission_source_dest`| `(id_session_source, id_session_destination)` | Pointage des transferts inter-caisses en attente de réception. |

---

## 7. Contrats d'interfaces externes et ordonnancement

Le MLD financier des Lots 1 à 5 est rattaché au reste de l'ERP scolaire par des clés étrangères ciblant des entités administratives et pédagogiques portées par d'autres migrations :

| Table cible externe | Rôle fonctionnel | Migration d'origine | Note d'ordonnancement pour les migrations correctives |
|---|---|---|---|
| `annee_scolaire` | Découpage des exercices académiques | `002-cycle-annee-scolaire.ts` | **Préalable absolu :** Table préexistante, référencée dès le Lot 1 (migration 003). |
| `filiere` | Structure pédagogique pour tarifs spécifiques | *(Domaine Pédagogique)* | **Point ouvert :** Table `filiere` non présente dans 001–009 ; FK facultative à conditionner. |
| `eleve` | Référentiel canonique des apprenants | `011-eleves-responsables.ts` | **Contrat externe :** L'activation de la contrainte physique `creance.id_eleve REFERENCES eleve(id_eleve)` requiert l'exécution ordonnancée de la migration 011 avant les contraintes correctives du Lot 2. |
| `inscription` | Validation administrative annuelle | `013-inscriptions-affectations.ts`| **Contrat externe :** FK nullable ; doit être activée après la création de la table `inscription` (migration 013). |
| `affectation_classe` | Rattachement à une division de classe | `013-inscriptions-affectations.ts`| **Contrat externe :** FK nullable ; doit être activée après la création de `affectation_classe` (migration 013). |

---

## 8. Matrice d'écart MPD ↔ DDL actuel (Migrations 003 à 007)

*Tableau récapitulatif servant de spécification de base pour le futur mandat de migration corrective.*

| Table physique | Statut dans DDL 003–007 réel | Éléments manquants ou non conformes | Travaux physiques requis |
|---|---|---|---|
| `type_frais` | Présente dans 003 | Conforme | Aucun |
| `periodicite` | Présente dans 003 | Conforme | Aucun |
| `tarif` | Présente dans 003 | Absence de FK vers `filiere` ; trigger de non-chevauchement absent | Ajouter trigger de non-chevauchement des dates d'effet. |
| `politique_remise` | Présente dans 003 | Conforme | Aucun |
| `attribution_remise` | Présente dans 003 | `id_eleve` sans FK ; pas de contrôle de chevauchement temporel | Ajouter trigger d'exclusion temporelle (Q-02) ; ajouter FK `id_eleve` vers `eleve`. |
| `periode_facturation`| Présente dans 004 | Conforme | Aucun |
| `campagne_facturation`| Présente dans 004 | Conforme | Aucun |
| `execution_campagne` | Présente dans 004 | Conforme | Aucun |
| `creance` | Présente dans 004 | `id_eleve`, `id_inscription`, `id_affectation_classe` sans FKs | Ajouter FK NOT NULL `id_eleve` vers `eleve` (Q-01) ; FKs nullables `inscription` et `affectation_classe`. |
| `modele_echeancier` | Présente dans 005 | Conforme | Aucun |
| `version_modele` | Présente dans 005 | Conforme | Aucun |
| `ligne_modele` | Présente dans 005 | Conforme | Aucun |
| `plan_reglement_creance`| Présente dans 005 | Pas de colonne `type_plan`, pas de colonne `etat_plan`, pas d'unicité du plan actif | Ajouter colonnes `type_plan`, `etat_plan` ; créer index partiel unique sur plan actif. |
| `reamenagement_echeancier`| Présente dans 005 | Structure simplifiée | Conformer les colonnes de solde et de motif. |
| `echeance_creance` | Présente dans 005 | Pas d'unicité `(id_plan, rang)` ; montant non contraint à `> 0` | Ajouter `UNIQUE(id_plan, rang)` et `CHECK (montant_exigible_fcfa > 0)` (Q-03). |
| `evenement_echeance`| Présente dans 005 | Conforme | Conformer les liaisons au réaménagement. |
| `encaissement` | Présente dans 006 | Pas de trigger bloquant DELETE | Ajouter trigger append-only interdisant DELETE. |
| `mouvement_credit` | Présente dans 006 | Conforme (frontière Lot 4) | Aucun |
| `affectation_reglement`| Présente dans 006 | Pas de cible dette ; pas de XOR d'origine ; pas de montant `> 0` ; modifiable/supprimable | Ajouter colonnes `id_creance`, `id_echeance_creance` ; contraintes XOR origine et cible ; triggers append-only. |
| `transaction_mobile_money`| Présente dans 006| Pas de clé composite externe ; pas de FK vers encaissement ; pas de montant | Ajouter `id_encaissement`, `montant_declare_fcfa`, contrainte composite `UNIQUE(fournisseur, compte_marchand, reference_externe)`. |
| `poste_caisse` | Présente dans 007 | Conforme | Aucun |
| `appareil` | Présente dans 007 | Conforme | Aucun |
| `session_caisse` | Présente dans 007 | Pas de colonne `etat` ; pas d'index d'exclusivité active | Ajouter colonne `etat` (`OUVERTE`, `CLOTUREE`) ; créer index partiel unique sur poste (Q-05). |
| `mouvement_caisse` | Présente dans 007 | Suppression autorisée ; modification hors clôture non couverte | Ajouter trigger interdisant DELETE ; trigger bloquant UPDATE hors session ouverte (GAP-14). |
| `cloture_caisse` | Présente dans 007 | Pas de contrainte `UNIQUE(id_session_caisse)` | Ajouter contrainte `UNIQUE(id_session_caisse)` (Q-07). |
| `detail_comptage_caisse`| Présente dans 007 | Pas d'unicité par tour/dénomination ; modifiable | Ajouter `UNIQUE(id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)` (Q-08) ; triggers append-only. |
| `transmission_fonds` | Présente dans 007 | Pas de session destination (une seule session dans 007) | Ajouter `id_session_destination UUID NULL` (Q-06) ; trigger de figeage post-réception (B.10). |
| `rapprochement_caisse`| Présente dans 007 | Absence de triggers UPDATE/DELETE | Ajouter triggers append-only interdisant UPDATE et DELETE (GAP-15 / Q-07). |
| `justification_ecart_caisse`| Présente dans 007 | Absence de triggers UPDATE/DELETE ; pas de colonne motif/auteur | Ajouter colonnes `motif_ecart`, `auteur`, `date_justification` ; triggers append-only (GAP-16 / Q-07). |

---

## 9. Propositions d'arbitrage B.1 à B.10

*Ces propositions techniques concrètes sont soumises à la ratification souveraine du propriétaire. Aucune auto-ratification n'est opérée par l'agent.*

### B.1 — Conventions exactes des codes et leur matérialisation
- **Option 1 (Recommandée) :** Matérialisation des énumérations sous forme de contraintes `TEXT CHECK (colonne IN (...))` directement intégrées dans les tables concernées.  
  *Justification :* Approche native standard de SQLite, évitant des tables de nomenclature superflues et garantissant un contrôle d'intégrité sans pénalité de jointure.
- **Option 2 :** Création de tables de référence dédiées (`ref_type_plan`, `ref_etat_session`, etc.) avec clés étrangères.  
  *Justification :* Alourdit inutilement le schéma (7 tables supplémentaires) pour des listes de statuts statiques.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.2 — Mécanisme de validation propriétaire des plans et réaménagements
- **Option 1 (Recommandée) :** Matérialisation par transition d'état atomique sous transaction applicative (`etat_plan = 'ACTIF'`, `date_validation TEXT NOT NULL`, `valide_par TEXT NOT NULL`) accompagnée de la bascule de l'ancien plan à `'HISTORIQUE'`.  
  *Justification :* Assure la traçabilité de l'acteur et de l'instant de validation directement sur l'entité, sans table intermédiaire.
- **Option 2 :** Table d'audit distincte `approbation_plan (id_approbation, id_plan, auteur, date, signature)`.  
  *Justification :* Plus lourde, justifiée uniquement en cas de double visa hiérarchique non requis par les spécifications actuelles.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.3 — Ordre des statements transactionnels (bascule de plan)
- **Option 1 (Recommandée) :** Séquencement strict au sein d'une transaction `BEGIN IMMEDIATE` :  
  1. Insertion du nouveau plan en état `'BROUILLON'` ;  
  2. Insertion des nouvelles échéances associées au nouveau plan ;  
  3. Vérification de la somme des échéances contre le solde restant dû ;  
  4. Mise à jour de l'ancien plan actif vers `'HISTORIQUE'` ;  
  5. Mise à jour du nouveau plan vers `'ACTIF'` avec `date_validation`.  
  *Justification :* Prévient tout état incohérent ou orphelin : si une contrainte échoue au cours de la création des échéances, le rollback automatique préserve l'intégrité de l'ancien plan actif.
- **Option 2 :** Désactivation de l'ancien plan préalablement à la création des nouvelles échéances.  
  *Justification :* Dangereux : expose la créance à un état temporaire sans aucun plan actif en cas d'incident.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.4 — Traitement des conflits concurrents Offline-First (caisse et plans)
- **Option 1 (Recommandée) :** Articulation stricte entre la contrainte locale SQLite et le domaine d'arbitrage serveur VAL-014 :  
  1. *Au niveau local (SQLite) :* L'index partiel d'exclusivité `idx_session_active_poste` garantit physiquement qu'une base locale ne porte jamais simultanément deux sessions actives (`etat = 'OUVERTE'`) pour un même `id_poste_caisse` (Q-05).  
  2. *Au niveau de la synchronisation centrale (Lot 8 / VAL-014) :* En cas d'ouvertures concurrentes survenues hors ligne sur des terminaux distincts pour un même poste de caisse, le serveur central applique les règles du Lot 8 (rejet sans fusion LWW, enregistrement en conflit d'intégration au journal de synchronisation pour arbitrage administratif). L'index SQLite local n'opère qu'en localité et ne se substitue pas à l'arbitrage serveur du Lot 8.  
  *Justification :* Préserve l'intégrité physique de la base locale sans empiéter sur le moteur de synchronisation Lot 8 ni redéfinir VAL-014.
- **Option 2 :** Attribution d'un poste exclusif et figé par appareil matériel.  
  *Justification :* Contredirait l'arbitrage Q-05 qui stipule que l'appareil n'est pas une clé d'exclusivité.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.5 — Référence physique de l'origine d'un remboursement (Lot 6)
- **Option 1 (Recommandée) :** Présence de la colonne d'interface `id_mandat_restitution TEXT NULL` sur l'opération de remboursement du Lot 6 (`remboursement_fonds`), pointant vers `mandat_restitution(id_mandat_restitution)` sans créer de mouvement de caisse doublon dans `mouvement_caisse` (`FIN-LOT6-015`, `FIN-LOT5-022`). La colonne est nullable car le mandat n'est exigible que dans le cas où le bénéficiaire effectif diffère du payeur initial (`FIN-LOT6-015`).  
  *Justification :* Conforme à la frontière Lot 6 (Q-09) et à la nullabilité conditionnelle de `FIN-LOT6-015` matérialisée dans la migration 008.
- **Option 2 :** Rattachement direct du remboursement à l'encaissement original par clé étrangère composite.  
  *Justification :* Ne permettrait pas de traiter les remboursements découlant de trop-perçus consolidés ou d'avances.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.6 — Destinataire hors session des transmissions de fonds (Q-06)
- **Option 1 (Recommandée) :** Présence sur `transmission_fonds` de la colonne `id_session_destination TEXT NULL` complétée par `id_responsable_reception TEXT NULL` et `nom_responsable_snapshot TEXT NULL`. Lorsque `id_session_destination` est NULL, l'identité du responsable physique est obligatoire et tracée (`FIN-LOT5-007`).  
  *Justification :* Traduit exactement le cas d'une remise d'espèces à un gestionnaire ou trésorier n'opérant pas sur une session de caisse informatisée.
- **Option 2 :** Obligation de créer une session de caisse virtuelle « Trésorerie centrale » pour tout récepteur.  
  *Justification :* Artificiel et lourd pour les petits établissements.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.7 — Désignation d'un rapprochement définitif (Q-07)
- **Option 1 (Recommandée) :** Présence de la colonne `est_definitif INTEGER NOT NULL DEFAULT 0 CHECK (est_definitif IN (0, 1))` sur `rapprochement_caisse`, assortie d'un index partiel unique `CREATE UNIQUE INDEX idx_rapprochement_definitif ON rapprochement_caisse(id_session_caisse) WHERE est_definitif = 1;`.  
  *Précisions d'articulation :*  
  1. Le rapprochement définitif qualifie un acte de contrôle d'audit et demeure strictement distinct de l'acte de clôture unique (`cloture_caisse`), qui est le seul fait générateur fermant la session (`FIN-LOT5-012`, `FIN-LOT5-030`).  
  2. En vertu des triggers append-only inconditionnels interdisant tout `UPDATE` (`GAP-15 / Q-07`), le statut `est_definitif = 1` est positionné dès l'insertion de l'acte de rapprochement final, sans réécriture ni reclassement des rapprochements intermédiaires antérieurs (`est_definitif = 0`).  
  *Justification :* Concilie la conservation intégrale de l'historique 0..N, l'append-only strict et l'identification univoque de l'arrêté final.
- **Option 2 :** Convention purement temporelle considérant que le dernier rapprochement chronologique est le définitif.  
  *Justification :* Ambigu en cas de rapprochement postérieur à la clôture ou de contrôles multiples le même jour.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.8 — Règle de sélection du tour de comptage de référence (FIN-LOT5-013, Q-08)
- **Option 1 (Recommandée) :** Stockage du pointeur explicite sur la clôture par la colonne `numero_comptage_retenu INTEGER NOT NULL` sur `cloture_caisse`.  
  *Spécification physique des contrôles d'intégrité :*  
  1. La contrainte composite `(id_cloture_caisse, numero_comptage)` n'étant pas unique sur `detail_comptage_caisse` (une ligne par coupure au sein d'un tour), aucune clé étrangère DDL ne peut relier la clôture à ses lignes de comptage.  
  2. L'intégrité est garantie par un trigger de contrôle applicatif/transactionnel qui vérifie :  
     a. L'existence d'au moins une ligne de détail associée au même `id_cloture_caisse` et portant le `numero_comptage_retenu` ;  
     b. La concordance arithmétique stricte entre la somme des lignes du tour retenu et le montant physique déclaré (`FIN-LOT5-013`) :  
        `SUM(valeur_unitaire_fcfa * quantite) = cloture_caisse.montant_physique_fcfa`.  
  3. Les tours de comptage demeurent strictement append-only (`Q-08`, triggers `trg_detail_comptage_no_update` et `no_delete`).  
  *Justification :* Neutralité absolue : désigne le tour d'espèces retenu par le caissier et le superviseur sans présumer qu'il s'agit nécessairement du dernier numéro chronologique, tout en assurant l'intégrité physique hors FK DDL.
- **Option 2 :** Règle automatique retenant systématiquement `MAX(numero_comptage)` de la session.  
  *Justification :* Rigide : ne permettrait pas de requalifier un recomptage erroné au profit d'un tour précédent réputé exact.
- **Statut :** Proposition — À ratifier par le propriétaire.

### B.9 — Référentiel des coupures physiques de monnaie (docs/12 §6.4)
- **Zone monétaire de référence :** Zone BEAC — Franc CFA d'Afrique centrale (code ISO : XAF) — République du Congo (Congo-Brazzaville). Exclusion formelle de toute référence ou dénomination étrangère propre à la zone UEMOA / BCEAO / XOF (notamment les pièces de 250 FCFA et 200 FCFA, inexistantes en zone BEAC).
- **Distinction normative de la proposition :**
  1. *Valeurs de coupures retenues :* `docs/12 §6.4` illustre des dénominations de billets (10 000, 5 000, 2 000, 1 000, 500 FCFA), mais ne fournit pas la liste exhaustive des pièces et coupures légales et stipule explicitement : « Le référentiel des coupures et les éventuelles modalités de comptage complémentaire restent à préciser ». La nomenclature exhaustive est donc **à compléter sur la base de docs/12 §6.4** et des dénominations officielles BEAC en circulation retenues pour l'établissement.
  2. *Référentiel de gestion (Options techniques conservées) :*
     - **Option 1 (Recommandée) :** Table de référence normalisée `ref_coupure_xaf` (ou `ref_coupure_fcfa`) contenant les dénominations valides retenues, avec clé étrangère depuis `detail_comptage_caisse(valeur_unitaire_fcfa)`.  
       *Justification :* Permet d'administrer et d'étendre la nomenclature des dénominations sans altérer le schéma DDL de la table de comptage.
     - **Option 2 :** Domaine de valeurs sous forme de contrainte `CHECK (valeur_unitaire_fcfa IN (...))` restreinte aux seules coupures retenues.  
       *Justification :* Contrôle physique direct sans table supplémentaire, mais fige le barème monétaire dans le schéma DDL de la table de comptage.
  3. *Statut réglementaire :* Données de référence applicatives alignées sur les dénominations légales en circulation émises par la BEAC pour la République du Congo ; aucune prétention réglementaire propre au projet d'application scolaire.
- **Statut :** Proposition — À ratifier par le propriétaire (à compléter sur la base de docs/12 §6.4).

### B.10 — Mutabilité de la transmission de fonds après réception (docs/11 §4)
- **Option 1 (Recommandée) :** Cycle de figeage asynchrone à deux étapes par trigger :  
  1. Dès l'émission (`etat_transmission = 'EMISE'`), les colonnes `id_session_source`, `montant_envoye_fcfa` et `date_envoi` deviennent strictement inaltérables (`UPDATE` interdit) ;  
  2. Dès la réception effective (`etat_transmission IN ('RECUE', 'ECART_CONSTATE')`), les colonnes de réception (`montant_recu_fcfa`, `date_reception`, `id_session_destination`) sont écrites puis l'ensemble de la ligne devient totalement immuable.  
  *Justification :* Traduit avec une exactitude mathématique la réalité physique du convoyage d'espèces : l'expéditeur ne peut modifier son bordereau une fois les fonds partis, et le destinataire fige la réception définitivement.
- **Option 2 :** Figeage global uniquement après confirmation de réception.  
  *Justification :* Dangereux : permettrait à un caissier émetteur de réécrire le montant envoyé pendant que les fonds sont en transit.
- **Statut :** Proposition — À ratifier par le propriétaire.

---

## 10. Traçabilité, réserves et statut

Conformément à la lecture de traçabilité fixée au procès-verbal de validation VAL-017 (`docs/07 §10`) :
1. **Faits établis :** Les 29 tables identifiées, leurs clés primaires, les relations DDL réelles observées dans les migrations 003 à 007, ainsi que les décisions normatives ratifiées Q-01 à Q-09 et les invariants validés (`FIN-LOT5-026` à `035`, `FIN-LOT6-015`).
2. **Déductions motivées :** Les formulations des contraintes d'intégrité physique SQLite (index partiels uniques, triggers d'immutabilité et de non-chevauchement temporel, clés composites d'unicité externe et de tour de comptage).
3. **Propositions soumises à ratification :** Les propositions B.1 à B.10 détaillées en section 9, qui nécessitent l'arbitrage formel du propriétaire pour être actées dans le plan de migration corrective.
4. **Réserves documentaires :**
   - Réserve héritée de VAL-016 relative à l'absence des modèles sources originaux.
   - Réserves Q-03 relatives au montant net initial de créance et au pluriel des échéances.
   - Réserve d'idempotence Lot 8 (GAP-05).

---

## Verdict et prochaine étape

Le présent document constitue la proposition formelle de MPD financier SQLite (v0.1) fondée sur VAL-017. Il est consigné en attente de l'arbitrage souverain du propriétaire sur les dix propositions techniques B.1 à B.10.
Aucune modification du schéma physique réel ni aucune migration corrective ne sera entreprise sans ordre de mission dédié.

