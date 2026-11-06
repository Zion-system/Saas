# 16 — Matrice de traçabilité du Lot 5

**Projet :** ERP scolaire SaaS Offline-First  
**Version :** V1.0 — matrice documentaire  
**Date :** 2026-11-04  
**Statut :** traçabilité des sources documentaires et des validations utilisateur communiquées le 2026-11-04; ce document ne déclare pas le Lot 5 gelé

## 1. Règle de lecture

La matrice distingue (a) une décision propriétaire établie dans sa source, (b) une proposition fonctionnelle Lot 5, (c) un arbitrage validé mais dont des détails restent à spécifier, et (d) une information absente. Une règle cohérente avec un lot gelé n’est pas pour autant validée comme nouvelle règle du Lot 5.

Les documents 12–14 précèdent les décisions utilisateur du 2026-11-04 sur ARB-01 à ARB-06 et FIN-LOT5-019 à 035. Les décisions ultérieures priment pour leur statut courant; le document 14 reste une photographie historique antérieure. La différence de portée entre les mentions globales « lots 1–5 validés et gelés » et le statut de cette consolidation détaillée demeure une divergence documentaire à clarifier. Le Lot 5 n’est pas déclaré gelé ici.

## 2. Décisions et contraintes inter-lots

| Élément traçable | Source | Statut dans la source | Effet pour le Lot 5 | Limite / action documentaire |
|---|---|---|---|---|
| Lot 4 propriétaire des encaissements, affectations, mouvements de crédit, Mobile Money et vérification financière | 12 §2.1; 14 §3 et ARB-04; 04, 11 | Frontière propriétaire rapportée; modèles détaillés absents | Référencer les faits sources et ne pas les recréer; espèces seulement pour incidence physique | Cardinalités et événement éligible à confirmer à partir de la source Lot 4. |
| Affectation ou utilisation de crédit n’est pas entrée physique | 12 §§2.1, 5.5; 11 §§4.5–4.6 | Principe documenté; règle Lot 5 reste proposition | Exclure du comptage cash | Pas de nouvelle règle de crédit à ajouter au Lot 4. |
| Déclaration Mobile Money n’est pas confirmation financière ni espèces | 12 §§2.1, 5.4; 04, 05, 11 | Distinction documentée dans sources disponibles | Ne pas inclure comme espèces; garder états financiers et de sync distincts | Les attributs et transitions propriétaires restent à leurs lots. |
| FIN-LOT6-015 : remboursement physique espèces exclusivement via `REMBOURSEMENT_FONDS`, sans doublon `MOUVEMENT_CAISSE` | 12 §2.2; 13 A-03; 14 §§2–3, ARB-04; décision propriétaire rapportée | Décision Lot 6 établie telle que communiquée dans 13–14; MCD Lot 6 rapporté gelé V1.0 | Référencer l’opération propriétaire, ne pas créer de sortie doublon | Rattachement et incidence de caisse à documenter; certaines sources locales disent encore Lot 6 provisoire. |
| Résultats, soldes et RAP propriété du Lot 7 | 12 §2.3; 14 §3; VAL-013 | Décision gelée | Le rapprochement de caisse ne recalcule pas les projections Lot 7 | Préserver FIN-LOT7-001 à 028. |
| Identité stable, idempotence, conservation des conflits, séparation réception/traitement/acquittement et arbitrage par domaine | 12 §2.4; 13 §2; 14 §§3, 5; `08-mcd-consolide-lot8.md`, VAL-014 | Décision Lot 8 validée et gelée | Séparer sync et état métier de caisse; aucune fusion silencieuse | Aucun concept ou cycle gelé du Lot 8 n’est modifié. |
| Permissions et identités transversales réutilisées | 12 §2.4; 14 ARB-03/06; validations utilisateur 2026-11-04 | Principe transversal; ARB-03/06 validés | Ne pas créer de compte caissier ou permission parallèle | Matrice détaillée des rôles et permissions à documenter. |
| MCD global validé avec réserve documentaire; MLD non validé | VAL-016 dans 06–07 et 14 §3 | Décision officielle | Ne pas déduire les structures financières manquantes | Aucune modification du MCD/MLD dans cette mission. |
| Arbitrages Lot 5 ARB-01 à ARB-06 | Décisions utilisateur du 2026-11-04 postérieures au document 14 | Six arbitrages validés | Appliquer les statuts validés; conserver 14 comme historique antérieur | Les décisions valident les arbitrages, sans fixer toutes les cardinalités et détails techniques. |
| Lot 5 historiquement indiqué « validé et gelé » dans les documents globaux | 04 §1; 06 tableau de statuts et §3; 07 §§1–2; 10 §2 | Statut global déclaré | Intégrer les validations utilisateur postérieures; conserver 12–14 comme état historique antérieur | Clarifier la portée du gel global par rapport à la conception détaillée actuelle; les ARB validés ne sont pas rouverts et le Lot 5 n’est pas déclaré gelé ici. |

