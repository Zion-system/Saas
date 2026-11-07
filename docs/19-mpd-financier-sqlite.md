# 19 — Modèle Physique de Données (MPD) Financier SQLite — Lots 1 à 5

**Version :** 1.0 (GEL)  
**Date :** 07/11/2026  
**Statut :** Document gelé (v1.0) suite à la ratification des verdicts D-0 à D-11 prononcés le 07/11/2026  
**Périmètre :** Domaine Financier — Lots 1 à 5 (30 tables physiques : 29 tables métier MLD VAL-017 + 1 table de nomenclature administrative ref_coupure_xaf)  
**Référence normative :** Décisions propriétaires D-0 à D-11 prononcées le 07/11/2026, Décision VAL-017 du 07/11/2026 (`docs/07 §10`), MLD financier reconstitué validé (`docs/18`), DDL réel des migrations 003 à 007 (`src/database/migrations/`).

---

## 1. En-tête normatif et cadre de référence

Le présent Modèle Physique de Données (MPD) traduit la cible logique et relationnelle validée sous **VAL-017 avec réserves** le 07/11/2026 (`docs/07 §10`) et arrêtée par les verdicts propriétaires **D-0 à D-11** du 07/11/2026 en spécifications d'ingénierie physique pour le moteur de base de données **SQLite WASM + OPFS** (VAL-004).

### 1.1 Régime du document
- **Nature :** Spécification physique de référence gelée (aucune modification des migrations existantes dans le présent mandat).
- **Statut :** Document gelé (v1.0), base obligatoire et exclusive du futur mandat de confection du plan correctif des migrations 003 à 007.
- **Préalable formel :** Ce MPD v1.0 clôt la phase de conception physique des Lots 1 à 5 et arrête définitivement les spécifications techniques préalables aux écritures DDL.

### 1.2 Réserves normatives intégrées
Conformément au procès-verbal de validation VAL-017 (`docs/07 §10`) et aux verdicts D-0 à D-11 :
1. **Réserve VAL-016 :** Le MPD matérialise la reconstitution traçable et ordonnée des tables financières ; il ne prétend pas reconstituer les fichiers sources originaux perdus.
2. **Réserve Q-03 :** Le lien direct entre le montant total du plan initial (`montant_total_planifie_fcfa`) et le montant net de la créance (`montant_net_initial_fcfa`), ainsi que la lecture exacte du terme « plusieurs échéances », demeurent sous réserve Q-03.
3. **Réserve Offline-First (D-1 / B.4 / VAL-014) :** Les règles d'arbitrage central des ouvertures concurrentes de sessions de caisse relèvent du serveur (VAL-014) ; le MPD local ne met en œuvre aucune règle de dernière écriture gagnante (pas de LWW) et consigne les ouvertures conflictuelles de caisse dans le flux de synchronisation Lot 8.

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
- Clés primaires : préfixées par `id_` suivi du nom de la table (ex. `id_creance`), sauf nomenclature à valeur naturelle (`valeur_unitaire_fcfa`).
- Clés étrangères : nom identique à la clé primaire de la table parente ciblée (ex. `id_session_caisse`), sauf en cas de rôles multiples sur la même table parente où un suffixe qualificatif est ajouté (ex. `id_session_source`, `id_session_destination`).
- Colonnes de montants : suffixées par `_fcfa` (ex. `montant_exigible_fcfa`).

---

## 3. Spécification détaillée table par table (30 tables)

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
  - `libelle` : `TEXT NOT NULL`.
  - `taux_pourcentage` : `INTEGER NULL CHECK (taux_pourcentage IS NULL OR (taux_pourcentage > 0 AND taux_pourcentage <= 100))`.
  - `montant_fixe_fcfa` : `INTEGER NULL CHECK (montant_fixe_fcfa IS NULL OR (typeof(montant_fixe_fcfa) = 'integer' AND montant_fixe_fcfa > 0))`.
  - `est_cumulable` : `INTEGER NOT NULL DEFAULT 0 CHECK (est_cumulable IN (0, 1))`.
  - `est_active` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_active IN (0, 1))`.
- **Contraintes :**
  - `CHECK ((taux_pourcentage IS NOT NULL AND montant_fixe_fcfa IS NULL) OR (taux_pourcentage IS NULL AND montant_fixe_fcfa IS NOT NULL))`.

#### Table 1.5 : `attribution_remise`
Octroi individuel d'une remise à un élève pour une année scolaire donnée.
- **Colonnes :**
  - `id_attribution_remise` : `TEXT PRIMARY KEY` (UUID).
  - `id_eleve` : `TEXT NOT NULL REFERENCES eleve(id_eleve) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Interface externe canonique)*.
  - `id_politique_remise` : `TEXT NOT NULL REFERENCES politique_remise(id_politique_remise) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_attribution` : `TEXT NOT NULL CHECK (date(date_attribution, '+0 days') = date_attribution)`.
  - `date_debut_validite` : `TEXT NOT NULL CHECK (date(date_debut_validite, '+0 days') = date_debut_validite)`.
  - `date_fin_validite` : `TEXT NULL CHECK (date_fin_validite IS NULL OR (date(date_fin_validite, '+0 days') = date_fin_validite AND date_fin_validite >= date_debut_validite))`.
  - `etat_attribution` : `TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (etat_attribution IN ('ACTIVE', 'SUSPENDUE', 'REVOQUEE'))`.
- **Contraintes (Matérialisation Q-02) :**
  - Trigger d'exclusion temporelle interdisant le chevauchement d'attributions actives pour un même élève, une même politique et une même année scolaire.

---

### LOT 2 — ENGAGEMENT DES CRÉANCES ET FACTURATION (Migration 004)

#### Table 2.1 : `periode_facturation`
Découpage calendaire de facturation périodique au sein de l'exercice scolaire.
- **Colonnes :**
  - `id_periode_facturation` : `TEXT PRIMARY KEY` (UUID).
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `code_periode` : `TEXT NOT NULL` (ex. `'T1-2026'`, `'M10-2026'`).
  - `libelle` : `TEXT NOT NULL`.
  - `date_debut` : `TEXT NOT NULL CHECK (date(date_debut, '+0 days') = date_debut)`.
  - `date_fin` : `TEXT NOT NULL CHECK (date(date_fin, '+0 days') = date_fin AND date_fin >= date_debut)`.
  - `est_cloturee` : `INTEGER NOT NULL DEFAULT 0 CHECK (est_cloturee IN (0, 1))`.
- **Contraintes :**
  - `UNIQUE (id_annee_scolaire, code_periode)`.

#### Table 2.2 : `campagne_facturation`
Opération administrative groupée générant les créances scolaires d'une période.
- **Colonnes :**
  - `id_campagne_facturation` : `TEXT PRIMARY KEY` (UUID).
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_periode_facturation` : `TEXT NOT NULL REFERENCES periode_facturation(id_periode_facturation) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `code_campagne` : `TEXT NOT NULL UNIQUE CHECK (length(trim(code_campagne)) > 0)`.
  - `date_lancement` : `TEXT NOT NULL`.
  - `statut_campagne` : `TEXT NOT NULL DEFAULT 'PREPAREE' CHECK (statut_campagne IN ('PREPAREE', 'EN_COURS', 'CLOTUREE', 'ANNULEE'))`.

#### Table 2.3 : `execution_campagne`
Journal d'exécution technique et indicateurs de suivi d'une campagne de facturation.
- **Colonnes :**
  - `id_execution_campagne` : `TEXT PRIMARY KEY` (UUID).
  - `id_campagne_facturation` : `TEXT NOT NULL REFERENCES campagne_facturation(id_campagne_facturation) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_debut_execution` : `TEXT NOT NULL`.
  - `date_fin_execution` : `TEXT NULL`.
  - `nombre_creances_generees` : `INTEGER NOT NULL DEFAULT 0 CHECK (nombre_creances_generees >= 0)`.
  - `montant_total_genere_fcfa` : `INTEGER NOT NULL DEFAULT 0 CHECK (typeof(montant_total_genere_fcfa) = 'integer' AND montant_total_genere_fcfa >= 0)`.
  - `statut_execution` : `TEXT NOT NULL CHECK (statut_execution IN ('SUCCES', 'ECHEC', 'INTERROMPU'))`.

