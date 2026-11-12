/**
 * Identifiant universel unique (UUID v4) pour les nouvelles lignes de base
 * (élèves, inscriptions, affectations, responsables, relations).
 *
 * `crypto.randomUUID` existe dans tout navigateur moderne ; la file de
 * sécurité ci-dessous couvre les environnements qui n'exposent pas
 * `crypto` (certains contextes de tests) sans jamais produire deux fois
 * le même identifiant dans une session.
 */
export function nouvelIdentifiant(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const octets = new Uint8Array(16);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(octets);
  } else {
    for (let i = 0; i < octets.length; i++) {
      octets[i] = Math.floor(Math.random() * 256);
    }
  }

  octets[6] = (octets[6] & 0x0f) | 0x40;
  octets[8] = (octets[8] & 0x3f) | 0x80;

  const hex = Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join(
    "",
  );

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
