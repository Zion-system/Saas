# 13 — Rapport d’audit de la conception fonctionnelle du Lot 5

**Projet :** ERP scolaire SaaS Offline-First  
**Document audité :** `12-conception-fonctionnelle-lot5-v0.1.md`  
**Date de l’audit :** 2026-11-04  
**Statut :** audit documentaire; les statuts officiels communiqués par le propriétaire sont préservés; aucune décision métier nouvelle n’est prise  
**Périmètre :** sous-blocs 5.1 à 5.6, inventaire conceptuel, interfaces avec les Lots 4, 6, 7 et 8

## 1. Résumé exécutif

La conception couvre correctement les six sujets fonctionnels attendus et pose des garde-fous importants : séparation entre caissier, poste et appareil; exclusion du Mobile Money et des affectations de crédit du comptage d’espèces; distinction entre encaissement et mouvement de caisse; conservation des opérations; et séparation entre clôture locale et synchronisation.

Le document reste toutefois une proposition V0.1. Il le dit explicitement : `FIN-LOT5-001` attend une confirmation officielle, les autres règles `FIN-LOT5` sont proposées, les relations et cardinalités restent à établir et aucun gel du Lot 5 n’est déclaré. Le registre des validations disponible ne contient aucune confirmation explicite de `FIN-LOT5-001`; cette règle n’est donc pas traitée comme validée dans cet audit.

Les risques les plus importants sont l’absence de modèle source détaillé vérifiable pour les interfaces financières des Lots 1 à 5, les règles de concurrence des sessions encore ouvertes, l’ambiguïté entre transmission physique et mouvement de caisse, le risque de double intégration des encaissements/remboursements dans le solde théorique, et le recouvrement possible des montants de clôture et de rapprochement. Le Lot 8 définit un transport idempotent et des conflits/arbitrages historisés, mais ne décide pas les règles métier de caisse ni leur atomicité.

**Verdict : conception fonctionnelle intermédiaire, utile pour cadrer les arbitrages, mais insuffisamment spécifiée pour produire un MCD complet et fidèle.** Les blocages documentaires et métier recensés en section 10 doivent être levés avant le MCD définitif. Le présent rapport ne commence pas ce MCD.

### Convention de lecture des statuts

- **Décision établie dans les références consultées :** énoncée dans une source de référence disponible, avec son périmètre exact. Cela ne valide pas automatiquement les nouvelles formulations du Lot 5.
- **Proposition du document 12 :** formulation de travail expressément non gelée ou non confirmée.
- **Non résolu :** la documentation ne donne pas assez d’éléments pour décider sans hypothèse.

Les niveaux **BLOQUANTE**, **MAJEURE**, **MINEURE** et **INFORMATION** qualifient l’impact sur la fidélité du modèle ou sur la possibilité de poursuivre vers un MCD complet; ils ne constituent pas des décisions métier.

## 2. Éléments conformes

Les points ci-dessous sont cohérents avec les références consultées, dans les limites de leur portée.

| Gravité | Constat | Statut documentaire et portée |
|---|---|---|
| INFORMATION | Le périmètre comprend ouverture, activité, clôture/comptage, journal, rapprochement et fonctionnement hors ligne. | Les six sous-blocs sont explicitement couverts dans le document 12. Leur présence ne vaut pas validation de leurs règles. |
| INFORMATION | `SESSION_CAISSE`, `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE` et `RAPPROCHEMENT_CAISSE` sont des concepts déjà cités dans les synthèses du projet. | Le document 03 et le document 10 les recensent comme concepts historiques; leurs liens et cardinalités de source ne sont pas disponibles. Les conserver dans l’inventaire est justifié. |
| INFORMATION | La séparation conceptuelle caissier / poste / appareil est saine pour représenter responsabilité, lieu physique et terminal utilisé. | Elle est proposée par le document 12. La relation de ces concepts aux identités et appareils propriétaires reste à documenter. |
| INFORMATION | Les encaissements, affectations, crédits et déclarations Mobile Money relèvent des concepts du Lot 4; le Lot 5 ne doit pas recréer un encaissement ni assimiler affectation/crédit à une entrée d’espèces. | Cohérent avec les principes financiers des documents 03, 04 et 11. Les règles détaillées du Lot 4 et leurs cardinalités ne sont pas accessibles dans le dépôt. |
| INFORMATION | Une déclaration Mobile Money hors ligne n’est pas une confirmation auprès du fournisseur; la synchronisation technique et la validation financière sont distinctes. | Règles générales présentes dans les documents 04, 05 et 11 et séparation des dimensions de synchronisation validée sous VAL-014. Le Lot 5 doit consommer ces états sans les redéfinir. |
| INFORMATION | Une clôture peut être distinguée d’un rapprochement et l’explication d’un écart ne doit pas réécrire artificiellement les événements historiques. | Cohérent avec les principes généraux d’immutabilité du document 04 et avec la séparation clôture/rapprochement proposée dans le document 12; les cardinalités restent inconnues. |
| INFORMATION | Le Lot 8 transporte les événements des domaines propriétaires; il ne redéfinit pas leurs entités ou règles métier. Il impose notamment identité immuable, déduplication/idempotence, conservation des conflits et arbitrage humain conforme au domaine. | Décisions de VAL-014 documentées dans `08-mcd-consolide-lot8.md`. Elles sont préservées ici; aucun état métier de caisse n’est ajouté au modèle de synchronisation. |
| INFORMATION | `APPAREIL` ne doit pas être automatiquement assimilé à `APPAREIL_SYNCHRONISATION`. | Le MLD global actuel marque explicitement cette équivalence et le lien à l’installation comme non établis. Cette prudence respecte le périmètre gelé du Lot 8. |

