import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { creerServiceCompte } from "../../services/compte/compte.service";
import { executerRequete, executerTransaction } from "../../database/local/sqlite.client";
import type { DonneesCreationCompte, DonneesConnexion } from "../../services/compte/compte.service";

export type ModeAuth = "connexion" | "inscription";

const LONGUEUR_MIN_MOT_DE_PASSE = 10;

const STATISTIQUES = [
  { valeur: "500+", libelle: "élèves gérés" },
  { valeur: "12", libelle: "établissements" },
  { valeur: "Congo", libelle: "Brazzaville & régions" },
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
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function FormulaireInscription({
  onSoumettre,
}: {
  onSoumettre: (d: DonneesCreationCompte) => Promise<void>;
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
      await onSoumettre({ prenom, nom, telephone, email, mot_de_passe: motDePasse });
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
            placeholder="+242"
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
      </form>
    </>
  );
}

function FormulaireConnexion({
  onSoumettre,
}: {
  onSoumettre: (d: DonneesConnexion) => Promise<void>;
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
      await onSoumettre({ email, mot_de_passe: motDePasse });
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
      </form>
    </>
  );
}

/**
 * Page d'authentification : panneau de présentation sombre à gauche,
 * onglets Connexion / Inscription et formulaire à droite.
 */
export function Connexion() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ModeAuth>("inscription");
  const idOnglets = useId();

  const onglets: { cle: ModeAuth; libelle: string }[] = [
    { cle: "connexion", libelle: "Connexion" },
    { cle: "inscription", libelle: "Inscription" },
  ];

  const handleConnexion = async (donnees: DonneesConnexion) => {
    const database = {
      query: executerRequete,
      transaction: executerTransaction,
    };
    const serviceCompte = creerServiceCompte(database);
    await serviceCompte.connecter(donnees);
    navigate("/onboarding/ecole");
  };

  const handleInscription = async (donnees: DonneesCreationCompte) => {
    const database = {
      query: executerRequete,
      transaction: executerTransaction,
    };
    const serviceCompte = creerServiceCompte(database);
    
    // Vérifier si le compte existe déjà
    const existe = await serviceCompte.existe(donnees.email);
    if (existe) {
      throw new Error("Un compte avec cet email existe déjà.");
    }
    
    await serviceCompte.creer(donnees);
    // Après inscription, basculer vers l'onglet connexion
    setMode("connexion");
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Panneau de présentation */}
      <aside className="hidden flex-col justify-center bg-[#1a1a1a] px-14 py-16 text-white lg:flex xl:px-24">
        <div className="max-w-xl">
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
              <FormulaireInscription onSoumettre={handleInscription} />
            ) : (
              <FormulaireConnexion onSoumettre={handleConnexion} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
