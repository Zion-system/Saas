# 17 — Audit d’exhaustivité du Lot 5

**Projet :** ERP scolaire SaaS Offline-First  
**Version :** V1.0 — audit de complétude documentaire  
**Date :** 2026-11-04  
**Sources principales :** documents 04–14  
**Statut :** contrôle documentaire intégrant les validations utilisateur du 2026-11-04; le Lot 5 n’est pas déclaré gelé

## 1. Conclusion exécutive

Les trois livrables de consolidation décrivent les éléments retrouvés et les décisions utilisateur ajoutées, sans compléter les lacunes par hypothèse. Les six arbitrages ARB-01 à ARB-06 ont été validés le 2026-11-04. Les 35 invariants FIN-LOT5-001 à 035 ont désormais une définition et un statut individuel consignés dans 15–17. Le Lot 5 n’est pas déclaré gelé et les cardinalités ou mappings encore indéterminés ne sont pas inventés.

Les réserves documentaires restantes portent sur la portée historique et le niveau de détail du modèle :

1. Le document 14 et les sources locales antérieures sont datés d’avant les validations utilisateur d’ARB-01 à 06; ils restent conservés comme historique et leur ancien statut n’est pas le statut courant.
2. Les définitions FIN-LOT5-019 à 035 ont été validées dans les décisions utilisateur rappelées le 2026-11-04 et sont consignées dans les trois livrables.

Il subsiste une divergence de portée : plusieurs documents globaux déclarent les lots 1–5 validés et gelés, tandis que les documents 12–14, antérieurs, décrivent la conception détaillée du Lot 5 comme une proposition. Les validations utilisateur postérieures d’ARB-01 à 06 et des invariants concernés sont intégrées ici; elles ne tranchent pas à elles seules la portée du gel historique global et ne valent pas gel complet du Lot 5.

## 2. État de reprise observé

| Fichier attendu | Présence avant reprise | État constaté avant reprise | Traitement |
|---|---:|---|---|
| `15-consolidation-fonctionnelle-lot5-v0.3.md` | Absent | Aucun contenu partiel à préserver | Créé dans cette reprise, en reprenant les éléments déjà présents dans 12–14. |
| `16-matrice-tracabilite-lot5.md` | Absent | Aucun contenu partiel à préserver | Créé dans cette reprise; statuts et sources séparés explicitement. |
| `17-audit-exhaustivite-lot5.md` | Absent | Aucun contenu partiel à préserver | Créé dans cette reprise; recense les contrôles, lacunes et anomalies. |

Les sources existantes 00–14 ont été conservées sans modification. Le document 14 préexistait et décrit déjà les six arbitrages, les recommandations et les points qui empêchent le MCD. Le travail antérieur conforme n’a donc pas été refait dans ce document source; les trois livrables absents ont été créés par synthèse et traçabilité.

## 3. Vérification d’exhaustivité des éléments demandés

| Contrôle | Résultat | Évidence / réserve |
|---|---|---|
| Six sous-blocs fonctionnels | Conforme au périmètre documenté | Ouverture, opérations, clôture/comptage, journal, rapprochement, Offline-First figurent dans 12 et sont repris dans 15. |
| Six arbitrages ARB-01 à 06 | VALIDÉS le 2026-11-04 | ARB-01/02/03 validés par « valider », ARB-04 par « oui », ARB-05/06 par « oui » groupé. Le document 14 est antérieur. |
| 35 invariants FIN-LOT5-001 à 035 | Définitions et statuts recensés individuellement dans 15 §5, 16 §4 et 17 §4 | 019–025 validés avec ARB-04; 026–035 validés avec ARB-05/06; 001–018 réévalués un par un selon la couverture établie. |
| Statut des FIN-LOT5-001 à 018 | 12 définitions issues de 12 §11; évaluation détaillée dans 15–17 | Statuts individuels VALIDÉ, PARTIELLEMENT COUVERT ou À CONFIRMER. Les règles initialement proposées ne deviennent pas toutes automatiquement validées. |
| Neuf concepts Lot 5 | Inventaire complet selon la source 12 | Les neuf concepts apparaissent dans 12 §3; 13 §5 signale que l’inventaire reste provisoire et certaines entités conditionnelles. |
| Relations et cardinalités | Incomplet | 13 §6 et 14 §§1, 6 indiquent qu’elles ne sont pas établies; les sources 1–5 détaillées manquent selon 10 et la réserve VAL-016. |
| Règles métier | 35 invariants définis et tracés avec statuts; certains détails demeurent partiels | FIN-001–018 évalués individuellement; FIN-019–035 validés selon les décisions du 2026-11-04. |
| Lots 4 et 6 | Frontières et règle de remboursement tracées; intégration incomplète | Lot 4 possède les faits financiers; l’interface vers session reste ouverte. FIN-LOT6-015 est à préserver; lien caisse à documenter. Les mentions locales Lot 6 sont divergentes. |
| Offline-First | Arbitrages de concurrence et d’événements tardifs validés; précisions d’intégration restantes | VAL-014 est gelé; conflit, idempotence, identité et séparation de sync conservés. Les liaisons métier et cardinalités restent à documenter. |
| Cycles de vie | Partiels | Distinction activité/synchronisation présente dans 12; cycle de session, clôture incomplète, rapprochement et justifications sans transitions complètes (13 A-08/A-09/A-12). |
| Points ouverts | Repris sans rouvrir les décisions validées | Les questions de modélisation restantes sont recensées dans 15–16; les six ARB sont validés. |
| Contradictions / statuts | Signalisés, non « corrigés » hors périmètre | Tension statut global Lot 5 vs proposition détaillée; divergence documentaire locale Lot 6. Le statut historique de 14 et les décisions ultérieures sont datés séparément. |
| Règle inventée | Aucune ajoutée comme décision | Les définitions 019–035 sont attribuées aux décisions utilisateur du 2026-11-04; les statuts 001–018 sont limités à la couverture justifiée. |