## 3. Traçabilité des six arbitrages ARB

Les descriptions et questions ci-dessous suivent le document 14, qui est antérieur aux validations. Les six arbitrages ont été explicitement validés par l’utilisateur le 2026-11-04 : ARB-01/02/03 (« valider »), ARB-04 (« oui »), ARB-05/06 (« oui » groupé). Le statut courant est VALIDÉ; les questions de détail de la source 14 restent des réserves de spécification, et ne rouvrent pas les arbitrages.

| Référence | Sujet | Concepts affectés | Décisions validées et précisions de conception restantes | Sources | Statut constaté |
|---|---|---|---|---|---|
| ARB-01 | Exclusivité des sessions et concurrence Offline-First | `SESSION_CAISSE`, `POSTE_CAISSE`, `APPAREIL` | Principe d’exclusivité/concurrence validé; ressources détaillées, exceptions, règles d’unicité et portée complète de FIN-LOT5-001 à spécifier | 12 §§4.3–4.6, 9; 13 A-09/A-10; 14 ARB-01; décision utilisateur 2026-11-04 | **VALIDÉ**; FIN-LOT5-001 reste partiellement couvert. |
| ARB-02 | Fonds initiaux, garde et transmission physique | `SESSION_CAISSE`, `TRANSMISSION_FONDS`, `MOUVEMENT_CAISSE` | Arbitrage fonds/garde/transmission validé; relations, cardinalités et traitement détaillé des remises à spécifier | 12 §§4.3–4.4, 10; 13 A-05; 14 ARB-02; décision utilisateur 2026-11-04 | **VALIDÉ**; modalités de modélisation restent à documenter. |
| ARB-03 | Identité des acteurs, poste et appareils | `SESSION_CAISSE`, `POSTE_CAISSE`, `APPAREIL` | Distinction acteur/poste/appareil validée; mapping technique, changements d’appareil/poste et correspondance Lot 8 à spécifier | 12 §§4.1–4.2; 13 A-11; 14 ARB-03; décision utilisateur 2026-11-04 | **VALIDÉ**; précisions d’intégration à documenter. |
| ARB-04 | Encaissements, mouvements physiques et solde théorique | `SESSION_CAISSE`, `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE` | Principes de source physique canonique et invariants 019–025 validés; liens session, cardinalités et borne temporelle d’application à spécifier | 12 §§5.2–5.6, 6.3; 13 A-03/A-04; 14 ARB-04; décision utilisateur 2026-11-04 | **VALIDÉ**; interface relationnelle à documenter; FIN-LOT6-015 préservé. |
| ARB-05 | Clôture, comptage, rapprochement et opérations tardives | `CLOTURE_CAISSE`, `DETAIL_COMPTAGE_CAISSE`, `RAPPROCHEMENT_CAISSE`, `JUSTIFICATION_ECART_CAISSE` | Principes des invariants 026–032 validés; structure des comptages, borne, relations, cardinalités et transitions détaillées à spécifier | 12 §§6–8; 13 A-06–A-09; 14 ARB-05; décision utilisateur 2026-11-04 | **VALIDÉ**; détails de modélisation non fixés. |
| ARB-06 | Autorisations, écarts et corrections | `RAPPROCHEMENT_CAISSE`, `JUSTIFICATION_ECART_CAISSE` | Principes des invariants 026–035 validés; matrice des rôles, transitions, liens aux corrections propriétaires et cardinalités à spécifier | 12 §§8.3–8.5; 13 §4; 14 ARB-06; décision utilisateur 2026-11-04 | **VALIDÉ**; détails des permissions et liens à documenter. |

