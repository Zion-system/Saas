# 19 — MLD global V1.0

**Statut : MLD global V1.0 — proposition de référence relationnelle consolidée, en attente de validation formelle du propriétaire.**
**Périmètre :** transformation logique du MCD global V1.0 validé sous VAL-016, en conservant les lots et domaines déjà validés ou gelés et sans réouvrir les décisions validées. L'objectif est d'obtenir un MLD cohérent et traçable pour la conception physique PostgreSQL/SQLite locale.

**Principes de travail :**

- Ne pas réécrire le MCD ni créer de nouveau MCD.
- Respecter les décisions VAL-013, VAL-014, VAL-015 et VAL-016.
- Ne pas inventer de structures manquantes pour les lots financiers 1 à 5.
- Conserver les UUID comme clés techniques.
- Ne pas convertir des contraintes métier en simples conventions applicatives quand une contrainte structurelle est possible.
- Marquer `À CONFIRMER` les éléments insuffisamment documentés et poursuivre la construction sans blocage sur les points non critiques.

---

## 1. Présentation et périmètre du MLD

Ce document présente le Modèle Logique de Données (MLD) global V1.0 pour l'ERP scolaire, construit à partir du MCD global V1.0 et des modèles spécialisés validés ou gelés par le projet.

### 1.1. Références normatives conservées

- MCD global V1.0 validé sous VAL-016, avec réserve documentaire explicite sur les lots financiers 1 à 5.
- Lot 7 gelé sous VAL-013.
- Lot 8 gelé sous VAL-014.
- Domaine pédagogique gelé sous VAL-015.
- Documents de référence consolidés dans `00-perimetre-et-principes.md`, `01-mcd-global.md`, `02-dictionnaire-des-entites.md`, `03-relations-et-cardinalites.md`, `04-regles-metier.md`, `05-cycles-de-vie-et-statuts.md`, `06-decisions-et-points-ouverts.md`, `07-historique-des-validations.md`, `08-mcd-consolide-lot8.md`, `09-dossier-pedagogique-preliminaire.md`, `10-verification-sources-financieres-lots-1-a-5.md`, `11-mld-global.md`.

### 1.2. Périmètre retenu

Le MLD global comprend :

1. Organisation de l'établissement.
2. Élèves et responsables.
3. Candidatures, préinscriptions, inscriptions et affectations.
4. Frais scolaires, facturation, créances et échéances.
5. Caisse, sessions, mouvements et clôtures.
6. Crédits, avoirs et remboursements.
7. Relances et balance âgée.
8. Synchronisation Offline-First.
9. Gestion pédagogique, évaluations et résultats.
10. Consolidation du MLD global.

### 1.3. Limites documentaires à respecter

- Les lots 1 à 5 ne disposent pas d'un modèle source finement documenté dans le dépôt; le MLD conserve les éléments validés et les structures existantes, sans inventer les fragments manquants.
- Le lot 6 reste provisoire et n'est pas complété en table par hypothèse.
- Les points de conception non documentés sont marqués `À CONFIRMER`.

---

## 2. Conventions de modélisation

### 2.1. Identités et nommage

- Les relations logiques portent des noms en `MAJUSCULE_SNAKE_CASE`.
- Chaque table logique a une clé primaire logique `UUID`, sauf cas explicitement identifiés de clé composée.
- Les UUID sont conservés comme clés techniques. Ils ne remplacent pas les codes métier utiles.
- Les identifiants métier (matricule, code de frais, etc.) sont maintenus au niveau de la table concernée lorsque le référentiel le permet.
- Les champs/relations non documentés sont déclarés `À CONFIRMER` au lieu d'être inventés.

### 2.2. Types logiques

Types abstraits retenus :

- `UUID`, `TEXTE`, `ENTIER`, `DECIMAL_EXACT`, `BOOLEEN`, `DATE`, `HORODATAGE_TZ`, `CODE`, `CONTENU_IMMUABLE`, `REFERENCE_DOCUMENT`.
- Les montants financiers sont stockés en entiers FCFA.
- Les notes, coefficients et pondérations utilisent une représentation exacte et non implicite.

### 2.3. Nullabilité et contraintes d'intégrité

- `NOT NULL` est imposé pour les identifiants et les champs déclarés obligatoires par les références validées.
- Les attributs conditionnels restent `NULL` sauf si les sources valident un opérateur de blocage.
- Les `UNIQUE` sont conservés quand la source les impose explicitement.
- Les `CHECK` de cardinalité, d'exclusivité ou de borne sont retenus lorsque la logique est explicitement documentée.
- Les relations historiques et les chaînes d'HISTORIQUE restent append-only : pas d'écrasement silencieux ni d'effacement de faits métier.

### 2.4. Règles de transformation MCD → MLD appliquées

