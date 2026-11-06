# 03 — Relations et cardinalités

**Version :** V1.0  
**Statut :** Relations inter-domaines consolidées au niveau des sources disponibles pour le MCD global V1.0; cardinalités propriétaires gelées sous VAL-013, VAL-014 et VAL-015 reproduites sans modification.

Les relations ci-dessous reprennent les formulations explicites des règles et du dictionnaire. Les multiplicités non spécifiées restent ouvertes; elles ne sont pas déduites des noms des entités. Ce document n'est pas un MLD.

## 1. Relations documentées

| Relation                                   | Règle documentée                                                                                                                                                  | Cardinalité / portée connue                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Année scolaire — période pédagogique       | Les périodes appartiennent à une organisation annuelle.                                                                                                           | Appartenance établie; nombres de périodes et multiplicités non précisés.                                                 |
| Année scolaire — classe annuelle           | Les classes annuelles sont organisées dans le cadre d'une année scolaire.                                                                                         | Rattachement établi; multiplicités non détaillées.                                                                       |
| Niveau — classe annuelle                   | Une classe annuelle s'appuie sur un niveau défini par l'établissement.                                                                                            | Rattachement établi; multiplicités non détaillées.                                                                       |
| Modèle de classe — classe annuelle         | Une classe annuelle s'appuie sur un modèle de classe réutilisable.                                                                                                | Rattachement établi; multiplicités non détaillées.                                                                       |
| Cycle d'enseignement — niveau              | Un cycle regroupe des niveaux.                                                                                                                                    | Regroupement établi; multiplicités non précisées.                                                                        |
| Élève — responsable                        | Un élève peut avoir plusieurs responsables et un responsable peut être associé à plusieurs élèves; la relation porte ses propres informations et responsabilités. | Plusieurs-à-plusieurs via Relation élève-responsable; historique requis.                                                 |
| Candidature — élève                        | Une candidature ne devient un dossier permanent d'élève qu'après admission.                                                                                       | Condition d'admission établie; cardinalités non précisées.                                                               |
| Préinscription — candidat / élève connu    | Une préinscription concerne un candidat ou un élève déjà connu, jamais les deux simultanément.                                                                    | Choix exclusif entre les deux cas; cardinalités par cas non détaillées.                                                  |
| Inscription — élève — année scolaire       | Une inscription confirmée concerne un seul élève et une seule année scolaire; un élève ne peut avoir plusieurs inscriptions confirmées pour la même année.        | Une inscription confirmée a exactement un élève et une année; unicité de l'inscription confirmée par couple élève/année. |
| Inscription — classe annuelle              | Une inscription peut être associée à une classe annuelle; l'affectation peut être différée.                                                                       | Affectation facultative au moment de l'inscription; autre multiplicité non spécifiée.                                    |
| Affectation / changement de classe         | Les changements de classe doivent conserver un historique.                                                                                                        | Historisation exigée; nombre de changements et structure de la relation non précisés.                                    |
| Paiement — créance                         | Un paiement peut être affecté à une ou plusieurs créances; une créance peut recevoir plusieurs affectations.                                                      | Plusieurs-à-plusieurs via Affectation de paiement.                                                                       |
| Correction financière — opération initiale | Une correction conserve la référence à l'opération initiale et ne l'efface pas.                                                                                   | Référence requise; multiplicité des corrections non précisée.                                                            |
| Décision de progression — élève            | Les décisions de progression sont individualisées et traçables.                                                                                                   | Élève (0,N) — décision (1,1), gelée sous VAL-015; propriétaire pédagogique, application administrative organisationnelle. |

## 2. Relations provisoirement acceptées — lot financier 6

Ces orientations sont provisoirement acceptées en V0.9.1 et ne sont pas gelées. Elles ne fixent pas de cardinalités supplémentaires.

