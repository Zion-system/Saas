# FEUILLE DE ROUTE — Finir l'application (du 11/11/2026)

Document de pilotage. Lis-le de haut en bas : chaque étape dit ce qu'on fait,
pourquoi, et combien de temps ça prend environ.

---

## 1. Où tu en es aujourd'hui (état exact de ce paquet)

Ce paquet est le projet **complet et corrigé** :

- Parcours de création d'école en 6 étapes (maquette vidéo, vert #2d8a6b)
  **intégré au bon endroit** : `src/pages/configuration/` contient exactement
  `ConfigurationInitiale.tsx`, `etapes.tsx`, `composants.tsx`, `donnees.ts`.
- Indicatif **+242**, année scolaire **dynamique** (fuseau Africa/Brazzaville),
  FCFA, classes congolaises (Préscolaire → Terminale) avec sélecteur
  « Système congolais / français / Ma propre liste ».
- Enregistré en base : École + Classes. Différé avec messages honnêtes :
  Frais (G-02 à G-08), Élèves (dossier élève à venir), Équipe (Supabase).
- Zone gelée `src/database/local/` : intouchée.
- Contrôles refaits ce matin : `npm run build` réussi, `npm run lint`
  **0 warning / 0 erreur**, `npm test` **138 tests passés (18 fichiers)**.

## 2. Étape 0 — Remise en route chez toi (≈ 30 min)

1. Ferme l'éditeur et le serveur de développement s'ils sont ouverts.
2. **Garde ton dossier `.git`** (c'est ta mémoire de versions) : copie-le
   de côté, ou recopie le paquet *autour* de lui.
3. Remplace tout le contenu de `d:/Projets/gestion scolaire/gestion-scolaire/`
   par le contenu de ce paquet (sauf `.git` que tu remets à sa place).
4. Dans le terminal, dans le dossier du projet :
   ```
   npm install
   npm run dev
   ```
5. Vérifie : le parcours de création d'école s'ouvre, tu peux créer l'école,
   choisir les classes congolaises, arriver à l'écran Terminé, et en
   **rouvrant la page** les données sont toujours là (persistance).

Le paquet **n'inclut pas** `node_modules` (normal : il se reconstruit avec
`npm install`) ni `dist` (se reconstruit avec `npm run build`).

## 3. Aujourd'hui — l'ordre des chantiers pour finir l'app

P1 → P4 dans cet ordre. Chaque chantier se termine par : build + lint
0/0 + tests au vert, puis un commit (sans amend, sans push).

### P1 — Dossier Élèves, version minimale mais réelle (≈ 2 h) : le cœur

Sans élèves, l'application ne sert à rien. Il faut pouvoir :
- créer un élève manuellement : nom, sexe, date de naissance, classe ;
- lister les élèves d'une classe, corriger une fiche, désinscrire ;
- brancher l'étape 4 du parcours de création d'école sur ce module
  (aujourd'hui elle affiche un bandeau orange honnête).

### P2 — Accueil public + création de compte (B0-A-2, ≈ 2 h)

- Suivre `design/connexion-finale.png` avec les 5 corrections déjà
  arbitrées : +242, Congo/Brazzaville, domaine `.cg`, chiffres honnêtes,
  pas de mention d'essai gratuit.
- Mot de passe : 10 caractères minimum. Année affichée : 2026-2027.
- La création de compte local existe déjà (migration 017) : il reste
  l'écran d'accueil qui y mène.

### P3 — Sauvegarde et restauration (≈ 1 h) : la ceinture de sécurité

Une école ne doit jamais perdre ses données : un bouton « Sauvegarder »
qui exporte le fichier de base SQLite, et « Restaurer » qui le recharge.
Petit chantier, énorme valeur.

### P4 — Frais scolaires : arbitrer AVANT de coder (≈ arbitrage 30 min, code ensuite)

Le module d'argent est bloqué par les points G-02 à G-08 du carnet de
gouvernance. Ce n'est pas de la technique : ce sont des **décisions** à
prendre (qui décide des barèmes, que fait-on des impayés, etc.).
- Si tu arbitres aujourd'hui : on code barèmes + encaissements sur le
  socle déjà conçu (docs 19 et 20, lecture seule).
- Si tu n'arbitres pas aujourd'hui : on prépare uniquement l'écran des
  barèmes, sans argent réel, et on garde l'honnêteté du bandeau orange.

### Ce qui n'est PAS pour aujourd'hui (et pourquoi)

- **Équipe pédagogique** : les invitations par e-mail exigent la base
  distante Supabase. Coder avant = jeter le travail.
- **Import Excel réel** : il arrive avec le module Élèves (P1 le rend
  possible ensuite).

## 4. Demain et après — la phase C (Supabase)

1. Créer le projet Supabase (PostgreSQL distant) et y porter les tables.
2. Authentification réelle + permissions (qui peut faire quoi).
3. Synchronisation local → distant.
4. **Alors seulement** : passer `AUTH_DESACTIVEE_TEMPORAIREMENT` à
   `false` dans `src/config/authentification.ts`.
   Règle absolue : **ne jamais livrer l'école avec l'interrupteur à
   `true`** — ce serait laisser l'app sans comptes ni mots de passe.

## 5. Les règles d'or (inchangées)

- Tests au vert avant chaque fin de chantier (build, lint 0/0, tests 100 %).
- `src/database/local/` gelée ; docs 19 et 20 en lecture seule.
- Argent en **FCFA**, dates sur le fuseau **Africa/Brazzaville**.
- Commits : jamais d'amend, jamais de push.

## 6. Deux questions en attente de ta décision

1. Écran Accueil : 2 actions rapides ou 4 ? (à trancher avec P2)
2. Options d'avenir 1 / 2 / 3 discutées précédemment.