Le suivi documentaire du statut du Lot 6 mentionné dans 14 §4 est séparé des six arbitrages métier : le gel officiel rapporté est préservé; l’harmonisation de mentions locales n’est pas réalisée ici.

## 4. Matrice des concepts et des règles

| Concept | Responsabilité / lien fonctionnel candidat | Sources primaires de conception | Statut et questions ouvertes |
|---|---|---|---|
| `POSTE_CAISSE` | Lieu physique de l’activité | 12 §§3, 4.2; 13 §5; 14 ARB-01/03 | Candidat; cycles, disponibilité et relations non définis. |
| `APPAREIL` | Terminal métier d’une session | 12 §§3, 4.2, 9; 13 A-11; 14 ARB-03 | Candidat; équivalence/lien Lot 8 inconnu. |
| `SESSION_CAISSE` | Contexte opérationnel d’un caissier | 12 §§3–4, 9; 13 §§5–6; 14 ARB-01/03/05 | Concept central cité historiquement; ARB-01/03/05 validés; cardinalités à documenter. |
| `MOUVEMENT_CAISSE` | Fait de mouvement physique | 12 §§3, 5; 13 A-04/A-05; 14 ARB-02/04 | ARB-02/04 validés; périmètre détaillé, session et rapport aux faits sources à documenter. |
| `CLOTURE_CAISSE` | Fait de fin et montants de clôture candidats | 12 §§3, 6; 13 A-06/A-09; 14 ARB-05 | Snapshot historique validé par FIN-026; cardinalité et instant de coupure détaillé à documenter. |
| `DETAIL_COMPTAGE_CAISSE` | Lignes de montant physique | 12 §6.4; 13 A-07; 14 ARB-05 | Détail/résultat et recomptages préservés par FIN-028/029; parent, coupures et cardinalités à documenter. |
| `TRANSMISSION_FONDS` | Remise physique candidate | 12 §10; 13 A-05; 14 ARB-02; FIN-LOT5-023 | Transmission unique et incidences distinctes validées; structure/cardinalités à documenter. |
| `RAPPROCHEMENT_CAISSE` | Contrôle distinct d’une clôture | 12 §8; 13 A-06/A-12; 14 ARB-05/06 | Indépendance de la clôture validée par FIN-030; cycle et cardinalités détaillés à documenter. |
| `JUSTIFICATION_ECART_CAISSE` | Explication d’écart | 12 §8.3; 13 A-12; 14 ARB-06; FIN-LOT5-031/033 | Justification sans changement du théorique et permissions différenciées validées; cibles et cardinalités à documenter. |

### Références FIN-LOT5

