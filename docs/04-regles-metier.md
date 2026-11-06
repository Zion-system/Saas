# 04 — Règles métier

**Version :** V1.0
**Statut :** Règles globales consolidées pour le MCD V1.0; lot 7 gelé sous VAL-013; lot 8 sous VAL-014; domaine pédagogique sous VAL-015; lot 6 provisoire.

Les statuts consolidés sont : domaines 1 à 3 et lots financiers 1 à 5 validés et gelés; orientations du lot 6 provisoires avec quatre points ouverts; lot 7 gelé sous VAL-013; lot 8 gelé sous VAL-014; domaine pédagogique gelé sous VAL-015. Les règles générales financières déjà documentées ne sont pas attribuées à un lot précis. Les orientations provisoires du lot 6 et les règles gelées des lots 7, 8 et pédagogie restent séparées ci-dessous.

## 1. Principes généraux

- Les opérations métier doivent être cohérentes et traçables.
- Les données sensibles ne doivent pas être écrasées silencieusement.
- Les historiques importants doivent être conservés.
- Les corrections respectent les règles du domaine et ne doivent pas effacer l'opération initiale.
- Le fonctionnement hors ligne ne supprime pas les contrôles métier.
- L'établissement est la frontière de propriété des données métier; la V1 prévoit un établissement par déploiement, desservi par plusieurs appareils et installations locales. Une donnée est rattachée directement à l'établissement ou par un chemin propriétaire non ambigu, sans dupliquer ce lien dans chaque concept.
- Une relation entre données métier ne doit pas croiser les établissements propriétaires. Lorsqu'un modèle historique disponible ne permet pas de prouver le rattachement, le détail reste à vérifier auprès du domaine propriétaire plutôt que d'être inféré.
- Les UUID sont des identifiants techniques globaux, distincts des identifiants métier locaux. Le matricule de l'élève est unique et non réattribuable dans son établissement; aucune autre portée locale n'est inventée.
- Pour la synchronisation, l'établissement est contrôlé selon les rattachements et le contexte d'autorisation gelés sous VAL-014; aucun événement inter-établissements n'est accepté.

## 2. Domaine 1 — Organisation scolaire

### Années scolaires

- Une seule année scolaire peut être officiellement ouverte à la fois dans l'établissement.
- Une année clôturée ne doit pas être modifiée librement; sa clôture est contrôlée et auditée.
- Une année clôturée peut ensuite être archivée.

### Périodes pédagogiques

- Les périodes appartiennent à une organisation annuelle et leur calendrier doit être cohérent.
- Les corrections de calendrier sont contrôlées.
- Le chevauchement des périodes n'est pas autorisé dans la V1.

### Classes et progression

- Le modèle de classe est distinct de la classe annuelle; une classe annuelle est rattachée à une année scolaire.
- Les capacités d'accueil sont prises en compte.
- L'historique des changements de classe est conservé.
- Les décisions de progression sont individualisées, non automatiques pour tous les élèves, conservées et traçables.

## 3. Domaine 2 — Gestion des élèves

- Le dossier permanent est distinct de l'inscription annuelle.
- Le matricule est unique à l'échelle de l'établissement et ne peut jamais être réattribué.
- Un élève peut avoir plusieurs responsables.
- Les responsabilités légales et les relations familiales ne sont pas confondues.
- Aucun rapprochement automatique de deux dossiers d'élèves n'est effectué.
- Les changements concernant les responsables sont historisés.
- Les dossiers opérationnels ne sont pas supprimés physiquement sans procédure explicite.

## 4. Domaine 3 — Inscriptions et parcours

- Une candidature ne devient un dossier permanent d'élève qu'après admission.
- Une préinscription concerne un candidat ou un élève déjà connu, jamais les deux simultanément.
- Une inscription confirmée concerne un seul élève et une seule année scolaire; un élève ne peut avoir plusieurs inscriptions confirmées pour la même année.
- Une inscription annulée est conservée.
- L'inscription directe peut être autorisée selon la configuration de l'établissement.
- Une réinscription nécessite une inscription antérieure confirmée.
- L'affectation à une classe peut être différée; les changements de classe sont historisés.
- La capacité des classes est contrôlée.

