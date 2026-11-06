# 15 — Consolidation fonctionnelle du Lot 5

**Projet :** ERP scolaire SaaS Offline-First  
**Version :** V0.3 — consolidation documentaire  
**Date :** 2026-11-04  
**Sources principales :** documents 04–08, 10–14  
**Statut :** consolidation documentaire intégrant les arbitrages validés; elle ne vaut pas validation complète ni gel du Lot 5

## 1. Objet, portée et statut

Ce document rassemble les éléments fonctionnels déjà présents dans `12-conception-fonctionnelle-lot5-v0.1.md`, les constats de `13-audit-conception-lot5-v0.1.md`, les frontières de `14-synthese-arbitrages-lot5-v0.2.md` et les décisions utilisateur communiquées le 2026-11-04 après le document 14. Les arbitrages ARB-01 à ARB-06 sont validés; les propositions non couvertes restent des propositions. Les décisions propriétaires des autres lots restent inchangées.

Le document 12 fournit six sous-blocs, neuf concepts candidats, dix-huit références FIN-LOT5 et douze scénarios limites. Les statuts initiaux de FIN-LOT5-001 et FIN-LOT5-002 à 018 y sont historiques; ils sont réévalués ci-dessous au regard des validations utilisateur ultérieures. Les cardinalités, le dictionnaire définitif et le MCD restent à établir.

**Réserve de statut à résoudre :** des documents globaux (notamment 04, 06, 07 et 10) indiquent que les lots financiers 1 à 5 sont validés et gelés, tandis que les documents 12 à 14, antérieurs aux validations utilisateur du 2026-11-04, présentent la conception détaillée du Lot 5 comme une proposition non validée. Les validations ARB-01 à 06 et les statuts individuels des invariants sont intégrés ici. La divergence restante concerne la portée du gel historique global par rapport à la conception détaillée actuelle; elle ne rouvre pas les arbitrages validés et ne vaut pas gel complet du Lot 5.

Après le document 14, l’utilisateur a explicitement validé ARB-01, ARB-02 et ARB-03 (« valider »), ARB-04 (« oui ») et ARB-05/ARB-06 (« oui » groupé). Les six arbitrages sont donc VALIDÉS au 2026-11-04. Le document 14 est conservé comme photographie antérieure à ces décisions; il n’est pas réécrit. Les validations confirment les arbitrages, mais ne tranchent pas à elles seules chaque relation ou cardinalité de conception.

## 2. Périmètre fonctionnel

Le Lot 5 traite le contrôle opérationnel de la trésorerie physique : responsabilité de session, fonds confiés, mouvements physiques, clôture, comptage, rapprochement, justification et activités hors ligne. Il ne constitue pas un second système d’encaissement ou de comptabilité.

Les six sous-blocs conservés depuis le document 12 sont :

1. **Ouverture des sessions** — acteur responsable, poste, appareil, date d’ouverture, fonds initial et provenance; l’arbitrage ARB-01 sur l’exclusivité et la concurrence est validé. Les critères détaillés, exceptions, cardinalités et contrôles d’ouverture restent à spécifier.
2. **Opérations pendant la session** — mouvements physiques autorisés et références aux faits financiers sources; nature, statut de validité et rattachements restent à définir.
3. **Clôture et comptage physique** — instantané des montants théorique et constaté, détail éventuel par coupure et écart signé; structure du comptage et borne de clôture ouvertes.
4. **Journal et historique** — consultation chronologique des faits propriétaires et de leurs références; aucun journal supplémentaire n’est retenu sans besoin distinct démontré.
5. **Rapprochement et contrôle des écarts** — examen distinct de la clôture, justifications et contrôle; ARB-05 et ARB-06 sont validés. Les rôles détaillés, transitions et cardinalités restent à spécifier.
6. **Offline-First** — poursuite locale, identité stable, conservation et synchronisation des opérations; les règles métier de caisse restent séparées des états et décisions de synchronisation du Lot 8.

## 3. Concepts de travail

Les neuf concepts ci-dessous reprennent l’inventaire du document 12. Ils ne sont pas tous démontrés comme entités définitives. Les attributs, clés, relations et cardinalités restent à établir depuis les sources propriétaires et les précisions de conception nécessaires après arbitrage.

