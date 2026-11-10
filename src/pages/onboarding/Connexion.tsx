import { useId, useState, type FormEvent, type ReactNode } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";

export type ModeAuth = "connexion" | "inscription";

export interface DonneesConnexion {
  email: string;
  motDePasse: string;
}

export interface DonneesInscription extends DonneesConnexion {
  prenom: string;
  nom: string;
  telephone: string;
}

interface ConnexionProps {
  modeInitial?: ModeAuth;
  /** Appelé à l'envoi du formulaire de connexion. Peut lever une erreur : son message sera affiché. */
  onConnexion?: (donnees: DonneesConnexion) => Promise<void> | void;
  /** Appelé à l'envoi du formulaire d'inscription. Peut lever une erreur : son message sera affiché. */
  onInscription?: (donnees: DonneesInscription) => Promise<void> | void;
  /** Appelé au clic sur « S'inscrire / Se connecter avec Google ». */
  onGoogle?: (mode: ModeAuth) => Promise<void> | void;
  /** Nom affiché dans le pied de page du panneau gauche. */
  nomProduit?: string;
}

const LONGUEUR_MIN_MOT_DE_PASSE = 10;

const STATISTIQUES = [
  { valeur: "500+", libelle: "élèves gérés" },
  { valeur: "12", libelle: "établissements" },
  { valeur: "Mali", libelle: "Bamako & régions" },
];

const CLASSE_CHAMP =
  "h-14 w-full rounded-xl bg-[#e9e5df] px-4 text-[15px] text-stone-900 placeholder:text-stone-400 outline-none ring-1 ring-black/[0.03] transition focus:bg-white focus:ring-2 focus:ring-[#1d5c46]/60";

function Champ({
  etiquette,
  aide,
  children,
  htmlFor,
}: {
  etiquette: string;
  aide?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-semibold text-stone-900"
      >
        {etiquette}
      </label>
      {children}
      {aide && <p className="mt-2 text-xs text-stone-500">{aide}</p>}
    </div>
  );
}

