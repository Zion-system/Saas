# DOSSIER DE CONCEPTION FONCTIONNELLE

# LOT 5 — GESTION DES SESSIONS DE CAISSE, OUVERTURES, CLÔTURES ET RAPPROCHEMENTS

**Projet :** ERP scolaire SaaS Offline-First  
**Domaine :** Gestion financière  
**Lot :** 5  
**Version :** V0.1 — Proposition consolidée  
**Périmètre :** Sous-blocs 5.1 à 5.6  
**Statut :** Document de conception à consolider avant validation et gel officiel.

---

# 1. OBJECTIF DU LOT 5

Le Lot 5 a pour objectif de gérer les opérations physiques et organisationnelles des caisses de l'établissement scolaire.

Il doit permettre de connaître :

- Quel caissier a utilisé une caisse.
- Sur quel poste physique les opérations ont été effectuées.
- Quel appareil informatique a été utilisé.
- Quand une session a été ouverte et clôturée.
- Quel montant constituait le fonds initial.
- Quels mouvements physiques ont été enregistrés.
- Quels encaissements ont été reçus pendant la session.
- Quel montant était théoriquement présent à la clôture.
- Quel montant a réellement été compté.
- Quels écarts ont été constatés.
- Comment ces écarts ont été expliqués et contrôlés.
- Quelles opérations ont été réalisées hors ligne.
- Quelles sessions ont été synchronisées ou nécessitent un arbitrage.

Le Lot 5 ne doit pas devenir un deuxième système d'encaissement ou de comptabilité.

Il constitue le dispositif de contrôle opérationnel de la trésorerie physique.

# 2. FRONTIÈRES AVEC LES AUTRES LOTS

## 2.1. Relation avec le Lot 4

Le Lot 4 est propriétaire des mécanismes suivants :

- ENCAISSEMENT.
- AFFECTATION_REGLEMENT.
- MOUVEMENT_CREDIT.
- TRANSACTION_MOBILE_MONEY.
- Gestion des moyens de paiement.
- Confirmation et vérification financière des règlements.

Le Lot 5 doit exploiter les informations du Lot 4 pour déterminer les opérations qui ont réellement une incidence sur la caisse physique.

Un encaissement en espèces confirmé peut contribuer au solde théorique d'une session.

Un encaissement Mobile Money ne constitue pas une entrée physique d'espèces.

Une utilisation de crédit ne constitue pas un nouvel encaissement.

Une affectation de règlement ne doit pas, à elle seule, produire un mouvement de trésorerie physique.

## 2.2. Relation avec le Lot 6

Le Lot 6 est propriétaire des mécanismes suivants :

- ANNULATION_ENCAISSEMENT.
- CONTREPASSATION_AFFECTATION.
- REMBOURSEMENT_FONDS.
- Gestion des avoirs.
- Gestion des remboursements.
- Gestion des réservations et restitutions de crédits.

Le Lot 5 doit tenir compte des événements financiers du Lot 6 sans les reproduire.

Règle déjà établie :

**FIN-LOT6-015 :** un remboursement en espèces est matérialisé exclusivement par REMBOURSEMENT_FONDS. Il ne doit pas être enregistré une deuxième fois comme une sortie indépendante dans MOUVEMENT_CAISSE.

## 2.3. Relation avec le Lot 7

Le Lot 7 est propriétaire des soldes financiers, impayés, crédits et états financiers.

Le Lot 5 fournit les informations opérationnelles nécessaires aux contrôles de caisse.

Il ne doit pas recalculer ou remplacer les règles de situation financière des élèves.

## 2.4. Relation avec le Lot 8

Le Lot 8 est propriétaire du mécanisme transversal de synchronisation.

Le Lot 5 doit respecter :

- L'identité stable des opérations.
- L'idempotence.
- La conservation des événements.
- La gestion des dépendances.
- La détection des conflits.
- L'absence de fusion silencieuse.
- La séparation entre réception, traitement et acquittement.
- La traçabilité des arbitrages.

Le Lot 5 définit les règles métier de ses sessions et de ses mouvements. Le Lot 8 définit leur transport et leur synchronisation.

---

# 3. INVENTAIRE CONCEPTUEL DES ENTITÉS

Neuf entités sont identifiées comme base de conception.

