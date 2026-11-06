# LOT 8 — MCD CONSOLIDÉ V1.0

## Synchronisation Offline-First, intégrité et reprise

**Périmètre :** ERP scolaire multi-appareils Offline-First  
**Environnement cible :** application PWA, bases locales indépendantes et serveur central  
**Fuseau horaire de référence :** Africa/Brazzaville (UTC+1)  
**Statut : MCD V1.0 VALIDÉ ET GELÉ SOUS VAL-014 LE 2026-11-04**  
**Dépendances :** Domaines 1 à 4 et décisions transversales précédemment validées. Le lot 7 demeure gelé sous VAL-013.

---

# 1. OBJECTIF ET PÉRIMÈTRE

Le lot 8 définit les concepts permettant aux appareils de produire et recevoir des événements hors connexion, puis de les synchroniser avec le serveur central. Il couvre l'identité des appareils, installations et flux, la transmission bidirectionnelle, les dépendances, les conflits, l'arbitrage, la sauvegarde, la restauration et la reprise.

Le lot 8 transporte les faits métier appartenant aux domaines sources. Il ne redéfinit ni leurs règles, ni leurs entités, ni leurs décisions d'atomicité. En particulier, il ne modifie aucune règle financière des lots 1 à 7. Le lot 7 reste gelé sous VAL-013; ses invariants FIN-LOT7-001 à FIN-LOT7-028 ne sont pas rouverts.

Les éléments de ce document sont conceptuels. Ils ne constituent ni un MLD, ni des tables physiques, ni du SQL ou des migrations. Une association conceptuelle n'impose pas à elle seule une table physique.

# 2. PRINCIPES FONDAMENTAUX

## 2.1. Autorité et immutabilité

L'état local représente ce que l'installation connaît; il ne prouve pas l'état central. Le serveur accepte ou refuse les événements selon l'autorisation courante et les règles du domaine propriétaire. Un événement créé, son identité, son contenu et sa provenance ne sont pas réécrits silencieusement. Une correction produit un nouvel événement selon le domaine propriétaire.

## 2.2. Idempotence et reprise

Une retransmission conserve les identifiants, l'opération et la position de flux d'origine. Un événement déjà reçu ou traité retourne son résultat connu sans répéter son effet métier. L'appareil conserve les événements non acquittés jusqu'à la réception durable du résultat correspondant.

## 2.3. Causalité et conflits

L'ordre de séquence n'est établi qu'à l'intérieur de son flux. Aucune chronologie globale artificielle n'est imposée entre appareils. Les dépendances métier explicitement requises sont distinctes de l'ordre local. Les versions concurrentes restent consultables; les conflits sensibles requièrent une décision humaine autorisée et appliquée selon le domaine propriétaire.

## 2.4. Sécurité transversale

Le lot 8 réutilise les identités d'utilisateurs, les rôles, les permissions et les mécanismes d'authentification déjà définis transversalement. Il n'introduit aucun compte, rôle ou système de permissions autonome et ne stocke aucun secret d'authentification dans le MCD. La validation de l'autorisation de synchronisation relève du serveur.

# 3. DICTIONNAIRE DES ENTITÉS ET ASSOCIATIONS

Les attributs ci-dessous sont conceptuels. Les identifiants cités sont des concepts d'identification; aucun choix de clé physique n'est fait.

## 3.1. APPAREIL_SYNCHRONISATION

Identifie durablement un appareil autorisé dans un établissement, indépendamment des installations qui s'y succèdent.

Attributs : `id_appareil`, `id_etablissement`, `date_enregistrement`, `date_derniere_activite` (facultatif), `etat_appareil`, `date_suspension` (facultatif), `date_revocation` (facultatif), `motif_suspension_revocation` (facultatif).

L'identité stable n'est pas copiée lors d'une nouvelle installation. L'état d'autorisation décrit notamment l'enregistrement, l'activité, la suspension et la révocation. L'appareil révoqué ne peut pas se réautoriser lui-même.

## 3.2. INSTALLATION_LOCALE

Identifie une incarnation locale de l'application et de sa base sur un appareil. Elle différencie les installations successives d'un même appareil.

Attributs : `id_installation`, `id_appareil`, `date_creation`, `date_fin` (facultatif), `version_application`, `version_schema_local`, `etat_installation`, `numero_generation` ou identité de génération non réutilisable.

Une réinstallation crée une nouvelle identité d'installation et une nouvelle génération de flux. Elle doit être enregistrée et autorisée séparément; elle n'hérite pas automatiquement de l'autorisation d'une installation antérieure. Une restauration sur la même installation peut reprendre la génération seulement après réconciliation. Une installation sur un autre appareil ne reprend jamais l'identité d'appareil de la sauvegarde.

## 3.3. FLUX_SYNCHRONISATION

Identifie un flux ordonné et partitionné de synchronisation. Son identité est un UUID stable, créé avant l'émission du premier événement du flux. Le serveur central logique émet les flux descendants dans le contexte d'un établissement déterminé; il ne constitue pas une entité métier.

Attributs : `id_flux`, `origine_flux` (INSTALLATION_LOCALE ou SERVEUR_CENTRAL), `id_installation_emettrice` (facultatif selon l'origine), `id_etablissement_contexte` (facultatif selon l'origine), `sens_flux` (APPAREIL_VERS_SERVEUR ou SERVEUR_VERS_APPAREIL), `identifiant_partition`, `date_creation`, `etat_flux`, `derniere_sequence_attribuee`.

Contraintes d'origine mutuellement exclusives : si `origine_flux` vaut INSTALLATION_LOCALE, `id_installation_emettrice` est obligatoire et `id_etablissement_contexte` est absent; l'établissement est dérivé de l'installation et de son appareil. Si `origine_flux` vaut SERVEUR_CENTRAL, `id_installation_emettrice` est absent et `id_etablissement_contexte` est obligatoire. Dans ce second cas, le serveur logique émet le flux pour l'établissement explicitement référencé. Exactement un des deux chemins d'origine est renseigné.

La valeur INSTALLATION_LOCALE correspond au sens APPAREIL_VERS_SERVEUR; la valeur SERVEUR_CENTRAL correspond au sens SERVEUR_VERS_APPAREIL.

Les positions positives sont attribuées dans un seul flux, dans un ordre strictement croissant et sans réutilisation. L'attribution de séquence et l'enregistrement durable de l'événement sont une seule opération logique. Un événement et sa position restent attachés à leur flux d'origine après retransmission ou restauration. Une nouvelle installation crée de nouveaux flux; elle ne repart pas à une ancienne position. L'unicité conceptuelle d'une position est le couple `(id_flux, numero_sequence)`.

## 3.4. OPERATION_SYNCHRONISATION

Regroupe les événements issus d'une même action locale ou d'un même traitement métier, à des fins de cohérence, de résultat et de reprise. Cette opération n'est ni un lot de transport ni, par elle-même, une unité d'atomicité métier.

Attributs : `id_operation`, `origine_operation` (INSTALLATION_LOCALE ou SERVEUR_CENTRAL), `id_installation_origine` (facultatif selon l'origine), `id_etablissement_contexte` (facultatif selon l'origine), `reference_operation_metier` (facultatif, qualifiée par le domaine source), `id_utilisateur_auteur_metier` (facultatif si l'action est automatisée ou si le domaine source conserve déjà l'auteur), `domaine_proprietaire`, `portee_atomicite_declaree` (déclarée par le domaine propriétaire), `nombre_evenements_attendus`, `date_creation_locale`, `date_reception_initiale` (facultatif), `date_reception_complete` (facultatif), `resultat_traitement` (facultatif).