| Relation / dépendance                             | Orientation provisoire                                                                                                                        | Portée non fixée                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Annulation d'encaissement — encaissement concerné | L'annulation est une opération orchestrée et bloquante, distincte d'une contrepassation et d'un remboursement.                                | Cardinalités et séquence détaillée de l'orchestration non précisées.      |
| `RESERVATION_CREDIT` — mouvement positif source   | La réservation référence directement le mouvement positif source via `id_mouvement_credit_source`; elle ne référence pas `CREDIT_DISPONIBLE`. | Cardinalité de réservations par mouvement source non précisée.            |
| Avoir — `CREATION_AVOIR` — crédit distinct        | Un avoir préserve l'historique et peut produire un crédit distinct via cette opération, sans modifier rétroactivement l'opération d'origine.  | Cardinalités et conditions de création du crédit non précisées.           |
| Restitution — mandat de restitution — provenance  | Le mandat conserve la granularité de provenance des fonds restitués.                                                                          | Relation exacte aux mouvements sources, payeur et multiplicité non fixés. |
| Crédit — échéances                                | Les crédits ne sont pas affectés automatiquement aux échéances.                                                                               | Le traitement des crédits/avoirs sur échéances déjà réglées reste ouvert. |

Les crédits brut, réservé et net sont des valeurs calculées, non des montants indépendants modifiables. Une réservation ne diminue pas le crédit brut. Une réservation locale peut être provisoire; son arbitrage central doit être pris en compte en fonctionnement Offline-First.

## 3. Relations et cardinalités gelées — lot financier 7

Le statut de cette section est **Domaine 4 — Lot 7 MCD V1.0 gelé le 2026-11-04**. Ses cardinalités et décisions ne doivent pas être modifiées sans demande explicite; elles ne modifient pas les cardinalités propriétaires des lots 1 à 5.

| Relation / dépendance                                        | Éléments établis                                                                                                                                                 | Cardinalité / limite documentaire                                                                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Relance financière — élève                                   | Une relance porte sur un seul élève afin de préserver l'individualisation.                                                                                       | Exactement 1 élève par relance; un élève peut avoir plusieurs relances.                                                                   |
| Relance financière — lignes de relance                       | Une relance conserve un instantané de lignes et montants de référence.                                                                                           | 1..n lignes par relance; chaque ligne appartient à exactement une relance.                                                                |
| Ligne de relance — cible financière                          | Chaque ligne cible exactement une `CREANCE` ou une `ECHEANCE_CREANCE`, jamais les deux.                                                                          | XOR obligatoire; une même relance ne peut inclure à la fois une créance globale et les échéances qui la composent.                        |
| Relance financière — destinataires                           | Une relance peut avoir plusieurs destinataires autorisés.                                                                                                        | 1..n destinataires pour une relance transmise; un destinataire peut recevoir plusieurs relances.                                          |
| Destinataire — responsabilité financière active du domaine 2 | Les destinataires sont déterminés par les responsabilités financières actives et les autorisations du domaine 2; le lien familial/légal seul ne suffit pas.      | Dépendance D2 validée à réutiliser; aucun modèle ou cardinalité D2 n'est ajouté au lot 7.                                                 |
| Destinataire — coordonnées historiques                       | Les coordonnées utilisées lors de la création de la relance sont conservées comme référence historique; chaque tentative trace le contact effectivement utilisé. | Instant de capture fixé à la création; cardinalités de changement de coordonnées non documentées.                                         |
| Destinataire — historique de transmission                    | Chaque destinataire possède son propre historique; une transmission peut être tentée plusieurs fois.                                                             | Relation 1..n selon le concept enfant conditionnel gelé sous VAL-013; le service transverse n'est substitut que s'il fournit les garanties requises. |
| `TENTATIVE_TRANSMISSION_RELANCE` — relance/destinataire      | Chaque tentative possède un identifiant et référence exactement une relance et un destinataire; plusieurs tentatives peuvent exister pour une même relation.     | 1 relance et 1 destinataire par tentative; identifiant, canal, date, résultat, échec et contact utilisé sont requis conceptuellement.     |
| Paramétrage de balance âgée — tranche                        | Chaque version de paramétrage contient des tranches configurables, continues et non chevauchantes.                                                               | 1..n tranches par version; chaque tranche appartient à une seule version. Bornes [basse incluse, haute exclue], dernière tranche ouverte. |
| Balance âgée — `ECHEANCE_CREANCE` / `PLAN_REGLEMENT_CREANCE` | Calcul à date de référence sur l'échéance active; après validation d'un réaménagement, utiliser le calendrier actif et garder l'ancien consultable.              | Dépendance historique validée; détails d'attributs et cardinalités antérieurs non disponibles dans le dépôt et non redéfinis.             |
| Document généré — résultats / contexte                       | Un document conservé garde ses paramètres et contenu de référence; l'élève est associé si applicable et l'année scolaire est identifiée.                         | Cardinalités avec le service documentaire transversal non établies; aucun service partagé n'a été trouvé dans les sources du projet.      |