#### Table 2.4 : `creance`
Dette scolaire constatée due par un élève au titre d'un tarif et d'une période.
- **Colonnes :**
  - `id_creance` : `TEXT PRIMARY KEY` (UUID).
  - `id_eleve` : `TEXT NOT NULL REFERENCES eleve(id_eleve) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-01, FK obligatoire)*.
  - `id_tarif` : `TEXT NOT NULL REFERENCES tarif(id_tarif) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_annee_scolaire` : `TEXT NOT NULL REFERENCES annee_scolaire(id_annee_scolaire) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_periode_facturation` : `TEXT NOT NULL REFERENCES periode_facturation(id_periode_facturation) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_campagne_facturation` : `TEXT NULL REFERENCES campagne_facturation(id_campagne_facturation) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_inscription` : `TEXT NULL REFERENCES inscription(id_inscription) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-01, FK optionnelle)*.
  - `id_affectation_classe` : `TEXT NULL REFERENCES affectation_classe(id_affectation_classe) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-01, FK optionnelle)*.
  - `id_attribution_remise` : `TEXT NULL REFERENCES attribution_remise(id_attribution_remise) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `montant_brut_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_brut_fcfa) = 'integer' AND montant_brut_fcfa >= 0)`.
  - `montant_remise_fcfa` : `INTEGER NOT NULL DEFAULT 0 CHECK (typeof(montant_remise_fcfa) = 'integer' AND montant_remise_fcfa >= 0)`.
  - `montant_net_initial_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_net_initial_fcfa) = 'integer' AND montant_net_initial_fcfa >= 0)`.
  - `date_emission` : `TEXT NOT NULL CHECK (date(date_emission, '+0 days') = date_emission)`.
  - `date_exigibilite_initiale` : `TEXT NOT NULL CHECK (date(date_exigibilite_initiale, '+0 days') = date_exigibilite_initiale AND date_exigibilite_initiale >= date_emission)`.
  - `etat_creance` : `TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (etat_creance IN ('ACTIVE', 'SOLDEE', 'ANNULEE', 'SUSPENDUE'))`.
  - `code_classe_snapshot` : `TEXT NULL`.
  - `nom_eleve_snapshot` : `TEXT NULL`.
- **Contraintes (Matérialisation Q-01 et invariants) :**
  - `CHECK (montant_remise_fcfa <= montant_brut_fcfa)`.
  - `CHECK (montant_net_initial_fcfa = montant_brut_fcfa - montant_remise_fcfa)`.
  - Immutabilité des montants initiaux par trigger post-émission.

---

### LOT 3 — MODÈLES, PLANS DE RÈGLEMENT ET ÉCHÉANCIERS (Migration 005)

#### Table 3.1 : `modele_echeancier`
Définition type d'un modèle d'échéancier paramétré par l'établissement.
- **Colonnes :**
  - `id_modele_echeancier` : `TEXT PRIMARY KEY` (UUID).
  - `code_modele` : `TEXT NOT NULL UNIQUE CHECK (length(trim(code_modele)) > 0)`.
  - `libelle` : `TEXT NOT NULL`.
  - `description` : `TEXT NULL`.
  - `est_actif` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_actif IN (0, 1))`.

#### Table 3.2 : `version_modele`
Version temporelle d'un modèle d'échéancier garantissant la reproductibilité des plans.
- **Colonnes :**
  - `id_version_modele` : `TEXT PRIMARY KEY` (UUID).
  - `id_modele_echeancier` : `TEXT NOT NULL REFERENCES modele_echeancier(id_modele_echeancier) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `numero_version` : `INTEGER NOT NULL CHECK (numero_version > 0)`.
  - `date_debut_validite` : `TEXT NOT NULL CHECK (date(date_debut_validite, '+0 days') = date_debut_validite)`.
  - `date_fin_validite` : `TEXT NULL CHECK (date_fin_validite IS NULL OR (date(date_fin_validite, '+0 days') = date_fin_validite AND date_fin_validite > date_debut_validite))`.
- **Contraintes :**
  - `UNIQUE (id_modele_echeancier, numero_version)`.

