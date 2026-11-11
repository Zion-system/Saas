import type { Migration } from "./index";

/**
 * Migration 018 — Informations lisibles de l'école et de l'année scolaire.
 *
 * Jusqu'ici les tables ne portaient que des identifiants techniques :
 * l'écran de configuration initiale (« Configuration initiale » en 6
 * étapes) collectait un nom d'école, un libellé d'année, des dates et un
 * découpage en périodes… que la base ne pouvait pas conserver.
 *
 * Ajout en colonnes (aucune table créée ni supprimée) :
 * - etablissement.nom        : le nom de l'école (ex. « École Les Palmiers ») ;
 * - annee_scolaire.libelle   : ex. « 2026-2027 » ;
 * - annee_scolaire.date_debut / date_fin : dates ISO (AAAA-MM-JJ) ;
 * - periode_pedagogique.libelle : ex. « 1er trimestre » ;
 * - periode_pedagogique.ordre   : rang d'affichage (1, 2, 3).
 */
const infosEcoleAnnee: Migration = {
  version: 18,
  name: "infos_ecole_annee",
  sql: `
    ALTER TABLE etablissement
      ADD COLUMN nom TEXT NOT NULL DEFAULT '';

    ALTER TABLE annee_scolaire
      ADD COLUMN libelle TEXT;

    ALTER TABLE annee_scolaire
      ADD COLUMN date_debut TEXT;

    ALTER TABLE annee_scolaire
      ADD COLUMN date_fin TEXT;

    ALTER TABLE periode_pedagogique
      ADD COLUMN libelle TEXT;

    ALTER TABLE periode_pedagogique
      ADD COLUMN ordre INTEGER;
  `,
};

export default infosEcoleAnnee;
