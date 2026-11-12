import type {
  SQLiteExecutor,
  SQLiteRow,
  SQLiteStatement,
} from "../../database/local/sqlite.types";
import { cleJourCourant } from "../../utils/date";
import { nouvelIdentifiant } from "../../utils/identifiants";
import { ErreurMetierElevesResponsables } from "./errors";
import type { Genre } from "./types";

/**
 * Dossier élève du parcours de configuration (étape 4).
 *
 * « Enregistrer un élève » ne touche jamais qu'une seule ligne : la base
 * métier (docs/19) exige la chaîne complète :
 *   eleve (identité) → inscription (année scolaire, état CONFIRMEE)
 *     → affectation_classe (classe annuelle, facultative)
 *     → responsable + relation_eleve_responsable (parent déclaré,
 *       facultatif).
 *
 * Le service ci-dessous exécute toute la chaîne dans UNE transaction :
 * soit l'élève est créé en entier, soit rien n'est écrit — jamais de
 * dossier à moitié enregistré.
 */

export class DossierEleveInvalideError extends ErreurMetierElevesResponsables {
  constructor(message: string) {
    super("DOSSIER_ELEVE_INVALIDE", message);
    this.name = "DossierEleveInvalideError";
  }
}

export interface ParentDeclare {
  nom_complet: string;
  telephone: string | null;
}

export interface DonneesDossierEleve {
  id_etablissement: string;
  id_annee_scolaire: string;
  prenom: string;
  nom: string;
  genre: Genre | null;
  /** Classe annuelle choisie — absent ou null : élève sans classe pour l'instant. */
  id_classe_annuelle?: string | null;
  parent?: ParentDeclare | null;
}

export interface DossierEleve {
  id_eleve: string;
  prenom: string | null;
  nom: string | null;
  genre: Genre | null;
  etat_inscription: string | null;
  id_classe_annuelle: string | null;
  /** Matricule courant (porté par son historique) — null tant que le module
   * Inscriptions ne l'a pas attribué. */
  matricule?: string | null;
  /** Parent déclaré actif. La base permet plusieurs responsables actifs ;
   * pour l'instant un seul est géré par les écrans (le premier trouvé). */
  parent?: ParentDeclare | null;
}

export interface DonneesModificationEleve {
  id_eleve: string;
  id_etablissement: string;
  prenom: string;
  nom: string;
  genre: Genre | null;
  /** Classe visée — null : sans classe ; la base décide ce qui est appliqué
   * ce jour (voir `modifier`). */
  id_classe_annuelle?: string | null;
  /** Parent déclaré visé — null : sans parent ; mis à jour en place si un
   * responsable est déjà actif. */
  parent?: ParentDeclare | null;
}

/** Nature de lien par défaut pour le parent déclaré à l'étape 4. */
export const NATURE_LIEN_PARENT_DEFAUT =
  "01100000-0000-4000-8000-000000000003"; // TUTEUR

function textePropre(valeur: string): string {
  return valeur.trim().replace(/\s+/g, " ");
}

/** Colonnes du dossier enrichi, partagées entre la liste et les retours d'écriture. */
const COLONNES_DOSSIER = `
  e.id_eleve, e.prenom, e.nom, e.genre, e.matricule,
  i.etat_inscription, a.id_classe_annuelle,
  resp.nom_complet AS parent_nom, resp.telephone AS parent_telephone
`;

/** Jointures du dossier enrichi (inscription, classe courante, parent actif). */
const JOINTURES_DOSSIER = `
  LEFT JOIN inscription i
    ON i.id_eleve = e.id_eleve
   AND i.id_etablissement = e.id_etablissement
   AND i.etat_inscription != 'ANNULEE'
  LEFT JOIN affectation_classe a
    ON a.id_inscription = i.id_inscription
   AND a.id_etablissement = i.id_etablissement
   AND a.date_fin IS NULL
  LEFT JOIN relation_eleve_responsable rel
    ON rel.id_eleve = e.id_eleve
   AND rel.id_etablissement = e.id_etablissement
   AND rel.date_fin_validite IS NULL
  LEFT JOIN responsable resp
    ON resp.id_responsable = rel.id_responsable
   AND resp.id_etablissement = rel.id_etablissement
`;

