# Périmètre et principes de conception

**Projet :** ERP de gestion scolaire  
**Version documentaire :** 0.9.1  
**Statut :** En cours de formalisation

## 1. Présentation du projet

L'objectif est de développer un ERP de gestion scolaire destiné principalement aux établissements privés du Congo-Brazzaville.

La solution doit permettre de centraliser et de gérer les activités administratives, scolaires, pédagogiques et financières d'un établissement.

L'application doit être moderne, fiable, sécurisée et utilisable même lorsque la connexion Internet est indisponible.

## 2. Périmètre fonctionnel V1

La V1 prend en charge les établissements proposant les niveaux suivants :

- Préscolaire.
- Primaire.
- Collège.
- Lycée général.
- Lycée technique.
- Enseignement professionnel.

Les universités et instituts supérieurs sont exclus du périmètre initial.

Le déploiement V1 concerne un établissement par installation.

## 3. Objectifs principaux

- Gérer l'organisation scolaire.
- Gérer les élèves et leurs dossiers.
- Gérer les inscriptions et réinscriptions.
- Gérer les classes et les parcours scolaires.
- Gérer les activités pédagogiques.
- Gérer les évaluations et les résultats.
- Gérer les frais scolaires et les opérations financières.
- Gérer les utilisateurs et leurs autorisations.
- Assurer la traçabilité des opérations importantes.

### Domaine 4 — Lot 7 gelé sous VAL-013

Le lot 7 couvre conceptuellement les soldes financiers calculés, les impayés, relances, balances âgées et relevés. Son MCD V1.0 est validé et gelé sous VAL-013 le 2026-11-04 à la demande explicite du propriétaire du projet. Ses décisions et invariants FIN-LOT7-001 à FIN-LOT7-028 ne doivent pas être modifiés sans demande explicite et traçabilité. Les lots financiers 1 à 5 et les domaines 1 à 3 conservent leurs décisions validées. Le lot 6 demeure provisoire avec quatre points ouverts. Le lot 7 consomme les effets des entités financières antérieures sans redéfinir leurs mécanismes.

### Domaine 4 — Lot 8 gelé sous VAL-014

Le MCD V1.0 du lot 8 — synchronisation Offline-First, intégrité, idempotence, conflits et arbitrage central, sécurité, sauvegarde/restauration et reprise après interruption — est validé et gelé sous VAL-014 le 2026-11-04. Les événements et règles des lots 1 à 7 restent propriétaires de leurs domaines; le lot 8 assure leur transport et leur cohérence de synchronisation. Les choix techniques et opérationnels ouverts sont consignés dans `08-mcd-consolide-lot8.md`; ils ne rouvrent pas le MCD conceptuel. Le MCD global V1.0 reste à valider séparément.

Les situations, restes à payer, balances âgées, relevés dynamiques et synthèses sont des résultats calculés, pas des écritures comptables. Un document généré et conservé est un artefact de référence, jamais une source comptable. Les transmissions de relance doivent conserver un historique durable par tentative; le service applicatif existant doit être réutilisé s'il fournit cette garantie, sinon un concept enfant dédié est proposé dans le dictionnaire. Les détails de relations, dépendances et points non documentés figurent dans les documents du MCD.

## 4. Principes techniques

### 4.1 Offline-First

L'application doit rester utilisable sans connexion Internet.

Chaque appareil possède sa propre base de données locale contenant les données nécessaires à son utilisation.

Lorsqu'une connexion Internet est disponible, les données peuvent être synchronisées avec le serveur.

Un appareil peut rester hors ligne pendant plusieurs jours ou semaines.

Les décisions conceptuelles de synchronisation, de sécurité des échanges, des sauvegardes/restaurations et de reprise après interruption sont gelées sous VAL-014 et détaillées dans `08-mcd-consolide-lot8.md`. Les choix techniques et opérationnels encore ouverts restent suivis dans ce document et le registre des décisions.

### 4.2 Synchronisation

La synchronisation ne doit pas écraser silencieusement les modifications contradictoires.

Les conflits importants doivent être détectés, conservés et soumis à une résolution humaine par un utilisateur autorisé.

Le serveur doit vérifier l'intégrité des données reçues.

### 4.3 Identifiants

Les entités utilisent des UUID afin de faciliter la création locale des données et leur synchronisation ultérieure.

### 4.4 Historisation

Les opérations importantes doivent conserver leur historique.

Les corrections d'opérations sensibles doivent être traçables.

Les données opérationnelles importantes ne doivent pas être supprimées physiquement sans justification et règle explicite.

### 4.5 Sécurité

L'application doit respecter les principes suivants :

- Authentification des utilisateurs.
- Autorisations selon les rôles et permissions.
- Protection des données personnelles des élèves.
- Validation des données côté application et côté serveur.
- Journalisation des opérations sensibles.
- Protection contre les accès non autorisés.

## 5. Modèle commercial

La solution est destinée à être commercialisée sous forme d'abonnement mensuel par établissement.

Le tarif dépend notamment du nombre d'élèves de l'établissement.

Les modalités commerciales détaillées seront définies séparément.

## 6. Utilisateurs et rôles

Les profils fonctionnels envisagés comprennent :

- Administrateur.
- Directeur.
- Secrétaire ou superviseur.
- Enseignant.
- Comptable.
- Caissier.

Les permissions doivent pouvoir être différenciées selon les responsabilités.

La définition détaillée des permissions appartient au domaine de gestion des utilisateurs.

## 7. Principes de conception métier

- Une donnée métier doit avoir une responsabilité clairement définie.
- Les relations entre les entités doivent être cohérentes.
- Les opérations sensibles doivent être traçables.
- Les corrections ne doivent pas effacer l'historique.
- Les règles métier doivent être indépendantes de l'interface.
- Les données locales doivent rester exploitables hors connexion.
- Les conflits de synchronisation doivent être traités explicitement.

## 8. Fonctionnalités hors périmètre initial

Les fonctionnalités suivantes sont reportées à des évolutions ultérieures :

- Portail parents.
- Notifications SMS.
- Application mobile native.
- Intégration WhatsApp.
- Bibliothèque scolaire.
- Cantine.
- Transport scolaire.
- Internat.
- Infirmerie.
- Gestion des ressources humaines et paie.
- Intégrations avec les systèmes ministériels.
- Intelligence artificielle avancée.

## 9. Ordre de conception et de développement

L'ordre de travail retenu est :

1. Formalisation du MCD.
2. Validation des entités et relations.
3. Élaboration du MLD.
4. Création de la base de données locale.
5. Définition de la direction visuelle.
6. Conception des interfaces.
7. Développement des modules métier.
8. Synchronisation.
9. Tests et déploiement.

## 10. Statut du document

Ce document constitue le cadre général de référence.

Les décisions détaillées propres à chaque domaine sont documentées dans les autres fichiers de conception.
