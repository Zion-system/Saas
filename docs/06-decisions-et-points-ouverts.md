# 06 — Décisions et points ouverts

**Version :** V1.0
**Statut :** MCD global V1.0 validé sous VAL-016 avec réserve documentaire sur les lots financiers 1 à 5; MLD global proposé en attente de validation formelle

## 1. Décisions validées existantes

Les décisions suivantes sont conservées sans modification.

| ID      | Décision                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| DEC-001 | Le système cible les établissements scolaires privés du Congo-Brazzaville.                                 |
| DEC-002 | La V1 couvre le préscolaire, le primaire, le collège et les lycées général, technique et professionnel.    |
| DEC-003 | Les universités et instituts supérieurs sont exclus de la V1.                                              |
| DEC-004 | Un établissement par déploiement pour la V1.                                                               |
| DEC-005 | L'application adopte une architecture Offline-First.                                                       |
| DEC-006 | Chaque appareil possède sa propre base locale.                                                             |
| DEC-007 | La synchronisation intervient lorsque la connexion est disponible.                                         |
| DEC-008 | Les identifiants locaux utilisent des UUID.                                                                |
| DEC-009 | Les conflits sensibles sont soumis à un arbitrage humain.                                                  |
| DEC-010 | Les opérations financières sont conservées et corrigées par des opérations distinctes.                     |
| DEC-011 | Les montants financiers sont exprimés en FCFA.                                                             |
| DEC-012 | Le matricule d'un élève est unique à l'échelle de l'établissement et non réutilisable.                     |
| DEC-013 | Le dossier permanent d'un élève est distinct de ses inscriptions annuelles.                                |
| DEC-014 | Les rôles et permissions sont différenciés.                                                                |
| DEC-015 | Le modèle commercial repose sur un abonnement mensuel par établissement, influencé par le nombre d'élèves. |
| DEC-016 | SQLite WASM avec OPFS est retenu pour la base locale.                                                      |
| DEC-017 | Le serveur utilise PostgreSQL avec Supabase comme solution envisagée.                                      |

## 2. État de conception communiqué pour cette consolidation

| Périmètre                            | État communiqué                                            | Portée de cet état                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Domaine 1 — Organisation scolaire    | Validé et gelé                                             | Ne valide pas à lui seul le MCD global.                                                                                    |
| Domaine 2 — Gestion des élèves       | Validé et gelé                                             | Ne valide pas à lui seul le MCD global.                                                                                    |
| Domaine 3 — Inscriptions et parcours | Validé et gelé                                             | Ne valide pas à lui seul le MCD global.                                                                                    |
| Domaine 4 — Finances, lots 1 à 5     | Validés et gelés                                           | Les sources disponibles ne détaillent pas le rattachement de chaque entité/règle à un lot.                                 |
| Domaine 4 — Lot 6                    | Orientations provisoirement acceptées en V0.9.1, non gelée | Les orientations sont récapitulées dans `04-regles-metier.md`; elles ne deviennent pas des règles définitivement validées. |
| Domaine 4 — Lot 7                    | MCD V1.0 officiellement gelé le 2026-11-04                 | Ses décisions et invariants ne sont pas modifiables sans demande explicite; voir `07-historique-des-validations.md`.       |
| Domaine 4 — Lot 8                    | MCD V1.0 validé et gelé sous VAL-014 le 2026-11-04          | 17 concepts, relations, cardinalités, RM-SYNC-01 à RM-SYNC-38 et SYNC-001 à SYNC-083 acceptés; voir `08-mcd-consolide-lot8.md`. Les choix techniques et opérationnels restent ouverts. |
| Domaine 5 — Pédagogie                 | MCD V1.0 gelé sous VAL-015                                 | Concepts, relations, cardinalités, PED-A01 à PED-A10 et PED-I01 à PED-I03 sont normatifs; voir `09-dossier-pedagogique-preliminaire.md`. Son ancien statut d'attente est antérieur à VAL-015. |
| MCD global V1.0                      | Validé par le propriétaire le 2026-11-04 sous VAL-016, avec réserve documentaire | La validation accepte explicitement l'absence des modèles détaillés financiers 1 à 5; elle ne valide pas le MLD. |