## 5. Domaine 4 — Principes financiers documentés

### Opérations et montants

- Les montants sont exprimés en francs CFA (FCFA).
- Les événements financiers sont immuables.
- Une correction est une opération distincte, avec motif et traçabilité.
- Dette/créance, paiement et affectation de paiement sont des notions distinctes dans les règles; l'équivalence terminologique entre « dette » et l'entité « créance » reste à confirmer.
- Un crédit n'est pas affecté automatiquement sans règle explicite.

### Paiements hors ligne

- Les paiements peuvent être enregistrés hors connexion.
- Une déclaration de paiement Mobile Money faite hors ligne ne constitue pas une vérification auprès du fournisseur.
- Les paiements nécessitant une vérification peuvent rester en attente.
- Les références Mobile Money saisies hors ligne restent des déclarations jusqu'à vérification.

### Corrections et caisse

- Une annulation ne supprime pas l'événement financier initial.
- Un remboursement constitue une opération distincte.
- Les opérations correctives conservent leur motif et leur traçabilité.
- Les opérations de caisse sont historisées.
- Une session de caisse est distincte des mouvements physiques d'argent.
- Les données contradictoires provenant de plusieurs appareils ne sont pas fusionnées silencieusement.

## 6. Synchronisation

- Chaque appareil possède ses propres données locales, modifiables hors connexion.
- La synchronisation intervient au retour de la connexion.
- Les conflits sensibles sont conservés et leur résolution nécessite une intervention autorisée.
- Le serveur vérifie l'intégrité des données reçues.

## 7. Lot financier 6 — orientations provisoirement acceptées

Ces orientations font partie de la conception V0.9.1 du lot 6. Elles sont provisoirement acceptées, mais ne sont pas des règles définitivement gelées.

### Annulations et corrections

- L'annulation d'un encaissement est une opération orchestrée et bloquante.
- Annulation, contrepassation et remboursement sont trois opérations distinctes; elles ne sont pas synonymes.
- L'historique financier initial est préservé et toute correction est traçable.

### Crédits

- Le crédit brut, le crédit réservé et le crédit net sont des valeurs calculées, non des montants indépendants modifiables.
- Les crédits ne sont pas automatiquement affectés aux échéances.

### Réservations

- Le concept à utiliser est `RESERVATION_CREDIT`.
- Une réservation référence directement le mouvement positif source via `id_mouvement_credit_source`; elle ne référence pas une entité `CREDIT_DISPONIBLE`.
- Une réservation locale peut être provisoire; son arbitrage central doit être pris en compte dans le fonctionnement Offline-First.
- Une réservation ne diminue pas le crédit brut.

### Avoirs

- Un avoir préserve l'historique financier.
- Il peut produire un crédit distinct par l'opération `CREATION_AVOIR`.
- Cette opération ne modifie pas rétroactivement l'historique de l'opération d'origine.

### Restitutions

- Les mandats de restitution conservent la granularité de provenance des fonds.
- La traçabilité de la source des fonds est préservée; les détails sur le payeur et la provenance sont consignés comme ouverts dans `06-decisions-et-points-ouverts.md`.

Les quatre points ouverts propres au lot 6 sont conservés sans solution proposée. Le lot 7 est gelé sous VAL-013; le lot 8 est gelé sous VAL-014. Leurs règles sont décrites ci-dessous sans rouvrir leurs décisions.

## 8. Domaine 4 — Lot 7 : règles gelées sous VAL-013

**Statut : MCD V1.0 gelé le 2026-11-04.** Les décisions de cette section sont gelées et ne doivent pas être modifiées sans demande explicite. Elles ne modifient pas les domaines 1 à 3, les lots 1 à 5 ou le statut provisoire du lot 6.