| Référence | Définition | Source | Arbitrage validé couvrant | Statut |
|---|---|---|---|---|
| FIN-LOT5-001 | Continuité opérationnelle après clôture locale hors ligne | 12 §4.6; décision utilisateur 2026-11-04 | ARB-01 | PARTIELLEMENT COUVERT |
| FIN-LOT5-002 | Distinguer caissier, poste et appareil | 12 §§3, 4.2 | ARB-03 | VALIDÉ |
| FIN-LOT5-003 | Pas de mouvement ordinaire après clôture locale | 12 §§6.6, 9.2; FIN-LOT5-027 | ARB-01/05 | VALIDÉ |
| FIN-LOT5-004 | Identité indépendante pour chaque nouvelle session | 12 §§4.2, 9.4 | ARB-01 | PARTIELLEMENT COUVERT |
| FIN-LOT5-005 | Fonds initial égal au montant réellement confié | 12 §4.3 | ARB-02 | VALIDÉ |
| FIN-LOT5-006 | Pas de reprise automatique du solde final précédent | 12 §4.3 | ARB-02 | PARTIELLEMENT COUVERT |
| FIN-LOT5-007 | Origine et réception effective d’une transmission conservées | 12 §10; FIN-LOT5-023 | ARB-02/04 | VALIDÉ |
| FIN-LOT5-008 | Théorique calculé depuis les opérations physiques valides | 12 §6.3; FIN-LOT5-024 | ARB-04 | VALIDÉ |
| FIN-LOT5-009 | Mobile Money exclu des entrées physiques espèces | 12 §5.4; FIN-LOT5-020 | ARB-04 | VALIDÉ |
| FIN-LOT5-010 | Crédit exclu des entrées de trésorerie | 12 §5.5; FIN-LOT5-021 | ARB-04 | VALIDÉ |
| FIN-LOT5-011 | Remboursement espèces via mécanisme Lot 6 exclusif | 12 §5.6; FIN-LOT6-015; FIN-LOT5-022 | ARB-04 | VALIDÉ |
| FIN-LOT5-012 | Clôture distincte du rapprochement | 12 §§6.7, 8; FIN-LOT5-030 | ARB-05 | VALIDÉ |
| FIN-LOT5-013 | Détail de comptage égal au montant déclaré si utilisé | 12 §6.4; FIN-LOT5-028/029 | ARB-05 | PARTIELLEMENT COUVERT |
| FIN-LOT5-014 | Écart conservé avec son signe réel | 12 §6.5 | ARB-05 | PARTIELLEMENT COUVERT |
| FIN-LOT5-015 | Justification ne modifie pas le théorique | 12 §8.3; FIN-LOT5-031 | ARB-06 | VALIDÉ |
| FIN-LOT5-016 | Sessions concurrentes conservées et arbitrées | 12 §§4.5, 9.5 | ARB-01 | VALIDÉ |
| FIN-LOT5-017 | Pas de suppression silencieuse d’une opération validée | 12 §§5.7, 7.3; FIN-LOT5-035 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-018 | Sync ne rouvre pas automatiquement une session clôturée | 12 §9.4; VAL-014 | ARB-01/05 | PARTIELLEMENT COUVERT |
| FIN-LOT5-019 | Absence de double comptabilisation d’un encaissement | Décision utilisateur 2026-11-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-020 | Mobile Money exclu du solde physique | Décision utilisateur 2026-11-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-021 | Crédits exclus du solde physique | Décision utilisateur 2026-11-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-022 | Remboursement physique selon le mécanisme exclusif du Lot 6 | Décision utilisateur 2026-11-04; FIN-LOT6-015 | ARB-04 | VALIDÉ |
| FIN-LOT5-023 | Transmission unique avec incidences distinctes | Décision utilisateur 2026-11-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-024 | Solde calculé depuis les événements physiques valides | Décision utilisateur 2026-11-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-025 | Annulations/contrepassations conservées sans double comptage | Décision utilisateur 2026-11-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-026 | Clôture comme instantané historique conservé | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-027 | Aucune opération ordinaire après clôture locale | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-028 | Détail et résultat des comptages conservés | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-029 | Recomptages conservés sans remplacement silencieux | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-030 | Rapprochement indépendant de la clôture | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-031 | Justification sans modification du théorique | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-032 | Opérations tardives incompatibles arbitrées | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-033 | Permissions différenciées | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-034 | Toute correction référence l’opération d’origine | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |
| FIN-LOT5-035 | Historique conservé sans suppression/réécriture silencieuse | Décision utilisateur 2026-11-04 | ARB-05/06 | VALIDÉ |

