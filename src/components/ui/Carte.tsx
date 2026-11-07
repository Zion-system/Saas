import type { ReactNode } from "react";

interface CarteProps {
  children: ReactNode;
  className?: string;
  /** Rend la carte cliquable (navigation) avec état de survol. */
  onClick?: () => void;
}

/**
 * Carte blanche arrondie du design system (fond crème de l'application).
 */
export function Carte({ children, className = "", onClick }: CarteProps) {
  const classes = `rounded-2xl bg-white shadow-sm ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${classes} w-full text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-vert-moyen/40`}
      >
        {children}
      </button>
    );
  }

  return <section className={classes}>{children}</section>;
}
