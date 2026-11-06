# 14 — Synthèse des arbitrages préalables au MCD du Lot 5

**Projet :** ERP scolaire SaaS Offline-First  
**Version :** V0.2  
**Date :** 2026-11-04  
**Sources principales :** `12-conception-fonctionnelle-lot5-v0.1.md`, `13-audit-conception-lot5-v0.1.md` et références de validation disponibles  
**Statut :** synthèse de travail; aucune nouvelle règle métier n’est déclarée validée

## 1. Statut exact du Lot 5

Le dossier fonctionnel Lot 5 disponible est une **proposition V0.1, non validée et non gelée**. Il couvre les six sous-blocs et propose neuf entités, mais indique lui-même que `FIN-LOT5-001` reste à confirmer officiellement, que les autres règles sont proposées, et que le dictionnaire, les relations, les cardinalités et le MCD restent à établir.

Le Lot 5 peut donc poursuivre sa conception, mais ses règles de travail ne doivent pas être présentées comme des décisions propriétaires validées. L’absence de confirmation de `FIN-LOT5-001` demeure explicitement un point à résoudre.

Le MCD global V1.0 est validé sous VAL-016 avec une réserve documentaire explicite sur les modèles sources financiers des Lots 1 à 5. Cette validation n’établit pas les cardinalités manquantes du Lot 5 et ne valide pas le MLD global, qui reste proposé et en attente de validation formelle.

## 2. Corrections apportées au rapport d’audit

Le rapport `13-audit-conception-lot5-v0.1.md` a été corrigé sur les statuts du Lot 6 :

- Le Lot 6 est désormais décrit conformément à la décision du propriétaire : **MCD V1.0 officiellement gelé** et non réouvrable dans le cadre de l’audit Lot 5.
- La divergence des fichiers locaux qui le présentent encore comme provisoire/non gelé est qualifiée de **divergence documentaire**, et non de contestation de la validation officielle.
- `FIN-LOT6-015` et `REMBOURSEMENT_FONDS` sont traités comme une règle propriétaire établie : un remboursement physique en espèces est matérialisé exclusivement par `REMBOURSEMENT_FONDS`, sans duplication dans `MOUVEMENT_CAISSE`.
- Le point restant concerne l’intégration locale de cette règle aux relations et au calcul de caisse. Il ne s’agit ni de retrouver une preuve de décision, ni de redécider la règle.
- Le constat sur `FIN-LOT5-001` est conservé : aucune confirmation officielle n’est établie à ce stade.

Les documents 12, 06, 07, 11 et l’historique officiel n’ont pas été modifiés. Les mentions locales incohérentes restent signalées pour une harmonisation documentaire ultérieure selon le processus de gouvernance applicable.

## 3. Décisions propriétaires à préserver

Les décisions ci-dessous sont des contraintes de conception déjà établies. Les recommandations plus loin ne les modifient pas.

