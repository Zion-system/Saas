# 07 — Historique des validations

**Projet :** ERP scolaire  
**Version documentaire :** V1.0

Ce document conserve les décisions et validations de conception. Une consolidation ou une proposition de travail n'est pas une validation métier.

## 1. Historique des validations existantes

| Référence | Élément                                       | Statut                                               |
| --------- | --------------------------------------------- | ---------------------------------------------------- |
| VAL-001   | Périmètre général de la V1                    | Validé                                               |
| VAL-002   | Niveaux scolaires pris en charge              | Validé                                               |
| VAL-003   | Architecture Offline-First                    | Validé                                               |
| VAL-004   | Base locale SQLite WASM + OPFS                | Validé en principe, intégration vérifiée             |
| VAL-005   | Stratégie générale de résolution des conflits | Validée                                              |
| VAL-006   | Gestion permanente du dossier élève           | Validée conceptuellement                             |
| VAL-007   | Règles générales des inscriptions             | Validées conceptuellement                            |
| VAL-008   | Principes de gestion financière               | Validés conceptuellement                             |
| VAL-009   | Organisation documentaire du MCD global       | En cours                                             |
| VAL-010   | Cardinalités globales                         | À consolider                                         |
| VAL-011   | MLD global                                    | Proposition V1.0 produite dans `11-mld-global.md`, en attente de validation formelle; ancien statut « non réalisé » conservé comme état historique |
| VAL-012   | Schéma SQL métier                             | Non réalisé                                          |
| VAL-013   | Gel du MCD V1.0 — Domaine 4, Lot 7            | Gelé explicitement par le propriétaire le 2026-11-04 |
| VAL-014   | Gel du MCD V1.0 — Domaine 4, Lot 8            | Validé et gelé explicitement par le propriétaire le 2026-11-04 |
| VAL-015   | Gel du MCD V1.0 — Domaine 5, Pédagogie         | Référence normative de validation et gel communiquée par le propriétaire; date non précisée dans la source de consolidation |
| VAL-016   | Validation du MCD global V1.0 avec réserve documentaire sur les lots financiers 1 à 5 | Validé explicitement par le propriétaire le 2026-11-04 |
| VAL-017   | Validation du MLD financier reconstitué — Lots 1 à 5 (avec réserves) | Prononcée par le propriétaire le 2026-11-07 |
| GEL-DOC19 | Gel du MPD financier SQLite V1.0 — Lots 1 à 5 (30 tables) | Gelé explicitement le 07/11/2026 suite aux verdicts D-0 à D-11 |

Les références VAL existantes et leurs statuts sont conservés.

### Validation du MCD global V1.0 — VAL-016

Le propriétaire a validé le MCD global V1.0 le **2026-11-04**, avec réserve documentaire explicite concernant l'absence des modèles sources détaillés des lots financiers 1 à 5. La validation autorise de poursuivre la conception logique à partir des modèles effectivement disponibles; elle n'autorise pas à déduire les structures financières manquantes. Les lots 1 à 5 restent validés et gelés, sans changement de leur contenu propriétaire.

VAL-016 ne modifie ni VAL-013, ni VAL-014, ni VAL-015, ni les invariants `FIN-LOT7-001` à `FIN-LOT7-028` ou `SYNC-001` à `SYNC-083`. Les quatre points du lot 6 restent provisoires et ouverts. La validation du MCD global ne vaut pas validation du MLD.

### État de référence après VAL-016

Le MCD global V1.0 est validé sous VAL-016 avec la réserve documentaire ci-dessus. Le MLD global V1.0 est proposé dans `11-mld-global.md` et reste en attente de validation formelle. Les relations détaillées financières des lots 1 à 5 restent impossibles à transformer fidèlement tant que les modèles sources ou une décision propriétaire sur leurs interfaces ne sont pas disponibles. Les domaines 1 à 3, lots 1 à 5, lot 7, lot 8 et domaine pédagogique conservent leurs décisions gelées; le lot 6 reste provisoire avec quatre points ouverts.

## 2. État de conception communiqué après VAL-015 — photographie historique