| Entité                     | Responsabilité                                                                 |
| -------------------------- | ------------------------------------------------------------------------------ |
| POSTE_CAISSE               | Représenter un point physique d'encaissement.                                  |
| APPAREIL                   | Identifier un appareil informatique utilisé pour les opérations.               |
| SESSION_CAISSE             | Représenter une période opérationnelle de travail d'un caissier sur un poste.  |
| MOUVEMENT_CAISSE           | Tracer les entrées et sorties physiques autorisées.                            |
| CLOTURE_CAISSE             | Enregistrer la clôture et les résultats du contrôle physique.                  |
| DETAIL_COMPTAGE_CAISSE     | Conserver le détail du comptage des espèces.                                   |
| TRANSMISSION_FONDS         | Tracer le transfert physique de fonds entre intervenants.                      |
| RAPPROCHEMENT_CAISSE       | Organiser le contrôle d'un écart ou d'une situation nécessitant rapprochement. |
| JUSTIFICATION_ECART_CAISSE | Conserver les explications et justifications relatives à un écart.             |

Cet inventaire est un inventaire conceptuel de travail. Il ne constitue pas encore le dictionnaire définitif du MCD.

Aucune entité supplémentaire ne doit être créée sans nécessité métier démontrée.

---

# 4. SOUS-BLOC 5.1 — OUVERTURE DES SESSIONS DE CAISSE

## 4.1. Objectif

Permettre à un caissier habilité d'ouvrir une session de caisse en identifiant clairement :

- Le caissier.
- Le poste physique.
- L'appareil informatique.
- La date et l'heure d'ouverture.
- Le fonds initial réellement disponible.
- L'origine de ce fonds.
- Les éventuelles transmissions de fonds associées.

Une session doit être identifiable indépendamment de l'appareil qui l'a créée.

## 4.2. Distinction entre les trois notions fondamentales

### POSTE_CAISSE

Représente le point physique où les opérations d'encaissement sont réalisées.

Exemples :

- Caisse principale.
- Caisse secondaire.
- Guichet des inscriptions.
- Guichet de scolarité.

Un poste de caisse ne représente pas un utilisateur ni un appareil informatique.

### APPAREIL

Représente le terminal informatique utilisé.

Exemples :

- Ordinateur du service financier.
- Tablette du guichet.
- Ordinateur portable du caissier.

Un appareil peut être utilisé pour plusieurs sessions successives.

Son identité technique doit rester stable conformément aux règles du Lot 8.

### SESSION_CAISSE

Représente la période pendant laquelle un caissier est responsable des opérations effectuées sur un poste de caisse.

Elle conserve son identité, son historique et son rattachement à l'appareil utilisé.

Le caissier, le poste et l'appareil ne doivent jamais être fusionnés en une seule notion.

## 4.3. Conditions d'ouverture

Une ouverture doit respecter les conditions suivantes :

1. Le caissier doit être authentifié.
2. Il doit disposer de la permission d'ouverture.
3. Le poste de caisse doit être identifié.
4. L'appareil doit être identifié.
5. Le montant du fonds initial doit être enregistré.
6. L'origine du fonds initial doit être traçable.
7. Les éventuelles transmissions de fonds doivent être vérifiées selon leur état.
8. Une session précédente sur le même appareil doit être clôturée localement avant une nouvelle ouverture.
9. Une ouverture incompatible avec une session active connue doit être bloquée.

Le montant du fonds initial doit correspondre à la somme réellement confiée au caissier.

Le solde final d'une session précédente ne doit jamais être repris automatiquement comme fonds initial de la suivante.

## 4.4. Origine du fonds initial

Le fonds initial peut provenir notamment :

- D'un fonds conservé au poste.
- D'une transmission de fonds par un responsable.
- D'une remise de fonds par un autre caissier.
- D'une autre opération autorisée et documentée.

La source exacte et les modalités de transfert doivent être précisées dans le modèle définitif.

Une transmission simplement déclarée comme envoyée ne doit pas être considérée automatiquement comme reçue.

## 4.5. Contrôle des sessions concurrentes

Le système doit distinguer les sessions connues localement des sessions connues centralement.

En mode connecté, le serveur peut vérifier les sessions déjà ouvertes.

En mode déconnecté, l'appareil ne peut contrôler que les informations locales disponibles.

Une session ouverte sur un autre appareil peut donc être inconnue localement.

Les collisions découvertes lors de la synchronisation doivent être conservées et soumises à arbitrage.

Aucune session ne doit être supprimée ou fusionnée silencieusement.