### Individualisation et relances

- Chaque élève conserve sa situation financière propre; les dettes ne sont pas fusionnées, les crédits ne sont pas mutualisés automatiquement et aucun compte familial partagé n'est créé en V1.0.
- Un responsable ne consulte que les situations des élèves pour lesquels il dispose des autorisations nécessaires. Le lien familial ou légal seul n'accorde aucun accès financier.
- Une relance peut concerner un élève et avoir plusieurs destinataires autorisés. Les destinataires sont déterminés par les responsabilités financières actives du domaine 2 et les autorisations applicables.
- Chaque destinataire a son propre historique de transmission; les coordonnées utilisées lors de l'envoi sont conservées comme référence historique.
- Une relance ne modifie aucune donnée comptable. Ses lignes conservent les montants de référence.
- En l'absence d'un service transversal qui fournit déjà un journal durable/interrogeable, la proposition utilise `TENTATIVE_TRANSMISSION_RELANCE` comme journal enfant : chaque occurrence a un identifiant, une référence de relance et de destinataire, date/heure, canal, résultat, motif d'échec éventuel et contact effectivement utilisé. Une reprise ne réécrit pas une tentative antérieure.
- Avant toute tentative, la situation doit être revalidée depuis le dernier état central confirmé; un état local provisoire ou périmé ne suffit pas à affirmer une dette centrale. Si toutes les lignes sont réglées, annulées ou remplacées, aucune nouvelle tentative ne part; l'historique déjà créé reste inchangé.
- Si certaines lignes seulement sont réglées, annulées ou remplacées depuis la création, l'ancienne relance et ses montants restent intacts et ne sont pas renvoyés avec un total périmé. Une nouvelle relance est créée avec les seules lignes encore dues et leurs montants recalculés. L'ancienne relance reste consultable.

### Calculs, crédits et échéances

- Le lot 7 consomme les effets des entités antérieures `CREANCE`, `PLAN_REGLEMENT_CREANCE`, `ECHEANCE_CREANCE`, `ENCAISSEMENT`, `AFFECTATION_REGLEMENT` et `MOUVEMENT_CREDIT`; il ne redéfinit pas leurs mécanismes. Les détails et cardinalités historiques de ces entités ne sont pas dans les sources consultées.
- Distinguer encaissement, affectation, montant encaissé non affecté, crédit constitué, réservation de crédit et reste à payer (RAP). Un encaissement non affecté, y compris partiellement affecté, reste séparé des affectations et ne devient pas automatiquement un crédit.
- Le RAP courant est calculé par `ECHEANCE_CREANCE` active : `RAP = Montant dû ajusté - Affectations nettes actives`. Pour une créance ventilée en échéances, le lot 7 calcule les échéances et ne cumule pas en plus le montant parent de `CREANCE`.
- Pour une `CREANCE` ayant un `PLAN_REGLEMENT_CREANCE`, la situation agrégée est la somme des RAP de ses `ECHEANCE_CREANCE` actives; le montant total de la créance n'est jamais ajouté une seconde fois. Pour une créance sans échéancier, le RAP est calculé au niveau de `CREANCE` avec son montant dû ajusté et les affectations nettes actives qui la ciblent. Ces deux modes sont exclusifs pour une même part de dette.
- Le montant dû ajusté consomme les effets des corrections valides de la créance; les affectations nettes actives excluent les affectations contrepassées et les encaissements annulés. L'effet d'un remboursement sur les affectations et le RAP dépend de sa nature dans les entités sources; le lot 7 ne le déduit pas du seul fait qu'un remboursement existe.
- Les effets d'une contrepassation, annulation, restitution ou remboursement déjà représentés par les événements sources ne sont jamais appliqués une seconde fois dans le calcul du lot 7. Un avoir ou crédit reste distinct et ne réduit pas le RAP sans affectation explicite; aucune compensation n'est automatique.
- Une même opération source ne contribue qu'une fois au calcul. L'idempotence de synchronisation et la résolution centrale de doublons relèvent du lot 8, pas du lot 7.
- Un RAP négatif est une anomalie de cohérence : il n'est pas ramené silencieusement à zéro.
- Distinguer crédit brut, crédit réservé et crédit net. Le crédit net correspond au crédit brut diminué des réservations centrales actives; les réservations locales provisoires ne sont pas assimilées aux réservations centrales. Le calcul conserve la granularité par `MOUVEMENT_CREDIT` définie au lot 6.
- Aucun crédit n'est automatiquement affecté ou compensé avec une échéance/dette. Présenter séparément RAP, crédit brut, crédit réservé, crédit net et montants encaissés non affectés. Aucun solde net global dette/crédit n'est un indicateur officiel V1.0.
- Les calculs respectent la granularité des mouvements sources définie par le lot 6 et évitent tout double comptage.
- `ECHEANCE_CREANCE` annulée ou remplacée est exclue du RAP et de la balance âgée courants, mais reste consultable dans l'historique. La date d'exigibilité initiale reste celle du calendrier d'origine; la date applicable provient du calendrier actif de `PLAN_REGLEMENT_CREANCE`. Un nouveau calendrier ne devient actif qu'après validation du réaménagement. La date de validation est celle de l'événement source et n'est pas dupliquée par le lot 7.
- L'échéance distingue ses caractéristiques administratives de sa situation financière calculée. Les situations calculées peuvent être À venir, À régler, Partiellement réglée, Réglée ou En retard. « Annulée » relève du cycle administratif, pas d'un état financier.
- Une échéance partiellement réglée conserve son ancienneté. La cible de calcul est l'échéance active, sans remettre son âge à zéro par un paiement partiel.