Contraintes d'origine mutuellement exclusives : si `origine_operation` vaut INSTALLATION_LOCALE, `id_installation_origine` est obligatoire et `id_etablissement_contexte` est absent; l'établissement est dérivé de l'installation et de son appareil. Si `origine_operation` vaut SERVEUR_CENTRAL, `id_installation_origine` est absent et `id_etablissement_contexte` est obligatoire. Dans ce second cas, le serveur logique est à l'origine de l'opération dans le contexte de l'établissement explicitement référencé. Exactement un des deux chemins d'origine est renseigné.

L'identité de l'opération est un UUID stable, attribué avant la première transmission et conservé à chaque retry. Le contenu immuable de référence de son manifeste comprend le domaine propriétaire, le nombre attendu, la référence métier éventuelle, ainsi que les identifiants et rangs des événements qui la composent. Une opération reçue ou traitée avec le même identifiant et le même manifeste retourne son résultat connu sans nouvel effet. La même identité accompagnée d'un manifeste différent constitue une anomalie bloquante. Cette déduplication de l'opération est distincte de la déduplication de chaque événement.

Le nombre attendu est défini une seule fois sur l'opération et immuable dès la première transmission. Le serveur connaît la complétude quand il a reçu durablement ce nombre d'événements distincts appartenant à l'opération, avec des rangs d'opération uniques et couvrant la plage attendue, quel que soit le nombre de flux d'origine participants. Une opération reçue incomplètement n'est pas finalisée. Le domaine propriétaire déclare si l'opération est non atomique ou atomique et possède les règles de traitement. Le lot 8 collecte les résultats de transport sur tous les flux, mais ne fournit pas de transaction distribuée inter-flux. Une opération déclarée atomique et répartie sur plusieurs flux n'est admissible que si le traitement du domaine propriétaire garantit son application ou son rejet intégral après réception complète; sinon le domaine doit contraindre ses événements atomiques à un seul flux. Une opération non atomique peut recevoir des résultats indépendants par événement, selon les règles du domaine propriétaire.

Tous les événements membres doivent respecter le même chemin d'origine que l'opération. Pour `origine_operation` = INSTALLATION_LOCALE, chaque événement doit référencer un flux dont `origine_flux` = INSTALLATION_LOCALE et dont `id_installation_emettrice` est égal à `id_installation_origine` de l'opération. Pour `origine_operation` = SERVEUR_CENTRAL, chaque événement doit référencer un flux dont `origine_flux` = SERVEUR_CENTRAL et dont `id_etablissement_contexte` est égal à celui de l'opération. Une opération ne peut pas mélanger ces chemins ni les installations ou établissements. Elle peut regrouper plusieurs flux lorsque tous satisfont ces contraintes.

## 3.5. ENVELOPPE_EVENEMENT_SYNCHRONISATION

Porte l'identité et les métadonnées de synchronisation d'un événement métier source, sans devenir propriétaire de son contenu ou de ses règles.

Attributs : `id_evenement`, `id_operation`, `id_flux_origine`, `numero_sequence_origine`, `type_evenement`, `type_entite_source`, `id_entite_source`, `reference_contenu_metier_immuable`, `ordre_dans_operation`, `version_enveloppe`, `version_evenement`, `version_application_emettrice`, `date_creation_locale` (si applicable), `date_reception_durable` (facultatif), `empreinte_integrite` (facultatif), `motif_incompatibilite` (facultatif).

L'UUID d'événement est attribué avant la première transmission. Il reste stable lors de tous les retries et lors d'une récupération depuis une sauvegarde. Le flux et la séquence d'origine restent inchangés; le nouvel émetteur est décrit dans la tentative de transmission et non en réécrivant l'événement. La provenance d'installation, lorsqu'elle existe, est obtenue par `id_flux_origine` et sa relation à l'installation émettrice; elle n'est pas dupliquée comme attribut de l'événement. Pour un flux d'origine centrale, aucune installation d'origine locale n'est attribuée. Le contenu métier de référence est le fait/événement immuable défini par le domaine propriétaire, représenté par le type, la version métier et le corps complet de l'événement dans sa représentation canonique déterministe. Cette représentation est capturée à la création et conservée ou référencée de manière immuable. Toute retransmission est comparée intégralement à cette représentation, sans réinterpréter les règles métier. Une empreinte peut accélérer la détection d'écarts mais ne remplace pas la comparaison canonique. Une identité associée à un contenu métier différent est bloquée, même si son empreinte déclarée correspond à l'enveloppe retransmise. `nombre_evenements_operation` n'est pas répété sur chaque événement. Le rang d'opération est distinct de la séquence du flux.

## 3.6. DEPENDANCE_EVENEMENT_SYNCHRONISATION

Association réflexive orientée entre un événement prérequis et un événement dépendant. Elle ne se confond pas avec l'ordre de séquence.

Attributs de l'association : `type_dependance`, `date_identification`, `caractere_obligatoire`.

Une dépendance circulaire est une anomalie bloquante. Les relations métier ne deviennent pas automatiquement des dépendances de synchronisation.

## 3.7. CURSEUR_SYNCHRONISATION

Suit, pour un flux et son récepteur, les progressions contiguës de réception durable et de traitement définitif. Le sens est celui du flux référencé; il ne se déduit pas du nom du curseur.

Attributs : `id_curseur`, `id_flux`, `type_recepteur` (SERVEUR_CENTRAL ou INSTALLATION_LOCALE), `id_installation_recepteur` (obligatoire seulement pour INSTALLATION_LOCALE), `derniere_sequence_recue_durable_contigue`, `derniere_sequence_traitee_definitivement_contigue`, `date_derniere_reception`, `date_derniere_progression_traitement`.

Pour APPAREIL_VERS_SERVEUR, le récepteur logique est le serveur central. Pour SERVEUR_VERS_APPAREIL, le récepteur est une installation locale déterminée, et non l'appareil abstrait qui peut en avoir plusieurs successivement. Le couple flux/récepteur identifie un curseur unique. Les deux progressions ne dépassent ni une séquence manquante ni un événement qui n'a pas de résultat terminal. Les résultats individuels restent consultables lorsque la progression contiguë est bloquée.

## 3.8. CONFLIT_SYNCHRONISATION

Identifie une divergence ou une concurrence à traiter, conserve son motif et suit son état sans trancher à la place du domaine propriétaire.

Attributs : `id_conflit`, `type_conflit`, `nature_conflit`, `date_detection`, `motif_detection`, `etat_conflit`, `date_resolution` (facultatif).

## 3.9. ASSOCIATION_CONFLIT_EVENEMENT

Association conceptuelle entre un conflit et chaque événement concerné. Elle conserve le rôle de l'événement et la traçabilité du lien.

Attributs : `id_conflit`, `id_evenement`, `role_evenement_dans_conflit` (par exemple version concurrente, événement initial, prérequis, événement déclencheur), `date_association`, `motif_association`.

Une même paire conflit/événement n'est associée qu'une fois pour un rôle déterminé; si plusieurs rôles sont nécessaires, ils sont explicitement distingués.

## 3.10. ASSOCIATION_CONFLIT_OPERATION

Association conceptuelle entre un conflit et les opérations concernées. Elle permet de tracer les opérations affectées, y compris lorsque l'association est obtenue via plusieurs événements.

Attributs : `id_conflit`, `id_operation`, `role_operation_dans_conflit`, `date_association`, `motif_association`.

L'association doit être cohérente avec les événements concernés ou préciser qu'il s'agit d'une opération affectée indirectement. Une opération sans relation avec les événements ou leur domaine ne peut être ajoutée au conflit arbitrairement.

## 3.11. DECISION_ARBITRAGE_SYNCHRONISATION

Conserve le contenu immuable d'une décision humaine relative à un conflit. Son applicabilité et le résultat de chaque tentative d'application sont consignés séparément dans des associations d'historique append-only.

