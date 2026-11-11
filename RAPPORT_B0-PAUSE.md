# RAPPORT MISSION B0-PAUSE — ANTI-VERROU + INTERRUPTEUR D'AUTHENTIFICATION

Exécutée par Z.ai (agent de remplacement), le 10/11/2026, dans une copie du projet.

---

## 1. PARTIE A — DIAGNOSTIC DU VERROU ET CORRECTIONS

### Diagnostic

- La connexion SQLite est **déjà un singleton correct** (promesse partagée
  `initializationPromise` dans `sqlite.client.ts`, Worker unique) : le
  double-ouverture intra-onglet n'était pas la cause.
- Causes réelles du SQLITE_BUSY observé :
  1. **Deux onglets/fenêtres** ouverts sur l'application (le second reçoit
     le refus de verrou) ;
  2. **Rechargement à chaud (HMR) de Vite** : si un module de
     `src/database/local/` change, il est ré-exécuté — l'état du Worker est
     réinitialisé alors que l'ancien Worker tient toujours le verrou du
     fichier OPFS → SQLITE_BUSY garanti.
- Aucun `PRAGMA busy_timeout` n'était configuré : le moindre verrou
  transitoire faisait échouer immédiatement.

### Corrections appliquées [MODIFIÉ]

| Fichier | Correction |
| --- | --- |
| `src/App.tsx` | `PRAGMA busy_timeout = 5000` appliquée à la connexion juste après l'initialisation ; traduction des erreurs : si SQLITE_BUSY, message humain (« L'application semble déjà ouverte ailleurs… ») + détail technique en petit dessous |
| `vite.config.ts` | Nouveau plugin local `pleinRechargementZoneBase` : toute modification d'un fichier de `src/database/local/` (zone gelée) force un **rechargement complet** de la page au lieu d'un rechargement à chaud — l'ancien Worker et son verrou sont alors proprement détruits (Vite 8 a retiré `import.meta.hot.decline()`, d'où ce plugin) |