### Balance âgée

- La balance âgée est calculée à une date de référence; la date du jour est utilisée par défaut et le fuseau de référence est `Africa/Brazzaville`.
- Elle ne porte que sur les échéances actives ayant un RAP positif. La tolérance est un paramètre versionné de `PARAMETRAGE_BALANCE_AGEE`, exprimé en jours calendaires; à défaut de valeur configurée, elle vaut zéro. Elle ne modifie ni la date d'exigibilité ni le RAP.
- L'âge est calculé dans `Africa/Brazzaville` à partir du premier jour suivant la date d'exigibilité applicable augmentée de la tolérance. Une échéance non échue après tolérance n'entre pas dans les tranches.
- Les tranches configurables sont des intervalles entiers contigus [borne basse incluse, borne haute exclue]; la dernière tranche est ouverte. Les exemples 1–30, 31–60, 61–90 et plus de 90 jours correspondent à [1,31), [31,61), [61,91) et [91,+∞); les seuils restent configurables.
- Le paramétrage est versionné. Un document généré conserve la date de référence, la version du paramétrage et les valeurs de référence nécessaires à la reproductibilité.

### Relevés et documents générés

- Distinguer les calculs dynamiques, les consultations à l'écran et les documents effectivement générés et conservés.
- Un relevé n'est pas une écriture comptable; un document généré n'est jamais une source comptable. Les synthèses distinguent encaissements et affectations.
- Un document conservé garde son contenu de référence et peut être identifié par un identifiant, un type, l'élève concerné si applicable, la date de génération, la date de référence, l'auteur, l'année scolaire et, si nécessaire, la version de présentation.
- Aucun service documentaire transversal n'est documenté ou repéré dans `src/`. Le service existant doit être réutilisé s'il est retrouvé; aucun système documentaire financier séparé n'est décidé par cette proposition.
- Un identifiant de tentative et son journal assurent la traçabilité, mais ne garantissent pas à eux seuls l'unicité de livraison chez un canal externe; la déduplication d'envoi dépend du service/canal, à confirmer. L'idempotence de synchronisation elle-même reste au lot 8.
- Une situation courante est calculée depuis les événements connus maintenant. Une situation historique connue à une date et un recalcul actuel pour cette date intégrant des événements reçus plus tard sont deux résultats distincts. Un document déjà généré conserve son contenu; une modification ultérieure des sources ne le réécrit pas.

