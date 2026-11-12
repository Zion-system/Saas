import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FaBars,
  FaBell,
  FaCashRegister,
  FaChartBar,
  FaClipboardList,
  FaCog,
  FaCrown,
  FaFileAlt,
  FaFileInvoiceDollar,
  FaGraduationCap,
  FaHome,
  FaMoneyBillWave,
  FaSchool,
  FaSignOutAlt,
  FaTimes,
  FaUserGraduate,
} from "react-icons/fa";
import { NOM_ECOLE } from "../../config/ecole";
import { AUTH_DESACTIVEE_TEMPORAIREMENT } from "../../config/authentification";
import { Badge } from "../ui/Badge";
import { deconnecter } from "../../services/compte/compte.service";

interface EntreeNavigation {
  libelle: string;
  chemin: string;
  icone: typeof FaHome;
  /** true = module livré ; false = badge « Bientôt ». */
  disponible: boolean;
}

const NAVIGATION: EntreeNavigation[] = [
  { libelle: "Accueil", chemin: "/", icone: FaHome, disponible: true },
  { libelle: "Organisation", chemin: "/organisation", icone: FaSchool, disponible: true },
  { libelle: "Élèves & responsables", chemin: "/eleves", icone: FaUserGraduate, disponible: true },
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
      {/* En-tête : logo + nom de l'école */}
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vert-sidebar-actif text-white shadow-inner">
            <FaGraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-wide text-white">
              {NOM_ECOLE}
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/50">
              Gestion scolaire
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/40">
          Navigation
        </p>
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
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-vert-sidebar-actif text-white shadow-sm ring-1 ring-white/10"
                        : "text-emerald-50/65 hover:bg-white/5 hover:text-white"
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

      {/* Pied : diagnostic, premium, profil et déconnexion */}
      <div className="space-y-3 border-t border-white/10 px-3 py-4">
        <NavLink
          to="/diagnostic"
          onClick={onNaviguer}
          className="block rounded-lg px-3 py-2 text-[11px] text-emerald-100/45 transition-colors hover:text-emerald-100/80"
        >
          Diagnostic base de données
        </NavLink>

        <div className="rounded-2xl border border-amber-200/20 bg-gradient-to-br from-amber-300/15 to-orange-400/10 p-3">
          <div className="flex items-center gap-2 text-amber-200">
            <FaCrown className="h-4 w-4" aria-hidden="true" />
            <p className="text-sm font-bold">Premium</p>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-emerald-50/60">
            Accédez à toutes les fonctionnalités de gestion.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vert-sidebar-actif text-xs font-bold text-white">
            AD
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Administrateur
            </p>
            <p className="truncate text-[11px] text-emerald-100/50">Direction</p>
          </div>
        </div>

        {/* Déconnexion : masquée tant que l'authentification est désactivée
            temporairement (interrupteur) — il n'y a alors aucune session à
            fermer. Elle réapparaîtra avec l'authentification Supabase. */}
        {!AUTH_DESACTIVEE_TEMPORAIREMENT && (
          <button
            type="button"
            onClick={() => {
              deconnecter();
              window.location.href = "/onboarding/connexion";
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-100/75 transition-colors hover:bg-rose-500/10 hover:text-rose-100"
          >
            <FaSignOutAlt className="h-4 w-4" aria-hidden="true" />
            Se déconnecter
          </button>
        )}
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-vert-sidebar lg:block">
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
          <aside className="absolute inset-y-0 left-0 w-72 bg-vert-sidebar shadow-xl">
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