| Référence / périmètre | Décision établie à préserver | Conséquence pour le Lot 5 |
|---|---|---|
| Lot 4 — règles validées et gelées | Le Lot 4 reste propriétaire des encaissements, affectations, mouvements de crédit, déclarations Mobile Money, moyens de paiement et vérification financière. Les sources détaillées et les cardinalités ne sont pas toutes présentes dans le dépôt; VAL-016 conserve cette réserve documentaire pour les lots 1 à 5. | Le Lot 5 consomme/référence les faits propriétaires et ne crée pas un second encaissement, ne redéfinit pas une affectation ni la validation d’un paiement. Le lien exact à la session reste à arbitrer/documenter. |
| Lot 6 — MCD V1.0 gelé | FIN-LOT6-015 : le remboursement physique en espèces est matérialisé exclusivement par `REMBOURSEMENT_FONDS`, sans duplication comme sortie indépendante dans `MOUVEMENT_CAISSE`. Les autres décisions gelées du Lot 6 restent inchangées. | Référencer l’opération propriétaire selon l’interface validée. Ne pas ajouter un mouvement de caisse doublon ni redéfinir le remboursement. Les mentions locales « provisoire » sont à harmoniser séparément. |
| Lot 7 — VAL-013 | MCD V1.0 gelé sous VAL-013; invariants `FIN-LOT7-001` à `FIN-LOT7-028` préservés. Les résultats financiers restent de la propriété du Lot 7. | Le rapprochement de caisse ne remplace ni ne recalcule les soldes, RAP, impayés ou crédits du Lot 7. |
| Lot 8 — VAL-014 | MCD V1.0 gelé sous VAL-014; identité immuable des événements, idempotence, conservation des conflits, séparation réception/traitement/acquittement et arbitrage conforme au domaine propriétaire. | Le Lot 5 doit distinguer activité de session et traitement de synchronisation. Il doit déclarer ses règles métier/atomicité sans modifier les concepts ou cycles gelés de VAL-014. |
| Domaine pédagogique — VAL-015 | MCD V1.0 gelé sous VAL-015. | Aucun lien métier ou processus pédagogique n’est ajouté au périmètre caisse. |
| MCD global — VAL-016 | MCD V1.0 validé avec réserve documentaire explicite pour les modèles sources financiers 1 à 5. Cette validation ne valide pas le MLD. | Les liens financiers insuffisamment documentés ne sont pas complétés par déduction. |
| MLD global — VAL-011 | Le MLD global reste une proposition en attente de validation formelle. | Aucune intégration de travail ne devient une cardinalité ou un attribut propriétaire validé par sa seule présence dans le MLD. |

## 4. Arbitrages regroupés et priorités

Les priorités indiquent l’ordre recommandé pour débloquer le MCD : **P0** empêche de fixer le périmètre relationnel ou le sens des montants; **P1** est nécessaire pour établir les responsabilités, identités et cycles; **P2** précise le contrôle et les détails de comptage. Ce classement n’est pas une validation de règle.

### ARB-01 — Exclusivité des sessions et concurrence Offline-First

**Priorité : P0 — décision métier requise.**

- **Problème :** les documents ne définissent pas si l’incompatibilité d’une session active est évaluée par poste, par caissier, par appareil ou par une combinaison. Plusieurs appareils hors ligne peuvent ouvrir des sessions que chacun ignore; `FIN-LOT5-001` sur la réouverture locale après clôture n’est pas officiellement confirmé.
- **Décisions établies à respecter :** Lot 8 conserve les événements, détecte les conflits et ne fusionne pas silencieusement; il ne choisit pas la règle métier gagnante. La règle Lot 5 doit donc préciser la contrainte métier sans modifier VAL-014. `FIN-LOT5-001` reste à confirmer.
- **Options réellement possibles :** (a) une seule session active par poste; (b) une seule session active par caissier; (c) une seule session active par appareil; (d) plusieurs contraintes conjointes; (e) autoriser certaines concurrences avec rattachement explicite. Pour les collisions hors ligne : rejeter une ouverture avant activité lorsque la collision est connue, ou conserver les deux sessions puis soumettre le cas à arbitrage métier central. Ces choix peuvent être combinés si leur portée est explicitée.
- **Conséquences sur les entités :** `SESSION_CAISSE` reste centrale. Une entité de conflit métier propre à la caisse ne doit être envisagée que si le conflit opérationnel a un cycle distinct des conflits de synchronisation déjà détenus par Lot 8.
- **Conséquences sur les relations/cardinalités :** fixe les contraintes d’unicité actives et les multiplicités temporelles entre session, poste, caissier et appareil. Tant que le critère n’est pas décidé, aucune cardinalité d’exclusivité ne peut être écrite.
- **Risques Offline-First :** une contrainte centrale ne peut pas être garantie localement entre appareils non connectés; un conflit découvert après encaissement ne peut pas effacer automatiquement les opérations financières propriétaires ni transférer leur rattachement.
- **Recommandation architecturale (non validée) :** distinguer explicitement contrôle local de cohérence et décision centrale de conflit; conserver les sessions et événements par identité immuable, et éviter toute fusion ou réattribution silencieuse. Faire préciser au propriétaire quels axes d’exclusivité ont une portée métier réelle.
- **Décision métier impérative :** ressources exclusives, exceptions, portée de `FIN-LOT5-001`, et traitement métier des opérations lorsqu’une session concurrente est déclarée incompatible.