### Historique et Offline-First

- Lorsqu'elles s'appliquent aux événements sources, distinguer `date_effet`, `date_enregistrement`, `date_reception_centrale` et `date_validation`. Le lot 7 ne duplique pas ces dates si elles appartiennent déjà à l'entité source.
- Distinguer la situation connue à la date considérée de la situation recalculée aujourd'hui pour cette date en intégrant les événements ultérieurs connus aujourd'hui. Les résultats ne sont pas confondus.
- Chaque appareil calcule une situation depuis les événements présents localement; une situation locale n'est pas une situation centrale confirmée. Les opérations non synchronisées sont identifiables.
- Les conflits financiers ne sont jamais écrasés silencieusement. Le serveur recalcule les situations depuis les événements reçus et validés; un solde local calculé n'est pas une vérité comptable centrale.
- `LOCAL_PROVISOIRE`, `EN_ATTENTE_SYNCHRONISATION`, `CENTRAL_CONFIRME` et `CONFLIT` sont des états conceptuels à confronter à la synchronisation, pas des statuts persistés ajoutés par cette proposition.
- Une réservation concurrente de crédit demeure sous la responsabilité du lot 6; l'idempotence générale de synchronisation et l'arbitrage central des événements concurrents relèvent du lot 8. Le lot 7 consomme les états calculés et validés, sans déplacer ces responsabilités.

### Invariants FIN-LOT7

| Référence    | Invariant gelé                                                                       |
| ------------ | ------------------------------------------------------------------------------------ |
| FIN-LOT7-001 | Le RAP est calculé à partir du montant dû ajusté et des affectations nettes actives. |
| FIN-LOT7-002 | Le RAP ne peut pas être négatif.                                                     |
| FIN-LOT7-003 | Une affectation contrepassée ne couvre plus une échéance.                            |
| FIN-LOT7-004 | Un encaissement annulé n'est pas considéré comme un paiement valide.                 |
| FIN-LOT7-005 | Aucun crédit n'est automatiquement affecté à une échéance.                           |
| FIN-LOT7-006 | Le crédit net tient compte des réservations centrales actives.                       |
| FIN-LOT7-007 | Une réservation locale provisoire n'est pas assimilée à une réservation centrale.    |
| FIN-LOT7-008 | Les montants encaissés non affectés sont présentés séparément des crédits.           |
| FIN-LOT7-009 | Une même opération financière ne peut pas être comptabilisée deux fois.              |
| FIN-LOT7-010 | Une échéance partiellement réglée conserve son ancienneté.                           |
| FIN-LOT7-011 | La balance âgée est calculée à une date de référence.                                |
| FIN-LOT7-012 | Les échéances réaménagées utilisent leur calendrier actif.                           |
| FIN-LOT7-013 | Les anciens échéanciers restent consultables.                                        |
| FIN-LOT7-014 | Une relance ne modifie aucune donnée comptable.                                      |
| FIN-LOT7-015 | Les lignes de relance conservent les montants de référence.                          |
| FIN-LOT7-016 | Les situations locales sont identifiées comme provisoires.                           |
| FIN-LOT7-017 | Les situations centrales sont recalculées depuis les événements validés.             |
| FIN-LOT7-018 | Un relevé n'est pas une écriture comptable.                                          |
| FIN-LOT7-019 | Les synthèses distinguent encaissements et affectations.                             |
| FIN-LOT7-020 | Les corrections financières historiques restent traçables.                           |
| FIN-LOT7-021 | Chaque élève possède une situation financière individualisée.                        |
| FIN-LOT7-022 | La consultation par un responsable respecte ses autorisations.                       |
| FIN-LOT7-023 | Une relance peut avoir plusieurs destinataires autorisés.                            |
| FIN-LOT7-024 | Chaque destinataire possède son propre historique de transmission.                   |
| FIN-LOT7-025 | Les documents générés conservent leur contenu de référence.                          |
| FIN-LOT7-026 | Les tranches de balance âgée sont configurables et historisées.                      |
| FIN-LOT7-027 | Les situations historiques distinguent connaissance à date et recalcul rétrospectif. |
| FIN-LOT7-028 | Les indicateurs financiers ne provoquent aucune compensation automatique.            |

