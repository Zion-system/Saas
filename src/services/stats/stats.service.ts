import type { SQLiteExecutor } from "../../database/local/sqlite.types";
import { sqliteWorkerExecutor } from "../../database/local/sqlite.executor";
import {
  cleMoisCourant,
  decalerCleMois,
  libelleMois,
} from "../../utils/date";

export interface MoisEncaissements {
  /** Clé « AAAA-MM » du mois. */
  cle: string;
  /** Libellé court du mois (ex. « nov. »). */
  libelle: string;
  /** Total encaissé sur le mois, en FCFA. */
  totalFcfa: number;
}

export interface TableauBordStats {
  nombreEleves: number;
  nombreClasses: number;
  /** Solde de caisse = entrées − sorties de mouvement_caisse (FCFA). */
  soldeTresorerieFcfa: number;
  /**
   * Total des impayés, ou `null` lorsque le calcul fiable n'est pas
   * disponible en lecture seule sur le schéma actuel.
   */
  impayesFcfa: number | null;
  /** Encaissements des 12 derniers mois (du plus ancien au plus récent). */
  encaissementsParMois: MoisEncaissements[];
  /** Total encaissé depuis l'origine (tous mois confondus). */
  totalEncaissementsFcfa: number;
}

const NOMBRE_MOIS_GRAPHIQUE = 12;

async function compter(
  database: SQLiteExecutor,
  sql: string,
): Promise<number> {
  const rows = await database.query(sql);
  const valeur = rows[0]?.total;

  return typeof valeur === "number" ? valeur : Number(valeur ?? 0);
}

/**
 * Construit la liste des 12 derniers mois (clés « AAAA-MM ») aboutissant
 * au mois courant, fuseau Africa/Brazzaville.
 */
function fenetreDouzeMois(): string[] {
  const courant = cleMoisCourant();
  const cles: string[] = [];

  for (let i = NOMBRE_MOIS_GRAPHIQUE - 1; i >= 0; i -= 1) {
    cles.push(decalerCleMois(courant, -i));
  }

  return cles;
}

/**
 * Service de statistiques du tableau de bord.
 *
 * STRICTEMENT en lecture seule : seules des requêtes SELECT sont émises.
 * Aucune écriture, aucune migration, aucune modification du schéma.
 *
 * Sources réelles utilisées :
 * - `eleve` : nombre d'élèves.
 * - `classe_annuelle` : nombre de classes.
 * - `mouvement_caisse` : solde de trésorerie (sens ENTREE/SORTIE,
 *   colonne `sens` corrigée par la migration 016) et encaissements
 *   mensuels (type_mouvement = 'ENCAISSEMENT', sens = 'ENTREE',
 *   regroupés sur `date_mouvement`).
 * - `encaissement` ne porte pas de date : la répartition mensuelle
 *   s'appuie donc sur le journal de caisse `mouvement_caisse`.
 * - Impayés : aucune requête fiable n'est possible sans inventer une
 *   règle métier (affectations multi-cibles créance/échéance,
 *   contrepassations) → `null`, affiché « — » côté interface.
 */
export function creerServiceStats(database: SQLiteExecutor) {
  return {
    async nombreEleves(): Promise<number> {
      return compter(database, "SELECT COUNT(*) AS total FROM eleve;");
    },

    async nombreClasses(): Promise<number> {
      return compter(
        database,
        "SELECT COUNT(*) AS total FROM classe_annuelle;",
      );
    },

    async soldeTresorerie(): Promise<number> {
      const rows = await database.query(
        `SELECT COALESCE(SUM(
           CASE WHEN sens = 'ENTREE' THEN montant_fcfa ELSE -montant_fcfa END
         ), 0) AS solde
         FROM mouvement_caisse;`,
      );

      const solde = rows[0]?.solde;

      return typeof solde === "number" ? solde : Number(solde ?? 0);
    },

    /**
     * Impayés : retourne `null` — le calcul fiable exige les règles
     * d'affectation/contrepassation du module facturation (non encore
     * implémentées). Jamais de valeur inventée.
     */
    impayes(): Promise<number | null> {
      return Promise.resolve(null);
    },

    async encaissementsParMois(): Promise<MoisEncaissements[]> {
      const rows = await database.query(
        `SELECT strftime('%Y-%m', date_mouvement) AS mois,
                SUM(montant_fcfa) AS total
         FROM mouvement_caisse
         WHERE type_mouvement = 'ENCAISSEMENT' AND sens = 'ENTREE'
         GROUP BY mois;`,
      );

      const parMois = new Map<string, number>();

      for (const row of rows) {
        const cle = String(row.mois ?? "");
        const total = Number(row.total ?? 0);

        if (cle) {
          parMois.set(cle, (parMois.get(cle) ?? 0) + total);
        }
      }

      return fenetreDouzeMois().map((cle) => ({
        cle,
        libelle: libelleMois(cle),
        totalFcfa: parMois.get(cle) ?? 0,
      }));
    },

    async totalEncaissements(): Promise<number> {
      const rows = await database.query(
        `SELECT COALESCE(SUM(montant_fcfa), 0) AS total
         FROM mouvement_caisse
         WHERE type_mouvement = 'ENCAISSEMENT' AND sens = 'ENTREE';`,
      );

      const total = rows[0]?.total;

      return typeof total === "number" ? total : Number(total ?? 0);
    },

    /** Charge l'ensemble des statistiques du tableau de bord. */
    async chargerTableauBord(): Promise<TableauBordStats> {
      const [
        nombreEleves,
        nombreClasses,
        soldeTresorerieFcfa,
        impayesFcfa,
        encaissementsParMois,
        totalEncaissementsFcfa,
      ] = await Promise.all([
        this.nombreEleves(),
        this.nombreClasses(),
        this.soldeTresorerie(),
        this.impayes(),
        this.encaissementsParMois(),
        this.totalEncaissements(),
      ]);

      return {
        nombreEleves,
        nombreClasses,
        soldeTresorerieFcfa,
        impayesFcfa,
        encaissementsParMois,
        totalEncaissementsFcfa,
      };
    },
  };
}

export type ServiceStats = ReturnType<typeof creerServiceStats>;

/** Instance applicative branchée sur le worker SQLite local. */
export const statsService: ServiceStats = creerServiceStats(
  sqliteWorkerExecutor,
);