| Concept candidat | Rôle documenté | Réserve principale |
|---|---|---|
| `POSTE_CAISSE` | Point physique d’opération | Référentiel, durée de vie, partage et disponibilité à confirmer. |
| `APPAREIL` | Terminal utilisé pour une session | Équivalence ou correspondance avec `APPAREIL_SYNCHRONISATION` / installation Lot 8 non établie. |
| `SESSION_CAISSE` | Période opérationnelle sous responsabilité d’un caissier | ARB-01/03 validés; référentiels, cardinalités, conditions détaillées et transitions restent à spécifier. |
| `MOUVEMENT_CAISSE` | Mouvement physique autorisé | Périmètre strict et articulation avec les encaissements/remboursements sources à définir sans doublon. |
| `CLOTURE_CAISSE` | Fait de clôture conservé comme instantané historique (FIN-LOT5-026) | Borne, prérequis, répétition et représentation conceptuelle des montants restent à spécifier. |
| `DETAIL_COMPTAGE_CAISSE` | Détail des quantités physiques comptées | Parent, référentiel de coupures, recomptages et cardinalités ouverts; `COMPTAGE_CAISSE` n’est pas ajouté. |
| `TRANSMISSION_FONDS` | Fait ou dossier de remise physique candidat | Distinction avec les mouvements, confirmation, remise partielle et effets source/destination ouverts. |
| `RAPPROCHEMENT_CAISSE` | Processus de contrôle distinct de la clôture | ARB-05/06 validés; snapshots de référence, nombre de rapprochements et transitions détaillées restent à spécifier. |
| `JUSTIFICATION_ECART_CAISSE` | Explication relative à un écart | Objet exact, historique et cardinalités ouverts; ne corrige pas à elle seule un fait financier. |

Le journal consultable peut être une vue des faits déjà propriétaires. Un concept de journal ou de conflit métier supplémentaire n’est pas retenu sans besoin et cycle distinct démontrés.

## 4. Dépendances et frontières entre lots

### Lot 4 — encaissements et faits financiers

Le Lot 4 demeure propriétaire des encaissements, affectations, mouvements de crédit, déclarations Mobile Money, moyens de paiement et vérification financière. Le Lot 5 consomme ou référence les faits propriétaires. Il ne crée pas un encaissement secondaire et ne redéfinit ni affectation ni validation financière. Un encaissement espèces peut avoir une incidence physique; le lien exact à la session, l’événement éligible, sa borne temporelle et son mode d’inclusion unique ne sont pas documentés par les sources disponibles. Mobile Money, affectation et utilisation de crédit ne constituent pas une entrée physique d’espèces.

### Lot 6 — remboursements, annulations et corrections

Le statut documentaire du Lot 6 est lui-même divergent : la source propriétaire rapportée dans 13–14 indique MCD V1.0 gelé et FIN-LOT6-015 établi, tandis que plusieurs fichiers locaux le disent provisoire. Pour la présente interface, respecter FIN-LOT6-015 telle que rapportée en 13–14 : un remboursement physique espèces est matérialisé exclusivement par `REMBOURSEMENT_FONDS`, sans sortie indépendante doublonnée dans `MOUVEMENT_CAISSE`. Son lien et son incidence sur le calcul de caisse restent à documenter. Une annulation financière ne signifie pas par elle-même qu’il y a eu mouvement physique.

### Lot 7 — projections financières

Le Lot 7 reste propriétaire des soldes, restes à payer et résultats financiers gelés sous VAL-013. Un rapprochement de caisse ne remplace ni ne recalcule ces résultats.

### Lot 8 — synchronisation Offline-First

VAL-014 est préservé : identité stable, idempotence, conservation des événements et conflits, séparation réception/traitement/acquittement et arbitrage conformément au domaine propriétaire. Le Lot 8 transporte et traite les événements; il ne choisit pas la règle métier de caisse. Une synchronisation répétée ne crée pas un second effet physique. Les statuts de synchronisation ne sont pas des statuts opérationnels de session.

### Identités et MCD global

Réutiliser les identités et permissions transversales existantes; ne pas créer de compte caissier autonome. L’équivalence de l’appareil métier et de l’appareil Lot 8 ne peut être déduite par homonymie. VAL-016 valide le MCD global avec une réserve documentaire sur les sources financières 1 à 5 et ne valide pas le MLD. Les modèles propriétaires et cardinalités manquants ne sont pas reconstruits par hypothèse.

