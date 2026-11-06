# Domaine pédagogique — MCD consolidé proposé V1.0

**Statut : DOMAINE PÉDAGOGIQUE V1.0 — MCD CONSOLIDÉ, ARBITRAGES ACCEPTÉS, EN ATTENTE DE VALIDATION FORMELLE DU PROPRIÉTAIRE.**  
**Périmètre :** préscolaire, primaire, collège, lycée général, enseignement technique et professionnel au Congo-Brazzaville; universités et instituts supérieurs hors V1.  
**Décisions :** PED-A01 à PED-A09 acceptées le 2026-11-04; PED-A10 et PED-I01 à PED-I03 préservées.

L'acceptation des arbitrages ne constitue ni validation formelle du MCD pédagogique ni gel du domaine. La validation du propriétaire reste requise. Le MCD global reste non validé.

## 1. Périmètre et frontières

Le domaine couvre les programmes/versionnements, enseignements, affectations d'enseignants, évaluations, notes et révisions, résultats agrégés, calculs, bulletins, conseils, décisions de progression et suivi pédagogique.

Il réutilise les concepts existants des domaines 1 à 3 : établissement, années et périodes scolaires, cycles, niveaux, modèles et classes annuelles, élèves, inscriptions, affectations de classe et historique des changements. Aucun mécanisme parallèle de classe ou d'affectation n'est créé.

Les règles pédagogiques appartiennent au domaine pédagogique. Les utilisateurs et permissions renvoient aux concepts transversaux existants. Le lot 8 assure transport, idempotence, reprise et traitement des conflits conformément à VAL-014; il ne redéfinit pas les règles métier pédagogiques.

VAL-013, FIN-LOT7-001 à FIN-LOT7-028, VAL-014, SYNC-001 à SYNC-083 et `08-mcd-consolide-lot8.md` ne sont pas modifiés.

## 2. Arbitrages PED-A01 à PED-A09 acceptés

Les décisions ci-dessous ont été acceptées le 2026-11-04. Elles sont intégrées au modèle, sans pour autant valider formellement le MCD.

### PED-A01 — Types de résultats

La valeur d'une évaluation est portée par `NOTE`; aucun concept `RESULTAT_EVALUATION` n'est créé. Les trois types de résultats agrégés retenus sont `RESULTAT_MATIERE`, `RESULTAT_PERIODE` et `RESULTAT_ANNUEL`.

Le concept générique `RESULTAT_SCOLAIRE` est conservé uniquement comme généralisation abstraite commune aux trois types, nécessaire notamment aux références de `CONTRIBUTION_RESULTAT_SCOLAIRE`. Il ne constitue pas une quatrième catégorie de résultat autonome. Chaque résultat concret appartient exactement à un des trois sous-types (classification totale et disjointe).

L'identité fonctionnelle dépend du périmètre scolaire : inscription de l'élève, type de résultat, année/période, matière lorsque requise et version de programme appliquée. La proposition précise ces clés au §4.

### PED-A02 — Méthodes de calcul

Les méthodes sont versionnées. Chaque coefficient possède une responsabilité de définition unique. Le barème et les règles de normalisation sont explicites; les règles d'arrondi sont déterministes et versionnées. Le résultat et ses contributions figent les paramètres effectivement utilisés afin de reproduire un résultat établi. Aucune valeur concrète de coefficient ou d'arrondi n'est inventée dans le MCD.

Répartition conceptuelle proposée : coefficient de matière dans `PROGRAMME_MATIERE` lorsqu'il est applicable; coefficient d'évaluation dans `EVALUATION`; échelle et conversion dans `BAREME`; combinaison, pondérations globales, précision de calcul et arrondis dans la version de `METHODE_CALCUL_RESULTAT`. Les valeurs effectives sont figées au calcul dans le résultat ou la contribution concernée. Une même sémantique de coefficient n'est pas définie deux fois.

### PED-A03 — Résultats sans notes

Aucun résultat scolaire calculé n'est établi sans contribution source. Ses sources sont des notes ou des résultats scolaires antérieurs, ou leur mélange selon une méthode explicitement versionnée (PED-A10). Aucune contribution fictive n'est créée. Les décisions administratives et les décisions de progression restent distinctes des résultats calculés.