### ARB-02 — Fonds initiaux, garde et transmission physique

**Priorité : P0 — décision métier requise.**

- **Problème :** le fonds initial peut venir d’un poste, d’un responsable, d’un autre caissier ou d’une transmission. Le document distingue envoi et réception, mais ne fixe pas qui détient les fonds ni quand ils deviennent disponibles pour la session. `TRANSMISSION_FONDS` et `MOUVEMENT_CAISSE` pourraient représenter deux fois le même transfert.
- **Décisions établies à respecter :** le montant initial doit représenter l’argent réellement confié et le solde final précédent n’est pas automatiquement repris, selon la proposition Lot 5; aucune de ces règles n’est à considérer gelée avant validation du Lot 5. Les opérations financières restent immuables et traçables selon les principes généraux.
- **Options réellement possibles :** (a) la transmission est le fait physique propriétaire, et l’effet de caisse est dérivé de sa réception confirmée; (b) la transmission est un dossier d’accord/remise qui référence des mouvements physiques séparés; (c) un transfert entre sessions matérialise une sortie source et une entrée destination reliées à une seule transmission; (d) fonds déjà conservé au poste traité comme fonds d’ouverture, avec une provenance distincte d’une remise entre personnes. Le besoin d’accepter montants partiels, réserves ou refus doit être tranché.
- **Conséquences sur les entités :** conserver `TRANSMISSION_FONDS` si l’envoi, la réception, la réserve et la contestation ont une histoire propre. Si la transmission n’est qu’une nature de mouvement sans cycle distinct, sa séparation pourrait être redondante. Un référentiel de détenteur ne doit être créé que si les acteurs ou postes existants ne suffisent pas.
- **Conséquences sur les relations/cardinalités :** détermine les liens de la transmission au remettant, au réceptionnaire, à l’origine/destination, au poste et aux sessions source/destination; établit si une transmission peut alimenter plusieurs sessions ou si plusieurs remises composent un fonds initial.
- **Risques Offline-First :** émission et réception peuvent être saisies sur deux appareils, avec décalage de synchronisation ou réserves divergentes. Les valeurs « envoyé », « reçu » et « accepté » ne doivent pas se confondre ni produire deux effets.
- **Recommandation architecturale (non validée) :** représenter distinctement le fait de remise et l’effet de fonds sur les sessions uniquement si le besoin de réception/contestation le justifie; relier les faits par des références stables et ne comptabiliser chaque transfert qu’une fois dans le solde de chaque caisse concernée.
- **Décision métier impérative :** qui remet/reçoit/garde les fonds, moment d’effet, confirmations requises, traitement partiel/refus/réserve et rôle de la transmission vis-à-vis de `MOUVEMENT_CAISSE`.

### ARB-03 — Identité des acteurs, poste et appareils

**Priorité : P1 — arbitrage métier et vérification de référentiels.**