## 5. Règles et invariants recensés

Les formulations FIN-LOT5-001 à 018 sont reprises de 12 §11 et réévaluées individuellement au regard des arbitrages validés. « Validé » signifie couvert par une décision utilisateur identifiée; « partiellement couvert » signifie que l’arbitrage validé couvre le sujet sans que la décision fournie établisse explicitement tous les termes de l’invariant; « à confirmer » signifie qu’aucune des six validations ne justifie son approbation.

| Référence | Définition | Source | Arbitrage validé couvrant le sujet | Statut |
|---|---|---|---|---|
| FIN-LOT5-001 | Continuité opérationnelle après clôture locale hors ligne | 12 §4.6; décision ARB-01, 2026-11-04 | ARB-01 | PARTIELLEMENT COUVERT — confirmation ARB-01 connue; formulation exacte de la continuité locale à préciser. |
| FIN-LOT5-002 | Distinguer caissier, poste de caisse et appareil | 12 §§3, 4.2; ARB-03 | ARB-03 | VALIDÉ — distinction conceptuelle couverte par l’arbitrage acteurs/poste/appareils. |
| FIN-LOT5-003 | Une session clôturée localement ne reçoit plus de mouvements ordinaires | 12 §§6.6, 9.2; ARB-01/05; FIN-LOT5-027 | ARB-01, ARB-05 | VALIDÉ — FIN-LOT5-027 fixe explicitement cette règle. |
| FIN-LOT5-004 | Une nouvelle session possède une identité indépendante | 12 §§4.2, 9.4; ARB-01 | ARB-01 | PARTIELLEMENT COUVERT — l’arbitrage sessions couvre le sujet, sans décision explicitement rappelée sur l’identité distincte. |
| FIN-LOT5-005 | Le fonds initial correspond au montant réellement confié au caissier | 12 §4.3; ARB-02 | ARB-02 | VALIDÉ — fonds initiaux et garde validés. |
| FIN-LOT5-006 | Le solde final précédent n’est pas automatiquement repris comme fonds initial | 12 §4.3; ARB-02 | ARB-02 | PARTIELLEMENT COUVERT — le sujet fonds initiaux est arbitré; cette modalité précise n’est pas rappelée séparément. |
| FIN-LOT5-007 | Toute transmission conserve son origine et sa réception effective | 12 §10; ARB-02/04, FIN-LOT5-023 | ARB-02/04 | VALIDÉ — FIN-LOT5-023 précise l’unicité et les incidences distinctes de la transmission. |
| FIN-LOT5-008 | Le solde théorique est calculé à partir des opérations physiques valides | 12 §6.3; ARB-04, FIN-LOT5-024 | ARB-04 | VALIDÉ — FIN-LOT5-024 confirme le calcul depuis les événements physiques valides. |
| FIN-LOT5-009 | Les paiements Mobile Money ne constituent pas des entrées physiques d’espèces | 12 §5.4; ARB-04, FIN-LOT5-020 | ARB-04 | VALIDÉ — FIN-LOT5-020 exclut Mobile Money du solde physique. |
| FIN-LOT5-010 | L’utilisation d’un crédit ne constitue pas une entrée de trésorerie | 12 §5.5; ARB-04, FIN-LOT5-021 | ARB-04 | VALIDÉ — FIN-LOT5-021 exclut les crédits du solde physique. |
| FIN-LOT5-011 | Le remboursement espèces suit exclusivement le mécanisme du Lot 6 | 12 §5.6; FIN-LOT6-015; ARB-04, FIN-LOT5-022 | ARB-04 | VALIDÉ — FIN-LOT5-022 et la frontière gelée FIN-LOT6-015 concordent; aucune règle Lot 6 n’est modifiée. |
| FIN-LOT5-012 | Clôture et rapprochement sont deux processus distincts | 12 §§6.7, 8; ARB-05, FIN-LOT5-030 | ARB-05 | VALIDÉ — FIN-LOT5-030 confirme l’indépendance du rapprochement. |
| FIN-LOT5-013 | Le total du détail de comptage correspond au montant déclaré lorsqu’il est utilisé | 12 §6.4; ARB-05, FIN-LOT5-028/029 | ARB-05 | PARTIELLEMENT COUVERT — conservation des détails/recomptages validée; égalité arithmétique explicitement à rattacher au résultat du comptage. |
| FIN-LOT5-014 | L’écart est conservé avec son signe réel | 12 §6.5; ARB-05 | ARB-05 | PARTIELLEMENT COUVERT — l’arbitrage de clôture/contrôle couvre le domaine, mais le signe de l’écart n’est pas explicitement rappelé dans les décisions données. |
| FIN-LOT5-015 | Une justification ne modifie pas artificiellement le solde théorique | 12 §8.3; ARB-06, FIN-LOT5-031 | ARB-06 | VALIDÉ — FIN-LOT5-031 énonce explicitement cette règle. |
| FIN-LOT5-016 | Les sessions concurrentes sont conservées et soumises à arbitrage | 12 §§4.5, 9.5; ARB-01 | ARB-01 | VALIDÉ — sessions concurrentes et leur arbitrage relèvent de l’arbitrage validé. |
| FIN-LOT5-017 | Une opération validée ne peut être supprimée silencieusement | 12 §§5.7, 7.3; ARB-05/06, FIN-LOT5-035 | ARB-05, ARB-06 | VALIDÉ — FIN-LOT5-035 impose conservation d’historique sans suppression/réécriture silencieuse. |
| FIN-LOT5-018 | La synchronisation ne rouvre pas automatiquement une session clôturée localement | 12 §9.4; ARB-01/05; VAL-014 | ARB-01, ARB-05 | PARTIELLEMENT COUVERT — clôture locale et séparation de sync sont couvertes, mais la non-réouverture automatique n’est pas énoncée explicitement dans les décisions résumées. |
| FIN-LOT5-019 | Absence de double comptabilisation d’un encaissement | Décision utilisateur du 2026-11-04; ARB-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-020 | Mobile Money exclu du solde physique | Décision utilisateur du 2026-11-04; ARB-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-021 | Crédits exclus du solde physique | Décision utilisateur du 2026-11-04; ARB-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-022 | Remboursement physique selon le mécanisme exclusif du Lot 6 | Décision utilisateur du 2026-11-04; ARB-04; FIN-LOT6-015 | ARB-04 | VALIDÉ |
| FIN-LOT5-023 | Transmission unique avec incidences distinctes | Décision utilisateur du 2026-11-04; ARB-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-024 | Solde calculé depuis les événements physiques valides | Décision utilisateur du 2026-11-04; ARB-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-025 | Conservation des annulations et contrepassations sans double comptabilisation | Décision utilisateur du 2026-11-04; ARB-04 | ARB-04 | VALIDÉ |
| FIN-LOT5-026 | Clôture comme instantané historique conservé | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-027 | Aucune opération ordinaire après clôture locale | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-028 | Conservation du détail et du résultat des comptages | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-029 | Conservation des recomptages sans remplacement silencieux | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-030 | Rapprochement indépendant de la clôture | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-031 | Justification sans modification du solde théorique | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-032 | Arbitrage des opérations tardives incompatibles | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-033 | Différenciation des permissions | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-034 | Référence à l’opération d’origine pour toute correction | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |
| FIN-LOT5-035 | Conservation de l’historique sans suppression ou réécriture silencieuse | Décision utilisateur du 2026-11-04; ARB-05/06 | ARB-05, ARB-06 | VALIDÉ |