### Gel officiel du Domaine 4 — Lot 7

Le propriétaire du projet a explicitement validé le gel du **MCD V1.0 du Lot 7** le **2026-11-04**. Les décisions et invariants `FIN-LOT7-001` à `FIN-LOT7-028` sont gelés et ne doivent plus être modifiés sans demande explicite. Ce gel ne vaut pas validation du MCD global V1.0 et ne modifie ni les lots 1 à 5 gelés, ni le statut provisoire du lot 6.

### Gel officiel du Domaine 4 — Lot 8

Le propriétaire du projet a explicitement validé et gelé le **MCD V1.0 du Lot 8** le **2026-11-04**, sous la référence **VAL-014**. Sont acceptés les 17 concepts, les relations, les cardinalités, les règles métier `RM-SYNC-01` à `RM-SYNC-38` et les invariants `SYNC-001` à `SYNC-083`. Toute modification ultérieure requiert une décision explicite et sa traçabilité dans l'historique des validations. Les choix techniques et opérationnels encore ouverts ne remettent pas en cause le gel conceptuel. Cette validation ne vaut pas validation du MCD global V1.0 et ne modifie pas VAL-013 ni les invariants financiers `FIN-LOT7-001` à `FIN-LOT7-028`.

### Validation du MCD global V1.0 — VAL-016

Le propriétaire a validé le **MCD global V1.0** le **2026-11-04**, avec réserve documentaire explicite concernant les modèles sources détaillés des lots financiers 1 à 5. La réserve permet de poursuivre la consolidation et le mapping des éléments documentés, mais n'autorise pas à inventer les attributs, relations, cardinalités ou contraintes financières manquants. Elle ne rouvre aucune décision gelée et ne valide pas le MLD.

## 3. Choix techniques existants

- Frontend : React; langage : TypeScript; styles : Tailwind CSS.
- Stockage local : SQLite WASM + OPFS; application prévue en PWA.
- Base distante : PostgreSQL; Supabase est une solution envisagée.
- Le mécanisme de synchronisation reste à concevoir et à valider.

## 4. Points ouverts globaux et classement de leur impact

Le MCD global est validé sous VAL-016 avec réserve documentaire. Les limites ci-dessous sont conservées sans compléter les modèles gelés par hypothèse.

| Point ouvert | Classement | Traitement retenu |
| --- | --- | --- |
| Modèles sources détaillés des lots financiers 1 à 5 absents : attributs, cardinalités, liens exacts créance–élève/inscription, frais–créance et caisse–encaissements/mouvements | Réserve documentaire acceptée sous VAL-016; bloque le mapping financier détaillé, pas la validation du MCD global | Ne pas reconstituer les modèles par hypothèse. Obtenir les sources avant de valider les relations/tables financières correspondantes; les concepts et décisions gelés restent inchangés. |
| Cardinalités de relations antérieures non reproduites dans les sources globales des domaines 1 à 3 et des lots 1 à 5 | À confirmer avant validation du MLD et physicalisation des relations concernées | Utiliser exclusivement les cardinalités propriétaires; cette consolidation ne crée pas de nouvelles multiplicités. |
| Suffisance temporelle de l'historique d'affectation de classe pour retrouver l'affectation à la date d'évaluation | Non bloquant pour la consolidation globale; à vérifier auprès des domaines 1 et 3 avant mapping pédagogique | Conserver VAL-015 et réutiliser l'historique existant; aucune affectation parallèle n'est introduite. |
| Référentiel existant de l'identité des enseignants | À confirmer avant validation du MLD pédagogique | Rattachement au référentiel propriétaire, sans créer de compte ni de référentiel local. |
| Valeurs concrètes de calcul pédagogique et paramètres versionnés | À traiter lors de la configuration métier/technique | VAL-015 fixe les exigences de reproductibilité, pas des valeurs de coefficient ou d'arrondi absentes des décisions. |
| Conservation/rétention documentaire pédagogique | À traiter lors de la politique documentaire et de la conception technique | Le contenu publié reste protégé selon VAL-015; la durée n'est pas ajoutée au MCD global. |
| Quatre questions provisoires du lot 6 (cascade; réservations concurrentes; provenance/payeur des restitutions; crédits/avoirs sur échéances réglées) | Non bloquant pour l'intégration du MCD global; reste ouvert et provisoire dans le lot 6 | Aucun point n'est résolu par cette consolidation; voir la liste ci-dessous. |
| Choix techniques et opérationnels du lot 8 | À traiter lors de la conception technique conformément à VAL-014 | Les invariants et cardinalités gelés ne sont pas rouverts. |
| Équivalences terminologiques dette/créance et encaissement/paiement | Non bloquant pour l'inventaire conceptuel; à vérifier dans les sources financières | Aucun synonyme ou concept distinct n'est inventé. |