## 4.6. Règle proposée FIN-LOT5-001

**Continuité opérationnelle des sessions hors ligne**

La clôture locale d'une session rend immédiatement cette session non opérationnelle sur son appareil d'origine, indépendamment de sa synchronisation centrale.

Une nouvelle session peut être ouverte sur cet appareil sans attendre la validation centrale de la précédente, sous réserve que la clôture locale soit complète et que les contrôles d'ouverture soient satisfaits.

Chaque session conserve son identité, son historique et son rattachement au poste et à l'appareil.

Les sessions concurrentes ou incompatibles détectées lors de la synchronisation sont conservées et soumises à arbitrage.

Aucune fusion ni réécriture silencieuse n'est autorisée.

**Statut : proposition retrouvée dans l'historique, à confirmer officiellement.**

---

# 5. SOUS-BLOC 5.2 — OPÉRATIONS PENDANT UNE SESSION

## 5.1. Objectif

Garantir la traçabilité de toutes les opérations ayant une incidence sur les espèces physiquement présentes dans la caisse.

Le système doit distinguer les opérations financières des mouvements physiques de trésorerie.

## 5.2. MOUVEMENT_CAISSE

Cette entité représente les mouvements physiques autorisés pendant une session.

Elle ne doit pas devenir une copie des encaissements du Lot 4.

Les mouvements physiques peuvent comprendre :

- Les entrées complémentaires de fonds.
- Les sorties de fonds autorisées.
- Les transferts physiques documentés.
- Les autres opérations de caisse expressément autorisées.

Chaque mouvement doit être rattaché à son contexte opérationnel et conserver sa provenance.

Les informations conceptuelles à examiner dans le dictionnaire définitif comprennent :

- Identité du mouvement.
- Session concernée.
- Nature de l'opération.
- Montant.
- Date et heure.
- Auteur.
- Motif.
- Origine ou destination lorsque nécessaire.
- Référence de l'opération financière associée lorsqu'elle existe.
- État de validité.

Ces éléments constituent des informations candidates à documenter, pas une liste d'attributs officiellement validée.

## 5.3. Encaissements en espèces

Un encaissement en espèces relevant du Lot 4 peut contribuer au solde théorique de la session concernée.

Il faut préserver la référence de l'encaissement d'origine.

Le système ne doit pas créer un deuxième encaissement pour alimenter le journal de caisse.

Un encaissement annulé doit être traité conformément au mécanisme du Lot 6.

La prise en compte de l'annulation doit respecter les événements financiers réellement validés et leur chronologie.

## 5.4. Paiements Mobile Money

Un règlement Mobile Money ne constitue jamais une entrée physique d'espèces.

La déclaration d'une transaction Mobile Money ne doit pas être assimilée à une confirmation financière du fournisseur.

Le Lot 5 doit respecter les états et règles du Lot 4.

Il ne doit pas intégrer une transaction Mobile Money non confirmée au comptage physique des espèces.

## 5.5. Utilisation des crédits

L'utilisation d'un crédit disponible ne constitue pas une nouvelle entrée de trésorerie.

Elle ne doit donc pas augmenter le solde physique de la caisse.

La consommation du crédit reste gérée par MOUVEMENT_CREDIT et AFFECTATION_REGLEMENT dans le Lot 4.

## 5.6. Remboursements

Les remboursements en espèces sont gérés par REMBOURSEMENT_FONDS du Lot 6.

Le Lot 5 doit tenir compte de leur incidence physique selon les règles établies, sans créer une deuxième écriture de sortie indépendante.

## 5.7. Principe d'immutabilité

Une opération validée ne doit pas être modifiée ou supprimée silencieusement.

Toute correction doit être matérialisée par une opération distincte, autorisée et traçable.

Les mécanismes exacts de correction et de contrepassation restent propriétaires des lots financiers concernés.

---

# 6. SOUS-BLOC 5.3 — FERMETURE ET COMPTAGE PHYSIQUE

## 6.1. Objectif

Permettre au caissier de fermer une session et de comparer :

- Le solde théorique calculé par le système.
- Le montant réellement compté.
- L'écart constaté.

La clôture constitue un événement opérationnel important.

Elle ne doit pas être assimilée à une simple modification de l'état de la session.

## 6.2. CLOTURE_CAISSE

Cette entité conserve les informations relatives à la clôture d'une session.

Les informations conceptuelles à documenter comprennent :

