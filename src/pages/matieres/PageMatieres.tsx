import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LuArchive,
  LuArchiveRestore,
  LuLoader,
  LuPlus,
} from "react-icons/lu";
import {
  servicesPedagogiques,
  type Matiere,
} from "../../services/pedagogie";
import {
  Aide,
  Bouton,
  ChampTexte,
  ListeDeroulante,
  MessageErreur,
  Puce,
  lienDangerCls,
  type OptionListe,
} from "../configuration/composants";
import { cx } from "../configuration/donnees";
import {
  CATALOGUE_MATIERES,
  CATEGORIES_MATIERES,
  ONGLETS_CYCLES,
  grouperParCategorie,
  normaliserLibelle,
  suggererCode,
  type CycleId,
  type MatiereProposee,
} from "./catalogue-matieres";

/**
 * Page « Matières » — refondue d'après la maquette validée : on choisit
 * au lieu de saisir. Deux écrans, sans carte à zéro ni jargon :
 *
 * 1. Référentiel vide → onglets Primaire / Collège / Lycée, matières
 *    courantes au Congo groupées en Langues / Sciences / Humanités /
 *    Arts et sport. On coche, une barre en bas compte la sélection
 *    (« 9 matières sélectionnées ») et un seul bouton « Ajouter à
 *    l'école » crée le tout d'un coup. Une seule voie pour une matière
 *    personnalisée : la ligne « Une matière absente de la liste ? » —
 *    nom, code rempli tout seul à partir du nom, catégorie en liste
 *    déroulante.
 *
 * 2. Référentiel constitué → liste groupée par catégorie, ligne
 *    « + Ajouter » en haut pour saisir directement dans le tableau,
 *    modification sur place en cliquant sur le nom, « Retirer » (jamais
 *    « Supprimer » : la base refuse une suppression physique, règle
 *    d'or) et lien discret « Voir les matières retirées » à la place de
 *    la carte « Retirées ».
 *
 * Points d'honnêteté, comme partout :
 * - le doublon est signalé pendant la frappe (« Cette matière existe
 *   déjà ») avant d'écrire quoi que ce soit en base — le même contrôle
 *   existe au niveau du service, en filet de sécurité ;
 * - les colonnes « Classes » et « Professeurs » affichent « — » tant
 *   que ces modules ne sont pas reliés aux matières : les tables
 *   PROGRAMME_MATIERE et ENSEIGNEMENT du MLD arrivent avec le module
 *   Notes & Bulletins, rien n'est estimé ;
 * - le catalogue (catalogue-matieres.ts) est une aide au choix
 *   construite sur des écoles congolaises publiées, pas le programme
 *   officiel : l'école renomme ou complète librement.
 */

interface ValeursMatiere {
  nom: string;
  code: string;
  categorie: string;
}

const VALEURS_VIDES: ValeursMatiere = { nom: "", code: "", categorie: "" };

/** Options de la catégorie : les quatre du catalogue, la valeur actuelle
 *  si elle est libre (une ancienne catégorie personnalisée), puis
 *  « Autre » (enregistré sans catégorie, groupe « Autres »). */
function construireOptionsCategorie(
  categorieActuelle: string,
): OptionListe[] {
  const options: OptionListe[] = CATEGORIES_MATIERES.map((categorie) => ({
    valeur: categorie,
    libelle: categorie,
  }));
  if (
    categorieActuelle !== "" &&
    !CATEGORIES_MATIERES.some((categorie) => categorie === categorieActuelle)
  ) {
    options.push({ valeur: categorieActuelle, libelle: categorieActuelle });
  }
  options.push({ valeur: "", libelle: "Autre" });
  return options;
}

/** Ligne de saisie compacte, la même pour la matière personnalisée
 *  (écran 1), la ligne « + Ajouter » et l'édition sur place (écran 2).
 *  Le doublon est signalé pendant la frappe, sous le champ concerné,
 *  avec un mot simple : pas de message technique. */