Les cardinalités normatives gelées des domaines 1 à 3, lots 1 à 5, lot 7, lot 8 et domaine pédagogique ne sont pas des décisions ouvertes dans le MCD global. Lorsqu'un détail source n'est pas présent dans le dépôt, il est signalé comme dépendance documentaire et n'est ni redéfini ni remplacé.

### Décisions pédagogiques intégrées — PED-A01 à PED-A10

PED-A01 à PED-A09 ont été officiellement acceptées par le propriétaire le **2026-11-04** et intégrées comme décisions acceptées au dossier consolidé proposé V1.0. Cette entrée décrit l'état à cette date; la validation et le gel ultérieurs du domaine pédagogique sont enregistrés sous VAL-015 ci-dessous.

PED-A10 est conservée : calcul par `CONTRIBUTION_RESULTAT_NOTE` et `CONTRIBUTION_RESULTAT_SCOLAIRE`, associations distinctes, paramètres et valeurs réellement utilisés conservés, dépendances historiques sans cycle et sans propagation silencieuse de rectification.

### Portée des arbitrages PED-A01 à PED-A09 acceptés

Les décisions ci-dessous ont été acceptées et intégrées au dossier pédagogique; elles ne constituaient pas, à elles seules, une validation du MCD global. Elles ne modifient pas les autres domaines gelés.

| Référence | Décision acceptée |
| --- | --- |
| PED-A01 | Trois résultats agrégés : `RESULTAT_MATIERE`, `RESULTAT_PERIODE`, `RESULTAT_ANNUEL`; `NOTE` reste le résultat d'évaluation; aucun `RESULTAT_EVALUATION`. |
| PED-A02 | Méthodes versionnées, responsabilité unique des coefficients, barèmes/normalisation explicites, arrondis déterministes et paramètres réellement utilisés figés. |
| PED-A03 | Aucun résultat calculé sans source; sources note ou résultat antérieur; décisions administratives/progression séparées; pas de contribution fictive. |
| PED-A04 | Une note maximum par inscription/évaluation; cinq situations codifiées; absence/dispense jamais convertie automatiquement en zéro; tentatives multiples hors V1. |
| PED-A05 | Rangs uniques et ordonnés, continuité non obligatoire; une chaîne canonique après arbitrage VAL-014; aucun écrasement silencieux. |
| PED-A06 | Portée versionnée par cycles/niveaux/spécialités éventuelles et périodes; sélection déterministe, chevauchement ambigu signalé; historique préservé. |
| PED-A07 | Contenu, structure et document publié conservés; rectificatif distinct; ancien bulletin immuable; pixel-perfect non exigé conceptuellement en V1. |
| PED-A08 | Domaine pédagogique propriétaire de la décision; organisation scolaire responsable de l'application; avis de conseil distinct; aucun changement automatique de classe. |
| PED-A09 | Affectation valable à la date de l'évaluation retrouvée exclusivement via l'historique existant; aucune duplication; insuffisance signalée. |

Les précisions de modèle et les conséquences conceptuelles figurent dans `09`. Les quatre points ouverts du lot 6 ci-dessous restent inchangés.

### Points ouverts propres au lot 6

1. Gestion des crédits consommés en cascade.
2. Arbitrage des réservations concurrentes de crédit entre appareils fonctionnant hors ligne.
3. Détermination et conservation de la provenance et du payeur des fonds utilisés pour les restitutions et mandats.
4. Traitement des crédits et avoirs concernant des échéances déjà réglées.

Aucune solution n'est décidée pour ces quatre points.

### Décisions gelées du lot 7