- La session concernée.
- La date et l'heure de clôture.
- Le solde théorique calculé.
- Le montant physique déclaré.
- L'écart constaté.
- L'identité de l'intervenant ayant effectué la clôture.
- Le résultat du contrôle.

Les attributs définitifs doivent être établis dans le dictionnaire du MCD.

## 6.3. Calcul du solde théorique

Le solde théorique doit être calculé à partir :

- Du fonds initial.
- Des entrées physiques valides.
- Des sorties physiques valides.
- Des encaissements en espèces effectivement pris en compte.
- Des événements financiers ayant une incidence physique conformément aux règles des Lots 4 et 6.

Formule conceptuelle :

**Solde théorique = Fonds initial + Entrées physiques valides − Sorties physiques valides**

Les encaissements et remboursements doivent être intégrés une seule fois.

Les paiements Mobile Money et les utilisations de crédits ne doivent pas être comptabilisés comme des entrées physiques d'espèces.

Les événements annulés ou contrepassés doivent être traités conformément à leur état financier réel.

## 6.4. DETAIL_COMPTAGE_CAISSE

Cette entité permet de conserver le détail du comptage physique des espèces.

Elle doit permettre de représenter les différentes coupures et les quantités comptées.

Exemple :

|     Coupure | Quantité |           Total |
| ----------: | -------: | --------------: |
| 10 000 FCFA |        5 |     50 000 FCFA |
|  5 000 FCFA |        4 |     20 000 FCFA |
|  2 000 FCFA |        5 |     10 000 FCFA |
|  1 000 FCFA |        8 |      8 000 FCFA |
|    500 FCFA |        4 |      2 000 FCFA |
|   **Total** |          | **90 000 FCFA** |

Le total des détails de comptage doit correspondre au montant physique déclaré.

Le référentiel des coupures et les éventuelles modalités de comptage complémentaire restent à préciser.

## 6.5. Calcul de l'écart

Formule :

**Écart = Montant physique déclaré − Solde théorique**

Interprétation :

- Écart positif : excédent.
- Écart négatif : manque.
- Écart nul : concordance.

Le système doit conserver la valeur réelle de l'écart.

Il ne doit pas ramener artificiellement un écart à zéro.

## 6.6. Clôture locale

En fonctionnement hors ligne, une clôture locale doit immédiatement rendre la session non opérationnelle sur son appareil d'origine.

Elle ne doit plus recevoir de nouveaux encaissements ni de mouvements ordinaires.

La synchronisation ultérieure ne doit pas rouvrir automatiquement cette session.

Les éventuelles opérations tardives ou incompatibles doivent être traitées comme des anomalies nécessitant un examen.

## 6.7. Séparation entre clôture et rapprochement

Une session peut être clôturée même si un écart reste à expliquer ou à rapprocher.

La clôture et le traitement de l'écart sont deux processus distincts.

La résolution ultérieure d'un écart ne doit pas modifier rétroactivement le solde théorique historique de la session clôturée.

---

# 7. SOUS-BLOC 5.4 — JOURNAUX ET HISTORIQUE DE CAISSE

## 7.1. Objectif

Conserver une traçabilité chronologique des opérations réalisées pendant les sessions de caisse.

Le journal doit permettre de retrouver :

- Les ouvertures.
- Les encaissements physiques pris en compte.
- Les mouvements de caisse.
- Les transmissions de fonds.
- Les clôtures.
- Les comptages.
- Les rapprochements.
- Les justifications.
- Les événements de synchronisation pertinents.

## 7.2. Principes du journal

Le journal doit être consultable selon différents critères :

- Session.
- Poste de caisse.
- Caissier.
- Appareil.
- Période.
- Nature de l'opération.
- État de synchronisation.

Il doit préserver l'ordre chronologique et les références aux opérations sources.

Il doit être possible de remonter depuis une opération de caisse jusqu'à son origine financière.

## 7.3. Historique immuable

Une opération validée ne doit pas disparaître du journal.

Une annulation ou une correction doit apparaître comme un événement distinct.

Le journal doit permettre de distinguer :

- L'opération initiale.
- L'opération corrective.
- Le motif.
- L'auteur.
- L'autorisateur lorsque nécessaire.
- La date de réalisation.
- La date de synchronisation.

Les données exactes de journalisation transversale doivent rester cohérentes avec le Lot 8.

## 7.4. Consultation historique