- Association 1,N → clé étrangère du côté N.
- Association N,N → table associative avec clé primaire propre ou composée.
- Association porteuse d'attributs → table associative avec identifiant propre.
- Association 1,1 → contraintes de unicité sur les clés concernées.
- Relations historisées → conservation de l'historique, pas de réécriture du fait source.
- Contrôle temporel → respect des validations de validité déjà approuvées.
- Lot 7, 8 et pédagogie → respect strict des invariants des références gelées.

---

## 3. MLD détaillé par bloc

### Bloc 1 — Organisation de l'établissement

Les tables suivantes forment le socle de l'établissement et de l'organisation scolaire.

| Table                          | PK                                   | FK / contraintes clés                                               | Observations                                                              |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ETABLISSEMENT`                | `id_etablissement UUID`              | Aucune FK; `NOT NULL` sur l'identifiant                             | Périmètre institutionnel; détails de références et libellés `À CONFIRMER` |
| `ANNEE_SCOLAIRE`               | `id_annee_scolaire UUID`             | `id_etablissement UUID` vers `ETABLISSEMENT`                        | Une année est rattachée à un établissement                                |
| `PERIODE_PEDAGOGIQUE`          | `id_periode UUID`                    | `id_annee_scolaire UUID`                                            | Dates et ordre de période `À CONFIRMER`                                   |
| `CYCLE_ENSEIGNEMENT`           | `id_cycle UUID`                      | Aucune FK obligatoire                                               | Référentiel du cycle                                                      |
| `NIVEAU_ENSEIGNEMENT`          | `id_niveau UUID`                     | Aucune FK                                                           | Référentiel du niveau                                                     |
| `MODELE_CLASSE`                | `id_modele_classe UUID`              | Aucune FK                                                           | Référentiel de configuration de classe                                    |
| `CLASSE_ANNUELLE`              | `id_classe_annuelle UUID`            | `id_annee_scolaire UUID`, `id_niveau UUID`, `id_modele_classe UUID` | Coherent avec le périmètre annuel                                         |
| `ELEVE`                        | `id_eleve UUID`                      | `id_etablissement UUID`                                             | Matricule et identité élève                                               |
| `RESPONSABLE`                  | `id_responsable UUID`                | Aucune FK                                                           | Entité indépendante                                                       |
| `RELATION_ELEVE_RESPONSABLE`   | `id_relation_eleve_responsable UUID` | `id_eleve UUID`, `id_responsable UUID`                              | Table associative de relation historique                                  |
| `CANDIDATURE`                  | `id_candidature UUID`                | Optional FK vers élève ou dossier selon source                      | Contexte candidat                                                         |
| `PREINSCRIPTION`               | `id_preinscription UUID`             | `id_candidature UUID` nullable, `id_eleve UUID` nullable            | XOR conditionnel                                                          |
| `INSCRIPTION`                  | `id_inscription UUID`                | `id_eleve UUID`, `id_annee_scolaire UUID`                           | Unicité conditionnelle par élève/année `À CONFIRMER`                      |
| `AFFECTATION_CLASSE`           | `id_affectation_classe UUID`         | `id_inscription UUID`, `id_classe_annuelle UUID`                    | Historisation à conserver                                                 |
| `HISTORIQUE_CHANGEMENT_CLASSE` | `id_changement_classe UUID`          | `id_affectation_classe UUID`                                        | Traçabilité de changement de classe                                       |

Contraintes d'intégrité principales :

- Les affectations de classe restent historiques, sans écrasement.
- Les liaisons entre élève, inscription, classe et établissement doivent être cohérentes.
- La relation élève/responsable est N:N avec historique de responsabilité.

### Bloc 2 — Frais, tarification et facturation (lots 1 à 3)

#### 2.1. Lot 1 — spécification tarifaire

| Table                | PK                           | FK / contraintes                                                      | Notes                                                     |
| -------------------- | ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| `TYPE_FRAIS`         | `id_type_frais UUID`         | code unique                                                           | Règles de désactivation et de non-suppression             |
| `PERIODICITE`        | `id_periodicite UUID`        | code unique                                                           | Référentiel de périodicité                                |
| `TARIF`              | `id_tarif UUID`              | `id_type_frais UUID`, `id_periodicite UUID`, `id_annee_scolaire UUID` | Portée de tarification et non-chevauchement `À CONFIRMER` |
| `POLITIQUE_REMISE`   | `id_politique_remise UUID`   | `id_type_frais UUID` nullable                                         | Nature/forme de remise                                    |
| `ATTRIBUTION_REMISE` | `id_attribution_remise UUID` | `id_politique_remise UUID`, `id_eleve UUID`, `id_annee_scolaire UUID` | Historisation d'attribution                               |

#### 2.2. Lot 2 — facturation et créances

| Table                            | PK                             | FK / contraintes                                                              | Notes                                                    |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| `PERIODE_FACTURATION`            | `id_periode_facturation UUID`  | `id_annee_scolaire UUID`                                                      | Distincte des périodes pédagogiques                      |
| `CAMPAGNE_FACTURATION`           | `id_campagne_facturation UUID` | `id_annee_scolaire UUID`, `id_type_frais UUID`, `id_periode_facturation UUID` | Opération de génération                                  |
| `EXECUTION_CAMPAGNE_FACTURATION` | `id_execution_campagne UUID`   | `id_campagne_facturation UUID`                                                | Traçabilité des reprises et exécutions                   |
| `CREANCE`                        | `id_creance UUID`              | `id_eleve UUID`, `id_annee_scolaire UUID`, `id_type_frais UUID`               | Obligation unitaire ; historique et annulation conservés |

#### 2.3. Lot 3 — échéancier et plans de règlement

| Table                       | PK                                  | FK / contraintes                                                | Notes                         |
| --------------------------- | ----------------------------------- | --------------------------------------------------------------- | ----------------------------- |
| `MODELE_ECHEANCIER`         | `id_modele_echeancier UUID`         | Aucune FK                                                       | Modèle de planification       |
| `VERSION_MODELE_ECHEANCIER` | `id_version_modele_echeancier UUID` | `id_modele_echeancier UUID`                                     | Version valide et historique  |
| `LIGNE_MODELE_ECHEANCIER`   | `id_ligne_modele_echeancier UUID`   | `id_version_modele_echeancier UUID`                             | Répartition de plan           |
| `PLAN_REGLEMENT_CREANCE`    | `id_plan_reglement_creance UUID`    | `id_creance UUID`, `id_version_modele_echeancier UUID` nullable | Plan associé à une créance    |
| `ECHEANCE_CREANCE`          | `id_echeance_creance UUID`          | `id_creance UUID`, `id_plan_reglement_creance UUID`             | Date d'exigibilité et montant |
| `REAMENAGEMENT_ECHEANCIER`  | `id_reamenagement_echeancier UUID`  | `id_plan_reglement_creance UUID` nullable                       | Historique de réaménagement   |
| `EVENEMENT_ECHEANCE`        | `id_evenement_echeance UUID`        | `id_echeance_creance UUID`                                      | Journal append-only           |

### Bloc 3 — Encaissements, caisse, crédits et remboursements (lots 4 à 6)

#### 3.1. Lot 4 — encaissements et crédits

| Table                      | PK                                 | FK / contraintes                                                                   | Notes                                 |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------- |
| `ENCAISSEMENT`             | `id_encaissement UUID`             | `id_eleve UUID` / `id_creance UUID` selon affectation                              | Distinct du règlement affecté         |
| `AFFECTATION_REGLEMENT`    | `id_affectation_reglement UUID`    | `id_encaissement UUID`, `id_creance UUID` / `id_echeance_creance UUID` selon cible | Cible exacte `À CONFIRMER`            |
| `MOUVEMENT_CREDIT`         | `id_mouvement_credit UUID`         | `id_mouvement_credit_source UUID`                                                  | Source de crédit conservée            |
| `TRANSACTION_MOBILE_MONEY` | `id_transaction_mobile_money UUID` | Générale, sans FK locale définie                                                   | État technique et financier distincts |

#### 3.2. Lot 5 — caisse et sessions

| Table                        | PK                                   | FK / contraintes                           | Notes                                 |
| ---------------------------- | ------------------------------------ | ------------------------------------------ | ------------------------------------- |
| `POSTE_CAISSE`               | `id_poste_caisse UUID`               | Aucune FK locale documentée                | Poste physique distinct de l'appareil |
| `APPAREIL`                   | `id_appareil UUID`                   | Aucune FK locale documentée                | Appareil de caisse                    |
| `SESSION_CAISSE`             | `id_session_caisse UUID`             | `id_poste_caisse UUID`, `id_appareil UUID` | Période d'activité de caisse          |
| `MOUVEMENT_CAISSE`           | `id_mouvement_caisse UUID`           | `id_session_caisse UUID`                   | Mouvement physique de caisse          |
| `CLOTURE_CAISSE`             | `id_cloture_caisse UUID`             | `id_session_caisse UUID`                   | Clôture distincte du comptage         |
| `DETAIL_COMPTAGE_CAISSE`     | `id_detail_comptage_caisse UUID`     | `id_cloture_caisse UUID`                   | Journal de comptage                   |
| `TRANSMISSION_FONDS`         | `id_transmission_fonds UUID`         | `id_session_caisse UUID`                   | Montant envoyé/reçu séparés           |
| `RAPPROCHEMENT_CAISSE`       | `id_rapprochement_caisse UUID`       | `id_session_caisse UUID`                   | Distinct de la clôture                |
| `JUSTIFICATION_ECART_CAISSE` | `id_justification_ecart_caisse UUID` | `id_rapprochement_caisse UUID`             | Justification d'écart                 |

#### 3.3. Lot 6 — éléments provisoires

- `RESERVATION_CREDIT` et éléments du lot 6 restent provisoires et non stabilisés.
- Aucun modèle de table n'est inventé au-delà des éléments déjà documentés.
- Les quatre points ouverts restent `À CONFIRMER` : cascade, réservations concurrentes, provenance des remboursements, crédits/avoirs sur échéances déjà réglées.

### Bloc 4 — Relances et balance âgée (lot 7)

| Table                             | PK                             | FK / contraintes                                                                   | Notes                      |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------- | -------------------------- |
| `RELANCE_FINANCIERE`              | `id_relance UUID`              | `id_eleve UUID`                                                                    | Un élève par relance       |
| `LIGNE_RELANCE_FINANCIERE`        | `id_ligne_relance UUID`        | `id_relance UUID`, `id_creance UUID` nullable, `id_echeance_creance UUID` nullable | XOR sur la cible           |
| `DESTINATAIRE_RELANCE_FINANCIERE` | `id_destinataire_relance UUID` | `id_relance UUID`                                                                  | Destinataire de relance    |
| `TENTATIVE_TRANSMISSION_RELANCE`  | `id_tentative UUID`            | `id_relance UUID`, `id_destinataire_relance UUID`                                  | Append-only                |
| `PARAMETRAGE_BALANCE_AGEE`        | `id_parametrage UUID`          | Aucune FK                                                                          | Paramétrage versionné      |
| `TRANCHE_BALANCE_AGEE`            | `id_tranche UUID`              | `id_parametrage UUID`                                                              | Tranches non chevauchantes |

### Bloc 5 — Synchronisation Offline-First (lot 8)

| Table                                    | PK                                      | FK / contraintes                                                                                                     | Notes                                   |
| ---------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `APPAREIL_SYNCHRONISATION`               | `id_appareil UUID`                      | `id_etablissement UUID`                                                                                              | Appareil autorisé dans un établissement |
| `INSTALLATION_LOCALE`                    | `id_installation UUID`                  | `id_appareil UUID`                                                                                                   | Installation locale                     |
| `FLUX_SYNCHRONISATION`                   | `id_flux UUID`                          | `id_installation_emettrice UUID` nullable, `id_etablissement_contexte UUID` nullable                                 | XOR sur origine                         |
| `OPERATION_SYNCHRONISATION`              | `id_operation UUID`                     | `id_installation_origine UUID` nullable, `id_etablissement_contexte UUID` nullable                                   | Contrôle d'attributs de transport       |
| `ENVELOPPE_EVENEMENT_SYNCHRONISATION`    | `id_evenement UUID`                     | `id_operation UUID`, `id_flux_origine UUID`                                                                          | Événement métier source transporté      |
| `DEPENDANCE_EVENEMENT_SYNCHRONISATION`   | `id_dependance UUID`                    | `id_evenement_dependant UUID`, `id_evenement_prerequis UUID`                                                         | Graphe acyclique                        |
| `CURSEUR_SYNCHRONISATION`                | `id_curseur UUID`                       | `id_flux UUID`                                                                                                       | Suivi de réception/traitement           |
| `CONFLIT_SYNCHRONISATION`                | `id_conflit UUID`                       | Aucune FK locale obligatoire                                                                                         | Conflit de synchronisation              |
| `ASSOCIATION_CONFLIT_EVENEMENT`          | `id_conflit UUID` + `id_evenement UUID` | `id_conflit UUID`, `id_evenement UUID`                                                                               | PK composite                            |
| `ASSOCIATION_CONFLIT_OPERATION`          | `id_association_conflit_operation UUID` | `id_conflit UUID`, `id_operation UUID`                                                                               | Association de résolution               |
| `DECISION_ARBITRAGE_SYNCHRONISATION`     | `id_decision UUID`                      | `id_conflit UUID`, `id_utilisateur_arbitre UUID`                                                                     | Décision de résolution                  |
| `TRANSITION_APPLICABILITE_DECISION`      | `id_transition UUID`                    | `id_decision UUID`, `id_decision_remplacante UUID` nullable                                                          | Historique de remplacement              |
| `APPLICATION_DECISION_ARBITRAGE`         | `id_application UUID`                   | `id_decision UUID`                                                                                                   | Application effective                   |
| `SAUVEGARDE_LOCALE`                      | `id_sauvegarde UUID`                    | `id_appareil_origine UUID`, `id_installation_origine UUID`                                                           | Sauvegarde locale                       |
| `OPERATION_RESTAURATION`                 | `id_restauration UUID`                  | `id_sauvegarde UUID`, `id_appareil_cible UUID`, `id_installation_cible UUID`                                         | Restauration                            |
| `ASSOCIATION_RECUPERATION_EVENEMENT`     | `id_association_recuperation UUID`      | `id_restauration UUID`, `id_evenement_origine UUID`                                                                  | Récupération autorisée                  |
| `TENTATIVE_TRANSMISSION_SYNCHRONISATION` | `id_tentative UUID`                     | `id_evenement UUID`, `id_installation_emettrice_actuelle UUID` nullable, `id_association_recuperation UUID` nullable | Retry de synchronisation                |

### Bloc 6 — Pédagogie, évaluations et résultats (VAL-015)

| Table                            | PK                                            | FK / contraintes                                                             | Notes                                           |
| -------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| `PROGRAMME_SCOLAIRE`             | `id_programme UUID`                           | Aucune FK                                                                    | Programme de référence                          |
| `VERSION_PROGRAMME`              | `id_version_programme UUID`                   | `id_programme UUID`                                                          | Version du programme                            |
| `VERSION_CYCLE`                  | `id_version_cycle UUID`                       | `id_version_programme UUID`, `id_cycle UUID`                                 | Version par cycle                               |
| `VERSION_NIVEAU`                 | `id_version_niveau UUID`                      | `id_version_programme UUID`, `id_niveau UUID`                                | Version par niveau                              |
| `VERSION_SPECIALITE`             | `id_version_specialite UUID`                  | `id_version_programme UUID`                                                  | Version par spécialité; référentiel à confirmer |
| `MATIERE`                        | `id_matiere UUID`                             | Aucune FK locale                                                             | Référentiel matière                             |
| `PROGRAMME_MATIERE`              | `id_programme_matiere UUID`                   | `id_version_programme UUID`, `id_matiere UUID`                               | Coefficient éventuel                            |
| `ENSEIGNEMENT`                   | `id_enseignement UUID`                        | `id_matiere UUID`, `id_classe_annuelle UUID`                                 | Contexte pédagogique                            |
| `AFFECTATION_ENSEIGNANT`         | `id_affectation_enseignant UUID`              | `id_enseignement UUID`                                                       | Validité et ancienneté                          |
| `EVALUATION`                     | `id_evaluation UUID`                          | `id_enseignement UUID`                                                       | Évaluation de classe                            |
| `BAREME`                         | `id_bareme UUID`                              | Aucune FK locale                                                             | Version d'échelle                               |
| `NOTE`                           | `id_note UUID`                                | `id_inscription UUID`, `id_evaluation UUID`                                  | Unicité par inscription/évaluation              |
| `REVISION_NOTE`                  | `id_revision_note UUID`                       | `id_note UUID`, `id_revision_precedente UUID` nullable                       | Historique des révisions                        |
| `METHODE_CALCUL_RESULTAT`        | `id_methode_calcul UUID`                      | Aucune FK locale                                                             | Précision, arrondis, formule                    |
| `RESULTAT_SCOLAIRE`              | `id_resultat UUID`                            | `id_inscription UUID`, `id_version_programme UUID`, `id_methode_calcul UUID` | Type abstrait, sous-type exclusif               |
| `RESULTAT_MATIERE`               | `id_resultat UUID`                            | `id_resultat UUID` PK/FK, `id_matiere UUID`                                  | Sous-type matière                               |
| `RESULTAT_PERIODE`               | `id_resultat UUID`                            | `id_resultat UUID` PK/FK, `id_periode UUID`                                  | Sous-type période                               |
| `RESULTAT_ANNUEL`                | `id_resultat UUID`                            | `id_resultat UUID` PK/FK, `id_annee_scolaire UUID`                           | Sous-type annuel                                |
| `CONTRIBUTION_RESULTAT_NOTE`     | `id_contribution_note UUID`                   | `id_resultat UUID`, `id_note UUID`, `id_revision_note UUID`                  | Contribution de note accrue                     |
| `CONTRIBUTION_RESULTAT_SCOLAIRE` | `id_contribution_resultat UUID`               | `id_resultat_cible UUID`, `id_resultat_source UUID`                          | Contribution entre résultats                    |
| `BULLETIN_SCOLAIRE`              | `id_bulletin UUID`                            | `id_inscription UUID`, `id_periode UUID`                                     | Bulletin publié                                 |
| `LIGNE_BULLETIN`                 | `id_ligne_bulletin UUID`                      | `id_bulletin UUID`                                                           | Ligne de bulletin                               |
| `LIGNE_BULLETIN_RESULTAT`        | `id_ligne_bulletin UUID` + `id_resultat UUID` | `id_ligne_bulletin UUID`, `id_resultat UUID`                                 | PK composite                                    |
| `CONSEIL_CLASSE`                 | `id_conseil UUID`                             | `id_periode UUID`                                                            | Séance de conseil                               |
| `AVIS_CONSEIL_PROGRESSION`       | `id_avis UUID`                                | `id_conseil UUID`, `id_eleve UUID`                                           | Avis distinct de décision                       |
| `DECISION_PROGRESSION`           | `id_decision UUID`                            | `id_eleve UUID`, `id_decision_precedente UUID` nullable                      | Historique de progression                       |
| `TRACE_SUIVI_PEDAGOGIQUE`        | `id_trace UUID`                               | `id_eleve UUID`                                                              | Traçabilité du suivi                            |

Contraintes pédagogiques essentielles :

- `RESULTAT_SCOLAIRE` abstrait ; ses sous-types exclusifs : `RESULTAT_MATIERE`, `RESULTAT_PERIODE`, `RESULTAT_ANNUEL`.
- Une note a au plus une révision initiale et une chaîne linéaire de révisions.
- Les résultats calculés sont immuables après publication, sauf rectification explicitement historique.
- Les bulletins publiés restés immuables ; le rectificatif crée un nouveau bulletin.

---

## 4. Liste complète des tables du MLD global consolidé

Le MLD global conservé contient 94 tables logiques relationnelles, hors lot 6 provisoire qui n'est pas stabilisé en tables structurelles.

1. `ETABLISSEMENT`
2. `ANNEE_SCOLAIRE`
3. `PERIODE_PEDAGOGIQUE`
4. `CYCLE_ENSEIGNEMENT`
5. `NIVEAU_ENSEIGNEMENT`
6. `MODELE_CLASSE`
7. `CLASSE_ANNUELLE`
8. `ELEVE`
9. `RESPONSABLE`
10. `RELATION_ELEVE_RESPONSABLE`
11. `CANDIDATURE`
12. `PREINSCRIPTION`
13. `INSCRIPTION`
14. `AFFECTATION_CLASSE`
15. `HISTORIQUE_CHANGEMENT_CLASSE`
16. `TYPE_FRAIS`
17. `PERIODICITE`
18. `TARIF`
19. `POLITIQUE_REMISE`
20. `ATTRIBUTION_REMISE`
21. `PERIODE_FACTURATION`
22. `CAMPAGNE_FACTURATION`
23. `EXECUTION_CAMPAGNE_FACTURATION`
24. `CREANCE`
25. `MODELE_ECHEANCIER`
26. `VERSION_MODELE_ECHEANCIER`
27. `LIGNE_MODELE_ECHEANCIER`
28. `PLAN_REGLEMENT_CREANCE`
29. `ECHEANCE_CREANCE`
30. `REAMENAGEMENT_ECHEANCIER`
31. `EVENEMENT_ECHEANCE`
32. `ENCAISSEMENT`
33. `AFFECTATION_REGLEMENT`
34. `MOUVEMENT_CREDIT`
35. `TRANSACTION_MOBILE_MONEY`
36. `POSTE_CAISSE`
37. `APPAREIL`
38. `SESSION_CAISSE`
39. `MOUVEMENT_CAISSE`
40. `CLOTURE_CAISSE`
41. `DETAIL_COMPTAGE_CAISSE`
42. `TRANSMISSION_FONDS`
43. `RAPPROCHEMENT_CAISSE`
44. `JUSTIFICATION_ECART_CAISSE`
45. `RELANCE_FINANCIERE`
46. `LIGNE_RELANCE_FINANCIERE`
47. `DESTINATAIRE_RELANCE_FINANCIERE`
48. `TENTATIVE_TRANSMISSION_RELANCE`
49. `PARAMETRAGE_BALANCE_AGEE`
50. `TRANCHE_BALANCE_AGEE`
51. `APPAREIL_SYNCHRONISATION`
52. `INSTALLATION_LOCALE`
53. `FLUX_SYNCHRONISATION`
54. `OPERATION_SYNCHRONISATION`
55. `ENVELOPPE_EVENEMENT_SYNCHRONISATION`
56. `DEPENDANCE_EVENEMENT_SYNCHRONISATION`
57. `CURSEUR_SYNCHRONISATION`
58. `CONFLIT_SYNCHRONISATION`
59. `ASSOCIATION_CONFLIT_EVENEMENT`
60. `ASSOCIATION_CONFLIT_OPERATION`
61. `DECISION_ARBITRAGE_SYNCHRONISATION`
62. `TRANSITION_APPLICABILITE_DECISION`
63. `APPLICATION_DECISION_ARBITRAGE`
64. `SAUVEGARDE_LOCALE`
65. `OPERATION_RESTAURATION`
66. `ASSOCIATION_RECUPERATION_EVENEMENT`
67. `TENTATIVE_TRANSMISSION_SYNCHRONISATION`
68. `PROGRAMME_SCOLAIRE`
69. `VERSION_PROGRAMME`
70. `VERSION_CYCLE`
71. `VERSION_NIVEAU`
72. `VERSION_SPECIALITE`
73. `MATIERE`
74. `PROGRAMME_MATIERE`
75. `ENSEIGNEMENT`
76. `AFFECTATION_ENSEIGNANT`
77. `EVALUATION`
78. `BAREME`
79. `NOTE`
80. `REVISION_NOTE`
81. `METHODE_CALCUL_RESULTAT`
82. `RESULTAT_SCOLAIRE`
83. `RESULTAT_MATIERE`
84. `RESULTAT_PERIODE`
85. `RESULTAT_ANNUEL`
86. `CONTRIBUTION_RESULTAT_NOTE`
87. `CONTRIBUTION_RESULTAT_SCOLAIRE`
88. `BULLETIN_SCOLAIRE`
89. `LIGNE_BULLETIN`
90. `LIGNE_BULLETIN_RESULTAT`
91. `CONSEIL_CLASSE`
92. `AVIS_CONSEIL_PROGRESSION`
93. `DECISION_PROGRESSION`
94. `TRACE_SUIVI_PEDAGOGIQUE`

> Note : le lot 6 n'apparaît pas dans cette liste car les structures sont encore provisoires et n'ont pas été gelées. Aucune table n'est inventée pour le remplacer.

---

## 5. Attributs, PK et FK

Les tables ci-dessus sont les tables de référence logiques. Chaque table porte une clé primaire logique UUID et les clés étrangères suivantes sont conservées lorsque la source les valide :

- `id_etablissement` pour la propriété de l'établissement.
- `id_annee_scolaire`, `id_periode`, `id_cycle`, `id_niveau`, `id_classe_annuelle` pour le domaine académique.
- `id_eleve`, `id_responsable`, `id_inscription` pour les relations élève / inscription.
- `id_creance`, `id_echeance_creance`, `id_plan_reglement_creance` pour les finances.
- `id_session_caisse`, `id_cloture_caisse`, `id_rapprochement_caisse` pour la caisse.
- `id_relance`, `id_destinataire_relance`, `id_parametrage`, `id_tranche` pour les relances.
- `id_evenement`, `id_flux`, `id_operation`, `id_conflit`, `id_decision` pour le lot 8.
- `id_resultat`, `id_note`, `id_evaluation`, `id_bulletin`, `id_decision` pour la pédagogie.

Les attributs métier notés dans les documents de référence sont conservés dans leurs tables respectives, sans extension arbitraire. Les champs non documentés restent `À CONFIRMER`.

---

## 6. Contraintes d'intégrité

### 6.1. Contraintes de base

- `PK` sur identifiant unique logique.
- `FK` vers la table source quand la relation est documentée.
- `NOT NULL` sur toutes les FK et colonnes identifiantes obligatoires.
- `UNIQUE` sur les éléments de référence unitaire ou de clée métier lorsque le MCD les impose.
- `CHECK` sur les bornes de montants, périodes, exclusions, XOR et plannings.

### 6.2. Contraintes transverses

- Aucune donnée historique n'est supprimée ni écrasée.
- Les relations historiques et les chaînes de révision restent append-only.
- Les associations de synchronisation sont conservées séparément des états métier.
- Les synchronisations ne créent pas d'effet métier sans décision de domaine.
- Les résultats publiés restent immuables, sauf rectification explicite.
- Les montants sont des entiers FCFA.
- Les dates de début/fin sont différenciées des horodatages de création.

### 6.3. Contraintes spécifiques à chaque domaine

- Domaine 1-3 : cohérence établissement/année/inscription/classe.
- Finances : créance, échéance et affectation restent séparées; l'annulation ou le remboursement n'efface pas l'historique.
- Caisse : le mouvement de caisse, la clôture, le comptage, le rapprochement et la justification sont distincts.
- Relances : une ligne relance cible exactement une créance ou une échéance, jamais les deux.
- Synchronisation : flux, événements, dépendances, curseurs et conflits sont conservés séparément des faits métier.
- Pédagogie : resultats mères, sous-types, notes et décisions restent linéaires et non ambiguës.

---

## 7. Relations inter-domaines

Les liens de cohérence globale entre blocs sont les suivants :

1. `ETABLISSEMENT` → `ANNEE_SCOLAIRE` → `INSCRIPTION` → `AFFECTATION_CLASSE` → `RESULTAT_SCOLAIRE`.
2. `ELEVE` → `RELATION_ELEVE_RESPONSABLE` → `RESPONSABLE`.
3. `CANDIDATURE` / `PREINSCRIPTION` → `INSCRIPTION` → `AFFECTATION_CLASSE`.
4. `ELEVE` + `ANNEE_SCOLAIRE` + `TYPE_FRAIS` → `CREANCE` → `ECHEANCE_CREANCE` → `ENCAISSEMENT` / `AFFECTATION_REGLEMENT`.
5. `CREANCE` / `ECHEANCE_CREANCE` → `LIGNE_RELANCE_FINANCIERE` dans le lot 7.
6. `SESSION_CAISSE` → `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE`, `RAPPROCHEMENT_CAISSE`.
7. `ENCAISSEMENT` et les mouvements lots 4/5 sont transportés par le lot 8 via événements de synchronisation.
8. `INSCRIPTION` → `NOTE` → `REVISION_NOTE` → `RESULTAT_SCOLAIRE` → `CONTRIBUTION_RESULTAT_NOTE` et `CONTRIBUTION_RESULTAT_SCOLAIRE`.
9. `DECISION_PROGRESSION` reste distincte de l'application administrative du domaine organisation.
10. `CONFLIT_SYNCHRONISATION` n'est pas un conflit métier de caisse ou de pédagogie : il porte uniquement la synchronisation, conformément à VAL-014.

---

## 8. Points restant à confirmer

Les éléments suivants demeurent `À CONFIRMER` sans ouverture de la structure de référence :

- Détail complet des modèles financiers 1 à 5 hors éléments déjà validés et disponibles.
- Les cardinalités exactes de certaines relations lot 4/5 et de la caisse locale.
- Les identifiants externes de référentiels transversaux (utilisateurs, enseignant, destinataire D2, moyens de paiement, dispositifs mobiles, etc.).
- Les clés de jointure exactes pour les relations polymorphes du lot 8.
- Les règles de non-chevauchement et d'unicité de tarification/échéancier dans les cas non explicitement documentés.
- Les valeurs de codes et états détaillés non fournis dans les références.
- Le lot 6, pour lequel quatre points ouverts restent à trancher sans réouverture de la décision globale.

Les points ci-dessus ne bloquent pas la construction du MLD dans les blocs documentés ; ils sont précisément identifiés et ne donnent pas lieu à des hypothèses non justifiées.

---

## 9. Vue consolidée du MLD global

La vue consolidée du MLD global peut être résumée ainsi :

- Bloc établissement et scolarité : `ETABLISSEMENT`, `ANNEE_SCOLAIRE`, `INSCRIPTION`, `AFFECTATION_CLASSE`, `ELEVE`, `RESPONSABLE`.
- Bloc financier : `CREANCE`, `ECHEANCE_CREANCE`, `ENCAISSEMENT`, `AFFECTATION_REGLEMENT`, `MOUVEMENT_CREDIT`.
- Bloc caisse : `SESSION_CAISSE`, `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE`, `RAPPROCHEMENT_CAISSE`.
- Bloc relances : `RELANCE_FINANCIERE`, `LIGNE_RELANCE_FINANCIERE`, `DESTINATAIRE_RELANCE_FINANCIERE`, `TENTATIVE_TRANSMISSION_RELANCE`.
- Bloc synchronisation : `FLUX_SYNCHRONISATION`, `ENVELOPPE_EVENEMENT_SYNCHRONISATION`, `CONFLIT_SYNCHRONISATION`, `DECISION_ARBITRAGE_SYNCHRONISATION`.
- Bloc pédagogique : `NOTE`, `REVISION_NOTE`, `RESULTAT_SCOLAIRE`, `CONTRIBUTION_RESULTAT_NOTE`, `BULLETIN_SCOLAIRE`, `DECISION_PROGRESSION`.

Cette vue respecte le noyau de validité des documents sources, sans confronter des structures non documentées.

---

## 10. Historique des décisions et validations de référence

### 10.1. Décisions gelées

- `VAL-013` : gel du MCD du lot 7.
- `VAL-014` : gel du MCD du lot 8, synchronisation Offline-First.
- `VAL-015` : gel du MCD du domaine pédagogique.
- `VAL-016` : validation du MCD global V1.0 avec réserve documentaire sur les lots financiers 1 à 5.

### 10.2. Règles fixées et non réouvertes

- Les changements dans les invariants du lot 7 et du lot 8 ne sont pas ouverts sans traçabilité explicite.
- Le lot 6 ne devient pas une source de nouvelles tables sans appui documentaire et décision formelle.
- Les règles métier de lot 8 restent séparées du contenu métier des lots 1 à 7.
- Les sous-types de `RESULTAT_SCOLAIRE` restent exclusifs et immuables.
- Les décisions de progression restent propriété pédagogique, tandis que l'application administrative reste propriété du domaine organisation.

### 10.3. État de référence pour le MLD global

Le MLD global proposé ici est une modélisation logique cohérente à partir des modèles et décisions validées. Il est fait pour préparer la conception physique, mais il ne remplace pas les validations et les arbitrages de domaine existants. Il doit être révisé uniquement à l'occasion d'une nouvelle décision propriétaire ou d'un modèle source ajouté de manière vérifiable.

---

## Conclusion

Le MLD global V1.0 construit ici respecte le principe de prudence requis par la réserve documentaire de VAL-016. Il consolide les modèles validés dans les domaines et lots déjà gelés, sans supposer de structure non documentée, et il conserve les points de vigilance sous la mention `À CONFIRMER` lorsqu'il manque une source directe.

Le résultat est un MLD global cohérent, traçable et suffisamment structuré pour être utilisé comme base de travail pour la conception du MPD, des bases PostgreSQL et de la base locale Offline-First.