- RAP pour une créance échéancée : somme des RAP des seules `ECHEANCE_CREANCE` actives; le montant parent `CREANCE` n'est pas ajouté une seconde fois.
- RAP pour une créance sans échéancier : calcul au niveau de `CREANCE` depuis son montant dû ajusté et les affectations nettes actives qui la ciblent.
- Échéances annulées ou remplacées : exclues des calculs courants, conservées historiquement. Un calendrier réaménagé ne devient applicable qu'après validation; les dates d'origine, applicables et de validation restent distinctes.
- Balance âgée : tolérance portée par le paramétrage versionné, zéro par défaut; l'âge commence au premier jour calendaire suivant l'échéance applicable plus tolérance. Tranches entières demi-ouvertes `[borne basse, borne haute)`, dernière ouverte.
- Relance : une relance porte sur un seul élève et conserve un instantané immuable. Si toutes ses lignes sont closes, aucun nouvel envoi; si certaines seulement changent, l'ancienne relance n'est pas renvoyée et une nouvelle est créée pour les seules lignes encore dues.
- Transmission : faute de service avec journal durable trouvé dans le dépôt, `TENTATIVE_TRANSMISSION_RELANCE` est proposée comme enfant persistant; une tentative référence une relance et un destinataire et conserve son résultat. La traçabilité n'implique pas une livraison externe exactly-once.
- Invariants : les identifiants `FIN-LOT7-001` à `FIN-LOT7-028` gardent leur correspondance; le libellé de `FIN-LOT7-002` est celui d'origine (« Le RAP ne peut pas être négatif. »). Le traitement de l'anomalie est défini dans les règles sans modifier l'identifiant.

## Dépendances héritées et décisions reportées

| Élément                                                                                                                                                                                                                                | Statut                                                              | Traitement dans le lot 7                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entités validées des lots 1 à 5 (`CREANCE`, `PLAN_REGLEMENT_CREANCE`, `ECHEANCE_CREANCE`, `ENCAISSEMENT`, `AFFECTATION_REGLEMENT`, `MOUVEMENT_CREDIT`, `SESSION_CAISSE`, `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE`, `RAPPROCHEMENT_CAISSE`) | Dépendance antérieure validée; détails historiques absents du dépôt | Le lot 7 consomme leurs effets et n'en change ni attributs ni cardinalités. Cette absence documentaire n'est pas un bloqueur de conception lot 7. |
| Responsabilités financières actives et autorisations du domaine 2                                                                                                                                                                      | Dépendance antérieure validée                                       | Réutiliser la source D2, sans la redéfinir.                                                                                                       |
| Annulations, contrepassations, remboursements, avoirs, crédits et réservations                                                                                                                                                         | Lot 6 provisoire                                                    | Le lot 7 consomme les effets établis; cascade et concurrence des réservations restent au lot 6.                                                   |
| Idempotence de synchronisation et arbitrage central d'événements concurrents                                                                                                                                                           | Report au lot 8                                                     | Ne pas les déplacer au lot 7.                                                                                                                     |
| SMS                                                                                                                                                                                                                                    | Hors périmètre V1                                                   | Le journal de tentatives reste indépendant du canal; aucun mécanisme SMS n'est ajouté.                                                            |

Ces dépendances ne rouvrent pas les lots gelés. Les détails d'implémentation et de mapping physique restent hors du MCD et seront repris lors du MLD à partir des sources propriétaires.

## 5. Domaine 4 — Lot 8 : MCD V1.0 validé et gelé

**Statut : validé et gelé sous VAL-014 le 2026-11-04.** Le lot 8 traite la cohérence Offline-First des événements sans devenir propriétaire des règles métier des domaines/lots sources. Les détails du MCD validé figurent dans `08-mcd-consolide-lot8.md`.

### Objectifs et modèle de traitement

