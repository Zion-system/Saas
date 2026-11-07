import { Link } from "react-router-dom";
import { FaArrowLeft, FaCompass } from "react-icons/fa";
import { Carte } from "../../components/ui/Carte";

/** Page 404 affichée pour toute route inconnue. */
export function PageIntrouvable() {
  return (
    <div className="mx-auto max-w-2xl">
      <Carte className="p-8 text-center sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
          <FaCompass className="h-7 w-7 text-stone-500" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-stone-900">
          404 — Page introuvable
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          La page demandée n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-vert-moyen px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-vert-fonce-2"
        >
          <FaArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Retour à l'accueil
        </Link>
      </Carte>
    </div>
  );
}