#### Table 3.3 : `ligne_modele`
Ligne de découpage prescrivant le poids d'une tranche dans un modèle.
- **Colonnes :**
  - `id_ligne_modele` : `TEXT PRIMARY KEY` (UUID).
  - `id_version_modele` : `TEXT NOT NULL REFERENCES version_modele(id_version_modele) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `rang` : `INTEGER NOT NULL CHECK (rang > 0)`.
  - `pourcentage_repartition` : `INTEGER NOT NULL CHECK (pourcentage_repartition > 0 AND pourcentage_repartition <= 100)`.
  - `delai_jours_apres_debut` : `INTEGER NOT NULL CHECK (delai_jours_apres_debut >= 0)`.
- **Contraintes :**
  - `UNIQUE (id_version_modele, rang)`.

#### Table 3.4 : `plan_reglement_creance`
Plan d'échéances personnalisé associé à une créance scolaire.
- **Colonnes :**
  - `id_plan_reglement_creance` : `TEXT PRIMARY KEY` (UUID).
  - `id_creance` : `TEXT NOT NULL REFERENCES creance(id_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_version_modele` : `TEXT NULL REFERENCES version_modele(id_version_modele) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `type_plan` : `TEXT NOT NULL CHECK (type_plan IN ('INITIAL', 'REAMENAGE'))`.
  - `montant_total_planifie_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_total_planifie_fcfa) = 'integer' AND montant_total_planifie_fcfa > 0)`.
  - `date_creation` : `TEXT NOT NULL`.
  - `etat_plan` : `TEXT NOT NULL DEFAULT 'ACTIF' CHECK (etat_plan IN ('BROUILLON', 'ACTIF', 'HISTORIQUE', 'ANNULE'))`.
  - `date_validation` : `TEXT NULL`.
  - `valide_par` : `TEXT NULL`.
- **Contraintes (Invariants validés Lot 3 & D-8) :**
  - **Index Partiel Unique de plan actif :**  
    `CREATE UNIQUE INDEX idx_plan_creance_actif ON plan_reglement_creance(id_creance) WHERE etat_plan = 'ACTIF';`  
    *(Garantit strictement qu'une créance n'a qu'un seul plan actif à un instant donné)*.
  - Transition atomique de validation avec archivage de l'ancien plan (D-8).

#### Table 3.5 : `reamenagement_echeancier`
Événement de restructuration d'un échéancier actant le passage d'un plan à un autre.
- **Colonnes :**
  - `id_reamenagement_echeancier` : `TEXT PRIMARY KEY` (UUID).
  - `id_creance` : `TEXT NOT NULL REFERENCES creance(id_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_plan_precedent` : `TEXT NOT NULL REFERENCES plan_reglement_creance(id_plan_reglement_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_nouveau_plan` : `TEXT NOT NULL REFERENCES plan_reglement_creance(id_plan_reglement_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `solde_restant_du_constate_fcfa` : `INTEGER NOT NULL CHECK (typeof(solde_restant_du_constate_fcfa) = 'integer' AND solde_restant_du_constate_fcfa >= 0)`.
  - `motif_reamenagement` : `TEXT NOT NULL CHECK (length(trim(motif_reamenagement)) > 0)`.
  - `date_reamenagement` : `TEXT NOT NULL`.
  - `auteur` : `TEXT NOT NULL CHECK (length(trim(auteur)) > 0)`.
- **Contraintes :**
  - `UNIQUE (id_nouveau_plan)`.
  - `CHECK (id_plan_precedent != id_nouveau_plan)`.

#### Table 3.6 : `echeance_creance`
Tranche individuelle de paiement issue d'un plan de règlement.
- **Colonnes :**
  - `id_echeance_creance` : `TEXT PRIMARY KEY` (UUID).
  - `id_plan_reglement_creance` : `TEXT NOT NULL REFERENCES plan_reglement_creance(id_plan_reglement_creance) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `rang` : `INTEGER NOT NULL CHECK (typeof(rang) = 'integer' AND rang > 0)` *(Matérialisation Q-03)*.
  - `date_exigibilite` : `TEXT NOT NULL CHECK (date(date_exigibilite, '+0 days') = date_exigibilite)`.
  - `montant_exigible_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_exigible_fcfa) = 'integer' AND montant_exigible_fcfa > 0)` *(Matérialisation Q-03)*.
  - `statut_echeance` : `TEXT NOT NULL DEFAULT 'NON_SOLDEE' CHECK (statut_echeance IN ('NON_SOLDEE', 'PARTIELLEMENT_SOLDEE', 'SOLDEE', 'ANNULEE'))`.
- **Contraintes (Matérialisation Q-03) :**
  - `UNIQUE (id_plan_reglement_creance, rang)`.
  - Trigger vérifiant que la somme des montants exigibles égale le montant total du plan (`trg_plan_somme_echeances`, sous réserve Q-03).

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
  - `etat` : `TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (etat IN ('OUVERTE', 'CLOTUREE'))` *(Matérialisation Q-05, D-1, D-5)*.
- **Contraintes (Matérialisation Q-05, D-1, D-5 et Réserve R-6) :**
  - **Index Partiel Unique d'exclusivité active (D-1) :**  
    `CREATE UNIQUE INDEX idx_session_active_poste ON session_caisse(id_poste_caisse) WHERE etat = 'OUVERTE';`  
    *(Garantit strictement qu'un poste de caisse n'a qu'une seule session active à un instant T ; n'impose aucune contrainte sur caissier ou appareil)*.
  - **Protection contre la réouverture (Réserve R-6, D-5) :** Trigger `trg_session_caisse_cloturee_immutable` avec la clause `WHEN OLD.etat = 'CLOTUREE'` : autorise la transition de scellement (`OUVERTE → CLOTUREE`), mais bloque toute modification ultérieure et interdit physiquement la réouverture vers `'OUVERTE'`.

#### Table 5.4 : `mouvement_caisse`
Flux physique d'espèces lié aux opérations journalières de session.
- **Colonnes :**
  - `id_mouvement_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_caisse` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `sens` : `TEXT NOT NULL CHECK (sens IN ('ENTREE', 'SORTIE'))`.
  - `montant_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_fcfa) = 'integer' AND montant_fcfa > 0)`.
  - `type_mouvement` : `TEXT NOT NULL CHECK (type_mouvement IN ('ENCAISSEMENT', 'TRANSMISSION_SORTIE', 'TRANSMISSION_ENTREE', 'REMBOURSEMENT', 'AJUSTEMENT'))`.
  - `id_operation_source` : `TEXT NULL` *(Identifiant polymorphe de l'opération source : encaissement, transmission de fonds ou remboursement Lot 6, sans doublon)*.
  - `date_mouvement` : `TEXT NOT NULL`.
- **Contraintes (Matérialisation GAP-14, D-2, D-3 et Règle R-3) :**
  - **Contrainte CHECK de rattachement du remboursement (D-3) :**  
    `CHECK (type_mouvement <> 'REMBOURSEMENT' OR id_operation_source IS NOT NULL)`
  - **Index Partiel Unique d'unicité d'incidence de remboursement (D-3) :**  
    `CREATE UNIQUE INDEX idx_mouvement_remboursement_unique ON mouvement_caisse(id_operation_source, id_session_caisse) WHERE type_mouvement = 'REMBOURSEMENT';`  
    *(Garantit la règle R-1 : une seule incidence de remboursement en espèces par couple source canonique, session de caisse)*.
  - Trigger `trg_mouvement_caisse_no_delete` : `DELETE` strictement interdit en toute circonstance (GAP-14 / FIN-LOT5-035).
  - Trigger `trg_mouvement_caisse_no_update_closed` : `UPDATE` interdit si la session est clôturée (`etat = 'CLOTUREE'`) (GAP-14).
  - **Règle de la fenêtre clôture → scellement (R-3) :** Aucune nouvelle écriture dans `mouvement_caisse` n'est autorisée dès lors qu'un enregistrement de `cloture_caisse` a été initié ou que la session a été scellée.

#### Table 5.5 : `cloture_caisse`
Arrêté comptable définitif scellant l'exploitation d'une session.
- **Colonnes :**
  - `id_cloture_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_caisse` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_cloture` : `TEXT NOT NULL`.
  - `solde_theorique_fcfa` : `INTEGER NOT NULL CHECK (typeof(solde_theorique_fcfa) = 'integer')`.
  - `montant_physique_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_physique_fcfa) = 'integer' AND montant_physique_fcfa >= 0)`.
  - `ecart_fcfa` : `INTEGER NOT NULL CHECK (typeof(ecart_fcfa) = 'integer')`.
  - `numero_comptage_retenu` : `INTEGER NOT NULL DEFAULT 1 CHECK (numero_comptage_retenu > 0)` *(D-5 / Q-08)*.
- **Contraintes (Matérialisation Q-07, D-5 / Option C) :**
  - **Unicité stricte de clôture par session :** `UNIQUE (id_session_caisse)`.
  - `CHECK (ecart_fcfa = montant_physique_fcfa - solde_theorique_fcfa)`.
  - **Séquence de scellement Option C (M-4 / D-5) :** L'insertion dans `cloture_caisse` n'entraîne pas la bascule automatique immédiate de `session_caisse.etat` vers `'CLOTUREE'`. Elle permet la saisie préalable des lignes de dénombrement dans `detail_comptage_caisse`. L'acte de scellement intervient par la mise à jour explicite `UPDATE session_caisse SET etat = 'CLOTUREE'`, déclenchant la vérification de concordance arithmétique (16ᵉ trigger).

#### Table 5.6 : `detail_comptage_caisse`
Dénombrement physique des billets et pièces par coupure monétaire.
- **Colonnes :**
  - `id_detail_comptage_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_cloture_caisse` : `TEXT NOT NULL REFERENCES cloture_caisse(id_cloture_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `numero_comptage` : `INTEGER NOT NULL CHECK (typeof(numero_comptage) = 'integer' AND numero_comptage > 0)` *(Tour de comptage, Q-08)*.
  - `valeur_unitaire_fcfa` : `INTEGER NOT NULL REFERENCES ref_coupure_xaf(valeur_unitaire_fcfa) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Coupure officielle, D-6a)*.
  - `quantite` : `INTEGER NOT NULL CHECK (typeof(quantite) = 'integer' AND quantite >= 0)`.
  - `montant_total_ligne_fcfa` : `INTEGER GENERATED ALWAYS AS (valeur_unitaire_fcfa * quantite) STORED`.
- **Contraintes (Matérialisation Q-08, D-5, D-6a) :**
  - **Clé composite unique par tour :** `UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)`.
  - Triggers append-only : `trg_detail_comptage_no_update` et `trg_detail_comptage_no_delete` interdisant formellement `UPDATE` et `DELETE` sur les lignes de détail insérées.
  - **Verrou d'insertion sur session fermée (17ᵉ trigger, D-5) :** Trigger `trg_detail_comptage_no_insert_closed` rejetant toute insertion de ligne de détail si la session de caisse parente est passée à l'état `'CLOTUREE'`.

#### Table 5.6bis : `ref_coupure_xaf` (Table 30 — D-6a, D-6b)
Référentiel des coupures physiques de monnaie ayant cours légal en zone BEAC (XAF) pour la République du Congo.
- **Colonnes :**
  - `valeur_unitaire_fcfa` : `INTEGER PRIMARY KEY` (Valeur faciale en FCFA entiers, sans centime).
  - `type_coupure` : `TEXT NOT NULL CHECK (type_coupure IN ('BILLET', 'PIECE', 'BILLET ET PIECE'))`.
  - `libelle` : `TEXT NOT NULL CHECK (length(trim(libelle)) > 0)`.
  - `est_active` : `INTEGER NOT NULL DEFAULT 1 CHECK (est_active IN (0, 1))`.
- **Régime et gouvernance (Règle R-4, D-6a) :**
  - Table de nomenclature administrative mutable, en dehors du régime append-only strict : les activations, désactivations ou ajustements de coupures s'opèrent par mise à jour des données administratives par l'établissement, sans modification du schéma DDL.
  - Clé primaire référencée par clé étrangère DDL depuis `detail_comptage_caisse(valeur_unitaire_fcfa)`.

#### Table 5.7 : `transmission_fonds`
Transferts sécurisés d'espèces d'une session vers une autre session ou un responsable.
- **Colonnes :**
  - `id_transmission_fonds` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_source` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `id_session_destination` : `TEXT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT` *(Matérialisation Q-06, nullable)*.
  - `id_responsable_reception` : `TEXT NULL` *(Identifiant du responsable récepteur physique si remise hors session, FIN-LOT5-007 / D-10)*.
  - `nom_responsable_snapshot` : `TEXT NULL` *(Nom tracé du responsable récepteur physique si remise hors session, FIN-LOT5-007 / D-10)*.
  - `montant_envoye_fcfa` : `INTEGER NOT NULL CHECK (typeof(montant_envoye_fcfa) = 'integer' AND montant_envoye_fcfa > 0)`.
  - `montant_recu_fcfa` : `INTEGER NULL CHECK (montant_recu_fcfa IS NULL OR (typeof(montant_recu_fcfa) = 'integer' AND montant_recu_fcfa >= 0))`.
  - `etat_transmission` : `TEXT NOT NULL DEFAULT 'EMISE' CHECK (etat_transmission IN ('EMISE', 'RECUE', 'ECART_CONSTATE'))`.
  - `date_envoi` : `TEXT NOT NULL`.
  - `date_reception` : `TEXT NULL`.
- **Contraintes (Matérialisation Q-06, D-10, D-11) :**
  - `CHECK (id_session_destination IS NULL OR id_session_destination != id_session_source)`.
  - `CHECK (id_session_destination IS NOT NULL OR (id_responsable_reception IS NOT NULL AND nom_responsable_snapshot IS NOT NULL))` *(Traçabilité obligatoire du destinataire physique si remise hors session)*.
  - `CHECK ((etat_transmission IN ('RECUE', 'ECART_CONSTATE') AND montant_recu_fcfa IS NOT NULL AND date_reception IS NOT NULL) OR (etat_transmission = 'EMISE' AND montant_recu_fcfa IS NULL))`.
  - **Figeage asynchrone à deux étapes (D-11) :** Trigger `trg_transmission_figee_reception` figeant les colonnes d'émission dès l'envoi, puis l'ensemble de la ligne dès confirmation de réception.

#### Table 5.8 : `rapprochement_caisse`
Constat de contrôle comparant les écritures au tiroir-caisse.
- **Colonnes :**
  - `id_rapprochement_caisse` : `TEXT PRIMARY KEY` (UUID).
  - `id_session_caisse` : `TEXT NOT NULL REFERENCES session_caisse(id_session_caisse) ON UPDATE RESTRICT ON DELETE RESTRICT`.
  - `date_rapprochement` : `TEXT NOT NULL`.
  - `solde_theorique_calcule_fcfa` : `INTEGER NOT NULL`.
  - `montant_physique_confronte_fcfa` : `INTEGER NOT NULL CHECK (montant_physique_confronte_fcfa >= 0)`.
  - `ecart_constate_fcfa` : `INTEGER NOT NULL`.
  - `est_definitif` : `INTEGER NOT NULL DEFAULT 0 CHECK (est_definitif IN (0, 1))` *(Marqueur de rapprochement final, D-4)*.
  - `superviseur` : `TEXT NOT NULL CHECK (length(trim(superviseur)) > 0)`.
- **Contraintes (Matérialisation GAP-15, Q-07, D-4) :**
  - Cardinalité `SESSION 0..N RAPPROCHEMENT_CAISSE` (conservation intégrale de l'historique sans réécriture).
  - **Index Partiel Unique de rapprochement définitif (D-4) :**  
    `CREATE UNIQUE INDEX idx_rapprochement_definitif ON rapprochement_caisse(id_session_caisse) WHERE est_definitif = 1;`
  - **Irrévocabilité assurée par doublet (D-4) :** Conjonction de l'index partiel unique et des triggers append-only (`trg_rapprochement_caisse_no_update` et `trg_rapprochement_caisse_no_delete`) interdisant tout `UPDATE` et `DELETE`. Insertion directe avec `est_definitif = 1` par le superviseur lors de l'arrêté final.

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
  - Triggers append-only : `trg_justification_ecart_no_update` et `trg_justification_ecart_no_delete` formellement armés pour interdire toute modification ou suppression.

---

## 4. Matérialisation des contraintes ratifiées

| Réf. Décision / GAP | Règle normative ratifiée | Spécification physique SQLite | Type d'objet DDL cible |
|---|---|---|---|
| **Q-01** | Rattachement créance vers identité canonique élève obligatoire | `creance.id_eleve TEXT NOT NULL REFERENCES eleve(id_eleve)` ; `id_inscription TEXT NULL REFERENCES inscription(id_inscription)` ; `id_affectation_classe TEXT NULL REFERENCES affectation_classe(id_affectation_classe)` | Colonnes & FKs |
| **Q-02** | Interdiction du chevauchement actif des remises | Trigger `trg_attribution_remise_check_overlap` vérifiant l'absence de chevauchement actif d'attribution pour un même élève, une même politique et une même année scolaire | Trigger SQLite |
| **Q-03** | Rangs uniques > 0, échéances > 0, somme = plan | `UNIQUE (id_plan_reglement_creance, rang)`, `CHECK (rang > 0)`, `CHECK (montant_exigible_fcfa > 0)`. Trigger `trg_plan_somme_echeances` de contrôle de somme totale *(sous réserve Q-03)* | Contraintes de table & Trigger |
| **Q-04** | Transaction Mobile Money confirmée liée à 0..1 encaissement | `transaction_mobile_money.id_encaissement TEXT NULL UNIQUE REFERENCES encaissement(id_encaissement)` ; `UNIQUE (fournisseur, compte_marchand, reference_externe)` ; `CHECK ((etat_financier = 'CONFIRME' AND id_encaissement IS NOT NULL) OR (etat_financier != 'CONFIRME' AND id_encaissement IS NULL))` | Colonne, UNIQUE & CHECK |
| **Q-05 / D-1** | Exclusivité de session active sur poste de caisse seul | `session_caisse.etat TEXT NOT NULL DEFAULT 'OUVERTE' CHECK (etat IN ('OUVERTE', 'CLOTUREE'))` ; `CREATE UNIQUE INDEX idx_session_active_poste ON session_caisse(id_poste_caisse) WHERE etat = 'OUVERTE'` | Colonne, CHECK & Index partiel unique |
| **Q-06 / D-10**| Destination facultative sur transmission de fonds | `transmission_fonds.id_session_destination TEXT NULL REFERENCES session_caisse(id_session_caisse)` ; traçabilité obligatoire du destinataire physique si NULL (`id_responsable_reception`, `nom_responsable_snapshot`) | Colonnes, FK nullable & CHECK |
| **Q-07 / D-5** | Clôture unique par session et scellement ordonné | `cloture_caisse` : `UNIQUE (id_session_caisse)` ; séquence Option C avec transition explicite `session_caisse.etat = 'CLOTUREE'` ; concordance arithmétique armée au scellement | Contrainte UNIQUE & Triggers |
| **Q-08 / D-5** | Tour de comptage unique par valeur et immutabilité | `detail_comptage_caisse` : `UNIQUE (id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)` ; Triggers append-only UPDATE/DELETE ; trigger rejetant l'insertion si session fermée | Contrainte UNIQUE & Triggers |
| **Q-09** | Frontière nette Lot 4 / Lot 6 et deux XOR stricts sur affectation | `affectation_reglement` : `CHECK ((id_encaissement IS NOT NULL AND id_mouvement_credit_utilisation IS NULL) OR (id_encaissement IS NULL AND id_mouvement_credit_utilisation IS NOT NULL))` ; `CHECK ((id_creance IS NOT NULL AND id_echeance_creance IS NULL) OR (id_creance IS NULL AND id_echeance_creance IS NOT NULL))` | Contraintes CHECK |
| **GAP-14 / D-3**| Protection append-only de `mouvement_caisse` et unicité de remboursement | `trg_mouvement_caisse_no_delete` ; `trg_mouvement_caisse_no_update_closed` ; `CHECK (type_mouvement <> 'REMBOURSEMENT' OR id_operation_source IS NOT NULL)` ; `CREATE UNIQUE INDEX idx_mouvement_remboursement_unique` | Triggers, CHECK & Index partiel unique |
| **GAP-15 / D-4**| Irrévocabilité du rapprochement définitif | `CREATE UNIQUE INDEX idx_rapprochement_definitif ON rapprochement_caisse(id_session_caisse) WHERE est_definitif = 1;` ; `trg_rapprochement_caisse_no_update` ; `trg_rapprochement_caisse_no_delete` | Index partiel unique & Triggers |
| **GAP-16** | Absence de modification/suppression sur justifications | `trg_justification_ecart_no_update`, `trg_justification_ecart_no_delete` | Triggers SQLite |
| **D-6a / D-6b** | Référentiel des coupures de monnaie (zone BEAC) | Table `ref_coupure_xaf (valeur_unitaire_fcfa INTEGER PRIMARY KEY, ...)` ; FK depuis `detail_comptage_caisse(valeur_unitaire_fcfa)` ; sous-ensemble actif ≥ 25 FCFA | Table DDL & FK |
| **D-11** | Figeage asynchrone à deux temps des transmissions | Trigger `trg_transmission_figee_reception` (colonnes d'émission inaltérables dès `'EMISE'`, ligne immuable dès `'RECUE'` / `'ECART_CONSTATE'`) | Trigger SQLite |

---

## 5. Inventaire fonctionnel des triggers cibles (17 triggers)

*Spécification fonctionnelle exhaustive des 17 règles transactionnelles cibles pour SQLite.*

| N° | Nom du trigger | Table cible | Événement | Règle fonctionnelle appliquée |
|---|---|---|---|---|
| 1 | `trg_attribution_remise_check_overlap` | `attribution_remise` | `BEFORE INSERT / UPDATE` | Vérifie l'absence de chevauchement temporel actif pour l'élève, l'année et la politique de remise (Q-02). |
| 2 | `trg_creance_immutable_snapshots` | `creance` | `BEFORE UPDATE` | Interdit la modification des montants brut/remise/net, de l'élève et des snapshots après émission. |
| 3 | `trg_plan_somme_echeances` | `echeance_creance` | `AFTER INSERT / UPDATE / DELETE` | Vérifie que la somme des échéances d'un plan actif égale `plan_reglement_creance.montant_total_planifie_fcfa` (sous réserve Q-03). |
| 4 | `trg_affectation_no_update` | `affectation_reglement` | `BEFORE UPDATE` | Interdit formellement toute modification d'une affectation validée (immuabilité append-only). |
| 5 | `trg_affectation_no_delete` | `affectation_reglement` | `BEFORE DELETE` | Interdit formellement la suppression physique d'une affectation validée (compensation par contre-écriture uniquement). |
| 6 | `trg_mouvement_caisse_no_delete` | `mouvement_caisse` | `BEFORE DELETE` | Interdit la suppression de tout mouvement de caisse physique validé (GAP-14 / FIN-LOT5-035). |
| 7 | `trg_mouvement_caisse_no_update_closed`| `mouvement_caisse` | `BEFORE UPDATE` | Bloque toute mise à jour si la session rattachée possède l'état `'CLOTUREE'` (GAP-14). |
| 8 | `trg_session_caisse_cloturee_immutable`| `session_caisse` | `BEFORE UPDATE` | **Réserve R-6 (verdict D-5) :** Armé avec la clause `WHEN OLD.etat = 'CLOTUREE'`. Autorise l'UPDATE de scellement (`OUVERTE → CLOTUREE`), mais bloque toute modification ultérieure et rend physiquement impossible toute réouverture vers `'OUVERTE'`. |
| 9 | `trg_cloture_comptage_concordance`| `session_caisse` | `BEFORE UPDATE OF etat` | **16ᵉ trigger (verdict D-5 / Option C) :** Armé lors du scellement (`etat = 'CLOTUREE'`). Vérifie l'existence du tour `numero_comptage_retenu` et l'égalité arithmétique stricte entre la somme du tour retenu et `montant_physique_fcfa` (FIN-LOT5-013). |
| 10 | `trg_detail_comptage_no_insert_closed` | `detail_comptage_caisse` | `BEFORE INSERT` | **17ᵉ trigger (verdict D-5 / Option C) :** Bloque toute insertion de ligne de dénombrement si la session de caisse parente est déjà passée à l'état `'CLOTUREE'`. |
| 11 | `trg_detail_comptage_no_update` | `detail_comptage_caisse` | `BEFORE UPDATE` | Fige les lignes de comptage physique après insertion (Q-08). |
| 12 | `trg_detail_comptage_no_delete` | `detail_comptage_caisse` | `BEFORE DELETE` | Interdit la suppression de tout tour de comptage physique (Q-08). |
| 13 | `trg_transmission_figee_reception` | `transmission_fonds` | `BEFORE UPDATE` | **Verdict D-11 (B.10) :** Fige irréversiblement les colonnes d'émission dès `'EMISE'`, puis rend la ligne totalement immuable dès réception (`'RECUE'` ou `'ECART_CONSTATE'`). |
| 14 | `trg_rapprochement_caisse_no_update` | `rapprochement_caisse` | `BEFORE UPDATE` | Interdit la réécriture d'un rapprochement de caisse historique (GAP-15 / Q-07 / D-4). |
| 15 | `trg_rapprochement_caisse_no_delete` | `rapprochement_caisse` | `BEFORE DELETE` | Interdit la suppression d'un rapprochement de caisse historique (GAP-15 / Q-07 / D-4). |
| 16 | `trg_justification_ecart_no_update` | `justification_ecart_caisse` | `BEFORE UPDATE` | Interdit la modification d'une justification d'écart enregistrée (GAP-16 / Q-07). |
| 17 | `trg_justification_ecart_no_delete` | `justification_ecart_caisse` | `BEFORE DELETE` | Interdit la suppression d'une justification d'écart enregistrée (GAP-16 / Q-07). |

---

## 6. Propositions d'index de performance et d'intégrité

*14 index physiques explicites documentés pour optimiser les calculs financiers et garantir les contraintes d'intégrité métier sans pénaliser le débit d'écriture.*

| Table | Index proposé | Type / Colonnes | Justification technique et métier |
|---|---|---|---|
| `creance` | `idx_creance_eleve_annee` | `(id_eleve, id_annee_scolaire)` | Accélération de la consultation de l'état de compte élève et calcul du solde restant dû. |
| `creance` | `idx_creance_etat_active` | Partiel : `(id_annee_scolaire) WHERE etat_creance = 'ACTIVE'` | Optimisation du calcul de la balance âgée et des relances (Lot 7). |
| `attribution_remise` | `idx_attribution_eleve_politique`| `(id_eleve, id_politique_remise, id_annee_scolaire)` | Performance du contrôle de non-chevauchement lors des inscriptions. |
| `plan_reglement_creance`| `idx_plan_creance_actif` | Partiel UNIQUE : `(id_creance) WHERE etat_plan = 'ACTIF'` | Garantie physique d'un seul plan actif par créance et recherche instantanée. |
| `echeance_creance` | `idx_echeance_plan_rang` | `(id_plan_reglement_creance, rang)` | Ordonnancement séquentiel lors de l'application de paiements partiels. |
| `affectation_reglement`| `idx_affectation_creance` | `(id_creance) WHERE id_creance IS NOT NULL` | Calcul rapide du cumul réglé au niveau de la créance (RAP direct). |
| `affectation_reglement`| `idx_affectation_echeance` | `(id_echeance_creance) WHERE id_echeance_creance IS NOT NULL` | Calcul rapide du reste à payer par échéance individuelle. |
| `affectation_reglement`| `idx_affectation_encaissement`| `(id_encaissement)` | Vérification du solde résiduel disponible sur un encaissement pour ventilation N:N. |
| `session_caisse` | `idx_session_active_poste` | Partiel UNIQUE : `(id_poste_caisse) WHERE etat = 'OUVERTE'` | **Garantie physique Q-05 / D-1 :** Exclusivité stricte d'une seule session active par poste. |
| `mouvement_caisse` | `idx_mouvement_remboursement_unique` | Partiel UNIQUE : `(id_operation_source, id_session_caisse) WHERE type_mouvement = 'REMBOURSEMENT'` | **Garantie physique D-3 / R-1 :** Unicité absolue de l'incidence d'un remboursement d'espèces par couple (source canonique, session). |
| `mouvement_caisse` | `idx_mouvement_session` | `(id_session_caisse, sens, montant_fcfa)` | Agrégation rapide pour calcul du solde théorique lors de la clôture de caisse. |
| `detail_comptage_caisse`| `idx_detail_comptage_tour` | `(id_cloture_caisse, numero_comptage)` | Sommation rapide par tour de recomptage physique. |
| `transmission_fonds` | `idx_transmission_source_dest`| `(id_session_source, id_session_destination)` | Pointage des transferts inter-caisses en attente de réception. |
| `rapprochement_caisse`| `idx_rapprochement_definitif` | Partiel UNIQUE : `(id_session_caisse) WHERE est_definitif = 1` | **Garantie physique Q-07 / D-4 :** Unicité stricte de l'acte de rapprochement définitif par session. |

**Méthode de dénombrement des index :**
- **14 index explicites documentés :** 10 index de performance/navigation et 4 index partiels uniques métier (`idx_session_active_poste`, `idx_mouvement_remboursement_unique`, `idx_rapprochement_definitif`, `idx_plan_creance_actif`).
- **Index automatiques exclus :** Les index automatiques générés nativement par SQLite pour supporter les clés primaires et contraintes d'unicité intégrales (`sqlite_autoindex_*`) sont exclus de ce décompte d'ingénierie explicite.

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

*Tableau exhaustif servant de spécification de base pour le mandat d'élaboration du plan correctif des migrations 003 à 007.*

| Table physique | Statut dans DDL 003–007 réel | Éléments manquants ou non conformes | Travaux physiques cibles du plan correctif |
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
| `plan_reglement_creance`| Présente dans 005 | Pas de colonne `type_plan`, pas de colonne `etat_plan`, pas d'unicité du plan actif | Ajouter colonnes `type_plan`, `etat_plan` ; créer index partiel unique `idx_plan_creance_actif` (D-8). |
| `reamenagement_echeancier`| Présente dans 005 | Structure simplifiée | Conformer les colonnes de solde et de motif. |
| `echeance_creance` | Présente dans 005 | Pas d'unicité `(id_plan, rang)` ; montant non contraint à `> 0` | Ajouter `UNIQUE(id_plan, rang)` et `CHECK (montant_exigible_fcfa > 0)` (Q-03). |
| `evenement_echeance`| Présente dans 005 | Conforme | Conformer les liaisons au réaménagement. |
| `encaissement` | Présente dans 006 | Pas de trigger bloquant DELETE | Ajouter trigger append-only interdisant DELETE. |
| `mouvement_credit` | Présente dans 006 | Conforme (frontière Lot 4) | Aucun |
| `affectation_reglement`| Présente dans 006 | Pas de cible dette ; pas de XOR d'origine ; pas de montant `> 0` ; modifiable/supprimable | Ajouter colonnes `id_creance`, `id_echeance_creance` ; contraintes XOR origine et cible ; triggers append-only. |
| `transaction_mobile_money`| Présente dans 006| Pas de clé composite externe ; pas de FK vers encaissement ; pas de montant | Ajouter `id_encaissement`, `montant_declare_fcfa`, contrainte composite `UNIQUE(fournisseur, compte_marchand, reference_externe)`. |
| `poste_caisse` | Présente dans 007 | Conforme | Aucun |
| `appareil` | Présente dans 007 | Conforme | Aucun |
| `session_caisse` | Présente dans 007 | Pas de colonne `etat` ; pas d'index d'exclusivité active | Ajouter colonne `etat` (`OUVERTE`, `CLOTUREE`) ; créer index partiel unique `idx_session_active_poste` (Q-05 / D-1) ; armer trigger `trg_session_caisse_cloturee_immutable` (R-6 / D-5). |
| `mouvement_caisse` | Présente dans 007 | Colonnes manquantes (`sens`, `type_mouvement`, `id_operation_source`, `date_mouvement`) ; DELETE autorisé ; UPDATE hors clôture non couvert ; pas de contrainte remboursement | Ajouter les colonnes manquantes ; ajouter `CHECK` remboursement et index partiel unique `idx_mouvement_remboursement_unique` (D-3) ; triggers append-only (GAP-14) ; règle fenêtre R-3. |
| `cloture_caisse` | Présente dans 007 | Pas de contrainte `UNIQUE(id_session_caisse)` ; pas de colonne `numero_comptage_retenu` ; fermeture immédiate non articulée | Ajouter contrainte `UNIQUE(id_session_caisse)` (Q-07) ; colonne `numero_comptage_retenu` (D-5) ; intégrer la séquence de scellement Option C. |
| `detail_comptage_caisse`| Présente dans 007 | Pas d'unicité par tour/dénomination ; modifiable ; pas de FK vers nomenclature coupures ; pas de verrou session fermée | Ajouter `UNIQUE(id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)` (Q-08) ; FK vers `ref_coupure_xaf` (D-6a) ; triggers append-only (Q-08) ; trigger `trg_detail_comptage_no_insert_closed` (D-5). |
| `ref_coupure_xaf` | Absente de 007 | Table de référence inexistante dans le DDL actuel | Créer la table `ref_coupure_xaf` (30ᵉ table, D-6a) ; peupler le jeu de données initial ≥ 25 FCFA (D-6b). |
| `transmission_fonds` | Présente dans 007 | Pas de session destination (une seule session dans 007) ; pas de récepteur physique hors session ; pas de figeage asynchrone | Ajouter `id_session_destination UUID NULL` (Q-06) ; colonnes `id_responsable_reception` et `nom_responsable_snapshot` (D-10) ; trigger de figeage à deux temps `trg_transmission_figee_reception` (D-11). |
| `rapprochement_caisse`| Présente dans 007 | Absence de colonne `est_definitif` ; absence d'index partiel ; absence de triggers UPDATE/DELETE | Ajouter colonne `est_definitif` ; créer index partiel unique `idx_rapprochement_definitif` ; ajouter triggers append-only (GAP-15 / D-4). |
| `justification_ecart_caisse`| Présente dans 007 | Absence de triggers UPDATE/DELETE ; colonnes motif/auteur manquantes | Ajouter colonnes `motif_ecart`, `auteur`, `date_justification` ; ajouter triggers append-only (GAP-16 / Q-07). |

---

## 9. Règles physiques arrêtées (application des verdicts D-0 à D-11)

*La présente section consigne les règles physiques définitivement arrêtées suite aux verdicts D-0 à D-11 prononcés par le propriétaire le 07/11/2026. Toutes les propositions antérieures (B.1 à B.10) sont ainsi ratifiées et élevées au statut de règles physiques intangibles.*

### B.1 — Conventions exactes des codes et leur matérialisation (Verdict D-7)
- **Règle physique arrêtée :** Les énumérations de statut et codes d'état sont matérialisées nativement sous forme de contraintes `TEXT CHECK (colonne IN (...))` directement intégrées dans les tables concernées.
- **Justification d'ingénierie :** Approche native et performante de SQLite WASM/OPFS, évitant la prolifération de tables de nomenclature superflues tout en garantissant un contrôle d'intégrité strict sans coût de jointure.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-7).

### B.2 — Mécanisme de validation propriétaire des plans et réaménagements (Verdict D-8)
- **Règle physique arrêtée :** La validation d'un plan de règlement s'opère par transition d'état atomique sous transaction applicative (`etat_plan = 'ACTIF'`, `date_validation TEXT NOT NULL`, `valide_par TEXT NOT NULL`) accompagnée de la bascule de l'ancien plan actif vers `'HISTORIQUE'`.
- **Justification d'ingénierie :** Assure la traçabilité complète de l'acteur et de l'instant de validation directement sur l'entité plan, couverte par l'index partiel unique `idx_plan_creance_actif`.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-8).

### B.3 — Ordre des statements transactionnels — bascule de plan (Verdict D-9)
- **Règle physique arrêtée :** L'ordonnancement transactionnel strict d'activation d'un plan s'exécute sous une transaction `BEGIN IMMEDIATE` selon le séquencement immuable suivant :
  1. Insertion du nouveau plan en état `'BROUILLON'` ;
  2. Insertion des nouvelles échéances associées au nouveau plan ;
  3. Vérification arithmétique de la somme des échéances contre le solde restant dû *(sous réserve Q-03)* ;
  4. Mise à jour de l'ancien plan actif vers `'HISTORIQUE'` ;
  5. Mise à jour du nouveau plan vers `'ACTIF'` avec horodatage et visa (`date_validation`, `valide_par`).
- **Justification d'ingénierie :** Prévient tout état intermédiaire corrompu : en cas d'échec sur une échéance, le rollback automatique préserve intact l'ancien plan actif sans rupture d'exploitation.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-9).

### B.4 — Traitement des ouvertures concurrentes Offline-First de sessions de caisse (Verdict D-1)
*(Formulation M-1 adoptée verbatim)*
- **Règle physique arrêtée :**
  1. *Au niveau local (moteur SQLite) :* L'index partiel d'exclusivité `idx_session_active_poste` (`WHERE etat = 'OUVERTE'`) garantit physiquement qu'une base locale ne peut porter simultanément deux sessions actives pour un même poste de caisse (Q-05).
  2. *Au niveau de la synchronisation centrale (serveur Lot 8 / VAL-014) :* En cas d'ouvertures concurrentes survenues hors ligne sur des postes distincts pour une même référence, l'arbitrage central du serveur rejette le conflit sans fusion de dernière écriture gagnante (pas de LWW) et consigne l'anomalie dans le journal de réconciliation pour traitement administratif.
  3. *Périmètre strict :* La règle s'applique strictement aux ouvertures de `session_caisse` sur un `poste_caisse` (Q-05).
  4. *Épuration :* Toute mention relative à un arbitrage local des conflits concurrents sur les « plans » est exclue du périmètre de cette règle de caisse.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-1).