Un utilisateur autorisé doit pouvoir consulter une session clôturée sans pouvoir la modifier directement.

Les informations historiques doivent permettre de reconstituer la situation connue lors de la clôture.

Une consultation historique ne doit pas recalculer silencieusement les anciennes valeurs avec des événements apparus ultérieurement.

---

# 8. SOUS-BLOC 5.5 — RAPPROCHEMENTS ET CONTRÔLE DES ÉCARTS

## 8.1. Objectif

Permettre l'examen des différences entre le solde théorique et le montant physiquement constaté.

Le rapprochement doit être distinct de la clôture.

Il permet de documenter et de traiter les anomalies sans falsifier les opérations historiques.

## 8.2. RAPPROCHEMENT_CAISSE

Cette entité représente le processus de contrôle d'une situation de caisse.

Elle doit permettre d'identifier :

- La session concernée.
- La clôture concernée.
- Le montant théorique de référence.
- Le montant physique constaté.
- L'écart à examiner.
- Le responsable du rapprochement.
- La date de traitement.
- Le résultat du contrôle.

Le modèle définitif devra préciser si plusieurs rapprochements successifs sont autorisés pour une même clôture et dans quelles conditions.

## 8.3. JUSTIFICATION_ECART_CAISSE

Cette entité conserve les explications apportées à un écart.

Une justification doit être documentée.

Les informations candidates comprennent :

- L'écart concerné.
- Le motif.
- L'explication.
- L'auteur.
- La date.
- Les éventuelles pièces justificatives.
- L'état de traitement.

Une justification ne constitue pas automatiquement une correction financière.

Elle ne doit jamais modifier artificiellement le solde théorique de la session.

## 8.4. Contrôle hiérarchique

Le système doit permettre de distinguer :

- L'utilisateur qui constate l'écart.
- Celui qui le justifie.
- Celui qui effectue le contrôle.
- Celui qui autorise éventuellement une opération corrective.

Ces responsabilités doivent être soumises aux permissions du système.

Le principe de séparation des responsabilités doit être appliqué lorsque la nature de l'opération l'exige.

Les règles exactes de double validation et les seuils éventuels doivent être arbitrés avant le gel.

## 8.5. Traitement des écarts

Un écart peut notamment être :

- Expliqué et accepté après contrôle.
- En attente de justification.
- En cours de vérification.
- Contesté.
- Non résolu.
- Transmis à un responsable.

Ces états sont des propositions fonctionnelles.

Le cycle de vie définitif devra être établi sans multiplier inutilement les statuts.

Une justification acceptée ne doit pas effacer l'écart historique.

Une correction financière éventuelle doit passer par le mécanisme propriétaire approprié.

---

# 9. SOUS-BLOC 5.6 — FONCTIONNEMENT OFFLINE-FIRST

## 9.1. Objectif

Garantir la continuité opérationnelle des caisses lorsque l'établissement ne dispose pas d'une connexion Internet.

Chaque appareil doit pouvoir travailler avec ses données locales.

La synchronisation centrale ne doit pas être une condition systématique de fonctionnement quotidien.

## 9.2. Sessions hors ligne

Une session créée hors ligne possède immédiatement une identité UUID stable.

Elle conserve :

- Son caissier.
- Son poste.
- Son appareil.
- Son ouverture.
- Ses opérations locales.
- Sa clôture éventuelle.

La session reste identifiable même avant sa synchronisation.

## 9.3. Séparation entre état opérationnel et état de synchronisation

Il faut éviter de mélanger deux dimensions différentes.

### État opérationnel

Il décrit si la session peut encore recevoir des opérations ordinaires.

États conceptuels de travail :

- OUVERTE.
- FERMEE.

La fermeture locale est immédiatement effective sur l'appareil d'origine.

### État de synchronisation

Il décrit la situation de transmission et de traitement central.

États conceptuels retrouvés :

- EN ATTENTE DE SYNCHRONISATION.
- SYNCHRONISEE.
- CONFLIT_A_ARBITRER.

Ces deux dimensions doivent rester distinctes.

Une session peut être fermée opérationnellement tout en étant en attente de synchronisation.

## 9.4. Nouvelle session après clôture locale

Une nouvelle session peut être ouverte sur le même appareil après la clôture complète de la précédente.

Elle possède un nouvel UUID.

Elle ne doit pas attendre la synchronisation de l'ancienne session.