## 4. Registre des invariants FIN-LOT5

Les définitions 001–018 proviennent de `12-conception-fonctionnelle-lot5-v0.1.md` §11; les statuts sont réévalués au regard des validations utilisateur ultérieures. Les définitions 019–035 et leur validation sont les décisions utilisateur communiquées le 2026-11-04. Les références 019–025 sont validées avec ARB-04; les références 026–035 avec ARB-05 et ARB-06. Pour 001–018, le statut ci-dessous tient compte seulement des arbitrages explicitement associés.

| Référence | Définition | Arbitrage validé couvrant | Statut |
|---|---|---|---|
| FIN-LOT5-001 | Continuité opérationnelle après clôture locale hors ligne | ARB-01 | PARTIELLEMENT COUVERT |
| FIN-LOT5-002 | Distinguer caissier, poste de caisse et appareil | ARB-03 | VALIDÉ |
| FIN-LOT5-003 | Session clôturée localement sans mouvements ordinaires ultérieurs | ARB-01/05; FIN-027 | VALIDÉ |
| FIN-LOT5-004 | Identité indépendante pour une nouvelle session | ARB-01 | PARTIELLEMENT COUVERT |
| FIN-LOT5-005 | Fonds initial correspondant au montant réellement confié | ARB-02 | VALIDÉ |
| FIN-LOT5-006 | Pas de reprise automatique du solde précédent comme fonds initial | ARB-02 | PARTIELLEMENT COUVERT |
| FIN-LOT5-007 | Origine et réception effective de la transmission conservées | ARB-02; FIN-023 | VALIDÉ |
| FIN-LOT5-008 | Solde théorique calculé depuis les opérations physiques valides | ARB-04; FIN-024 | VALIDÉ |
| FIN-LOT5-009 | Mobile Money exclu des entrées physiques d’espèces | ARB-04; FIN-020 | VALIDÉ |
| FIN-LOT5-010 | Crédit exclu des entrées de trésorerie physique | ARB-04; FIN-021 | VALIDÉ |
| FIN-LOT5-011 | Remboursement espèces selon le mécanisme exclusif du Lot 6 | ARB-04; FIN-022; FIN-LOT6-015 | VALIDÉ |
| FIN-LOT5-012 | Clôture et rapprochement distincts | ARB-05; FIN-030 | VALIDÉ |
| FIN-LOT5-013 | Détail de comptage égal au montant déclaré lorsqu’utilisé | ARB-05; FIN-028/029 | PARTIELLEMENT COUVERT |
| FIN-LOT5-014 | Écart conservé avec son signe réel | ARB-05 | PARTIELLEMENT COUVERT |
| FIN-LOT5-015 | Justification ne modifiant pas artificiellement le théorique | ARB-06; FIN-031 | VALIDÉ |
| FIN-LOT5-016 | Sessions concurrentes conservées et soumises à arbitrage | ARB-01 | VALIDÉ |
| FIN-LOT5-017 | Opération validée non supprimée silencieusement | ARB-05/06; FIN-035 | VALIDÉ |
| FIN-LOT5-018 | Synchronisation ne rouvrant pas automatiquement une session clôturée | ARB-01/05; VAL-014 | PARTIELLEMENT COUVERT |
| FIN-LOT5-019 | Absence de double comptabilisation d’un encaissement | ARB-04; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-020 | Mobile Money exclu du solde physique | ARB-04; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-021 | Crédits exclus du solde physique | ARB-04; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-022 | Remboursement physique selon le mécanisme exclusif du Lot 6 | ARB-04; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-023 | Une seule transmission avec incidences distinctes | ARB-04; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-024 | Solde calculé depuis les événements physiques valides | ARB-04; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-025 | Annulations et contrepassations conservées sans double compte | ARB-04; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-026 | Clôture conservée comme instantané historique | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-027 | Aucune opération ordinaire après clôture locale | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-028 | Détail et résultat des comptages conservés | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-029 | Recomptages conservés sans remplacement silencieux | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-030 | Rapprochement indépendant de la clôture | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-031 | Justification sans modification du solde théorique | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-032 | Opérations tardives incompatibles soumises à arbitrage | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-033 | Permissions différenciées | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-034 | Toute correction référence l’opération d’origine | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |
| FIN-LOT5-035 | Historique conservé sans suppression ni réécriture silencieuse | ARB-05/06; décision utilisateur 2026-11-04 | VALIDÉ |

