/**
 * Téléphones du Congo-Brazzaville — une seule règle partout dans
 * l'application : l'utilisateur tape uniquement le numéro local
 * (ex. « 06 123 45 67 ») et l'indicatif +242 est ajouté par l'application,
 * jamais demandé à la saisie.
 *
 * Les numéros congolais comptent 9 chiffres et commencent par 0
 * (06… pour Airtel/Moi, 05…, 04… selon l'opérateur).
 */

/** Indicatif officiel du Congo-Brazzaville, préfixé automatiquement. */
export const INDICATIF_TELEPHONE = "+242";

/** Nombre de chiffres d'un numéro local congolais. */
export const CHIFFRES_ATTENDUS = 9;

/**
 * Garde uniquement les chiffres de la saisie, retire un indicatif « 242 »
 * éventuel (si l'utilisateur colle un numéro complet) et borne à 9 chiffres.
 * Ex. « +242 06 123 45 67 » → « 061234567 » ; « 06123 » → « 06123 ».
 */
export function chiffresLocaux(valeur: string): string {
  let chiffres = valeur.replace(/\D/g, "");
  if (chiffres.startsWith("242")) {
    chiffres = chiffres.slice(3);
  }
  return chiffres.slice(0, CHIFFRES_ATTENDUS);
}

/**
 * Regroupe les chiffres locaux en 2-3-2-2 pendant la frappe :
 * « 061234567 » → « 06 123 45 67 » ; « 06123 » → « 06 123 ».
 */
export function formaterTelephoneLocal(valeur: string): string {
  const chiffres = chiffresLocaux(valeur);
  const morceaux = [
    chiffres.slice(0, 2),
    chiffres.slice(2, 5),
    chiffres.slice(5, 7),
    chiffres.slice(7, CHIFFRES_ATTENDUS),
  ].filter((morceau) => morceau !== "");
  return morceaux.join(" ");
}

/** Vrai quand la saisie forme un numéro local complet (9 chiffres). */
export function estTelephoneComplet(valeur: string): boolean {
  return chiffresLocaux(valeur).length === CHIFFRES_ATTENDUS;
}

/**
 * Valeur à enregistrer en base : « +242 06 123 45 67 ».
 * Renvoie null si rien n'a été saisi ; le caller vérifie d'abord
 * `estTelephoneComplet` avant d'enregistrer.
 */
export function telephoneCompose(valeur: string): string | null {
  const local = formaterTelephoneLocal(valeur);
  return local === "" ? null : `${INDICATIF_TELEPHONE} ${local}`;
}