## 3. Anomalies et contradictions

| ID | Gravité | Constat | Analyse / impact |
|---|---|---|---|
| A-01 | BLOQUANTE | La preuve de validation du Lot 5 manque. | Le document 12 se déclare proposition V0.1, indique que `FIN-LOT5-001` est à confirmer, que les règles `FIN-LOT5-002` à `018` sont proposées et que le gel n’est pas effectué. Aucune confirmation explicite de `FIN-LOT5-001` n’a été trouvée dans `07-historique-des-validations.md`. Le MCD ne peut pas traiter ces règles comme normatives. |
| A-02 | MAJEURE | Le statut du Lot 6 dans plusieurs fichiers locaux est en divergence avec sa validation officielle V1.0 gelée. | Le propriétaire confirme que le Lot 6 est gelé V1.0 et ne doit pas être rouvert. Des passages de `04`, `05`, `06`, `07` et `11` le présentent encore comme provisoire/non gelé et listent ses sujets historiques ouverts. Il s’agit d’une divergence documentaire à harmoniser ultérieurement; elle ne remet pas en cause le gel officiel et cet audit ne modifie aucun document de référence. |
| A-03 | MAJEURE | L’interface locale de `FIN-LOT6-015` / `REMBOURSEMENT_FONDS` avec le modèle de caisse reste à vérifier. | La règle propriétaire validée est établie : un remboursement physique en espèces est matérialisé exclusivement par `REMBOURSEMENT_FONDS`, sans duplication dans `MOUVEMENT_CAISSE`. La question restante porte sur son intégration et ses relations dans les documents locaux de conception (référence de source, incidence sur le solde théorique et liens conceptuels), sans remettre en cause ni modifier cette règle du Lot 6. |
| A-04 | MAJEURE | Le calcul du solde théorique peut compter deux fois des faits physiques si les sources ou relations ne sont pas fixées. | Le texte parle d’entrées/sorties physiques, puis ajoute encaissements en espèces et événements des Lots 4/6. La formule est compacte mais ne précise pas si un encaissement confirmé est directement inclus dans les entrées physiques ou est matérialisé par un mouvement référencé. Une seule représentation doit alimenter le calcul. Le même risque existe pour les remboursements. |
| A-05 | MAJEURE | `TRANSMISSION_FONDS` peut dupliquer les mouvements physiques qu’elle prétend tracer. | Le document décrit les transferts comme mouvements physiques possibles dans `MOUVEMENT_CAISSE`, puis crée une entité de transmission avec montants envoyés et reçus. Il ne définit pas si la transmission est l’événement métier, un dossier de remise, une paire d’écritures de caisse, ou un regroupement de ces faits. Intégrer les deux sans règle peut compter deux fois la même somme; ne compter que l’un peut perdre l’impact sur les soldes des sessions/source/destination. |
| A-06 | MAJEURE | `CLOTURE_CAISSE` et `RAPPROCHEMENT_CAISSE` portent des valeurs de référence qui se recouvrent. | La clôture conserve théorique, physique et écart; le rapprochement ré-identifie ces mêmes montants. Le document ne dit pas si le rapprochement référence un instantané de clôture immuable ou recopie des montants, ni si une révision/correction de rapprochement crée un nouveau dossier. Risque de divergence entre deux valeurs réputées être le même fait. |
| A-07 | MAJEURE | Le comptage n’a pas de structure de processus clairement distinguée de ses lignes. | `DETAIL_COMPTAGE_CAISSE` est annoncé, mais aucun concept d’en-tête `COMPTAGE_CAISSE` n’est défini. Les lignes semblent appartenir au montant porté par la clôture, mais le lien n’est pas fixé. Les comptages interrompus, recompte, plusieurs comptages et choix du comptage retenu sont explicitement ouverts. Il est impossible de trancher si le détail est directement sous clôture ou sous une opération de comptage distincte. |
| A-08 | MAJEURE | Les états de session proposés ne couvrent pas les cas de traitement métier du Lot 8 et leurs transitions. | `OUVERTE`/`FERMEE` décrivent l’activité; `EN ATTENTE`, `SYNCHRONISEE`, `CONFLIT_A_ARBITRER` décrivent une synchronisation dans le document 12. Le Lot 8 distingue réception, traitement, acquittement, attente, conflit, rejet définitif, incompatibilité temporaire et arbitrage appliqué; ces dimensions ne sont pas interchangeables. Le Lot 5 doit référencer les résultats du Lot 8 sans recopier ni simplifier ses cycles gelés. |
| A-09 | MAJEURE | La « clôture locale » est décrite comme immédiate, mais sa condition de complétude et le traitement des opérations déjà émises restent ouverts. | Le document 12 rend la session inactive sur l’appareil d’origine et interdit les opérations ordinaires tardives, mais signale comme arbitrage la clôture avec opérations locales en cours, les traitements incomplets et les opérations reçues après fermeture. Cela affecte la borne temporelle et le calcul de clôture, sans règle de rattachement ou de traitement définitive. |
| A-10 | MAJEURE | La politique d’unicité et de concurrence n’est pas définie. | L’unicité active par poste, caissier, appareil ou combinaison est ouverte. Une clôture autorise potentiellement une autre session locale avant validation centrale, tandis que des sessions hors ligne d’autres appareils peuvent être incompatibles. La portée de l’arbitrage, ses effets sur les sessions, les opérations liées et les fonds physiques ne sont pas définis. |
| A-11 | MAJEURE | La référence de terminal et l’identité de synchronisation risquent d’être confondues. | Le document 12 demande une identité technique stable conformément au Lot 8, mais n’établit pas si `APPAREIL` est le même concept que `APPAREIL_SYNCHRONISATION`, un alias métier, ou un appareil métier relié à une installation/appareil de sync. Le Lot 8 a des relations gelées autour de son propre concept. Une fusion ou un nouveau lien ne peut être présumé. |
| A-12 | MINEURE | Les statuts de rapprochement et de justification sont énumérés comme propositions sans transitions ni critère de fin. | « Expliqué et accepté », attente, vérification, contesté, non résolu et transmis à un responsable sont des libellés de travail. Leur ordre, leur exclusivité, les acteurs et la résolution finale ne sont pas fixés. |

