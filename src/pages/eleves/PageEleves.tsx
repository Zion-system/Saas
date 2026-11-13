import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuArrowLeftRight,
  LuDownload,
  LuFileSpreadsheet,
  LuLayers,
  LuLock,
  LuPhone,
  LuPencil,
  LuSearch,
  LuTrash2,
  LuUpload,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import {
  servicesElevesResponsables,
  type DossierEleve,
} from "../../services/eleves-responsables";
import { servicesOrganisationScolaire } from "../../services/organisation-scolaire";
import { cleJourCourant } from "../../utils/date";
import { genererExportEleves } from "../../utils/export-eleves";
import {
  analyserEleves,
  genererModeleEleves,
  lireLignesBrutes,
  normaliserComparaison,
  type ResultatAnalyse,
} from "../../utils/import-eleves";
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
  MenuDeroulant,
  MessageErreur,
  lienDangerCls,
} from "../configuration/composants";
import {
  INDICATIF_TELEPHONE,
  construireCatalogueLibelles,
  cx,
} from "../configuration/donnees";

/**
 * Page « Élèves » — reprise sur la maquette validée (image « onglet eleves
 * interessant »), allégée après relecture IHM : un seul bouton primaire
 * (« Ajouter un élève ») et les trois actions de fichiers regroupées dans
 * un menu secondaire « Import / Export » (Télécharger le modèle, Importer,
 * Exporter) pour ne plus écraser le titre ni déborder sur mobile.
 *
 * La page garde : quatre cartes de statistiques, recherche et filtres
 * (classe, statut, frais), tableau (Élève, Matricule, Classe, Parent,
 * Statut, Abs., Frais) et, sur chaque ligne, deux actions : Modifier et
 * Supprimer.
 *
 * Points d'honnêteté, comme partout dans l'application :
 * - « Importer » fonctionne ici même, même si l'école a été créée sans
 *   import à la configuration : le poste de contrôle (lecture locale,
 *   ligne par ligne, doublons écartés) est le même outil que l'étape 4 ;
 * - « Transférés » et « Nouveaux élèves » restent à « — » tant que le
 *   module Inscriptions ne porte pas l'historique : rien d'estimé ;
 * - « Supprimer » n'efface jamais un élève : il annule son inscription
 *   (règle d'or de la base) après une fenêtre de confirmation qui le dit
 *   clairement ;
 * - le téléphone du parent se saisit en numéro local (06…) : l'indicatif
 *   +242 est ajouté par l'application, jamais tapé.
 */

const MIME_EXCEL =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const zoneDepotCls =
  "flex w-full flex-col items-center gap-1 rounded-xl border-[1.5px] border-dashed border-stone-300 bg-stone-100 p-4 text-center transition-colors hover:border-[#2d8a6b]";

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
  | { mode: "import" }
  | null;

/** Élève dont la suppression (annulation d'inscription) est en confirmation. */
type SuppressionConfirmee = { dossier: DossierEleve } | null;

function formulaireDepuisDossier(dossier: DossierEleve): FormulaireEleve {
  return {
    prenom: dossier.prenom ?? "",
    nom: dossier.nom ?? "",
    sexe: dossier.genre ?? "",
    classe: dossier.id_classe_annuelle ?? "",
    parent: dossier.parent?.nom_complet ?? "",
    // Un numéro stocké avec son indicatif (« +242 06 … ») est re-présenté
    // en numéro local : l'indicatif reste l'affaire de l'application.
    telephone: formaterTelephoneLocal(dossier.parent?.telephone ?? ""),
  };
}

function initiales(prenom: string | null, nom: string | null): string {
  return `${(prenom ?? "?").charAt(0)}${(nom ?? "?").charAt(0)}`.toUpperCase();
}