function ChampMotDePasse({
  id,
  valeur,
  onChange,
  autoComplete,
}: {
  id: string;
  valeur: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className={`${CLASSE_CHAMP} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-600 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5c46]/60"
      >
        {visible ? (
          <FiEyeOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <FiEye className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function SeparateurOu() {
  return (
    <div className="flex items-center gap-4" role="separator" aria-label="ou">
      <span className="h-px flex-1 bg-stone-300" />
      <span className="text-xs text-stone-400">ou</span>
      <span className="h-px flex-1 bg-stone-300" />
    </div>
  );
}

function BoutonGoogle({
  libelle,
  onClick,
}: {
  libelle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#e9e5df] text-[15px] font-semibold text-stone-900 ring-1 ring-black/[0.04] transition hover:bg-[#e0dbd3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5c46]/60"
    >
      <FcGoogle className="h-5 w-5" aria-hidden="true" />
      {libelle}
    </button>
  );
}

function PiedFormulaire({
  question,
  action,
  onClick,
}: {
  question: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <p className="pt-2 text-center text-sm text-stone-500">
      {question}{" "}
      <button
        type="button"
        onClick={onClick}
        className="font-semibold text-[#1d5c46] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5c46]/60"
      >
        {action}
      </button>
    </p>
  );
}

function FormulaireInscription({
  onSoumettre,
  onGoogle,
  onChangerMode,
}: {
  onSoumettre: (d: DonneesInscription) => Promise<void>;
  onGoogle: () => Promise<void>;
  onChangerMode: () => void;
}) {
  const uid = useId();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      setErreur(
        `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
      );
      return;
    }

    setEnvoi(true);
    try {
      await onSoumettre({ prenom, nom, telephone, email, motDePasse });
    } catch (error: unknown) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de créer le compte. Réessayez.",
      );
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <h1 className="text-[26px] font-bold leading-tight text-stone-900">
        Créer mon compte
      </h1>
      <p className="mt-1.5 text-sm text-stone-500">
        30 jours d'essai, sans carte bancaire
      </p>

      <form onSubmit={soumettre} className="mt-8 space-y-6" noValidate={false}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Champ etiquette="Prénom" htmlFor={`${uid}-prenom`}>
            <input
              id={`${uid}-prenom`}
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Aminata"
              autoComplete="given-name"
              required
              className={CLASSE_CHAMP}
            />
          </Champ>
          <Champ etiquette="Nom" htmlFor={`${uid}-nom`}>
            <input
              id={`${uid}-nom`}
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Koné"
              autoComplete="family-name"
              required
              className={CLASSE_CHAMP}
            />
          </Champ>
        </div>

        <Champ etiquette="Téléphone" htmlFor={`${uid}-tel`}>
          <input
            id={`${uid}-tel`}
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+223"
            autoComplete="tel"
            required
            className={CLASSE_CHAMP}
          />
        </Champ>

        <Champ
          etiquette="Adresse email"
          htmlFor={`${uid}-email`}
          aide="Nous y enverrons votre code de vérification."
        >
          <input
            id={`${uid}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="directeur@ecole.ml"
            autoComplete="email"
            required
            className={CLASSE_CHAMP}
          />
        </Champ>

        <Champ
          etiquette="Mot de passe"
          htmlFor={`${uid}-mdp`}
          aide={`Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`}
        >
          <ChampMotDePasse
            id={`${uid}-mdp`}
            valeur={motDePasse}
            onChange={setMotDePasse}
            autoComplete="new-password"
          />
        </Champ>

        {erreur && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="h-14 w-full rounded-xl bg-[#1d5c46] text-base font-semibold text-white shadow-[0_10px_24px_-14px_rgba(29,92,70,0.8)] transition hover:bg-[#174f3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5c46] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0eeea] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {envoi ? "Création en cours…" : "Créer mon compte"}
        </button>

        <SeparateurOu />

        <BoutonGoogle
          libelle="S'inscrire avec Google"
          onClick={() => {
            setErreur(null);
            onGoogle().catch((error: unknown) =>
              setErreur(
                error instanceof Error
                  ? error.message
                  : "Inscription avec Google impossible.",
              ),
            );
          }}
        />

        <PiedFormulaire
          question="Vous avez déjà un compte ?"
          action="Se connecter"
          onClick={onChangerMode}
        />
      </form>
    </>
  );
}

function FormulaireConnexion({
  onSoumettre,
  onGoogle,
  onChangerMode,
}: {
  onSoumettre: (d: DonneesConnexion) => Promise<void>;
  onGoogle: () => Promise<void>;
  onChangerMode: () => void;
}) {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await onSoumettre({ email, motDePasse });
    } catch (error: unknown) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Connexion impossible. Vérifiez vos identifiants.",
      );
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <h1 className="text-[26px] font-bold leading-tight text-stone-900">
        Se connecter
      </h1>
      <p className="mt-1.5 text-sm text-stone-500">
        Accédez à votre établissement
      </p>

      <form onSubmit={soumettre} className="mt-8 space-y-6">
        <Champ etiquette="Adresse email" htmlFor={`${uid}-email`}>
          <input
            id={`${uid}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="directeur@ecole.ml"
            autoComplete="email"
            required
            className={CLASSE_CHAMP}
          />
        </Champ>

        <Champ etiquette="Mot de passe" htmlFor={`${uid}-mdp`}>
          <ChampMotDePasse
            id={`${uid}-mdp`}
            valeur={motDePasse}
            onChange={setMotDePasse}
            autoComplete="current-password"
          />
        </Champ>

        {erreur && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="h-14 w-full rounded-xl bg-[#1d5c46] text-base font-semibold text-white shadow-[0_10px_24px_-14px_rgba(29,92,70,0.8)] transition hover:bg-[#174f3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5c46] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0eeea] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {envoi ? "Connexion en cours…" : "Se connecter"}
        </button>

        <SeparateurOu />

        <BoutonGoogle
          libelle="Se connecter avec Google"
          onClick={() => {
            setErreur(null);
            onGoogle().catch((error: unknown) =>
              setErreur(
                error instanceof Error
                  ? error.message
                  : "Connexion avec Google impossible.",
              ),
            );
          }}
        />

        <PiedFormulaire
          question="Pas encore de compte ?"
          action="S'inscrire"
          onClick={onChangerMode}
        />
      </form>
    </>
  );
}