## 4. Règles métier insuffisamment définies

| Gravité | Sujet | Manque documentaire et effet sur le modèle |
|---|---|---|
| BLOQUANTE | Fond initial et garde des fonds | L’origine peut être une réserve au poste, un responsable, un autre caissier ou une autre opération. Il manque le propriétaire/gardien avant et après remise, la confirmation de réception, les remises partielles/refusées/réservées, la relation à une session précédente et l’effet de chaque cas sur les soldes. Le non-report automatique du solde précédent est proposé, mais ne règle pas qui détient l’argent. |
| BLOQUANTE | Sessions incompatibles | Il manque la contrainte fonctionnelle (poste, caissier, appareil, éventuellement établissement), sa portée connectée/hors ligne, et le résultat métier d’un conflit. Le MCD ne peut fixer unicités et cardinalités d’unicité sans cet arbitrage. |
| BLOQUANTE | Interface encaissement–session–mouvement | Les sources disponibles nomment les concepts mais n’établissent pas si un encaissement espèces référence une session, si un mouvement de caisse le matérialise, quelles cardinalités s’appliquent, ni le traitement de versements sans session ou d’un encaissement rattaché tardivement. |
| MAJEURE | Interface remboursement/annulation du Lot 6 | La règle gelée de remboursement espèces est à appliquer : `REMBOURSEMENT_FONDS` est l’unique matérialisation, sans `MOUVEMENT_CAISSE` en doublon. Le Lot 5 doit encore définir comment référencer ce fait dans le calcul et l’historique de session, conformément à la décision propriétaire. Une annulation d’encaissement n’implique pas à elle seule une sortie physique. |
| MAJEURE | Fonds transmis | Il manque les rôles de remettant/réceptionnaire, la confirmation bilatérale, la réserve, le refus, le montant réellement accepté, la transmission partielle, l’origine/destination (personne, poste, session) et la distinction entre remise d’ouverture, transfert intersession et versement hors caisse. |
| MAJEURE | Natures et validité des mouvements | Le document cite entrées complémentaires, sorties autorisées, transferts et « autres opérations » sans catalogue validé, critères de validité, auteur/approbateur requis, moment d’effet, pièce justificative et correction/annulation applicable. |
| MAJEURE | Solde théorique | La formule générale est intelligible, mais l’instant de coupure, les sources canoniques, la prise en compte d’événements confirmés/annulés/contrepassés, les événements arrivés après clôture, les fonds transmis et la politique de recalcul/reproduction historique ne sont pas définis ensemble. |
| MAJEURE | Coupures et comptage | L’exemple par coupure est illustratif; le référentiel des coupures, les unités, la monnaie, les pièces, les montants libres, les recomptages et le cas d’un comptage global sans détail ne sont pas tranchés. |
| MAJEURE | Clôture et rapprochement | Manquent cardinalité des clôtures par session, autorité de clôture, interruption/reprise, nombres de comptages, réouverture éventuelle exceptionnelle, création de rapprochements, finalité d’une justification et lien vers une action corrective sans écrasement de l’historique. |
| MAJEURE | Immutabilité et audit | Le principe est établi au niveau général, mais la granularité de l’objet immuable (encaissement, mouvement, ligne de comptage, clôture, transmission, décision de rapprochement), l’annulation/correction autorisée, l’acteur habilité et la conservation de chaque version ne sont pas définis pour le Lot 5. |
| MAJEURE | Offline-first et sécurité | L’identité UUID et l’historique sont cohérents avec les références générales. Restent à définir les accès hors ligne après révocation d’utilisateur/appareil, l’autorité d’arbitrage métier, la gestion des événements orphelins après restauration et les prérequis de synchronisation de la clôture, dans le respect de VAL-014. |
| MINEURE | Journal | Les dimensions de recherche proposées (date, utilisateur, session, statut de sync) ne précisent pas si le journal est une vue de faits propriétaires ou une entité de journal supplémentaire. Aucun besoin ne justifie de dupliquer les événements si les sources assurent déjà l’historique. |

