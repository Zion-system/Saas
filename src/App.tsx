import { useEffect, useState } from "react";
import { initialiserBaseLocale } from "./database/local/sqlite.client";
import AppRouter from "./app/router/AppRouter";
import { Button } from "./components/ui/Button";
import { Carte } from "./components/ui/Carte";
import { NOM_ECOLE } from "./config/ecole";
import { recupererSession } from "./services/compte/compte.service";
import { executerRequete, executerTransaction } from "./database/local/sqlite.client";
import { creerServiceEtablissements } from "./services/organisation-scolaire/etablissements.service";

type EtatInitialisation = "initialisation" | "prete" | "erreur";

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
  const [messageErreur, setMessageErreur] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let actif = true;

    initialiserBaseLocale()
      .then(async () => {
        if (!actif) return;

        // Logique de reprise après initialisation de la base
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

        setEtat("prete");
      })
      .catch((error: unknown) => {
        if (!actif) return;

        setMessageErreur(
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de l'initialisation.",
        );
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

  if (etat === "erreur") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-creme px-4">
        <Carte className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-stone-900">
            Initialisation impossible
          </h1>
          <p className="mt-3 text-sm text-stone-500" role="alert">
            {messageErreur}
          </p>
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
