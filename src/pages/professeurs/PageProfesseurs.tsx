import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuArchive,
  LuArchiveRestore,
  LuPhone,
  LuPencil,
  LuSearch,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import { servicesOrganisationScolaire } from "../../services/organisation-scolaire";
import {
  servicesPedagogiques,
  type Professeur,
} from "../../services/pedagogie";
import {
  chiffresLocaux,
  estTelephoneComplet,
  formaterTelephoneLocal,
  telephoneCompose,
} from "../../utils/telephone";
import {
  Bouton,
  Champ,
  ChampTexte,
  ListeDeroulante,
  MessageErreur,
  lienDangerCls,
} from "../configuration/composants";
import { INDICATIF_TELEPHONE, cx } from "../configuration/donnees";

/**
 * Page « Professeurs » — le référentiel de l'équipe enseignante (migration
 * 021). Même gabarit que la page Élèves : en-tête compact, un seul bouton
 * primaire, recherche, tableau et panneau latéral de saisie.
 *
 * Points d'honnêteté, comme partout :
 * - « Archiver » n'efface jamais rien : un professeur qui quitte l'école
 *   sort de la liste active, sa fiche reste conservée dans la base (la
 *   base refuse physiquement une suppression) ;
 * - la spécialité se saisit en texte libre pour l'instant ; le lien
 *   structuré professeur ↔ matière ↔ classe arrive avec le module
 *   Notes & Bulletins (tables ENSEIGNEMENT et AFFECTATION_ENSEIGNANT du
 *   modèle de données) ;
 * - le téléphone se saisit en numéro local (06…) : l'indicatif +242 est
 *   ajouté par l'application, jamais tapé.
 */

interface FormulaireProfesseur {
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  specialite: string;
}

const FORMULAIRE_VIDE: FormulaireProfesseur = {
  nom: "",
  prenoms: "",
  telephone: "",
  email: "",
  specialite: "",
};

type Panneau =
  | { mode: "nouveau" }
  | { mode: "edition"; professeur: Professeur }
  | null;

/** Professeur dont l'archivage (jamais une suppression) est en confirmation. */
type ArchivageConfirme = { professeur: Professeur } | null;

function formulaireDepuisProfesseur(professeur: Professeur): FormulaireProfesseur {
  return {
    nom: professeur.nom ?? "",
    prenoms: professeur.prenoms ?? "",
    // Un numéro stocké avec son indicatif est re-présenté en numéro local.
    telephone: formaterTelephoneLocal(professeur.telephone ?? ""),
    email: professeur.email ?? "",
    specialite: professeur.specialite ?? "",
  };
}

