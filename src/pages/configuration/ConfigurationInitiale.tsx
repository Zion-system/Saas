import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCheck } from "react-icons/lu";
import { servicesElevesResponsables } from "../../services/eleves-responsables";
import type { DossierEleve } from "../../services/eleves-responsables";
import { servicesOrganisationScolaire } from "../../services/organisation-scolaire";
import {
  analyserEleves,
  lireLignesBrutes,
} from "../../utils/import-eleves";
import type { ResultatAnalyse } from "../../utils/import-eleves";
import type { ClasseAnnuelle } from "../../services/organisation-scolaire";
import {
  MessageErreur,
  NoteEnAttente,
} from "./composants";
import {
  EtapeClasses,
  EtapeEcole,
  EtapeEleves,
  EtapeEquipe,
  EtapeFrais,
  EtapeTermine,
} from "./etapes";
import type { LigneResume } from "./etapes";
import {
  ANNEE_DEFAUT,
  construireCatalogueLibelles,
  cx,
  ETAPES,
  ID_ETABLISSEMENT,
  PERIODES_PAR_DECOUPAGE,
  nouveauBareme,
  slugifier,
} from "./donnees";
import { normaliserComparaison } from "../../utils/import-eleves";
import { telephoneCompose } from "../../utils/telephone";
import type {
  CleSystemeClasses,
  DonneesEcole,
  DonneesEleves,
  EleveBrouillon,
  DonneesFrais,
  MembreEquipe,
} from "./donnees";

/**
 * Parcours « Configuration initiale » en 6 étapes (maquette vidéo) :
 * École → Classes → Frais → Élèves → Équipe → Terminé.
 *
 * Branchement réel (enregistré en base) : École (établissement, année
 * scolaire, périodes), Classes (niveaux, modèles, classes annuelles) et
 * Élèves (dossier complet : élève + inscription + affectation de classe +
 * responsable — migration 019), à la main ou par import de fichier Excel.
 * Étapes affichées mais en attente de leurs modules : Frais (facturation,
 * carnet de gouvernance G-02 à G-08) et Équipe (invitations, base
 * distante) — un bandeau d'honnêteté l'indique.
 *
 * Accessible sans connexion tant que AUTH_DESACTIVEE_TEMPORAIREMENT est
 * armé ; l'application redirige ici au démarrage tant qu'aucune école
 * n'existe.
 */

function messageErreur(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Erreur inattendue.";
}

const DONNEES_ECOLE_VIERGES: DonneesEcole = {
  nom: "",
  langue: "Français seulement",
  libelle: ANNEE_DEFAUT.libelle,
  debut: ANNEE_DEFAUT.debut,
  fin: ANNEE_DEFAUT.fin,
  decoupage: "3 trimestres",
};

/** Convertit un dossier lu en base en ligne affichable à l'étape 4. */
function dossierVersBrouillon(
  dossier: DossierEleve,
  libelleClasse: string | null,
): EleveBrouillon {
  return {
    id: dossier.id_eleve,
    prenom: dossier.prenom ?? "",
    nom: dossier.nom ?? "",
    sexe: dossier.genre ?? "",
    classe: libelleClasse ?? "Sans classe pour l'instant",
    parent: "",
    telephone: "",
  };
}