1. Une opération métier validée localement produit une enveloppe de synchronisation dotée d'une identité stable avant le premier envoi. Les retries réutilisent cette identité; ils ne créent pas un nouvel événement métier.
2. L'appareil conserve durablement les enveloppes non acquittées. Le serveur authentifie l'origine, vérifie l'autorisation, l'intégrité, les références et les règles de validation du domaine source.
3. La réception et l'application centrale d'un événement sont idempotentes selon son identifiant stable. Une répétition retourne le résultat déjà enregistré au lieu de réappliquer l'opération.
4. L'accusé central n'est émis qu'après enregistrement durable du résultat. Le curseur n'avance que jusqu'au dernier événement contigu acquitté; les trous, rejets et conflits restent visibles et traçables.
5. L'ordre causal local est préservé. Les horloges des appareils ne servent pas seules à départager les événements concurrents.
6. Aucun conflit n'est écrasé par une règle générique de dernière écriture gagnante. Les alternatives restent conservées; l'arbitrage central par un utilisateur autorisé produit une décision traçable.
7. Le serveur recalcule les projections, notamment financières, depuis les événements reçus et validés. Une situation locale ou une sauvegarde ancienne ne vaut jamais état central confirmé.

### Sécurité, sauvegarde et reprise

- Chaque enveloppe est rattachée à une origine authentifiée et à des permissions vérifiées côté serveur; la révocation d'un appareil perdu/compromis doit empêcher les nouveaux envois de cette origine.
- Les sauvegardes locales sont identifiables et leur intégrité est vérifiée avant restauration. La restauration ne remplace jamais silencieusement l'état central par un instantané local ancien.
- Les événements locaux non acquittés sont préservés pendant une restauration, comparés aux accusés/curseurs puis rejoués de façon idempotente. Une interruption de restauration peut reprendre ou échouer sans détruire la seule copie locale exploitable.
- La politique de fréquence/rétention, la protection des sauvegardes, les versions compatibles et la reprise après migration restent des choix techniques ou opérationnels ouverts; ils ne rouvrent pas le MCD conceptuel validé.

### Concepts acceptés

Les 17 concepts, leurs relations et cardinalités sont acceptés et gelés sous VAL-014, tels que décrits dans `08-mcd-consolide-lot8.md`. Aucun attribut physique, table ou SQL n'est défini par cette validation.

### Frontières de responsabilité

- Les lots/domaines 1 à 7 sont propriétaires de leurs événements et règles métier; le lot 8 transporte leurs faits sans les copier ni les réinterpréter.
- Le lot 6 reste propriétaire des règles métier de crédits, réservations, cascade et restitutions. Le lot 8 transporte les réservations concurrentes et conserve la décision d'arbitrage selon le mécanisme métier du lot 6; il ne décide pas quelle règle financière gagner.
- Le lot 7 reste gelé sous VAL-013 et le lot 8 est gelé sous VAL-014; ce dernier n'en change ni calculs, ni cardinalités, ni invariants financiers.

### Décisions conceptuelles validées sous VAL-014

1. Portée de l'identifiant d'événement stable et relation avec une opération métier atomique.
2. Ordre causal intra-appareil, dépendances entre événements et partitionnement des curseurs.
3. Politique de conflits par type d'entité et rôles autorisés à arbitrer.
4. Compatibilité des enveloppes entre versions clientes/serveur et événements en attente lors d'une évolution de schéma.
5. Fréquence, rétention, restauration, protection et vérification des sauvegardes.
6. Révocation et récupération d'un appareil perdu, compromis ou restauré.
7. Taille des lots, délais de retry et observabilité opérationnelle.

Ces sept axes sont couverts par le MCD du lot 8 validé sous VAL-014. Les choix techniques et opérationnels résiduels sont suivis dans la section 8 du MCD lot 8; toute modification du périmètre conceptuel gelé requiert une décision explicite et une nouvelle trace. Cela ne modifie pas le gel du lot 7 ni les lots antérieurs.

## 6. Audit transversal