Cette règle constitue le principe de continuité opérationnelle proposé dans FIN-LOT5-001.

## 9.5. Sessions concurrentes

Deux appareils peuvent ouvrir hors ligne des sessions incompatibles concernant un même poste ou un même caissier.

Le système local ne peut pas toujours détecter cette situation.

Lors de la synchronisation :

1. Les sessions sont reçues individuellement.
2. Le serveur vérifie les contraintes métier.
3. Les incompatibilités sont identifiées.
4. Les historiques sont conservés.
5. Un arbitrage est déclenché si nécessaire.

Aucune fusion automatique ne doit être réalisée.

## 9.6. Protection des opérations clôturées

Une session clôturée localement ne doit pas recevoir de nouveaux mouvements ordinaires.

Une opération tardive liée à une session clôturée doit être identifiée comme une anomalie ou un événement nécessitant un traitement particulier.

Le système ne doit pas modifier silencieusement la clôture initiale.

## 9.7. Sauvegarde et reprise

Les données locales nécessaires à la continuité des opérations doivent être protégées.

Une restauration ou un changement d'appareil ne doit pas créer de nouvelles identités pour des opérations déjà enregistrées.

Les règles de récupération et de reprise doivent respecter les décisions du Lot 8.

---

# 10. TRANSMISSION DES FONDS

## 10.1. Objectif

Tracer le transfert physique de fonds entre deux intervenants ou entre un caissier et un responsable.

Cette opération est distincte de la clôture d'une session.

Elle permet de connaître :

- Qui remet les fonds.
- Qui les reçoit.
- Quel montant est transmis.
- À quelle date.
- Pour quel motif.
- Si la réception a été confirmée.
- Si des réserves ont été formulées.

## 10.2. TRANSMISSION_FONDS

Une transmission doit conserver sa provenance et sa destination.

L'envoi ne signifie pas automatiquement que le destinataire a reçu les fonds.

La réception doit être matérialisée explicitement.

Une transmission refusée ou contestée doit conserver son historique.

## 10.3. Relation avec les sessions

Une transmission peut intervenir :

- À l'ouverture d'une session.
- Pendant une session.
- À la clôture d'une session.
- Lors du transfert des fonds à un responsable.
- Lors du changement de caissier.

Le modèle définitif devra préciser les liens exacts avec les sessions et les postes.

Il faudra notamment distinguer une transmission de fonds d'un simple mouvement comptable.

---

# 11. RÈGLES MÉTIER TRANSVERSALES PROPOSÉES

Les règles suivantes constituent une base de consolidation.

| Référence proposée | Règle                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| FIN-LOT5-001       | Continuité opérationnelle après clôture locale hors ligne.                                                |
| FIN-LOT5-002       | Distinction obligatoire entre caissier, poste de caisse et appareil.                                      |
| FIN-LOT5-003       | Une session clôturée localement ne reçoit plus de mouvements ordinaires.                                  |
| FIN-LOT5-004       | Une nouvelle session possède une identité indépendante.                                                   |
| FIN-LOT5-005       | Le fonds initial correspond au montant réellement confié au caissier.                                     |
| FIN-LOT5-006       | Le solde final d'une session ne devient pas automatiquement le fonds initial de la suivante.              |
| FIN-LOT5-007       | Toute transmission de fonds conserve son origine et sa réception effective.                               |
| FIN-LOT5-008       | Le solde théorique est calculé à partir des opérations physiques valides.                                 |
| FIN-LOT5-009       | Les paiements Mobile Money ne constituent pas des entrées physiques d'espèces.                            |
| FIN-LOT5-010       | L'utilisation d'un crédit ne constitue pas une entrée de trésorerie.                                      |
| FIN-LOT5-011       | Les remboursements en espèces respectent exclusivement le mécanisme du Lot 6.                             |
| FIN-LOT5-012       | La clôture et le rapprochement sont deux processus distincts.                                             |
| FIN-LOT5-013       | Le montant physique déclaré doit correspondre au total du comptage détaillé lorsque celui-ci est utilisé. |
| FIN-LOT5-014       | L'écart est conservé avec son signe réel.                                                                 |
| FIN-LOT5-015       | Une justification ne modifie pas artificiellement le solde théorique.                                     |
| FIN-LOT5-016       | Les sessions concurrentes sont conservées et soumises à arbitrage.                                        |
| FIN-LOT5-017       | Une opération validée ne peut être supprimée silencieusement.                                             |
| FIN-LOT5-018       | La synchronisation ne rouvre pas automatiquement une session clôturée localement.                         |