Attributs immuables : `id_decision`, `id_conflit`, `id_utilisateur_arbitre` (référence au système transversal d'utilisateurs), `type_decision`, `reference_version_retenue` (facultatif), `date_decision`, `justification`.

L'auteur doit disposer, au moment de la décision, des permissions existantes couvrant le conflit et l'action. Plusieurs décisions successives sont conservées. Les changements d'applicabilité sont enregistrés dans `TRANSITION_APPLICABILITE_DECISION`; au plus une décision par conflit peut être courante et applicable. Les tentatives et résultats d'application sont consignés séparément dans `APPLICATION_DECISION_ARBITRAGE`. Ni une décision ni une transition historique ne sont réécrites. L'application suit les règles du domaine propriétaire et ne modifie jamais les événements originaux.

## 3.12. TRANSITION_APPLICABILITE_DECISION

Association historique append-only qui enregistre chaque changement d'applicabilité d'une décision, sans modifier le contenu de la décision ni remplacer les transitions passées.

Attributs : `id_transition`, `id_decision`, `type_transition` (RETENUE, REMPLACEE, ANNULEE), `date_transition`, `id_utilisateur_auteur_transition` (facultatif pour une transition automatisée), `id_decision_remplacante` (facultatif hors transition de remplacement).

L'applicabilité courante est déterminée par la dernière transition valide de chaque décision et la chaîne explicite de remplacement du conflit. La relation réflexive entre une décision remplacée et sa décision remplaçante est portée par cette transition : `id_decision` référence la décision antérieure et `id_decision_remplacante` son successeur. Elle ne modifie pas le contenu immuable de DECISION_ARBITRAGE_SYNCHRONISATION. Le remplacement est enregistré de façon cohérente sur l'ancienne et la nouvelle décision; ces transitions sont appliquées atomiquement afin qu'il n'existe jamais deux décisions courantes applicables.

Le lien logique réflexif de remplacement entre deux `DECISION_ARBITRAGE_SYNCHRONISATION` est donc représenté par `TRANSITION_APPLICABILITE_DECISION`; `id_decision_remplacante` reste dans cette association historique afin de ne pas ajouter après coup un attribut au contenu immuable de la décision.

## 3.13. APPLICATION_DECISION_ARBITRAGE

Association historique append-only qui conserve chaque tentative d'application d'une décision.

Attributs : `id_application`, `id_decision`, `date_tentative`, `resultat_application` (APPLIQUEE ou ECHEC), `motif_echec` (facultatif), `id_utilisateur_application` (facultatif si application automatisée selon le domaine).

Une nouvelle tentative crée une nouvelle occurrence. Le résultat courant est déduit des tentatives enregistrées; une tentative antérieure n'est pas modifiée.

## 3.14. SAUVEGARDE_LOCALE

Référence un instantané identifiable, produit à partir d'une installation donnée et destiné à permettre une reprise contrôlée.

Attributs : `id_sauvegarde`, `id_appareil_origine`, `id_installation_origine`, `date_creation`, `type_sauvegarde`, `version_application`, `version_schema_local`, `perimetre_sauvegarde`, `reference_stockage`, `resultat_verification_integrite`, `date_verification` (facultatif), `empreinte_integrite` (facultatif).

La sauvegarde préserve au minimum les événements non acquittés, identifiants d'opération, identifiants et séquences de flux, dépendances, résultats connus et curseurs présents au moment de sa création. Elle n'est pas une autorité centrale.

## 3.15. OPERATION_RESTAURATION

Trace une restauration vers un appareil et une installation cible, qui peuvent être différents de l'origine.

Attributs : `id_restauration`, `id_sauvegarde`, `id_appareil_cible`, `id_installation_cible`, `date_demande`, `date_debut`, `date_fin` (facultatif), `etat_restauration`, `resultat_verification`, `date_reconciliation_centrale` (facultatif), `motif_echec` (facultatif).

La cible conserve son identité propre. Une restauration sur un autre appareil ne clone ni l'appareil, ni son autorisation, ni l'identité de son installation. Une restauration vérifie l'intégrité puis réconcilie événements, résultats et curseurs avec le serveur central avant la reprise normale. Les événements déjà acquittés ne créent aucun nouvel effet; les événements non acquittés gardent leur identité et leur provenance, puis sont rejoués de façon idempotente sous autorisation contrôlée. Une reprise sur un nouveau flux ne réattribue pas les anciennes positions aux nouveaux événements.

## 3.16. ASSOCIATION_RECUPERATION_EVENEMENT

Association entre une restauration autorisée et chaque événement historique d'origine qu'elle permet de récupérer. Elle distingue la provenance source de l'autorisation de retransmission depuis une installation cible.

Attributs : `id_restauration`, `id_evenement_origine`, `id_utilisateur_autorisateur`, `date_autorisation`, `resultat_autorisation`, `motif`.

L'utilisateur autorisateur est vérifié par les permissions transversales existantes et l'établissement concerné. L'association ne modifie ni l'événement, ni son flux, ni sa séquence. Elle s'applique au cas d'une récupération depuis un appareil ou une installation révoquée/perdue; une simple restauration ne confère pas automatiquement le droit de retransmission.

## 3.17. TENTATIVE_TRANSMISSION_SYNCHRONISATION

Association historique append-only représentant une tentative réelle d'émission d'un événement. Elle permet de distinguer l'installation qui a produit l'événement de celle qui transmet actuellement cet événement.

Attributs : `id_tentative`, `id_evenement`, `id_installation_emettrice_actuelle` (facultatif pour une émission centrale), `id_utilisateur_synchronisation` (facultatif pour une synchronisation automatisée), `id_association_recuperation` (facultatif lorsqu'il s'agit d'une récupération autorisée), `date_tentative`, `resultat_tentative`, `motif_echec` (facultatif).

Chaque retry crée une tentative distincte. L'installation et l'utilisateur associés sont ceux de cette tentative; ils ne remplacent pas la provenance historique de l'événement. Aucun secret ou jeton d'authentification n'est conservé dans cette association.

Pour une transmission ordinaire depuis l'installation d'origine, `id_association_recuperation` peut être absent. Si l'installation émettrice actuelle diffère de l'installation d'origine de l'événement, l'attribut est obligatoire et doit référencer une association d'autorisation valide portant sur cet événement et la restauration concernée. Une récupération inter-installation sans autorisation valide est refusée.

# 4. RELATIONS ET CARDINALITÉS

Dans ce tableau, les cardinalités sont indiquées dans l'ordre « concept A (min,max) — concept B (min,max) ».

| Relation                                                                | Cardinalités                                                                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Établissement — APPAREIL_SYNCHRONISATION                                | Établissement (0,N) — Appareil (1,1)                                                                                                  |
| Appareil — INSTALLATION_LOCALE                                          | Appareil (0,N) — Installation (1,1)                                                                                                   |
| Installation — FLUX_SYNCHRONISATION (origine locale)                    | Installation (0,N) — Flux (0,1), obligatoire si `origine_flux` = INSTALLATION_LOCALE                                                 |
| Serveur central logique — FLUX_SYNCHRONISATION (origine centrale)       | Serveur (0,N) — Flux (0,1), obligatoire si `origine_flux` = SERVEUR_CENTRAL                                                         |
| Établissement — FLUX_SYNCHRONISATION (contexte central)                 | Établissement (0,N) — Flux (0,1), obligatoire si `origine_flux` = SERVEUR_CENTRAL                                                   |
| Installation — OPERATION_SYNCHRONISATION (origine locale)               | Installation (0,N) — Opération (0,1), obligatoire si `origine_operation` = INSTALLATION_LOCALE                                      |
| Serveur central logique — OPERATION_SYNCHRONISATION (origine centrale)  | Serveur (0,N) — Opération (0,1), obligatoire si `origine_operation` = SERVEUR_CENTRAL                                               |
| Établissement — OPERATION_SYNCHRONISATION (contexte central)            | Établissement (0,N) — Opération (0,1), obligatoire si `origine_operation` = SERVEUR_CENTRAL                                         |
| Flux — ENVELOPPE_EVENEMENT_SYNCHRONISATION                              | Flux (0,N) — Événement (1,1)                                                                                                          |
| Installation d'origine — Événement (dérivé du flux local)                | Installation (0,N) — Événement (0,1), uniquement si le flux d'origine est local                                                       |
| OPERATION_SYNCHRONISATION — FLUX_SYNCHRONISATION (via les événements)    | Opération (1,N) — Flux (0,N), relation dérivée des flux des événements membres                                                       |
| Établissement propriétaire — ENVELOPPE_EVENEMENT_SYNCHRONISATION        | Établissement (0,N) — Événement (1,1), via l'accord entre l'opération et le flux d'origine                                           |
| Opération — Événement                                                   | Opération (1,N) — Événement (1,1); les événements d'une opération peuvent provenir d'un ou plusieurs flux                             |
| Flux — CURSEUR_SYNCHRONISATION                                          | Flux (0,N) — Curseur (1,1); APPAREIL_VERS_SERVEUR : un curseur côté serveur; SERVEUR_VERS_APPAREIL : un par installation destinataire |
| Installation destinataire — CURSEUR_SYNCHRONISATION                     | Installation (0,N) — Curseur (1,1), uniquement lorsque le récepteur est une installation                                              |
| Serveur central logique — CURSEUR_SYNCHRONISATION                       | Récepteur central (0,N) — Curseur (1,1), uniquement pour les flux entrants au serveur                                                 |
| Événement prérequis — DEPENDANCE — événement dépendant                  | Prérequis (0,N) — Dépendance (1,1); Dépendant (0,N) — Dépendance (1,1)                                                                |
| Conflit — ASSOCIATION_CONFLIT_EVENEMENT — Événement                     | Conflit (1,N) — Association (1,1); Événement (0,N) — Association (1,1)                                                                |
| Conflit — ASSOCIATION_CONFLIT_OPERATION — Opération                     | Conflit (1,N) — Association (1,1); Opération (0,N) — Association (1,1)                                                                |
| Conflit — Décision d'arbitrage                                          | Conflit (0,N) — Décision (1,1)                                                                                                        |
| Utilisateur transversal — Décision d'arbitrage                          | Utilisateur (0,N) — Décision (1,1)                                                                                                    |
| Décision — TRANSITION_APPLICABILITE_DECISION                            | Décision (0,N) — Transition (1,1)                                                                                                     |
| Utilisateur transversal — TRANSITION_APPLICABILITE_DECISION             | Utilisateur (0,N) — Transition (0,1) si transition automatisée                                                                        |
| Décision — APPLICATION_DECISION_ARBITRAGE                               | Décision (0,N) — Tentative d'application (1,1)                                                                                        |
| Utilisateur transversal — APPLICATION_DECISION_ARBITRAGE                | Utilisateur (0,N) — Tentative d'application (0,1) si application automatisée                                                          |
| Décision remplacée — TRANSITION_APPLICABILITE_DECISION                  | Décision (0,1) — Transition (0,1) lorsque type REMPLACEE                                                                              |
| Décision remplaçante — TRANSITION_APPLICABILITE_DECISION                | Décision (0,1) — Transition (0,1) lorsque la transition désigne cette décision comme remplaçante                                      |
| Utilisateur transversal — OPERATION_SYNCHRONISATION (auteur métier)     | Utilisateur (0,N) — Opération (0,1)                                                                                                   |
| Événement — TENTATIVE_TRANSMISSION_SYNCHRONISATION                      | Événement (0,N) — Tentative (1,1)                                                                                                     |
| Installation émettrice actuelle — Tentative de transmission             | Installation (0,N) — Tentative (0,1) si émission centrale                                                                             |
| Utilisateur transversal — Tentative de transmission                     | Utilisateur (0,N) — Tentative (0,1) si transmission automatisée                                                                       |
| Restauration — ASSOCIATION_RECUPERATION_EVENEMENT — Événement d'origine | Restauration (0,N) — Association (1,1); Événement (0,N) — Association (1,1)                                                           |
| Utilisateur transversal — Autorisation de récupération                  | Utilisateur (0,N) — Association de récupération (1,1)                                                                                 |
| ASSOCIATION_RECUPERATION_EVENEMENT — TENTATIVE_TRANSMISSION             | Association (0,N) — Tentative (0,1); référence obligatoire si l'installation émettrice diffère de l'origine de l'événement               |
| Appareil d'origine — Sauvegarde                                         | Appareil (0,N) — Sauvegarde (1,1)                                                                                                     |
| Installation d'origine — Sauvegarde                                     | Installation (0,N) — Sauvegarde (1,1)                                                                                                 |
| Sauvegarde — Opération de restauration                                  | Sauvegarde (0,N) — Restauration (1,1)                                                                                                 |
| Appareil cible — Opération de restauration                              | Appareil (0,N) — Restauration (1,1)                                                                                                   |
| Installation cible — Opération de restauration                          | Installation (0,N) — Restauration (1,1)                                                                                               |

Précisions et contraintes conceptuelles :

1. Un établissement peut exister sans appareil enregistré; chaque appareil appartient à exactement un établissement.
2. Chaque événement appartient à une seule opération et un seul flux d'origine; sa séquence est unique dans ce flux. L'installation actuelle qui le retransmet est inscrite dans une tentative distincte.
3. Chaque opération a un nombre d'événements attendu positif, fixé avant le premier envoi. Chaque rang d'opération est unique au sein de l'opération et la complétude exige le nombre et les rangs attendus à travers tous les flux concernés.
4. Un lot de transport peut transporter plusieurs opérations indépendantes; il s'agit d'un regroupement temporaire, sans identité métier ni atomicité propre au lot 8.
5. L'opération de synchronisation ne rend pas les événements atomiques. Le domaine propriétaire déclare l'unité atomique et gère les résultats partiels des opérations non atomiques.
6. Pour une opération atomique répartie sur plusieurs flux, le domaine propriétaire doit assurer un traitement tout-ou-rien après réception complète; s'il ne le peut pas, les événements liés à cette unité atomique doivent être regroupés dans un seul flux.
7. Un conflit possède au moins une association à un événement et une à une opération concernée. Chaque événement et opération peuvent participer à zéro, un ou plusieurs conflits.
8. Un conflit peut recevoir zéro à plusieurs décisions historiques successives, mais une seule au plus est courante et applicable.
9. Une dépendance relie deux événements distincts; un événement peut être prérequis et/ou dépendant de plusieurs autres événements.
10. Chaque curseur appartient à un seul flux et à un seul récepteur logique. Le type récepteur vaut SERVEUR_CENTRAL avec identifiant d'installation nul, ou INSTALLATION_LOCALE avec une seule installation destinataire; les deux références ne peuvent être simultanément renseignées. Il existe exactement un curseur par couple flux/récepteur logique; un flux montant possède un curseur central et un flux descendant un curseur par installation destinataire.
11. L'établissement propriétaire d'une installation est celui de son appareil. Une origine locale d'opération ou de flux dérive son établissement de l'installation d'origine/émettrice; une origine centrale référence obligatoirement son `id_etablissement_contexte`. Les chemins locaux et centraux sont mutuellement exclusifs.
12. Chaque événement relie une opération et un flux d'origine de même établissement. Si l'opération est locale, le flux est local et son installation émettrice est celle de l'opération; si l'opération est centrale, le flux est central et son établissement de contexte est celui de l'opération. Ces chemins sont mutuellement exclusifs. Plusieurs flux par opération restent permis si ces règles sont respectées. Une restauration et toute récupération d'événement doivent rester dans l'établissement propriétaire de la sauvegarde/événement.
13. L'utilisateur auteur métier, l'utilisateur qui déclenche une synchronisation et l'utilisateur autorisant une récupération sont des références distinctes vers les utilisateurs transversaux. Un acteur automatisé peut ne pas avoir d'utilisateur humain associé.
14. L'utilisateur et ses permissions sont ceux du système transversal; le MCD lot 8 ne duplique pas ces concepts.

# 5. CYCLES DE VIE CONCEPTUELS

Les états ci-dessous sont des dimensions de cycle de vie conceptuelles; ils ne prescrivent pas un attribut persistant unique. Leur matérialisation éventuelle sera décidée au MLD.

## 5.1. Appareil et installation

- Appareil : ENREGISTRE, ACTIF, SUSPENDU, REVOQUE.
- Installation : ACTIVE, REMPLACEE, INACTIVE, A_RECONCILIER.
- Flux : OUVERT, SUSPENDU, CLOTURE; une séquence clôturée ne reprend pas dans une nouvelle génération.

La révocation est contrôlée par le serveur. Un appareil totalement hors ligne ne peut pas recevoir immédiatement l'information de révocation; ses envois seront refusés ou soumis à récupération contrôlée à la prochaine communication, selon l'autorisation serveur en vigueur.

## 5.2. Dimensions de l'événement

- **Transmission :** LOCAL, A_TRANSMETTRE, TRANSMIS, RETRY_EN_COURS, ERREUR_TEMPORAIRE, ERREUR_DEFINITIVE.
- **Réception :** NON_RECU, RECU_DURABLEMENT, ACCUSE_RECEPTION.
- **Traitement métier :** NON_TRAITE, EN_ATTENTE, VALIDE, REJETE_DEFINITIVEMENT, EN_CONFLIT, DECISION_ARBITRAGE_EN_ATTENTE, ARBITRE_A_APPLIQUER, ARBITRAGE_APPLIQUE, INCOMPATIBLE_TEMPORAIRE, REJET_FORMAT_DEFINITIF.
- **Acquittement :** NON_ACQUITTE, ACQUITTE.

Ces dimensions évoluent indépendamment. L'accusé de réception confirme la conservation durable du message; il ne signifie pas que le métier est validé. Une incompatibilité temporaire conserve l'événement en attente, sans résultat terminal, jusqu'à ce qu'une version compatible puisse le reprendre. Une incompatibilité définitive produit un rejet terminal explicite avec motif conservé. Un conflit non résolu ou une décision non appliquée n'est pas un résultat terminal de traitement.

## 5.3. Opération de synchronisation

La réception suit NON_RECUE, PARTIELLE, COMPLETE sur l'ensemble des flux contenant les événements attendus. Le traitement suit NON_DEMARRE, EN_COURS, EN_ATTENTE, TERMINE, REJET_GLOBAL selon la portée déclarée par le domaine propriétaire. Pour une opération atomique inter-flux, aucun événement participant n'est déclaré traité définitivement avant la décision tout-ou-rien du domaine; les curseurs de chaque flux restent bloqués à leurs positions correspondantes tant que le résultat n'est pas terminal. Le lot 8 garantit la collecte et le suivi de complétude par transport, mais ne garantit pas le commit atomique entre flux. Si le domaine ne sait pas appliquer cette unité sur tous les flux comme une transaction logique unique, il doit restreindre l'opération atomique à un seul flux. Le résultat d'une opération non atomique peut être composé de résultats événementiels distincts; chaque résultat partiel suit les règles du propriétaire et les curseurs progressent selon ces résultats indépendants. Ces dimensions ne sont pas fusionnées en une séquence linéaire.

## 5.4. Curseur

Pour chaque flux et récepteur, conserver séparément :

1. la dernière séquence contiguë reçue durablement;
2. la dernière séquence contiguë dont le traitement est définitif.

Est terminal pour la progression de traitement : événement validé; rejet métier définitif; rejet définitif d'incompatibilité avec motif enregistré; ou arbitrage dont la décision est effectivement appliquée selon le domaine propriétaire. N'est pas terminal : position absente, attente, conflit non résolu, incompatibilité temporaire, décision retenue mais non appliquée. Une incompatibilité temporaire bloque le curseur de traitement contigu jusqu'à reprise compatible. Un rejet de format définitif permet au curseur de franchir cette position une fois le résultat durablement enregistré; les autres dépendances métier et conditions d'atomicité restent applicables. Une séquence ultérieure peut être reçue et son résultat consulté, mais ne fait pas franchir silencieusement le curseur bloqué.

Un événement acquitté est un résultat durablement communiqué et conservé par son émetteur. L'acquittement seul ne transforme pas une attente ou un conflit en résultat terminal.

## 5.5. Conflit, décision, sauvegarde et restauration

- Conflit : DETECTE, EN_ANALYSE, EN_ATTENTE_ARBITRAGE, RESOLU_APRES_APPLICATION, CLOS selon le domaine.
- Décision : le contenu n'a pas de statut mutable. Son applicabilité est déduite des transitions append-only (RETENUE, REMPLACEE, ANNULEE); ses applications successives sont consignées séparément avec un résultat par tentative. Au plus une décision par conflit est courante et applicable.
- Sauvegarde : EN_COURS, TERMINEE, VERIFICATION_EN_COURS, VERIFIEE, INVALIDE, ECHEC.
- Restauration : DEMANDEE, SOURCE_VERIFIEE, EN_COURS, EN_RECONCILIATION, REPRISE_AUTORISEE, ECHEC.

# 6. RÈGLES MÉTIER CONSOLIDÉES

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

# 7. INVARIANTS RÉVISÉS

Les invariants ci-dessous conservent et précisent les garanties antérieures, puis ajoutent SYNC-076 à SYNC-083 pour les sept ambiguïtés de cet audit. Les invariants financiers du domaine 4 ne sont pas reproduits ni modifiés.

### L8-D01 — Identité, opérations et atomicité

- **SYNC-001 :** Chaque événement possède une identité unique et immuable.
- **SYNC-002 :** L'identité existe avant la première transmission.
- **SYNC-003 :** Toute retransmission réutilise l'identité et le contenu initiaux.
- **SYNC-004 :** Chaque événement appartient à une seule opération de synchronisation.
- **SYNC-005 :** Chaque opération attend au moins un événement.
- **SYNC-006 :** Chaque événement conserve sa provenance d'émission.
- **SYNC-007 :** Le contenu d'un événement créé ne peut être remplacé silencieusement.
- **SYNC-008 :** Une opération est complète seulement après réception durable de tous les événements attendus et de leurs rangs distincts sur tous les flux participants.
- **SYNC-009 :** L'opération de synchronisation ne détermine pas l'atomicité métier; le domaine propriétaire déclare l'unité atomique et le traitement des résultats partiels non atomiques.
- **SYNC-010 :** Une atomicité inter-flux n'est admissible que si le domaine propriétaire garantit l'application ou le rejet tout-ou-rien après réception complète; sinon les événements de l'unité atomique sont contraints à un seul flux.
- **SYNC-011 :** La retransmission d'un événement déjà traité ne produit aucun nouvel effet métier.
- **SYNC-012 :** Une identité réutilisée avec un contenu différent constitue une anomalie bloquante.

### L8-D02 — Installations, flux, séquences et dépendances

- **SYNC-013 :** Chaque événement appartient à un flux identifié et possède une séquence dans ce flux.
- **SYNC-014 :** Deux événements distincts d'un même flux ne partagent pas une position.
- **SYNC-015 :** L'ordre est préservé à l'intérieur d'un flux; aucun ordre global inter-appareils n'est inféré.
- **SYNC-016 :** Les dates locales seules ne prouvent pas l'ordre causal.
- **SYNC-017 :** Une position est attribuée durablement avec l'événement et n'est jamais réutilisée dans le même flux.
- **SYNC-018 :** Une nouvelle installation ouvre une nouvelle génération de flux et ne repart pas à une ancienne séquence.
- **SYNC-019 :** Les dépendances distinguent explicitement événement prérequis et événement dépendant.
- **SYNC-020 :** Une dépendance obligatoire non satisfaite empêche le traitement définitif du dépendant.
- **SYNC-021 :** Un prérequis absent ou en attente maintient le dépendant en attente.
- **SYNC-022 :** Le rejet définitif d'un prérequis bloque le dépendant sans propagation automatique d'un résultat métier.
- **SYNC-023 :** Un prérequis en conflit reste insatisfait jusqu'à résolution appliquée par le domaine propriétaire.
- **SYNC-024 :** Une dépendance circulaire est une anomalie bloquante.

### Complément L8-D02 — Curseurs bidirectionnels et résultats

- **SYNC-025 :** Chaque curseur référence exactement un flux et un récepteur logique.
- **SYNC-026 :** Le sens du flux indique sans ambiguïté si les données vont de l'appareil au serveur ou du serveur à l'appareil.
- **SYNC-027 :** Réception durable et traitement définitif sont deux progressions distinctes.
- **SYNC-028 :** Une progression contiguë ne franchit pas une position manquante.
- **SYNC-029 :** Une attente ne constitue pas un résultat terminal.
- **SYNC-030 :** Un conflit non résolu ne constitue pas un traitement définitif.
- **SYNC-031 :** Un rejet définitif est distinct d'une attente et peut compter comme résultat terminal dans son flux.
- **SYNC-032 :** Un arbitrage ne compte comme définitif qu'après application conformément au domaine propriétaire.
- **SYNC-033 :** L'acquittement confirme un résultat durablement communiqué; il ne convertit pas à lui seul un état non terminal en état terminal.
- **SYNC-034 :** Un conflit indépendant ne bloque pas les opérations qui n'en dépendent pas.

### L8-D03 — Conflits et arbitrage

- **SYNC-035 :** Toute version concurrente détectée reste conservée.
- **SYNC-036 :** Chaque lien conflit-événement porte le rôle de l'événement et sa trace d'association.
- **SYNC-037 :** Chaque conflit référence au moins un événement et une opération concernée.
- **SYNC-038 :** Chaque décision conserve son auteur utilisateur, sa date et sa justification.
- **SYNC-039 :** L'auteur possède les permissions transversales requises pour arbitrer.
- **SYNC-040 :** Plusieurs décisions successives peuvent être conservées pour un même conflit.
- **SYNC-041 :** Au plus une décision par conflit est courante et applicable.
- **SYNC-042 :** Une nouvelle décision applicable remplace explicitement la précédente.
- **SYNC-043 :** Une décision ne réécrit jamais un événement original.
- **SYNC-044 :** Le résultat, la date et, le cas échéant, l'échec d'application de chaque décision sont traçables.

### L8-D04 — Compatibilité et évolution

- **SYNC-045 :** Chaque événement conserve les versions originales de son enveloppe, de son format métier et de l'application émettrice.
- **SYNC-046 :** Un format inconnu n'est pas interprété arbitrairement; il est classé temporaire ou définitif selon la capacité réelle de reprise.
- **SYNC-047 :** Une mise à jour ne supprime pas les événements non acquittés.
- **SYNC-048 :** Toute transformation préserve l'identité et la provenance de l'événement.
- **SYNC-049 :** Une migration préserve les données nécessaires à la reprise.
- **SYNC-050 :** Une incompatibilité temporaire conserve l'événement en attente reprenable et ne termine pas la progression du curseur; une incompatibilité définitive conserve son motif de rejet terminal et peut terminer la position du curseur après enregistrement durable.

### L8-D05 — Sauvegarde et restauration

- **SYNC-051 :** Une sauvegarde possède une identité, une origine d'appareil et d'installation ainsi que des références de version.
- **SYNC-052 :** Une sauvegarde préserve événements non acquittés, opérations, flux, séquences, dépendances, résultats connus et curseurs.
- **SYNC-053 :** L'intégrité d'une sauvegarde est vérifiée avant restauration.
- **SYNC-054 :** Une restauration conserve l'identité de l'appareil cible et ne clone jamais celle de l'origine.
- **SYNC-055 :** Une restauration est réconciliée avec l'état central avant reprise normale.
- **SYNC-056 :** Les événements déjà acquittés ne produisent pas de nouvel effet après restauration.
- **SYNC-057 :** Les événements non acquittés gardent leurs identifiants et leur provenance après restauration.
- **SYNC-058 :** Une restauration interrompue ne détruit pas la seule copie exploitable.
# L8-D06 — Appareils, installations et révocation

- **SYNC-059 :** Chaque appareil possède une identité stable, distincte de ses installations, et appartient à exactement un établissement; un établissement peut n'avoir aucun appareil.
- **SYNC-060 :** Seul le serveur confirme l'autorisation de synchronisation et applique la révocation.
- **SYNC-061 :** Un client révoqué ne peut pas s'auto-réautoriser; ses données non transmises requièrent une récupération contrôlée.
- **SYNC-062 :** Suspension, révocation et récupération sont traçables.
- **SYNC-063 :** Une révocation hors ligne prend effet pour l'appareil lorsqu'il peut joindre le serveur; aucune notification instantanée n'est supposée.

### L8-D07 — Transport et supervision

- **SYNC-064 :** Un lot de transport peut contenir plusieurs opérations indépendantes.
- **SYNC-065 :** Le lot de transport ne constitue jamais une unité d'atomicité métier par lui-même.
- **SYNC-066 :** Chaque opération et événement conservent leur résultat individuel.
- **SYNC-067 :** Une erreur sur une opération indépendante ne rejette pas automatiquement les autres.
- **SYNC-068 :** Les erreurs temporaires, les incompatibilités temporaires et les rejets définitifs de format sont distingués; seul un résultat définitif enregistré peut être terminal.
- **SYNC-069 :** Les événements non acquittés restent disponibles pour reprise.
- **SYNC-070 :** Les tentatives de transmission sont traçables.
- **SYNC-071 :** La supervision ne modifie aucune donnée métier.
- **SYNC-072 :** Les journaux techniques n'exposent pas inutilement les données sensibles.
- **SYNC-073 :** Une sauvegarde peut être exportée hors de l'environnement local sous une protection définie par la politique de sécurité.
- **SYNC-074 :** Une nouvelle installation ne récupère pas automatiquement l'identité ni l'autorisation d'une installation antérieure.
- **SYNC-075 :** La révocation ne supprime pas les événements historiques déjà reçus par le serveur.

### Compléments issus de l'audit — Provenance, récepteur, idempotence et intégrité

- **SYNC-076 :** La récupération d'un événement depuis une installation autre que son installation d'origine conserve son identifiant, son opération, son flux, sa séquence et sa provenance d'origine.
- **SYNC-077 :** Une transmission de récupération référence l'autorisation de récupération correspondante et identifie l'installation émettrice actuelle.
- **SYNC-078 :** Un curseur est unique pour le couple flux/récepteur; le récepteur est le serveur central ou une installation destinataire déterminée, jamais le seul appareil abstrait.
- **SYNC-079 :** Un identifiant d'opération est créé avant la première transmission et réutilisé lors des retries; un manifeste identique retourne le résultat connu et un manifeste différent est bloqué.
- **SYNC-080 :** Pour toute transmission, l'origine et le rattachement de chaque flux membre concordent avec l'opération (même installation d'origine en local ou même établissement de contexte au central); l'établissement des événements correspond à l'établissement autorisé. Le serveur refuse tout mélange ou écart.
- **SYNC-081 :** Le contenu métier canonique de référence est conservé ou référencé de manière immuable et comparé intégralement lors de la retransmission; une empreinte n'est qu'un contrôle auxiliaire.
- **SYNC-082 :** Le contenu de décision est immuable; chaque changement d'applicabilité et chaque résultat d'application sont consignés dans des associations historiques distinctes.
- **SYNC-083 :** L'auteur métier, l'émetteur d'une tentative de synchronisation et l'utilisateur autorisant une récupération sont distingués; leurs références utilisent le système transversal.

# 8. POINTS TECHNIQUES ET OPÉRATIONNELS ENCORE OUVERTS

Les décisions conceptuelles relatives aux associations, cardinalités, directions de flux, générations, progressions terminales, dépendances, séparation transport/opération/atomicité, identité origine/cible de restauration et succession d'arbitrages sont résolues dans cette proposition. Les points suivants sont les seuls éléments reportés ici comme choix techniques ou de politique opérationnelle :

| Référence | Point ouvert                                                                                | Nature du point                                                                     |
| --------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| OUV-08-01 | Durée de validité et renouvellement des autorisations hors ligne                            | Politique de sécurité; à fixer sans promettre une révocation instantanée hors ligne |
| OUV-08-02 | Matrice détaillée des permissions d'arbitrage                                               | Configuration du système transversal d'utilisateurs et permissions                  |
| OUV-08-03 | Fréquence et déclencheurs des sauvegardes                                                   | Paramétrage opérationnel                                                            |
| OUV-08-04 | Durée de conservation et purge des sauvegardes                                              | Politique de rétention                                                              |
| OUV-08-05 | Taille maximale des lots et des opérations                                                  | Dimensionnement et performance                                                      |
| OUV-08-06 | Délais et nombre de nouvelles tentatives                                                    | Paramétrage de transport                                                            |
| OUV-08-07 | Durée de prise en charge des anciennes versions                                             | Politique de compatibilité                                                          |
| OUV-08-08 | Procédure sécurisée de récupération d'un appareil révoqué                                   | Procédure opérationnelle s'appuyant sur les identités existantes                    |
| OUV-08-09 | Format, chiffrement et protection des sauvegardes exportées                                 | Architecture de sécurité                                                            |
| OUV-08-10 | Politique de conservation/archivage des événements acquittés                                | Rétention et audit                                                                  |
| OUV-08-11 | Nombre de partitions fonctionnelles par flux                                                | Paramétrage technique conforme à l'identité conceptuelle du flux                    |
| OUV-08-12 | Protocole, format physique, stockage, signatures et mécanismes de supervision               | Conception technique                                                                |
| OUV-08-13 | Règles déterministes de canonicalisation des contenus et manifestes par version d'événement | Contrat de sérialisation technique, sans modification du contenu métier             |

Les points conceptuels ne sont pas reportés à la conception technique. Le présent document ne prétend pas que ces choix d'exploitation ou d'implémentation ont déjà été arrêtés.

# 9. SCÉNARIOS DE CONTRÔLE RECOMMANDÉS

1. **Retransmission montante :** un événement appareil-vers-serveur est reçu, l'accusé est perdu, puis le même événement et la même séquence sont retransmis. Résultat : résultat existant retourné, un seul effet métier.
2. **Opération incomplète :** le manifeste attend trois événements, deux seulement sont durables. Résultat : réception partielle, aucun traitement complet.
3. **Atomicité propre au domaine :** une opération de synchronisation groupe plusieurs événements, mais le domaine ne la déclare pas atomique. Résultat : aucun rejet intégral imposé par le seul regroupement.
4. **Ordre descendant :** l'appareil reçoit les séquences 1, 2, 4 et 5 d'un flux serveur-vers-appareil. Résultat : réception durable peut être suivie par positions; curseur contigu bloqué à 2 jusqu'à réception de 3.
5. **Sens distincts :** synchroniser simultanément un flux montant et un flux descendant. Résultat : curseurs, positions et progression de traitement sont indépendants et correctement attribués à chaque récepteur.
6. **Pré-requis absent puis reçu :** l'événement dépendant arrive avant le prérequis. Résultat : attente, puis réévaluation après réception du prérequis.
7. **Pré-requis rejeté ou conflictuel :** résultat définitif rejeté ou conflit non résolu sur le prérequis. Résultat : dépendant bloqué, sans propagation métier automatique.
8. **Arbitrages successifs :** une première décision est appliquée, puis une seconde la remplace. Résultat : deux décisions historiques, une seule applicable à chaque instant, événements d'origine inchangés.
9. **Opérations indépendantes :** un lot transporte quatre opérations, dont une en conflit. Résultat : les autres peuvent progresser si elles ne dépendent pas du conflit.
10. **Format incompatible :** vérifier deux cas. Si une version compatible peut prendre en charge l'événement après mise à jour, il est conservé en attente, le curseur de traitement reste bloqué et la reprise est possible. Si aucune reprise n'est prévue, un rejet définitif explicite et motivé est enregistré; il devient terminal et la progression peut franchir cette position, sous réserve des dépendances et de l'atomicité métier.
11. **Réinstallation :** une application est réinstallée avec des événements non acquittés. Résultat : nouvelle installation/nouveaux flux, aucune séquence réutilisée; ancien historique réconcilié ou récupéré par procédure contrôlée.
12. **Restauration sur le même appareil :** restaurer une sauvegarde vérifiée. Résultat : réconciliation des événements/résultats/curseurs avec le serveur avant reprise.
13. **Restauration sur un autre appareil :** cible réenregistrée indépendamment. Résultat : identité d'appareil et autorisation distinctes; provenance des anciens événements conservée.
14. **Révocation pendant déconnexion :** révoquer un appareil hors ligne qui tente ensuite une transmission. Résultat : aucune prétention d'effet instantané; refus côté serveur lors du retour en ligne, données locales préservées pour récupération contrôlée.
15. **Dépendance circulaire :** deux événements se requièrent mutuellement. Résultat : anomalie bloquante et traçable.
16. **Interruption de restauration :** interrompre la reprise pendant la restauration. Résultat : copie source exploitable préservée et reprise contrôlée possible.
17. **Récupération A vers B :** récupérer depuis une sauvegarde de A des événements non acquittés sur l'installation B autorisée. Résultat : tentative émise par B, autorisation attribuée à un utilisateur habilité, identifiants/flux/séquences/provenances d'A inchangés.
18. **Curseurs après réinstallation :** synchroniser un flux descendant vers deux installations successives d'un même appareil. Résultat : un curseur distinct par installation réceptrice et aucun mélange de progression.
19. **Idempotence d'opération :** retransmettre la même opération et son manifeste, puis réutiliser son identifiant avec un manifeste différent. Résultat : résultat déjà connu dans le premier cas, anomalie bloquante dans le second; contrôle événementiel distinct dans les deux cas.
20. **Isolation établissement :** envoyer une opération dont l'établissement du flux ou de l'installation diffère de celui de l'autorisation. Résultat : refus avant effet métier et trace de l'écart.
21. **Contenu d'événement modifié :** retransmettre un UUID connu avec un corps métier différent et une empreinte recalculée. Résultat : comparaison canonique détecte l'écart et bloque la retransmission.
22. **Historique d'arbitrage :** retenir une décision, la remplacer, puis tenter son application deux fois avec résultats différents. Résultat : contenu et transitions antérieurs conservés, chaque tentative et résultat historisés, au plus une décision applicable.
23. **Identités utilisateur :** un utilisateur crée l'opération, un autre déclenche l'envoi, et un troisième autorise la récupération. Résultat : trois rôles distincts liés aux utilisateurs transversaux; aucune identité n'écrase l'autre.
24. **Cohérence des flux et atomicité inter-flux :** une opération regroupe des événements de plusieurs flux d'origine compatibles. Résultat : une opération locale n'accepte que des flux locaux de sa même installation; une opération centrale n'accepte que des flux centraux de son établissement de contexte; un mélange est refusé. Si l'opération est atomique, le domaine attend leur réception complète et garantit un résultat tout-ou-rien; sinon il contraint l'unité atomique à un seul flux. Pour une opération non atomique, les résultats partiels restent indépendants et traçables.

# 10. COHÉRENCE AVEC LES DOMAINES ANTÉRIEURS ET FRONTIÈRES TECHNIQUES

Le lot 8 transporte les événements appartenant aux domaines antérieurs sans modifier leurs règles. Les responsabilités financières, les créances, encaissements, affectations, crédits, caisses, soldes, impayés, relevés et relances restent sous la propriété des lots concernés. Le lot 7 et FIN-LOT7-001 à FIN-LOT7-028 sont gelés sous VAL-013.

En particulier, l'idempotence empêche le double effet d'un encaissement ou d'une affectation; une annulation suit les règles financières; une réservation de crédit reste soumise au lot 6; les projections financières centrales sont recalculées selon les événements validés; le lot 8 n'arbitre pas les conflits financiers par une règle générique.

Le contrôle des autorisations d'appareil et d'utilisateur réutilise le système transversal existant. Le dépôt consulté décrit des rôles et permissions différenciés (DEC-014), ainsi que des autorisations du domaine 2; il ne donne pas ici le détail de leurs entités. Le lot 8 référence ces concepts sans prétendre vérifier leur schéma détaillé ni en créer un doublon.

Le MCD ne fixe pas le protocole HTTP/WebSocket, le format JSON définitif, la bibliothèque, le stockage physique, les clés ou signatures cryptographiques, le chiffrement, les paramètres PostgreSQL/SQLite WASM/OPFS, ni les seuils de performance. Ces choix techniques devront respecter les identités, associations, cardinalités, progressions et règles établies ci-dessus. Aucun SQL, MLD ou migration n'est produit.

# 11. HISTORIQUE DES CORRECTIONS ET VALIDATION

Les éléments ci-dessous retracent les corrections ayant précédé la validation officielle. La validation et le gel sont consignés sous VAL-014 dans `07-historique-des-validations.md`.

- **Relations conflit :** ajout des associations conceptuelles `ASSOCIATION_CONFLIT_EVENEMENT` et `ASSOCIATION_CONFLIT_OPERATION`, avec rôle, motif, date et cardinalités N:N explicites.
- **Arbitrage :** cycle de décision historisé, référence à l'utilisateur transversal, justification et résultat d'application; remplacement explicite et contrainte d'une seule décision applicable.
- **Identité des flux :** ajout de `INSTALLATION_LOCALE` et `FLUX_SYNCHRONISATION`; distinction appareil/installation/génération; séquences attribuées et persistées par flux, sans réutilisation après réinstallation.
- **Curseurs :** flux bidirectionnels et récepteur identifié; deux progressions contiguës distinctes pour réception durable et traitement définitif.
- **Résultats et statuts :** séparation transmission, réception, traitement métier et acquittement; rejet définitif, attente, conflit et arbitrage appliqué ont des conséquences différentes sur la progression.
- **Dépendances :** rôles prérequis/dépendant formalisés; comportement précisé pour prérequis absent, en attente, validé, rejeté, conflictuel ou arbitré; aucune propagation métier automatique.
- **Opérations :** retrait du nombre d'événements dupliqué sur chaque enveloppe; nombre attendu porté uniquement par l'opération; distinction entre lot de transport, opération de synchronisation et atomicité métier décidée par le domaine propriétaire.
- **Restauration et sécurité :** origine et cible séparées; informations de reprise préservées; réconciliation centrale préalable; pas de clonage d'identité; limites explicites de révocation hors ligne; réutilisation des utilisateurs/permissions existants.
- **C01–C07 :** ajout de la récupération traçable des événements d'origine, récepteur de curseur par installation, idempotence du manifeste d'opération, isolation d'établissement, comparaison intégrale du contenu métier canonique, historique append-only des transitions/applications de décision, et distinction des identités utilisateur.
- **Dernière revue corrective :** cardinalités des liens utilisateur et de remplacement formalisées; incompatibilités temporaires distinguées des rejets définitifs; atomicité inter-flux conditionnée par la garantie du domaine propriétaire ou par un regroupement mono-flux; cardinalité établissement-appareil corrigée à zéro ou plusieurs appareils.
- **Invariants :** SYNC-001 à SYNC-075 conservés ou reformulés; huit invariants ajoutés sous SYNC-076 à SYNC-083. Aucun invariant financier n'est modifié.
- **Points ouverts :** les ambiguïtés conceptuelles sont résolues dans cette proposition; seuls les choix techniques et opérationnels restent ouverts.
- **Scénarios :** cas C01–C07 ajoutés pour récupération, installation destinataire, idempotence d'opération, isolation, égalité de contenu, historique de décision et provenance utilisateur.
- **Validation officielle :** le propriétaire a validé le MCD V1.0 du lot 8 le 2026-11-04 sous VAL-014. Les 17 concepts, relations, cardinalités, RM-SYNC-01 à RM-SYNC-38 et SYNC-001 à SYNC-083 sont acceptés et gelés. Toute modification ultérieure exige une décision explicite et une traçabilité. VAL-013 et FIN-LOT7-001 à FIN-LOT7-028 restent inchangés.

### Éléments conceptuels modifiés

- Entités conservées et précisées : `APPAREIL_SYNCHRONISATION`, `OPERATION_SYNCHRONISATION`, `ENVELOPPE_EVENEMENT_SYNCHRONISATION`, `DEPENDANCE_EVENEMENT_SYNCHRONISATION`, `CURSEUR_SYNCHRONISATION`, `CONFLIT_SYNCHRONISATION`, `DECISION_ARBITRAGE_SYNCHRONISATION`, `SAUVEGARDE_LOCALE`, `OPERATION_RESTAURATION`.
- Concepts ajoutés lors de la revue précédente : `INSTALLATION_LOCALE`, `FLUX_SYNCHRONISATION`, `ASSOCIATION_CONFLIT_EVENEMENT`, `ASSOCIATION_CONFLIT_OPERATION`.
- Concepts ajoutés pour C01–C07 : `ASSOCIATION_RECUPERATION_EVENEMENT`, `TENTATIVE_TRANSMISSION_SYNCHRONISATION`, `TRANSITION_APPLICABILITE_DECISION`, `APPLICATION_DECISION_ARBITRAGE`.
- Concepts supprimés : aucun.
- Cardinalités modifiées/formalisées : curseur unique par flux et récepteur logique; associations de récupération par restauration/événement; plusieurs tentatives de transmission par événement; plusieurs transitions et tentatives d'application par décision; lien facultatif à un utilisateur métier et à un utilisateur de synchronisation selon le contexte.

# 12. VALIDATION OFFICIELLE ET GEL

Le MCD V1.0 validé comprend les sept décisions structurantes suivantes :

- L8-D01 : identité, opérations et atomicité métier.
- L8-D02 : ordre causal, générations de flux, dépendances et séquences.
- L8-D03 : conflits et arbitrage historisé.
- L8-D04 : compatibilité et évolution des versions.
- L8-D05 : sauvegarde, restauration et réconciliation.
- L8-D06 : appareils, installations, autorisations, révocation et récupération.
- L8-D07 : transmission bidirectionnelle, curseurs et supervision.

Le propriétaire a officiellement validé et gelé le MCD du lot 8 le **2026-11-04**, sous la référence **VAL-014**. Sont acceptés : les 17 concepts, les relations, les cardinalités, les règles métier RM-SYNC-01 à RM-SYNC-38 et les invariants SYNC-001 à SYNC-083. Toute modification ultérieure du périmètre gelé exige une décision explicite et une traçabilité dans l'historique des validations. Les choix techniques et opérationnels énumérés en section 8 restent ouverts et ne rouvrent pas le MCD conceptuel. Le lot 7 demeure gelé sous VAL-013; aucun invariant FIN-LOT7-001 à FIN-LOT7-028 n'est modifié. La validation du lot 8 ne vaut pas validation du MCD global V1.0.