### B.5 — Référence physique et unicité d'incidence des remboursements (Verdicts D-2 et D-3)
*(Formulation M-2 adoptée avec règle d'or R-1 et renforcement physique D-3)*
- **Règle physique arrêtée :**
  1. *Règle d'or de l'incidence unique (R-1 / D-2) :* Une seule incidence financière en espèces est créée par couple `(source canonique, session de caisse)`. Tout déboursement d'espèces lié à un remboursement du Lot 6 donne lieu à une sortie unique dans `mouvement_caisse` (`sens = 'SORTIE'`, `type_mouvement = 'REMBOURSEMENT'`).
  2. *Pointeur polymorphe :* La colonne `id_operation_source TEXT NULL` de `mouvement_caisse` porte l'identifiant de l'opération source canonique (l'identifiant du remboursement Lot 6 `remboursement_fonds`), sans altération du schéma DDL du Lot 6 ni du MLD validé VAL-017 (règle de non-régression R-2).
  3. *Renforcement physique d'intégrité (D-3) :*  
     - Contrainte CHECK : `CHECK (type_mouvement <> 'REMBOURSEMENT' OR id_operation_source IS NOT NULL)`.  
     - Index partiel unique d'intégrité physique :  
       `CREATE UNIQUE INDEX idx_mouvement_remboursement_unique ON mouvement_caisse(id_operation_source, id_session_caisse) WHERE type_mouvement = 'REMBOURSEMENT';`
- **Statut :** Règle physique arrêtée et ratifiée (Verdicts D-2 et D-3).

### B.6 — Destinataire hors session des transmissions de fonds (Verdict D-10)
- **Règle physique arrêtée :** Sur `transmission_fonds`, la colonne `id_session_destination TEXT NULL` est facultative (Q-06). Lorsqu'elle est NULL (remise d'espèces à un gestionnaire ou trésorier sans session informatisée active), les colonnes `id_responsable_reception TEXT NOT NULL` et `nom_responsable_snapshot TEXT NOT NULL` sont obligatoires (`FIN-LOT5-007`).
- **Justification d'ingénierie :** Couvre fidèlement les réalités d'exploitation des établissements scolaires tout en maintenant une traçabilité nominative inaltérable.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-10).