/**
 * Page d'authentification : panneau de présentation sombre à gauche,
 * onglets Connexion / Inscription et formulaire à droite.
 */
export function Connexion({
  modeInitial = "inscription",
  onConnexion,
  onInscription,
  onGoogle,
  nomProduit = "Walan",
}: ConnexionProps) {
  const [mode, setMode] = useState<ModeAuth>(modeInitial);
  const idOnglets = useId();

  const onglets: { cle: ModeAuth; libelle: string }[] = [
    { cle: "connexion", libelle: "Connexion" },
    { cle: "inscription", libelle: "Inscription" },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Panneau de présentation */}
      <aside
        className="hidden flex-col bg-[#1a1a1a] px-14 py-10 text-white lg:flex xl:px-24"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="my-auto max-w-xl py-10">
          <p className="text-5xl font-semibold leading-[1.15] tracking-tight xl:text-6xl">
            La gestion scolaire,
            <br />
            <span className="text-[#3f9c7b]">simplifiée.</span>
          </p>

          <p className="mt-9 max-w-md text-[17px] leading-relaxed text-white/70">
            Un seul outil pour les élèves, les frais, les notes et la
            communication avec les parents.
          </p>

          <dl className="mt-12 flex gap-10 border-t border-white/10 pt-9">
            {STATISTIQUES.map((s) => (
              <div key={s.libelle}>
                <dt className="sr-only">{s.libelle}</dt>
                <dd className="text-3xl font-medium text-[#3f9c7b]">
                  {s.valeur}
                </dd>
                <p className="mt-1 text-xs text-white/45" aria-hidden="true">
                  {s.libelle}
                </p>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-white/30">
          © {new Date().getFullYear()} {nomProduit} — Tous droits réservés
        </p>
      </aside>

      {/* Panneau formulaire */}
      <main className="flex items-center justify-center bg-[#f0eeea] px-6 py-10 sm:px-10">
        <div className="w-full max-w-[640px]">
          <div
            role="tablist"
            aria-label="Choisir entre connexion et inscription"
            className="grid grid-cols-2 gap-1 rounded-xl bg-[#e2ddd5] p-1"
          >
            {onglets.map((o) => {
              const actif = mode === o.cle;
              return (
                <button
                  key={o.cle}
                  id={`${idOnglets}-${o.cle}`}
                  type="button"
                  role="tab"
                  aria-selected={actif}
                  aria-controls={`${idOnglets}-panneau`}
                  onClick={() => setMode(o.cle)}
                  className={`h-11 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5c46] ${
                    actif
                      ? "bg-[#1d5c46] text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {o.libelle}
                </button>
              );
            })}
          </div>

          <div
            id={`${idOnglets}-panneau`}
            role="tabpanel"
            aria-labelledby={`${idOnglets}-${mode}`}
            className="mt-10"
          >
            {mode === "inscription" ? (
              <FormulaireInscription
                onSoumettre={async (d) => {
                  await onInscription?.(d);
                }}
                onGoogle={async () => {
                  await onGoogle?.("inscription");
                }}
                onChangerMode={() => setMode("connexion")}
              />
            ) : (
              <FormulaireConnexion
                onSoumettre={async (d) => {
                  await onConnexion?.(d);
                }}
                onGoogle={async () => {
                  await onGoogle?.("connexion");
                }}
                onChangerMode={() => setMode("inscription")}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}