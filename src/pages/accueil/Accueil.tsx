import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaCashRegister,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaSchool,
  FaUserGraduate,
  FaUserPlus,
} from "react-icons/fa";
import { Carte } from "../../components/ui/Carte";
import {
  statsService,
  type TableauBordStats,
} from "../../services/stats/stats.service";
import { formaterDateFr } from "../../utils/date";

function formaterFcfa(montant: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(montant)} FCFA`;
}

function CarteStatistique({
  titre,
  valeur,
  icone: Icone,
  couleurTexte,
  couleurFond,
  infobulle,
}: {
  titre: string;
  valeur: string;
  icone: typeof FaUserGraduate;
  couleurTexte: string;
  couleurFond: string;
  infobulle?: string;
}) {
  return (
    <Carte className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{titre}</p>
          <p
            className={`mt-2 text-2xl font-bold ${couleurTexte}`}
            title={infobulle}
          >
            {valeur}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${couleurFond}`}
          aria-hidden="true"
        >
          <Icone className="h-5 w-5 text-white" />
        </span>
      </div>
    </Carte>
  );
}

function GraphiqueEncaissements({ stats }: { stats: TableauBordStats }) {
  const mois = stats.encaissementsParMois;
  const maximum = Math.max(...mois.map((m) => m.totalFcfa), 1);
  const toutVide = mois.every((m) => m.totalFcfa === 0);

  return (
    <Carte className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Encaissements mensuels
          </h2>
          <p className="text-sm text-stone-500">
            12 derniers mois · {formaterFcfa(stats.totalEncaissementsFcfa)} au
            total
          </p>
        </div>
      </div>

      {toutVide ? (
        <p className="rounded-xl bg-creme px-4 py-10 text-center text-sm text-stone-500">
          Aucun encaissement pour le moment.
        </p>
      ) : (
        <div
          className="flex h-48 items-end gap-2 sm:gap-3"
          role="img"
          aria-label="Graphique des encaissements mensuels"
        >
          {mois.map((m) => {
            const hauteur = Math.max(
              4,
              Math.round((m.totalFcfa / maximum) * 100),
            );

            return (
              <div
                key={m.cle}
                className="flex flex-1 flex-col items-center gap-2"
                title={`${m.libelle} : ${formaterFcfa(m.totalFcfa)}`}
              >
                <span className="text-[10px] font-medium text-stone-400">
                  {m.totalFcfa > 0
                    ? new Intl.NumberFormat("fr-FR", {
                        notation: "compact",
                      }).format(m.totalFcfa)
                    : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-vert-moyen to-emerald-400"
                  style={{ height: `${hauteur}%` }}
                />
                <span className="text-[11px] capitalize text-stone-500">
                  {m.libelle}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Carte>
  );
}

const ACTIONS_RAPIDES = [
  {
    libelle: "Nouvel élève",
    chemin: "/eleves",
    icone: FaUserPlus,
    classes: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    libelle: "Nouvelle facture",
    chemin: "/facturation",
    icone: FaFileInvoiceDollar,
    classes: "bg-sky-600 hover:bg-sky-700",
  },
  {
    libelle: "Encaisser",
    chemin: "/encaissements",
    icone: FaMoneyBillWave,
    classes: "bg-amber-500 hover:bg-amber-600",
  },
  {
    libelle: "Ouvrir la caisse",
    chemin: "/caisse",
    icone: FaCashRegister,
    classes: "bg-rose-600 hover:bg-rose-700",
  },
];

/**
 * Écran d'accueil : bandeau de bienvenue, statistiques réelles,
 * graphique des encaissements et actions rapides.
 */
export function Accueil() {
  const [stats, setStats] = useState<TableauBordStats | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;

    statsService
      .chargerTableauBord()
      .then((resultat) => {
        if (actif) setStats(resultat);
      })
      .catch((error: unknown) => {
        if (actif) {
          setErreur(
            error instanceof Error
              ? error.message
              : "Impossible de charger les statistiques.",
          );
        }
      });

    return () => {
      actif = false;
    };
  }, []);

  const dateJour = formaterDateFr();
  const dateAffichee =
    dateJour.charAt(0).toUpperCase() + dateJour.slice(1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Bandeau de bienvenue */}
      <section className="rounded-2xl bg-gradient-to-r from-vert-moyen to-vert-fonce-2 px-6 py-8 text-white shadow-sm sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Bienvenue</h1>
        <p className="mt-1 text-sm capitalize text-emerald-100/90 sm:text-base">
          {dateAffichee}
        </p>
      </section>

      {erreur && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {erreur}
        </p>
      )}

      {/* Cartes statistiques */}
      <section
        aria-label="Statistiques"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <CarteStatistique
          titre="Élèves"
          valeur={stats ? String(stats.nombreEleves) : "…"}
          icone={FaUserGraduate}
          couleurTexte="text-vert-moyen"
          couleurFond="bg-emerald-600"
        />
        <CarteStatistique
          titre="Classes"
          valeur={stats ? String(stats.nombreClasses) : "…"}
          icone={FaSchool}
          couleurTexte="text-sky-700"
          couleurFond="bg-sky-600"
        />
        <CarteStatistique
          titre="Trésorerie"
          valeur={
            stats ? formaterFcfa(stats.soldeTresorerieFcfa) : "…"
          }
          icone={FaMoneyBillWave}
          couleurTexte="text-amber-600"
          couleurFond="bg-amber-500"
        />
        <CarteStatistique
          titre="Impayés"
          valeur={
            stats?.impayesFcfa != null
              ? formaterFcfa(stats.impayesFcfa)
              : "—"
          }
          icone={FaFileInvoiceDollar}
          couleurTexte="text-rose-600"
          couleurFond="bg-rose-500"
          infobulle="Disponible après le module facturation"
        />
      </section>

      {/* Graphique + actions rapides */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {stats ? (
            <GraphiqueEncaissements stats={stats} />
          ) : (
            <Carte className="p-6 text-sm text-stone-500">
              Chargement des statistiques…
            </Carte>
          )}
        </div>

        <Carte className="p-5">
          <h2 className="mb-4 text-lg font-bold text-stone-900">
            Actions rapides
          </h2>
          <ul className="space-y-3">
            {ACTIONS_RAPIDES.map((action) => {
              const Icone = action.icone;

              return (
                <li key={action.chemin}>
                  <Link
                    to={action.chemin}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors ${action.classes}`}
                  >
                    <span className="flex items-center gap-3">
                      <Icone className="h-4 w-4" aria-hidden="true" />
                      {action.libelle}
                    </span>
                    <FaArrowRight className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Carte>
      </div>
    </div>
  );
}
