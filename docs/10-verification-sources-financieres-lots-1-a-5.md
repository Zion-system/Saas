# 10 — Vérification des sources financières des lots 1 à 5

**Périmètre :** recherche documentaire avant le passage du MCD global V1.0 au MLD  
**Résultat :** Situation C — aucun modèle source détaillé des lots 1 à 5 retrouvé dans le dépôt  
**Statut des lots :** déclarés validés et gelés par la mission; aucun détail normatif absent n'est reconstitué dans ce rapport.

## 1. Recherche effectuée

Le dépôt `D:/Projets/gestion scolaire/gestion-scolaire` a été parcouru récursivement, y compris `docs/`, `src/`, les fichiers cachés et les emplacements susceptibles de contenir des archives ou copies anciennes. Les termes recherchés comprenaient notamment « lots 1 à 5 », `CREANCE`, `PLAN_REGLEMENT_CREANCE`, `ECHEANCE_CREANCE`, `ENCAISSEMENT`, `AFFECTATION_REGLEMENT`, `MOUVEMENT_CREDIT`, `SESSION_CAISSE`, `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE`, `RAPPROCHEMENT_CAISSE` et `FIN-LOT`.

Résultats de l'inventaire :

- Avant la création du présent rapport, les documents de conception détenus par le projet étaient les dix Markdown `docs/00` à `docs/09`, ainsi que `README.md`. Ce fichier `docs/10` est le seul document ajouté par cette mission.
- `node_modules/` contient des documents tiers de dépendances; une recherche ciblée des noms d'entités financières et des références FIN dans l'ensemble du dépôt, y compris ces dépendances, n'y a trouvé aucun modèle métier pertinent. `dist/` ne contient aucun document source métier.
- Aucun PDF, DOCX/DOC, TXT, RTF, ODT, XLSX/XLS, présentation, archive ZIP/7z/RAR, sauvegarde `.bak`/`.old` ou copie analogue contenant un modèle source n'a été trouvé.
- Aucun sous-dossier d'archives ou de documentation ancienne n'a été trouvé dans le projet. Le dossier parent contient le projet et les dépendances d'environnement, sans autre copie du projet. L'inventaire complet du dépôt comporte 1 823 fichiers; les documents tiers sous dépendances ont été distingués des sources de conception du projet.
- `src/` et les autres fichiers du projet ne contiennent pas de modèle détaillé des lots financiers 1 à 5.
- Le répertoire n'est pas un dépôt Git exploitable (`git rev-parse --show-toplevel` échoue : aucun dépôt Git dans le répertoire ou ses parents). Aucun historique Git local ne peut donc être consulté.

Les fichiers globaux `01` à `07` et les références spécialisées `08` et `09` ont été examinés pour distinguer les synthèses des modèles sources. Le document `08` n'est utilisé que pour confirmer ses frontières de responsabilité; il ne documente pas les modèles financiers antérieurs.

## 2. État documentaire par lot

| Lot | Statut de validation fourni par la mission | Modèle source détaillé retrouvé | Version/référence propre au lot | Éléments vérifiables dans le dépôt |
| --- | --- | --- | --- | --- |
| 1 | Validé et gelé | Non | Non retrouvée | Aucun modèle, dictionnaire ou historique de validation attribuable spécifiquement au lot 1. |
| 2 | Validé et gelé | Non | Non retrouvée | Aucun modèle, dictionnaire ou historique de validation attribuable spécifiquement au lot 2. |
| 3 | Validé et gelé | Non | Non retrouvée | Aucun modèle, dictionnaire ou historique de validation attribuable spécifiquement au lot 3. |
| 4 | Validé et gelé | Non | Non retrouvée | Aucun modèle, dictionnaire ou historique de validation attribuable spécifiquement au lot 4. |
| 5 | Validé et gelé | Non | Non retrouvée | Aucun modèle, dictionnaire ou historique de validation attribuable spécifiquement au lot 5. |

La validité et le gel sont repris du contexte officiel fourni pour la mission. Le dépôt ne permet pas de vérifier séparément, pour chacun de ces lots, le numéro de version, la date, la référence VAL éventuelle ou le contenu exact de la décision. Aucune référence de validation supplémentaire n'est inventée.

## 3. Concepts et relations effectivement visibles dans les synthèses

Le dictionnaire global (`02-dictionnaire-des-entites.md`, section 4) regroupe les noms historiques suivants comme entités antérieures validées des lots 1 à 5, sans en donner l'attribution lot par lot :

- `CREANCE`
- `PLAN_REGLEMENT_CREANCE`
- `ECHEANCE_CREANCE`
- `ENCAISSEMENT`
- `AFFECTATION_REGLEMENT`
- `MOUVEMENT_CREDIT`
- `SESSION_CAISSE`
- `MOUVEMENT_CAISSE`
- `CLOTURE_CAISSE`
- `RAPPROCHEMENT_CAISSE`

Ces mentions confirment seulement que ces concepts sont cités dans la synthèse. Elles ne fournissent aucun dictionnaire source ni attribut conceptuel détaillé pour les lots 1 à 5. Aucun attribut, cycle de vie, invariant ou règle métier de ces modèles sources ne peut être reconstitué à partir de cette liste.

Les synthèses globales présentent les dépendances suivantes, mais ne permettent pas de vérifier leur formulation normative ni leurs multiplicités auprès des sources d'origine :

