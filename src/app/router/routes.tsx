import { Route, Routes } from "react-router-dom";
import { LayoutPrincipal } from "../../components/layout/LayoutPrincipal";
import { Accueil } from "../../pages/accueil/Accueil";
import { Diagnostic } from "../../pages/diagnostic/Diagnostic";
import { PageIntrouvable } from "../../pages/erreurs/PageIntrouvable";
import { ModuleAVenir } from "../../pages/module-a-venir/ModuleAVenir";

const CHEMINS_MODULES = [
  "/organisation",
  "/eleves",
  "/candidatures",
  "/inscriptions",
  "/facturation",
  "/encaissements",
  "/caisse",
  "/relances",
  "/rapports",
  "/parametres",
];

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<LayoutPrincipal />}>
        <Route path="/" element={<Accueil />} />
        <Route path="/diagnostic" element={<Diagnostic />} />
        {CHEMINS_MODULES.map((chemin) => (
          <Route key={chemin} path={chemin} element={<ModuleAVenir />} />
        ))}
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  );
}
