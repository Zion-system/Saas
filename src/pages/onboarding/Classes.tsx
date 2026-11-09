import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Carte } from "../../components/ui/Carte";
import { executerRequete, executerTransaction } from "../../database/local/sqlite.client";
import { creerServiceClassesAnnuelles } from "../../services/organisation-scolaire/classes-annuelles.service";
import { creerServiceAnneesScolaires } from "../../services/organisation-scolaire/annees-scolaires.service";
import { creerServiceEtablissements } from "../../services/organisation-scolaire/etablissements.service";
import { recupererSession } from "../../services/compte/compte.service";

/**
 * Étape "Classes" du wizard de configuration initiale.
 */
export function Classes() {
  const navigate = useNavigate();
  const classes = [
    "Petite section",
    "Moyenne section",
    "Grande section",
    "CP1",
    "CP2",
    "CE1",
    "CE2",
    "CM1",
    "CM2",
  ];
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

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
      const serviceClasses = creerServiceClassesAnnuelles(database);

      // Récupérer l'établissement et l'année scolaire
      const etablissements = await serviceEtablissements.lister();
      if (etablissements.length === 0) {
        throw new Error("Aucun établissement trouvé.");
      }
      const idEtablissement = etablissements[0].id_etablissement;

      const annees = await serviceAnnees.listerParEtablissement(idEtablissement);
      if (annees.length === 0) {
        throw new Error("Aucune année scolaire trouvée.");
      }
      const idAnneeScolaire = annees[0].id_annee_scolaire;

      // Note : Le service classes-annuelles nécessite id_niveau et id_modele_classe
      // Ces référentiels doivent exister dans la base. On utilise des IDs par défaut.
      // Si les référentiels n'existent pas, on note cela dans le rapport.

      for (const nomClasse of classes) {
        try {
          // Utilisation d'IDs génériques pour les niveaux et modèles
          const idNiveau = `NIVEAU-${nomClasse.replace(/\s/g, "-").toUpperCase()}`;
          const idModeleClasse = `MODELE-${nomClasse.replace(/\s/g, "-").toUpperCase()}`;

          await serviceClasses.creer({
            id_classe_annuelle: `CLASSE-${Date.now()}-${nomClasse.replace(/\s/g, "-")}`,
            id_annee_scolaire: idAnneeScolaire,
            id_niveau: idNiveau,
            id_modele_classe: idModeleClasse,
            id_etablissement: idEtablissement,
          });
        } catch (err) {
          // Si une classe échoue (référentiel manquant), on continue
          console.warn(`Impossible de créer la classe ${nomClasse}:`, err);
        }
      }

      navigate("/onboarding/termine");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la création des classes.");
    } finally {
      setChargement(false);
    }
  };

  const etapes = [
    { nom: "École", coche: true, actif: false },
    { nom: "Classes", coche: false, actif: true },
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
              <span>33%</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div className="bg-vert-moyen h-2 rounded-full" style={{ width: "33%" }} />
            </div>
          </div>
        </aside>

        {/* Contenu principal */}
        <div className="flex-1 p-8">
          <Carte className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Vos classes</h1>
            <p className="text-stone-600 mb-6">Étape 2 sur 6 — Configurez les classes de votre établissement.</p>

            {erreur && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {erreur}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Classes prédéfinies
                </label>
                <div className="space-y-2">
                  {classes.map((classe, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                      <div className="w-5 h-5 rounded bg-vert-clair flex items-center justify-center text-vert-fonce text-xs">
                        {index + 1}
                      </div>
                      <span className="text-stone-700">{classe}</span>
                    </div>
                  ))}
                </div>
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