## 5. Entités à conserver, revoir ou éventuellement ajouter

Le classement porte sur la pertinence conceptuelle et non sur la validation définitive du nom, des attributs ou des relations.

| Entité | Avis | Motif / condition |
|---|---|---|
| `POSTE_CAISSE` | Conserver comme concept de travail; revoir sa définition. | Lieu/point d’opération distinct de l’utilisateur et du terminal. Les propriétés du référentiel, sa durée de vie, son activation et le partage entre caissiers restent inconnus. |
| `APPAREIL` | Conserver comme concept candidat; revoir l’identité et l’interface Lot 8. | Distinction utile du poste et de la session, mais relation avec `APPAREIL_SYNCHRONISATION` et installation non établie. Ne pas fusionner ni ajouter une FK au modèle gelé par simple homonymie. |
| `SESSION_CAISSE` | Conserver. | Concept historique et cœur du périmètre. Identité, responsable, poste, appareil, période, unicité et transitions demeurent incomplets. |
| `MOUVEMENT_CAISSE` | Conserver, sous réserve de définir son périmètre strict. | Concept historique de mouvement physique. Clarifier s’il porte seulement des mouvements autonomes ou s’il est aussi l’interface/référence des encaissements et remboursements propriétaires. Éviter le double comptage. |
| `CLOTURE_CAISSE` | Conserver, revoir la responsabilité et le contenu. | Le fait de clôture doit être distingué du comptage et du rapprochement. Décider si les montants et l’écart sont le snapshot canonique de fermeture. |
| `DETAIL_COMPTAGE_CAISSE` | Revoir; ne pas conclure à une entité indépendante tant que le parent n’est pas choisi. | La ligne de comptage est utile si le détail par dénomination est requis. Son parent, son éventuelle référence à un référentiel de coupures et les reprises de comptage sont inconnus. |
| `TRANSMISSION_FONDS` | Revoir le périmètre; conserver comme candidate si la remise constitue un fait métier autonome. | À séparer d’un mouvement comptable seulement si responsabilités et états envoyée/reçue/réservée ont une valeur propre; préciser son effet sur chaque caisse/session afin d’éviter les écritures en double. |
| `RAPPROCHEMENT_CAISSE` | Conserver comme processus/fait distinct de la clôture; revoir les snapshots. | Son rôle de contrôle est intelligible. Les montants devraient référencer le constat de clôture source ou en conserver un instantané explicitement défini, sans créer une seconde version contradictoire. |
| `JUSTIFICATION_ECART_CAISSE` | Conserver comme candidate; revoir l’objet justifié. | La justification peut être distincte de l’écart et ne modifie pas le solde. Déterminer si elle dépend d’un rapprochement, d’une clôture ou d’un écart identifié; plusieurs justifications/historiques restent ouverts. |
| `COMPTAGE_CAISSE` (éventuel) | Ne pas ajouter sans arbitrage. | Un en-tête devient pertinent si plusieurs comptages/recomptages doivent être conservés séparément avec auteur, date et résultat. Si un seul comptage appartient à une clôture, une entité supplémentaire pourrait être redondante. |
| Journal métier (éventuel) | Ne pas ajouter sur la seule base de l’écran/historique. | Les journaux peuvent être des consultations des faits métier et des événements de synchronisation déjà propriétaires. Une nouvelle entité risquerait de dupliquer leur histoire. |