### PED-A04 — Notes, absences et dispenses

En V1, une note au maximum existe pour un couple inscription/évaluation. Les situations consignées dans les révisions sont distinctes : `NOTE_ATTRIBUEE`, `ABSENCE_JUSTIFIEE`, `ABSENCE_NON_JUSTIFIEE`, `DISPENSE`, `NON_EVALUE`. Une absence ou dispense n'est jamais convertie automatiquement en zéro. Les tentatives multiples sont hors V1. Corrections, changements de situation et annulations sont historisés dans `REVISION_NOTE`.

Une révision de situation non notée ne porte pas de valeur de note attribuée. Les règles de calcul déterminent explicitement quelles situations sont admissibles; aucun effet arithmétique implicite n'est imposé.

### PED-A05 — Révisions

Les rangs sont uniques et ordonnés, sans obligation de continuité numérique. Une seule chaîne canonique existe après arbitrage. Les révisions concurrentes sont conservées et traitées selon VAL-014; aucun écrasement silencieux ni règle LWW n'est appliqué.

### PED-A06 — Versions de programme

La portée d'une version utilise des associations distinctes vers les cycles, niveaux et spécialités éventuelles, ainsi que des périodes scolaires. La sélection est déterministe. Un chevauchement ambigu est signalé et ne déclenche aucune sélection arbitraire. Les versions et références utilisées historiquement sont préservées.

Le résultat global conserve sa version de référence. Chaque source (notamment une évaluation) conserve la version qui lui était applicable lorsque nécessaire; ces références peuvent différer.

### PED-A07 — Bulletins

Le contenu, la structure et le document publié sont conservés. Un bulletin rectificatif crée un nouveau bulletin; l'ancien reste immuable et consultable. La reproduction graphique au pixel près n'est pas une obligation conceptuelle V1.

### PED-A08 — Propriété des décisions de progression

Le domaine pédagogique est propriétaire de la décision individuelle. Le domaine organisation scolaire en assure l'application administrative selon ses règles. L'avis d'un conseil est distinct de la décision définitive. La décision est individualisée et historisée; elle ne change pas automatiquement la classe. Les permissions existantes sont réutilisées, sans créer de hiérarchie de rôles.

### PED-A09 — Affectations de classe

Les contributions réutilisent exclusivement l'historique existant et identifient l'affectation valable à la date de l'évaluation. Aucun historique pédagogique d'affectation n'est créé. Toute insuffisance de l'historique est une dépendance à signaler au domaine propriétaire.

## 3. Concepts et responsabilités

Les attributs sont conceptuels; ils ne fixent pas de structure physique.