### B.7 — Désignation et irrévocabilité du rapprochement définitif (Verdict D-4)
*(Formulation M-3 adoptée verbatim)*
- **Règle physique arrêtée :**
  1. *Distinction des états :* Le MPD cible intègre la colonne `est_definitif INTEGER NOT NULL DEFAULT 0 CHECK (est_definitif IN (0, 1))` sur `rapprochement_caisse` ainsi que les triggers append-only (GAP-15), actuellement absents du DDL réel de la migration 007.
  2. *Doublet d'irrévocabilité :* L'irrévocabilité absolue du rapprochement final est garantie conjointement par :  
     - L'index partiel d'exclusivité : `CREATE UNIQUE INDEX idx_rapprochement_definitif ON rapprochement_caisse(id_session_caisse) WHERE est_definitif = 1;`  
     - Les triggers append-only inconditionnels `trg_rapprochement_caisse_no_update` et `trg_rapprochement_caisse_no_delete`.
  3. *Insertion directe :* Le rapprochement final est inséré directement avec `est_definitif = 1` lors de la constatation de supervision, sans requérir de réécriture des contrôles intermédiaires antérieurs (`est_definitif = 0`).
  4. *Autonomie de la clôture :* Le rapprochement définitif demeure un acte d'audit de contrôle distinct de la clôture de caisse (`cloture_caisse`), seul fait générateur de fermeture opérationnelle de la session.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-4).