## 5. Contrôle des six arbitrages

Le document 14 présente explicitement les sujets et questions alors ouverts. Après ce document, l’utilisateur a validé les arbitrages comme suit :

- ARB-01 — VALIDÉ (« valider »), exclusivité/concurrence Offline-First;
- ARB-02 — VALIDÉ (« valider »), fonds initiaux, garde et transmission;
- ARB-03 — VALIDÉ (« valider »), identité des acteurs, poste et appareil;
- ARB-04 — VALIDÉ (« oui »), encaissements, mouvements physiques et solde théorique;
- ARB-05 — VALIDÉ (« oui » groupé), clôture, comptage, rapprochement et opérations tardives;
- ARB-06 — VALIDÉ (« oui » groupé), autorisations, écarts et corrections.

Le document 14 reste une photographie antérieure : son statut ouvert ne s’applique plus aux six arbitrages. Les recommandations architecturales de son §5 demeurent non validées en elles-mêmes; seules les décisions utilisateur indiquées ci-dessus sont validées. L’approbation des arbitrages ne fixe pas automatiquement chaque cardinalité ou détail d’intégration.

## 6. Anomalies et contradictions constatées

| ID | Constat | Source / portée | Traitement dans les livrables |
|---|---|---|---|
| AUD-01 | Divergence de portée : statut historique global de gel des lots 1–5 et statut de proposition décrit dans les documents Lot 5 antérieurs aux validations utilisateur. | 04 §1; 06 tableau/§3; 07 §§1–2; 10 §2 versus 12 §§1, 11, 16; 13 §1/A-01; 14 §1; validations ultérieures. | Les validations ARB et invariants explicites sont intégrées. Il reste à clarifier la portée du gel global par rapport à la conception détaillée actuelle; cela ne rouvre pas les six arbitrages. Aucun gel du Lot 5 n’est déclaré. |
| AUD-02 | Le document 14 porte un statut historique antérieur aux validations utilisateur ultérieures. | 14 §4 et décisions utilisateur du 2026-11-04 | 14 conservé tel quel; les six arbitrages sont VALIDÉS dans 15–17. |
| AUD-03 | FIN-LOT5-019..035 ne figurent pas dans les sources historiques locales, mais leurs définitions et validations ont été communiquées ensuite par l’utilisateur. | Décisions utilisateur du 2026-11-04 | Définitions intégrées; 019–025 VALIDÉS avec ARB-04; 026–035 VALIDÉS avec ARB-05/06. |
| AUD-04 | Statut Lot 6 divergent dans les fichiers locaux malgré la référence de gel communiquée. | 04, 05, 06, 07, 11 vs 13 A-02, 14 §§2–3. | Règle FIN-LOT6-015 et le gel rapporté préservés; harmonisation documentaire laissée à son processus séparé. |
| AUD-05 | Les documents 11 et 10 expriment des intégrations ou statuts de lots qui ne remplacent pas les sources propriétaires détaillées manquantes. | 10 §§2–4; 11 §§4.5–4.6, 9–11; VAL-016. | Aucune relation ou cardinalité propriétaire extrapolée. |

## 7. Protection du périmètre

Cette reprise n’a pas modifié les sources 00–14, le MCD global VAL-016, le MLD global, les lots gelés, les décisions des Lots 4 et 6, ni l’historique des validations. Elle n’a ajouté ni MCD du Lot 5, ni schéma SQL, migration ou code. Les décisions VAL-013, VAL-014, VAL-015, VAL-016, FIN-LOT6-015 selon la portée communiquée, et les invariants gelés des Lots 7–8 sont préservés.

## 8. Conditions de clôture documentaire et limites restantes

Les livrables 15–17 intègrent les six arbitrages validés et les 35 définitions/statuts. Les réserves suivantes sont des précisions de modèle qui ne sont pas résolues par ces arbitrages :

1. préciser la portée du statut historique de gel du Lot 5 par rapport à cette consolidation détaillée, sans déclarer le Lot 5 gelé;
2. préciser les détails de FIN-LOT5-001 encore partiellement couverts, notamment la continuité/réouverture distincte de l’interdiction d’opérations ordinaires après clôture;
3. retrouver les modèles sources Lots 4–5 et documenter les interfaces, relations et cardinalités manquantes;
4. établir les cycles détaillés et mappings techniques des concepts de session, transmission, comptage et rapprochement, dans le respect des lots propriétaires;
5. harmoniser les mentions locales divergentes sur le Lot 6 via son processus documentaire propre, sans modifier son gel ni FIN-LOT6-015.

Conformément à la portée de la reprise, aucun MCD n’est commencé dans ce lot de livrables.
