import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuChevronDown,
  LuCircleAlert,
  LuInfo,
  LuLoader,
} from "react-icons/lu";
import { cx } from "./donnees";

/**
 * Primitives d'interface du parcours « Configuration initiale »,
 * fidèles à la maquette vidéo (vert #2d8a6b, gris stone, fond #faf8f4).
 * Elles sont locales à ce parcours et ne remplacent pas le design
 * system de l'application (Button, Carte, Badge…).
 */

/* ============================== Styles ============================== */

export const champCls =
  "h-11 w-full rounded-[10px] border border-transparent bg-stone-100 px-3.5 text-[15px] text-stone-900 " +
  "placeholder:text-stone-400 hover:border-stone-200 " +
  "focus-visible:border-[#2d8a6b] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d8a6b]/20";

export const carteCls =
  "flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5";
export const titreBlocCls = "text-sm font-semibold text-stone-900";
export const astuceCls = "text-[12.5px] text-stone-500";
export const lienDangerCls =
  "inline-flex items-center gap-1 rounded p-1 text-[12.5px] text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-red-700";

/* ============================== Champs ============================== */

export function Champ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-stone-900">{label}</span>
      {children}
      {hint ? <span className={astuceCls}>{hint}</span> : null}
    </label>
  );
}

export function ChampTexte({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(champCls, className)} {...props} />;
}

export function ChampAvecIcone({
  icone: Icone,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icone: IconType }) {
  return (
    <div className="relative flex items-center">
      <Icone
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 text-stone-500"
      />
      <ChampTexte className="pl-10" {...props} />
    </div>
  );
}

export interface OptionListe {
  valeur: string;
  libelle: string;
}

export function ListeDeroulante({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: (string | OptionListe)[];
}) {
  return (
    <div className="relative">
      <select className={cx(champCls, "appearance-none pr-10")} {...props}>
        {options.map((option) => {
          const valeur =
            typeof option === "string" ? option : option.valeur;
          const libelle =
            typeof option === "string" ? option : option.libelle;
          return (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          );
        })}
      </select>
      <LuChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500"
      />
    </div>
  );
}

/* ============================== Puces (réservé) ============================== */

export function Puce({
  actif,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { actif: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      className={cx(
        "h-9 rounded-[9px] border px-3.5 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]",
        actif
          ? "border-[#2d8a6b] bg-[#2d8a6b] text-white"
          : "border-stone-200 bg-white text-stone-900 hover:border-[#2d8a6b]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ============================== Boutons ============================== */

const VARIANTES_BOUTON = {
  principal: "w-full h-[46px] bg-[#2d8a6b] text-white hover:bg-[#247a5d]",
  secondaire:
    "h-10 self-start bg-[#2d8a6b] text-[13.5px] text-white hover:bg-[#247a5d]",
  /** Bouton d'action secondaire en page (contour gris, pas de remplissage). */
  contour:
    "h-10 self-start border-stone-200 bg-white text-[13.5px] text-stone-700 hover:border-[#2d8a6b] hover:text-stone-900",
  fantome:
    "h-11 border-stone-200 bg-transparent text-stone-900 hover:bg-stone-100",
} as const;

export function Bouton({
  variante = "principal",
  enCours,
  icone: Icone,
  iconeDroite: IconeDroite,
  children,
  disabled,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof VARIANTES_BOUTON;
  enCours?: boolean;
  icone?: IconType;
  iconeDroite?: IconType;
}) {
  return (
    <button
      type="button"
      disabled={disabled || enCours}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] border border-transparent px-5 font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTES_BOUTON[variante],
        className,
      )}
      {...props}
    >
      {enCours ? (
        <LuLoader size={18} aria-hidden="true" className="animate-spin" />
      ) : Icone ? (
        <Icone size={17} aria-hidden="true" />
      ) : null}
      <span>{enCours ? "Enregistrement…" : children}</span>
      {!enCours && IconeDroite ? (
        <IconeDroite size={17} aria-hidden="true" />
      ) : null}
    </button>
  );
}

/* ============================== Menu déroulant ============================== */

export interface ElementMenu {
  libelle: string;
  action: () => void;
  icone?: IconType;
  disabled?: boolean;
  /** Explication affichée en info-bulle (utile quand désactivé). */
  titre?: string;
}

/**
 * Bouton secondaire (contour) qui déroule une petite liste d'actions.
 * Fermeture propre : clic dehors ou touche Échap. Utilisé en tête de la
 * page Élèves pour regrouper Import / Export sans écraser le titre.
 */
export function MenuDeroulant({
  libelle,
  icone: Icone,
  elements,
  disabled,
}: {
  libelle: string;
  icone?: IconType;
  elements: ElementMenu[];
  disabled?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!ouvert) return;
    const auClicDehors = (evenement: MouseEvent) => {
      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(evenement.target as Node)
      ) {
        setOuvert(false);
      }
    };
    const aLEchap = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", auClicDehors);
    document.addEventListener("keydown", aLEchap);
    return () => {
      document.removeEventListener("mousedown", auClicDehors);
      document.removeEventListener("keydown", aLEchap);
    };
  }, [ouvert]);

  return (
    <div ref={conteneurRef} className="relative w-fit">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={idMenu}
        onClick={() => setOuvert((precedent) => !precedent)}
        className={cx(
          "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-stone-200 bg-white px-4 text-[13.5px] font-semibold text-stone-700 transition-colors",
          "hover:border-[#2d8a6b] hover:text-stone-900",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b] disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {Icone ? <Icone size={17} aria-hidden="true" /> : null}
        <span>{libelle}</span>
        <LuChevronDown
          size={15}
          aria-hidden="true"
          className={cx("transition-transform", ouvert && "rotate-180")}
        />
      </button>

      {ouvert ? (
        <div
          id={idMenu}
          role="menu"
          className="absolute right-0 z-30 mt-1.5 min-w-[250px] rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/10"
        >
          {elements.map((element) => {
            const IconeElement = element.icone;
            return (
              <button
                key={element.libelle}
                type="button"
                role="menuitem"
                disabled={element.disabled}
                title={element.titre}
                onClick={() => {
                  setOuvert(false);
                  element.action();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 hover:disabled:bg-transparent"
              >
                {IconeElement ? (
                  <IconeElement size={16} aria-hidden="true" />
                ) : null}
                {element.libelle}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ============================== Messages ============================== */

export function MessageErreur({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13.5px] text-red-700"
    >
      <LuCircleAlert size={16} aria-hidden="true" className="shrink-0" />
      {children}
    </p>
  );
}

export function Aide({ children }: { children: ReactNode }) {
  return (
    <p className={cx(astuceCls, "flex items-center gap-1.5")}>
      <LuInfo size={14} aria-hidden="true" className="shrink-0" />
      {children}
    </p>
  );
}

/**
 * Bandeau d'honnêteté des étapes non encore branchées (Frais, Élèves,
 * Équipe) : l'interface suit la maquette, mais les données ne sont pas
 * encore enregistrées en base.
 */
export function NoteEnAttente({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[10px] bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
      <LuInfo size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* ============================== Navigation ============================== */

export function LienEtapePrecedente({
  onRetour,
}: {
  onRetour: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRetour}
      className="inline-flex items-center gap-1.5 self-start py-1.5 text-[13.5px] text-stone-500 hover:text-stone-900"
    >
      <LuArrowLeft size={16} aria-hidden="true" /> Étape précédente
    </button>
  );
}