- **Problème :** caissier, poste physique et terminal sont utilement distingués, mais la relation au référentiel existant d’utilisateurs, à `APPAREIL_SYNCHRONISATION` et à l’installation Lot 8 n’est pas spécifiée.
- **Décisions établies à respecter :** VAL-014 possède son concept `APPAREIL_SYNCHRONISATION` et son chemin de rattachement aux installations; l’authentification/permissions et les responsabilités transversales existantes sont réutilisées. Le Lot 5 ne doit ni redéfinir ces concepts gelés ni créer un compte concurrent.
- **Options réellement possibles :** (a) `APPAREIL` de caisse est un alias fonctionnel du terminal Lot 8; (b) c’est un concept métier distinct référencé vers l’appareil Lot 8 par une correspondance; (c) aucune entité appareil métier persistante n’est nécessaire si l’identifiant de contexte Lot 8 suffit. Pour le caissier, rattacher à l’identité utilisateur existante, éventuellement avec un rôle/permission préexistant; ne pas inventer un compte local.
- **Conséquences sur les entités :** possible maintien ou retrait d’`APPAREIL` selon l’option retenue; `POSTE_CAISSE` reste une ressource physique; `SESSION_CAISSE` enregistre l’acteur responsable selon la règle à décider.
- **Conséquences sur les relations/cardinalités :** détermine si chaque session doit référencer un appareil Lot 8, un poste et un utilisateur; précise le changement de caissier/appareil pendant une session et l’historisation de ces changements.
- **Risques Offline-First :** appareils restaurés ou remplacés, révocation non reçue immédiatement, et identité d’installation distincte de l’identité métier du poste. Une session doit conserver la provenance sans cloner les identités gelées lors d’une restauration.
- **Recommandation architecturale (non validée) :** réutiliser les identités et permissions propriétaires; modéliser uniquement une association de correspondance si une différence entre terminal métier et appareil Lot 8 est démontrée. Aucun FK ou rapprochement par nom matériel ne doit être présumé.
- **Décision métier impérative :** sens exact de caissier (utilisateur ou fonction), obligation d’un poste/appareil par session, changements pendant la session et équivalence/correspondance avec l’appareil de synchronisation.

### ARB-04 — Encaissements, mouvements physiques et solde théorique

**Priorité : P0 — décision propriétaire des interfaces financières.**

- **Problème :** un encaissement espèces du Lot 4 contribue au solde physique, mais le modèle disponible ne fixe pas son lien à une session. Le Lot 5 cite à la fois entrées physiques et encaissements dans la formule, ce qui peut compter deux fois la même somme. Il faut aussi intégrer correctement le remboursement gelé Lot 6.
- **Décisions établies à respecter :** Lot 4 est propriétaire de `ENCAISSEMENT`, `AFFECTATION_REGLEMENT`, `MOUVEMENT_CREDIT` et `TRANSACTION_MOBILE_MONEY`; affectation et utilisation de crédit ne sont pas une entrée physique. Mobile Money n’est pas une entrée d’espèces. FIN-LOT6-015 : le remboursement cash est exclusivement `REMBOURSEMENT_FONDS`, jamais un doublon dans `MOUVEMENT_CAISSE`. Lot 7 reste propriétaire des calculs financiers et n’est pas redéfini par un contrôle de caisse.
- **Options réellement possibles :** (a) un encaissement espèces référence directement la session, et son incidence physique est dérivée de l’encaissement confirmé; (b) un mouvement de caisse d’entrée référence l’encaissement source, mais ne constitue pas un encaissement autonome; (c) une association événementielle relie le fait financier propriétaire à la session, sans créer de nouvelle écriture financière. Le choix entre référence directe et association dépend des cardinalités réelles et de l’historique de rattachement à obtenir auprès du propriétaire Lot 4.
- **Conséquences sur les entités :** `MOUVEMENT_CAISSE` pourrait porter seulement des entrées/sorties autonomes ou également des références aux faits externes; dans aucun cas il ne crée une seconde écriture pour un encaissement ou remboursement. Les entités Lot 4/6 restent propriétaires et inchangées.
- **Conséquences sur les relations/cardinalités :** à établir pour encaissement↔session, mouvement↔session, mouvement↔encaissement (si mouvement référentiel retenu), et remboursement↔session/clôture. Le fait qu’un encaissement appartienne à une session ne permet pas de présumer l’inverse ni les cardinalités exactes.
- **Risques Offline-First :** confirmation ou annulation financière peut être reçue après l’enregistrement local; déduplication Lot 8 garantit l’absence de double effet de transport, mais ne choisit pas l’instant auquel le fait est éligible au solde de caisse.
- **Recommandation architecturale (non validée) :** désigner une source canonique par incidence physique; garder des références aux opérations propriétaires et rendre l’inclusion dans un calcul explicitement idempotente. Mobile Money, affectations et crédits restent exclus du cash. Pour le remboursement, appliquer `REMBOURSEMENT_FONDS` sans mouvement dupliqué.
- **Décision métier impérative :** quels statuts/événements Lot 4 rendent un encaissement physiquement valide, comment il est rattaché à une session, à quelle heure de coupure il est inclus, et quel événement Lot 6 produit l’incidence physique autorisée.

