import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FaBars,
  FaBook,
  FaBookOpen,
  FaCalendarTimes,
  FaChartBar,
  FaChalkboardTeacher,
  FaCog,
  FaCrown,
  FaFileInvoiceDollar,
  FaGraduationCap,
  FaHome,
  FaLock,
  FaSchool,
  FaSignOutAlt,
  FaTimes,
  FaUserGraduate,
} from "react-icons/fa";
import { NOM_ECOLE } from "../../config/ecole";
import { AUTH_DESACTIVEE_TEMPORAIREMENT } from "../../config/authentification";
import { deconnecter } from "../../services/compte/compte.service";

interface EntreeNavigation {
  libelle: string;
  chemin: string;
  icone: typeof FaHome;
  /** true = module livré ; false = badge « Bientôt ». */
  disponible: boolean;
}

/**
 * Navigation principale — les 9 onglets de la maquette validée (image
 * « onglet eleves interessant »), dans son ordre :
 *   Tableau de bord · Élèves · Classes · Professeurs · Matières ·
 *   Frais scolaires · Notes & Bulletins · Absences · Rapports.
 *
 * Les modules sans équivalent dans la maquette restent accessibles autrement :
 * - Paramètres : lien discret en bas de la barre (pas un travail quotidien) ;
 * - Candidatures, Inscriptions, Paiements, Caisse, Impayés : leurs chemins
 *   continuent d'exister (routes.tsx) et entreront plus tard comme états
 *   ou tiroirs internes de « Élèves » et « Frais scolaires ».
 */
const NAVIGATION: EntreeNavigation[] = [
  { libelle: "Tableau de bord", chemin: "/", icone: FaHome, disponible: true },
  { libelle: "Élèves", chemin: "/eleves", icone: FaUserGraduate, disponible: true },
  { libelle: "Classes", chemin: "/organisation", icone: FaSchool, disponible: true },
  { libelle: "Professeurs", chemin: "/professeurs", icone: FaChalkboardTeacher, disponible: true },
  { libelle: "Matières", chemin: "/matieres", icone: FaBook, disponible: true },
  { libelle: "Frais scolaires", chemin: "/facturation", icone: FaFileInvoiceDollar, disponible: false },
  { libelle: "Notes & Bulletins", chemin: "/bulletins", icone: FaBookOpen, disponible: false },
  { libelle: "Absences", chemin: "/absences", icone: FaCalendarTimes, disponible: false },
  { libelle: "Rapports", chemin: "/rapports", icone: FaChartBar, disponible: false },
];

function ContenuNavigation({ onNaviguer }: { onNaviguer?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* En-tête : logo + nom de l'école (compact pour laisser la place
          aux 9 entrées sans jamais faire apparaître d'ascenseur). */}
      <div className="border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-vert-sidebar-actif text-white shadow-inner">
            <FaGraduationCap className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold tracking-wide text-white">
              {NOM_ECOLE}
            </p>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-emerald-100/50">
              Gestion scolaire
            </p>
          </div>
        </div>
      </div>

      {/* Navigation — zone défilante propre au cas où (petits écrans) :
          ascenseur fin et discret, rien de visible quand tout tient. */}
      <nav
        aria-label="Navigation principale"
        className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]"
      >
        <ul className="space-y-0.5">
          {NAVIGATION.map((entree) => {
            const Icone = entree.icone;

            return (
              <li key={entree.chemin}>
                <NavLink
                  to={entree.chemin}
                  end={entree.chemin === "/"}
                  onClick={onNaviguer}
                  title={
                    entree.disponible
                      ? undefined
                      : "Ce module arrive bientôt : il est en préparation."
                  }
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? "bg-vert-sidebar-actif text-white shadow-sm ring-1 ring-white/10"
                        : entree.disponible
                          ? "text-emerald-50/70 hover:bg-white/5 hover:text-white"
                          : "text-emerald-100/35 hover:bg-white/5 hover:text-emerald-100/60"
                    }`
                  }
                >
                  <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{entree.libelle}</span>
                  {/* Modules non livrés : un petit cadenas grisé à la
                      place de l'ancien badge « BIENTÔT » qui criait. */}
                  {!entree.disponible && (
                    <FaLock
                      className="h-3 w-3 shrink-0 text-emerald-200/30"
                      aria-hidden="true"
                    />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pied compact : paramètres, diagnostic, premium, profil et
          déconnexion — deux blocs serrés au lieu de grandes cartes. */}
      <div className="space-y-2 border-t border-white/10 px-2.5 py-3">
        <div className="flex items-center gap-1">
          <NavLink
            to="/parametres"
            onClick={onNaviguer}
            className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-emerald-100/60 transition-colors hover:bg-white/5 hover:text-emerald-100"
          >
            <FaCog className="h-3.5 w-3.5" aria-hidden="true" />
            Paramètres
          </NavLink>
          <NavLink
            to="/diagnostic"
            onClick={onNaviguer}
            title="Diagnostic base de données"
            className="rounded-lg px-2 py-1.5 text-[11px] text-emerald-100/45 transition-colors hover:bg-white/5 hover:text-emerald-100/80"
          >
            Diagnostic
          </NavLink>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-amber-200/20 bg-gradient-to-br from-amber-300/15 to-orange-400/10 px-2.5 py-2">
          <FaCrown
            className="h-3.5 w-3.5 shrink-0 text-amber-200"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[12px] font-bold leading-tight text-amber-200">
              Premium
            </p>
            <p className="truncate text-[10.5px] leading-tight text-emerald-50/55">
              Toutes les fonctionnalités.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2 ring-1 ring-white/10">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vert-sidebar-actif text-[11px] font-bold text-white">
            AD
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold leading-tight text-white">
              Administrateur
            </p>
            <p className="truncate text-[10.5px] leading-tight text-emerald-100/50">
              Direction
            </p>
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
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium text-rose-100/75 transition-colors hover:bg-rose-500/10 hover:text-rose-100"
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