**Limite honnête à connaître** : le `busy_timeout` est appliqué depuis
`App.tsx` (après l'ouverture), car le fichier `sqlite.worker.ts` — où la base
est réellement ouverte — est dans la **zone gelée** et n'a pas été touché.
Le verrou pendant l'ouverture elle-même (2e onglet) reste donc couvert par le
message humain plutôt que par l'attente. Une ligne dans `sqlite.worker.ts`
(`db.exec("PRAGMA busy_timeout = 5000;")` juste après l'ouverture) couvrirait
100 % des cas, mais elle nécessite ton autorisation explicite (zone gelée).

---

## 2. PARTIE B — INTERRUPTEUR « DÉMARRAGE SANS CONNEXION »

### L'interrupteur (emplacement exact)

- **Fichier : `src/config/authentification.ts` [CRÉÉ]**
- **Constante : `AUTH_DESACTIVEE_TEMPORAIREMENT = true`** (ligne 15)
- Commentaire intégré : « TEMPORAIRE : à repasser à false quand
  l'authentification Supabase sera branchée. NE PAS LIVRER L'ÉCOLE AVEC true. »

### Branchement [MODIFIÉ]

| Fichier | Branchement |
| --- | --- |
| `src/App.tsx` | interrupteur `true` → pas de vérification compte/session/école → tableau de bord direct ; `false` → logique de reprise B0-A inchangée |
| `src/app/router/routes.tsx` | `GardeSession` : interrupteur `true` → passage libre ; `false` → redirection vers connexion (logique B0-A inchangée). NB : le fichier a été normalisé (fins de ligne Windows CRLF → LF), cause probable des anciens soucis d'édition de l'agent |
| `src/components/layout/LayoutPrincipal.tsx` | bouton « Se déconnecter » masqué tant que l'interrupteur est sur `true` (aucune session à fermer) |

### Travail B0-A conservé à 100 %

Service de comptes (`src/services/compte/`), migration 017
(`compte_utilisateur`), écrans onboarding (`Bienvenue`, `Connexion`, `Ecole`,
`Classes`, `Termine`) : **rien n'a été supprimé ni modifié dans leur logique**.
Remettre l'interrupteur sur `false` réarme tout le parcours d'accueil.

---

## 3. TESTS & VÉRIFICATIONS

### État des lieux réel (avant corrections)

Contrairement au rapport précédent qui annonçait 2 échecs, la suite complète
montrait **13 tests en échec** :

- 11 tests de migrations : tableaux de versions codés en dur `[1…16]` non
  mis à jour après l'ajout de la migration 017 (l'agent précédent n'avait
  corrigé que 2 fichiers sur 13) + compteur « 76 tables » devenu 77 ;
- 2 tests du service compte : le faux WebCrypto renvoyait un hash
  « zéro » qui ne pouvait jamais correspondre au hash simulé — les tests se
  contredisaient eux-mêmes.

### Corrections des tests [MODIFIÉ]

- Tableaux de versions `[1…17]` rétablis dans : `003`, `004`, `005`, `006`,
  `007`, `008`, `009`, `010`, `011` (2 formats), `012`
  (+ liste des noms `{version, name}`), et compteur `77` dans
  `schema-integration.test.ts` (013 déjà à jour, contenu inchangé) ;
- `src/services/compte/compte.test.ts` réécrit proprement : **vrai WebCrypto**
  (celui de Node, comme en production) + faux exécuteur SQLite qui stocke
  réellement les INSERT et répond aux SELECT → les tests de connexion sont
  de vrais aller-retours (créer un compte → se connecter avec le même mot de
  passe) ; aucun test supprimé ni affaibli, les 9 tests sont tous là et plus
  exigeants qu'avant ;
- `src/pages/onboarding/Ecole.tsx` : `new Date()` sorti du rendu React
  (pureté) + calcul de l'année scolaire désormais réellement sur le fuseau
  `Africa/Brazzaville` (l'ancien code utilisait le fuseau de l'appareil) ;
- `src/pages/onboarding/Connexion.tsx` : second `new Date()` dans le rendu
  (pied de page ©), non signalé par le rapport précédent — corrigé pareil ;
- `.oxlintignore` [CRÉÉ] : `dist/` polluait le lint après chaque build
  (2380 warnings de code minifié).

### Résultats finaux

| Contrôle | Résultat |
| --- | --- |
| `vitest` | **137 / 137 passés** (18 fichiers de tests) |
| `oxlint` | **0 erreur, 0 warning** (97 fichiers) |
| `tsc -b` + `vite build` | **compilation réussie** |

### Zone gelée et documents

- `src/database/local/` : **aucun fichier touché** (vérifié par horodatage) ;
- `docs/` : **aucun fichier touché** ;
- aucun `--amend`, aucun `push` (le `.git` n'était pas dans le zip ; le
  commit se fera chez toi, commande fournie).

---

## 4. RESTE À FAIRE

1. **Chez toi** : recopier les fichiers modifiés (liste fournie dans le
   tchat), puis `git add -A && git commit -m "B0-PAUSE: anti-verrou SQLITE_BUSY + interrupteur auth temporaire"`.
2. **Tour de contrôle** : lancer `npm run dev` — l'app doit démarrer
   directement au tableau de bord, sans écran de connexion ; ouvrir un 2e
   onglet → message humain (pas d'erreur technique sèche).
3. **Décision de gouvernance (toi)** : autoriser ou non l'ajout d'une ligne
   `PRAGMA busy_timeout` dans `sqlite.worker.ts` (zone gelée) pour couvrir
   100 % des cas de verrou — sinon la couverture actuelle est déjà très
   correcte en usage réel.
4. **Parqué (décision prise)** : la page d'accueil public et son formulaire
   décoratif (le bouton « Créer mon compte » renvoie vers /connexion sans
   enregistrer) — refonte complète prévue avec l'authentification Supabase.
5. **Chantiers suivants** : arbitrage G-02 à G-08 (avant toute étape
   « Frais »), puis B0-B/B0-C/B0-D, base distante Supabase,
   authentification + permissions, remise de l'interrupteur sur `false`.