### ARB-05 — Clôture, comptage, rapprochement et opérations tardives

**Priorité : P0 pour la borne de clôture; P1/P2 pour structure et cycle de contrôle.**

- **Problème :** clôture et rapprochement sont distincts mais décrivent des montants qui se recouvrent. Le détail de comptage n’a pas d’en-tête défini; le nombre de comptages et les opérations encore en traitement à la clôture sont ouverts. Une opération tardive ne doit pas changer silencieusement un snapshot historique, mais son traitement métier n’est pas choisi.
- **Décisions établies à respecter :** les opérations financières restent immuables et les corrections sont distinctes; VAL-014 ne permet ni fusion silencieuse ni réécriture d’événements par arbitrage. La règle opérationnelle Lot 5 de clôture locale immédiate et sa relation à `FIN-LOT5-001` restent proposées, cette dernière à confirmer.
- **Options réellement possibles :** (a) un seul comptage par clôture, lignes directement sous la clôture; (b) plusieurs comptages historisés, avec entité de comptage parent aux détails et règle de sélection; (c) un rapprochement référence uniquement le snapshot de clôture; ou (d) il conserve un snapshot de contrôle distinct avec origine/version explicitée. Pour une opération tardive : la placer en anomalie/en attente d’examen ou accepter un processus correctif distinct autorisé; ne pas la déplacer ni recalculer silencieusement une clôture déjà consignée.
- **Conséquences sur les entités :** déterminer si `COMPTAGE_CAISSE` est requis; fixer le rôle de `CLOTURE_CAISSE`, `DETAIL_COMPTAGE_CAISSE`, `RAPPROCHEMENT_CAISSE` et `JUSTIFICATION_ECART_CAISSE`. Un journal supplémentaire n’est justifié que si l’historique existant ne suffit pas.
- **Conséquences sur les relations/cardinalités :** nombre de clôtures par session, comptages par clôture, détails par comptage, rapprochements par clôture et justifications par rapprochement doivent être établis. Aucun 0..1, 1..1 ou 1..N ne peut être déduit du texte actuel.
- **Risques Offline-First :** un appareil peut clôturer localement alors qu’un événement dépendant est en attente de traitement ou arrive plus tard. Le serveur distingue réception, validation, attente et conflit; le Lot 5 doit définir comment ces résultats affectent la caisse sans altérer le cycle Lot 8.
- **Recommandation architecturale (non validée) :** stocker la clôture comme fait horodaté au point de coupure, conserver distinctement comptage et rapprochement si leur historique diffère, et faire référencer au rapprochement le snapshot source. Toute différence tardive devrait produire une trace/traitement séparé, jamais une mise à jour silencieuse du snapshot.
- **Décision métier impérative :** prérequis de clôture, prise en compte des opérations non terminales, possibilité de recomptage, moment de clôture, statut d’une opération tardive et nombre de rapprochements possibles.

### ARB-06 — Autorisations, écarts et corrections

**Priorité : P1 — décisions métier/contrôle nécessaires.**

