# 05 — Cycles de vie et statuts

**Version :** V1.0
**Statut :** Cycles des domaines/lots gelés préservés; Lot 7 gelé sous VAL-013; Lot 8 sous VAL-014; domaine pédagogique sous VAL-015.

Ce document reprend seulement les états et transitions cités par les règles métier. Il ne complète pas les cycles manquants par hypothèse. Le statut provisoire du lot 6 ne vaut pas validation de ses états.

## 1. Année scolaire — Domaine 1

États documentés : **Préparée**, **Ouverte**, **Clôturée**, **Archivée**.

```text
PRÉPARÉE → OUVERTE → CLÔTURÉE → ARCHIVÉE
```

Une année ne peut être officiellement ouverte que si aucune autre année n'est déjà ouverte dans l'établissement. La clôture est contrôlée et auditée; une année clôturée n'est pas modifiée librement. Les conditions et droits détaillés de transition restent à formaliser.

## 2. Candidature — Domaine 3

La candidature est examinée avant la création du dossier permanent. Elle ne devient un dossier d'élève qu'après admission. Les statuts détaillés et les transitions de décision restent à formaliser.

## 3. Préinscription — Domaine 3

La préinscription précède l'inscription définitive et concerne soit un candidat, soit un élève déjà connu. Les états et transitions propres à la préinscription ne sont pas documentés; elle reste distincte de l'inscription confirmée.

## 4. Inscription — Domaine 3

L'inscription confirmée représente la scolarisation effective d'un élève pour une année scolaire. Une inscription annulée est conservée. L'inscription directe est configurable et une réinscription nécessite une inscription antérieure confirmée. Les transitions détaillées ne sont pas entièrement spécifiées.

## 5. Affectation à une classe — Domaines 1 et 3

L'affectation peut être absente à la création de l'inscription et définie ultérieurement. Les changements successifs sont historisés. Aucun ensemble de statuts propre à l'affectation n'est documenté.

## 6. Décision de progression — Domaines 1 et 3

La décision est individualisée, conservée et traçable; le passage n'est pas automatique pour tous les élèves. PED-A08 et VAL-015 attribuent la décision au domaine pédagogique et son application administrative à l'organisation scolaire. Il s'agit d'un seul concept, pas de deux cycles ou entités distincts. Ses états gelés sont repris en section 13.

## 7. Paiement — Domaine 4

Les paiements peuvent nécessiter une vérification et rester en attente. Une déclaration Mobile Money faite hors ligne n'est pas une vérification auprès du fournisseur. Les statuts précis et transitions financières restent à définir dans les documents spécialisés.

## 8. Opérations du lot financier 6 — orientations provisoires

Le lot 6 est en conception V0.9.1, provisoire et non gelé. Les orientations métier sont provisoirement acceptées, mais ne définissent pas de cycle complet ni de nouveaux états métier :

- L'annulation d'un encaissement est orchestrée et bloquante; elle reste distincte d'une contrepassation et d'un remboursement.
- Une réservation locale de crédit peut être provisoire; un arbitrage central est à prendre en compte dans le fonctionnement Offline-First. Les états et transitions de cet arbitrage ne sont pas détaillés.
- Les crédits brut, réservé et net sont calculés, et une réservation ne diminue pas le crédit brut; ils ne constituent pas des états de cycle de vie.
- `CREATION_AVOIR` peut produire un crédit distinct sans réécrire l'opération initiale.
- Les mandats de restitution conservent la granularité de provenance des fonds. Les transitions du mandat ne sont pas spécifiées.

Les quatre points ouverts propres au lot 6 figurent dans `06-decisions-et-points-ouverts.md`; aucune solution ni transition n'est ajoutée ici.

## 9. Conflit de synchronisation

Pour le cycle détaillé d'un conflit de synchronisation, se reporter à la section 12 et au MCD Lot 8 gelé sous VAL-014. Le présent document ne substitue pas un cycle simplifié à ces états et à l'historique des décisions d'arbitrage.