À cette étape, après VAL-015 et avant VAL-016, les domaines 1 à 3 et lots financiers 1 à 5 étaient déclarés validés et gelés; le lot 6 était provisoire avec quatre points ouverts; le lot 7 était gelé sous VAL-013; le lot 8 était gelé sous VAL-014; et le domaine pédagogique était gelé sous VAL-015. Le MCD global n'était pas encore validé à cette date.

## 3. Événement documentaire V0.9.1

| Élément                                                      | Statut                                                          | Portée                                                                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consolidation du MCD global V0.9.1 et audit transversal      | Brouillon consolidé, non gelé, non validé comme MCD global V1.0 | Rassemble les concepts documentés, rend visibles les liens connus et consigne les incohérences et points bloquants. N'ajoute pas de décision métier. |
| Orientations du lot financier 6 intégrées à la consolidation | Provisoirement acceptées en V0.9.1, non gelées                  | Annulations/corrections, crédits, réservations, avoirs et restitutions; les quatre points ouverts restent non résolus.                               |
| Domaine 4 — Lot 7 : soldes, impayés et relevés               | MCD V1.0 gelé le 2026-11-04                                     | Ses décisions et invariants FIN-LOT7-001 à FIN-LOT7-028 ne sont pas modifiables sans demande explicite; ce gel ne valide pas le MCD global.          |
| Domaine 4 — Lot 8 : cohérence Offline-First                  | MCD V1.0 validé et gelé sous VAL-014 le 2026-11-04              | 17 concepts, relations, cardinalités, RM-SYNC-01 à RM-SYNC-38 et SYNC-001 à SYNC-083 acceptés; voir `08-mcd-consolide-lot8.md`. Les choix techniques et opérationnels ouverts restent à traiter. |

Les orientations du lot 6 sont consignées comme provisoires, pas comme règles définitivement validées. Ses quatre sujets restant ouverts sont conservés dans `06-decisions-et-points-ouverts.md`. Le lot 7 reste gelé sous VAL-013. Le MCD du lot 8 est validé et gelé sous VAL-014; ses 17 concepts, relations, cardinalités, règles métier RM-SYNC-01 à RM-SYNC-38 et invariants SYNC-001 à SYNC-083 sont acceptés. Les points techniques et opérationnels ouverts ne remettent pas en cause ce gel conceptuel. À la date de cette entrée, le MCD global V1.0 restait à valider séparément; il a depuis été validé sous VAL-016.

## 4. Règles de validation

- Une décision validée est conservée; toute modification doit être justifiée et documentée.
- Une décision proposée ou provisoire n'est pas présentée comme validée.
- Toute modification d'une décision gelée du lot 7 requiert une demande explicite et une nouvelle entrée d'historique.
- Toute modification ultérieure du MCD gelé du lot 8 requiert une décision explicite du propriétaire et une traçabilité dans une nouvelle entrée d'historique.
- La validation d'un domaine ne vaut pas validation du MCD global.
- Le MCD global V1.0 a été déclaré validé sous VAL-016 après validation explicite; toute modification ultérieure doit être justifiée et tracée.

## 5. Étapes restant à réaliser — état antérieur à VAL-016

1. Traiter les choix techniques et opérationnels ouverts du lot 8 lors de la conception technique; ils ne sont pas un préalable à la validation du MCD global et ne permettent pas de modifier VAL-014 sans décision explicite.
2. Retrouver les sources détaillées financières 1 à 5 et vérifier les rattachements/cardinalités historiques avant le MLD, sans modifier les modèles gelés.
3. Vérifier au MLD les relations inter-domaines dont le détail source n'est pas reproduit, en respectant les frontières propriétaires.
4. Obtenir la validation formelle du MCD global V1.0.
5. Construire le MLD après cette validation et l'accès aux références spécialisées nécessaires.
6. Préparer les migrations SQLite après validation du MLD correspondant.

Aucune migration métier ne doit être créée avant la validation du MLD correspondant.

Ces étapes sont une photographie de plan antérieure à VAL-016. Depuis, le MCD global est validé avec réserve documentaire et une proposition de MLD figure dans `11-mld-global.md`. La validation formelle du MLD et la conception physique ultérieure restent à réaliser.

## 6. Acceptation des arbitrages pédagogiques — 2026-11-04

