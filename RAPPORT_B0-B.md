# RAPPORT MISSION B0-B — CRÉATION D'ÉCOLE AU FIL DES MAQUETTES

Exécutée par Z.ai, le 10/11/2026, dans une copie du projet.

---

## 1. CE QUE TU M'AS DIT

« La création d'école n'est pas comme je le voulais. » En pratique, trois
problèmes se recoupaient :

1. En mode sans connexion (interrupteur armé), l'application démarrait au
   tableau de bord **sans jamais proposer de créer l'école** : le parcours
   de configuration existant (`/onboarding/ecole`) était inaccessible.
2. La page `/organisation` affichait alors une carte technique (« Établissement
   requis ») qui demandait de taper un identifiant « etablissement-principal »
   à la main — rien à voir avec les maquettes.
3. La base de données **ne pouvait pas conserver** ce que les maquettes font
   saisir : `etablissement` n'avait pas de nom, `annee_scolaire` ni libellé
   ni dates, `periode_pedagogique` ni libellé ni ordre. Le formulaire de
   l'ancien écran collectait ces informations… et les jetait.

## 2. CE QUI A ÉTÉ FAIT

### 2.1 Migration 018 — `infos_ecole_annee` [CRÉÉE]

- `src/database/migrations/018-infos-ecole-annee.ts` [CRÉÉ]
- `src/database/migrations/index.ts` [MODIFIÉ] (enregistrement)
- Colonnes ajoutées (aucune table créée/supprimée, rien d'effacé) :
  - `etablissement.nom` (texte, défaut vide) ;
  - `annee_scolaire.libelle`, `.date_debut`, `.date_fin` (ISO AAAA-MM-JJ) ;
  - `periode_pedagogique.libelle`, `.ordre`.

### 2.2 Services étendus (rétrocompatibles)

- `types.ts`, `etablissements.service.ts` (+ `definirNom`),
  `annees-scolaires.service.ts`, `periodes-pedagogiques.service.ts`.
- Les champs lisibles sont enregistrés quand on les fournit, **ignorés sans
  être écrasés** sinon (`COALESCE` côté SQL) : les anciens appels continuent
  de fonctionner à l'identique.

### 2.3 Le parcours « Configuration initiale » [CRÉÉ]

- `src/pages/configuration/ConfigurationInitiale.tsx` : reproduit la maquette
  vidéo — barre latérale (6 étapes, coche verte, cadenas, progression %),
  **Étape 1 École** (nom, langue, année scolaire avec dates, découpage),
  **Étape 2 Classes** (12 niveaux en puces + « Ajouter une autre classe »),
  **Étapes 3-5 Frais / Élèves / Équipe** affichées mais verrouillées
  (arbitrage déjà pris : l'argent est bloqué par le carnet G-02 à G-08),
  **Étape 6 Terminé** (récapitulatif + retour tableau de bord).
- Ce qui est saisi est **réellement enregistré** : école (avec son nom),
  année scolaire « 2026-2027 » (libellé + dates), périodes T1/T2/T3 ou
  S1/S2, et les classes choisies (niveau + modèle + classe annuelle).
- Reprise possible : rouvrir `/configuration` recharge l'existant (nom,
  année, dates, périodes, classes) et permet de corriger.
- Route `/configuration` ajoutée (`src/app/router/routes.tsx`).

### 2.4 Démarrage comme dans la maquette

- `src/App.tsx` : en mode sans connexion, tant qu'aucune école (ou aucune
  année scolaire) n'existe, l'application **redirige automatiquement vers
  `/configuration`** — sauf si on est déjà dessus, sur `/onboarding` ou sur
  `/diagnostic`. Une fois l'école créée : plus aucune redirection, le
  tableau de bord s'ouvre normalement.
- La logique B0-A (avec session) est conservée inchangée.

### 2.5 Page Organisation assainie

- La carte technique « Établissement requis » (champ « etablissement-principal »
  + bouton Créer) est remplacée par un état vide clair avec un bouton
  **« Configurer mon école »** qui ouvre le parcours.
- La liste des années affiche désormais le **nom de l'école** au lieu de
  l'identifiant technique.

## 3. TESTS & VÉRIFICATIONS

