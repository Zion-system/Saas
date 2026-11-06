# 02 — Dictionnaire des entités

**Projet :** ERP scolaire  
**Version :** V1.0  
**Statut :** Dictionnaire de consolidation du MCD global V1.0; les concepts spécialisés gelés restent normatifs dans leurs documents de référence.

Ce dictionnaire reprend uniquement les concepts cités dans les documents disponibles. Il ne définit ni attributs détaillés, ni clés primaires ou étrangères, ni structure physique.

## 1. Domaine 1 — Organisation scolaire

| Entité conceptuelle   | Responsabilité documentée                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Établissement         | Établissement scolaire propriétaire du périmètre V1 et frontière de rattachement des données métier. |
| Année scolaire        | Représente une année académique de l'établissement et porte le cycle de vie préparée, ouverte, clôturée, archivée. |
| Période pédagogique   | Représente une période de découpage pédagogique d'une année; elle appartient à une organisation annuelle.          |
| Cycle d'enseignement  | Regroupe des niveaux selon l'organisation scolaire.                                                                |
| Niveau d'enseignement | Représente un niveau scolaire proposé par l'établissement.                                                         |
| Modèle de classe      | Définit une structure de classe réutilisable.                                                                      |
| Classe annuelle       | Représente une classe organisée pour une année scolaire et s'appuie sur un niveau et un modèle de classe.          |

La « Décision de progression » est décrite dans les domaines 1 et 3 et recensée une seule fois. PED-A08 attribue la décision au domaine pédagogique et l'application administrative à l'organisation scolaire, sans modifier le mécanisme d'affectation existant.

## 2. Domaine 2 — Gestion des élèves

| Entité conceptuelle        | Responsabilité documentée                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Élève                      | Dossier permanent d'une personne scolarisée ou ayant été scolarisée dans l'établissement; distinct des inscriptions annuelles. |
| Responsable                | Personne pouvant être associée à un ou plusieurs élèves.                                                                       |
| Relation élève-responsable | Porte le lien, les informations de relation et les responsabilités associées; ses changements sont historisés.                 |
| Document élève             | Document associé au dossier permanent de l'élève.                                                                              |

Le responsable, la relation avec l'élève et les responsabilités légales restent des concepts distincts.

## 3. Domaine 3 — Inscriptions et parcours scolaire

| Entité conceptuelle                | Responsabilité documentée                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Candidature                        | Demande d'admission avant la création du dossier permanent.                                                                                      |
| Préinscription                     | Démarche préalable à l'inscription définitive; concerne un candidat ou un élève déjà connu, jamais les deux simultanément.                       |
| Inscription                        | Inscription confirmée d'un élève pour une année scolaire.                                                                                        |
| Affectation à une classe           | Rattachement pouvant être différé d'un élève inscrit à une classe annuelle.                                                                      |
| Historique de changement de classe | Conserve les changements successifs de classe.                                                                                                   |
| Décision de progression            | Décision individualisée de passage ou de maintien; concept unique dont le propriétaire pédagogique et l'application organisationnelle sont acceptés sous PED-A08. |

Une candidature ne devient un dossier permanent qu'après admission. Une inscription annulée est conservée.

## 4. Domaine 4 — Gestion financière

Les noms suivants sont déclarés comme entités antérieures validées et gelées des lots 1 à 5. Ils sont réutilisés tels quels; cette documentation ne leur ajoute ni attribut, ni cardinalité, ni règle.

| Entité historique validée |
| ------------------------- |
| `CREANCE`                 |
| `PLAN_REGLEMENT_CREANCE`  |
| `ECHEANCE_CREANCE`        |
| `ENCAISSEMENT`            |
| `AFFECTATION_REGLEMENT`   |
| `MOUVEMENT_CREDIT`        |
| `SESSION_CAISSE`          |
| `MOUVEMENT_CAISSE`        |
| `CLOTURE_CAISSE`          |
| `RAPPROCHEMENT_CAISSE`    |

Leurs descriptions détaillées et décisions historiques ne figurent pas dans les sources du dépôt. Les règles du lot 7 consomment les effets des événements de ces entités, sans remplacer leur mécanisme. Les termes génériques « dette », « créance », « encaissement » et « paiement » ne sont pas utilisés pour créer des doublons ou établir des synonymies non documentées.

