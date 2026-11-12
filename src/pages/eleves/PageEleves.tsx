import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuPhone,
  LuPencil,
  LuSearch,
  LuTrash2,
  LuUserPlus,
} from "react-icons/lu";
import {
  servicesElevesResponsables,
  type DossierEleve,
} from "../../services/eleves-responsables";
import { servicesOrganisationScolaire } from "../../services/organisation-scolaire";
import { normaliserComparaison } from "../../utils/import-eleves";
import {
  Bouton,
  Champ,
  ChampTexte,
  ListeDeroulante,
  MessageErreur,
  lienDangerCls,
} from "../configuration/composants";
import {
  INDICATIF_TELEPHONE,
  construireCatalogueLibelles,
  cx,
} from "../configuration/donnees";

/**
 * Page « Élèves » (menu latéral) — fidèle à l'esprit de la maquette vidéo :
 * « Chaque élève, un dossier clair. » Un tableau lisible (matricule, élève,
 * sexe, classe, statut), la recherche et le filtre par classe, et à droite
 * le panneau d'ajout ou de correction du dossier.
 *
 * Toutes les écritures passent par le service des dossiers, qui respecte
 * l'historique de la base : ce qui ne peut pas être appliqué ce jour
 * (affectation du jour) est repoussé à demain et signalé honnêtement.
 */

interface FormulaireEleve {
  prenom: string;
  nom: string;
  sexe: string;
  classe: string;
  parent: string;
  telephone: string;
}

const FORMULAIRE_VIDE: FormulaireEleve = {
  prenom: "",
  nom: "",
  sexe: "",
  classe: "",
  parent: "",
  telephone: "",
};

type Panneau =
  | { mode: "nouveau" }
  | { mode: "edition"; dossier: DossierEleve }
  | null;

function formulaireDepuisDossier(dossier: DossierEleve): FormulaireEleve {
  return {
    prenom: dossier.prenom ?? "",
    nom: dossier.nom ?? "",
    sexe: dossier.genre ?? "",
    classe: dossier.id_classe_annuelle ?? "",
    parent: dossier.parent?.nom_complet ?? "",
    telephone: dossier.parent?.telephone ?? "",
  };
}

function initiales(prenom: string | null, nom: string | null): string {
  return `${(prenom ?? "?").charAt(0)}${(nom ?? "?").charAt(0)}`.toUpperCase();
}