## 5. Traçabilité des cycles, règles et scénarios

| Domaine | Source | Éléments repris | État de validation |
|---|---|---|---|
| Ouverture | 12 §§4.1–4.6; 13 §§3–4; 14 ARB-01/02/03; validations utilisateur 2026-11-04 | Acteur, poste, appareil, fonds, transmission, concurrence | ARB-01/02/03 validés; FIN-001 et certains détails restent partiels. |
| Activité | 12 §5; 13 A-03–A-05; ARB-04 et FIN-LOT5-019–025 | Mouvements, encaissement espèces, exclusions Mobile Money/crédit, remboursement et immutabilité | ARB-04 validé; relation/session et cardinalités à documenter. |
| Clôture/comptage | 12 §6; 13 A-06–A-09; ARB-05/06 et FIN-LOT5-026–032 | Solde, montant physique, écart, comptage, snapshot, clôture locale | ARB-05/06 validés; structure/cardinalités et FIN-013/014 partiels. |
| Journal | 12 §7; 13 A-12 et §5 | Historique consultable, événements et références | Besoin de journal séparé non démontré. |
| Rapprochement | 12 §8; 13 A-06/A-12; 14 ARB-05/06; FIN-026–035 | Justification distincte de correction, contrôle hiérarchique, conservation des faits | ARB-05/06 validés; cycle détaillé, rôles et cardinalités restent à documenter. |
| Offline-First | 12 §9; 13 A-08–A-11; 14 §§3–5; décisions ARB-01/05 et FIN-026/027/032 | Identité, clôture locale, événements tardifs, conflits, reprise | ARB-01/05 validés; application exacte de FIN-001/018 et détails d’intégration restent partiels. |
| Cas limites | 12 §13 | 12 cas, dont clôture hors ligne, concurrence, transfert, écart, MM/crédit, annulation/remboursement, répétition, tardif, restauration | Scénarios attendus de conception, pas preuves d’acceptation formelle. |

## 6. Lacunes de traçabilité et suites documentaires

- Clarifier la portée entre le gel historique Lot 5 signalé dans les documents globaux et la conception détaillée, en tenant compte des validations utilisateur postérieures aux documents 12–14.
- Les décisions ARB-01 à ARB-06 sont validées le 2026-11-04; documenter uniquement les précisions de conception qui ne sont pas fixées par les arbitrages (relations, cardinalités, mapping technique, etc.).
- FIN-LOT5-019 à 035 sont définis et validés par les décisions utilisateur du 2026-11-04; les FIN-LOT5-001 à 018 ont les statuts individuels ci-dessus.
- Retrouver les sources normatives détaillées des Lots 4 et 5 et documenter les interfaces de caisse sans reconstruire leurs cardinalités par analogie.
- Reporter les décisions du 2026-11-04 dans l’historique officiel si le processus de gouvernance du projet l’exige; ce document n’altère pas le registre historique.

## 7. Sources consultées

Documents du projet consultés : `04-regles-metier.md`, `05-cycles-de-vie-et-statuts.md`, `06-decisions-et-points-ouverts.md`, `07-historique-des-validations.md`, `08-mcd-consolide-lot8.md`, `10-verification-sources-financieres-lots-1-a-5.md`, `11-mld-global.md`, `12-conception-fonctionnelle-lot5-v0.1.md`, `13-audit-conception-lot5-v0.1.md`, `14-synthese-arbitrages-lot5-v0.2.md`. Le corpus ne fournit pas les modèles sources détaillés des Lots 1 à 5, selon 10 et la réserve VAL-016.
