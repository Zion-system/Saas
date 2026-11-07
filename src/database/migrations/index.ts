export interface Migration {
  version: number;
  name: string;
  sql: string;
}

import organisationScolaire from "./001-organisation-scolaire";
import cycleAnneeScolaire from "./002-cycle-annee-scolaire";
import catalogueFraisTarification from "./003-catalogue-frais-tarification";
import facturationCreances from "./004-facturation-creances";
import echeanciersReglements from "./005-echeanciers-reglements";
import encaissementsCreditsMobileMoney from "./006-encaissements-credits-mobile-money";
import gestionCaisse from "./007-gestion-caisse";
import creditsReservationsRemboursements from "./008-credits-reservations-remboursements";
import relancesBalanceAgee from "./009-relances-balance-agee";
import synchronisationOfflineFirst from "./010-synchronisation-offline-first";
import elevesResponsables from "./011-eleves-responsables";
import candidaturesPreinscriptions from "./012-candidatures-preinscriptions";
import inscriptionsAffectations from "./013-inscriptions-affectations";
import correction005EcheanciersReglements from "./014-correction-005-echeanciers-reglements";
import correction006EncaissementsCredits from "./015-correction-006-encaissements-credits";

/**
 * Registre chronologique des migrations SQLite.
 *
 * Règles :
 * - Une migration possède un numéro unique.
 * - Une migration déjà publiée ne doit jamais être modifiée.
 * - Toute évolution nécessite une nouvelle migration.
 */
export const migrations: Migration[] = [
  organisationScolaire,
  cycleAnneeScolaire,
  catalogueFraisTarification,
  facturationCreances,
  echeanciersReglements,
  encaissementsCreditsMobileMoney,
  gestionCaisse,
  creditsReservationsRemboursements,
  relancesBalanceAgee,
  synchronisationOfflineFirst,
  elevesResponsables,
  candidaturesPreinscriptions,
  inscriptionsAffectations,
  correction005EcheanciersReglements,
  correction006EncaissementsCredits,
];