## 6. Cycles de vie et Offline-First

Le document 12 distingue une activité opérationnelle de session (`OUVERTE` / clôturée ou `FERMEE`) et l’état de synchronisation. Les libellés de synchronisation proposés dans 12 ne remplacent pas les cycles détaillés de VAL-014; ne pas recopier ceux-ci dans le modèle métier de caisse. Le cycle complet de session, ses transitions, ses prérequis, sa reprise et ses conditions de fin ne sont pas établis.

Principes de travail à conserver avec leur statut :

- une clôture locale rend la session non opérationnelle pour les opérations ordinaires; cette règle est validée par FIN-LOT5-027; FIN-LOT5-001 est partiellement couvert quant à la continuité et à la réouverture d’une nouvelle session;
- la répétition d’une transmission idempotente ne doit pas créer un second effet;
- les sessions concurrentes et événements tardifs restent traçables et sont traités selon ARB-01/05 validés et FIN-LOT5-032; les relations précises restent à documenter;
- aucune fusion, réattribution ou réécriture silencieuse n’est proposée;
- sauvegarde, restauration, révocation d’appareil ou de compte et événements orphelins doivent suivre VAL-014 et les règles d’identité applicables;
- accusé de réception ou acquittement de synchronisation n’équivaut ni à validation financière, ni à acceptation d’une session, ni à clôture métier.

