/** Fuseau horaire de référence de l'application. */
export const FUSEAU_HORAIRE = "Africa/Brazzaville";

const formateurDateLong = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: FUSEAU_HORAIRE,
});

const formateurMoisCourt = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});

/**
 * Formate une date en français long, fuseau Africa/Brazzaville.
 * Exemple : « samedi 7 novembre 2026 ».
 */
export function formaterDateFr(date: Date = new Date()): string {
  return formateurDateLong.format(date);
}

/**
 * Retourne la clé « AAAA-MM » du mois courant dans le fuseau de référence.
 */
export function cleMoisCourant(date: Date = new Date()): string {
  const parties = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: FUSEAU_HORAIRE,
  }).formatToParts(date);

  const annee = parties.find((p) => p.type === "year")?.value ?? "0000";
  const mois = parties.find((p) => p.type === "month")?.value ?? "01";

  return `${annee}-${mois}`;
}

/**
 * Décale une clé « AAAA-MM » de `decalage` mois (négatif = passé).
 */
export function decalerCleMois(cle: string, decalage: number): string {
  const [annee, mois] = cle.split("-").map(Number);
  const date = new Date(Date.UTC(annee, mois - 1 + decalage, 1));

  const a = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${a}-${m}`;
}

/**
 * Libellé court d'un mois à partir de sa clé « AAAA-MM » (ex. « nov. »).
 */
export function libelleMois(cle: string): string {
  const [annee, mois] = cle.split("-").map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, 1));

  return formateurMoisCourt.format(date).replace(".", "");
}