- **Problème :** les rôles d’ouverture, de clôture, de comptage, de justification, de contrôle et d’approbation corrective sont distingués, mais les permissions, la séparation des tâches, les seuils et les transitions d’écart ne sont pas définis.
- **Décisions établies à respecter :** les permissions transversales et les identités existantes sont réutilisées; une justification n’est pas une correction financière; les entités financières propriétaires restent immuables et leurs corrections relèvent du lot source.
- **Options réellement possibles :** (a) une même personne peut exécuter plusieurs étapes sous journalisation; (b) séparation obligatoire entre certaines étapes pour tous les écarts; (c) séparation conditionnelle selon une catégorie ou un seuil choisi par le métier. Les statuts de rapprochement peuvent être un cycle simple (ouvert/résolu) ou un cycle plus détaillé si les responsabilités et transitions sont justifiées.
- **Conséquences sur les entités :** les faits de justification et contrôle peuvent rester des associations/événements reliés au rapprochement ou justifier des entités distinctes si leur cycle et pièces sont propres. Ne pas créer une entité « autorisation » locale si le service transversal de permissions couvre le besoin.
- **Conséquences sur les relations/cardinalités :** déterminer si un rapprochement a zéro ou plusieurs justifications, contrôles ou approbations; identifier chaque acteur via le référentiel existant. Les cardinalités suivent le cycle retenu.
- **Risques Offline-First :** les permissions peuvent être révocables alors que l’appareil est hors ligne; l’horodatage local ne prouve pas à lui seul une autorisation centrale actuelle. VAL-014 gouverne la transmission et l’arbitrage de sync, pas la politique de caisse.
- **Recommandation architecturale (non validée) :** enregistrer auteur, horodatage, motif et résultat de chaque étape réellement nécessaire; ne pas transformer une justification en mouvement de caisse ni inventer un seuil monétaire.
- **Décision métier impérative :** acteurs autorisés par étape, séparation éventuelle des tâches, seuils si le métier en souhaite, cycle de contestation/résolution et lien avec les corrections propriétaires.

### Suivi documentaire — divergence de statut du Lot 6

Ce sujet n’est **pas** un arbitrage métier et ne bloque pas la conception par incertitude sur la règle : le Lot 6 est gelé V1.0 et FIN-LOT6-015 est établi selon la référence propriétaire communiquée. En revanche, des fichiers locaux (notamment 04, 06, 07 et 11) en donnent encore une description provisoire/non gelée. Leur harmonisation est un travail documentaire ultérieur distinct, qui ne doit pas modifier l’historique officiel sans procédure autorisée. Le présent livrable ne modifie aucun de ces fichiers.

## 5. Recommandations architecturales transversales

Les éléments ci-dessous sont des recommandations d’architecture, **pas des décisions métier validées** :

1. Conserver la propriété des événements : les événements Lot 4/6 restent dans leur lot; la caisse les référence pour établir l’incidence physique au lieu de les recopier.
2. Fixer une seule source de vérité par montant physique et par transfert afin que chaque fait n’entre qu’une fois dans les totaux.
3. Séparer les identités et dimensions suivantes : utilisateur/caissier, poste physique, terminal, installation Lot 8, session opérationnelle, fait financier, état de synchronisation et résultat de rapprochement.
4. Définir une borne de clôture reproductible. Les événements ultérieurs doivent être conservés et examinés comme tels; ils ne doivent pas provoquer de recalcul historique silencieux.
5. Représenter les remises en distinguant envoi, réception et réserves si le métier exige ces étapes; déterminer séparément leur incidence source/destination.
6. N’ajouter une entité de comptage, de journal ou de conflit métier que si son cycle et son historique ne peuvent être représentés par les concepts déjà propriétaires.
7. Respecter les résultats Lot 8 : retransmission idempotente et arbitrage appliqué selon le domaine; ne pas assimiler l’accusé de réception à la validation financière ou à la clôture métier.
8. Fonder chaque cardinalité sur une source propriétaire ou un arbitrage explicite, et qualifier visiblement les relations non résolues.

## 6. Points qui empêchent encore le MCD

Le MCD ne peut pas être achevé fidèlement tant que les éléments suivants ne sont pas résolus ou documentés par le propriétaire :

