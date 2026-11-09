import { Route, Routes } from "react-router-dom";
import { LayoutPrincipal } from "../../components/layout/LayoutPrincipal";
import { Accueil } from "../../pages/accueil/Accueil";
import { Diagnostic } from "../../pages/diagnostic/Diagnostic";
import { PageIntrouvable } from "../../pages/erreurs/PageIntrouvable";
import { ModuleAVenir } from "../../pages/module-a-venir/ModuleAVenir";
import { Organisation } from "../../pages/organisation/Organisation";
import { Bienvenue } from "../../pages/onboarding/Bienvenue";
import { Inscription } from "../../pages/onboarding/Inscription";
import { Connexion } from "../../pages/onboarding/Connexion";
import { Ecole } from "../../pages/onboarding/Ecole";
import { Classes } from "../../pages/onboarding/Classes";
import { Termine } from "../../pages/onboarding/Termine";
import { recupererSession } from "../../services/compte/compte.service";

const CHEMINS_MODULES = [
  "/eleves",
  "/candidatures",
  "/inscriptions",
  "/facturation",
  "/encaissements",
  "/caisse",
  "/relances",
  "/rapports",
  "/bulletins",
  "/absences",
  "/parametres",
];

/**
 * Composant de garde de session.
 * Redirige vers l'écran de connexion si aucune session active.
 */
function GardeSession({ children }: { children: React.ReactNode }) {
  const session = recupererSession();
  if (!session) {
    window.location.replace("/onboarding/connexion");
    return null;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques (onboarding) */}
      <Route path="/onboarding" element={<Bienvenue />} />
      <Route path="/onboarding/inscription" element={<Inscription />} />
      <Route path="/onboarding/connexion" element={<Connexion />} />
      <Route path="/onboarding/ecole" element={<GardeSession><Ecole /></GardeSession>} />
      <Route path="/onboarding/classes" element={<GardeSession><Classes /></GardeSession>} />
      <Route path="/onboarding/termine" element={<GardeSession><Termine /></GardeSession>} />

      {/* Routes protégées (nécessitent une session) */}
      <Route element={<GardeSession><LayoutPrincipal /></GardeSession>}>
        <Route path="/" element={<Accueil />} />
        <Route path="/organisation" element={<Organisation />} />
        <Route path="/diagnostic" element={<Diagnostic />} />
        {CHEMINS_MODULES.map((chemin) => (
          <Route key={chemin} path={chemin} element={<ModuleAVenir />} />
        ))}
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  );
}