Le propriétaire a officiellement accepté les arbitrages PED-A01 à PED-A09 le **2026-11-04**. Ils sont intégrés au dossier `09-dossier-pedagogique-preliminaire.md` avec PED-A10 et les précisions PED-I01 à PED-I03. Cette acceptation a ensuite été suivie de la validation et du gel normatifs enregistrés sous VAL-015.

À la date de cette entrée, le dossier était **DOMAINE PÉDAGOGIQUE V1.0 — MCD CONSOLIDÉ, ARBITRAGES ACCEPTÉS, EN ATTENTE DE VALIDATION FORMELLE DU PROPRIÉTAIRE**. Cet état historique a été supersédé par VAL-015; le document spécialisé 09 n'est pas modifié dans la présente consolidation. À cette date également, le MCD global V1.0 restait non validé; il a depuis été validé sous VAL-016. VAL-013, VAL-014, FIN-LOT7-001 à FIN-LOT7-028, SYNC-001 à SYNC-083 et le contenu pédagogique gelé restent inchangés.

## 7. Validation et gel du MCD pédagogique — VAL-015

La mission de consolidation fournit VAL-015 comme référence officielle et normative du MCD pédagogique V1.0 gelé. Elle confirme que les concepts, relations, cardinalités, arbitrages PED-A01 à PED-A10, précisions PED-I01 à PED-I03, règles et invariants pédagogiques sont gelés. La date de cette validation n'est pas fournie dans la source consultée; elle n'est pas déduite de la date des arbitrages PED-A01 à PED-A09. Le document 09 reste inchangé selon son instruction de gel, et son ancienne mention de statut antérieure à VAL-015 est signalée comme historique.

VAL-015 ne valide pas le MCD global V1.0 et ne modifie pas VAL-013, VAL-014, les invariants FIN-LOT7-001 à FIN-LOT7-028 ni SYNC-001 à SYNC-083.

## 8. Consolidation du MCD global V1.0 — état antérieur à VAL-016

À la date de cette entrée, le MCD global V1.0 était consolidé et audité mais en attente de validation formelle. Cet état a été remplacé le 2026-11-04 par la validation VAL-016 avec réserve documentaire. Les relations financières détaillées des lots 1 à 5 ne sont pas reconstituées; les limites sont consignées dans `06-decisions-et-points-ouverts.md` et `10-verification-sources-financieres-lots-1-a-5.md`.

## 9. Décisions propriétaires et arbitrages financiers des 04/11 et 06/11/2026 (préparatoires à VAL-017)

Cette section consigne les arbitrages et décisions intervenus postérieurement à VAL-016, fixant la cible métier du MLD financier des Lots 1 à 5 en vue de la validation formelle VAL-017. L'inscription historique initialement incomplète dans ce registre ne remet pas en cause la validité de ces décisions, directement confirmées par le propriétaire.