Les neuf entités initiales sont donc un inventaire de travail plausible, pas un inventaire démontré comme complet ni non redondant. Aucun ajout ou retrait définitif n’est justifié avant arbitrage.

## 6. Relations et cardinalités documentables

Les documents 03, 06, 10 et 11 préviennent explicitement que les relations et cardinalités financières des Lots 1 à 5 ne sont pas suffisamment documentées. Les associations ci-dessous ne doivent donc pas être traduites en cardinalités définitives sur la seule base du texte de travail Lot 5.

| Relation conceptuelle | Ce qui est documentable | Ce qui reste indéterminé |
|---|---|---|
| Caissier — session | Le document 12 décrit une période dont un caissier est responsable. Association conceptuelle proposée. | Référentiel/profil du caissier, cardinalité session→caissier obligatoire ou substitution de responsable; sessions simultanées ou successives par personne. |
| Poste — session | Le document 12 situe une session sur un poste physique. Association conceptuelle proposée. | Un poste peut-il accueillir plusieurs sessions successives ou concurrentes? Un poste peut-il être désactivé pendant une session? Cardinalité inverse et unicité. |
| Appareil — session | Le document 12 demande de conserver le terminal utilisé; un appareil peut servir à plusieurs sessions successives. | Obligatoire à vie de session, changement/récupération, relation au concept Lot 8, cardinalité inverse; aucun lien exact n’est validé. |
| Session — mouvements | Activité/mouvements appartiennent au contexte de session dans le texte fonctionnel. | Une opération peut-elle être hors session? Cardinalité, rattachement des encaissements, traitement d’événements tardifs et correction d’une référence. |
| Session — clôture | La clôture concerne une session; la séparation fonctionnelle est affirmée. | Nombre de clôtures par session, clôture incomplète, nouvelle clôture/reprise; aucune cardinalité 0..1 ou 1..1 ne peut être affirmée. |
| Clôture/comptage — détails | Des détails peuvent totaliser le montant physique déclaré si le détail est utilisé. | Parent exact, caractère facultatif, recomptages, unicité d’une coupure par comptage et cardinalités. |
| Clôture/session — rapprochement | Un rapprochement examine une situation de caisse et peut référencer session/clôture. | Le nombre de rapprochements successifs par clôture, rapprochement sans écart, clôture concernée obligatoire, et liens exacts. |
| Rapprochement/écart — justification | Une justification se rapporte à un écart et ne modifie pas le solde théorique. | Le concept propriétaire de l’écart, la cardinalité, l’historique de plusieurs justifications et leurs états. |
| Transmission — remettant/réceptionnaire / session / poste | L’identité des intervenants et l’origine/destination doivent être conservées selon le texte de travail. | Cardinalités, rôles, possibilité de remise sans session, transfert un-à-plusieurs ou plusieurs-à-un, montants partiels/refusés, sessions source/destination. |
| Lot 4 — encaissement — session/mouvement | Un encaissement espèces peut contribuer au solde d’une session; une affectation ne constitue pas à elle seule une entrée physique. | Relation et cardinalités exactes non disponibles dans les sources. Les documents 03 et 10 signalent précisément cette lacune. |
| Lot 6 — remboursement/annulation — caisse | Les remboursements espèces appartiennent au Lot 6 et FIN-LOT6-015 interdit leur duplication comme sortie indépendante dans `MOUVEMENT_CAISSE`. | La règle propriétaire est gelée et doit être préservée. L’intégration au calcul et aux relations de caisse reste à documenter sans créer de fait physique en doublon ni modifier le MCD Lot 6. |
| `APPAREIL` — `APPAREIL_SYNCHRONISATION`/installation Lot 8 | Aucun lien ne peut être déduit de l’homonymie. VAL-014 distingue son propre appareil de synchronisation et son chemin d’installation. | Identité partagée ou relation de correspondance à décider dans le périmètre autorisé, en préservant le MCD gelé. |