Ces références sont proposées pour la consolidation du Lot 5. Elles ne doivent pas être considérées comme officiellement gelées avant validation.

---

# 12. PRINCIPES D'INTÉGRITÉ FINANCIÈRE

Les invariants suivants doivent être vérifiés dans le futur modèle.

## 12.1. Conservation du solde physique

Pour une session donnée :

Solde théorique = Fonds initial + Entrées physiques valides − Sorties physiques valides.

Aucune opération ne doit être comptabilisée deux fois.

## 12.2. Comptage physique

Le total des lignes de comptage doit correspondre au montant physique déclaré.

## 12.3. Écart

Écart = Montant physique déclaré − Solde théorique.

Le système doit conserver le montant signé.

## 12.4. Absence de double comptabilisation

Un encaissement du Lot 4 ne doit pas être comptabilisé une première fois dans ENCAISSEMENT et une deuxième fois comme une entrée indépendante dans MOUVEMENT_CAISSE.

Le rattachement opérationnel à une session ne constitue pas un nouvel encaissement.

## 12.5. Absence d'incidence physique fictive

Les opérations suivantes ne doivent pas être assimilées à des entrées d'espèces :

- Utilisation d'un crédit.
- Affectation d'un règlement.
- Déclaration Mobile Money non confirmée.
- Synchronisation d'une opération déjà enregistrée.

## 12.6. Immutabilité historique

La clôture historique doit rester consultable même après le traitement d'un écart.

Toute correction doit être représentée par une opération distincte et traçable.

---

# 13. CAS LIMITES À COUVRIR DANS LES TESTS FUTURS

Le modèle devra permettre de traiter au minimum les situations suivantes.

### Cas 1 — Clôture hors ligne

Un caissier clôture sa session sans Internet.

Résultat attendu : la session devient immédiatement non opérationnelle sur son appareil.

### Cas 2 — Nouvelle session avant synchronisation

Le même caissier ouvre une nouvelle session sur le même appareil.

Résultat attendu : ouverture autorisée si la clôture précédente est complète et si les autres contrôles sont satisfaits.

### Cas 3 — Sessions concurrentes

Deux appareils ouvrent hors ligne des sessions incompatibles sur un même poste.

Résultat attendu : conservation des deux historiques et arbitrage central.

### Cas 4 — Changement de caissier

Un premier caissier clôture sa session et transmet des fonds à un second.

Résultat attendu : transmission documentée, réception identifiable et fonds initial distinctement enregistré.

### Cas 5 — Écart de caisse

Le solde théorique est de 100 000 FCFA et le comptage physique de 98 000 FCFA.

Résultat attendu : écart de -2 000 FCFA conservé et soumis au traitement prévu.

### Cas 6 — Encaissement Mobile Money

Une transaction Mobile Money est déclarée pendant une session.

Résultat attendu : aucune augmentation artificielle du solde physique en espèces.

### Cas 7 — Utilisation d'un crédit

Un parent utilise un crédit disponible pour régler une échéance.

Résultat attendu : aucune nouvelle entrée physique dans la caisse.

### Cas 8 — Annulation d'un encaissement en espèces

Un encaissement est annulé conformément au Lot 6.

Résultat attendu : incidence sur la situation de caisse traitée à partir de l'événement financier source, sans suppression de l'historique.

### Cas 9 — Remboursement en espèces

Un remboursement est réalisé pendant une session.

Résultat attendu : utilisation du mécanisme REMBOURSEMENT_FONDS, sans double sortie indépendante dans MOUVEMENT_CAISSE.

### Cas 10 — Synchronisation répétée

Une même session clôturée est transmise plusieurs fois.

Résultat attendu : absence de duplication conformément aux règles d'idempotence du Lot 8.

### Cas 11 — Opération tardive

Une opération arrive après la clôture locale d'une session.

Résultat attendu : détection de l'incompatibilité et traitement explicite, sans réouverture silencieuse.

### Cas 12 — Restauration d'appareil

Un appareil est remplacé ou restauré après une panne.

Résultat attendu : conservation des identités et des historiques déjà enregistrés, conformément au Lot 8.

---

# 14. POINTS À ARBITRER AVANT LE GEL

Le présent document ne permet pas encore de déclarer le Lot 5 définitivement validé.