- `CREANCE` — `PLAN_REGLEMENT_CREANCE` — `ECHEANCE_CREANCE` : le plan et les échéances structurent le règlement d'une créance; le lot 7 calcule les échéances actives sans additionner de nouveau leur montant parent.
- `ENCAISSEMENT` — `AFFECTATION_REGLEMENT` — cible financière : les encaissements sont distingués des affectations; la cible exacte et les cardinalités des liens vers `CREANCE` ou `ECHEANCE_CREANCE` ne sont pas documentées.
- `MOUVEMENT_CREDIT` — `RESERVATION_CREDIT` : le lien au mouvement positif source apparaît dans les orientations provisoires du lot 6, pas comme un modèle source des lots 1 à 5.
- `SESSION_CAISSE`, `MOUVEMENT_CAISSE`, `CLOTURE_CAISSE` et `RAPPROCHEMENT_CAISSE` sont nommés, mais leurs relations aux encaissements, paiements ou autres mouvements ne sont pas documentées.
- Une relation générique « Paiement — Créance » plusieurs-à-plusieurs via une affectation est mentionnée dans `03-relations-et-cardinalites.md`; son mapping exact vers les concepts historiques ci-dessus n'est pas établi.

Ces éléments proviennent des synthèses `01-mcd-global.md`, `02-dictionnaire-des-entites.md`, `03-relations-et-cardinalites.md`, `04-regles-metier.md` et des dépendances reprises par le lot 7. Ils ne constituent pas les documents sources détaillés demandés.

## 4. Vérification lot par lot

Pour chacun des lots 1, 2, 3, 4 et 5, les informations ci-dessous sont introuvables dans les sources du dépôt :

- le document normatif et sa version;
- l'affectation des entités historiques à ce lot;
- le dictionnaire d'attributs conceptuels;
- les relations, cardinalités minimales/maximales et règles d'unicité;
- les règles métier et invariants;
- les cycles de vie et transitions;
- les dépendances vers les domaines 1 à 3 et vers les autres lots financiers;
- la référence de validation, sa date et l'historique de ses modifications.

Il n'est donc pas possible de présenter une synthèse détaillée fidèle séparément pour chacun des cinq lots. Les relations de synthèse listées en section 3 ne sont pas attribuées arbitrairement à un lot.

## 5. Comparaison au MCD global actuel

Le MCD global actuel inventorie les dix concepts financiers ci-dessus et indique explicitement que leurs attributs et cardinalités propriétaires ne sont pas disponibles dans le dépôt (`01`, `02` et `03`). Il distingue les faits des lots 1 à 5 des orientations provisoires du lot 6 et des règles gelées du lot 7 sous VAL-013. Cette séparation est cohérente avec l'absence des modèles sources.

Aucune divergence avec les décisions normatives des lots 1 à 5 ne peut être confirmée ou écartée sans ces décisions sources. Aucun écart vérifiable n'a été découvert dans les documents disponibles; cela ne constitue pas une validation indépendante des relations historiques.

Le MCD global n'a pas été modifié : aucune source détaillée retrouvée ne permettait de confirmer une nouvelle information déjà validée. Les quatre points ouverts du lot 6, VAL-013, VAL-014 et VAL-015 ne sont pas touchés.

## 6. Lacunes et travaux nécessaires avant le MLD

Avant de figer le mapping financier dans le MLD, obtenir pour chaque lot 1 à 5 :

1. Le document source normatif, sa version, sa date et sa référence de validation.
2. Le dictionnaire détaillé des concepts et attributs.
3. Les diagrammes ou tableaux de relations avec leurs cardinalités et contraintes d'unicité.
4. Les règles métier, invariants, cycles et dépendances vers les autres domaines/lots.
5. L'historique des décisions permettant de vérifier les éventuelles évolutions.
6. La table de correspondance officielle entre les notions génériques des synthèses (par exemple « paiement ») et les noms propriétaires (par exemple `ENCAISSEMENT`), si elle existe.

Une fois ces sources retrouvées, comparer leurs références au MCD global et signaler toute divergence au propriétaire du lot. Ne pas modifier une décision gelée sans décision explicite et traçable.

## 7. Conclusion

- **Les cinq lots sont-ils documentés dans le dépôt ?** Non. Aucun modèle source détaillé des lots 1 à 5 n'a été retrouvé.
- **Leurs relations et cardinalités sont-elles vérifiables ?** Non. Seules quelques dépendances générales figurent dans les synthèses, sans leurs cardinalités sources.
- **Le MCD global peut-il passer au gel définitif ?** Le dépôt ne permet pas d'attester la complétude ni la conformité des interfaces financières des lots 1 à 5. Il n'est donc pas possible de recommander un gel global définitif sur la base de cette vérification. Les lots 1 à 5 eux-mêmes restent gelés selon la décision fournie; aucune de leurs décisions n'est rouverte.
- **Blocage réel :** l'absence des sources empêche de vérifier les attributs et les relations financières historiques, en particulier les rattachements créance–élève/inscription, frais–créance et caisse–encaissement. Les documents doivent être retrouvés ou le propriétaire doit explicitement accepter cette limite avant le gel global.
- **Documents spécialisés préservés :** aucun lot 6, 7 ou 8 n'a été modifié. VAL-013, VAL-014, VAL-015, FIN-LOT7-001 à FIN-LOT7-028 et SYNC-001 à SYNC-083 restent inchangés.
- **Production technique :** aucun MLD, SQL, migration ou code n'a été produit.