Les 28 invariants FIN-LOT7 sont gelés avec le MCD V1.0 du lot 7 au 2026-11-04. Leur signification ne doit pas être modifiée sans demande explicite. Les règles détaillées des lots 1 à 5 restent propriétaires de ces lots et ne sont ni modifiées ni reconstituées ici.

## 9. Domaine 4 — Lot 8 : règles gelées sous VAL-014

**Statut :** Les règles métier RM-SYNC-01 à RM-SYNC-38 ci-dessous sont reproduites à l'identique depuis la section 6 de `08-mcd-consolide-lot8.md`, référence normative du MCD lot 8 validé et gelé. Les invariants SYNC-001 à SYNC-083 et les autres détails restent dans ce document de référence. Les choix techniques et opérationnels ouverts ne sont pas transformés en règles validées.

### Règles métier RM-SYNC-01 à RM-SYNC-38 (VAL-014)

- **RM-SYNC-01 — Identité d'événement :** chaque événement reçoit avant transmission un identifiant unique et immuable.
- **RM-SYNC-02 — Opération :** une opération regroupe un ou plusieurs événements et définit une fois le nombre attendu; ce regroupement ne détermine pas l'atomicité.
- **RM-SYNC-03 — Retransmission :** chaque retry conserve l'identité, le contenu, l'opération et la position du flux d'origine.
- **RM-SYNC-04 — Déduplication :** le serveur retourne le résultat existant d'un événement déjà reçu ou traité, sans nouvel effet métier.
- **RM-SYNC-05 — Intégrité :** la réutilisation d'une identité avec un contenu différent est bloquante et traçable.
- **RM-SYNC-06 — Atomicité métier :** seul le domaine propriétaire détermine l'unité atomique et les conditions d'application intégrale. Pour une unité atomique inter-flux, il garantit un traitement tout-ou-rien après réception complète; s'il ne peut garantir ce traitement, il regroupe cette unité dans un seul flux. Le lot 8 ne fournit aucune atomicité distribuée.
- **RM-SYNC-07 — Complétude :** le serveur ne traite une opération comme complète qu'après réception durable des événements attendus et de leurs rangs distincts sur tous les flux concernés.
- **RM-SYNC-08 — Flux :** une séquence n'est unique que dans son flux; son attribution est persistée avec l'événement et ne peut être réutilisée.
- **RM-SYNC-09 — Ordre :** l'ordre séquentiel est préservé dans chaque flux; aucune date locale ne suffit à prouver une causalité globale.
- **RM-SYNC-10 — Dépendances :** un événement dépendant attend tant que son prérequis n'est pas validé ou résolu conformément au domaine propriétaire.
- **RM-SYNC-11 — Prérequis rejeté :** le rejet définitif d'un prérequis rend la dépendance non satisfaite et bloque le dépendant; aucune propagation de rejet ou correction métier n'est automatique.
- **RM-SYNC-12 — Prérequis conflictuel :** un prérequis en conflit bloque ses dépendants; une décision d'arbitrage ne satisfait le prérequis qu'une fois appliquée et reconnue comme telle par le domaine propriétaire.
- **RM-SYNC-13 — Dépendance absente :** un prérequis référencé mais non reçu place le dépendant en attente; sa réception ultérieure permet une réévaluation.
- **RM-SYNC-14 — Cycle :** toute dépendance circulaire est une anomalie bloquante conservée et signalée.
- **RM-SYNC-15 — Conflits :** les versions concurrentes et leur rôle dans le conflit sont conservés; aucune dernière écriture gagnante générique ne les écrase.
- **RM-SYNC-16 — Arbitrage :** seules les permissions transversales applicables autorisent l'utilisateur à arbitrer; l'auteur, l'instant et la justification sont conservés.
- **RM-SYNC-17 — Succession des décisions :** une décision remplace explicitement la précédente; au plus une décision par conflit est applicable à un instant donné.
- **RM-SYNC-18 — Application :** l'arbitrage est appliqué selon les règles du domaine propriétaire. Il ne réécrit jamais les événements historiques.
- **RM-SYNC-19 — Progression :** les curseurs de réception et de traitement avancent séparément, uniquement par positions contiguës; les résultats terminaux sont distingués des attentes et conflits.
- **RM-SYNC-20 — Indépendance :** une opération indépendante peut progresser si elle ne dépend pas de la position en attente ou conflictuelle; chaque résultat reste consultable.
- **RM-SYNC-21 — Bidirectionnalité :** les événements montants et descendants possèdent chacun un flux, un récepteur et des curseurs non ambigus.
- **RM-SYNC-22 — Compatibilité :** les versions enveloppe, événement et application sont conservées séparément. Une incompatibilité temporaire conserve l'événement en attente et reprenable après mise à jour compatible; une incompatibilité définitive produit un rejet terminal explicite avec motif. Un format inconnu n'est jamais interprété arbitrairement.
- **RM-SYNC-23 — Migration :** une migration préserve événements, identifiants, flux, séquences, dépendances et résultats nécessaires à la reprise.
- **RM-SYNC-24 — Sauvegarde :** une sauvegarde exploitable préserve les informations d'événements et de reprise énumérées en section 3.14. Son intégrité est vérifiée avant restauration.
- **RM-SYNC-25 — Restauration :** une restauration est réconciliée avec le serveur et ne remplace jamais l'état central.
- **RM-SYNC-26 — Nouvelle installation :** une réinstallation crée une nouvelle identité d'installation et de flux; elle n'attribue pas de positions déjà utilisées.
- **RM-SYNC-27 — Appareil :** un appareil ne synchronise qu'avec une autorisation vérifiée par le serveur; suspension et révocation ne sont pas annulées par le client.
- **RM-SYNC-28 — Révocation hors ligne :** la révocation prend effet au contrôle serveur; aucune propagation immédiate à un appareil déconnecté n'est garantie. Les données locales restent en attente d'une procédure autorisée.
- **RM-SYNC-29 — Lot de transport :** un lot transporte plusieurs opérations indépendantes sans définir leur atomicité.
- **RM-SYNC-30 — Résultats et reprise :** chaque opération et événement conserve son résultat; une interruption ne cause ni perte ni double effet. Une incompatibilité temporaire reste reprenable et non terminale; un rejet définitif de format est terminal seulement après enregistrement durable de son motif.
- **RM-SYNC-31 — Supervision :** les journaux techniques tracent les tentatives sans modifier le métier et limitent l'exposition des données sensibles.
- **RM-SYNC-32 — Récupération :** une retransmission depuis l'installation d'origine peut ne pas référencer d'association de récupération. Une retransmission depuis une autre installation conserve l'identité de l'événement, son opération, son flux, sa séquence et sa provenance; elle exige une autorisation valide référencée pour cet événement et cette restauration, ainsi qu'une tentative de transmission traçable. Sans cette autorisation, elle est refusée.
- **RM-SYNC-33 — Récepteur du curseur :** un curseur identifie soit le récepteur logique central, soit une installation locale précise; il est unique par flux et récepteur.
- **RM-SYNC-34 — Idempotence d'opération :** l'identifiant stable de l'opération et son manifeste sont attribués avant envoi; le même identifiant et le même manifeste retournent le résultat connu, tandis qu'un manifeste différent est une anomalie bloquante. Cette règle s'ajoute à l'idempotence de chaque événement.
- **RM-SYNC-35 — Isolation d'établissement :** le serveur vérifie que l'origine de chaque flux membre correspond à celle de l'opération, que l'installation locale ou l'établissement de contexte concorde, et que l'établissement de tous les événements correspond à celui du contexte d'autorisation; il refuse tout mélange de provenance ou toute transmission inter-établissements.
- **RM-SYNC-36 — Comparaison du contenu :** le contenu canonique métier de référence lié à l'identifiant immuable est comparé intégralement à chaque retransmission; une empreinte seule ne constitue pas une preuve d'égalité.
- **RM-SYNC-37 — Historique de décision :** décision, transitions d'applicabilité et tentatives d'application sont append-only; leur historique ne se réécrit pas.
- **RM-SYNC-38 — Provenance utilisateur :** auteur métier, utilisateur déclenchant la synchronisation et utilisateur autorisant une récupération sont enregistrés séparément quand ils existent, par références au système transversal.