## 10. Lots financiers

Les lots 1 à 5 sont gelés; leurs détails de cycles ne sont pas redéfinis ici. Le lot 6 reste provisoire avec quatre points ouverts. Le MCD V1.0 du lot 7 est gelé sous VAL-013; le MCD V1.0 du lot 8 est gelé sous VAL-014.

## 11. Lot 7 — états calculés et notions de synchronisation

### Situation financière d'une échéance

Les libellés **À venir**, **À régler**, **Partiellement réglée**, **Réglée** et **En retard** décrivent une situation financière calculée, pas de nouveaux statuts persistés de l'échéance. **Annulée** relève du cycle administratif de l'échéance et ne se confond pas avec sa situation financière. Les statuts administratifs détaillés existants dans les lots antérieurs n'étant pas présents dans les documents disponibles, aucune valeur persistée supplémentaire n'est proposée.

Une échéance partiellement réglée garde son ancienneté. En cas de réaménagement, les calculs suivent le calendrier actif; les calendriers antérieurs restent consultables.

Une échéance annulée ou remplacée est exclue du RAP et de la balance âgée courants, tout en restant dans l'historique. Le nouveau calendrier d'un réaménagement ne devient applicable qu'après validation; l'ancien calendrier et les dates d'exigibilité initiale/applicable restent distinguables. La date de validation appartient à l'événement source et n'est pas dupliquée par le lot 7.

### Situation locale et centrale

`LOCAL_PROVISOIRE`, `EN_ATTENTE_SYNCHRONISATION`, `CENTRAL_CONFIRME` et `CONFLIT` sont des notions conceptuelles proposées pour qualifier l'état de connaissance/synchronisation d'une situation. Elles ne sont pas ajoutées comme statuts persistés à une entité financière. Une situation locale ne vaut pas confirmation centrale; le serveur recalcule depuis les événements reçus et validés, sans écrasement silencieux des conflits.

### Paramétrage, historiques et documents

- La balance âgée est calculée à une date de référence, avec date du jour par défaut, fuseau `Africa/Brazzaville` et version de paramétrage conservée avec les documents générés. La tolérance est versionnée dans le paramétrage, vaut zéro par défaut et ne modifie ni RAP ni date d'exigibilité.
- L'âge commence le premier jour calendaire suivant la date applicable augmentée de la tolérance. Les tranches entières utilisent une borne basse incluse et une borne haute exclue; la dernière est ouverte. Seules les échéances actives avec un RAP positif et déjà échues après tolérance sont classées.
- Deux consultations historiques restent distinctes : situation connue à la date considérée; situation recalculée aujourd'hui pour cette date en intégrant les événements ultérieurs connus aujourd'hui.
- Chaque destinataire de relance possède son propre historique de transmission; les coordonnées d'envoi sont conservées comme référence historique.
- En l'absence de service existant offrant un journal durable, chaque tentative est une occurrence distincte de `TENTATIVE_TRANSMISSION_RELANCE`, rattachée à une relance et un destinataire. Une tentative échouée reste historisée et un nouvel essai ne l'écrase pas. Les états détaillés de tentative restent à définir.
- Un document généré conservé garde son contenu de référence et ses paramètres d'identification; il reste distinct d'une écriture comptable.

À sa création, une relance fige les lignes et leurs montants de référence. Avant chaque tentative, le contenu est vérifié sur le dernier état central confirmé. Si toutes les lignes sont réglées, annulées ou remplacées, aucune nouvelle tentative n'est envoyée. Si certaines lignes ont changé, l'ancienne relance n'est pas renvoyée avec un montant périmé; une nouvelle relance est créée avec les seules lignes encore dues et leurs montants recalculés. Toute tentative est append-only et une reprise n'écrase pas l'échec précédent. Un identifiant de tentative assure la traçabilité, pas l'idempotence de livraison externe. Les états détaillés de tentative restent non persistés/non définis; les canaux ne sont pas définis et les SMS restent hors périmètre initial.