Les points suivants doivent être examinés.

| Référence     | Point à confirmer                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| LOT5-OUV-01   | Unicité des sessions ouvertes : par poste, par caissier, par appareil ou combinaison de ces critères. |
| LOT5-OUV-02   | Possibilité pour un caissier d'utiliser simultanément plusieurs postes.                               |
| LOT5-OUV-03   | Possibilité pour plusieurs caissiers d'utiliser un même poste selon des sessions successives.         |
| LOT5-OUV-04   | Règles de transmission du fonds initial et responsabilités du remettant et du réceptionnaire.         |
| LOT5-MVT-01   | Liste exacte des natures de mouvements physiques autorisés.                                           |
| LOT5-MVT-02   | Autorisations et validations requises pour les entrées et sorties de fonds.                           |
| LOT5-MVT-03   | Gestion des sorties de fonds exceptionnelles et de leurs justificatifs.                               |
| LOT5-CLOT-01  | Possibilité de clôturer une session avec des opérations locales encore en cours de traitement.        |
| LOT5-CLOT-02  | Gestion d'une clôture incomplète ou d'un comptage interrompu.                                         |
| LOT5-CLOT-03  | Possibilité de réaliser plusieurs comptages et conservation de leurs résultats.                       |
| LOT5-TRANS-01 | Modalités de transfert des fonds entre deux sessions et deux caissiers.                               |
| LOT5-CTRL-01  | Autorités habilitées à effectuer un rapprochement.                                                    |
| LOT5-CTRL-02  | Nécessité d'une double validation pour certaines catégories d'écarts.                                 |
| LOT5-CTRL-03  | Cycle de vie définitif des rapprochements et justifications.                                          |
| LOT5-SYNC-01  | Traitement des opérations tardives reçues après clôture.                                              |
| LOT5-SYNC-02  | Arbitrage des sessions concurrentes portant sur un même poste ou caissier.                            |
| LOT5-SYNC-03  | Conséquences d'une révocation d'appareil ou de compte sur une session locale.                         |

Ces points ne doivent pas être résolus par des hypothèses cachées.

---

# 15. LIVRABLES ATTENDUS POUR LE GEL DU LOT 5

Avant de déclarer le Lot 5 officiellement gelé, les livrables suivants devront être consolidés :

1. MCD conceptuel complet du Lot 5.
2. Inventaire définitif des entités.
3. Dictionnaire complet des entités et attributs.
4. Définition des identifiants et références.
5. Relations et cardinalités complètes.
6. Règles métier numérotées et validées.
7. Contraintes d'intégrité.
8. Cycles de vie et états.
9. Scénarios Offline-First.
10. Cas limites et conflits.
11. Matrice de cohérence avec les Lots 4, 6, 7 et 8.
12. Rapport d'audit transversal.
13. Historique des arbitrages et validations.

Le MLD global ne devra être modifié définitivement qu'après validation du MCD du Lot 5.

Aucun SQL, aucune migration et aucun développement métier ne sont autorisés à ce stade.

---

# 16. STATUT DE LA CONCEPTION

| Élément                               | Statut                     |
| ------------------------------------- | -------------------------- |
| Périmètre des six sous-blocs          | Identifié                  |
| Inventaire initial des neuf entités   | Retrouvé                   |
| Frontières avec les Lots 4, 6, 7 et 8 | Définies                   |
| Principes d'ouverture des sessions    | Documentés                 |
| Principes de gestion des mouvements   | Documentés                 |
| Principes de clôture et comptage      | Documentés                 |
| Principes de rapprochement            | Documentés                 |
| Principes Offline-First               | Documentés                 |
| FIN-LOT5-001                          | À confirmer officiellement |
| Autres règles FIN-LOT5 proposées      | À confirmer                |
| Dictionnaire complet                  | À produire                 |
| Relations et cardinalités             | À établir                  |
| MCD complet                           | À consolider               |
| Validation officielle                 | Non effectuée              |
| Gel officiel                          | Non effectué               |

**Conclusion :**

Le présent document constitue une base consolidée de conception fonctionnelle du Lot 5. Il permet de traiter les six sous-blocs dans leur ensemble et de préparer le MCD détaillé.

Il ne constitue pas encore une validation officielle du Lot 5.

La prochaine étape documentaire sera la consolidation des arbitrages ouverts, puis la production du MCD complet avec ses entités, attributs, relations, cardinalités et invariants.