L'état communiqué indique que les lots 1 à 5 sont validés et gelés; que le lot 6 reste provisoire avec quatre points ouverts; que le lot 7 est gelé sous VAL-013; que le lot 8 est validé et gelé sous VAL-014; et que le domaine 5 est gelé sous VAL-015. Les concepts suivants relèvent du périmètre provisoire du lot 6; leur forme logique détaillée et leurs cardinalités ne sont pas définies ici.

| Concept provisoire du lot 6 | Sens établi par l'orientation                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Annulation d'encaissement   | Opération orchestrée et bloquante, distincte d'une contrepassation et d'un remboursement.                                        |
| Contrepassation             | Opération financière distincte de l'annulation et du remboursement; son déclencheur et ses liens détaillés restent non précisés. |
| Avoir                       | Préserve l'historique; peut produire un crédit distinct via l'opération `CREATION_AVOIR`.                                        |
| `RESERVATION_CREDIT`        | Concept de réservation pointant directement vers le mouvement positif source via `id_mouvement_credit_source`.                   |
| Restitution                 | Opération dont la provenance des fonds doit rester traçable.                                                                     |
| Mandat de restitution       | Préserve la granularité de provenance des fonds restitués.                                                                       |

Les crédits brut, réservé et net sont des valeurs calculées, non des montants indépendants modifiables. Ils ne constituent pas trois entités ou soldes librement éditables. Une réservation locale peut être provisoire et son arbitrage central doit être pris en compte en fonctionnement Offline-First. La réservation ne diminue pas le crédit brut. Les crédits ne sont pas automatiquement affectés aux échéances.

L'articulation du concept général « Annulation financière » avec l'opération lot 6 « Annulation d'encaissement » n'est pas précisée; le dictionnaire ne les considère pas comme deux entités distinctes.

Les termes « dette » et « créance » sont employés dans les documents sans décision explicite établissant s'ils désignent le même concept. L'orientation sur l'annulation d'encaissement ne précise pas si « encaissement » est synonyme de « paiement » ou un concept distinct. Ces termes ne sont pas fusionnés ni ajoutés comme entités distinctes sans clarification.

## 5. Domaine 4 — Lot 7 : concepts du MCD V1.0 gelé

**Statut : MCD V1.0 validé et gelé sous VAL-013 le 2026-11-04.** Les décisions du lot 7 ne doivent pas être modifiées sans demande explicite. Les libellés en code restent des noms conceptuels, non des noms physiques.