À ce stade, les seuls liens suffisamment explicites sont des **associations sémantiques candidates** issues de la proposition Lot 5. Aucun intervalle cardinal complet autre que ceux déjà gelés dans les lots propriétaires ne peut être ajouté à ce rapport. Les cardinalités du Lot 8 ne s’appliquent pas par analogie aux entités de caisse.

## 7. Arbitrages métier et suivi documentaire

Les points ci-dessous sont issus du document 12, complétés par les lacunes visibles dans les références. Ils restent non résolus, sauf preuve dans le référentiel propriétaire.

1. **Suivi documentaire Lot 6 (non métier)** : les décisions V1.0 sont gelées et ne sont pas à arbitrer. Des fichiers locaux indiquent encore un statut provisoire; corriger cette divergence ultérieurement dans le processus documentaire autorisé, sans réécrire les décisions propriétaires ni leur historique officiel.
2. **Intégration de `FIN-LOT6-015` (non métier)** : appliquer la règle validée (remboursement espèces uniquement via `REMBOURSEMENT_FONDS`, sans doublon `MOUVEMENT_CAISSE`) et documenter le lien de référence et l’incidence dans le modèle Lot 5. La décision elle-même ne constitue pas un arbitrage ouvert.
3. **Unicité/concurrence des sessions** : choisir les ressources exclusives (poste, caissier, appareil ou combinaison), l’étendue des incompatibilités et les effets d’un conflit sur sessions, mouvements et encaissements.
4. **Confirmation de `FIN-LOT5-001`** : aucune confirmation explicite n’étant visible, obtenir le statut propriétaire avant d’en faire une règle normative. Clarifier également ce qui constitue une clôture locale « complète ».
5. **Fonds initiaux et transmissions** : fixer les rôles de garde, réception, réserves, refus, remises partielles et relations avec sessions/postes; établir si transmission et mouvements sont un seul fait ou des faits reliés.
6. **Interface Lot 4** : fixer la référence à l’encaissement et son inclusion unique au solde théorique; distinguer moyen de paiement, confirmation financière et présence physique.
7. **Interface Lot 6** : établir, sans redéfinir le lot, quelles opérations affectent physiquement une session et comment les événements de remboursement/annulation historiques sont traités.
8. **Clôture, comptage et rapprochement** : décider du nombre de clôtures/comptages, des recomptages, de l’en-tête éventuel, de l’instantané canonique des montants et du lien des justifications.
9. **Corrections et événements tardifs** : fixer les traitements permis après clôture et leur effet sans réécriture historique; séparer état métier et résultat de sync du Lot 8.
10. **Responsabilités/permissions** : déterminer qui ouvre, clôture, compte, constate, justifie, contrôle et autorise une correction, et dans quels cas une séparation ou double validation s’impose.
11. **Identité appareil** : préciser la correspondance éventuelle entre appareil métier de caisse, appareil Lot 8 et installation, sans modifier les relations gelées de VAL-014.
12. **Cycle du rapprochement** : définir les transitions, critères de résolution, rapprochements successifs, contestation, escalade et éventuelle correction financière propriétaire.