Le RAP, la situation de l'élève, les montants non affectés, les crédits, l'impayé, la balance âgée, le relevé dynamique et les synthèses sont des résultats calculés, pas des entités persistantes du seul fait de leur affichage.

### Dépendances héritées des lots 1 à 6

Les noms ci-dessous sont des entités antérieures dont le statut validé est fourni dans la mission. Les liens fonctionnels indiqués sont conceptuellement connus; les cardinalités et attributs de leur modèle historique ne sont pas présents dans les documents et ne sont pas redéfinis par le lot 7.

| Dépendance                                                                     | Connu conceptuellement                                                                                                                                                                                  | Non documenté ici                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `CREANCE` → `PLAN_REGLEMENT_CREANCE` → `ECHEANCE_CREANCE`                      | Le plan et les échéances structurent le règlement d'une créance; le lot 7 utilise `ECHEANCE_CREANCE` comme unité de calcul courant pour éviter de compter la créance parent et ses échéances deux fois. | Cardinalités exactes, montants sources, création/annulation/remplacement et dates propriétaires.                 |
| `ENCAISSEMENT` → `AFFECTATION_REGLEMENT` → cible financière                    | Les encaissements sont distingués des affectations; le RAP consomme les effets nets des affectations actives.                                                                                           | Existence et cible référencée connues conceptuellement; cardinalités et cible historique exacte non disponibles. |
| Effets des affectations / corrections                                          | Le lot 7 ne fait que consommer les effets nets actifs et les corrections des entités sources.                                                                                                           | Détails des annulations, contrepassations et remboursements à confirmer dans les lots historiques.               |
| `MOUVEMENT_CREDIT` → réservations du lot 6                                     | La réservation du lot 6 référence le mouvement positif source via `id_mouvement_credit_source`.                                                                                                         | Cardinalités et règles détaillées de consommation/libération propres au lot 6.                                   |
| `SESSION_CAISSE`, `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE`, `RAPPROCHEMENT_CAISSE` | Entités historiques validées à préserver.                                                                                                                                                               | Relations aux encaissements et effets sur RAP/crédits non décrits ici.                                           |

La relation générique « Paiement — Créance » à plusieurs-à-plusieurs via les affectations figurant en section 1 est conservée. Le dépôt ne permet pas de confirmer son mapping exact vers `ENCAISSEMENT`, `AFFECTATION_REGLEMENT`, `CREANCE` ou `ECHEANCE_CREANCE`; le lot 7 ne modifie pas cette relation historique.

Les multiplicités documentées dans les sources antérieures comprennent Élève–Responsable et la relation générique Paiement–Créance plusieurs-à-plusieurs; leur mapping aux noms des entités historiques n'est pas réinterprété. Les cardinalités conceptuelles du lot 7 sont gelées : une relance pour un élève, une ou plusieurs lignes à cible exclusive, plusieurs destinataires, plusieurs tentatives par relance/destinataire et une ou plusieurs tranches par version de paramétrage. Aucune cardinalité ni aucun attribut des lots 1 à 5 n'est ajouté.

