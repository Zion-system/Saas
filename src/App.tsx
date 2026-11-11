import { useEffect, useState } from "react";
import {
  initialiserBaseLocale,
  executerRequete,
  executerTransaction,
} from "./database/local/sqlite.client";
import AppRouter from "./app/router/AppRouter";
import { Button } from "./components/ui/Button";
import { Carte } from "./components/ui/Carte";
import { NOM_ECOLE } from "./config/ecole";
import { AUTH_DESACTIVEE_TEMPORAIREMENT } from "./config/authentification";
import { recupererSession } from "./services/compte/compte.service";
import { creerServiceEtablissements } from "./services/organisation-scolaire/etablissements.service";
import { creerServiceAnneesScolaires } from "./services/organisation-scolaire/annees-scolaires.service";

type EtatInitialisation = "initialisation" | "prete" | "erreur";

// NB : le rechargement à chaud des modules de base de données est bloqué
// côté serveur Vite (plugin « pleinRechargementZoneBase » dans
// vite.config.ts) : toute modification force un rechargement complet de
// la page, ce qui évite deux connexions SQLite simultanées (SQLITE_BUSY).

interface ErreurInitialisation {
  humain: string;
  technique: string;
}

/**
 * Traduit une erreur d'initialisation en message humain.
 *
 * SQLITE_BUSY (code 5) : la base est tenue par quelqu'un d'autre — en
 * pratique un autre onglet ou une autre fenêtre de l'application.
 */
function traduireErreur(error: unknown): ErreurInitialisation {
  const technique =
    error instanceof Error
      ? error.message
      : "Erreur inconnue lors de l'initialisation.";

  if (/SQLITE_BUSY|database is locked/i.test(technique)) {
    return {
      humain:
        "L'application semble déjà ouverte ailleurs. Fermez les autres onglets ou fenêtres, puis appuyez sur Réessayer.",
      technique,
    };
  }

  return { humain: technique, technique };
}

/**
 * Point d'entrée de l'application.
 *
 * Trois états :
 * - initialisation : écran d'attente sobre pendant le démarrage SQLite ;
 * - prete : montage du routeur applicatif ;
 * - erreur : écran d'erreur lisible avec bouton « Réessayer ».
 */
function App() {
  const [etat, setEtat] = useState<EtatInitialisation>("initialisation");
  const [erreur, setErreur] = useState<ErreurInitialisation | null>(null);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let actif = true;

    initialiserBaseLocale()
      .then(async () => {
        if (!actif) return;

        // Tolérance de verrou : si la base est brièvement occupée (autre
        // onglet en pleine écriture), SQLite attend au lieu d'échouer.
        try {
          await executerRequete("PRAGMA busy_timeout = 5000;");
        } catch (err) {
          console.warn("PRAGMA busy_timeout non appliquée :", err);
        }

        if (AUTH_DESACTIVEE_TEMPORAIREMENT) {
          // Mode sans connexion : tant qu'aucune école (ou aucune année
          // scolaire) n'existe, l'application redirige vers le parcours
          // « Configuration initiale » — comme dans la maquette, où l'école
          // est toujours créée en premier.
          try {
            const database = {
              query: executerRequete,
              transaction: executerTransaction,
            };
            const serviceEtablissements = creerServiceEtablissements(database);
            const etablissements = await serviceEtablissements.lister();
            const premier = etablissements[0];

            let anneeManquante = true;
            if (premier) {
              const serviceAnnees = creerServiceAnneesScolaires(database);
              const annees =
                await serviceAnnees.listerParEtablissement(
                  premier.id_etablissement,
                );
              anneeManquante = annees.length === 0;
            }

            const chemin = window.location.pathname;
            const dejaSurLeParcours =
              chemin.startsWith("/configuration") ||
              chemin.startsWith("/onboarding") ||
              chemin.startsWith("/diagnostic");

            if ((!premier || anneeManquante) && !dejaSurLeParcours) {
              window.location.replace("/configuration");
              return;
            }
          } catch (err) {
            console.warn("Vérification de l'école impossible :", err);
          }
        } else {
          // Logique de reprise après initialisation de la base
          // (uniquement quand le verrou d'authentification est armé).
          const session = recupererSession();

          if (session) {
            // Session active : vérifier si une école existe
            try {
              const database = {
                query: executerRequete,
                transaction: executerTransaction,
              };
              const serviceEtablissements = creerServiceEtablissements(database);
              const etablissements = await serviceEtablissements.lister();

              if (etablissements.length === 0) {
                // École non configurée : rediriger vers l'étape École
                window.location.href = "/onboarding/ecole";
              }
              // Sinon : aller au tableau de bord (route par défaut)
            } catch (err) {
              console.warn("Erreur lors de la vérification de l'école:", err);
            }
          }
          // Sinon : pas de session, rester sur la page par défaut (Bienvenue)
        }

        setEtat("prete");
      })
      .catch((error: unknown) => {
        if (!actif) return;

        setErreur(traduireErreur(error));
        setEtat("erreur");
      });

    return () => {
      actif = false;
    };
  }, [tentative]);

  if (etat === "initialisation") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-creme px-4">
        <div className="text-center">
          <p className="text-xl font-bold text-vert-fonce">{NOM_ECOLE}</p>
          <p className="mt-3 text-sm text-stone-500">
            Initialisation de la base de données locale…
          </p>
        </div>
      </main>
    );
  }

  if (etat === "erreur" && erreur) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-creme px-4">
        <Carte className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-stone-900">
            Initialisation impossible
          </h1>
          <p className="mt-3 text-sm text-stone-700" role="alert">
            {erreur.humain}
          </p>
          <p className="mt-2 text-xs text-stone-400">{erreur.technique}</p>
          <Button
            className="mt-6"
            variant="vert"
            onClick={() => {
              setEtat("initialisation");
              setTentative((t) => t + 1);
            }}
          >
            Réessayer
          </Button>
        </Carte>
      </main>
    );
  }

  return <AppRouter />;
}

export default App;