- Aucune contradiction connue avec les lots 1 à 5 n'est relevée. Le dépôt ne contient pas leurs détails; cette limite de vérification ne rouvre pas ces décisions gelées et ne constitue pas, à elle seule, un bloqueur du lot 7.
- « Décision de progression » est un concept unique; sa propriété pédagogique et son application administrative organisationnelle sont gelées sous VAL-015. Les transitions figurent dans la référence pédagogique; aucun mécanisme concurrent n'est conservé.
- Les termes dette/créance et encaissement/paiement ne sont pas définis comme synonymes ni comme entités distinctes; les fusionner ou les séparer sans décision serait prématuré.
- L'articulation du concept général « Annulation financière » avec l'opération lot 6 « Annulation d'encaissement » n'est pas précisée; aucune contradiction n'est établie, et le dictionnaire ne les compte pas comme deux entités.
- Les orientations du lot 7 prolongent sans contradiction apparente les orientations du lot 6 documentées ici : réservations liées au mouvement positif source, crédit brut préservé, réservation centrale prise en compte dans le crédit net, absence d'affectation automatique et conservation de l'historique.
- Le RAP et l'âge par échéance sont définis sur les effets des échéances actives; les échéances annulées/remplacées sont exclues du courant et gardées en historique. Les attributs/cardinalités propriétaires des entités antérieures ne sont pas copiés ou modifiés.
- Une tension de périmètre potentielle existe entre les transmissions de relance et l'exclusion explicite des notifications SMS dans le périmètre général. Elle n'est pas une contradiction si les canaux retenus ne sont pas des SMS; le canal reste à préciser.
- Le journal de tentative assure la traçabilité, pas l'exactly-once d'une transmission externe; aucun mécanisme de service/canal n'a été trouvé. Le constat de cet audit sur l'idempotence de synchronisation est historique : celle-ci est désormais spécifiée dans le MCD du lot 8 validé sous VAL-014. Les garanties exactes d'un service ou canal externe restent hors de ce constat.
- Le garde-fou de revalidation centrale évite de transmettre une relance entièrement soldée depuis une vue périmée. Si seule une partie des lignes est encore due, l'instantané ancien reste intact et une nouvelle relance est créée pour les lignes dues restantes.
- L'annulation d'encaissement, la contrepassation et le remboursement sont explicitement distingués; aucune contradiction n'est identifiée avec la conservation de l'historique dans les règles disponibles.
- La provenance doit être conservée pour les mandats de restitution, mais la détermination du payeur et la source précise restent ouvertes (point 3 ci-dessus).
- La gestion des réservations provisoires hors ligne implique un arbitrage central; les réservations concurrentes restent ouvertes (point 2 ci-dessus), sans contradiction établie avec le fonctionnement Offline-First.
- Les liens historiques exacts entre inscriptions, créances, crédits et échéances ne sont pas tous reproduits dans le dépôt. Le lot 7 consomme `ECHEANCE_CREANCE` et les effets sources sans inventer ni modifier les cardinalités des lots gelés.
- Les définitions détaillées des lots financiers 1 à 5 ne sont pas disponibles dans le dépôt; les noms et décisions gelés fournis sont préservés, aucune entité/cardinalité/règle propriétaire n'a été extrapolée. Cette absence documentaire est une limite d'audit, pas une anomalie lot7 à elle seule.

Ces constats sont des points de cohérence à résoudre, pas de nouvelles décisions métier.

## 7. Autres points à finaliser avant implémentation


- Gestion du cycle de vie des comptes hors ligne et durée/conditions des sessions locales.
- Politique de récupération d'un compte et gestion des appareils perdus ou compromis.
- Stratégie détaillée de sauvegarde locale.
- Gestion des conflits pour chaque type d'entité et choix définitif de la bibliothèque de synchronisation.
- Matrice détaillée des rôles et permissions.
- Politique de conservation et d'archivage des données.
- Détails techniques du déploiement et de la sécurité serveur.

Un point ouvert est documenté et traité avant l'implémentation de la fonctionnalité concernée. Une décision validée n'est pas rouverte sans justification technique ou métier.

Le MCD V1.0 du lot 7 est officiellement gelé depuis le 2026-11-04 sous la référence VAL-013. Ses décisions et invariants FIN-LOT7-001 à FIN-LOT7-028 ne doivent pas être modifiés sans demande explicite.

## 8. Consolidation du MCD global V1.0

Le MCD global est consolidé et audité sans redéfinir les domaines propriétaires ni compléter les cardinalités manquantes par hypothèse. Il a été validé sous VAL-016 le 2026-11-04 avec réserve documentaire explicite sur les lots financiers 1 à 5. Le MLD proposé figure dans `11-mld-global.md` et reste en attente de validation formelle. Les limites documentaires et les travaux reportés sont classés à la section 4; les quatre points du lot 6 restent ouverts.
