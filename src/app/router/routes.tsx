import { Route, Routes } from "react-router-dom";
import { LayoutPrincipal } from "../../components/layout/LayoutPrincipal";
import { Accueil } from "../../pages/accueil/Accueil";
import { Diagnostic } from "../../pages/diagnostic/Diagnostic";
import { PageIntrouvable } from "../../pages/erreurs/PageIntrouvable";
import { ModuleAVenir } from "../../pages/module-a-venir/ModuleAVenir";
import { Organisation } from "../../pages/organisation/Organisation";

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

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<LayoutPrincipal />}>
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