### B.8 — Architecture de scellement et tour de comptage de référence (Verdict D-5)
*(Option C adoptée avec réserve propriétaire R-6, règle R-3 et contrôle R-5)*
- **Règle physique arrêtée :**
  1. *Séquence de scellement en trois temps :*  
     - **Étape 1 :** Insertion de la ligne `cloture_caisse` portant les montants calculés et le pointeur `numero_comptage_retenu`. Cette insertion ne ferme pas immédiatement la session.  
     - **Étape 2 :** Saisie et insertion des lignes de dénombrement physique dans `detail_comptage_caisse` pour le tour retenu, reliées par clé étrangère à `cloture_caisse`.  
     - **Étape 3 :** Scellement irréversible de la session par la commande explicite :  
       `UPDATE session_caisse SET etat = 'CLOTUREE' WHERE id_session_caisse = ...;`
  2. *Contrôle de concordance arithmétique (16ᵉ trigger) :*  
     Le trigger `trg_cloture_comptage_concordance` est armé sur la transition de scellement (`BEFORE UPDATE OF etat ON session_caisse`). Il vérifie :  
     a. L'existence d'au moins une ligne de détail associée au tour `numero_comptage_retenu` ;  
     b. L'égalité arithmétique stricte (`FIN-LOT5-013`) :  
        `SUM(valeur_unitaire_fcfa * quantite) = cloture_caisse.montant_physique_fcfa`.
  3. *Verrouillage d'insertion post-scellement (17ᵉ trigger) :*  
     Le trigger `trg_detail_comptage_no_insert_closed` (`BEFORE INSERT ON detail_comptage_caisse`) bloque toute insertion si la session parente est passée à `'CLOTUREE'`.
  4. *Protection contre la réouverture — Réserve R-6 du propriétaire :*  
     Le trigger `trg_session_caisse_cloturee_immutable` est armé avec la condition `WHEN OLD.etat = 'CLOTUREE'`. Il autorise la transition `OUVERTE → CLOTUREE`, mais bloque tout `UPDATE` ultérieur, interdisant physiquement toute réouverture vers `'OUVERTE'`.
  5. *Règle de la fenêtre opérationnelle (Règle R-3) :*  
     Dès l'insertion de l'enregistrement de `cloture_caisse`, aucune nouvelle écriture n'est autorisée dans `mouvement_caisse`.