### 9.1 Confirmations directes du 04/11/2026
- **Lot 5 (Caisse) :** Invariants et arbitrages `ARB-05`, `ARB-06` et `FIN-LOT5-026` à `FIN-LOT5-035` validés par confirmation directe du propriétaire. (Pour `ARB-01` à `ARB-04` et `FIN-LOT5-019` à `FIN-LOT5-025`, le statut demeure rapporté dans les documents 15 à 17 avec réserve, la validation directe n'ayant pas été établie dans les éléments disponibles).
- **Lot 6 (Extensions financières) :** Trois orientations clés acceptées par le propriétaire : consommation de crédit en cascade traçable par crédit source, réservations provisoires hors ligne arbitrées par le serveur central sans fusion silencieuse (LWW), et distinction demandeur / payeur initial / bénéficiaire effectif avec mandat valide (`FIN-LOT6-015`). Le traitement des crédits/avoirs sur échéances déjà réglées demeure le seul point ouvert du Lot 6 (dans son domaine propre, hors périmètre des Lots 1 à 5).

### 9.2 Arbitrages et clôtures du 06/11/2026
- **Chaîne des règlements (Lots 4/6) :** Les cinq arbitrages fondamentaux sont définitivement validés :
  1. Cible unique créance ou échéance (XOR strict, selon présence d'un plan actif).
  2. Origine unique encaissement ou crédit (XOR strict à la frontière Lot 4).
  3. Affectations strictement positives (`montant > 0`), respect des plafonds de source et de dette, paiements partiels autorisés.
  4. Ventilation N:N (un encaissement peut financer plusieurs affectations, une dette peut recevoir plusieurs affectations, une affectation ne vise qu'une seule dette).
  5. Affectation validée jamais supprimée physiquement; annulation par contre-écriture traçable (append-only); remboursement distinct représentant une sortie effective de fonds.
- **Plans et échéances (Lot 3) :** Les neuf règles métier de cycle de vie et l'arbitrage de continuité du RAP sont définitivement validés :
  - Une créance peut ne posséder aucun plan; possède au maximum un plan initial.
  - Un plan comporte plusieurs échéances.
  - Un réaménagement concerne exactement un plan précédent actif et produit exactement un nouveau plan après validation.
  - Successions de réaménagements autorisées depuis le plan actif; un plan historique ne redevient jamais actif; un seul plan actif par créance; l'ancien plan reste actif tant que le nouveau n'est pas validé; conservation intégrale des anciens plans et de leurs échéances.
  - Continuité du RAP : le montant du nouveau plan réaménagé correspond au solde restant dû de la créance après déduction unique de toutes les affectations nettes actives (y compris celles ciblant d'anciennes échéances historiques). Les affectations restent rattachées à leurs cibles d'origine, les anciennes échéances sont exclues du RAP courant, et aucun paiement ni crédit n'est déplacé ou compensé automatiquement.
- **Clôture intégrale du registre des questions ouvertes Q-01 à Q-09 :** Clôture formelle au 06/11/2026 fixant la cible métier sous le régime « Décision propriétaire — préparatoire à VAL-017, VAL-016 intacte » :
  - Q-01 : Mapping normatif de reconstitution ratifié (Option A) : `creance.id_eleve` obligatoire (FK canonique `ELEVE`), `id_inscription` et `id_affectation_classe` conditionnels/nullables.
  - Q-02 : Interdiction du chevauchement d'attributions actives pour un même élève, une même politique et une même année (Option A).
  - Q-03 : Rangs uniques et strictement positifs, échéances strictement positives et somme égale au plan (Option A), sous réserve explicite du lien non tranché entre plan initial et montant net de créance et de la clarification de la notion de « plusieurs échéances » (Correction 2).
  - Q-04 : La clé d'unicité externe est strictement `(fournisseur, compte_marchand, reference_externe)` ; une transaction confirmée correspond à 0..1 encaissement ; invariant atomique : état CONFIRME si et seulement si un encaissement est associé ; une déclaration non vérifiée reste conservée sans encaissement (Option A).
  - Q-05 : La clé d'exclusivité est le poste de caisse seul (un poste de caisse n'a qu'une session opérationnelle active via index unique partiel sur l'état actif) ; deux postes différents peuvent porter des sessions simultanées ; le caissier et l'appareil ne sont pas des clés d'exclusivité ; un caissier peut utiliser un autre poste ; les ouvertures concurrentes hors ligne sur un même poste sont arbitrées au serveur sans fusion ni règle de dernière écriture gagnante (VAL-014).
  - Q-06 : Incidence physique rattachée à la session et à son opération source. `id_session_destination` est facultatif : une incidence d'entrée est créée uniquement lorsque les fonds sont effectivement reçus dans une session de caisse de destination ; pour une remise à un responsable extérieur au périmètre des sessions, seule l'incidence de sortie de la session source est enregistrée et la réception effective est tracée sur la transmission (FIN-LOT5-007) ; une seule incidence par couple (source, session) ; source canonique exclusive par incidence ; aucune double comptabilisation ; aucun MOUVEMENT_CAISSE doublon du remboursement Lot 6.
  - Q-07 : Clôture définitive unique (0..1) et rapprochements historiques multiples (0..N) conservés sans réécriture (Option A). Pour `rapprochement_caisse` comme pour `justification_ecart_caisse` (initialement établie sur la base de l'extraction DDL transmise §2.5) : absence de triggers UPDATE/DELETE vérifiée contre le DDL réel de la migration 007 le 07/11/2026.
  - Q-08 : Unicité d'une dénomination par tour de comptage `(id_cloture_caisse, numero_comptage, valeur_unitaire_fcfa)` et recomptages append-only (Option A).
  - Q-09 : Frontière nette au Lot 4 pour l'origine crédit (`mouvement_credit` d'utilisation). Les mécanismes propres au Lot 6 relèvent de son domaine propriétaire ; le point sur les crédits/avoirs sur échéances déjà réglées reste ouvert dans le Lot 6 (Option A).

Cette cible métier ratifiée prépare la validation formelle VAL-017 du MLD financier reconstitué. VAL-016 reste intacte avec sa réserve documentaire historique sur les modèles sources originaux non retrouvés.

VAL-017 prononcée le 07/11/2026 — voir section VAL-017.

## 10. VAL-017 — Prononcé du 07/11/2026

Issue formelle : VALIDATION DU MLD FINANCIER DES LOTS 1 À 5, AVEC RÉSERVES.  
Verdict du propriétaire rendu le 07/11/2026 à l'issue de l'examen du dossier de préparation à la validation formelle VAL-017 (synthèse du MLD financier, lecture seule).

Périmètre validé :

- Cible logique et relationnelle du MLD financier reconstitué : 29 tables des migrations de référence 003 à 007, leurs clés primaires et étrangères, leurs cardinalités et contraintes d'intégrité, conformément à `docs/18` ;
- Décisions ratifiées Q-01 à Q-09 (closes le 06/11/2026), sans réouverture ;
- Frontières : Lot 4 / Lot 6 arrêtée au mouvement d'utilisation du crédit (Q-09) ; Lot 7 sous VAL-013 ; Lot 8 sous VAL-014 ; domaine pédagogique sous VAL-015 ; migrations administratives 010 à 013 hors périmètre financier ;
- Interfaces frontière validées avec le MLD : `annee_scolaire`, `ELEVE` et cibles ratifiées Q-01 (`inscription`, `affectation_classe`).

Réserves (annexes normatives de la validation) :

- Réserve héritée de VAL-016 : absence des modèles sources originaux des lots 1 à 5.
- Permissivité du DDL réel 003 à 007 face à la cible ratifiée, notamment : FKs non matérialisées (`creance.id_eleve` — Q-01 ; cibles dettes d'`affectation_reglement` ; `transaction_mobile_money.id_encaissement` — Q-04 ; `transmission_fonds.id_session_destination` — Q-06 ; `tarif.id_filiere`) ; colonne `etat` et index partiel d'exclusivité Q-05 non matérialisés ; absence de `UNIQUE(id_session_caisse)` sur `cloture_caisse` ; triggers append-only partiels sur `mouvement_caisse` (GAP-14 : trigger DELETE manquant, UPDATE hors clôture non couvert) et triggers UPDATE/DELETE absents sur `rapprochement_caisse` et `justification_ecart_caisse` (GAP-15/GAP-16), à matérialiser en phase corrective selon Q-07/Q-08.
- Onze résidus de conception (`docs/18 §9`) et dix résidus techniques B.1 à B.10 issus des arbitrages du 06/11/2026 — non bloquants, à traiter en phase corrective et d'implémentation.
- Réserves Q-03 maintenues : lien entre montant net initial et plan ; notion de « plusieurs échéances ».

Lecture de traçabilité : les décisions ratifiées valent faits établis ; leurs formulations DDL dérivées valent déductions motivées ; toute donnée non recontrôlée vaut réserve documentaire.

Effets : ouverture de la phase corrective d'implémentation DDL et poursuite de la conception, dans les périmètres respectifs fixés par les mandats du propriétaire. VAL-013, VAL-014, VAL-015 et VAL-016 demeurent intactes.


## 11. Gel du Modèle Physique de Données (MPD) financier SQLite V1.0 — Décisions D-0 à D-11 (07/11/2026)

**Date :** 07/11/2026  
**Événement :** Application des verdicts souverains du propriétaire D-0 à D-11 et gel normatif de `docs/19` en version 1.0.  
**Portée :** Spécification physique SQLite pour les Lots 1 à 5 (30 tables physiques, 17 triggers, 14 index explicites).

### 11.1 Régularisation de gouvernance D-0 (07/11/2026)
Par décision explicite actuelle et non rétroactive du 07/11/2026, le propriétaire régularise l'opération d'amendement du commit local `31011c4` en `ac0bc61` intervenue lors des travaux préparatoires de vérification documentaire, en pleine connaissance du diff contrôlé (limité strictement aux sections §5 et §9 de `docs/19`, sans aucune altération des sections §1 à §4, §6 à §8 et §10).

### 11.2 Registre des verdicts ratifiés D-1 à D-11
Le propriétaire a formellement prononcé les verdicts suivants :
- **D-1 (B.4) :** Ratification de la formulation M-1 régissant les ouvertures concurrentes Offline-First de sessions de caisse (Q-05 / VAL-014).
- **D-2 (B.5) :** Ratification de la formulation M-2 avec la règle d'or R-1 : « une seule incidence par couple (source canonique, session de caisse) » pour les remboursements d'espèces.
- **D-3 (Renforcement B.5) :** Adoption de la contrainte physique `CHECK (type_mouvement <> 'REMBOURSEMENT' OR id_operation_source IS NOT NULL)` et de l'index partiel unique `idx_mouvement_remboursement_unique` sur `mouvement_caisse`.
- **D-4 (B.7) :** Ratification de la formulation M-3 : rapprochement définitif distinct de la clôture, irrévocabilité garantie par le doublet index partiel unique `idx_rapprochement_definitif` (`WHERE est_definitif = 1`) et triggers append-only GAP-15.
- **D-5 (B.8) :** Adoption de l'Option C pour l'architecture de scellement de caisse (séquence clôture → dénombrement → scellement par transition explicite `session_caisse.etat = 'CLOTUREE'`), armement du contrôle de concordance arithmétique (16ᵉ trigger), verrou d'insertion post-clôture (17ᵉ trigger `trg_detail_comptage_no_insert_closed`), et réserve R-6 (`trg_session_caisse_cloturee_immutable` avec clause `WHEN OLD.etat = 'CLOTUREE'` interdisant toute réouverture d'une session fermée). Règle R-3 respectée (aucun mouvement de caisse dans la fenêtre).
- **D-6a (B.9 Mécanisme) :** Adoption de l'Option 1 : création de la table de nomenclature `ref_coupure_xaf` (30ᵉ table) avec clé étrangère depuis `detail_comptage_caisse(valeur_unitaire_fcfa)`. Règle R-4 : table administrative mutable hors append-only.
- **D-6b (B.9 Contenu) :** Adoption du sous-ensemble opérationnel actif initial ≥ 25 FCFA (10 formes physiques, 9 valeurs distinctes : billets 10 000, 5 000, 2 000, 1 000, 500 ; pièces 500, 200 Type 2024, 100, 50, 25 FCFA ; 500 FCFA avec `type_coupure = 'BILLET ET PIECE'`). Démonétisation UMAC des pièces antérieures à 2006 effective au 01/11/2026.
- **D-7 (B.1) :** Ratification des énumérations via contraintes natives `TEXT CHECK (colonne IN (...))`.
- **D-8 (B.2) :** Ratification de la validation atomique des plans de règlement avec archivage de l'ancien plan.
- **D-9 (B.3) :** Ratification du séquencement transactionnel strict sous `BEGIN IMMEDIATE` (sous réserve Q-03).
- **D-10 (B.6) :** Ratification de la destination facultative sur `transmission_fonds` avec traçabilité obligatoire du destinataire physique si NULL (`FIN-LOT5-007`).
- **D-11 (B.10) :** Ratification du cycle de figeage asynchrone à deux étapes sur `transmission_fonds`.

### 11.3 Effets et gel normatif
- `docs/19-mpd-financier-sqlite.md` est définitivement gelé en version 1.0.
- Périmètre arrêté : 30 tables physiques, 17 triggers, 14 index explicites documentés.
- Contrôles R-1 à R-6 intégralement satisfaits.
- Ce gel constitue le préalable obligatoire et le socle technique intangible pour l'ouverture du mandat d'élaboration du plan correctif des migrations 003 à 007.
- Les décisions Q-01 à Q-09, VAL-013, VAL-014, VAL-015, VAL-016 et VAL-017 demeurent intactes et intangibles.