## 8. Risques de chevauchement avec les autres lots

| Lot propriétaire | Risque de chevauchement | Frontière à préserver |
|---|---|---|
| Lot 4 — encaissements, affectations, crédits et Mobile Money | Répliquer l’encaissement comme mouvement d’entrée, traiter une affectation/crédit comme espèces, ou faire gérer à la caisse la confirmation d’un paiement Mobile Money. | Lot 5 consomme les faits du Lot 4 et référence l’encaissement physique une seule fois; il ne crée ni ne confirme un paiement. Les modèles propriétaires détaillés et leurs relations restent introuvables dans les documents consultés. |
| Lot 6 — annulations, contrepassations, remboursements, crédits et restitutions | Créer un mouvement inverse autonome qui ferait double emploi avec un remboursement propriétaire; déduire l’incidence de caisse de la seule annulation financière. | Préserver le Lot 6 V1.0 gelé et FIN-LOT6-015 : le remboursement espèces est uniquement `REMBOURSEMENT_FONDS`, sans doublon dans `MOUVEMENT_CAISSE`. Le Lot 5 documente seulement l’interface de caisse. Les mentions locales « provisoire » sont une divergence documentaire, pas une remise en cause du gel. |
| Lot 7 — soldes, impayés et relevés | Déduire ou modifier un RAP, un crédit ou une situation financière depuis le rapprochement de caisse. | VAL-013 et `FIN-LOT7-001` à `028` sont gelés. Le Lot 5 fournit des faits opérationnels; il ne redéfinit pas les projections financières ni l’effet d’un remboursement sur celles-ci. |
| Lot 8 — transport et synchronisation | Réutiliser ses statuts comme statuts métier de caisse, fusionner des sessions concurrentes, supposer l’atomicité d’une opération ou réécrire un événement après arbitrage. | VAL-014 reste gelé. Le Lot 8 porte identité, transport, idempotence, dépendances et arbitrages historisés; le Lot 5 doit fournir son unité atomique et ses règles métier propres, actuellement ouvertes. |
| Transversal — rôles et identité | Créer un compte ou une permission autonome de caissier, ou confondre acteur métier et utilisateur d’une opération de sync. | Réutiliser le référentiel d’identité/permissions existant; préciser le rôle métier sans créer de mécanisme de sécurité indépendant. Le Lot 8 distingue déjà les identités et garde l’autorisation selon son modèle gelé. |

## 9. Recommandations de correction

Ces recommandations portent sur les documents et arbitrages préalables; elles n’ajoutent pas de règles métier.

1. Maintenir le document 12 au statut de proposition jusqu’à une trace officielle; ne pas étiqueter `FIN-LOT5-001` comme validée sans confirmation explicite dans l’historique de validation.
2. Planifier l’harmonisation des mentions locales du Lot 6 avec son statut officiel V1.0 gelé, sans modifier les décisions propriétaires ni l’historique officiel.
3. Faire établir une matrice d’interfaces Lot 4/5/6/7/8 qui nomme, pour chaque fait de caisse, le propriétaire, la source canonique, l’événement de référence, l’effet physique et la règle empêchant le double comptage.
4. Faire arbitrer en premier les sessions concurrentes, la garde des fonds et les transmissions, puis la relation encaissement/session, le calcul arrêté à la clôture et l’articulation clôture/comptage/rapprochement.
5. Décrire le comptage comme un processus seulement si les besoins de recomptage l’exigent; sinon, documenter pourquoi les lignes sont directement rattachées à la clôture. Ne pas ajouter automatiquement `COMPTAGE_CAISSE`.
6. Dans les futurs documents d’intégration, citer explicitement FIN-LOT6-015 comme règle Lot 6 validée et gelée; décrire uniquement son interface avec la caisse, sans la reformuler ni en changer la portée.
7. Garder séparés état opérationnel de session, faits financiers, statut de réception/traitement/acquittement Lot 8 et résultat du rapprochement; définir leurs liens sans recopier les cycles gelés du Lot 8.
8. Produire le dictionnaire et les relations/cardinalités à partir des arbitrages et sources propriétaires vérifiées, en distinguant explicitement les cardinalités normatives des simples associations candidates.
9. Une fois les points bloquants documentés, soumettre un MCD du Lot 5 à validation dédiée et enregistrer le résultat dans l’historique; ne pas inférer qu’une validation du MCD global ou d’un autre lot gèle ce lot.

