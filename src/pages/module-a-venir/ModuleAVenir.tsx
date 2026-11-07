import { Link } from "react-router-dom";
import { FaArrowLeft, FaHammer } from "react-icons/fa";
import { Carte } from "../../components/ui/Carte";

/**
 * Page « Module à venir » : affichée pour tous les modules de la roadmap
 * non encore livrés. Design cohérent avec la coquille.
 */
export function ModuleAVenir() {
  return (
    <div className="mx-auto max-w-2xl">
      <Carte className="p-8 text-center sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <FaHammer className="h-7 w-7 text-amber-600" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-stone-900">
          Module à venir
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Ce module fait partie de la feuille de route et sera disponible
          prochainement.
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
