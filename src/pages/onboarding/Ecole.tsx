import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Carte } from "../../components/ui/Carte";
import { executerRequete, executerTransaction } from "../../database/local/sqlite.client";
import { creerServiceEtablissements } from "../../services/organisation-scolaire/etablissements.service";
import { creerServiceAnneesScolaires } from "../../services/organisation-scolaire/annees-scolaires.service";
import { recupererSession } from "../../services/compte/compte.service";

/**
 * Étape "École" du wizard de configuration initiale.
 */
export function Ecole() {
  const navigate = useNavigate();

  // Calculer l'année scolaire par défaut (dynamique, fuseau Africa/Brazzaville)
  const valeursParDefaut = useMemo(() => {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = maintenant.getMonth();
    
    // Si on est après septembre, l'année scolaire commence cette année
    // Sinon, elle a commencé l'année précédente
    const anneeDebut = mois >= 8 ? annee : annee - 1;
    const anneeFin = anneeDebut + 1;

    return {
      libelle_annee: `${anneeDebut}-${anneeFin}`,
      debut_annee: `01/10/${anneeDebut}`,
      fin_annee: `30/06/${anneeFin}`,
    };
  }, []);

  const [formData, setFormData] = useState({
    langue: "Français seulement",
    ...valeursParDefaut,
    decoupage: "3 trimestres",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErreur(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    try {
      const session = recupererSession();
      if (!session) {
        navigate("/onboarding/connexion");
        return;
      }

      const database = {
        query: executerRequete,
        transaction: executerTransaction,
      };

      const serviceEtablissements = creerServiceEtablissements(database);
      const serviceAnnees = creerServiceAnneesScolaires(database);

      // Vérifier si un établissement existe déjà
      const etablissements = await serviceEtablissements.lister();
      let idEtablissement: string;

      if (etablissements.length === 0) {
        // Créer l'établissement
        const etab = await serviceEtablissements.creer({
          id_etablissement: `ETAB-${Date.now()}`,
        });
        idEtablissement = etab.id_etablissement;
      } else {
        idEtablissement = etablissements[0].id_etablissement;
      }

      // Créer l'année scolaire (champs disponibles : id_annee_scolaire, id_etablissement)
      await serviceAnnees.creer({
        id_annee_scolaire: `ANNEE-${Date.now()}`,
        id_etablissement: idEtablissement,
      });

      // Note : Les champs libelle, date_debut, date_fin ne sont pas disponibles dans le type AnneeScolaire actuel
      // Le statut est géré par défaut par la base de données (PREPAREE par défaut)
      // Les périodes pédagogiques ne sont pas créées car le type PeriodePedagogique n'a que id_periode et id_annee_scolaire

      navigate("/onboarding/classes");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la création de l'école.");
    } finally {
      setChargement(false);
    }
  };

  const etapes = [
    { nom: "École", coche: false, actif: true },
    { nom: "Classes", coche: false, actif: false },
    { nom: "Frais", coche: false, actif: false, verrouille: true },
    { nom: "Élèves", coche: false, actif: false, verrouille: true },
    { nom: "Équipe", coche: false, actif: false, verrouille: true },
    { nom: "Terminé", coche: false, actif: false },
  ];

  return (
    <main className="flex min-h-screen bg-creme">
      <div className="flex flex-1">
        {/* Barre latérale de progression */}
        <aside className="w-72 bg-white border-r border-stone-200 p-6">
          <h2 className="text-lg font-bold text-vert-fonce mb-2">CONFIGURATION INITIALE</h2>
          <p className="text-sm text-stone-600 mb-6">Bienvenue ! Configurons votre école en quelques minutes.</p>
          
          <ul className="space-y-3">
            {etapes.map((etape, index) => (
              <li
                key={index}
                className={`flex items-center gap-3 text-sm ${
                  etape.actif ? "text-vert-fonce font-medium" : "text-stone-500"
                } ${etape.verrouille ? "opacity-50" : ""}`}
              >
                {etape.coche ? (
                  <div className="w-6 h-6 rounded-full bg-vert-moyen flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded-full border-2 ${
                    etape.actif ? "border-vert-moyen" : "border-stone-300"
                  }`} />
                )}
                {etape.nom}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <div className="flex justify-between text-xs text-stone-600 mb-1">
              <span>Progression</span>
              <span>17%</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div className="bg-vert-moyen h-2 rounded-full" style={{ width: "17%" }} />
            </div>
          </div>
        </aside>

        {/* Contenu principal */}
        <div className="flex-1 p-8">
          <Carte className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Votre école</h1>
            <p className="text-stone-600 mb-6">Étape 1 sur 6 — Configurons les informations de base de votre établissement.</p>

            {erreur && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {erreur}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="langue" className="block text-sm font-medium text-stone-700 mb-1">
                  Langue de l'application
                </label>
                <select
                  id="langue"
                  name="langue"
                  value={formData.langue}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                >
                  <option value="Français seulement">Français seulement</option>
                </select>
              </div>

              <div>
                <label htmlFor="libelle_annee" className="block text-sm font-medium text-stone-700 mb-1">
                  Année scolaire en cours
                </label>
                <input
                  type="text"
                  id="libelle_annee"
                  name="libelle_annee"
                  value={formData.libelle_annee}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="debut_annee" className="block text-sm font-medium text-stone-700 mb-1">
                    Début
                  </label>
                  <input
                    type="text"
                    id="debut_annee"
                    name="debut_annee"
                    value={formData.debut_annee}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                    placeholder="JJ/MM/AAAA"
                  />
                </div>
                <div>
                  <label htmlFor="fin_annee" className="block text-sm font-medium text-stone-700 mb-1">
                    Fin
                  </label>
                  <input
                    type="text"
                    id="fin_annee"
                    name="fin_annee"
                    value={formData.fin_annee}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                    placeholder="JJ/MM/AAAA"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="decoupage" className="block text-sm font-medium text-stone-700 mb-1">
                  Découpage
                </label>
                <select
                  id="decoupage"
                  name="decoupage"
                  value={formData.decoupage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-moyen"
                >
                  <option value="3 trimestres">3 trimestres</option>
                  <option value="2 semestres">2 semestres</option>
                </select>
              </div>

              <Button variant="vert" className="w-full" isLoading={chargement} type="submit">
                Continuer
              </Button>
            </form>
          </Carte>
        </div>
      </div>
    </main>
  );
}