## 10. Verdict final sur la maturité et blocages avant MCD

### Maturité

**Niveau : conception fonctionnelle intermédiaire — maturité insuffisante pour un MCD complet.**

Le périmètre et plusieurs invariants de prudence sont formulés; l’inventaire des neuf entités permet de commencer une revue conceptuelle. Cependant, aucune des neuf n’a ici un dictionnaire définitif, leurs relations et cardinalités ne sont pas établies, plusieurs attributs et états sont explicitement candidats, et les règles de concurrence, transmission, clôture et rapprochement demeurent ouvertes. La validation du MCD global sous VAL-016 accepte une réserve documentaire sur les modèles sources financiers des Lots 1 à 5; elle ne remplace pas les sources manquantes et ne valide pas le MLD.

### Points qui empêchent encore un MCD complet

- Absence des modèles sources détaillés vérifiables des Lots 1 à 5 et de leurs cardinalités propriétaires, en particulier pour `ENCAISSEMENT` ↔ session/mouvement et pour les faits de caisse historiques.
- Aucune confirmation explicite trouvée pour `FIN-LOT5-001`; aucune règle FIN-LOT5 proposée ne peut être prise pour gelée sur la foi du document 12 seul.
- Divergence documentaire locale sur le statut du Lot 6, officiellement gelé V1.0, et intégration encore incomplète de FIN-LOT6-015 / `REMBOURSEMENT_FONDS` dans les relations de caisse. La décision propriétaire est établie et n’est pas un blocage d’arbitrage.
- Unicité des sessions et arbitrage des sessions concurrentes non décidés.
- Modèle de garde, provenance et transfert des fonds initiaux non décidé; risque de double comptage entre transmission et mouvement.
- Source canonique et borne temporelle du solde théorique non fixées; articulation des encaissements espèces et remboursements à préciser pour garantir une seule incidence physique.
- Cardinalités et structure de comptage, clôture, rapprochement et justifications non déterminées; recouvrement des valeurs théoriques/physiques/écart entre clôture et rapprochement non résolu.
- Correspondance entre `APPAREIL` et le modèle Lot 8 non définie, à résoudre en préservant VAL-014.
- Traitement métier des opérations tardives, incomplètes ou reçues après clôture non arbitré dans le respect des règles de synchronisation gelées.

**Conclusion :** ne pas produire le MCD définitif avant résolution ou acceptation formelle et traçable de ces réserves. Aucune décision des Lots 4, 6, 7 ou 8 n’est modifiée par le présent audit.

## 11. Fichiers consultés et créé

### Fichiers consultés

- `docs/12-conception-fonctionnelle-lot5-v0.1.md` — document audité.
- `docs/00-perimetre-et-principes.md` — contexte global et principes Offline-First.
- `docs/01-mcd-global.md` — concepts globaux et limites de consolidation.
- `docs/02-dictionnaire-des-entites.md` — inventaire d’entités historiques et descriptif.
- `docs/03-relations-et-cardinalites.md` — relations connues et limites des cardinalités financières.
- `docs/04-regles-metier.md` — principes financiers, orientations Lot 6, règles gelées des Lots 7 et 8.
- `docs/05-cycles-de-vie-et-statuts.md` — statuts financiers et états gelés du Lot 8.
- `docs/06-decisions-et-points-ouverts.md` — état des validations, réserve VAL-016 et points ouverts du Lot 6.
- `docs/07-historique-des-validations.md` — références VAL consultables et vérification de l’absence de confirmation Lot 5; les statuts historiques Lot 6 divergents sont signalés comme écart documentaire.
- `docs/08-mcd-consolide-lot8.md` — MCD gelé VAL-014, synchronisation et frontières de propriété.
- `docs/10-verification-sources-financieres-lots-1-a-5.md` — état des sources financières du dépôt.
- `docs/11-mld-global.md` — mapping logique partiel et incertitudes financières déjà signalées.

### Fichier créé

- `docs/13-audit-conception-lot5-v0.1.md` — présent rapport.

Le fichier source `docs/12-conception-fonctionnelle-lot5-v0.1.md` et tous les autres documents existants n’ont pas été modifiés. Aucun SQL, migration, code ou MCD définitif n’a été produit.
