import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Carte } from "../../components/ui/Carte";
import { creerServiceCompte } from "../../services/compte/compte.service";
import { executerRequete, executerTransaction } from "../../database/local/sqlite.client";
import type { DonneesConnexion } from "../../services/compte/compte.service";

/**
 * Écran de connexion.
 */
export function Connexion() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DonneesConnexion>({
    email: "",
    mot_de_passe: "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErreur(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    try {
      const database = {
        query: executerRequete,
        transaction: executerTransaction,
      };
      const serviceCompte = creerServiceCompte(database);

      await serviceCompte.connecter(formData);
      navigate("/onboarding/ecole");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Identifiants invalides.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-creme">
      {/* En-tête avec boutons Inscription/Connexion */}
      <header className="absolute top-0 right-0 p-6">
        <div className="flex gap-3">
          <Link to="/onboarding/inscription">
            <Button variant="outline">Inscription</Button>
          </Link>
          <Link to="/onboarding/connexion">
            <Button variant="vert">Connexion</Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex flex-1 items-center justify-center px-4">
        <Carte className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-6 text-center">
            Se connecter
          </h1>

          {erreur && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                Adresse email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label htmlFor="mot_de_passe" className="block text-sm font-medium text-stone-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                id="mot_de_passe"
                name="mot_de_passe"
                value={formData.mot_de_passe}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                placeholder="••••••••••"
              />
            </div>
            <Button variant="vert" className="w-full" isLoading={chargement} type="submit">
              Se connecter
            </Button>
            <div className="text-center">
              <Link to="/onboarding/inscription" className="text-sm text-vert-moyen hover:underline">
                Vous n'avez pas de compte ? Créer un compte
              </Link>
            </div>
          </form>
        </Carte>
      </div>
    </main>
  );
}
