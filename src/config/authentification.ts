/**
 * INTERRUPTEUR TEMPORAIRE D'AUTHENTIFICATION.
 *
 * ⚠️ TEMPORAIRE : à repasser à `false` quand l'authentification Supabase
 * sera branchée (base distante + authentification + permissions).
 * NE PAS LIVRER L'ÉCOLE AVEC `true`.
 *
 * Quand cette constante vaut `true` :
 * - l'application démarre directement au tableau de bord, sans écran
 *   de connexion ni vérification de compte ;
 * - la garde de route laisse passer tout le monde ;
 * - le bouton « Se déconnecter » de la barre latérale est masqué.
 *
 * Le travail B0-A (service de comptes, migration 017, écrans onboarding)
 * reste en place et fonctionnel : il sera réarmé en remettant `false`.
 */
export const AUTH_DESACTIVEE_TEMPORAIREMENT = true;