Les transitions détaillées de réservation et de mandat de restitution relèvent des décisions provisoires du lot 6. Les réservations concurrentes restent du ressort du lot 6; l'idempotence de synchronisation et l'arbitrage central des événements concurrents relèvent du lot 8.

## 12. Lot 8 — cycles de vie validés sous VAL-014

Les états ci-dessous sont des dimensions de cycle de vie conceptuelles; ils ne prescrivent pas un attribut persistant unique. Leur matérialisation éventuelle sera décidée au MLD.

### Appareil et installation

- Appareil : ENREGISTRE, ACTIF, SUSPENDU, REVOQUE.
- Installation : ACTIVE, REMPLACEE, INACTIVE, A_RECONCILIER.
- Flux : OUVERT, SUSPENDU, CLOTURE; une séquence clôturée ne reprend pas dans une nouvelle génération.

La révocation est contrôlée par le serveur. Un appareil totalement hors ligne ne peut pas recevoir immédiatement l'information de révocation; ses envois seront refusés ou soumis à récupération contrôlée à la prochaine communication, selon l'autorisation serveur en vigueur.

### Dimensions de l'événement

- **Transmission :** LOCAL, A_TRANSMETTRE, TRANSMIS, RETRY_EN_COURS, ERREUR_TEMPORAIRE, ERREUR_DEFINITIVE.
- **Réception :** NON_RECU, RECU_DURABLEMENT, ACCUSE_RECEPTION.
- **Traitement métier :** NON_TRAITE, EN_ATTENTE, VALIDE, REJETE_DEFINITIVEMENT, EN_CONFLIT, DECISION_ARBITRAGE_EN_ATTENTE, ARBITRE_A_APPLIQUER, ARBITRAGE_APPLIQUE, INCOMPATIBLE_TEMPORAIRE, REJET_FORMAT_DEFINITIF.
- **Acquittement :** NON_ACQUITTE, ACQUITTE.

Ces dimensions évoluent indépendamment. L'accusé de réception confirme la conservation durable du message; il ne signifie pas que le métier est validé. Une incompatibilité temporaire conserve l'événement en attente, sans résultat terminal, jusqu'à ce qu'une version compatible puisse le reprendre. Une incompatibilité définitive produit un rejet terminal explicite avec motif conservé. Un conflit non résolu ou une décision non appliquée n'est pas un résultat terminal de traitement.

### Opération de synchronisation

La réception suit NON_RECUE, PARTIELLE, COMPLETE sur l'ensemble des flux contenant les événements attendus. Le traitement suit NON_DEMARRE, EN_COURS, EN_ATTENTE, TERMINE, REJET_GLOBAL selon la portée déclarée par le domaine propriétaire. Pour une opération atomique inter-flux, aucun événement participant n'est déclaré traité définitivement avant la décision tout-ou-rien du domaine; les curseurs de chaque flux restent bloqués à leurs positions correspondantes tant que le résultat n'est pas terminal. Le lot 8 garantit la collecte et le suivi de complétude par transport, mais ne garantit pas le commit atomique entre flux. Si le domaine ne sait pas appliquer cette unité sur tous les flux comme une transaction logique unique, il doit restreindre l'opération atomique à un seul flux. Le résultat d'une opération non atomique peut être composé de résultats événementiels distincts; chaque résultat partiel suit les règles du propriétaire et les curseurs progressent selon ces résultats indépendants. Ces dimensions ne sont pas fusionnées en une séquence linéaire.

### Curseur

Pour chaque flux et récepteur, conserver séparément :

1. la dernière séquence contiguë reçue durablement;
2. la dernière séquence contiguë dont le traitement est définitif.