/** Télécharge un contenu binaire sous forme de fichier .xlsx. */
function telechargerFichierExcel(contenu: ArrayBuffer, nom: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type: MIME_EXCEL }));
  Object.assign(document.createElement("a"), { href: url, download: nom }).click();
  URL.revokeObjectURL(url);
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
  const [filtreStatut, setFiltreStatut] = useState("tous");

  const [panneau, setPanneau] = useState<Panneau>(null);
  const [formulaire, setFormulaire] = useState<FormulaireEleve>(FORMULAIRE_VIDE);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Import Excel (même moteur que l'étape 4 de la configuration).
  const [fichierImport, setFichierImport] = useState<File | null>(null);
  const [analyse, setAnalyse] = useState<ResultatAnalyse | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [importEnCours, setImportEnCours] = useState(false);
  const fichierRef = useRef<HTMLInputElement>(null);

  // Suppression : une fenêtre de confirmation explique ce qui va se passer.
  const [suppression, setSuppression] = useState<SuppressionConfirmee>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

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
        if (filtreStatut === "inscrits" && dossier.etat_inscription !== "CONFIRMEE") {
          return false;
        }
        if (filtreStatut === "sans" && dossier.etat_inscription === "CONFIRMEE") {
          return false;
        }
        if (recherchePropre !== "") {
          const cle = normaliserComparaison(
            `${dossier.prenom ?? ""} ${dossier.nom ?? ""} ${dossier.matricule ?? ""}`,
          );
          if (!cle.includes(recherchePropre)) return false;
        }
        return true;
      }),
    [dossiers, filtreClasse, filtreStatut, recherchePropre],
  );

  /**
   * Les quatre cartes du haut — libellés de la maquette. « Total élèves »
   * et « Moyenne d'élèves par classe » sont calculés depuis la base ;
   * « Transférés » et « Nouveaux élèves » attendent le module Inscriptions
   * (historique des dates) : ils restent à « — » plutôt que d'inventer.
   */
  const statistiques = useMemo(() => {
    const avecClasse = dossiers.filter((d) => d.id_classe_annuelle);
    const classesOccupees = new Set(
      avecClasse.map((d) => d.id_classe_annuelle),
    );
    const moyenne =
      classesOccupees.size > 0
        ? avecClasse.length / classesOccupees.size
        : null;
    return { total: dossiers.length, moyenne };
  }, [dossiers]);

  const fermerMessages = () => {
    setErreur(null);
    setInfo(null);
  };

  const ouvrirNouveau = () => {
    fermerMessages();
    setSuppression(null);
    setFormulaire(FORMULAIRE_VIDE);
    setPanneau({ mode: "nouveau" });
  };

  const ouvrirEdition = (dossier: DossierEleve) => {
    fermerMessages();
    setSuppression(null);
    setFormulaire(formulaireDepuisDossier(dossier));
    setPanneau({ mode: "edition", dossier });
  };

  const ouvrirImport = () => {
    fermerMessages();
    setSuppression(null);
    setFichierImport(null);
    setAnalyse(null);
    setPanneau({ mode: "import" });
  };

  const fermerPanneau = () => {
    setPanneau(null);
    setErreur(null);
    setFormulaire(FORMULAIRE_VIDE);
    setAnalyse(null);
    setFichierImport(null);
  };

  const enregistrer = async () => {
    if (!idEtablissement || !idAnnee) return;
    if (!panneau || panneau.mode === "import") return;
    setEnCours(true);
    fermerMessages();
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
              // Numéro local saisi, indicatif ajouté ici (+242 06 …).
              telephone: telephoneCompose(formulaire.telephone),
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

  /**
   * « Supprimer » : ouvre la fenêtre de confirmation. Rien n'est écrit
   * tant que le directeur n'a pas confirmé dans cette fenêtre.
   */
  const ouvrirSuppression = (dossier: DossierEleve) => {
    fermerMessages();
    setPanneau(null);
    setSuppression({ dossier });
  };

  /**
   * Confirmation de « Supprimer » : annulation de l'inscription — JAMAIS
   * une suppression physique. Le service `annuler` met l'inscription à
   * l'état « ANNULEE » et clôture l'affectation ; la base conserve
   * l'élève, son matricule et tout l'historique (les déclencheurs de la
   * base l'interdisent d'ailleurs). L'élève sort de la liste active.
   */
  const confirmerSuppression = async () => {
    if (!suppression || !idEtablissement) return;
    const dossier = suppression.dossier;
    setSuppressionEnCours(true);
    fermerMessages();
    try {
      await servicesElevesResponsables.dossiers.annuler(
        dossier.id_eleve,
        idEtablissement,
      );
      setSuppression(null);
      setInfo(
        `Inscription de ${(dossier.nom ?? "").toUpperCase()} ${
          dossier.prenom ?? ""
        } annulée. Rien n'a été effacé : le dossier reste conservé dans la base de l'école, l'élève sort de la liste active.`,
      );
      await recharger(idEtablissement);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Le retrait n'a pas pu être effectué.",
      );
    } finally {
      setSuppressionEnCours(false);
    }
  };

  /** « Télécharger le modèle » : vrai .xlsx avec colonnes et exemple. */
  const telechargerModele = () => {
    telechargerFichierExcel(genererModeleEleves(), "modele-eleves.xlsx");
    setInfo(
      "Modèle Excel téléchargé : remplissez-le puis cliquez sur « Importer Excel ».",
    );
  };

  /** « Export Excel » : la liste affichée (filtres actifs) en vrai .xlsx. */
  const exporter = () => {
    const lignes = listeFiltree.map((dossier) => ({
      prenom: dossier.prenom ?? "",
      nom: dossier.nom ?? "",
      sexe: dossier.genre,
      matricule: dossier.matricule ?? null,
      classe: dossier.id_classe_annuelle ? libelleClasse(dossier) : null,
      parent: dossier.parent?.nom_complet ?? null,
      telephone: dossier.parent?.telephone ?? null,
      statut:
        dossier.etat_inscription === "CONFIRMEE"
          ? "Inscrit"
          : "Sans inscription",
    }));
    telechargerFichierExcel(
      genererExportEleves(lignes),
      `eleves-${cleJourCourant()}.xlsx`,
    );
    setInfo(
      `Export lancé : ${lignes.length} élève${
        lignes.length > 1 ? "s" : ""
      } avec les filtres actifs (fichier eleves-${cleJourCourant()}.xlsx).`,
    );
  };

  /** Fichier choisi dans le panneau d'import : lecture locale + contrôle. */
  const choisirFichier = async (fichier: File | null): Promise<void> => {
    fermerMessages();
    setAnalyse(null);
    setFichierImport(fichier);
    if (!fichier) return;
    setAnalyseEnCours(true);
    try {
      const lignes = await lireLignesBrutes(fichier);
      setAnalyse(
        analyserEleves(lignes, {
          libellesClasses: classes.map((classe) => classe.libelle),
          existants: dossiers.map((dossier) => ({
            prenom: dossier.prenom ?? "",
            nom: dossier.nom ?? "",
            classe: dossier.id_classe_annuelle ? libelleClasse(dossier) : null,
          })),
        }),
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Ce fichier n'a pas pu être lu.",
      );
      setAnalyse(null);
    } finally {
      setAnalyseEnCours(false);
    }
  };

  /** Enregistre les élèves valides du fichier choisi (poste de contrôle). */
  const importerValides = async (): Promise<void> => {
    if (!idEtablissement || !idAnnee) {
      setErreur("Aucune école n'est encore créée sur cet appareil.");
      return;
    }
    if (!analyse || analyse.prets.length === 0) return;
    setImportEnCours(true);
    fermerMessages();
    const classeVersId = new Map(classes.map((c) => [c.libelle, c.id]));
    try {
      for (const pret of analyse.prets) {
        await servicesElevesResponsables.dossiers.creer({
          id_etablissement: idEtablissement,
          id_annee_scolaire: idAnnee,
          prenom: pret.prenom,
          nom: pret.nom,
          genre: pret.genre,
          id_classe_annuelle: pret.classe
            ? (classeVersId.get(pret.classe) ?? null)
            : null,
          parent: pret.parent
            ? { nom_complet: pret.parent, telephone: pret.telephone }
            : null,
        });
      }
      const nombre = analyse.prets.length;
      setPanneau(null);
      setAnalyse(null);
      setFichierImport(null);
      setInfo(
        `${nombre} élève${nombre > 1 ? "s" : ""} importé${
          nombre > 1 ? "s" : ""
        } depuis le fichier.`,
      );
      await recharger(idEtablissement);
    } catch (error) {
      setErreur(
        `${
          error instanceof Error ? error.message : "Échec de l'import."
        } — les élèves déjà enregistrés le sont restés ; corrigez le fichier et réimportez le reste.`,
      );
      await recharger(idEtablissement).catch(() => undefined);
    } finally {
      setImportEnCours(false);
    }
  };

  const peutEnregistrer =
    formulaire.prenom.trim() !== "" &&
    formulaire.nom.trim() !== "" &&
    (formulaire.telephone === "" ||
      estTelephoneComplet(formulaire.telephone));

  /** Aide à la saisie du téléphone : numéro local, indicatif automatique. */
  const chiffresTelephone = chiffresLocaux(formulaire.telephone);
  const hintTelephone =
    formulaire.telephone === ""
      ? "Numéro local uniquement : l'indicatif +242 est ajouté tout seul."
      : estTelephoneComplet(formulaire.telephone)
        ? "Numéro complet — enregistré avec l'indicatif +242."
        : `Numéro incomplet : ${chiffresTelephone.length}/9 chiffres.`;

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

  /** « Sans classe » en neutre : ce n'est pas une réussite, c'est à faire. */
  const classeEnBadge = (dossier: DossierEleve) =>
    dossier.id_classe_annuelle ? (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">
        {libelleClasse(dossier)}
      </span>
    ) : (
      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-500">
        Sans classe
      </span>
    );

  const prets = analyse?.prets.length ?? 0;
  const nombreErreurs = analyse?.erreurs.length ?? 0;
  const nombreDoublons = analyse?.doublons.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4 pt-2">
      {/* En-tête allégé : titre compact à gauche (sans compteur redondant
          avec la carte « Total élèves »), le bouton principal et le menu
          « Import / Export » à droite — plus rien ne déborde sur mobile. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">
            Gestion des élèves
          </h1>
          <p className="mt-0.5 text-[13px] text-stone-500">
            Ajoutez, importez et suivez les dossiers de vos élèves.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Le seul bouton primaire de la page : l'action du quotidien. */}
          <div className="w-fit">
            <Bouton
              variante="principal"
              icone={LuUserPlus}
              onClick={ouvrirNouveau}
              disabled={ecoleAbsente || chargement}
            >
              Ajouter un élève
            </Bouton>
          </div>
          {/* Les trois actions fichiers regroupées dans un seul menu
              secondaire, avec les libellés courts validés. */}
          <MenuDeroulant
            libelle="Import / Export"
            icone={LuFileSpreadsheet}
            disabled={ecoleAbsente || chargement}
            elements={[
              {
                libelle: "Télécharger le modèle",
                icone: LuDownload,
                action: telechargerModele,
              },
              {
                libelle: "Importer",
                icone: LuUpload,
                action: ouvrirImport,
              },
              {
                libelle: "Exporter",
                icone: LuFileSpreadsheet,
                action: exporter,
                disabled: dossiers.length === 0,
                titre:
                  dossiers.length === 0
                    ? "Aucun élève à exporter pour l'instant."
                    : undefined,
              },
            ]}
          />
        </div>
      </div>

      {/* Cartes du haut — libellés de la maquette. Les deux dernières
          restent honnêtement à « — » tant que le module Inscriptions ne
          porte pas l'historique des dates. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#2d8a6b]">
              <LuUsers size={18} aria-hidden="true" />
            </span>
            <h2 className="text-[13px] font-medium text-stone-500">
              Total élèves
            </h2>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-stone-900">
            {statistiques.total}
            <span className="ml-1.5 text-xs font-medium text-stone-400">
              élève{statistiques.total > 1 ? "s" : ""}
            </span>
          </p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#2d8a6b]">
              <LuLayers size={18} aria-hidden="true" />
            </span>
            <h2 className="text-[13px] font-medium text-stone-500">
              Moyenne d'élèves par classe
            </h2>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-stone-900">
            {statistiques.moyenne === null
              ? "—"
              : statistiques.moyenne.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })}
            <span className="ml-1.5 text-xs font-medium text-stone-400">
              par classe
            </span>
          </p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#2d8a6b]">
              <LuArrowLeftRight size={18} aria-hidden="true" />
            </span>
            <h2 className="text-[13px] font-medium text-stone-500">
              Transférés
            </h2>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-stone-900">
            —
            <span className="ml-1.5 text-xs font-medium text-stone-400">
              avec le module Inscriptions
            </span>
          </p>
          <span
            className="mt-2 inline-flex w-fit items-center gap-1 text-[11.5px] text-stone-400"
            title="Ce compteur sera branché avec le module Inscriptions."
          >
            <LuLock size={12} aria-hidden="true" />
            Bientôt
          </span>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#2d8a6b]">
              <LuUserPlus size={18} aria-hidden="true" />
            </span>
            <h2 className="text-[13px] font-medium text-stone-500">
              Nouveaux élèves
            </h2>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-stone-900">
            —
            <span className="ml-1.5 text-xs font-medium text-stone-400">
              cette année scolaire
            </span>
          </p>
          <span
            className="mt-2 inline-flex w-fit items-center gap-1 text-[11.5px] text-stone-400"
            title="Ce compteur sera branché avec le module Inscriptions."
          >
            <LuLock size={12} aria-hidden="true" />
            Bientôt
          </span>
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
      {erreurChargement ? <MessageErreur>{erreurChargement}</MessageErreur> : null}
      {erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

      {ecoleAbsente ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-stone-600">
            Aucune école n'est encore créée sur cet appareil. Le parcours de
            configuration crée l'école, l'année scolaire et les classes —
            ensuite cette page accueille vos élèves, saisis à la main ou par
            import Excel.
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
          {/* Recherche et filtres — ceux de la maquette : recherche
              nom/matricule, classe, statut, frais (ce dernier arrive avec
              le module Frais scolaires : il est visible mais inactif). */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="relative min-w-[220px] flex-1">
              <LuSearch
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
              />
              <ChampTexte
                className="pl-10"
                placeholder="Rechercher un nom ou un matricule…"
                value={recherche}
                onChange={(evenement) => setRecherche(evenement.target.value)}
                aria-label="Rechercher un élève"
              />
            </div>
            <div className="w-full sm:w-48">
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
            <div className="w-full sm:w-44">
              <ListeDeroulante
                value={filtreStatut}
                onChange={(evenement) =>
                  setFiltreStatut(evenement.target.value)
                }
                options={[
                  { valeur: "tous", libelle: "Tous statuts" },
                  { valeur: "inscrits", libelle: "Inscrits" },
                  { valeur: "sans", libelle: "Sans inscription" },
                ]}
                aria-label="Filtrer par statut"
              />
            </div>
            <div className="w-full sm:w-40">
              <ListeDeroulante
                disabled
                title="Le filtre par frais arrivera avec le module Frais scolaires."
                options={[{ valeur: "tous", libelle: "Tous les frais" }]}
                aria-label="Filtrer par frais (à venir)"
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
                        Ajoutez votre premier élève avec le bouton
                        « Ajouter un élève », ou importez une liste Excel
                        d'un coup avec « Importer Excel » — rien de tout
                        cela n'est obligatoire pour démarrer.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-stone-500">
                      Aucun élève ne correspond à la recherche ou aux
                      filtres.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Élève
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Matricule
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Classe
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Parent
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Statut
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Abs.
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Frais
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
                          <td
                            className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px] text-stone-500"
                            title="Le matricule sera attribué avec le module Inscriptions."
                          >
                            {dossier.matricule ?? "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {classeEnBadge(dossier)}
                          </td>
                          <td className="px-4 py-2.5">
                            {dossier.parent ? (
                              <>
                                <span className="block font-medium text-stone-800">
                                  {dossier.parent.nom_complet}
                                </span>
                                {dossier.parent.telephone ? (
                                  <span className="mt-0.5 block text-[12px] text-stone-500">
                                    {dossier.parent.telephone}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
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
                          <td
                            className="px-4 py-2.5 text-stone-400"
                            title="L'appel des absences arrivera avec le module Absences."
                          >
                            —
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-400"
                              title="Le module frais scolaires arrive avec la facturation."
                            >
                              À venir
                            </span>
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
                                onClick={() => ouvrirSuppression(dossier)}
                                className={cx(lienDangerCls, "shrink-0")}
                                aria-label={`Supprimer le dossier de ${dossier.prenom ?? ""} ${dossier.nom ?? ""}`}
                              >
                                <LuTrash2 size={14} aria-hidden="true" />
                                Supprimer
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Compteur en bas, comme la maquette. */}
              <p className="border-t border-stone-100 px-4 py-2.5 text-center text-[12.5px] text-stone-500">
                Affiche {listeFiltree.length} élève
                {listeFiltree.length > 1 ? "s" : ""} sur {dossiers.length}
              </p>
            </div>

            {/* Panneau d'ajout / de correction / d'import */}
            {panneau ? (
              <aside className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
                {panneau.mode === "import" ? (
                  <>
                    <h2 className="text-sm font-semibold text-stone-900">
                      Importer des élèves depuis Excel
                    </h2>
                    <p className="text-[12.5px] text-stone-500">
                      L'école a pu être créée sans import : ce panneau permet
                      d'importer une liste Excel à tout moment. La lecture se
                      fait intégralement sur cet appareil — rien ne quitte
                      votre école.
                    </p>

                    <button
                      type="button"
                      onClick={telechargerModele}
                      className={zoneDepotCls}
                    >
                      <LuDownload
                        size={20}
                        aria-hidden="true"
                        className="text-[#2d8a6b]"
                      />
                      <strong className="text-sm">
                        Télécharger le modèle Excel
                      </strong>
                      <span className="text-[12.5px] text-stone-500">
                        Vrai fichier .xlsx : colonnes attendues et exemple
                        rempli.
                      </span>
                    </button>

                    <input
                      ref={fichierRef}
                      type="file"
                      hidden
                      accept=".xlsx,.xls,.csv"
                      onChange={(evenement) => {
                        void choisirFichier(
                          evenement.target.files?.[0] ?? null,
                        );
                        evenement.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fichierRef.current?.click()}
                      className={zoneDepotCls}
                    >
                      <LuFileSpreadsheet
                        size={20}
                        aria-hidden="true"
                        className="text-[#2d8a6b]"
                      />
                      <strong className="text-sm">
                        {fichierImport
                          ? fichierImport.name
                          : "Choisir votre fichier Excel"}
                      </strong>
                      <span className="text-[12.5px] text-stone-500">
                        {fichierImport
                          ? "Cliquez pour changer de fichier"
                          : ".xlsx, .xls ou .csv — lecture 100 % sur cet appareil"}
                      </span>
                    </button>

                    {analyseEnCours ? (
                      <p className="text-sm text-stone-500">
                        Lecture du fichier…
                      </p>
                    ) : null}

                    {analyse ? (
                      <div className="flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-3.5">
                        <div className="flex flex-wrap gap-2 text-[12.5px]">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-800">
                            {prets} élève{prets > 1 ? "s" : ""} prêt
                            {prets > 1 ? "s" : ""}
                          </span>
                          {nombreErreurs > 0 ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-red-800">
                              {nombreErreurs} ligne
                              {nombreErreurs > 1 ? "s" : ""} à corriger
                            </span>
                          ) : null}
                          {nombreDoublons > 0 ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800">
                              {nombreDoublons} doublon
                              {nombreDoublons > 1 ? "s" : ""} ignoré
                              {nombreDoublons > 1 ? "s" : ""}
                            </span>
                          ) : null}
                        </div>

                        {analyse.erreurs.length > 0 ? (
                          <ul className="flex max-h-44 flex-col gap-1 overflow-auto rounded-lg bg-red-50 p-2 text-[12.5px] text-red-800">
                            {analyse.erreurs.map((erreurLigne) => (
                              <li
                                key={`erreur-${erreurLigne.ligne}-${erreurLigne.message}`}
                              >
                                Ligne {erreurLigne.ligne} —{" "}
                                {erreurLigne.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {analyse.doublons.length > 0 ? (
                          <ul className="flex max-h-44 flex-col gap-1 overflow-auto rounded-lg bg-amber-50 p-2 text-[12.5px] text-amber-800">
                            {analyse.doublons.map((doublon) => (
                              <li
                                key={`doublon-${doublon.ligne}-${doublon.prenom}-${doublon.nom}`}
                              >
                                Ligne {doublon.ligne} —{" "}
                                {doublon.nom.toUpperCase()} {doublon.prenom} (
                                {doublon.motif === "base"
                                  ? "déjà enregistré"
                                  : "déjà vu dans le fichier"}
                                )
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <Bouton
                          icone={LuUpload}
                          onClick={() => void importerValides()}
                          disabled={prets === 0 || importEnCours}
                          enCours={importEnCours}
                        >
                          {prets > 0
                            ? `Importer les ${prets} élèves prêts`
                            : "Rien à importer"}
                        </Bouton>
                      </div>
                    ) : null}

                    <Bouton variante="fantome" onClick={fermerPanneau}>
                      Fermer
                    </Bouton>
                  </>
                ) : (
                  <>
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

                      <Champ
                        label="Téléphone du parent"
                        hint={hintTelephone}
                      >
                        <div className="flex gap-2">
                          {/* Indicatif du Congo-Brazzaville, affiché une fois
                              pour toutes : l'utilisateur ne tape que le
                              numéro local (06…). */}
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
                    </div>

                    {panneau.mode === "edition" ? (
                      <p className="text-[12.5px] text-stone-500">
                        La base conserve chaque affectation et chaque
                        relation au moins un jour : un changement de classe
                        ou de parent visé le jour même d'une création
                        prendra effet à partir de demain.
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
                  </>
                )}
              </aside>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Fenêtre de confirmation de « Supprimer » : elle dit exactement
          ce qui va se passer (annulation d'inscription, rien n'est
          effacé) et rien n'est écrit tant qu'elle n'est pas confirmée. */}
      {suppression ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-suppression"
          onClick={() => setSuppression(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(evenement) => evenement.stopPropagation()}
          >
            <h2
              id="titre-suppression"
              className="text-base font-bold text-stone-900"
            >
              Supprimer le dossier de{" "}
              {(suppression.dossier.nom ?? "").toUpperCase()}{" "}
              {suppression.dossier.prenom ?? ""} ?
            </h2>
            <p className="mt-2 text-[13.5px] text-stone-600">
              Ce bouton annule l'inscription de l'élève pour l'année en
              cours : il sort de la liste active de l'école dès la
              confirmation.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-stone-600">
              <li>
                Rien n'est effacé : nom, matricule, classe, dates et parent
                restent conservés dans la base de votre école.
              </li>
              <li>
                Un élève n'est jamais supprimé physiquement : c'est la règle
                d'or de l'application, l'historique reste intact.
              </li>
              <li>
                L'élève disparaît de cette liste et des effectifs dès
                maintenant.
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void confirmerSuppression()}
                disabled={suppressionEnCours}
                className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-red-700 px-5 font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suppressionEnCours
                  ? "Annulation en cours…"
                  : "Oui, annuler son inscription"}
              </button>
              <Bouton variante="fantome" onClick={() => setSuppression(null)}>
                Non, le garder
              </Bouton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
