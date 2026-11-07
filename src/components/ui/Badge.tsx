import type { ReactNode } from "react";

type VarianteBadge = "bientot" | "neutre";

interface BadgeProps {
  children: ReactNode;
  variante?: VarianteBadge;
}

const styles: Record<VarianteBadge, string> = {
  bientot: "bg-amber-100 text-amber-800 ring-amber-200",
  neutre: "bg-stone-100 text-stone-600 ring-stone-200",
};

/**
 * Petit badge arrondi (ex. « Bientôt » sur les modules non livrés).
 */
export function Badge({ children, variante = "neutre" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[variante]}`}
    >
      {children}
    </span>
  );
}