Est terminal pour la progression de traitement : événement validé; rejet métier définitif; rejet définitif d'incompatibilité avec motif enregistré; ou arbitrage dont la décision est effectivement appliquée selon le domaine propriétaire. N'est pas terminal : position absente, attente, conflit non résolu, incompatibilité temporaire, décision retenue mais non appliquée. Une incompatibilité temporaire bloque le curseur de traitement contigu jusqu'à reprise compatible. Un rejet de format définitif permet au curseur de franchir cette position une fois le résultat durablement enregistré; les autres dépendances métier et conditions d'atomicité restent applicables. Une séquence ultérieure peut être reçue et son résultat consulté, mais ne fait pas franchir silencieusement le curseur bloqué.

Un événement acquitté est un résultat durablement communiqué et conservé par son émetteur. L'acquittement seul ne transforme pas une attente ou un conflit en résultat terminal.

### Conflit, décision, sauvegarde et restauration

- Conflit : DETECTE, EN_ANALYSE, EN_ATTENTE_ARBITRAGE, RESOLU_APRES_APPLICATION, CLOS selon le domaine.
- Décision : le contenu n'a pas de statut mutable. Son applicabilité est déduite des transitions append-only (RETENUE, REMPLACEE, ANNULEE); ses applications successives sont consignées séparément avec un résultat par tentative. Au plus une décision par conflit est courante et applicable.
- Sauvegarde : EN_COURS, TERMINEE, VERIFICATION_EN_COURS, VERIFIEE, INVALIDE, ECHEC.
- Restauration : DEMANDEE, SOURCE_VERIFIEE, EN_COURS, EN_RECONCILIATION, REPRISE_AUTORISEE, ECHEC.

## 13. Domaine 5 — cycles pédagogiques gelés sous VAL-015

Les cycles pédagogiques ci-dessous sont ceux du MCD V1.0 gelé sous VAL-015 et sont reproduits depuis `09-dossier-pedagogique-preliminaire.md`. Le statut d'attente de validation encore imprimé dans ce document est antérieur à VAL-015; aucun cycle n'est modifié ici. Ces états métier ne remplacent pas les états de transmission, réception, traitement ou acquittement définis et gelés sous VAL-014.

| Concept | Cycle candidat |
| --- | --- |
| Version de programme | BROUILLON → APPLICABLE → REMPLACEE ou RETIREE; les versions sources restent référencées. |
| Enseignement / affectation enseignant | PREPARE → ACTIF → TERMINE ou ANNULE; validité temporelle conservée. |
| Évaluation | PREPAREE → OUVERTE → CLOTUREE ou ANNULEE. |
| Note | A_SAISIR → révision INITIALE portant une des situations `NOTE_ATTRIBUEE`, `ABSENCE_JUSTIFIEE`, `ABSENCE_NON_JUSTIFIEE`, `DISPENSE`, `NON_EVALUE` → révision CORRECTION ou ANNULATION; historique conservé. |
| Résultat scolaire (types matière/période/annuel) | EN_CALCUL → ETABLI → RECTIFIE par successeur ou ANNULE; nouvel établissement après annulation dans la même chaîne. |
| Bulletin | PREPARE → VERIFIE → PUBLIE; rectification par création d'un bulletin distinct. |
| Conseil / avis | PREVU → TENU → COMPTE_RENDU_ETABLI; l'avis n'est pas la décision de progression. |
| Décision de progression | DELIBEREE → PRISE → APPLICABLE → REMPLACEE ou ANNULEE; le domaine pédagogique porte la décision, l'organisation en applique l'effet administratif séparément. |
| Suivi pédagogique | OUVERT → SUIVI → CLOS, statut détaillé selon le besoin. |

Les états exacts, transitions autorisées, rôles et nécessité de confirmation centrale pour publication ou progression restent soumis à arbitrage. L'état métier d'un objet ne se déduit pas de son acquittement de synchronisation.