function LigneSaisieMatiere({
  valeurs,
  onChanger,
  doublonNom,
  doublonCode,
  enCours,
  libelleAction,
  onValider,
  onAnnuler,
}: {
  valeurs: ValeursMatiere;
  onChanger: (suivant: ValeursMatiere) => void;
  doublonNom: string | null;
  doublonCode: string | null;
  enCours: boolean;
  libelleAction: string;
  onValider: () => void;
  onAnnuler?: () => void;
}) {
  const valide =
    valeurs.nom.trim() !== "" && doublonNom === null && doublonCode === null;

  return (
    <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-[minmax(0,1fr)_140px_200px_auto]">
      <div className="flex flex-col gap-1">
        <ChampTexte
          className="h-10"
          value={valeurs.nom}
          placeholder="Nom de la matière"
          aria-label="Nom de la matière"
          onChange={(evenement) =>
            onChanger({ ...valeurs, nom: evenement.target.value })
          }
        />
        {doublonNom ? (
          <p className="text-[12.5px] text-red-700">{doublonNom}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <ChampTexte
          className="h-10 font-mono uppercase"
          value={valeurs.code}
          placeholder="Code auto"
          aria-label="Code de la matière (facultatif)"
          onChange={(evenement) =>
            onChanger({ ...valeurs, code: evenement.target.value.toUpperCase() })
          }
        />
        {doublonCode ? (
          <p className="text-[12.5px] text-red-700">{doublonCode}</p>
        ) : null}
      </div>
      <ListeDeroulante
        value={valeurs.categorie}
        aria-label="Catégorie de la matière"
        options={construireOptionsCategorie(valeurs.categorie)}
        onChange={(evenement) =>
          onChanger({ ...valeurs, categorie: evenement.target.value })
        }
      />
      <div className="flex items-start gap-1.5">
        <Bouton
          variante="secondaire"
          enCours={enCours}
          disabled={!valide}
          onClick={onValider}
        >
          {libelleAction}
        </Bouton>
        {onAnnuler ? (
          <Bouton variante="fantome" onClick={onAnnuler}>
            Annuler
          </Bouton>
        ) : null}
      </div>
    </div>
  );
}

export function PageMatieres() {
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);

  // Écran 1 : cycle affiché et cases cochées (les libellés du catalogue).
  const [onglet, setOnglet] = useState<CycleId>("primaire");
  const [cochees, setCochees] = useState<ReadonlySet<string>>(new Set());
  const [ajoutLotEnCours, setAjoutLotEnCours] = useState(false);

  // La seule voie de saisie libre : « Une matière absente de la liste ? »
  // à l'écran 1, ligne « + Ajouter » à l'écran 2 — même mécanique.
  const [ligneOuverte, setLigneOuverte] = useState(false);
  const [saisie, setSaisie] = useState<ValeursMatiere>(VALEURS_VIDES);
  const [codeManuel, setCodeManuel] = useState(false);
  const [saisieEnCours, setSaisieEnCours] = useState(false);

  // Édition sur place : une seule ligne à la fois, ouverte par le nom.
  const [edition, setEdition] = useState<{
    id: string;
    valeurs: ValeursMatiere;
  } | null>(null);
  const [editionEnCours, setEditionEnCours] = useState(false);

  // Les retirées : section repliée à la place de la carte « Retirées ».
  const [retireesVisibles, setRetireesVisibles] = useState(false);
  const [retrait, setRetrait] = useState<Matiere | null>(null);
  const [retraitEnCours, setRetraitEnCours] = useState(false);

  const [info, setInfo] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    const lignes = await servicesPedagogiques.matieres.lister();
    setMatieres(lignes);
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreurChargement(null);
    try {
      await recharger();
    } catch (error) {
      setErreurChargement(
        error instanceof Error
          ? error.message
          : "Impossible de charger la liste des matières.",
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

  const fermerMessages = () => {
    setErreur(null);
    setInfo(null);
  };

  /** Doublon de nom signalé pendant la frappe — le même contrôle que la
   *  base (NOCASE), sur toutes les matières y compris les retirées. */
  const doublonNom = (nom: string, idIgnore?: string): string | null => {
    const cle = normaliserLibelle(nom);
    if (cle === "") return null;
    const existante = matieres.find(
      (m) => m.id_matiere !== idIgnore && normaliserLibelle(m.libelle) === cle,
    );
    return existante ? "Cette matière existe déjà" : null;
  };

  /** Doublon de code : le message nomme la matière qui le porte, sans
   *  jargon de base de données. */
  const doublonCode = (code: string, idIgnore?: string): string | null => {
    const propre = code.trim().toUpperCase();
    if (propre === "") return null;
    const existante = matieres.find(
      (m) =>
        m.id_matiere !== idIgnore &&
        (m.code ?? "").trim().toUpperCase() === propre,
    );
    return existante
      ? `Ce code est déjà utilisé par « ${existante.libelle} »`
      : null;
  };

  /** Le code suit le nom tant que le directeur n'a pas tapé dans le
   *  champ code lui-même (effacer le code rend la main à l'automatique). */
  const majSaisie = (suivant: ValeursMatiere) => {
    if (suivant.code !== saisie.code) {
      setCodeManuel(suivant.code.trim() !== "");
      setSaisie(suivant);
      return;
    }
    if (suivant.nom !== saisie.nom && !codeManuel) {
      setSaisie({ ...suivant, code: suggererCode(suivant.nom) });
      return;
    }
    setSaisie(suivant);
  };

  const majEdition = (suivant: ValeursMatiere) => {
    setEdition((precedente) =>
      precedente ? { ...precedente, valeurs: suivant } : precedente,
    );
  };

  const libellesExistants = useMemo(
    () => new Set(matieres.map((m) => normaliserLibelle(m.libelle))),
    [matieres],
  );

  /** Les cochées qui ne sont pas déjà en base — une matière cochée qui
   *  existe déjà est décochable mais ne compte plus ni ne s'ajoute. */
  const nombreSelectionnees = useMemo(
    () =>
      [...cochees].filter(
        (libelle) => !libellesExistants.has(normaliserLibelle(libelle)),
      ).length,
    [cochees, libellesExistants],
  );

  const basculerCochee = (proposee: MatiereProposee) => {
    if (libellesExistants.has(normaliserLibelle(proposee.libelle))) return;
    setCochees((precedentes) => {
      const suivantes = new Set(precedentes);
      if (suivantes.has(proposee.libelle)) suivantes.delete(proposee.libelle);
      else suivantes.add(proposee.libelle);
      return suivantes;
    });
  };

  /** « Ajouter à l'école » : crée les cochées dans l'ordre du catalogue
   *  (par cycle), un référentiel trié de façon prévisible dès le début.
   *  Une même matière est proposée sur plusieurs cycles (Français existe
   *  au primaire, au collège et au lycée) : le lot est dédupliqué par
   *  nom — sinon la deuxième occurrence heurterait la base UNIQUE. */
  const ajouterSelection = async () => {
    setAjoutLotEnCours(true);
    fermerMessages();
    let echec: string | null = null;
    try {
      const parLibelle = new Map(
        ONGLETS_CYCLES.flatMap((o) => CATALOGUE_MATIERES[o.id]).map((p) => [
          normaliserLibelle(p.libelle),
          p,
        ]),
      );
      // Ordre du catalogue, sans doublon entre les cycles.
      const ordreUnique = [
        ...new Set(
          ONGLETS_CYCLES.flatMap((o) => CATALOGUE_MATIERES[o.id]).map((p) =>
            normaliserLibelle(p.libelle),
          ),
        ),
      ];
      const selection = ordreUnique
        .map((cle) => parLibelle.get(cle))
        .filter(
          (p): p is MatiereProposee =>
            p !== undefined &&
            cochees.has(p.libelle) &&
            !libellesExistants.has(normaliserLibelle(p.libelle)),
        );
      for (const proposee of selection) {
        await servicesPedagogiques.matieres.creer({
          libelle: proposee.libelle,
          code: proposee.code,
          categorie: proposee.categorie,
        });
      }
      const nombre = selection.length;
      setCochees(new Set());
      setInfo(
        nombre > 0
          ? `${nombre} matière${nombre > 1 ? "s" : ""} ajoutée${
              nombre > 1 ? "s" : ""
            } à votre école.`
          : "Aucune nouvelle matière à ajouter : tout était déjà dans votre école.",
      );
    } catch (error) {
      echec =
        error instanceof Error
          ? error.message
          : "Les matières n'ont pas pu être ajoutées.";
      // Les cochées déjà créées ne comptent plus : recharger remet les
      // compteurs d'accord avec la base.
    } finally {
      setAjoutLotEnCours(false);
    }
    if (echec) setErreur(echec);
    try {
      await recharger();
    } catch {
      // Le message de chargement s'affichera à la prochaine navigation.
    }
  };

  const enregistrerSaisie = async () => {
    setSaisieEnCours(true);
    fermerMessages();
    try {
      const creee = await servicesPedagogiques.matieres.creer({
        libelle: saisie.nom,
        code: saisie.code,
        // « Autre » : catégorie non renseignée, la base enregistre null.
        categorie: saisie.categorie,
      });
      setSaisie(VALEURS_VIDES);
      setCodeManuel(false);
      setLigneOuverte(false);
      setInfo(`Matière « ${creee.libelle} » ajoutée à votre école.`);
      await recharger();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "La matière n'a pas pu être enregistrée.",
      );
    } finally {
      setSaisieEnCours(false);
    }
  };

  const ouvrirEdition = (matiere: Matiere) => {
    fermerMessages();
    setLigneOuverte(false);
    setRetrait(null);
    setEdition({
      id: matiere.id_matiere,
      valeurs: {
        nom: matiere.libelle ?? "",
        code: matiere.code ?? "",
        categorie: matiere.categorie ?? "",
      },
    });
  };

  const enregistrerEdition = async () => {
    if (!edition) return;
    setEditionEnCours(true);
    fermerMessages();
    try {
      await servicesPedagogiques.matieres.modifier({
        id_matiere: edition.id,
        libelle: edition.valeurs.nom,
        code: edition.valeurs.code,
        categorie: edition.valeurs.categorie,
      });
      setEdition(null);
      setInfo("Matière mise à jour.");
      await recharger();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "La matière n'a pas pu être mise à jour.",
      );
    } finally {
      setEditionEnCours(false);
    }
  };

  /** « Retirer » : ouvre la fenêtre de confirmation. Rien n'est écrit
   *  tant que le directeur n'a pas confirmé dans cette fenêtre. */
  const ouvrirRetrait = (matiere: Matiere) => {
    fermerMessages();
    setEdition(null);
    setLigneOuverte(false);
    setRetrait(matiere);
  };

  const confirmerRetrait = async () => {
    if (!retrait) return;
    const matiere = retrait;
    setRetraitEnCours(true);
    fermerMessages();
    try {
      await servicesPedagogiques.matieres.desactiver(matiere.id_matiere);
      setRetrait(null);
      setInfo(
        `Matière « ${matiere.libelle} » retirée de la liste active. Rien n'a été effacé : elle reste conservée dans le référentiel.`,
      );
      await recharger();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Le retrait n'a pas pu être effectué.",
      );
    } finally {
      setRetraitEnCours(false);
    }
  };

  /** Remettre est une action sans risque : directe, avec un message. */
  const remettre = async (matiere: Matiere) => {
    fermerMessages();
    try {
      await servicesPedagogiques.matieres.reactiver(matiere.id_matiere);
      setInfo(`Matière « ${matiere.libelle} » de retour dans la liste active.`);
      await recharger();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "La remise en liste active a échoué.",
      );
    }
  };

  const referentielVide = !chargement && matieres.length === 0;

  // Écran 1 : les matières proposées du cycle actif, déjà groupées.
  const ongletActif = ONGLETS_CYCLES.find((o) => o.id === onglet);
  const groupesCatalogue = grouperParCategorie(CATALOGUE_MATIERES[onglet]);

  // Écran 2 : les actives groupées par catégorie, les retirées à part.
  const groupes = useMemo(
    () => grouperParCategorie(matieres.filter((m) => m.est_actif === 1)),
    [matieres],
  );
  const retirees = useMemo(
    () => matieres.filter((m) => m.est_actif === 0),
    [matieres],
  );

  const doublonNomSaisie = doublonNom(saisie.nom);
  const doublonCodeSaisie = doublonCode(saisie.code);

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-2 pt-2">
      {/* Titre simple, comme demandé : plus de cartes de statistiques. */}
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Matières</h1>
        <p className="mt-0.5 text-[13px] text-stone-500">
          {referentielVide
            ? "Cochez les matières enseignées dans votre école — tout se modifie ensuite."
            : "Cliquez sur le nom d'une matière pour la modifier directement dans le tableau."}
        </p>
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

      {chargement ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-stone-500 shadow-sm ring-1 ring-black/5">
          Chargement des matières…
        </p>
      ) : referentielVide ? (
        <>
          {/* Écran 1 : on choisit au lieu de saisir. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2" aria-label="Choisir le cycle">
              {ONGLETS_CYCLES.map((o) => (
                <Puce
                  key={o.id}
                  actif={onglet === o.id}
                  onClick={() => {
                    setOnglet(o.id);
                    fermerMessages();
                  }}
                >
                  {o.libelle}
                </Puce>
              ))}
            </div>
            <p className="text-[12.5px] text-stone-500">
              {ongletActif?.sousTitre} · {CATALOGUE_MATIERES[onglet].length}{" "}
              matières courantes au Congo
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {groupesCatalogue.map((groupe) => (
              <section
                key={groupe.libelle}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <h2 className="text-sm font-semibold text-stone-900">
                  {groupe.libelle}
                </h2>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {groupe.matieres.map((proposee) => {
                    const dejaLa = libellesExistants.has(
                      normaliserLibelle(proposee.libelle),
                    );
                    const cochee = cochees.has(proposee.libelle);
                    return (
                      <li key={proposee.libelle}>
                        <label
                          className={cx(
                            "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                            cochee
                              ? "border-[#2d8a6b] bg-[#2d8a6b]/5"
                              : "border-stone-200 bg-white hover:border-[#2d8a6b]",
                            dejaLa &&
                              "cursor-not-allowed opacity-55 hover:border-stone-200",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-[#2d8a6b]"
                            checked={cochee}
                            disabled={dejaLa}
                            onChange={() => basculerCochee(proposee)}
                            aria-label={`Sélectionner la matière ${proposee.libelle}`}
                          />
                          <span className="flex-1 text-[14px] font-medium text-stone-900">
                            {proposee.libelle}
                          </span>
                          <span className="font-mono text-[11.5px] text-stone-400">
                            {proposee.code}
                          </span>
                          {dejaLa ? (
                            <span className="text-[11.5px] text-stone-400">
                              déjà dans votre école
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* Une seule voie pour une matière personnalisée. */}
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-4">
            <p className="text-[13px] font-semibold text-stone-900">
              Une matière absente de la liste ?
            </p>
            <p className="mt-0.5 text-[12.5px] text-stone-500">
              Nommez-la : le code se remplit tout seul à partir du nom, la
              catégorie se choisit dans la liste.
            </p>
            <div className="mt-3">
              <LigneSaisieMatiere
                valeurs={saisie}
                onChanger={majSaisie}
                doublonNom={doublonNomSaisie}
                doublonCode={doublonCodeSaisie}
                enCours={saisieEnCours}
                libelleAction="Ajouter cette matière"
                onValider={() => void enregistrerSaisie()}
              />
            </div>
          </div>

          {/* La barre du bas : compteur en toutes lettres + un seul bouton. */}
          <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/10">
            <p className="text-[14px] font-medium text-stone-900">
              {nombreSelectionnees > 0
                ? `${nombreSelectionnees} matière${
                    nombreSelectionnees > 1 ? "s" : ""
                  } sélectionnée${nombreSelectionnees > 1 ? "s" : ""}`
                : "Aucune matière sélectionnée"}
            </p>
            <button
              type="button"
              onClick={() => void ajouterSelection()}
              disabled={nombreSelectionnees === 0 || ajoutLotEnCours}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-[#2d8a6b] px-5 font-semibold text-white transition-colors hover:bg-[#247a5d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ajoutLotEnCours ? (
                <LuLoader size={18} className="animate-spin" aria-hidden="true" />
              ) : null}
              <span>Ajouter à l'école</span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Écran 2 : liste groupée, ligne « + Ajouter » en haut. */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="border-b border-stone-100 px-4 py-3">
              {ligneOuverte ? (
                <LigneSaisieMatiere
                  valeurs={saisie}
                  onChanger={majSaisie}
                  doublonNom={doublonNomSaisie}
                  doublonCode={doublonCodeSaisie}
                  enCours={saisieEnCours}
                  libelleAction="Ajouter"
                  onValider={() => void enregistrerSaisie()}
                  onAnnuler={() => {
                    setLigneOuverte(false);
                    setSaisie(VALEURS_VIDES);
                    setCodeManuel(false);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    fermerMessages();
                    setEdition(null);
                    setLigneOuverte(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded p-1 text-[13.5px] font-semibold text-[#2d8a6b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]"
                >
                  <LuPlus size={16} aria-hidden="true" />
                  Ajouter une matière
                </button>
              )}
            </div>

            {groupes.length === 0 ? (
              <p className="p-6 text-center text-[13.5px] text-stone-500">
                Toutes vos matières sont retirées de la liste active.
                Remettez-en une depuis « Voir les matières retirées »
                ci-dessous, ou ajoutez-en une nouvelle en haut.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-semibold">
                        Matière
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">
                        Code
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">
                        Classes
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">
                        Professeurs
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {groupes.map((groupe) => (
                      <Fragment key={groupe.libelle}>
                        <tr>
                          <th
                            scope="colgroup"
                            colSpan={5}
                            className="border-t border-stone-100 bg-stone-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500"
                          >
                            {groupe.libelle} · {groupe.matieres.length}
                          </th>
                        </tr>
                        {groupe.matieres.map((matiere) =>
                          edition?.id === matiere.id_matiere ? (
                            <tr
                              key={matiere.id_matiere}
                              className="bg-[#2d8a6b]/5"
                            >
                              <td colSpan={5} className="px-4 py-3">
                                <LigneSaisieMatiere
                                  valeurs={edition.valeurs}
                                  onChanger={majEdition}
                                  doublonNom={doublonNom(
                                    edition.valeurs.nom,
                                    edition.id,
                                  )}
                                  doublonCode={doublonCode(
                                    edition.valeurs.code,
                                    edition.id,
                                  )}
                                  enCours={editionEnCours}
                                  libelleAction="Enregistrer"
                                  onValider={() => void enregistrerEdition()}
                                  onAnnuler={() => setEdition(null)}
                                />
                              </td>
                            </tr>
                          ) : (
                            <tr
                              key={matiere.id_matiere}
                              className="transition-colors hover:bg-stone-50/70"
                            >
                              <td className="px-4 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => ouvrirEdition(matiere)}
                                  className="rounded font-medium text-stone-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]"
                                  title="Cliquer sur le nom pour la modifier"
                                  aria-label={`Modifier la matière ${matiere.libelle}`}
                                >
                                  {matiere.libelle}
                                </button>
                              </td>
                              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px] text-stone-500">
                                {matiere.code ?? "—"}
                              </td>
                              <td
                                className="px-4 py-2.5 text-stone-400"
                                title="Ce nombre s'affichera quand les classes seront reliées aux matières (module Notes & Bulletins)."
                              >
                                —
                              </td>
                              <td
                                className="px-4 py-2.5 text-stone-400"
                                title="Ce nombre s'affichera quand les professeurs seront reliés aux matières (module Notes & Bulletins)."
                              >
                                —
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => ouvrirRetrait(matiere)}
                                    className={cx(lienDangerCls, "shrink-0")}
                                    aria-label={`Retirer la matière ${matiere.libelle}`}
                                  >
                                    <LuArchive size={14} aria-hidden="true" />
                                    Retirer
                                  </button>
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 pb-2.5 pt-2">
              <Aide>
                Les colonnes « Classes » et « Professeurs » afficheront leurs
                nombres quand ces modules seront reliés aux matières (Notes &amp;
                Bulletins).
              </Aide>
            </div>
          </div>

          {/* Lien discret à la place de la carte « Retirées ». */}
          {retirees.length > 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <button
                type="button"
                onClick={() => setRetireesVisibles((visible) => !visible)}
                aria-expanded={retireesVisibles}
                className="inline-flex items-center gap-1.5 rounded p-1 text-[12.5px] text-stone-500 hover:text-stone-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
              >
                <LuArchive size={14} aria-hidden="true" />
                {retireesVisibles
                  ? "Masquer les matières retirées"
                  : `Voir les matières retirées (${retirees.length})`}
              </button>
              {retireesVisibles ? (
                <ul className="mt-2 divide-y divide-stone-100">
                  {retirees.map((matiere) => (
                    <li
                      key={matiere.id_matiere}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <span className="flex items-baseline gap-2.5">
                        <span className="text-[14px] font-medium text-stone-700">
                          {matiere.libelle}
                        </span>
                        {matiere.code ? (
                          <span className="font-mono text-[11.5px] text-stone-400">
                            {matiere.code}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => void remettre(matiere)}
                        className="inline-flex items-center gap-1 rounded p-1 text-[12.5px] text-stone-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]"
                        aria-label={`Remettre la matière ${matiere.libelle} dans la liste active`}
                      >
                        <LuArchiveRestore size={14} aria-hidden="true" />
                        Remettre
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {/* Fenêtre de confirmation du retrait : elle dit exactement ce qui
          va se passer et rien n'est écrit tant qu'elle n'est pas
          confirmée. La remise, sans risque, n'en a pas besoin. */}
      {retrait ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-retrait"
          onClick={() => setRetrait(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(evenement) => evenement.stopPropagation()}
          >
            <h2 id="titre-retrait" className="text-base font-bold text-stone-900">
              Retirer la matière « {retrait.libelle} » ?
            </h2>
            <p className="mt-2 text-[13.5px] text-stone-600">
              Elle sort de la liste active dès la confirmation.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-stone-600">
              <li>
                Rien n'est effacé : nom, code et catégorie restent conservés
                dans le référentiel de votre école.
              </li>
              <li>
                Une matière n'est jamais supprimée physiquement : c'est la
                règle d'or de l'application, l'historique reste intact.
              </li>
              <li>
                Le lien « Voir les matières retirées » la retrouve et le
                bouton « Remettre » la ramène en un clic.
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void confirmerRetrait()}
                disabled={retraitEnCours}
                className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-red-700 px-5 font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {retraitEnCours
                  ? "Retrait en cours…"
                  : "Oui, la retirer de la liste active"}
              </button>
              <Bouton variante="fantome" onClick={() => setRetrait(null)}>
                Non, la garder
              </Bouton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
