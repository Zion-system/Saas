import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Carte } from "../../components/ui/Carte";
import { creerServiceCompte } from "../../services/compte/compte.service";
import { executerRequete, executerTransaction } from "../../database/local/sqlite.client";
import type { DonneesCreationCompte } from "../../services/compte/compte.service";

/**
 * Écran d'inscription (création de compte).
 */
export function Inscription() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DonneesCreationCompte>({
    prenom: "",
    nom: "",
    telephone: "",
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

      // Vérifier si le compte existe déjà
      const existe = await serviceCompte.existe(formData.email);
      if (existe) {
        setErreur("Un compte avec cet email existe déjà.");
        setChargement(false);
        return;
      }

      // Créer le compte
      await serviceCompte.creer(formData);
      navigate("/onboarding/connexion");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la création du compte.");
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
            <Button variant="vert">Inscription</Button>
          </Link>
          <Link to="/onboarding/connexion">
            <Button variant="outline">Connexion</Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex flex-1 items-center justify-center px-4">
        <Carte className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-6 text-center">
            Créer un compte
          </h1>

          {erreur && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-stone-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                placeholder="Votre prénom"
              />
            </div>
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-stone-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                placeholder="Votre nom"
              />
            </div>
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-stone-700 mb-1">
                Téléphone
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-stone-100 border border-r-0 border-stone-300 rounded-l-lg text-stone-600">
                  +242
                </span>
                <input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  required
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                  placeholder="06 00 00 00 00"
                />
              </div>
            </div>
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
                minLength={10}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                placeholder="••••••••••"
              />
              <p className="mt-1 text-xs text-stone-500">Au moins 10 caractères</p>
            </div>
            <Button variant="vert" className="w-full" isLoading={chargement} type="submit">
              Créer mon compte
            </Button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              onClick={() => alert("Connexion Google indisponible en mode hors ligne.")}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              S'inscrire avec Google
            </button>
            <div className="text-center">
              <Link to="/onboarding/connexion" className="text-sm text-vert-moyen hover:underline">
                Vous avez déjà un compte ? Se connecter
              </Link>
            </div>
          </form>
        </Carte>
      </div>
    </main>
  );
}