- **Annexe comparative documentaire (Contrôle R-5) :**
  - *Option A (Rejetée) :* Clôture immédiate à l'INSERT de `cloture_caisse`. Rejetée car elle crée une circularité bloquante pour l'insertion des lignes de dénombrement sous contrainte d'intégrité référentielle.
  - *Option B (Rejetée) :* Colonne d'état supplémentaire `etat_cloture` sur `cloture_caisse`. Rejetée car redondante avec `session_caisse.etat`.
  - *Option C (Adoptée) :* Scellement déporté sur la transition explicite `session_caisse.etat = 'CLOTUREE'`, assurant un séquencement fluide et un verrouillage matériel étanche.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-5).

### B.9 — Référentiel des coupures physiques de monnaie (Verdicts D-6a et D-6b)
*(Option 1 adoptée, nomenclature administrative mutable R-4, sous-ensemble initial ≥ 25 FCFA)*
- **Cadre monétaire officiel :** Zone BEAC — Franc CFA d'Afrique centrale (code ISO : XAF) — République du Congo. Exclusion stricte de toute référence à la zone UEMOA/BCEAO/XOF (aucune pièce de 250 FCFA).
- **Architecture technique (D-6a / Option 1) :**
  - Création de la table de nomenclature `ref_coupure_xaf (valeur_unitaire_fcfa INTEGER PRIMARY KEY, type_coupure TEXT, libelle TEXT, est_active INTEGER)`.
  - Clé étrangère DDL depuis `detail_comptage_caisse(valeur_unitaire_fcfa) REFERENCES ref_coupure_xaf(valeur_unitaire_fcfa)`.
  - **Règle de gestion administrative (R-4) :** Référentiel administratif mutable, hors du régime append-only strict : l'établissement peut activer ou désactiver des coupures par mise à jour des données sans modifier le schéma DDL.