L'établissement propriétaire de l'opération et du flux est déterminé par leur rattachement à l'installation/appareil d'origine ou au contexte serveur d'établissement. Chaque événement doit appartenir à une opération et un flux du même établissement. Le serveur compare cet établissement au contexte d'autorisation courant avant toute réception ou application; un écart provoque un refus explicite sans effet métier.

## 10. Domaine 5 — règles pédagogiques gelées sous VAL-015

Le MCD pédagogique V1.0 est gelé sous VAL-015. Les règles ci-dessous en donnent un résumé; la référence détaillée est `09-dossier-pedagogique-preliminaire.md`. Son ancien statut d'attente de validation est antérieur à VAL-015 et son contenu n'est pas modifié par cette consolidation.

- **PED-RM-001 à PED-RM-007 — Notes et révisions :** une note est unique par inscription/évaluation en V1; ses situations distinctes sont `NOTE_ATTRIBUEE`, `ABSENCE_JUSTIFIEE`, `ABSENCE_NON_JUSTIFIEE`, `DISPENSE`, `NON_EVALUE`. Elle possède une révision initiale et une chaîne de corrections/annulations immuable, sans branche. Une absence/dispense ne devient pas automatiquement zéro; une contribution référence la révision exacte utilisée.
- **PED-RM-008 à PED-RM-011 — Calculs et résultats :** méthodes, normalisations et arrondis sont versionnés et déterministes; les coefficients ont une responsabilité unique. Les résultats agrégés sont les trois sous-types `RESULTAT_MATIERE`, `RESULTAT_PERIODE`, `RESULTAT_ANNUEL`; `NOTE` représente l'évaluation. L'identité fonctionnelle prévient les doublons. Rectification, annulation et nouvel établissement prolongent une chaîne sans cycle ni branche; au plus un résultat applicable par périmètre.
- **PED-RM-012 à PED-RM-017 — Calcul et provenance :** chaque résultat calculé possède des contributions sources conformes à son mode. PED-A10 autorise les contributions de notes ou de résultats antérieurs; leur mélange exige une méthode explicite et versionnée. Références temporelles, sources exactes et valeurs/paramètres appliqués sont conservés.
- **PED-RM-018 à PED-RM-020 — Statuts et paramètres :** absence, dispense et non-évaluation ne deviennent pas zéro automatiquement; méthodes, coefficients, pondérations et arrondis sont versionnés et leurs responsabilités ne se chevauchent pas. Une décision administrative/progression n'est pas un résultat calculé.
- **PED-RM-021 à PED-RM-023 — Publications, progression et Offline-First :** un bulletin publié est figé; son rectificatif est une nouvelle publication. La progression reste individualisée et ne modifie pas seule une classe. Les conflits pédagogiques suivent VAL-014, sans LWW.

**Statut des règles :** règles pédagogiques gelées sous VAL-015. Aucun chiffre de barème, coefficient ou arrondi supplémentaire n'est arrêté par la présente consolidation. Les états métier restent distincts des états de synchronisation de VAL-014.