| Concept / association                          | Responsabilité et attributs conceptuels candidats                                                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROGRAMME_SCOLAIRE`                           | Identité, référence, libellé et statut du programme.                                                                                                                                                                                                          |
| `VERSION_PROGRAMME`                            | Identité/version, période d'applicabilité, statut et définition du contenu.                                                                                                                                                                                   |
| `VERSION_CYCLE`                                | Association version/cycle existant, avec période d'application.                                                                                                                                                                                               |
| `VERSION_NIVEAU`                               | Association version/niveau existant, avec période d'application.                                                                                                                                                                                              |
| `VERSION_SPECIALITE`                           | Association version/spécialité existante si le référentiel est disponible et pertinent; aucune spécialité nouvelle n'est créée.                                                                                                                               |
| `MATIERE`                                      | Référentiel de matières : code, libellé, statut.                                                                                                                                                                                                              |
| `PROGRAMME_MATIERE`                            | Matière du contenu d'une version; coefficient de matière éventuel et référence de libellé.                                                                                                                                                                    |
| `ENSEIGNEMENT`                                 | Matière, classe annuelle/contexte existant, année/période et version de programme sélectionnée.                                                                                                                                                               |
| `AFFECTATION_ENSEIGNANT`                       | Enseignement, référence à l'enseignant existant, dates de validité et état. Le référentiel source de l'identité enseignant reste une dépendance à confirmer.                                                                                                  |
| `EVALUATION`                                   | Enseignement, date, intitulé, type, barème/version, coefficient éventuel, statut.                                                                                                                                                                             |
| `BAREME`                                       | Échelle versionnée, valeurs de référence et normalisation explicite.                                                                                                                                                                                          |
| `NOTE`                                         | Inscription, évaluation et état courant dérivé de sa chaîne de révisions; une seule note par paire en V1.                                                                                                                                                     |
| `REVISION_NOTE`                                | Identité, note, rang, type de révision (`INITIALE`, `CORRECTION`, `ANNULATION`), situation, valeur éventuelle, auteur, date, motif et révision précédente.                                                                                                    |
| `METHODE_CALCUL_RESULTAT`                      | Identité/version, formule conceptuelle, paramètres, règles de normalisation, précision, arrondis et catégories de sources admises.                                                                                                                            |
| `RESULTAT_SCOLAIRE` (généralisation abstraite) | Identité commune, inscription, périmètre, dates de référence/établissement, version de programme de référence, méthode/version, mode source, paramètres/valeurs figés, état et lien historique. Aucune occurrence autonome : exactement un sous-type concret. |
| `RESULTAT_MATIERE`                             | Sous-type portant une matière et un périmètre annuel ou de période défini.                                                                                                                                                                                    |
| `RESULTAT_PERIODE`                             | Sous-type portant une période scolaire et le résultat agrégé de cette période.                                                                                                                                                                                |
| `RESULTAT_ANNUEL`                              | Sous-type portant l'année scolaire et le résultat agrégé annuel.                                                                                                                                                                                              |
| `CONTRIBUTION_RESULTAT_NOTE`                   | Association résultat cible/note/révision utilisée, rang, coefficients, pondérations et valeurs exactes appliquées.                                                                                                                                            |
| `CONTRIBUTION_RESULTAT_SCOLAIRE`               | Association résultat cible/résultat source, rang, coefficients, pondérations et valeur exacte source utilisée.                                                                                                                                                |
| `BULLETIN_SCOLAIRE`                            | Inscription, période, date/statut de publication, contenu et structure figés, version de présentation, référence du document publié et bulletin rectifié éventuel.                                                                                            |
| `LIGNE_BULLETIN`                               | Bulletin, section/ordre, matière et libellés affichés, valeurs, coefficients affichés, appréciations et références aux résultats sources.                                                                                                                     |
| `CONSEIL_CLASSE`                               | Séance, contexte scolaire, période, date, état et compte rendu.                                                                                                                                                                                               |
| `AVIS_CONSEIL_PROGRESSION` (association)       | Avis d'un conseil concernant un élève; reste distinct de la décision individuelle.                                                                                                                                                                            |
| `DECISION_PROGRESSION`                         | Décision individuelle, élève, contexte, type, auteur, date, motif, état et référence à la décision remplacée/remplaçante. Le concept unique est propriétaire du domaine pédagogique; l'organisation en applique l'effet administratif.                        |
| `TRACE_SUIVI_PEDAGOGIQUE`                      | Observation/action durable, date, auteur, contenu et liens pédagogiques pertinents.                                                                                                                                                                           |

## 4. Identités, relations et cardinalités proposées

Cardinalités dans les deux sens; elles restent soumises à validation formelle du MCD.

### Programmes, enseignements et notes

- `PROGRAMME_SCOLAIRE` (1,N) — `VERSION_PROGRAMME` (1,1).
- `VERSION_PROGRAMME` (0,N) — `VERSION_CYCLE` (1,1); `CYCLE` existant (0,N) — `VERSION_CYCLE` (1,1). Même cardinalité pour `VERSION_NIVEAU`/`NIVEAU`; spécialité sur référentiel existant seulement.
- `VERSION_PROGRAMME` (0,N) — `PROGRAMME_MATIERE` (1,1); `MATIERE` (0,N) — `PROGRAMME_MATIERE` (1,1).
- `MATIERE` (0,N) — `ENSEIGNEMENT` (1,1). `CLASSE_ANNUELLE` existante (0,N) — `ENSEIGNEMENT` (1,1) pour les enseignements de classe; autres organisations restent à confirmer.
- `VERSION_PROGRAMME` (0,N) — `ENSEIGNEMENT` (1,1) pour la version explicitement sélectionnée.
- Enseignant existant (0,N) — `AFFECTATION_ENSEIGNANT` (1,1); `ENSEIGNEMENT` (0,N) — `AFFECTATION_ENSEIGNANT` (1,1).
- `ENSEIGNEMENT` (0,N) — `EVALUATION` (1,1); `BAREME` (0,N) — `EVALUATION` (0,1).
- `INSCRIPTION` (0,N) — `NOTE` (1,1); `EVALUATION` (0,N) — `NOTE` (1,1), unicité du couple inscription/évaluation.
- `NOTE` (1,N) — `REVISION_NOTE` (1,1), exactement une révision initiale; chaque révision a au plus une précédente et une suivante.

### Résultats et contributions

- `RESULTAT_SCOLAIRE` abstrait (1,1) — un et un seul sous-type (`RESULTAT_MATIERE`, `RESULTAT_PERIODE` ou `RESULTAT_ANNUEL`); la spécialisation est totale et disjointe.
- `INSCRIPTION` (0,N) — `RESULTAT_SCOLAIRE` (1,1). Chaque résultat référence une version de programme de référence et une version de méthode.
- Résultat cible (0,N) — `CONTRIBUTION_RESULTAT_NOTE` (1,1); `NOTE` (0,N) — contribution (1,1); `REVISION_NOTE` (0,N) — contribution (1,1), la révision doit appartenir à la note référencée.
- Résultat cible (0,N) — `CONTRIBUTION_RESULTAT_SCOLAIRE` (1,1); résultat source (0,N) — contribution (1,1), avec source différente de la cible.
- Tout résultat calculé possède au moins une contribution au total. Il utilise l'une ou l'autre association, sauf si la méthode explicitement versionnée autorise le mélange; dans ce cas les deux associations peuvent contribuer au même résultat. Les deux catégories restent toujours représentées séparément.
- Une même source note/révision ou un même résultat source est unique dans un résultat cible, sauf méthode explicitement versionnée qui justifie une multiplicité. Les rangs de contribution sont uniques dans un résultat.
- Une contribution de note identifie évaluation/date, inscription, affectation de classe existante valable, version programme source si nécessaire et révision exacte. Une contribution de résultat identifie sa source exacte et son applicabilité au moment de l'établissement de la cible.
- Un résultat a au plus un prédécesseur et un successeur directs dans sa chaîne de rectification/réétablissement; le lien est de même identité fonctionnelle.

### Bulletins et progression

- `INSCRIPTION` (0,N) — `BULLETIN_SCOLAIRE` (1,1); bulletin (1,N) — `LIGNE_BULLETIN` (1,1); ligne (0,N) — résultats sources (0,N).
- Bulletin précédent (0,1) — bulletin rectificatif (0,1) en lien direct. Le rectificatif conserve son contenu propre.
- `CONSEIL_CLASSE` (0,N) — `AVIS_CONSEIL_PROGRESSION` (1,1) — élève existant (0,N). Un avis n'est pas une décision.
- Élève existant (0,N) — `DECISION_PROGRESSION` (1,1); décision précédente (0,1) — décision suivante (0,1). Chaîne sans cycle ni branche.
- Élève existant (0,N) — `TRACE_SUIVI_PEDAGOGIQUE` (1,1); liens métier vers inscription/enseignement/évaluation/conseil/décision selon le cas.

### Identité fonctionnelle et version applicable

- `RESULTAT_MATIERE` : inscription + matière + portée temporelle (exactement une période ou l'année scolaire) + version de programme. Cela permet un résultat de matière périodique ou annuel sans créer un autre type.
- `RESULTAT_PERIODE` : inscription + période scolaire + version de programme.
- `RESULTAT_ANNUEL` : inscription + année scolaire + version de programme.
- Un seul résultat initial est admis pour chaque identité. Les rectifications et nouvel établissement après annulation conservent la même identité et prolongent la chaîne.
- La version est sélectionnée par correspondance de portée (cycle/niveau/spécialité existants), période et rattachement explicite de l'enseignement/source. Exactement un candidat applicable permet le calcul; zéro signifie version manquante; plusieurs candidats signifient chevauchement ambigu et aucun choix arbitraire.
- Le résultat conserve sa version de référence. La contribution conserve/référence séparément la version applicable à la source lorsque celle-ci diffère.

## 5. PED-A10 et PED-I01 à PED-I03 — intégrité et provenance

### PED-A10 — Deux modes de calcul

Le système V1 accepte `CONTRIBUTION_RESULTAT_NOTE` et `CONTRIBUTION_RESULTAT_SCOLAIRE` comme associations distinctes. Un résultat de période ou annuel peut agréger ses sources selon la méthode versionnée. Un calcul ne mélange pas les deux catégories sauf règle explicite et versionnée.

Chaque contribution conserve sa source, son rang, la valeur exacte réellement utilisée et les coefficients, pondérations et paramètres appliqués. Une source scolaire doit être applicable à la date d'établissement de la cible. Les dépendances restent consultables.

Règles d'intégrité : aucun résultat ne se source lui-même; le graphe des dépendances est acyclique; rectifier ou annuler une source ne modifie jamais silencieusement un résultat dépendant. Une éventuelle révision de la cible est une nouvelle opération métier explicite; aucune cascade automatique n'est définie.

### PED-I01 — Chaîne des révisions

Une note a exactement une révision `INITIALE` au premier rang. Toute révision ultérieure (`CORRECTION` ou `ANNULATION`) référence la révision précédente immédiate. Les rangs sont uniques et ordonnés, mais non nécessairement continus. Chaque révision a au plus une suivante; aucun cycle ou branche n'existe dans la chaîne canonique. Une contribution garde la révision historiquement utilisée même si elle cesse d'être la révision applicable.

Deux révisions concurrentes issues du même prédécesseur sont conservées comme événements/conflit selon VAL-014. Après arbitrage, une seule révision est appliquée à la chaîne canonique. Il n'y a ni LWW ni écrasement silencieux.

### PED-I02 — Provenance temporelle

Le résultat global porte date de référence et date d'établissement. Chaque contribution conserve le contexte de sa source : inscription; évaluation et date; affectation existante valable à la date d'évaluation; version programme applicable à cette source si nécessaire; révision exacte de note ou résultat source. La date globale du résultat ne remplace pas les dates sources. Aucun historique d'affectation parallèle n'est créé.

### PED-I03 — Chaîne des résultats

Les états et relations distinguent résultat initial, rectification d'un résultat applicable, annulation, et nouvel établissement après annulation. Le nouvel établissement après annulation prolonge la même chaîne en référençant le résultat annulé; il ne crée pas de branche. Au plus un successeur direct par résultat, aucun cycle, un résultat terminal applicable au plus par périmètre. Si le terminal est annulé, aucun résultat n'est applicable avant un nouvel établissement autorisé.

## 6. Règles métier et invariants

Les règles suivantes sont acceptées avec les arbitrages; elles définissent la proposition conceptuelle, mais leur intégration n'est pas une validation formelle du MCD.

| ID         | Règle métier                                                                                                                                             | Importance / statut                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| PED-RM-001 | Une note au plus par inscription et évaluation en V1.                                                                                                    | Obligatoire; unicité.                               |
| PED-RM-002 | Le résultat d'évaluation est `NOTE`; aucun `RESULTAT_EVALUATION`.                                                                                        | Obligatoire; évite doublon.                         |
| PED-RM-003 | Les résultats agrégés sont exclusivement `RESULTAT_MATIERE`, `RESULTAT_PERIODE`, `RESULTAT_ANNUEL`, sous-type du générique abstrait.                     | Obligatoire; périmètre.                             |
| PED-RM-004 | Toute note commence par une révision initiale; corrections/annulations sont des révisions liées à la précédente immédiate.                               | Obligatoire; historique.                            |
| PED-RM-005 | Rangs de révision uniques et ordonnés; continuité non exigée; chaîne applicable sans branche/cycle.                                                      | Obligatoire; compatibilité hors ligne.              |
| PED-RM-006 | Les situations de note sont `NOTE_ATTRIBUEE`, `ABSENCE_JUSTIFIEE`, `ABSENCE_NON_JUSTIFIEE`, `DISPENSE`, `NON_EVALUE`; elles sont historisées.            | Obligatoire; valeur numérique absente si non notée. |
| PED-RM-007 | Absence ou dispense n'est jamais transformée automatiquement en zéro; méthode versionnée détermine leur admissibilité.                                   | Obligatoire; aucune règle implicite.                |
| PED-RM-008 | Les méthodes sont versionnées; normalisation, paramètres, précision et arrondis sont explicites/déterministes.                                           | Obligatoire; reproductibilité.                      |
| PED-RM-009 | Chaque coefficient a un propriétaire de définition unique et composition explicite; pas de double application.                                           | Obligatoire; cohérence calcul.                      |
| PED-RM-010 | Un résultat calculé a au moins une source note ou résultat scolaire antérieur.                                                                           | Obligatoire; aucune contribution fictive.           |
| PED-RM-011 | Les contributions note et résultat scolaire sont distinctes; le mélange exige une méthode versionnée.                                                    | Obligatoire; PED-A10.                               |
| PED-RM-012 | Une contribution conserve la source et la valeur/les paramètres effectivement utilisés.                                                                  | Obligatoire; audit.                                 |
| PED-RM-013 | Une source de résultat est applicable à l'établissement de la cible; pas d'auto-dépendance ni cycle.                                                     | Obligatoire; intégrité.                             |
| PED-RM-014 | Une rectification ultérieure d'une source ne change pas silencieusement les cibles dépendantes.                                                          | Obligatoire; historique.                            |
| PED-RM-015 | Résultat initial, rectification, annulation et réétablissement après annulation sont distincts et reliés dans une seule chaîne.                          | Obligatoire; PED-I03.                               |
| PED-RM-016 | Résultat initial unique et au plus un résultat courant par identité fonctionnelle.                                                                       | Obligatoire; pas de contradiction.                  |
| PED-RM-017 | La classe source est l'affectation existante valable à la date d'évaluation.                                                                             | Obligatoire; dépendance D1/D3.                      |
| PED-RM-018 | Sélection version programme déterministe; chevauchement ambigu signalé et suspend le choix.                                                              | Obligatoire; pas d'arbitrage implicite.             |
| PED-RM-019 | Résultat et sources conservent leurs références de version historiques respectives.                                                                      | Obligatoire; stabilité historique.                  |
| PED-RM-020 | Un bulletin publié conserve son contenu, sa structure, ses résultats sources et le document publié; rectificatif = nouveau bulletin.                     | Obligatoire; immutabilité.                          |
| PED-RM-021 | Avis de conseil et décision de progression sont distincts; décision individualisée, propriété pédagogique, application administrative organisationnelle. | Obligatoire; responsabilité unique.                 |
| PED-RM-022 | Aucune décision de progression ne modifie automatiquement une classe hors règles organisationnelles.                                                     | Obligatoire; frontière de domaines.                 |
| PED-RM-023 | Conflit pédagogique sensible suit VAL-014; aucune résolution métier LWW.                                                                                 | Obligatoire; Offline-First.                         |

Invariants synthétiques : note unique par inscription/évaluation; révision initiale unique et chaîne de révisions linéaire; contribution de note référence une révision appartenant à sa note; un seul sous-type de résultat parmi les trois; unicité du périmètre; chaîne de rectification/réétablissement sans cycle ni branche; graphe des dépendances entre résultats acyclique, avec plusieurs résultats cibles autorisés à référencer une même source; sources applicables à leur date; valeurs et paramètres figés; affectation temporelle tirée exclusivement de l'historique existant; bulletin publié immuable; décision individualisée; aucun mélange de statuts métier et de statuts de synchronisation.

## 7. Cycles de vie métier proposés

| Concept                               | Cycle métier                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Version de programme                  | BROUILLON → APPLICABLE → REMPLACEE ou RETIREE; références historiques conservées.                                       |
| Enseignement / affectation enseignant | PREPARE → ACTIF → TERMINE ou ANNULE, avec période de validité.                                                          |
| Évaluation                            | PREPAREE → OUVERTE → CLOTUREE ou ANNULEE.                                                                               |
| Note                                  | A_SAISIR → révision INITIALE portant une situation → révision CORRECTION ou ANNULATION; toutes les versions conservées. |
| Résultat scolaire                     | EN_CALCUL → ETABLI → RECTIFIE, ANNULE, ou nouvel établissement après annulation.                                        |
| Bulletin                              | PREPARE → VERIFIE → PUBLIE; rectification par un nouveau bulletin.                                                      |
| Conseil / avis                        | PREVU → TENU → COMPTE_RENDU_ETABLI; avis éventuellement produit.                                                        |
| Décision de progression               | DELIBEREE → PRISE → APPLICABLE → REMPLACEE ou ANNULEE; application administrative séparée.                              |
| Suivi pédagogique                     | OUVERT → SUIVI → CLOS; statuts détaillés à confirmer selon besoin.                                                      |

Les états métier restent distincts de transmission, réception, traitement et acquittement du lot 8.

## 8. Offline-First et conflits

- La saisie locale de note, révision ou calcul suit les permissions et règles métier; l'événement est immuable et toute correction produit un nouvel événement selon VAL-014.
- Des révisions concurrentes sont conservées comme alternatives de conflit. Une seule est appliquée à la chaîne canonique après arbitrage autorisé; aucune stratégie LWW.
- Un résultat dépendant d'une source dont l'applicabilité est en conflit ne devient pas établi avant résolution de cette source.
- Un résultat calculé localement peut être proposé hors ligne. L'état métier ETABLI et la réception/acquittement de synchronisation sont distincts; l'acceptation transport ne suffit pas à établir le résultat métier.
- Un bulletin peut être préparé hors ligne. Sa publication officielle attend la résolution des sources en conflit; le document et les valeurs publiés sont ensuite figés.
- Une décision de progression reste individualisée et soumise aux droits existants; son application à la classe est une opération distincte du domaine organisationnel.
- Aucun protocole, curseur, flux ou modèle de conflit parallèle n'est ajouté. Les cas inter-appareils utilisent VAL-014.

Le serveur applique les contrôles du domaine propriétaire à la réception, conformément au lot 8. Une approbation centrale métier généralisée n'est pas ajoutée; les conditions d'officialité locale et de publication restent à aligner avec les autorisations transversales existantes.

## 9. Dépendances et points de contrôle avant validation formelle

- **Historique d'affectation (D1/D3) :** les documents confirment que les changements sont historisés, mais ne montrent pas les bornes de validité ou la règle assurant une affectation unique à la date d'évaluation. Le propriétaire doit confirmer que la classe historique peut être identifiée sans ambiguïté. Aucun changement direct ni duplication n'est fait ici.
- **Identité enseignant :** le dépôt ne documente pas le référentiel existant auquel `AFFECTATION_ENSEIGNANT` doit se rattacher. Il faut confirmer cette référence transversale, sans créer de compte ou référentiel local au domaine pédagogique.
- **Paramétrages de calcul :** les coefficients, barèmes, normalisations, précisions et arrondis concrets seront configurés par méthodes versionnées; aucune valeur n'est fixée par le MCD.
- **Reprise de résultats dépendants :** le résultat source rectifié/annulé ne modifie pas la cible; le propriétaire doit confirmer quand une revue ou un nouvel établissement explicite de la cible est nécessaire.
- **Périmètre matière annuel :** le modèle permet RESULTAT_MATIERE à l'échelle d'une période ou d'une année; les méthodes et règles de calcul correspondantes doivent être configurées et confirmées.
- **Conservation documentaire :** contenu, structure et document publié sont conservés; la durée/règle de rétention relève de la politique documentaire, et l'archive graphique au pixel près n'est pas requise conceptuellement en V1.
- **Progression :** propriétaire pédagogique et application organisationnelle sont acceptés; il reste à raccorder les rôles/permissions existants et les transitions aux référentiels d'autorité sans nouvelle hiérarchie.

Ces dépendances ne remettent pas en cause les arbitrages acceptés. La validation formelle du propriétaire reste nécessaire; aucun modèle du domaine enseignant ou mécanisme organisationnel manquant n'est inventé.