function mapperDossier(ligne: SQLiteRow): DossierEleve {
  return {
    id_eleve: String(ligne.id_eleve),
    prenom: ligne.prenom === null ? null : String(ligne.prenom),
    nom: ligne.nom === null ? null : String(ligne.nom),
    genre:
      ligne.genre === null || ligne.genre === undefined
        ? null
        : (String(ligne.genre) as Genre),
    etat_inscription:
      ligne.etat_inscription === null || ligne.etat_inscription === undefined
        ? null
        : String(ligne.etat_inscription),
    id_classe_annuelle:
      ligne.id_classe_annuelle === null ||
      ligne.id_classe_annuelle === undefined
        ? null
        : String(ligne.id_classe_annuelle),
    matricule:
      ligne.matricule === null || ligne.matricule === undefined
        ? null
        : String(ligne.matricule),
    parent:
      ligne.parent_nom === null || ligne.parent_nom === undefined
        ? null
        : {
            nom_complet: String(ligne.parent_nom),
            telephone:
              ligne.parent_telephone === null ||
              ligne.parent_telephone === undefined
                ? null
                : String(ligne.parent_telephone),
          },
  };
}

export function creerServiceDossiersEleves(database: SQLiteExecutor) {
  function valider(donnees: DonneesDossierEleve): void {
    if (textePropre(donnees.prenom) === "") {
      throw new DossierEleveInvalideError("Le prénom de l'élève est obligatoire.");
    }
    if (textePropre(donnees.nom) === "") {
      throw new DossierEleveInvalideError("Le nom de l'élève est obligatoire.");
    }
    if (
      donnees.genre !== null &&
      donnees.genre !== "F" &&
      donnees.genre !== "M"
    ) {
      throw new DossierEleveInvalideError(
        "Le genre de l'élève doit être « F » ou « M ».",
      );
    }
    if (donnees.id_annee_scolaire.trim() === "") {
      throw new DossierEleveInvalideError(
        "L'inscription exige une année scolaire (créez d'abord votre école).",
      );
    }
  }

  return {
    /** Crée le dossier complet en une transaction atomique. */
    async creer(donnees: DonneesDossierEleve): Promise<DossierEleve> {
      valider(donnees);

      const jour = cleJourCourant();
      const idEleve = nouvelIdentifiant();
      const idInscription = nouvelIdentifiant();
      const prenom = textePropre(donnees.prenom);
      const nom = textePropre(donnees.nom);

      const operations: SQLiteStatement[] = [
        {
          sql: `INSERT INTO eleve (id_eleve, id_etablissement, prenom, nom, genre)
                VALUES (?, ?, ?, ?, ?);`,
          bind: [
            idEleve,
            donnees.id_etablissement,
            prenom,
            nom,
            donnees.genre,
          ],
        },
        {
          sql: `INSERT INTO inscription (
                  id_inscription, id_eleve, id_annee_scolaire,
                  id_etablissement, id_preinscription, etat_inscription
                )
                VALUES (?, ?, ?, ?, NULL, 'CONFIRMEE');`,
          bind: [
            idInscription,
            idEleve,
            donnees.id_annee_scolaire.trim(),
            donnees.id_etablissement,
          ],
        },
      ];

      if (donnees.id_classe_annuelle) {
        operations.push({
          sql: `INSERT INTO affectation_classe (
                  id_affectation_classe, id_inscription, id_classe_annuelle,
                  id_etablissement, date_debut, date_fin
                )
                VALUES (?, ?, ?, ?, ?, NULL);`,
          bind: [
            nouvelIdentifiant(),
            idInscription,
            donnees.id_classe_annuelle,
            donnees.id_etablissement,
            jour,
          ],
        });
      }

      if (donnees.parent) {
        const nomParent = textePropre(donnees.parent.nom_complet);
        if (nomParent !== "") {
          const idResponsable = nouvelIdentifiant();
          operations.push({
            sql: `INSERT INTO responsable (
                    id_responsable, id_etablissement, nom_complet, telephone
                  )
                  VALUES (?, ?, ?, ?);`,
            bind: [
              idResponsable,
              donnees.id_etablissement,
              nomParent,
              donnees.parent.telephone?.trim() || null,
            ],
          });
          operations.push({
            sql: `INSERT INTO relation_eleve_responsable (
                    id_relation_eleve_responsable, id_eleve, id_responsable,
                    id_etablissement, id_nature_lien,
                    est_representant_legal, est_responsable_financier,
                    date_debut_validite, date_fin_validite, id_auteur_creation
                  )
                  VALUES (?, ?, ?, ?, ?, 1, 1, ?, NULL, NULL);`,
            bind: [
              nouvelIdentifiant(),
              idEleve,
              idResponsable,
              donnees.id_etablissement,
              NATURE_LIEN_PARENT_DEFAUT,
              jour,
            ],
          });
        }
      }

      await database.transaction(operations);

      return {
        id_eleve: idEleve,
        prenom,
        nom,
        genre: donnees.genre,
        etat_inscription: "CONFIRMEE",
        id_classe_annuelle: donnees.id_classe_annuelle ?? null,
      };
    },

    /**
     * Annule l'inscription de l'élève (jamais une suppression : les
     * déclencheurs de la base l'interdisent). Le dossier reste en base,
     * invisible dans la liste courante.
     *
     * Affectation de classe : la base exige qu'une affectation dure au
     * moins un jour (date_fin > date_debut) et refuse de la supprimer.
     * Elle est donc clôturée si elle a commencé avant aujourd'hui ; une
     * affectation créée le jour même reste ouverte — l'état de
     * l'inscription (« ANNULEE ») fait foi pour les effectifs.
     */
    async annuler(idEleve: string, idEtablissement: string): Promise<void> {
      const jour = cleJourCourant();
      await database.transaction([
        {
          sql: `UPDATE affectation_classe
                SET date_fin = ?
                WHERE date_fin IS NULL
                  AND id_etablissement = ?
                  AND date_debut < ?
                  AND id_inscription IN (
                    SELECT id_inscription FROM inscription
                    WHERE id_eleve = ? AND id_etablissement = ?
                      AND etat_inscription != 'ANNULEE'
                  );`,
          bind: [jour, idEtablissement, jour, idEleve, idEtablissement],
        },
        {
          sql: `UPDATE inscription
                SET etat_inscription = 'ANNULEE'
                WHERE id_eleve = ? AND id_etablissement = ?
                  AND etat_inscription != 'ANNULEE';`,
          bind: [idEleve, idEtablissement],
        },
      ]);
    },

    /**
     * Corrige un dossier depuis la page Élèves : identité, classe visée,
     * parent déclaré. La base conserve l'historique (append-only) et exige
     * qu'une période dure au moins un jour — le service l'accepte et
     * repousse sans erreur ce qui ne peut pas être appliqué ce jour :
     *
     * - l'identité est toujours corrigée ;
     * - changement de classe : l'affectation commencée avant aujourd'hui
     *   est clôturée, la classe visée est ouverte du jour ; une affectation
     *   créée aujourd'hui ne peut être ni clôturée ni modifiée — elle reste
     *   en place et l'écran signale le report à demain ;
     * - parent : les coordonnées du responsable actif sont mises à jour en
     *   place ; sans responsable actif, un responsable et sa relation sont
     *   créés ; retirer le parent clôt la relation commencée avant
     *   aujourd'hui (une relation du jour reste en place).
     */
    async modifier(
      donnees: DonneesModificationEleve,
    ): Promise<DossierEleve> {
      if (textePropre(donnees.prenom) === "") {
        throw new DossierEleveInvalideError(
          "Le prénom de l'élève est obligatoire.",
        );
      }
      if (textePropre(donnees.nom) === "") {
        throw new DossierEleveInvalideError(
          "Le nom de l'élève est obligatoire.",
        );
      }
      if (
        donnees.genre !== null &&
        donnees.genre !== "F" &&
        donnees.genre !== "M"
      ) {
        throw new DossierEleveInvalideError(
          "Le genre de l'élève doit être « F » ou « M ».",
        );
      }

      const jour = cleJourCourant();
      const prenom = textePropre(donnees.prenom);
      const nom = textePropre(donnees.nom);
      const classeVisee = donnees.id_classe_annuelle?.trim() || null;
      const parentNom = textePropre(donnees.parent?.nom_complet ?? "");
      const parentVise =
        parentNom === ""
          ? null
          : {
              nom_complet: parentNom,
              telephone: donnees.parent?.telephone?.trim() || null,
            };

      const operations: SQLiteStatement[] = [
        {
          sql: `UPDATE eleve
                SET prenom = ?, nom = ?, genre = ?
                WHERE id_eleve = ? AND id_etablissement = ?;`,
          bind: [
            prenom,
            nom,
            donnees.genre,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        },
      ];

      if (classeVisee === null) {
        // Retirer la classe : clôture de l'affectation ouverte commencée
        // avant aujourd'hui (une affectation du jour reste en place — la
        // base exige une période d'au moins un jour, comme à l'annulation).
        operations.push({
          sql: `UPDATE affectation_classe
                SET date_fin = ?
                WHERE date_fin IS NULL AND date_debut < ?
                  AND id_etablissement = ?
                  AND id_inscription IN (
                    SELECT id_inscription FROM inscription
                    WHERE id_eleve = ? AND id_etablissement = ?
                      AND etat_inscription != 'ANNULEE'
                  );`,
          bind: [
            jour,
            jour,
            donnees.id_etablissement,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        });
      } else {
        // Changer de classe : clôture de l'affectation ouverte commencée
        // avant aujourd'hui si elle diffère de la classe visée…
        operations.push({
          sql: `UPDATE affectation_classe
                SET date_fin = ?
                WHERE date_fin IS NULL AND date_debut < ?
                  AND id_etablissement = ?
                  AND id_classe_annuelle IS NOT ?
                  AND id_inscription IN (
                    SELECT id_inscription FROM inscription
                    WHERE id_eleve = ? AND id_etablissement = ?
                      AND etat_inscription != 'ANNULEE'
                  );`,
          bind: [
            jour,
            jour,
            donnees.id_etablissement,
            classeVisee,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        });
        // … puis ouverture de la classe visée s'il ne reste aucune
        // affectation courante (élèves du jour et classe inchangée : rien).
        operations.push({
          sql: `INSERT INTO affectation_classe (
                  id_affectation_classe, id_inscription, id_classe_annuelle,
                  id_etablissement, date_debut, date_fin
                )
                SELECT ?, i.id_inscription, ?, i.id_etablissement, ?, NULL
                FROM inscription i
                WHERE i.id_eleve = ? AND i.id_etablissement = ?
                  AND i.etat_inscription != 'ANNULEE'
                  AND NOT EXISTS (
                    SELECT 1 FROM affectation_classe a
                    WHERE a.id_inscription = i.id_inscription
                      AND a.id_etablissement = i.id_etablissement
                      AND a.date_fin IS NULL
                  );`,
          bind: [
            nouvelIdentifiant(),
            classeVisee,
            jour,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        });
      }

      if (parentVise) {
        // a) Un responsable est déjà actif : ses coordonnées sont corrigées
        //    en place (un parent qui change de numéro, une faute de frappe).
        operations.push({
          sql: `UPDATE responsable
                SET nom_complet = ?, telephone = ?
                WHERE id_responsable = (
                  SELECT rel.id_responsable
                  FROM relation_eleve_responsable rel
                  WHERE rel.id_eleve = ? AND rel.id_etablissement = ?
                    AND rel.date_fin_validite IS NULL
                  ORDER BY rel.date_debut_validite DESC
                  LIMIT 1
                );`,
          bind: [
            parentVise.nom_complet,
            parentVise.telephone,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        });
        // b) Aucun responsable actif : création du responsable puis de la
        //    relation (les gardes NOT EXISTS rendent le couple idempotent).
        const idResponsable = nouvelIdentifiant();
        operations.push({
          sql: `INSERT INTO responsable (
                  id_responsable, id_etablissement, nom_complet, telephone
                )
                SELECT ?, ?, ?, ?
                WHERE NOT EXISTS (
                  SELECT 1 FROM relation_eleve_responsable
                  WHERE id_eleve = ? AND id_etablissement = ?
                    AND date_fin_validite IS NULL
                );`,
          bind: [
            idResponsable,
            donnees.id_etablissement,
            parentVise.nom_complet,
            parentVise.telephone,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        });
        operations.push({
          sql: `INSERT INTO relation_eleve_responsable (
                  id_relation_eleve_responsable, id_eleve, id_responsable,
                  id_etablissement, id_nature_lien,
                  est_representant_legal, est_responsable_financier,
                  date_debut_validite, date_fin_validite, id_auteur_creation
                )
                SELECT ?, ?, ?, ?, ?, 1, 1, ?, NULL, NULL
                WHERE NOT EXISTS (
                  SELECT 1 FROM relation_eleve_responsable
                  WHERE id_eleve = ? AND id_etablissement = ?
                    AND date_fin_validite IS NULL
                );`,
          bind: [
            nouvelIdentifiant(),
            donnees.id_eleve,
            idResponsable,
            donnees.id_etablissement,
            NATURE_LIEN_PARENT_DEFAUT,
            jour,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        });
      } else {
        // Retirer le parent : clôture de la relation active commencée avant
        // aujourd'hui (une relation du jour reste en place — la base exige
        // une période d'au moins un jour).
        operations.push({
          sql: `UPDATE relation_eleve_responsable
                SET date_fin_validite = ?
                WHERE date_fin_validite IS NULL AND date_debut_validite < ?
                  AND id_eleve = ? AND id_etablissement = ?;`,
          bind: [
            jour,
            jour,
            donnees.id_eleve,
            donnees.id_etablissement,
          ],
        });
      }

      await database.transaction(operations);

      // Le retour reflète la réalité de la base, pas seulement l'intention
      // de l'écran : ce qui a été repoussé à demain apparaît tel quel.
      const lignes = await database.query(
        `SELECT ${COLONNES_DOSSIER}
         FROM eleve e
         ${JOINTURES_DOSSIER}
         WHERE e.id_eleve = ? AND e.id_etablissement = ?
         GROUP BY e.id_eleve;`,
        [donnees.id_eleve, donnees.id_etablissement],
      );
      const dossier = lignes[0] ? mapperDossier(lignes[0]) : null;

      return (
        dossier ?? {
          id_eleve: donnees.id_eleve,
          prenom,
          nom,
          genre: donnees.genre,
          etat_inscription: null,
          id_classe_annuelle: classeVisee,
        }
      );
    },

    /**
     * Liste les dossiers visibles de l'établissement : les élèves sans
     * inscription (jamais inscrits) et les élèves dont l'inscription
     * courante n'est pas annulée. Les dossiers retirés disparaissent.
     */
    async listerParEtablissement(
      idEtablissement: string,
    ): Promise<DossierEleve[]> {
      const rows = await database.query(
        `SELECT ${COLONNES_DOSSIER}
         FROM eleve e
         ${JOINTURES_DOSSIER}
         WHERE e.id_etablissement = ?
           -- Un élève retiré (toutes inscriptions annulées) disparaît de
           -- la liste, mais son dossier reste conservé en base.
           AND NOT (
             EXISTS (
               SELECT 1 FROM inscription x
               WHERE x.id_eleve = e.id_eleve
                 AND x.id_etablissement = e.id_etablissement
             )
             AND NOT EXISTS (
               SELECT 1 FROM inscription y
               WHERE y.id_eleve = e.id_eleve
                 AND y.id_etablissement = e.id_etablissement
                 AND y.etat_inscription != 'ANNULEE'
             )
           )
         GROUP BY e.id_eleve
         ORDER BY e.nom COLLATE NOCASE, e.prenom COLLATE NOCASE;`,
        [idEtablissement],
      );

      return rows.map(mapperDossier);
    },
  };
}