export function PageEleves() {
  const [chargement, setChargement] = useState(true);
  const [ecoleAbsente, setEcoleAbsente] = useState(false);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [idEtablissement, setIdEtablissement] = useState<string | null>(null);
  const [idAnnee, setIdAnnee] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; libelle: string }[]>([]);
  const [dossiers, setDossiers] = useState<DossierEleve[]>([]);

  const [recherche, setRecherche] = useState("");
  const [filtreClasse, setFiltreClasse] = useState("toutes");

  const [panneau, setPanneau] = useState<Panneau>(null);
  const [formulaire, setFormulaire] = useState<FormulaireEleve>(FORMULAIRE_VIDE);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [retraitAConfirmer, setRetraitAConfirmer] = useState<string | null>(
    null,
  );

  const recharger = useCallback(async (idEtab: string) => {
    const dossiersRows =
      await servicesElevesResponsables.dossiers.listerParEtablissement(idEtab);
    setDossiers(dossiersRows);
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

      const annees =
        await servicesOrganisationScolaire.anneesScolaires.listerParEtablissement(
          etab.id_etablissement,
        );
      const annee = annees[0] ?? null;
      if (!annee) {
        setEcoleAbsente(true);
        return;
      }
      setIdAnnee(annee.id_annee_scolaire);

      const [classesRows, dossiersRows, modelesRows] = await Promise.all([
        servicesOrganisationScolaire.classesAnnuelles.listerParAnnee(
          annee.id_annee_scolaire,
          etab.id_etablissement,
        ),
        servicesElevesResponsables.dossiers.listerParEtablissement(
          etab.id_etablissement,
        ),
        servicesOrganisationScolaire.modelesClasse.lister(),
      ]);

      // Libellés des classes : libellé conservé en base d'abord (migration
      // 020 — une classe « autre » saisie à la main retrouve son nom),
      // catalogue officiel ensuite, identifiant technique en dernier repli.
      const catalogue = construireCatalogueLibelles([]);
      const libelles = new Map<string, string>();
      for (const modele of modelesRows) {
        const libelle =
          modele.libelle ?? catalogue.get(modele.id_modele_classe) ?? null;
        if (libelle) {
          libelles.set(modele.id_modele_classe, libelle);
        }
      }
      setClasses(
        classesRows.map((classe) => ({
          id: classe.id_classe_annuelle,
          libelle: libelles.get(classe.id_classe_annuelle) ?? classe.id_classe_annuelle,
        })),
      );
      setDossiers(dossiersRows);
    } catch (error) {
      setErreurChargement(
        error instanceof Error
          ? error.message
          : "Impossible de charger la liste des élèves.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    // Chargement différé d'un tick : évite d'appeler setState directement
    // dans l'effet (rendu en cascade), même patron que la configuration.
    const minuteur = window.setTimeout(() => {
      void charger();
    }, 0);
    return () => window.clearTimeout(minuteur);
  }, [charger]);

  const recherchePropre = normaliserComparaison(recherche);
  const listeFiltree = useMemo(
    () =>
      dossiers.filter((dossier) => {
        if (
          filtreClasse !== "toutes" &&
          (dossier.id_classe_annuelle ?? "") !== filtreClasse
        ) {
          return false;
        }
        if (recherchePropre !== "") {
          const cle = normaliserComparaison(
            `${dossier.prenom ?? ""} ${dossier.nom ?? ""}`,
          );
          if (!cle.includes(recherchePropre)) return false;
        }
        return true;
      }),
    [dossiers, filtreClasse, recherchePropre],
  );

  const ouvrirNouveau = () => {
    setErreur(null);
    setInfo(null);
    setRetraitAConfirmer(null);
    setFormulaire(FORMULAIRE_VIDE);
    setPanneau({ mode: "nouveau" });
  };

  const ouvrirEdition = (dossier: DossierEleve) => {
    setErreur(null);
    setInfo(null);
    setRetraitAConfirmer(null);
    setFormulaire(formulaireDepuisDossier(dossier));
    setPanneau({ mode: "edition", dossier });
  };

  const fermerPanneau = () => {
    setPanneau(null);
    setErreur(null);
    setFormulaire(FORMULAIRE_VIDE);
  };

  const enregistrer = async () => {
    if (!idEtablissement || !idAnnee || !panneau) return;
    setEnCours(true);
    setErreur(null);
    setInfo(null);
    try {
      const genre =
        formulaire.sexe === "F" || formulaire.sexe === "M"
          ? formulaire.sexe
          : null;
      const classeVisee = formulaire.classe || null;
      const parentVise =
        formulaire.parent.trim() === ""
          ? null
          : {
              nom_complet: formulaire.parent,
              telephone: formulaire.telephone.trim() || null,
            };

      if (panneau.mode === "nouveau") {
        await servicesElevesResponsables.dossiers.creer({
          id_etablissement: idEtablissement,
          id_annee_scolaire: idAnnee,
          prenom: formulaire.prenom,
          nom: formulaire.nom,
          genre,
          id_classe_annuelle: classeVisee,
          parent: parentVise,
        });
        setInfo("Élève enregistré dans votre école.");
      } else {
        const modifie = await servicesElevesResponsables.dossiers.modifier({
          id_eleve: panneau.dossier.id_eleve,
          id_etablissement: idEtablissement,
          prenom: formulaire.prenom,
          nom: formulaire.nom,
          genre,
          id_classe_annuelle: classeVisee,
          parent: parentVise,
        });

        // Honnêteté : la base conserve chaque affectation (et chaque
        // relation) au moins un jour. Si ce qui est visé ne correspond pas
        // à ce qui est en base, c'est un report à demain, on le dit.
        const classeAppliquee =
          (modifie.id_classe_annuelle ?? "") === (classeVisee ?? "");
        const parentApplique =
          (modifie.parent?.nom_complet ?? "") ===
          (parentVise?.nom_complet ?? "");
        if (!classeAppliquee || !parentApplique) {
          setInfo(
            "Corrections enregistrées. La base conserve chaque affectation au moins un jour : le changement visé ce jour prendra effet à partir de demain.",
          );
        } else {
          setInfo("Dossier mis à jour.");
        }
      }

      setPanneau(null);
      setFormulaire(FORMULAIRE_VIDE);
      await recharger(idEtablissement);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Le dossier n'a pas pu être enregistré.",
      );
    } finally {
      setEnCours(false);
    }
  };

  const retirer = async (dossier: DossierEleve) => {
    if (!idEtablissement) return;
    if (retraitAConfirmer !== dossier.id_eleve) {
      setRetraitAConfirmer(dossier.id_eleve);
      return;
    }
    setRetraitAConfirmer(null);
    setErreur(null);
    setInfo(null);
    try {
      await servicesElevesResponsables.dossiers.annuler(
        dossier.id_eleve,
        idEtablissement,
      );
      setInfo(
        "Inscription annulée : le dossier reste conservé en base, il disparaît de la liste.",
      );
      await recharger(idEtablissement);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Le retrait n'a pas pu être effectué.",
      );
    }
  };

  const peutEnregistrer =
    formulaire.prenom.trim() !== "" && formulaire.nom.trim() !== "";

  const optionsClasse = [
    { valeur: "", libelle: "Sans classe pour l'instant" },
    ...classes.map((classe) => ({
      valeur: classe.id,
      libelle: classe.libelle,
    })),
  ];

  const libelleClasse = (dossier: DossierEleve): string => {
    if (!dossier.id_classe_annuelle) return "Sans classe";
    return (
      classes.find((classe) => classe.id === dossier.id_classe_annuelle)
        ?.libelle ?? dossier.id_classe_annuelle
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Élèves</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Chaque élève, un dossier clair — matricule, classe, responsable.
          </p>
        </div>
        <Bouton
          variante="secondaire"
          icone={LuUserPlus}
          onClick={ouvrirNouveau}
          disabled={ecoleAbsente || chargement}
        >
          Ajouter un élève
        </Bouton>
      </div>

      {info ? (
        <p
          className="rounded-[10px] bg-emerald-50 px-3.5 py-2.5 text-[13.5px] text-emerald-800"
          role="status"
        >
          {info}
        </p>
      ) : null}
      {erreurChargement ? <MessageErreur>{erreurChargement}</MessageErreur> : null}
      {erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

      {ecoleAbsente ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-stone-600">
            Aucune école n'est encore créée sur cet appareil. Le parcours de
            configuration crée l'école, l'année scolaire et les classes —
            ensuite cette page accueille vos élèves.
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
          {/* Recherche et filtre */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="relative min-w-[220px] flex-1">
              <LuSearch
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
              />
              <ChampTexte
                className="pl-10"
                placeholder="Rechercher un élève (prénom ou nom)…"
                value={recherche}
                onChange={(evenement) => setRecherche(evenement.target.value)}
                aria-label="Rechercher un élève"
              />
            </div>
            <div className="w-full sm:w-60">
              <ListeDeroulante
                value={filtreClasse}
                onChange={(evenement) =>
                  setFiltreClasse(evenement.target.value)
                }
                options={[
                  { valeur: "toutes", libelle: "Toutes les classes" },
                  ...classes.map((classe) => ({
                    valeur: classe.id,
                    libelle: classe.libelle,
                  })),
                ]}
                aria-label="Filtrer par classe"
              />
            </div>
            <p className="text-[13px] text-stone-500">
              {listeFiltree.length} affiché
              {listeFiltree.length > 1 ? "s" : ""} sur {dossiers.length}
            </p>
          </div>

          <div
            className={
              panneau
                ? "grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"
                : ""
            }
          >
            {/* Tableau des élèves */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {chargement ? (
                <p className="p-8 text-center text-sm text-stone-500">
                  Chargement des élèves…
                </p>
              ) : listeFiltree.length === 0 ? (
                <div className="p-8 text-center">
                  {dossiers.length === 0 ? (
                    <>
                      <p className="text-sm font-semibold text-stone-700">
                        Aucun élève pour l'instant.
                      </p>
                      <p className="mt-1 text-[13px] text-stone-500">
                        Ajoutez votre premier élève avec le bouton ci-dessus,
                        ou importez une liste Excel depuis l'étape Élèves du
                        parcours de configuration.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-stone-500">
                      Aucun élève ne correspond à la recherche ou au filtre.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Matricule
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Élève
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Sexe
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Classe
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
                      {listeFiltree.map((dossier) => (
                        <tr
                          key={dossier.id_eleve}
                          className="transition-colors hover:bg-stone-50/70"
                        >
                          <td
                            className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px] text-stone-500"
                            title="Le matricule sera attribué avec le module Inscriptions."
                          >
                            {dossier.matricule ?? "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2.5">
                              <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-stone-100 text-[11px] font-bold uppercase text-stone-500">
                                {initiales(dossier.prenom, dossier.nom)}
                              </span>
                              <span className="font-medium text-stone-900">
                                {(dossier.nom ?? "").toUpperCase()}{" "}
                                {dossier.prenom ?? ""}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {dossier.genre === "F" ? (
                              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                                F
                              </span>
                            ) : dossier.genre === "M" ? (
                              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                                M
                              </span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">
                              {libelleClasse(dossier)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {dossier.etat_inscription === "CONFIRMEE" ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                Inscrit
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                Sans inscription
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => ouvrirEdition(dossier)}
                                className="inline-flex items-center gap-1 rounded p-1 text-[12.5px] text-stone-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]"
                                aria-label={`Modifier le dossier de ${dossier.prenom ?? ""} ${dossier.nom ?? ""}`}
                              >
                                <LuPencil size={14} aria-hidden="true" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => void retirer(dossier)}
                                className={cx(lienDangerCls, "shrink-0")}
                                aria-label={`Annuler l'inscription de ${dossier.prenom ?? ""} ${dossier.nom ?? ""}`}
                              >
                                <LuTrash2 size={14} aria-hidden="true" />
                                {retraitAConfirmer === dossier.id_eleve
                                  ? "Confirmer ?"
                                  : "Retirer"}
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Panneau d'ajout / de correction (comme la maquette vidéo) */}
            {panneau ? (
              <aside className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
                <h2 className="text-sm font-semibold text-stone-900">
                  {panneau.mode === "edition"
                    ? "Modifier le dossier"
                    : "Nouvel élève"}
                </h2>

                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-3.5 sm:flex-row">
                    <Champ label="Prénom">
                      <ChampTexte
                        value={formulaire.prenom}
                        onChange={(evenement) =>
                          setFormulaire({
                            ...formulaire,
                            prenom: evenement.target.value,
                          })
                        }
                      />
                    </Champ>
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
                  </div>

                  <div className="flex flex-col gap-3.5 sm:flex-row">
                    <Champ label="Sexe">
                      <ListeDeroulante
                        value={formulaire.sexe}
                        onChange={(evenement) =>
                          setFormulaire({
                            ...formulaire,
                            sexe: evenement.target.value,
                          })
                        }
                        options={[
                          { valeur: "", libelle: "Choisir…" },
                          { valeur: "F", libelle: "Fille" },
                          { valeur: "M", libelle: "Garçon" },
                        ]}
                      />
                    </Champ>
                    <Champ label="Classe">
                      <ListeDeroulante
                        value={formulaire.classe}
                        onChange={(evenement) =>
                          setFormulaire({
                            ...formulaire,
                            classe: evenement.target.value,
                          })
                        }
                        options={optionsClasse}
                      />
                    </Champ>
                  </div>

                  <Champ label="Nom du parent (facultatif)">
                    <ChampTexte
                      value={formulaire.parent}
                      onChange={(evenement) =>
                        setFormulaire({
                          ...formulaire,
                          parent: evenement.target.value,
                        })
                      }
                    />
                  </Champ>

                  <Champ label="Téléphone du parent">
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-stone-100 px-3 text-sm text-stone-500">
                        <LuPhone size={14} aria-hidden="true" />
                        {INDICATIF_TELEPHONE}
                      </span>
                      <ChampTexte
                        inputMode="tel"
                        value={formulaire.telephone}
                        onChange={(evenement) =>
                          setFormulaire({
                            ...formulaire,
                            telephone: evenement.target.value,
                          })
                        }
                        placeholder="06 123 45 67"
                      />
                    </div>
                  </Champ>
                </div>

                {panneau.mode === "edition" ? (
                  <p className="text-[12.5px] text-stone-500">
                    La base conserve chaque affectation et chaque relation au
                    moins un jour : un changement de classe ou de parent visé
                    le jour même d'une création prendra effet à partir de
                    demain.
                  </p>
                ) : null}

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
    </div>
  );
}