**Statut :** Relations et cardinalités du Lot 8 reproduites depuis la référence normative `08-mcd-consolide-lot8.md`; aucun élément de cette section ne complète ni ne modifie VAL-014.

## 4. Lot 8 — relations et cardinalités gelées sous VAL-014

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


## 5. Interfaces inter-domaines documentées et limites des sources

- **Organisation scolaire / Inscriptions :** l'année scolaire et la classe annuelle structurent l'inscription et l'affectation; les règles de rattachement sont décrites, mais les cardinalités complètes restent à formaliser.
- **Élèves / Inscriptions :** le dossier permanent est créé après admission; il est distinct des inscriptions annuelles.
- **Inscriptions / Finances :** l'intégration fonctionnelle est évoquée dans la vue globale, mais les documents ne définissent pas si une créance référence l'élève, l'inscription, l'année scolaire ou une autre notion. Aucun lien physique ou cardinalité n'est arrêté.
- **Organisation / Pédagogie :** le MCD pédagogique V1.0 est gelé sous VAL-015; ses cardinalités sont reprises depuis `09-dossier-pedagogique-preliminaire.md`. La date de chaque évaluation détermine la classe à retrouver dans l'historique existant. La suffisance de la granularité temporelle est conservée comme dépendance à vérifier, sans modifier VAL-015.
- **Caisse / opérations financières :** les sessions et mouvements sont recensés, mais leur cardinalité et leurs liens aux paiements/encaissements ne sont pas définis.

## 6. Cardinalités consolidées et limites documentaires

Les multiplicités explicitement documentées comprennent les relations plusieurs-à-plusieurs Élève–Responsable via Relation élève-responsable et Paiement–Créance via Affectation de paiement, ainsi que la possibilité qu'une relance ait plusieurs destinataires autorisés. Un paramétrage versionné comprend des tranches configurables, sans nombre fixe de tranches. Pour les autres relations, les contraintes métier connues sont consignées sans compléter les cardinalités manquantes.

Les cardinalités explicitement gelées dans VAL-013, VAL-014 et VAL-015 sont conservées dans leurs sections spécialisées. Pour les domaines 1 à 3 et les lots financiers 1 à 5, les relations et cardinalités sont reprises uniquement dans la mesure où les sources présentes les documentent; une absence dans ce résumé n'annule ni ne redéfinit le modèle propriétaire. Les relations entre créances, élèves/inscriptions, frais et caisse ne sont pas complétées par déduction faute des modèles détaillés des lots 1 à 5. Toute cardinalité supplémentaire doit provenir d'une source ou décision propriétaire. Les quatre points ouverts du lot 6 restent consignés dans `06-decisions-et-points-ouverts.md`.

## 7. Domaine 5 — relations et cardinalités gelées sous VAL-015

Le domaine pédagogique V1.0 est gelé sous VAL-015. Le détail figure dans `09-dossier-pedagogique-preliminaire.md`; les cardinalités ci-dessous en sont une reproduction de synthèse et ne modifient ni VAL-015 ni les domaines gelés antérieurs.

