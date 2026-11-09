import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarDay,
  FaClipboardList,
  FaEye,
  FaEyeSlash,
  FaFileInvoiceDollar,
  FaGraduationCap,
  FaMoneyBillWave,
  FaReceipt,
  FaSyncAlt,
  FaUserPlus,
  FaUserTimes,
} from "react-icons/fa";
import {
  statsService,
  type TableauBordStats,
} from "../../services/stats/stats.service";
import { formaterDateFr } from "../../utils/date";

function formaterFcfa(montant: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(montant)} FCFA`;
}

function formaterNombre(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formaterCompact(n: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(n);
}

/** Année scolaire courante, ex. « 2026-2027 » (rentrée en septembre). */
function anneeScolaire(date = new Date()): string {
  const annee = date.getFullYear();
  return date.getMonth() >= 8 ? `${annee}-${annee + 1}` : `${annee - 1}-${annee}`;
}

/**
 * Champs optionnels pour les lignes de détail des cartes.
 * S'ils n'existent pas encore dans TableauBordStats, un texte par défaut
 * est affiché. Ajoute-les dans stats.service.ts pour les alimenter.
 */
type StatsEtendues = TableauBordStats & {
  classesAvecEleves?: number;
  elevesImpayes?: number;
  salairesVersesFcfa?: number;
};

const ICONES_KPI: Record<string, typeof FaGraduationCap> = {
  "Élèves inscrits": FaGraduationCap,
  "Nombre de classes": FaClipboardList,
  "Impayés en attente": FaFileInvoiceDollar,
  "Trésorerie nette": FaMoneyBillWave,
};

interface Kpi {
  titre: string;
  valeur: string;
  suffixe?: string;
  detail: string;
  infobulle?: string;
  masquable?: boolean;
}

function CarteKpi({ kpi }: { kpi: Kpi }) {
  const Icone = ICONES_KPI[kpi.titre] ?? FaGraduationCap;
  const [masque, setMasque] = useState(false);

  return (
    <article className="flex min-h-[112px] flex-col justify-between rounded-xl bg-white/[0.07] p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
      <header className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-emerald-50/90 ring-1 ring-white/15"
          aria-hidden="true"
        >
          <Icone className="h-3 w-3" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-emerald-50/75">
          {kpi.titre}
        </p>
        {kpi.masquable && (
          <button
            type="button"
            onClick={() => setMasque((v) => !v)}
            aria-label={masque ? "Afficher le montant" : "Masquer le montant"}
            className="text-emerald-50/70 transition-colors hover:text-white"
          >
            {masque ? (
              <FaEyeSlash className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <FaEye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
      </header>

      <p
        className="mt-3 text-2xl font-bold leading-tight text-white"
        title={kpi.infobulle}
      >
        {masque ? "••••••" : kpi.valeur}
        {kpi.suffixe && !masque && (
          <span className="ml-1 text-2xl font-bold">{kpi.suffixe}</span>
        )}
      </p>

      <p className="mt-1 text-[11px] leading-snug text-emerald-50/60">
        {kpi.detail}
      </p>
    </article>
  );
}

function GraphiqueEncaissements({ stats }: { stats: TableauBordStats }) {
  const mois = stats.encaissementsParMois;
  const toutVide = mois.every((m) => m.totalFcfa === 0);
  // Quand il n'y a aucune donnée, on garde une échelle fictive pour afficher les axes.
  const maximum = toutVide
    ? 100000
    : Math.max(...mois.map((m) => m.totalFcfa), 1);
  const graduations = [1, 0.75, 0.5, 0.25, 0].map((r) =>
    Math.round(maximum * r),
  );

  return (
    <section className="h-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Encaissements par mois
          </h2>
          <p className="mt-0.5 text-[11px] text-stone-400">{anneeScolaire()}</p>
        </div>
        <Link
          to="/encaissements"
          className="text-[11px] text-stone-400 transition-colors hover:text-[#1d5c46]"
        >
          Voir les chiffres
        </Link>
      </div>

      <div
        className="mt-5 flex gap-2"
        role="img"
        aria-label="Graphique des encaissements mensuels"
      >
        {/* Axe vertical */}
        <div className="flex h-48 w-9 shrink-0 flex-col justify-between text-right text-[9px] text-stone-400">
          {graduations.map((g, i) => (
            <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {g === 0 ? "0" : formaterCompact(g)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Zone du graphique */}
          <div className="relative h-48">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {graduations.map((_, i) => (
                <div key={i} className="border-t border-stone-200/80" />
              ))}
            </div>

            <div className="relative flex h-full items-end gap-4 px-4 sm:gap-6">
              {mois.map((m) => {
                const hauteur =
                  m.totalFcfa > 0
                    ? Math.max(3, Math.round((m.totalFcfa / maximum) * 100))
                    : 0;

                return (
                  <div
                    key={m.cle}
                    className="flex h-full flex-1 items-end justify-center"
                    title={`${m.libelle} : ${formaterFcfa(m.totalFcfa)}`}
                  >
                    <div
                      className="w-full max-w-[22px] rounded-t-sm bg-gradient-to-t from-[#1d5c46] to-[#2f8f6a]"
                      style={{ height: `${hauteur}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {toutVide && (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-stone-400">
                Aucun encaissement pour le moment.
              </p>
            )}
          </div>

          {/* Mois */}
          <div className="mt-2 flex gap-4 px-4 sm:gap-6">
            {mois.map((m) => (
              <span
                key={m.cle}
                className="flex-1 text-center text-[10px] capitalize text-stone-400"
              >
                {m.libelle}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface ActionRapide {
  libelle: string;
  chemin: string;
  icone: typeof FaUserPlus;
  classes: string;
}

const ACTIONS_RAPIDES: ActionRapide[] = [
  {
    libelle: "Inscription",
    chemin: "/inscriptions",
    icone: FaUserPlus,
    classes: "bg-pastel-menthe text-[#1f5c46]",
  },
  {
    libelle: "Paiements",
    chemin: "/encaissements",
    icone: FaReceipt,
    classes: "bg-pastel-peche text-[#8a5a34]",
  },
  {
    libelle: "Bulletins",
    chemin: "/bulletins",
    icone: FaGraduationCap,
    classes: "bg-pastel-ciel text-[#2c5f8a]",
  },
  {
    libelle: "Absences",
    chemin: "/absences",
    icone: FaUserTimes,
    classes: "bg-pastel-rose text-[#9c4a44]",
  },
];

function ActionsRapides() {
  return (
    <section className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-stone-900">Actions rapides</h2>
      <ul className="mt-4 grid flex-1 grid-cols-2 grid-rows-2 gap-3">
        {ACTIONS_RAPIDES.map((action) => {
          const Icone = action.icone;

          return (
            <li key={action.chemin} className="flex">
              <Link
                to={action.chemin}
                className={`flex h-full min-h-[84px] w-full flex-col items-center justify-center gap-2 rounded-xl p-3 text-center ring-1 ring-black/5 transition-shadow hover:shadow-md ${action.classes}`}
              >
                <Icone className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium leading-tight">
                  {action.libelle}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Écran d'accueil : bandeau de bienvenue, 4 indicateurs, graphique des
 * encaissements et actions rapides — fidèle à la maquette.
 */
export function Accueil() {
  const [stats, setStats] = useState<TableauBordStats | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(() => {
    statsService
      .chargerTableauBord()
      .then((resultat) => {
        setStats(resultat);
      })
      .catch((error: unknown) => {
        setErreur(
          error instanceof Error
            ? error.message
            : "Impossible de charger les statistiques.",
        );
      })
      .finally(() => setChargement(false));
  }, []);

  const rafraichir = () => {
    setChargement(true);
    setErreur(null);
    charger();
  };

  useEffect(() => {
    charger();
  }, [charger]);

  const dateJour = formaterDateFr();
  const dateAffichee = dateJour.charAt(0).toUpperCase() + dateJour.slice(1);

  const extra = stats as StatsEtendues | null;

  const kpis: Kpi[] = stats
    ? [
        {
          titre: "Élèves inscrits",
          valeur: formaterNombre(stats.nombreEleves),
          detail: anneeScolaire(),
        },
        {
          titre: "Nombre de classes",
          valeur: formaterNombre(stats.nombreClasses),
          detail:
            extra?.classesAvecEleves != null
              ? `${formaterNombre(extra.classesAvecEleves)} avec des élèves`
              : "Classes actives",
        },
        {
          titre: "Impayés en attente",
          valeur:
            stats.impayesFcfa != null ? formaterNombre(stats.impayesFcfa) : "—",
          suffixe: stats.impayesFcfa != null ? "FCFA" : undefined,
          detail:
            extra?.elevesImpayes != null
              ? `${formaterNombre(extra.elevesImpayes)} élève(s) concerné(s)`
              : "Disponible après le module facturation",
          infobulle: "Disponible après le module facturation",
        },
        {
          titre: "Trésorerie nette",
          valeur: formaterNombre(stats.soldeTresorerieFcfa),
          suffixe: "FCFA",
          detail:
            extra?.salairesVersesFcfa != null
              ? `- ${formaterFcfa(extra.salairesVersesFcfa)} de salaires versés`
              : "Encaissements moins dépenses",
          masquable: true,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Bandeau vert : bienvenue + indicateurs */}
      <section
        className="relative overflow-hidden rounded-2xl p-4 text-white shadow-[0_20px_50px_-30px_rgba(11,59,45,0.6)] sm:p-5"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0f4a35 0%, #1a5e45 55%, #1d6a4c 100%)",
        }}
      >
        <div className="relative">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold leading-tight">Bienvenue</h1>
                <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 ring-1 ring-emerald-200/30">
                  Essai
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-50/80">
                Aperçu de la performance de votre établissement
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white ring-1 ring-white/15">
                <FaCalendarDay className="h-3 w-3" aria-hidden="true" />
                {dateAffichee}
              </span>
              <button
                type="button"
                onClick={rafraichir}
                disabled={chargement}
                aria-label="Actualiser les statistiques"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                <FaSyncAlt
                  className={`h-3.5 w-3.5 ${chargement ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </header>

          {erreur && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-100 ring-1 ring-rose-200/30"
            >
              {erreur}
            </p>
          )}

          <section
            aria-label="Statistiques"
            className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {stats
              ? kpis.map((kpi) => <CarteKpi key={kpi.titre} kpi={kpi} />)
              : [0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[112px] animate-pulse rounded-xl bg-white/10 ring-1 ring-white/10"
                  />
                ))}
          </section>
        </div>
      </section>

      {/* Graphique + actions rapides */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="h-full">
          {stats ? (
            <GraphiqueEncaissements stats={stats} />
          ) : (
            <div className="h-[320px] animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-black/5" />
          )}
        </div>
        <ActionsRapides />
      </div>
    </div>
  );
}