function initiales(prenoms: string | null, nom: string): string {
  return `${(prenoms ?? "?").charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function PageProfesseurs() {
  const [chargement, setChargement] = useState(true);
  const [ecoleAbsente, setEcoleAbsente] = useState(false);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [idEtablissement, setIdEtablissement] = useState<string | null>(null);
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");

  const [panneau, setPanneau] = useState<Panneau>(null);
  const [formulaire, setFormulaire] = useState<FormulaireProfesseur>(FORMULAIRE_VIDE);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Archivage : une fenêtre de confirmation explique ce qui va se passer.
  const [archivage, setArchivage] = useState<ArchivageConfirme>(null);
  const [archivageEnCours, setArchivageEnCours] = useState(false);

  const recharger = useCallback(async (idEtab: string) => {
    const lignes =
      await servicesPedagogiques.professeurs.listerParEtablissement(idEtab);
    setProfesseurs(lignes);
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreurChargement(null);
    setEcoleAbsente(false);
    try {
      const etablissements =
        await servicesOrganisationScolaire.etablissements.lister();
      const etab = etablissements[0] ?? null;
      if (!etab) {
        setEcoleAbsente(true);
        return;
      }
      setIdEtablissement(etab.id_etablissement);
      await recharger(etab.id_etablissement);
    } catch (error) {
      setErreurChargement(
        error instanceof Error
          ? error.message
          : "Impossible de charger la liste des professeurs.",
      );
    } finally {
      setChargement(false);
    }
  }, [recharger]);

  useEffect(() => {
    // Chargement différé d'un tick : évite d'appeler setState directement
    // dans l'effet (même patron que la page Élèves).
    const minuteur = window.setTimeout(() => {
      void charger();
    }, 0);
    return () => window.clearTimeout(minuteur);
  }, [charger]);

  const recherchePropre = recherche.trim().toLowerCase();
  const listeFiltree = useMemo(
    () =>
      professeurs.filter((professeur) => {
        if (filtreStatut === "actifs" && professeur.est_actif !== 1) {
          return false;
        }
        if (filtreStatut === "archives" && professeur.est_actif !== 0) {
          return false;
        }
        if (recherchePropre !== "") {
          const cle = [
            professeur.nom,
            professeur.prenoms,
            professeur.specialite,
            professeur.telephone,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!cle.includes(recherchePropre)) return false;
        }
        return true;
      }),
    [professeurs, filtreStatut, recherchePropre],
  );

  const statistiques = useMemo(
    () => ({
      total: professeurs.length,
      actifs: professeurs.filter((p) => p.est_actif === 1).length,
      archives: professeurs.filter((p) => p.est_actif === 0).length,
    }),
    [professeurs],
  );

  const fermerMessages = () => {
    setErreur(null);
    setInfo(null);
  };

  const ouvrirNouveau = () => {
    fermerMessages();
    setArchivage(null);
    setFormulaire(FORMULAIRE_VIDE);
    setPanneau({ mode: "nouveau" });
  };

  const ouvrirEdition = (professeur: Professeur) => {
    fermerMessages();
    setArchivage(null);
    setFormulaire(formulaireDepuisProfesseur(professeur));
    setPanneau({ mode: "edition", professeur });
  };

  const fermerPanneau = () => {
    setPanneau(null);
    setErreur(null);
    setFormulaire(FORMULAIRE_VIDE);
  };

  const enregistrer = async () => {
    if (!idEtablissement || !panneau) return;
    setEnCours(true);
    fermerMessages();
    try {
      if (panneau.mode === "nouveau") {
        await servicesPedagogiques.professeurs.creer({
          id_etablissement: idEtablissement,
          nom: formulaire.nom,
          prenoms: formulaire.prenoms,
          telephone: telephoneCompose(formulaire.telephone),
          email: formulaire.email,
          specialite: formulaire.specialite,
        });
        setInfo("Professeur enregistré dans votre école.");
      } else {
        await servicesPedagogiques.professeurs.modifier({
          id_enseignant: panneau.professeur.id_enseignant,
          id_etablissement: idEtablissement,
          nom: formulaire.nom,
          prenoms: formulaire.prenoms,
          telephone: telephoneCompose(formulaire.telephone),
          email: formulaire.email,
          specialite: formulaire.specialite,
        });
        setInfo("Fiche mise à jour.");
      }
      setPanneau(null);
      setFormulaire(FORMULAIRE_VIDE);
      await recharger(idEtablissement);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "La fiche n'a pas pu être enregistrée.",
      );
    } finally {
      setEnCours(false);
    }
  };

  /** « Archiver » : ouvre la fenêtre de confirmation. Rien n'est écrit
   *  tant que le directeur n'a pas confirmé dans cette fenêtre. */
  const ouvrirArchivage = (professeur: Professeur) => {
    fermerMessages();
    setPanneau(null);
    setArchivage({ professeur });
  };

  const confirmerArchivage = async () => {
    if (!archivage || !idEtablissement) return;
    const professeur = archivage.professeur;
    setArchivageEnCours(true);
    fermerMessages();
    try {
      await servicesPedagogiques.professeurs.archiver(
        professeur.id_enseignant,
        idEtablissement,
      );
      setArchivage(null);
      setInfo(
        `${professeur.nom.toUpperCase()} ${professeur.prenoms ?? ""} archivé. Rien n'a été effacé : la fiche reste conservée dans la base de l'école, il sort de la liste active.`,
      );
      await recharger(idEtablissement);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "L'archivage n'a pas pu être effectué.",
      );
    } finally {
      setArchivageEnCours(false);
    }
  };

  /** Réactiver est une action sans risque : directe, avec un message. */
  const reactiver = async (professeur: Professeur) => {
    if (!idEtablissement) return;
    fermerMessages();
    try {
      await servicesPedagogiques.professeurs.reactiver(
        professeur.id_enseignant,
        idEtablissement,
      );
      setInfo(
        `${professeur.nom.toUpperCase()} ${professeur.prenoms ?? ""} est de retour dans la liste active.`,
      );
      await recharger(idEtablissement);
    } catch (error) {
      setErreur(
        error instanceof Error ? error.message : "La réactivation a échoué.",
      );
    }
  };

  const peutEnregistrer =
    formulaire.nom.trim() !== "" &&
    (formulaire.telephone === "" ||
      estTelephoneComplet(formulaire.telephone)) &&
    (formulaire.email.trim() === "" ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulaire.email.trim()));

  /** Aide à la saisie du téléphone : numéro local, indicatif automatique. */
  const chiffresTelephone = chiffresLocaux(formulaire.telephone);
  const hintTelephone =
    formulaire.telephone === ""
      ? "Numéro local uniquement : l'indicatif +242 est ajouté tout seul."
      : estTelephoneComplet(formulaire.telephone)
        ? "Numéro complet — enregistré avec l'indicatif +242."
        : `Numéro incomplet : ${chiffresTelephone.length}/9 chiffres.`;

  return (
    <div className="mx-auto max-w-7xl space-y-4 pt-2">
      {/* En-tête compact : titre à gauche, le bouton principal à droite. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">
            Gestion des professeurs
          </h1>
          <p className="mt-0.5 text-[13px] text-stone-500">
            Tenez à jour le référentiel de votre équipe enseignante.
          </p>
        </div>
        <div className="w-fit">
          <Bouton
            variante="principal"
            icone={LuUserPlus}
            onClick={ouvrirNouveau}
            disabled={ecoleAbsente || chargement}
          >
            Ajouter un professeur
          </Bouton>
        </div>
      </div>

      {/* Cartes du haut — comptées depuis la base, rien d'estimé. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#2d8a6b]">
              <LuUsers size={18} aria-hidden="true" />
            </span>
            <h2 className="text-[13px] font-medium text-stone-500">
              Total professeurs
            </h2>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-stone-900">
            {statistiques.total}
            <span className="ml-1.5 text-xs font-medium text-stone-400">
              fiche{statistiques.total > 1 ? "s" : ""}
            </span>
          </p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#2d8a6b]">
              <LuUserPlus size={18} aria-hidden="true" />
            </span>
            <h2 className="text-[13px] font-medium text-stone-500">
              En activité
            </h2>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-stone-900">
            {statistiques.actifs}
            <span className="ml-1.5 text-xs font-medium text-stone-400">
              professeur{statistiques.actifs > 1 ? "s" : ""}
            </span>
          </p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#2d8a6b]">
              <LuArchive size={18} aria-hidden="true" />
            </span>
            <h2 className="text-[13px] font-medium text-stone-500">
              Archivés
            </h2>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-stone-900">
            {statistiques.archives}
            <span className="ml-1.5 text-xs font-medium text-stone-400">
              conservé{statistiques.archives > 1 ? "s" : ""} en base
            </span>
          </p>
        </article>
      </div>

      {info ? (
        <p
          className="rounded-[10px] bg-emerald-50 px-3.5 py-2.5 text-[13.5px] text-emerald-800"
          role="status"
        >
          {info}
        </p>
      ) : null}
      {erreurChargement ? (
        <MessageErreur>{erreurChargement}</MessageErreur>
      ) : null}
      {erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

      {ecoleAbsente ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-stone-600">
            Aucune école n'est encore créée sur cet appareil. Le parcours de
            configuration crée l'école — ensuite cette page accueille votre
            équipe enseignante.
          </p>
          <Link
            to="/configuration"
            className="mt-4 inline-flex items-center justify-center rounded-[10px] bg-[#2d8a6b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#247a5d]"
          >
            Ouvrir le parcours de configuration
          </Link>
        </div>
      ) : null}

      {!ecoleAbsente ? (
        <>
          {/* Recherche et filtre statut. */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="relative min-w-[220px] flex-1">
              <LuSearch
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
              />
              <ChampTexte
                className="pl-10"
                placeholder="Rechercher un nom, une spécialité ou un numéro…"
                value={recherche}
                onChange={(evenement) => setRecherche(evenement.target.value)}
                aria-label="Rechercher un professeur"
              />
            </div>
            <div className="w-full sm:w-48">
              <ListeDeroulante
                value={filtreStatut}
                onChange={(evenement) =>
                  setFiltreStatut(evenement.target.value)
                }
                options={[
                  { valeur: "tous", libelle: "Tous statuts" },
                  { valeur: "actifs", libelle: "En activité" },
                  { valeur: "archives", libelle: "Archivés" },
                ]}
                aria-label="Filtrer par statut"
              />
            </div>
          </div>

          <div
            className={
              panneau
                ? "grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"
                : ""
            }
          >
            {/* Tableau des professeurs */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {chargement ? (
                <p className="p-8 text-center text-sm text-stone-500">
                  Chargement des professeurs…
                </p>
              ) : listeFiltree.length === 0 ? (
                <div className="p-8 text-center">
                  {professeurs.length === 0 ? (
                    <>
                      <p className="text-sm font-semibold text-stone-700">
                        Aucun professeur pour l'instant.
                      </p>
                      <p className="mt-1 text-[13px] text-stone-500">
                        Ajoutez votre premier professeur avec le bouton
                        « Ajouter un professeur » — rien n'est obligatoire
                        pour démarrer.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-stone-500">
                      Aucun professeur ne correspond à la recherche ou au
                      filtre.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Professeur
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Téléphone
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Spécialité
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Statut
                        </th>
                        <th scope="col" className="px-4 py-2.5">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {listeFiltree.map((professeur) => (
                        <tr
                          key={professeur.id_enseignant}
                          className="transition-colors hover:bg-stone-50/70"
                        >
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2.5">
                              <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-stone-100 text-[11px] font-bold uppercase text-stone-500">
                                {initiales(professeur.prenoms, professeur.nom)}
                              </span>
                              <span className="font-medium text-stone-900">
                                {professeur.nom.toUpperCase()}{" "}
                                {professeur.prenoms ?? ""}
                              </span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-stone-700">
                            {professeur.telephone ?? (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {professeur.specialite ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">
                                {professeur.specialite}
                              </span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {professeur.est_actif === 1 ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                En activité
                              </span>
                            ) : (
                              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
                                Archivé
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => ouvrirEdition(professeur)}
                                className="inline-flex items-center gap-1 rounded p-1 text-[12.5px] text-stone-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]"
                                aria-label={`Modifier la fiche de ${professeur.nom} ${professeur.prenoms ?? ""}`}
                              >
                                <LuPencil size={14} aria-hidden="true" />
                                Modifier
                              </button>
                              {professeur.est_actif === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => ouvrirArchivage(professeur)}
                                  className={cx(lienDangerCls, "shrink-0")}
                                  aria-label={`Archiver ${professeur.nom} ${professeur.prenoms ?? ""}`}
                                >
                                  <LuArchive size={14} aria-hidden="true" />
                                  Archiver
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void reactiver(professeur)}
                                  className="inline-flex items-center gap-1 rounded p-1 text-[12.5px] text-stone-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]"
                                  aria-label={`Réactiver ${professeur.nom} ${professeur.prenoms ?? ""}`}
                                >
                                  <LuArchiveRestore size={14} aria-hidden="true" />
                                  Réactiver
                                </button>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Compteur en bas, comme la page Élèves. */}
              <p className="border-t border-stone-100 px-4 py-2.5 text-center text-[12.5px] text-stone-500">
                Affiche {listeFiltree.length} professeur
                {listeFiltree.length > 1 ? "s" : ""} sur {professeurs.length}
              </p>
            </div>

            {/* Panneau d'ajout / de correction */}
            {panneau ? (
              <aside className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
                <h2 className="text-sm font-semibold text-stone-900">
                  {panneau.mode === "edition"
                    ? "Modifier la fiche"
                    : "Nouveau professeur"}
                </h2>

                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-3.5 sm:flex-row">
                    <Champ label="Nom">
                      <ChampTexte
                        value={formulaire.nom}
                        onChange={(evenement) =>
                          setFormulaire({
                            ...formulaire,
                            nom: evenement.target.value,
                          })
                        }
                      />
                    </Champ>
                    <Champ label="Prénoms">
                      <ChampTexte
                        value={formulaire.prenoms}
                        onChange={(evenement) =>
                          setFormulaire({
                            ...formulaire,
                            prenoms: evenement.target.value,
                          })
                        }
                      />
                    </Champ>
                  </div>

                  <Champ label="Téléphone" hint={hintTelephone}>
                    <div className="flex gap-2">
                      {/* Indicatif du Congo-Brazzaville, affiché une fois
                          pour toutes : l'utilisateur ne tape que le numéro
                          local (06…), comme sur la page Élèves. */}
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-stone-100 px-3 text-sm text-stone-500">
                        <LuPhone size={14} aria-hidden="true" />
                        {INDICATIF_TELEPHONE}
                      </span>
                      <ChampTexte
                        inputMode="tel"
                        value={formulaire.telephone}
                        onChange={(evenement) =>
                          setFormulaire({
                            ...formulaire,
                            telephone: formaterTelephoneLocal(
                              evenement.target.value,
                            ),
                          })
                        }
                        placeholder="06 123 45 67"
                      />
                    </div>
                  </Champ>

                  <Champ label="E-mail (facultatif)">
                    <ChampTexte
                      type="email"
                      value={formulaire.email}
                      onChange={(evenement) =>
                        setFormulaire({
                          ...formulaire,
                          email: evenement.target.value,
                        })
                      }
                      placeholder="professeur@exemple.cg"
                    />
                  </Champ>

                  <Champ
                    label="Spécialité (facultatif)"
                    hint="Texte libre pour l'instant — le lien matière par classe arrivera avec les notes."
                  >
                    <ChampTexte
                      value={formulaire.specialite}
                      onChange={(evenement) =>
                        setFormulaire({
                          ...formulaire,
                          specialite: evenement.target.value,
                        })
                      }
                      placeholder="Mathématiques, Français…"
                    />
                  </Champ>
                </div>

                <div className="flex flex-col gap-2">
                  <Bouton
                    variante="principal"
                    enCours={enCours}
                    onClick={() => void enregistrer()}
                    disabled={!peutEnregistrer}
                  >
                    Enregistrer
                  </Bouton>
                  <Bouton variante="fantome" onClick={fermerPanneau}>
                    Annuler
                  </Bouton>
                </div>
              </aside>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Fenêtre de confirmation de « Archiver » : elle dit exactement ce
          qui va se passer et rien n'est écrit tant qu'elle n'est pas
          confirmée. La réactivation, sans risque, n'en a pas besoin. */}
      {archivage ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-archivage"
          onClick={() => setArchivage(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(evenement) => evenement.stopPropagation()}
          >
            <h2
              id="titre-archivage"
              className="text-base font-bold text-stone-900"
            >
              Archiver {archivage.professeur.nom.toUpperCase()}{" "}
              {archivage.professeur.prenoms ?? ""} ?
            </h2>
            <p className="mt-2 text-[13.5px] text-stone-600">
              Le professeur quitte la liste active de l'école dès la
              confirmation.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-stone-600">
              <li>
                Rien n'est effacé : nom, prénoms, téléphone et spécialité
                restent conservés dans la base de votre école.
              </li>
              <li>
                Un professeur n'est jamais supprimé physiquement : c'est la
                règle d'or de l'application, la base l'interdit elle-même.
              </li>
              <li>
                Le bouton « Réactiver » de sa ligne le remettra en liste
                active en un clic, avec sa fiche intacte.
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void confirmerArchivage()}
                disabled={archivageEnCours}
                className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-red-700 px-5 font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {archivageEnCours
                  ? "Archivage en cours…"
                  : "Oui, archiver ce professeur"}
              </button>
              <Bouton variante="fantome" onClick={() => setArchivage(null)}>
                Non, le garder
              </Bouton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