| Relation gelée sous VAL-015 | Cardinalités gelées et contraintes |
| --- | --- |
| Programme — Version de programme | Programme (1,N) — Version (1,1). |
| Version — cycle/niveau/spécialité existants | Par association typée, Version (0,N) — Association (1,1), Référentiel (0,N) — Association (1,1). Spécialité seulement si son référentiel existe déjà. |
| Version — `PROGRAMME_MATIERE` — Matière | Version (0,N), Matière (0,N); chaque association relie exactement une version et une matière. |
| Matière — Enseignement | Matière (0,N) — Enseignement (1,1). |
| Classe annuelle existante — Enseignement | Classe (0,N) — Enseignement (1,1) pour les enseignements de classe; autres groupes à arbitrer. |
| Enseignement — `AFFECTATION_ENSEIGNANT` | Enseignement (0,N) — Affectation (1,1); affectation datée. |
| Enseignement — Évaluation | Enseignement (0,N) — Évaluation (1,1). |
| Inscription — Note — Évaluation | Inscription (0,N) — Note (1,1); Évaluation (0,N) — Note (1,1); une seule note par couple inscription/évaluation en V1. |
| Note — `REVISION_NOTE` | Note (1,N) — Révision (1,1); une initiale, rangs uniques/ordonnés, chaîne sans cycle/branche; une révision a au plus une suivante. Les situations note sont historisées dans les révisions. |
| `RESULTAT_SCOLAIRE` abstrait — sous-types | Chaque généralisation (1,1) possède exactement un sous-type parmi `RESULTAT_MATIERE`, `RESULTAT_PERIODE`, `RESULTAT_ANNUEL`; spécialisation totale et disjointe. Aucun `RESULTAT_EVALUATION`. |
| Inscription — Résultat scolaire | Inscription (0,N) — Résultat (1,1); unicité sur identité fonctionnelle selon type et périmètre scolaire. |
| Résultat — `CONTRIBUTION_RESULTAT_NOTE` | Résultat (0,N) — Contribution (1,1); la note et sa révision ont chacune (0,N) contributions; chaque contribution référence une note et une révision appartenant à cette note. |
| Résultat cible — `CONTRIBUTION_RESULTAT_SCOLAIRE` — Résultat source | Cible (0,N) et source (0,N) — Contribution (1,1) de chaque côté; source distincte de la cible. |
| Résultat — Résultat précédent/suivant | Au plus un prédécesseur et un successeur direct, même périmètre; chaîne sans cycle/branche. |
| Inscription — Bulletin — Ligne | Inscription (0,N) — Bulletin (1,1); Bulletin (1,N) — Ligne (1,1). |
| Ligne — Résultats sources | Ligne (0,N) — Résultat (0,N); les références ne remplacent pas le contenu publié figé. |
| Élève — Décision de progression | Élève (0,N) — Décision (1,1); décision remplacée/remplaçante dans une chaîne réflexive unique. PED-A08 attribue la décision au domaine pédagogique et son application administrative à l'organisation scolaire. |

Les dates de chaque évaluation source, et non la seule période globale d'un résultat agrégé, déterminent la classe applicable via l'historique existant des affectations. La suffisance de cette granularité temporelle reste une dépendance de D1/D3.

Tout résultat calculé possède au moins une contribution au total. Il utilise l'une ou l'autre association, sauf si la méthode explicitement versionnée autorise le mélange; les deux catégories restent représentées séparément. Les contraintes de source exacte, d'unicité dans un résultat, de dépendance acyclique et de reproductibilité restent celles de VAL-015.

## 8. Rattachement aux établissements et isolation

L'établissement propriétaire est déterminé par les rattachements du domaine propriétaire; le modèle ne duplique pas une référence d'établissement dans chaque entité. La V1 prévoit un établissement par déploiement, pouvant compter plusieurs appareils et installations locales. Les relations métier ne doivent pas réunir des objets appartenant à des établissements différents.

Le rattachement direct est établi pour `APPAREIL_SYNCHRONISATION` et pour le contexte d'établissement des flux/opérations d'origine serveur selon VAL-014; le serveur refuse tout écart avec le contexte d'autorisation. Une installation locale, un flux ou une opération d'origine locale dérivent leur établissement par le chemin gelé `installation → appareil → établissement`; l'événement le dérive de la cohérence exigée entre opération et flux d'origine. `ETABLISSEMENT` est le concept propriétaire racine. Pour les autres domaines, aucun lien direct supplémentaire n'est imposé si le rattachement est déjà déterminable par les relations du modèle propriétaire. Le chemin détaillé des entités financières des lots 1 à 5 ne peut pas être confirmé sans leurs sources. Aucun lien ni attribut nouveau n'est inventé ici.
