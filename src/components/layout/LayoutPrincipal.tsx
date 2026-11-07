import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FaBars,
  FaBell,
  FaCashRegister,
  FaChartBar,
  FaClipboardList,
  FaCog,
  FaFileAlt,
  FaFileInvoiceDollar,
  FaHome,
  FaMoneyBillWave,
  FaSchool,
  FaSignOutAlt,
  FaTimes,
  FaUserGraduate,
} from "react-icons/fa";
import { NOM_ECOLE } from "../../config/ecole";
import { Badge } from "../ui/Badge";

interface EntreeNavigation {
  libelle: string;
  chemin: string;
  icone: typeof FaHome;
  /** true = module livré ; false = badge « Bientôt ». */
  disponible: boolean;
}

const NAVIGATION: EntreeNavigation[] = [
  { libelle: "Accueil", chemin: "/", icone: FaHome, disponible: true },
  { libelle: "Organisation", chemin: "/organisation", icone: FaSchool, disponible: false },
  { libelle: "Élèves & responsables", chemin: "/eleves", icone: FaUserGraduate, disponible: false },
  { libelle: "Candidatures", chemin: "/candidatures", icone: FaFileAlt, disponible: false },
  { libelle: "Inscriptions", chemin: "/inscriptions", icone: FaClipboardList, disponible: false },
  { libelle: "Facturation", chemin: "/facturation", icone: FaFileInvoiceDollar, disponible: false },
  { libelle: "Encaissements", chemin: "/encaissements", icone: FaMoneyBillWave, disponible: false },
  { libelle: "Caisse", chemin: "/caisse", icone: FaCashRegister, disponible: false },
  { libelle: "Relances & créances", chemin: "/relances", icone: FaBell, disponible: false },
  { libelle: "Rapports", chemin: "/rapports", icone: FaChartBar, disponible: false },
  { libelle: "Paramètres", chemin: "/parametres", icone: FaCog, disponible: false },
];

function ContenuNavigation({ onNaviguer }: { onNaviguer?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* En-tête : nom de l'école */}
      <div className="border-b border-white/10 px-5 py-6">
        <p className="text-lg font-bold tracking-wide text-white">{NOM_ECOLE}</p>
        <p className="mt-1 text-xs text-emerald-100/60">Gestion scolaire</p>
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAVIGATION.map((entree) => {
            const Icone = entree.icone;

            return (
              <li key={entree.chemin}>
                <NavLink
                  to={entree.chemin}
                  end={entree.chemin === "/"}
                  onClick={onNaviguer}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-vert-moyen text-white"
                        : "text-emerald-50/80 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{entree.libelle}</span>
                  {!entree.disponible && (
                    <Badge variante="bientot">Bientôt</Badge>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pied : diagnostic + déconnexion */}
      <div className="border-t border-white/10 px-3 py-4">
        <NavLink
          to="/diagnostic"
          onClick={onNaviguer}
          className="block rounded-lg px-3 py-2 text-xs text-emerald-100/50 transition-colors hover:text-emerald-100/80"
        >
          Diagnostic base de données
        </NavLink>
        <button
          type="button"
          disabled
          title="Le module d'authentification arrive prochainement"
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-50/80 opacity-60"
        >
          <FaSignOutAlt className="h-4 w-4" aria-hidden="true" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

/**
 * Coquille principale : barre latérale vert foncé + zone principale crème.
 * Desktop : sidebar fixe. Mobile/tablette : menu burger.
 */
export function LayoutPrincipal() {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="flex min-h-screen bg-creme">
      {/* Barre latérale desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-vert-fonce lg:block">
        <ContenuNavigation />
      </aside>

      {/* Barre latérale mobile (overlay) */}
      {menuOuvert && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOuvert(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-vert-fonce shadow-xl">
            <button
              type="button"
              onClick={() => setMenuOuvert(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-4 rounded-lg p-2 text-emerald-100/70 hover:bg-white/10 hover:text-white"
            >
              <FaTimes className="h-5 w-5" />
            </button>
            <ContenuNavigation onNaviguer={() => setMenuOuvert(false)} />
          </aside>
        </div>
      )}

      {/* Zone principale */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Barre supérieure mobile */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-creme/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            aria-label="Ouvrir le menu"
            className="rounded-lg p-2 text-vert-fonce hover:bg-white"
          >
            <FaBars className="h-5 w-5" />
          </button>
          <p className="text-base font-bold text-vert-fonce">{NOM_ECOLE}</p>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