| Concept du MCD gelé               | Responsabilité conceptuelle et dépendances                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RELANCE_FINANCIERE`              | Relance concernant un seul élève; elle ne modifie aucune donnée comptable. Les critères de déclenchement restent à définir.                                                                                   |
| `LIGNE_RELANCE_FINANCIERE`        | Ligne conservant ses montants de référence et ciblant exactement une `CREANCE` ou une `ECHEANCE_CREANCE`, jamais les deux. Une relance ne mélange pas une créance globale et ses échéances constitutives.     |
| `DESTINATAIRE_RELANCE_FINANCIERE` | Destinataire autorisé d'une relance; conserve les coordonnées effectivement utilisées comme référence historique. Une relance peut avoir plusieurs destinataires.                                             |
| `PARAMETRAGE_BALANCE_AGEE`        | Paramétrage versionné des tranches, du fuseau `Africa/Brazzaville` et de la tolérance en jours; date de référence par défaut : date du jour; tolérance par défaut : zéro jour.                                |
| `TRANCHE_BALANCE_AGEE`            | Tranche configurable en jours entiers, borne basse incluse et borne haute exclue; tranches contiguës, non chevauchantes; dernière tranche ouverte. Les seuils 1–30, 31–60, 61–90 et >90 restent des exemples. |

Ces concepts appartiennent au MCD V1.0 gelé sous VAL-013; leurs noms restent conceptuels et ne sont pas des noms physiques. Le modèle retient une relance pour un élève, une cible exclusive par ligne et plusieurs destinataires possibles par relance; les cardinalités gelées ne modifient pas les entités historiques.

### Journal des tentatives de transmission

Aucun service de communication/documentaire avec journal durable et interrogeable des tentatives n'a été trouvé dans les documents ou dans `src/`; `src/services/` contient actuellement les dossiers d'authentification et de synchronisation. Le besoin d'un historique par destinataire est déjà établi. Le MCD gelé retient `TENTATIVE_TRANSMISSION_RELANCE` comme concept enfant lorsque aucun service transversal ne fournit les garanties requises.

- Chaque tentative possède un identifiant et référence exactement une relance et un destinataire; une même relation destinataire/relance peut avoir plusieurs tentatives.
- Le journal conserve, pour chaque tentative, la date/heure, le canal, le résultat, le motif d'échec le cas échéant et les coordonnées effectivement utilisées.
- Ces éléments sont des attributs conceptuels justifiés par les exigences de traçabilité, pas un schéma physique. Les états détaillés, règles de retry et traitement des doublons restent à définir.
- Une tentative échouée est conservée; une nouvelle tentative crée une nouvelle occurrence historique. Un paiement postérieur ne réécrit pas la relance ni ses tentatives.

### Concepts calculés ou artefacts

- Situation financière de l'élève, reste à payer (RAP), montants encaissés non affectés, crédits brut/réservé/net, impayés, balance âgée, relevé dynamique et synthèses : résultats calculés, sans entité persistante créée du seul fait de leur affichage.
- Situation financière toujours individualisée par élève; dettes non fusionnées, crédits non mutualisés automatiquement et aucun compte familial partagé en V1.0.
- Document généré et conservé : artefact de référence distinct d'une écriture comptable. Il doit être identifiable par un identifiant, un type, l'élève concerné si applicable, la date de génération, la date de référence, l'auteur, l'année scolaire et, si nécessaire, la version de présentation. Le contenu de référence est conservé.
- Aucun service documentaire transversal n'est décrit dans les documents ou repéré dans `src/`. Aucun nouveau système documentaire financier n'est ajouté; si un tel service existe hors du dépôt, il devra être vérifié avant de conserver séparément un document généré.

### Dépendances antérieures non vérifiables dans les sources présentes

- **Échéance / échéancier :** `ECHEANCE_CREANCE` et `PLAN_REGLEMENT_CREANCE` sont les concepts sources validés des lots 1 à 5. Leurs attributs détaillés, cardinalités et transitions ne sont pas présents dans le dépôt; le lot 7 les réutilise sans les recréer ni les redéfinir.
- **Responsabilités financières actives :** elles sont une dépendance métier validée du domaine 2 et déterminent les destinataires autorisés. Le lot 7 la consomme sans la dupliquer; les détails de représentation du domaine 2 ne sont pas publiés dans ce dépôt.
- **Dates des événements sources :** `date_effet`, `date_enregistrement`, `date_reception_centrale` et `date_validation` restent la propriété des événements sources lorsqu'elles s'appliquent. Le lot 7 ne les duplique pas; les documents antérieurs disponibles ne précisent pas leurs propriétaires.

## 6. Domaine 4 — Lot 8 : concepts du MCD V1.0 gelé

**Statut : validé et gelé sous VAL-014 le 2026-11-04.** Les 17 concepts et associations ci-dessous sont l'inventaire du MCD V1.0; leurs définitions détaillées, attributs conceptuels, relations, cardinalités, règles et invariants sont ceux de `08-mcd-consolide-lot8.md`. Cet inventaire n'est ni un MLD ni une définition de tables physiques.

| Concept ou association | Responsabilité conceptuelle |
| --- | --- |
| `APPAREIL_SYNCHRONISATION` | Identifie durablement un appareil autorisé dans un établissement, indépendamment de ses installations. |
| `INSTALLATION_LOCALE` | Identifie une incarnation locale de l'application et de sa base sur un appareil. |
| `FLUX_SYNCHRONISATION` | Identifie un flux ordonné, partitionné et orienté de synchronisation. |
| `OPERATION_SYNCHRONISATION` | Regroupe les événements d'une action ou d'un traitement métier; ne détermine pas à elle seule l'atomicité. |
| `ENVELOPPE_EVENEMENT_SYNCHRONISATION` | Porte l'identité, l'opération, le flux et la séquence d'origine ainsi que les métadonnées de synchronisation d'un événement source. |
| `DEPENDANCE_EVENEMENT_SYNCHRONISATION` | Association réflexive orientée entre un événement prérequis et un événement dépendant. |
| `CURSEUR_SYNCHRONISATION` | Suit les progressions contiguës de réception et de traitement pour un flux et un récepteur logique déterminé. |
| `CONFLIT_SYNCHRONISATION` | Identifie une divergence ou concurrence à traiter selon le domaine propriétaire. |
| `ASSOCIATION_CONFLIT_EVENEMENT` | Relie le conflit à chaque événement concerné et en conserve le rôle. |
| `ASSOCIATION_CONFLIT_OPERATION` | Relie le conflit aux opérations concernées et en précise le rôle. |
| `DECISION_ARBITRAGE_SYNCHRONISATION` | Conserve le contenu immuable d'une décision humaine relative à un conflit. |
| `TRANSITION_APPLICABILITE_DECISION` | Association historique append-only des changements d'applicabilité et du remplacement d'une décision. |
| `APPLICATION_DECISION_ARBITRAGE` | Association historique append-only des tentatives et résultats d'application d'une décision. |
| `SAUVEGARDE_LOCALE` | Référence un instantané identifiable d'une installation, vérifiable pour une reprise contrôlée. |
| `OPERATION_RESTAURATION` | Trace la restauration d'une sauvegarde vers un appareil et une installation cibles. |
| `ASSOCIATION_RECUPERATION_EVENEMENT` | Relie une restauration autorisée à chaque événement historique récupérable, sans réécrire sa provenance. |
| `TENTATIVE_TRANSMISSION_SYNCHRONISATION` | Trace chaque tentative d'émission, l'installation émettrice actuelle et l'utilisateur associé lorsqu'il existe. |

## 7. Domaine 5 — Pédagogie

Le domaine pédagogique V1.0 est gelé sous VAL-015. L'inventaire ci-dessous reprend sans modification ses concepts et associations depuis `09-dossier-pedagogique-preliminaire.md`; le statut d'attente figurant dans ce document spécialisé est antérieur à VAL-015. Les détails normatifs restent dans cette référence et dans la décision VAL-015.

| Concept ou association gelé sous VAL-015 | Responsabilité conceptuelle |
| --- | --- |
| `PROGRAMME_SCOLAIRE`, `VERSION_PROGRAMME` | Programme et définition immuable de ses versions. |
| `VERSION_CYCLE`, `VERSION_NIVEAU`, `VERSION_SPECIALITE` | Associations de portée vers les référentiels existants; la spécialité dépend d'un référentiel existant. |
| `MATIERE`, `PROGRAMME_MATIERE` | Référentiel des matières et lien d'une matière au contenu d'une version. |
| `ENSEIGNEMENT`, `AFFECTATION_ENSEIGNANT` | Organisation d'un enseignement et rattachement temporel d'un enseignant. |
| `EVALUATION`, `BAREME` | Évaluation datée et échelle/version de notation. |
| `NOTE`, `REVISION_NOTE` | Note d'une inscription à une évaluation et chaîne historique de sa valeur/correction/annulation. |
| `METHODE_CALCUL_RESULTAT` | Méthode versionnée, paramètres et règles de calcul. |
| `RESULTAT_SCOLAIRE` | Généralisation abstraite des trois sous-types; aucune occurrence indépendante. |
| `RESULTAT_MATIERE`, `RESULTAT_PERIODE`, `RESULTAT_ANNUEL` | Résultats agrégés de matière, période et année; chacun a son périmètre fonctionnel. |
| `CONTRIBUTION_RESULTAT_NOTE` | Contribution d'une révision exacte d'une note à un résultat. |
| `CONTRIBUTION_RESULTAT_SCOLAIRE` | Contribution d'un résultat scolaire antérieur à un résultat cible (PED-A10). |
| `BULLETIN_SCOLAIRE`, `LIGNE_BULLETIN` | Publication et lignes dont le contenu historique est figé. |
| `CONSEIL_CLASSE`, `AVIS_CONSEIL_PROGRESSION` | Conseil et avis éventuel, distinct de toute décision individuelle. |
| `DECISION_PROGRESSION` | Concept unique, partagé avec les domaines 1 et 3; PED-A08 attribue sa propriété au domaine pédagogique et son application administrative à l'organisation scolaire. |
| `TRACE_SUIVI_PEDAGOGIQUE` | Observation ou action de suivi pédagogique durable, selon le concept gelé sous VAL-015. |

Cette liste fait partie du MCD pédagogique V1.0 gelé sous VAL-015. PED-A01 à PED-A10 et PED-I01 à PED-I03 restent intégrées. Les référentiels et responsabilités gelés des domaines existants ne sont pas redéfinis. Les attributs, relations et cardinalités normatifs sont détaillés dans le dossier lié et préservés par VAL-015.

## 8. Identifiants, attributs et contraintes

- Convention générale documentée : les identifiants techniques utiliseront des UUID; les identifiants propres à chaque entité ne sont pas détaillés ici.
- Règle spécifique documentée : le matricule de l'élève est unique à l'échelle de l'établissement et ne peut pas être réattribué.
- Un UUID identifie globalement un objet conceptuel et n'est pas un identifiant métier local. Aucun autre identifiant local ou périmètre d'unicité n'est déduit sans règle propriétaire.
- La frontière de propriété est l'établissement. Dans la V1, un établissement est prévu par déploiement; plusieurs appareils et installations locales relèvent de cet établissement. Les données restent attribuables à un seul établissement par les liens propriétaires documentés. Les rattachements directs déjà validés (notamment appareil/établissement au lot 8) sont conservés; ils ne sont pas dupliqués dans chaque entité.
- Les références entre objets doivent rester dans le même établissement. Pour les lots financiers 1 à 5, les sources détaillées absentes ne permettent pas d'auditer le rattachement direct ou hérité ni le contrôle exact des références; aucun lien n'est ajouté.
- Les critères d'identification du document généré figurent à la section 5 comme métadonnées conceptuelles; ils ne constituent pas une définition physique d'entité.
- Les attributs et contraintes conceptuels du domaine pédagogique sont gelés sous VAL-015 et détaillés dans `09-dossier-pedagogique-preliminaire.md`; le statut imprimé dans cette référence est antérieur à VAL-015. Pour les autres entités des domaines existants, aucun attribut ou identifiant supplémentaire n'est inféré ici à partir des sources examinées.

## 9. Contrôle des doublons et informations manquantes

- « Décision de progression » est une seule entité conceptuelle du domaine pédagogique, gelée sous VAL-015; l'organisation scolaire en assure l'application administrative selon les règles existantes. L'avis de conseil demeure distinct. Les transitions sont celles de la référence pédagogique, sans mécanisme concurrent organisationnel.
- Les responsabilités, contacts et relations avec un responsable ne doivent pas être fusionnés en une entité par supposition.
- L'équivalence éventuelle entre dette et créance, ainsi que le statut d'« encaissement » par rapport à « paiement », restent à clarifier.
- Le découpage financier des concepts historiques par lot, les attributs détaillés et les cardinalités ne sont pas documentés.
- Le crédit net est défini dans les règles comme crédit brut moins réservations centrales actives; les règles de composition détaillées du crédit brut et du crédit réservé restent celles du lot 6 et ne sont pas redéfinies ici.
- Les relances, échéances et service documentaire transversal n'ont pas d'équivalent décrit dans les sources disponibles. Les concepts gelés du lot 7 sont distingués des entités propriétaires antérieures; aucun doublon ne peut être confirmé ni exclu sans les modèles détaillés des lots antérieurs et du domaine 2.
- L'appareil source, l'identité d'un événement, les flux et curseurs, les conflits, l'arbitrage et la reprise relèvent du MCD du lot 8 gelé sous VAL-014. Les choix techniques et opérationnels encore ouverts sont énumérés dans la section 8 de `08-mcd-consolide-lot8.md`; ils ne rouvrent pas les décisions conceptuelles.
