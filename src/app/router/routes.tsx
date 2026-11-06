import { Route, Routes } from "react-router-dom";

function Accueil() {
  return (
    <main>
      <h1>ERP Scolaire</h1>
      <p>Bienvenue dans votre application de gestion scolaire.</p>
    </main>
  );
}

function PageIntrouvable() {
  return (
    <main>
      <h1>404 - Page introuvable</h1>
      <p>La page demandée n'existe pas.</p>
    </main>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />

      <Route path="*" element={<PageIntrouvable />} />
    </Routes>
  );
}