| Contrôle | Résultat |
| --- | --- |
| `vitest` | **138 / 138 passés** (18 fichiers) — dont 1 nouveau cas « migration 018 » (nom école, libellé/dates année, périodes ordonnées, non-écrasement par les anciens appels) |
| `oxlint` | **0 erreur, 0 warning** (99 fichiers) |
| `tsc -b` + `vite build` | **compilation réussie** |

Adaptations mécaniques des tests : tableaux de versions `[1..17]` → `[1..18]`
(12 fichiers) + liste `{version, name}` du test 012 + INSERT positionnels
rendus explicites (`INSERT INTO etablissement (id_etablissement) …`) dans
10 fichiers, car une colonne supplémentaire casse les INSERT sans colonnes.

Vérification en navigateur réel (Chromium headless, parcours complet) :
redirection `/` → `/configuration` ✓, création « École Démo Brazzaville » ✓,
choix de 4 classes + classe libre « 5e année B » ✓, étapes verrouillées
passées ✓, récapitulatif Terminé ✓, retour tableau de bord ✓, page
`/organisation` avec le nom de l'école et l'année ✓, rechargement de `/`
sans nouvelle redirection ✓. Captures incluses dans le paquet livré.

## 4. ZONE GELÉE, DOCUMENTS, GIT

- `src/database/local/` : **aucun fichier touché** ;
- `docs/` : **aucun fichier touché** ;
- aucun `--amend`, aucun `push`.

## 5. FICHIERS À RECOPIER CHEZ TOI (24)

**Nouveaux (2)**
1. `src/database/migrations/018-infos-ecole-annee.ts`
2. `src/pages/configuration/ConfigurationInitiale.tsx`

**Modifiés (22)**
3. `src/App.tsx`
4. `src/app/router/routes.tsx`
5. `src/database/migrations/index.ts`
6. `src/pages/organisation/Organisation.tsx`
7. `src/services/organisation-scolaire/types.ts`
8. `src/services/organisation-scolaire/etablissements.service.ts`
9. `src/services/organisation-scolaire/annees-scolaires.service.ts`
10. `src/services/organisation-scolaire/periodes-pedagogiques.service.ts`
11. `src/services/organisation-scolaire/organisation-scolaire.test.ts`
12. `src/services/stats/stats.service.test.ts`
13. `src/database/migrations/003-catalogue-frais-tarification.test.ts`
14. `src/database/migrations/004-facturation-creances.test.ts`
15. `src/database/migrations/005-echeanciers-reglements.test.ts`
16. `src/database/migrations/006-encaissements-credits-mobile-money.test.ts`
17. `src/database/migrations/007-gestion-caisse.test.ts`
18. `src/database/migrations/008-credits-reservations-remboursements.test.ts`
19. `src/database/migrations/009-relances-balance-agee.test.ts`
20. `src/database/migrations/010-synchronisation-offline-first.test.ts`
21. `src/database/migrations/011-eleves-responsables.test.ts`
22. `src/database/migrations/012-candidatures-preinscriptions.test.ts`
23. `src/database/migrations/013-inscriptions-affectations.test.ts`
24. `src/database/migrations/schema-integration.test.ts`

## 6. RESTE À FAIRE / POINTS D'ATTENTION

1. **Chez toi** : recopier les 24 fichiers, puis
   `git add -A && git commit -m "B0-B: parcours Configuration initiale (maquette) + migration 018 infos école/année"`.
2. **Test** : `npm run dev` → l'app doit t'emmener directement sur
   « CONFIGURATION INITIALE ». Crée ton école ; au prochain lancement tu
   iras directement au tableau de bord.
3. Les étapes **Frais / Élèves / Équipe** restent volontairement verrouillées
   (G-02 à G-08 pour l'argent ; modules à construire) — c'est l'arbitrage
   déjà pris ensemble, il est affiché honnêtement dans le parcours.
4. L'écran onboarding B0-A (`/onboarding/ecole`) n'a pas été touché : il ne
   persiste pas encore le libellé/dates de l'année (limitation connue). Les
   deux parcours seront fusionnés au moment de Supabase (remise de
   l'interrupteur sur `false`).
5. À noter : l'ancienne base de ton navigateur contient peut-être un
   établissement créé via l'ancienne carte technique (sans nom). Dans ce cas
   le parcours te proposera de compléter le nom à l'étape 1 — rien à
   réinstaller.