- Le critère d’exclusivité des sessions et le traitement des collisions hors ligne, y compris le statut de `FIN-LOT5-001`.
- La garde du fonds initial et le rôle conceptuel de `TRANSMISSION_FONDS` face aux mouvements physiques.
- Les relations et cardinalités exactes entre `ENCAISSEMENT`, `SESSION_CAISSE` et `MOUVEMENT_CAISSE`, ainsi que l’événement de Lot 4 qui entre dans le solde.
- La manière de référencer l’incidence Lot 6 de `REMBOURSEMENT_FONDS` sans duplication et sans modifier FIN-LOT6-015.
- Le point de coupure du solde théorique, les événements en attente/annulés/contrepassés et le traitement des événements tardifs.
- Le nombre de clôtures/comptages/rapprochements, le parent des lignes de comptage, le snapshot canonique des montants et les cardinalités des justifications.
- Les acteurs/permissions des étapes de caisse et les règles de séparation ou double contrôle, si le métier les exige.
- L’identité d’`APPAREIL` métier et sa correspondance éventuelle avec l’appareil/installation Lot 8, en conservant VAL-014 intact.
- Les modèles sources financiers 1 à 5 et leurs cardinalités propriétaires manquants, dans la mesure où ils conditionnent les interfaces de caisse; la réserve VAL-016 interdit de les déduire.

La divergence documentaire locale sur le statut du Lot 6 ne remet pas en cause son gel et ne constitue pas, en elle-même, une question métier à arbitrer. Elle doit être tracée pour harmonisation ultérieure.

## 7. Conditions de soumission du MCD Lot 5 à validation

Le MCD pourra être soumis lorsque les conditions suivantes seront remplies :

1. Les arbitrages P0 de la section 4 auront reçu une réponse propriétaire explicite, ou seront formellement maintenus comme exclusions avec leurs conséquences documentées.
2. Le statut de `FIN-LOT5-001` sera confirmé ou rejeté officiellement; aucune option n’est présumée validée.
3. Les décisions gelées Lot 4/6/7/8 et VAL-015 seront référencées avec leur portée; les interfaces Lot 4/6 seront contrôlées contre les règles propriétaires, notamment FIN-LOT6-015.
4. La divergence documentaire du Lot 6 sera enregistrée comme telle et son traitement documentaire planifié sans altérer le registre officiel.
5. Chaque entité aura une responsabilité non redondante et un dictionnaire conceptuel; les entités candidates `COMPTAGE_CAISSE` ou journal ne seront ajoutées qu’avec justification.
6. Chaque relation aura une source ou une décision, des cardinalités minimales/maximales et des contraintes explicites; toute inconnue restante sera identifiée plutôt que supposée.
7. Les règles de calcul de clôture, de comptage, de rapprochement et d’opérations tardives seront cohérentes entre elles et reproductibles hors ligne/après synchronisation.
8. Les statuts métier du Lot 5 seront séparés des états de réception, traitement, acquittement et arbitrage gelés de VAL-014.
9. Le document de MCD présentera une matrice de traçabilité entre chaque concept/règle et sa source ou décision, ainsi que les risques résiduels.
10. Une validation dédiée du propriétaire sera consignée dans le mécanisme d’historique avant de qualifier le MCD Lot 5 de validé/gelé ou de valider le mapping MLD correspondant.

## 8. Fichiers consultés et créés

### Fichiers consultés

- `docs/04-regles-metier.md` — règles financières, mentions locales Lot 6, règles gelées Lots 7 et 8.
- `docs/05-cycles-de-vie-et-statuts.md` — états métier et de synchronisation disponibles.
- `docs/06-decisions-et-points-ouverts.md` — statuts, VAL-016 et divergence locale Lot 6.
- `docs/07-historique-des-validations.md` — historique consultable des validations et mention de `FIN-LOT5-001` absente.
- `docs/08-mcd-consolide-lot8.md` — MCD Lot 8 gelé sous VAL-014.
- `docs/11-mld-global.md` — proposition MLD non validée et intégration partielle des Lots 4–5.
- `docs/12-conception-fonctionnelle-lot5-v0.1.md` — conception fonctionnelle auditée, non modifiée.
- `docs/13-audit-conception-lot5-v0.1.md` — rapport d’audit corrigé dans cette tâche.

### Fichiers créés ou corrigés

- Corrigé : `docs/13-audit-conception-lot5-v0.1.md`.
- Créé : `docs/14-synthese-arbitrages-lot5-v0.2.md`.

Le document 12, les MCD gelés, le MLD global et l’historique officiel des validations n’ont pas été modifiés. Aucun MCD définitif, SQL, migration ou code n’a été produit.