export function ConfigurationInitiale() {
  const navigate = useNavigate();

  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [etape, setEtape] = useState(0);

  // Étape 1 — École (champs de la maquette)
  const [donneesEcole, setDonneesEcole] = useState<DonneesEcole>(
    DONNEES_ECOLE_VIERGES,
  );

  // État en base
  const [idEtablissement, setIdEtablissement] = useState<string | null>(null);
  const [idAnnee, setIdAnnee] = useState<string | null>(null);
  const [classesExistantes, setClassesExistantes] = useState<ClasseAnnuelle[]>(
    [],
  );

  // Étape 2 — Classes (système congolais par défaut)
  const [systeme, setSysteme] = useState<CleSystemeClasses>("congolais");
  const [selection, setSelection] = useState<string[]>([]);
  const [autresClasses, setAutresClasses] = useState<string[]>([]);

  // Étapes 3 à 5 — données préparatoires (non enregistrées pour l'instant)
  const [donneesFrais, setDonneesFrais] = useState<DonneesFrais>({
    baremes: [nouveauBareme()],
    inscription: { mode: "meme", montant: "", parClasse: {} },
  });
  const [donneesEleves, setDonneesEleves] = useState<DonneesEleves>({
    liste: [],
    fichier: null,
  });
  const [analyse, setAnalyse] = useState<ResultatAnalyse | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [importEnCours, setImportEnCours] = useState(false);
  const [equipe, setEquipe] = useState<MembreEquipe[]>([]);

  /** Catalogue slug → libellé, pour afficher les classes choisies. */
  const catalogue = useMemo(
    () => construireCatalogueLibelles(autresClasses),
    [autresClasses],
  );

  const libellesSelectionnes = useMemo(
    () => selection.map((slug) => catalogue.get(slug) ?? slug),
    [selection, catalogue],
  );

  /** id de classe annuelle → libellé affiché (classes réellement créées). */
  const idVersLibelleClasse = useMemo(() => {
    const correspondance = new Map<string, string>();
    for (const classe of classesExistantes) {
      correspondance.set(
        classe.id_classe_annuelle,
        catalogue.get(classe.id_classe_annuelle) ??
          classe.id_classe_annuelle,
      );
    }
    return correspondance;
  }, [classesExistantes, catalogue]);

  /** libellé affiché → id de classe annuelle (pour enregistrer en base). */
  const libelleVersIdClasse = useMemo(
    () =>
      new Map(
        [...idVersLibelleClasse.entries()].map(([id, libelle]) => [
          libelle,
          id,
        ]),
      ),
    [idVersLibelleClasse],
  );

  const charger = useCallback(async () => {
    try {
      const etablissements =
        await servicesOrganisationScolaire.etablissements.lister();
      const premier = etablissements[0] ?? null;
      setIdEtablissement(premier?.id_etablissement ?? null);

      if (!premier) {
        setChargement(false);
        return;
      }

      setDonneesEcole((precedent) => ({
        ...precedent,
        nom: premier.nom || "",
      }));

      const annees =
        await servicesOrganisationScolaire.anneesScolaires.listerParEtablissement(
          premier.id_etablissement,
        );
      const annee = annees[0] ?? null;

      if (!annee) {
        setChargement(false);
        return;
      }

      setIdAnnee(annee.id_annee_scolaire);
      setDonneesEcole((precedent) => ({
        ...precedent,
        libelle: annee.libelle || annee.id_annee_scolaire,
        debut: annee.date_debut || precedent.debut,
        fin: annee.date_fin || precedent.fin,
      }));

      const [periodesRows, classesRows] = await Promise.all([
        servicesOrganisationScolaire.periodesPedagogiques.listerParAnnee(
          annee.id_annee_scolaire,
        ),
        servicesOrganisationScolaire.classesAnnuelles.listerParAnnee(
          annee.id_annee_scolaire,
          premier.id_etablissement,
        ),
      ]);
      if (periodesRows.length === 1) {
        setDonneesEcole((precedent) => ({
          ...precedent,
          decoupage: "Année complète",
        }));
      } else if (periodesRows.length === 2) {
        setDonneesEcole((precedent) => ({
          ...precedent,
          decoupage: "2 semestres",
        }));
      } else if (periodesRows.length === 3) {
        setDonneesEcole((precedent) => ({
          ...precedent,
          decoupage: "3 trimestres",
        }));
      }

      setClassesExistantes(classesRows);
      setSelection(classesRows.map((classe) => classe.id_classe_annuelle));

      // Libellés des classes conservés en base (migration 020) : on
      // restaure la liste des classes « autres » d'une session passée
      // (« Première A » s'affiche à nouveau en toutes lettres) et on
      // complète une fois pour toutes les modèles du catalogue officiel
      // créés avant la migration. Ceux qui n'ont pas de libellé connu
      // gardent leur identifiant technique en repli.
      const catalogueSysteme = construireCatalogueLibelles([]);
      const modelesRows =
        await servicesOrganisationScolaire.modelesClasse.lister();
      const autresRestaurees: string[] = [];
      for (const modele of modelesRows) {
        if (modele.libelle) {
          if (!catalogueSysteme.has(modele.id_modele_classe)) {
            autresRestaurees.push(modele.libelle);
          }
        } else {
          const libelleSysteme = catalogueSysteme.get(modele.id_modele_classe);
          if (libelleSysteme) {
            await servicesOrganisationScolaire.modelesClasse.definirLibelle(
              modele.id_modele_classe,
              libelleSysteme,
            );
          }
        }
      }
      setAutresClasses(autresRestaurees);

      // Dossiers élèves déjà enregistrés (retour dans le parcours après
      // fermeture de l'application). Le repli combine le catalogue
      // officiel et les classes « autres » restaurées ci-dessus.
      const dossiers =
        await servicesElevesResponsables.dossiers.listerParEtablissement(
          premier.id_etablissement,
        );
      const catalogueRepli = construireCatalogueLibelles(autresRestaurees);
      setDonneesEleves({
        liste: dossiers.map((dossier) =>
          dossierVersBrouillon(
            dossier,
            dossier.id_classe_annuelle
              ? catalogueRepli.get(dossier.id_classe_annuelle) ??
                  dossier.id_classe_annuelle
              : null,
          ),
        ),
        fichier: null,
      });
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    const minuteur = window.setTimeout(() => {
      void charger();
    }, 0);
    return () => window.clearTimeout(minuteur);
  }, [charger]);

  /** Étape 1 — crée (ou met à jour) école + année scolaire + périodes. */
  async function enregistrerEcole() {
    if (donneesEcole.nom.trim() === "") {
      setErreur("Indiquez le nom de votre école.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    setInfo(null);
    try {
      let idEtab = idEtablissement;
      if (!idEtab) {
        const etab = await servicesOrganisationScolaire.etablissements.creer({
          id_etablissement: ID_ETABLISSEMENT,
          nom: donneesEcole.nom.trim(),
        });
        idEtab = etab.id_etablissement;
      } else {
        await servicesOrganisationScolaire.etablissements.definirNom(
          idEtab,
          donneesEcole.nom.trim(),
        );
      }
      setIdEtablissement(idEtab);

      let anneeId = idAnnee;
      if (!anneeId) {
        const annee =
          await servicesOrganisationScolaire.anneesScolaires.creer({
            id_annee_scolaire: donneesEcole.libelle.trim(),
            id_etablissement: idEtab,
            libelle: donneesEcole.libelle.trim(),
            date_debut: donneesEcole.debut,
            date_fin: donneesEcole.fin,
          });
        anneeId = annee.id_annee_scolaire;
      } else {
        await servicesOrganisationScolaire.anneesScolaires.modifier(anneeId, {
          id_annee_scolaire: anneeId,
          id_etablissement: idEtab,
          libelle: donneesEcole.libelle.trim(),
          date_debut: donneesEcole.debut,
          date_fin: donneesEcole.fin,
        });
      }
      setIdAnnee(anneeId);

      const periodesExistantes =
        await servicesOrganisationScolaire.periodesPedagogiques.listerParAnnee(
          anneeId,
        );
      if (periodesExistantes.length === 0) {
        const modele = PERIODES_PAR_DECOUPAGE[donneesEcole.decoupage];
        for (const periode of modele) {
          await servicesOrganisationScolaire.periodesPedagogiques.creer({
            id_periode: periode.id,
            id_annee_scolaire: anneeId,
            libelle: periode.libelle,
            ordre: periode.ordre,
          });
        }
      } else {
        const attendues = PERIODES_PAR_DECOUPAGE[donneesEcole.decoupage].length;
        if (periodesExistantes.length !== attendues) {
          setInfo(
            "Des périodes existent déjà pour cette année : elles ont été conservées.",
          );
        }
      }

      setEtape(1);
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setEnCours(false);
    }
  }

  /** Étape 2 — crée niveau + modèle + classe annuelle pour chaque choix. */
  async function enregistrerClasses() {
    if (!idEtablissement || !idAnnee) {
      setErreur("Créez d'abord votre école à l'étape précédente.");
      return;
    }
    if (selection.length === 0) {
      setErreur("Choisissez au moins une classe pour continuer.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const niveaux = new Set(
        (
          await servicesOrganisationScolaire.niveauxEnseignement.lister()
        ).map((niveau) => normaliserComparaison(niveau.id_niveau)),
      );
      const modeles = new Set(
        (
          await servicesOrganisationScolaire.modelesClasse.lister()
        ).map((modele) => normaliserComparaison(modele.id_modele_classe)),
      );
      // Anciennes sessions : la sélection pouvait mélanger slugs et
      // libellés bruts. La comparaison normalisée (accents/casse ignorés)
      // empêche de créer deux fois la même classe.
      const dejaLa = new Set(
        classesExistantes.map((classe) =>
          normaliserComparaison(classe.id_classe_annuelle),
        ),
      );

      for (const slug of selection) {
        const cle = normaliserComparaison(slug);
        if (!niveaux.has(cle)) {
          await servicesOrganisationScolaire.niveauxEnseignement.creer({
            id_niveau: slug,
          });
          niveaux.add(cle);
        }
        if (!modeles.has(cle)) {
          await servicesOrganisationScolaire.modelesClasse.creer({
            id_modele_classe: slug,
            // Le libellé saisi est conservé en base (migration 020) :
            // il resservira après fermeture et relance de l'application.
            libelle: catalogue.get(slug) ?? null,
          });
          modeles.add(cle);
        }
        if (!dejaLa.has(cle)) {
          await servicesOrganisationScolaire.classesAnnuelles.creer({
            id_classe_annuelle: slug,
            id_annee_scolaire: idAnnee,
            id_niveau: slug,
            id_modele_classe: slug,
            id_etablissement: idEtablissement,
          });
        }
      }

      setClassesExistantes(
        await servicesOrganisationScolaire.classesAnnuelles.listerParAnnee(
          idAnnee,
          idEtablissement,
        ),
      );
      setEtape(2);
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setEnCours(false);
    }
  }

  /** Étape 3 — les barèmes ne sont pas encore enregistrés (facturation). */
  function continuerFrais() {
    setErreur(null);
    setEtape(3);
  }

  /** Étape 4 — l'import étant facultatif, on avance dans tous les cas. */
  function continuerEleves() {
    setErreur(null);
    setEtape(4);
  }

  /** Étape 4 — enregistre un élève ajouté à la main (dossier complet). */
  async function enregistrerEleve(
    donnee: Omit<EleveBrouillon, "id">,
  ): Promise<boolean> {
    if (!idEtablissement || !idAnnee) {
      setErreur("Créez d'abord votre école à l'étape précédente.");
      return false;
    }
    setErreur(null);
    try {
      await servicesElevesResponsables.dossiers.creer({
        id_etablissement: idEtablissement,
        id_annee_scolaire: idAnnee,
        prenom: donnee.prenom,
        nom: donnee.nom,
        genre:
          donnee.sexe === "F" || donnee.sexe === "M" ? donnee.sexe : null,
        id_classe_annuelle:
          donnee.classe !== ""
            ? (libelleVersIdClasse.get(donnee.classe) ?? null)
            : null,
        parent:
          donnee.parent.trim() !== ""
            ? {
                nom_complet: donnee.parent,
                // Numéro local saisi à l'étape précédente : l'indicatif
                // +242 est ajouté ici, au moment d'écrire en base.
                telephone: telephoneCompose(donnee.telephone),
              }
            : null,
      });
      await rafraichirEleves(idEtablissement);
      return true;
    } catch (error) {
      setErreur(messageErreur(error));
      return false;
    }
  }

  /** Étape 4 — retire un élève : annulation de l'inscription (jamais une suppression). */
  async function retirerEleve(id: string): Promise<void> {
    if (!idEtablissement) return;
    setErreur(null);
    try {
      await servicesElevesResponsables.dossiers.annuler(id, idEtablissement);
      await rafraichirEleves(idEtablissement);
    } catch (error) {
      setErreur(messageErreur(error));
    }
  }

  async function rafraichirEleves(idEtab: string): Promise<void> {
    const dossiers =
      await servicesElevesResponsables.dossiers.listerParEtablissement(
        idEtab,
      );
    setDonneesEleves((precedent) => ({
      ...precedent,
      liste: dossiers.map((dossier) =>
        dossierVersBrouillon(
          dossier,
          dossier.id_classe_annuelle
            ? (idVersLibelleClasse.get(dossier.id_classe_annuelle) ??
              dossier.id_classe_annuelle)
            : null,
        ),
      ),
    }));
  }

  /** Étape 4 — fichier choisi : lecture locale puis contrôle ligne par ligne. */
  async function choisirFichier(fichier: File | null): Promise<void> {
    setErreur(null);
    setAnalyse(null);
    setDonneesEleves((precedent) => ({ ...precedent, fichier }));
    if (!fichier) return;
    setAnalyseEnCours(true);
    try {
      const lignes = await lireLignesBrutes(fichier);
      setAnalyse(
        analyserEleves(lignes, {
          libellesClasses: libellesSelectionnes,
          existants: donneesEleves.liste.map((eleve) => ({
            prenom: eleve.prenom,
            nom: eleve.nom,
            classe:
              eleve.classe === "Sans classe pour l'instant" ? null : eleve.classe,
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
  }

  /** Étape 4 — enregistre les élèves valides du fichier choisi. */
  async function importerValides(): Promise<void> {
    if (!idEtablissement || !idAnnee) {
      setErreur("Créez d'abord votre école à l'étape précédente.");
      return;
    }
    if (!analyse || analyse.prets.length === 0) return;
    setImportEnCours(true);
    setErreur(null);
    try {
      for (const pret of analyse.prets) {
        await servicesElevesResponsables.dossiers.creer({
          id_etablissement: idEtablissement,
          id_annee_scolaire: idAnnee,
          prenom: pret.prenom,
          nom: pret.nom,
          genre: pret.genre,
          id_classe_annuelle: pret.classe
            ? (libelleVersIdClasse.get(pret.classe) ?? null)
            : null,
          parent: pret.parent
            ? { nom_complet: pret.parent, telephone: pret.telephone }
            : null,
        });
      }
      await rafraichirEleves(idEtablissement);
      setDonneesEleves((precedent) => ({ ...precedent, fichier: null }));
      setAnalyse(null);
    } catch (error) {
      setErreur(
        `${messageErreur(error)} — les élèves déjà enregistrés le sont restés ; corrigez le fichier et réimportez le reste.`,
      );
      await rafraichirEleves(idEtablissement).catch(() => undefined);
    } finally {
      setImportEnCours(false);
    }
  }

  /** Étape 5 — la liste d'équipe est une préparation (base distante). */
  function continuerEquipe() {
    setErreur(null);
    setEtape(5);
  }

  function retournerEtapePrecedente() {
    setErreur(null);
    setInfo(null);
    setEtape((precedent) => Math.max(precedent - 1, 0));
  }

  function changerSysteme(cle: CleSystemeClasses) {
    setErreur(null);
    setSysteme(cle);
    // Changement de système : on repart d'une sélection vierge (les
    // classes ajoutées à la main restent proposées dans « Autres »).
    setSelection([]);
  }

  function ajouterClasseAutre(libelle: string) {
    setErreur(null);
    const propre = libelle.trim();
    if (propre === "") return;
    if (!autresClasses.includes(propre)) {
      setAutresClasses([...autresClasses, propre]);
    }
    const slug = slugifier(propre);
    if (!selection.includes(slug)) {
      setSelection([...selection, slug]);
    }
  }

  const lignesResume: LigneResume[] = [
    {
      libelle: "École",
      valeur: donneesEcole.nom || "—",
      etat: "enregistre",
    },
    {
      libelle: "Année scolaire",
      valeur: `${donneesEcole.libelle} · ${donneesEcole.decoupage}`,
      etat: "enregistre",
    },
    {
      libelle: "Classes",
      valeur: `${libellesSelectionnes.length} créée${
        libellesSelectionnes.length > 1 ? "s" : ""
      }`,
      etat: "enregistre",
    },
    {
      libelle: "Barèmes de frais",
      valeur: `${
        donneesFrais.baremes.filter((b) => b.intitule.trim() !== "").length
      } défini(s)`,
      etat: "enAttente",
    },
    {
      libelle: "Élèves",
      valeur:
        donneesEleves.liste.length > 0
          ? `${donneesEleves.liste.length} élève${
              donneesEleves.liste.length > 1 ? "s" : ""
            } enregistré${donneesEleves.liste.length > 1 ? "s" : ""}`
          : "Étape passée (aucun élève)",
      etat: "enregistre",
    },
    {
      libelle: "Équipe",
      valeur: `${equipe.length} invité(s)`,
      etat: "enAttente",
    },
  ];

  const progression = Math.round(((etape + 1) / ETAPES.length) * 100);
  const etapeDef = ETAPES[etape] ?? ETAPES[0];

  return (
    <div className="grid min-h-screen bg-[#faf8f4] text-[15px] leading-snug text-stone-900 lg:grid-cols-[300px_1fr]">
      {/* Barre latérale de progression (maquette vidéo) */}
      <aside className="flex flex-wrap items-center gap-4 bg-[#171613] px-5 py-4 text-stone-200 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-9 lg:px-7 lg:py-8">
        <div className="hidden lg:block">
          <p className="mb-2.5 text-xs text-stone-500">
            Configuration initiale
          </p>
          <h2 className="text-2xl font-semibold">Bienvenue !</h2>
          <p className="mt-1.5 text-sm text-stone-400">
            Configurons votre école en quelques minutes.
          </p>
        </div>

        <ol className="flex flex-1 gap-4 overflow-x-auto lg:flex-none lg:flex-col lg:gap-0 lg:overflow-visible">
          {ETAPES.map((etapeListee, index) => {
            const finie = index < etape;
            const active = index === etape;
            const Icone = etapeListee.icone;
            return (
              <li
                key={etapeListee.cle}
                aria-current={active ? "step" : undefined}
                className={cx(
                  "relative flex items-center gap-2.5 whitespace-nowrap text-[13px] lg:gap-3.5 lg:py-[11px] lg:text-[15px]",
                  active
                    ? "font-semibold text-white"
                    : finie
                      ? "text-stone-300"
                      : "text-stone-500",
                )}
              >
                <span
                  className={cx(
                    "grid size-8 shrink-0 place-items-center rounded-full border",
                    finie && "border-[#2d8a6b] bg-[#2d8a6b] text-white",
                    active &&
                      "border-[#2d8a6b] bg-[#0f2a21] text-emerald-300 ring-4 ring-[#2d8a6b]/20",
                    !finie && !active && "border-stone-800 bg-stone-900",
                  )}
                >
                  {finie ? (
                    <LuCheck size={15} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <Icone size={16} aria-hidden="true" />
                  )}
                </span>
                {etapeListee.label}
                {index < ETAPES.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cx(
                      "absolute left-[15px] top-[46px] hidden h-3.5 w-0.5 lg:block",
                      finie ? "bg-[#2d8a6b]" : "bg-stone-800",
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="w-full text-xs text-stone-500 lg:mt-auto">
          <div className="mb-2 flex justify-between">
            <span>Progression</span>
            <span>{progression} %</span>
          </div>
          <div className="h-1 overflow-hidden rounded bg-stone-800">
            <div
              className="h-full bg-[#2d8a6b] transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progression}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Contenu de l'étape */}
      <main className="flex justify-center px-4 py-7 sm:px-8 lg:py-12">
        <div className="flex w-full max-w-[640px] flex-col gap-[18px]">
          <header className="mb-2">
            <h1 className="text-[26px] font-semibold tracking-tight">
              {etapeDef.titre}
            </h1>
            <p className="mt-1 text-sm text-stone-500">{etapeDef.sousTitre}</p>
          </header>

          {chargement ? (
            <p className="text-sm text-stone-500">
              Chargement de votre école…
            </p>
          ) : null}

          {info ? <NoteEnAttente>{info}</NoteEnAttente> : null}
          {erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

          {etape === 0 ? (
            <EtapeEcole
              donnees={donneesEcole}
              onChanger={(nouvelles) => {
                setErreur(null);
                setDonneesEcole(nouvelles);
              }}
              onContinuer={() => void enregistrerEcole()}
              enCours={enCours}
            />
          ) : null}

          {etape === 1 ? (
            <EtapeClasses
              systeme={systeme}
              selection={selection}
              autresClasses={autresClasses}
              onSysteme={changerSysteme}
              onSelection={(nouvelle) => {
                setErreur(null);
                setSelection(nouvelle);
              }}
              onAjouterAutre={ajouterClasseAutre}
              onContinuer={() => void enregistrerClasses()}
              onRetour={retournerEtapePrecedente}
              enCours={enCours}
            />
          ) : null}

          {etape === 2 ? (
            <EtapeFrais
              donnees={donneesFrais}
              classesDisponibles={libellesSelectionnes}
              onChanger={(nouvelles) => {
                setErreur(null);
                setDonneesFrais(nouvelles);
              }}
              onContinuer={continuerFrais}
              onRetour={retournerEtapePrecedente}
              enCours={enCours}
            />
          ) : null}

          {etape === 3 ? (
            <EtapeEleves
              donnees={donneesEleves}
              classesDisponibles={libellesSelectionnes}
              analyse={analyse}
              analyseEnCours={analyseEnCours}
              importEnCours={importEnCours}
              onFichierChoisi={(fichier) => void choisirFichier(fichier)}
              onImporterValides={() => void importerValides()}
              onAjouter={enregistrerEleve}
              onRetirer={retirerEleve}
              onContinuer={continuerEleves}
              onRetour={retournerEtapePrecedente}
              enCours={enCours}
            />
          ) : null}

          {etape === 4 ? (
            <EtapeEquipe
              membres={equipe}
              onChanger={(nouveaux) => {
                setErreur(null);
                setEquipe(nouveaux);
              }}
              onContinuer={continuerEquipe}
              onRetour={retournerEtapePrecedente}
              enCours={enCours}
            />
          ) : null}

          {etape === 5 ? (
            <EtapeTermine
              lignes={lignesResume}
              onTerminer={() => navigate("/")}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