## 7. Points ouverts consolidés

Les six dossiers ARB du document 14 structurent les arbitrages qui ont été validés ultérieurement le 2026-11-04. Le statut ancien de 14 est conservé comme historique :

| Arbitrage | Sujet | Statut constaté et dépendances principales |
|---|---|---|
| ARB-01 | Exclusivité des sessions et concurrence Offline-First | VALIDÉ le 2026-11-04; détails de portée de FIN-LOT5-001 et cardinalités restent à documenter. |
| ARB-02 | Fonds initiaux, garde et transmission physique | VALIDÉ le 2026-11-04; cardinalités et modalités détaillées restent à documenter. |
| ARB-03 | Identité des acteurs, poste et appareils | VALIDÉ le 2026-11-04; correspondance technique avec le Lot 8 reste à documenter. |
| ARB-04 | Encaissements, mouvements physiques et solde théorique | VALIDÉ le 2026-11-04; interface relationnelle et bornes détaillées restent à documenter. |
| ARB-05 | Clôture, comptage, rapprochement et opérations tardives | VALIDÉ le 2026-11-04; structure/cardinalités ne sont pas fixées par ce statut. |
| ARB-06 | Autorisations, écarts et corrections | VALIDÉ le 2026-11-04; permissions détaillées et liens aux corrections propriétaires restent à documenter. |

Autres précisions de conception restant à spécifier après validation des arbitrages : relations et cardinalités des neuf concepts; modèles sources financiers 1–5 et interface exacte encaissement/session; nombres de clôtures, comptages et rapprochements; parent du détail de comptage; source de coupures; traduction de la transmission unique en liens et incidences; transitions détaillées du rapprochement/justification; fonctionnement après révocation ou restauration. Aucun cardinalité ou seuil n’est déduit.

La divergence de statut du Lot 6 est un suivi documentaire, pas une réouverture de décision. Les mentions locales divergentes ne sont pas corrigées dans cette mission.

## 8. État de complétude documentaire

| Élément attendu | État dans cette consolidation |
|---|---|
| Six sous-blocs | Recensés; leurs règles restent en partie proposées. |
| Neuf concepts | Tous recensés; inventaire provisoire, dictionnaire définitif absent. |
| Arbitrages ARB-01 à 06 | Tous validés le 2026-11-04 par décisions utilisateur ultérieures à 14; les détails relationnels restent à documenter. |
| FIN-LOT5-001 à 018 | Définitions et statuts individuels réévalués dans §5; VALIDÉ, PARTIELLEMENT COUVERT ou À CONFIRMER selon les décisions disponibles. |
| FIN-LOT5-019 à 035 | Définitions communiquées et validées le 2026-11-04; statuts individuels VALIDÉ dans §5. |
| Dépendances Lots 4 et 6 | Frontières et contraintes connues reprises; interfaces relationnelles non résolues. |
| Offline-First et cycles | Principes rapportés; cycle complet de caisse non défini; VAL-014 préservé. |
| Relations/cardinalités et MCD | Non établis; ne pas concevoir le MCD avant les précisions de modélisation et sources nécessaires. |

Cette consolidation est complète comme inventaire fidèle des éléments disponibles et de leurs lacunes. Le Lot 5 n’est pas démontré complet ou validé comme modèle métier; le MCD reste hors de cette mission.

## 9. Sources et protection des décisions

Sources consultées pour cette consolidation : `04-regles-metier.md`, `05-cycles-de-vie-et-statuts.md`, `06-decisions-et-points-ouverts.md`, `07-historique-des-validations.md`, `08-mcd-consolide-lot8.md`, `10-verification-sources-financieres-lots-1-a-5.md`, `11-mld-global.md`, `12-conception-fonctionnelle-lot5-v0.1.md`, `13-audit-conception-lot5-v0.1.md`, `14-synthese-arbitrages-lot5-v0.2.md`.

Les références VAL-013, VAL-014, VAL-015 et VAL-016, les invariants gelés des Lots 7 et 8, les lots déjà gelés et le MLD global ne sont pas modifiés. Aucun MCD du Lot 5 n’est créé.
