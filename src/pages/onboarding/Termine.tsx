import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Carte } from "../../components/ui/Carte";

/**
 * Écran de fin du wizard de configuration initiale.
 * Redirige vers le tableau de bord.
 */
export function Termine() {
  const navigate = useNavigate();

  useEffect(() => {
    // Rediriger vers le tableau de bord après un court délai
    const timer = setTimeout(() => {
      navigate("/");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const etapes = [
    { nom: "École", coche: true, actif: false },
    { nom: "Classes", coche: true, actif: false },
    { nom: "Frais", coche: false, actif: false, verrouille: true },
    { nom: "Élèves", coche: false, actif: false, verrouille: true },
    { nom: "Équipe", coche: false, actif: false, verrouille: true },
    { nom: "Terminé", coche: true, actif: true },
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
              <span>100%</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div className="bg-vert-moyen h-2 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </aside>

        {/* Contenu principal */}
        <div className="flex-1 p-8">
          <Carte className="max-w-2xl mx-auto p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-vert-clair flex items-center justify-center">
              <svg className="w-10 h-10 text-vert-fonce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              Configuration terminée !
            </h1>
            <p className="text-stone-600 mb-6">
              Votre école est maintenant configurée. Vous allez être redirigé vers le tableau de bord.
            </p>
            <Button variant="vert" onClick={() => navigate("/")}>
              Aller au tableau de bord
            </Button>
          </Carte>
        </div>
      </div>
    </main>
  );
}