- **Données de référence initiales arrêtées au 07/11/2026 (Verdict D-6b) :**  
  Sous-ensemble opérationnel actif restreint aux valeurs faciales supérieures ou égales à 25 FCFA, comprenant **9 valeurs distinctes et 10 formes physiques** :

| Valeur faciale (PK) | Forme physique (`type_coupure`) | Libellé officiel | Gammes d'émission BEAC de référence | Statut initial (`est_active`) |
|---|---|---|---|---|
| **10 000** | `BILLET` | Billet de 10 000 FCFA | Gammes 2002 / 2020 | `1` (Actif) |
| **5 000** | `BILLET` | Billet de 5 000 FCFA | Gammes 2002 / 2020 | `1` (Actif) |
| **2 000** | `BILLET` | Billet de 2 000 FCFA | Gammes 2002 / 2020 | `1` (Actif) |
| **1 000** | `BILLET` | Billet de 1 000 FCFA | Gammes 2002 / 2020 | `1` (Actif) |
| **500** | `BILLET ET PIECE` | Billet et Pièce de 500 FCFA | Billets 2002/2020 — Pièces 2006/2024 | `1` (Actif) |
| **200** | `PIECE` | Pièce de 200 FCFA | Gamme Type 2024 (mise en circulation le 02/04/2025) | `1` (Actif) |
| **100** | `PIECE` | Pièce de 100 FCFA | Gammes 2006 / 2024 | `1` (Actif) |
| **50** | `PIECE` | Pièce de 50 FCFA | Gammes 2006 / 2024 | `1` (Actif) |
| **25** | `PIECE` | Pièce de 25 FCFA | Gammes 2006 / 2024 | `1` (Actif) |

- **Dispositions réglementaires et d'exploitation :**
  1. *Double forme de 500 FCFA :* Le billet et la pièce de 500 FCFA ont tous deux cours légal dans la zone BEAC ; ils partagent la même valeur faciale de 500 FCFA et sont regroupés sous la dénomination `'BILLET ET PIECE'`.
  2. *Pièce de 200 FCFA :* Créée et mise en circulation officielle le 2 avril 2025 au sein de la nouvelle gamme de pièces « Type 2024 » de la BEAC.
  3. *Démonétisation des pièces pré-2006 :* En application de la décision de l'UMAC prise à N'Djamena le 07/10/2026, toutes les pièces de monnaie des gammes antérieures à 2006 sont privées du cours légal et démonétisées à compter du 1ᵉʳ novembre 2026.
  4. *Valeurs inférieures à 25 FCFA :* Les valeurs de 10 FCFA, 5 FCFA, 2 FCFA et 1 FCFA sont exclues du référentiel initial d'exploitation de caisse de l'établissement (décision d'établissement révisable administrativement selon la règle R-4).
- **Statut :** Règle physique arrêtée et ratifiée (Verdicts D-6a et D-6b).

### B.10 — Mutabilité de la transmission de fonds après réception (Verdict D-11)
- **Règle physique arrêtée :** Cycle de figeage asynchrone à deux étapes par trigger :
  1. Dès l'émission (`etat_transmission = 'EMISE'`), les colonnes d'expédition (`id_session_source`, `montant_envoye_fcfa`, `date_envoi`) deviennent totalement inaltérables (`UPDATE` interdit) ;
  2. Dès la confirmation de réception (`etat_transmission IN ('RECUE', 'ECART_CONSTATE')`), les colonnes de réception (`montant_recu_fcfa`, `date_reception`, `id_session_destination`) sont consignées et l'ensemble de la ligne devient irrévocablement immuable.
- **Justification d'ingénierie :** Traduit fidèlement la chaîne de garde physique des fonds : l'expéditeur ne peut altérer son envoi en cours de transit, et le récepteur fige définitivement la transaction.
- **Statut :** Règle physique arrêtée et ratifiée (Verdict D-11).

---

## 10. Traçabilité, réserves et inventaire final

### 10.1 Enregistrement des décisions et régularisation (D-0 à D-11)
1. **Régularisation formelle D-0 :** Par décision explicite actuelle du 07/11/2026, le propriétaire régularise l'opération d'amendement du commit `31011c4` en `ac0bc61` en pleine connaissance du diff contrôlé (zones §5 et §9), constatant l'absence de toute altération des sections §1 à §4, §6 à §8 et §10, et sans rétroactivité.
2. **Décisions ratifiées :** Application intégrale des décisions propriétaires D-0, D-1, D-2, D-3, D-4, D-5, D-6a, D-6b, D-7, D-8, D-9, D-10 et D-11 prononcées le 07/11/2026.
3. **Contrôles d'exécution R-1 à R-6 :**
   - **R-1 (Conforme) :** Incidence de remboursement formulée par couple `(source canonique, session de caisse)`.
   - **R-2 (Conforme) :** Aucune altération des tables du Lot 6 ni du MLD validé VAL-017 ; zéro modification de la migration 008.
   - **R-3 (Conforme) :** Règle de la fenêtre clôture → scellement interdisant toute nouvelle écriture dans `mouvement_caisse`.
   - **R-4 (Conforme) :** Table `ref_coupure_xaf` régie comme nomenclature administrative mutable, hors append-only.
   - **R-5 (Conforme) :** Tableau comparatif des options B.8 conservé en annexe de la section 9.
   - **R-6 (Conforme) :** Protection contre la réouverture d'une session clôturée (`trg_session_caisse_cloturee_immutable` avec `WHEN OLD.etat = 'CLOTUREE'`).

### 10.2 Inventaire final des objets DDL cibles
- **Tables physiques :** **30 tables** (29 tables issues du MLD financier validé VAL-017 + 1 table de nomenclature administrative `ref_coupure_xaf` introduite sous D-6a).
- **Triggers d'intégrité :** **17 triggers transactionnels** recensés de manière exhaustive en section 5 (16 triggers historiques réalignés sur le scellement Option C + `trg_detail_comptage_no_insert_closed`).
- **Index physiques explicites :** **14 index explicites documentés** en section 6 (10 index de navigation/performance + 4 index partiels uniques portant des garanties métier : `idx_session_active_poste`, `idx_mouvement_remboursement_unique`, `idx_rapprochement_definitif`, `idx_plan_creance_actif`), distincts des auto-index implicites SQLite.

### 10.3 Réserves normatives maintenues
- Réserve héritée de VAL-016 : absence des modèles sources originaux des lots 1 à 5.
- Réserve Q-03 : lien entre montant net initial et plan ; pluriel des échéances.
- Réserve Lot 8 : arbitrage central des conflits concurrents hors ligne par le serveur (VAL-014).

---

## Verdict et prochaine étape

**GEL v1.0 PRONONCÉ — 07/11/2026.**  
Le présent Modèle Physique de Données (MPD v1.0) est définitivement gelé suite à la ratification souveraine des verdicts D-0 à D-11. Il constitue le contrat technique d'ingénierie physique intangible régissant les travaux d'écriture du futur plan correctif des migrations 003 à 007.  
Aucune modification physique du code ou des migrations n'est opérée dans le cadre de ce gel documentaire.
