import { useCallback, useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaCalendarAlt,
  FaCheck,
  FaChalkboard,
  FaEdit,
  FaExclamationTriangle,
  FaLayerGroup,
  FaPlus,
  FaSchool,
  FaSyncAlt,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Carte } from "../../components/ui/Carte";
import { NOM_ECOLE } from "../../config/ecole";
import { servicesOrganisationScolaire } from "../../services/organisation-scolaire";
import type {
  AnneeScolaire,
  ClasseAnnuelle,
  Etablissement,
  StatutAnneeScolaire,
} from "../../services/organisation-scolaire";

type Onglet = "annees" | "referentiels" | "classes";
type TypeMessage = "succes" | "erreur";

interface Message {
  type: TypeMessage;
  texte: string;
}

interface Confirmation {
  titre: string;
  message: string;
  action: () => Promise<void>;
}

const CLASSES_CHAMP =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-vert-moyen focus:outline-none focus:ring-2 focus:ring-vert-moyen/30";

function messageErreur(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inattendue.";
}

function libelleStatut(statut: StatutAnneeScolaire): string {
  switch (statut) {
    case "PREPAREE":
      return "Préparée";
    case "OUVERTE":
      return "Ouverte";
    case "CLOTUREE":
      return "Clôturée";
    case "ARCHIVEE":
      return "Archivée";
  }
}

function varianteStatut(statut: StatutAnneeScolaire): "bientot" | "neutre" {
  return statut === "OUVERTE" ? "bientot" : "neutre";
}

interface GestionReferentielProps {
  titre: string;
  description: string;
  icone: IconType;
  items: string[];
  onAjouter: (id: string) => Promise<void>;
  onRenommer: (ancien: string, nouveau: string) => Promise<void>;
  onSupprimer: (id: string) => Promise<void>;
  demanderConfirmation: (confirmation: Confirmation) => void;
}

function GestionReferentiel({
  titre,
  description,
  icone: Icone,
  items,
  onAjouter,
  onRenommer,
  onSupprimer,
  demanderConfirmation,
}: GestionReferentielProps) {
  const [saisie, setSaisie] = useState("");
  const [edition, setEdition] = useState<{ id: string; valeur: string } | null>(
    null,
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function executer(action: () => Promise<void>) {
    setEnCours(true);
    setErreur(null);
    try {
      await action();
    } catch (error) {
      setErreur(messageErreur(error));
    } finally {
      setEnCours(false);
    }
  }

  function ajouter() {
    const id = saisie.trim();
    if (!id) {
      setErreur("L'identifiant est obligatoire.");
      return;
    }
    void executer(async () => {
      await onAjouter(id);
      setSaisie("");
    });
  }

  function demarrerEdition(id: string) {
    setEdition({ id, valeur: id });
    setErreur(null);
  }

  function enregistrerEdition() {
    if (!edition) return;
    const ancien = edition.id;
    const nouveau = edition.valeur.trim();
    if (!nouveau) {
      setErreur("Le nouvel identifiant est obligatoire.");
      return;
    }
    if (nouveau === ancien) {
      setEdition(null);
      return;
    }
    void executer(async () => {
      await onRenommer(ancien, nouveau);
      setEdition(null);
    });
  }

  function demanderSuppression(id: string) {
    demanderConfirmation({
      titre: `Supprimer « ${id} »`,
      message: `Cette action supprimera définitivement le référentiel « ${id} » de ${titre.toLowerCase()}. Elle est refusée par la base si des données l'utilisent encore.`,
      action: () => onSupprimer(id),
    });
  }

  return (
    <Carte className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vert-moyen/10 text-vert-moyen">
          <Icone className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-stone-900">{titre}</h3>
          <p className="mt-0.5 text-xs text-stone-500">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className={CLASSES_CHAMP}
          value={saisie}
          onChange={(event) => setSaisie(event.target.value)}
          placeholder={`Nouvel identifiant (${titre.toLowerCase()})`}
          aria-label={`Nouvel identifiant ${titre}`}
        />
        <Button
          type="button"
          variant="vert"
          size="sm"
          onClick={ajouter}
          isLoading={enCours}
        >
          <FaPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Ajouter
        </Button>
      </div>

      {erreur && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200"
        >
          {erreur}
        </p>
      )}

      <ul className="mt-4 divide-y divide-stone-100">
        {items.length === 0 && (
          <li className="py-4 text-center text-xs text-stone-400">
            Aucun élément pour le moment.
          </li>
        )}
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 py-2.5">
            {edition?.id === item ? (
              <>
                <input
                  className={`${CLASSES_CHAMP} flex-1`}
                  value={edition.valeur}
                  onChange={(event) =>
                    setEdition({ id: item, valeur: event.target.value })
                  }
                  aria-label={`Renommer ${item}`}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={enregistrerEdition}
                  isLoading={enCours}
                  aria-label="Enregistrer"
                >
                  <FaCheck className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEdition(null)}
                  aria-label="Annuler"
                >
                  <FaTimes className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
                  {item}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => demarrerEdition(item)}
                  aria-label={`Renommer ${item}`}
                >
                  <FaEdit className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => demanderSuppression(item)}
                  aria-label={`Supprimer ${item}`}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  <FaTrash className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Carte>
  );
}

interface FormClasse {
  id_classe_annuelle: string;
  id_niveau: string;
  id_modele_classe: string;
  capacite_max: string;
}

const FORM_CLASSE_VIDE: FormClasse = {
  id_classe_annuelle: "",
  id_niveau: "",
  id_modele_classe: "",
  capacite_max: "",
};

export function Organisation() {
  const [onglet, setOnglet] = useState<Onglet>("annees");
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);
  const [nouvelEtablissement, setNouvelEtablissement] = useState(
    "etablissement-principal",
  );

  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState("");
  const [nouvelleAnnee, setNouvelleAnnee] = useState("");
  const [formAnneeOuvert, setFormAnneeOuvert] = useState(false);

  const [cycles, setCycles] = useState<string[]>([]);
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [modeles, setModeles] = useState<string[]>([]);

  const [classes, setClasses] = useState<ClasseAnnuelle[]>([]);
  const [formClasse, setFormClasse] = useState<FormClasse>(FORM_CLASSE_VIDE);
  const [classeEdition, setClasseEdition] = useState<string | null>(null);

  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const chargerReferentiels = useCallback(async () => {
    const [cyclesRows, niveauxRows, modelesRows] = await Promise.all([
      servicesOrganisationScolaire.cyclesEnseignement.lister(),
      servicesOrganisationScolaire.niveauxEnseignement.lister(),
      servicesOrganisationScolaire.modelesClasse.lister(),
    ]);
    setCycles(cyclesRows.map((item) => item.id_cycle));
    setNiveaux(niveauxRows.map((item) => item.id_niveau));
    setModeles(modelesRows.map((item) => item.id_modele_classe));
  }, []);

  const chargerAnnees = useCallback(async (idEtablissement: string) => {
    const liste = await servicesOrganisationScolaire.anneesScolaires.listerParEtablissement(
      idEtablissement,
    );
    setAnnees(liste);
    setAnneeSelectionnee((precedent) =>
      liste.some((item) => item.id_annee_scolaire === precedent)
        ? precedent
        : (liste[0]?.id_annee_scolaire ?? ""),
    );
  }, []);

  const chargerClasses = useCallback(
    async (idEtablissement: string, idAnnee: string) => {
      if (!idAnnee) {
        await Promise.resolve();
        setClasses([]);
        return;
      }
      setClasses(
        await servicesOrganisationScolaire.classesAnnuelles.listerParAnnee(
          idAnnee,
          idEtablissement,
        ),
      );
    },
    [],
  );

  const charger = useCallback(async () => {
    try {
      const listeEtablissements =
        await servicesOrganisationScolaire.etablissements.lister();
      setEtablissements(listeEtablissements);

      const idEtablissement =
        etablissementId ?? listeEtablissements[0]?.id_etablissement ?? null;
      setEtablissementId(idEtablissement);

      if (idEtablissement) {
        await Promise.all([
          chargerAnnees(idEtablissement),
          chargerReferentiels(),
        ]);
      } else {
        setAnnees([]);
        setClasses([]);
        setCycles([]);
        setNiveaux([]);
        setModeles([]);
        setAnneeSelectionnee("");
      }
    } catch (error) {
      setMessage({ type: "erreur", texte: messageErreur(error) });
    } finally {
      setChargement(false);
    }
  }, [chargerAnnees, chargerReferentiels, etablissementId]);

  useEffect(() => {
    const minuteur = window.setTimeout(() => {
      void charger();
    }, 0);
    return () => window.clearTimeout(minuteur);
  }, [charger]);

  useEffect(() => {
    if (!etablissementId) return;
    const minuteur = window.setTimeout(() => {
      chargerClasses(etablissementId, anneeSelectionnee).catch(
        (error: unknown) =>
          setMessage({ type: "erreur", texte: messageErreur(error) }),
      );
    }, 0);
    return () => window.clearTimeout(minuteur);
  }, [chargerClasses, etablissementId, anneeSelectionnee]);

  async function executerAction(action: () => Promise<void>) {
    setActionEnCours(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage({ type: "erreur", texte: messageErreur(error) });
    } finally {
      setActionEnCours(false);
    }
  }

  function demanderConfirmation(config: Confirmation) {
    setConfirmation(config);
  }

  async function confirmerAction() {
    if (!confirmation) return;
    const action = confirmation.action;
    setConfirmation(null);
    await executerAction(action);
  }

  async function creerEtablissement() {
    const id = nouvelEtablissement.trim();
    if (!id) {
      setMessage({
        type: "erreur",
        texte: "L'identifiant de l'établissement est obligatoire.",
      });
      return;
    }
    await executerAction(async () => {
      await servicesOrganisationScolaire.etablissements.creer({
        id_etablissement: id,
      });
      setMessage({ type: "succes", texte: "Établissement créé." });
      await charger();
    });
  }

  async function creerAnnee() {
    const id = nouvelleAnnee.trim();
    if (!id || !etablissementId) {
      setMessage({
        type: "erreur",
        texte: "L'identifiant de l'année scolaire est obligatoire.",
      });
      return;
    }
    await executerAction(async () => {
      await servicesOrganisationScolaire.anneesScolaires.creer({
        id_annee_scolaire: id,
        id_etablissement: etablissementId,
      });
      setNouvelleAnnee("");
      setFormAnneeOuvert(false);
      setMessage({ type: "succes", texte: "Année scolaire créée." });
      await chargerAnnees(etablissementId);
    });
  }

  function changerStatutAnnee(annee: AnneeScolaire, statut: StatutAnneeScolaire) {
    if (!etablissementId) return;
    void executerAction(async () => {
      await servicesOrganisationScolaire.anneesScolaires.changerStatut(
        annee.id_annee_scolaire,
        statut,
      );
      setMessage({ type: "succes", texte: "Statut de l'année mis à jour." });
      await chargerAnnees(etablissementId);
    });
  }

  function supprimerAnnee(annee: AnneeScolaire) {
    if (!etablissementId) return;
    demanderConfirmation({
      titre: `Supprimer l'année « ${annee.id_annee_scolaire} »`,
      message:
        "Cette action supprimera définitivement l'année scolaire. Elle est refusée par la base si des classes, périodes ou inscriptions l'utilisent encore.",
      action: async () => {
        await servicesOrganisationScolaire.anneesScolaires.supprimer(
          annee.id_annee_scolaire,
        );
        setMessage({ type: "succes", texte: "Année scolaire supprimée." });
        await chargerAnnees(etablissementId);
      },
    });
  }

  async function ajouterReferentiel(
    service: "cycles" | "niveaux" | "modeles",
    id: string,
  ) {
    if (service === "cycles") {
      await servicesOrganisationScolaire.cyclesEnseignement.creer({
        id_cycle: id,
      });
    } else if (service === "niveaux") {
      await servicesOrganisationScolaire.niveauxEnseignement.creer({
        id_niveau: id,
      });
    } else {
      await servicesOrganisationScolaire.modelesClasse.creer({
        id_modele_classe: id,
      });
    }
    setMessage({ type: "succes", texte: "Référentiel ajouté." });
    await chargerReferentiels();
  }

  async function renommerReferentiel(
    service: "cycles" | "niveaux" | "modeles",
    ancien: string,
    nouveau: string,
  ) {
    if (service === "cycles") {
      await servicesOrganisationScolaire.cyclesEnseignement.modifierIdentifiant(
        ancien,
        nouveau,
      );
    } else if (service === "niveaux") {
      await servicesOrganisationScolaire.niveauxEnseignement.modifierIdentifiant(
        ancien,
        nouveau,
      );
    } else {
      await servicesOrganisationScolaire.modelesClasse.modifierIdentifiant(
        ancien,
        nouveau,
      );
    }
    setMessage({ type: "succes", texte: "Référentiel renommé." });
    await chargerReferentiels();
  }

  async function supprimerReferentiel(
    service: "cycles" | "niveaux" | "modeles",
    id: string,
  ) {
    if (service === "cycles") {
      await servicesOrganisationScolaire.cyclesEnseignement.supprimer(id);
    } else if (service === "niveaux") {
      await servicesOrganisationScolaire.niveauxEnseignement.supprimer(id);
    } else {
      await servicesOrganisationScolaire.modelesClasse.supprimer(id);
    }
    setMessage({ type: "succes", texte: "Référentiel supprimé." });
    await chargerReferentiels();
  }

  function validerFormClasse(): string | null {
    if (!formClasse.id_classe_annuelle.trim()) {
      return "L'identifiant de la classe est obligatoire.";
    }
    if (!formClasse.id_niveau) {
      return "Le niveau est obligatoire.";
    }
    if (!formClasse.id_modele_classe) {
      return "Le modèle de classe est obligatoire.";
    }
    if (formClasse.capacite_max.trim() !== "") {
      const capacite = Number(formClasse.capacite_max);
      if (!Number.isInteger(capacite) || capacite < 0) {
        return "La capacité doit être un entier positif ou nul.";
      }
    }
    return null;
  }

  async function enregistrerClasse() {
    if (!etablissementId || !anneeSelectionnee) return;
    const erreur = validerFormClasse();
    if (erreur) {
      setMessage({ type: "erreur", texte: erreur });
      return;
    }

    const capacite =
      formClasse.capacite_max.trim() === ""
        ? null
        : Number(formClasse.capacite_max);

    await executerAction(async () => {
      const donnees = {
        id_classe_annuelle: formClasse.id_classe_annuelle.trim(),
        id_annee_scolaire: anneeSelectionnee,
        id_niveau: formClasse.id_niveau,
        id_modele_classe: formClasse.id_modele_classe,
        id_etablissement: etablissementId,
        capacite_max: capacite,
      };

      if (classeEdition) {
        await servicesOrganisationScolaire.classesAnnuelles.modifier(
          classeEdition,
          donnees,
        );
        setMessage({ type: "succes", texte: "Classe mise à jour." });
      } else {
        await servicesOrganisationScolaire.classesAnnuelles.creer(donnees);
        setMessage({ type: "succes", texte: "Classe créée." });
      }

      setFormClasse(FORM_CLASSE_VIDE);
      setClasseEdition(null);
      await chargerClasses(etablissementId, anneeSelectionnee);
    });
  }

  function demarrerEditionClasse(classe: ClasseAnnuelle) {
    setClasseEdition(classe.id_classe_annuelle);
    setFormClasse({
      id_classe_annuelle: classe.id_classe_annuelle,
      id_niveau: classe.id_niveau,
      id_modele_classe: classe.id_modele_classe,
      capacite_max:
        classe.capacite_max == null ? "" : String(classe.capacite_max),
    });
    setMessage(null);
  }

  function supprimerClasse(classe: ClasseAnnuelle) {
    if (!etablissementId || !anneeSelectionnee) return;
    demanderConfirmation({
      titre: `Supprimer la classe « ${classe.id_classe_annuelle} »`,
      message:
        "Cette action supprimera définitivement la classe annuelle. Elle est refusée par la base si des affectations ou tarifs l'utilisent encore.",
      action: async () => {
        await servicesOrganisationScolaire.classesAnnuelles.supprimer(
          classe.id_classe_annuelle,
        );
        setMessage({ type: "succes", texte: "Classe supprimée." });
        await chargerClasses(etablissementId, anneeSelectionnee);
      },
    });
  }

  const onglets: { id: Onglet; libelle: string; icone: IconType }[] = [
    { id: "annees", libelle: "Années scolaires", icone: FaCalendarAlt },
    { id: "referentiels", libelle: "Référentiels", icone: FaLayerGroup },
    { id: "classes", libelle: "Classes", icone: FaChalkboard },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Organisation</h1>
          <p className="mt-1 text-sm text-stone-500">
            Structure pédagogique de {NOM_ECOLE} : années, référentiels et
            classes annuelles.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setChargement(true);
            setMessage(null);
            void charger();
          }}
          isLoading={chargement}
        >
          <FaSyncAlt className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Actualiser
        </Button>
      </header>

      {message && (
        <p
          role={message.type === "erreur" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm ring-1 ${
            message.type === "erreur"
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {message.texte}
        </p>
      )}

      {chargement ? (
        <Carte className="p-10 text-center text-sm text-stone-500">
          Chargement de l'organisation…
        </Carte>
      ) : etablissements.length === 0 ? (
        <Carte className="mx-auto max-w-xl p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <FaExclamationTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Établissement requis
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Aucune année scolaire ni classe ne peut être créée sans
                établissement. Créez d'abord l'établissement principal.
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <input
              className={`${CLASSES_CHAMP} flex-1`}
              value={nouvelEtablissement}
              onChange={(event) => setNouvelEtablissement(event.target.value)}
              placeholder="Identifiant de l'établissement"
              aria-label="Identifiant de l'établissement"
            />
            <Button
              type="button"
              variant="vert"
              onClick={() => void creerEtablissement()}
              isLoading={actionEnCours}
            >
              Créer
            </Button>
          </div>
        </Carte>
      ) : (
        <>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Sections organisation"
          >
            {onglets.map((item) => {
              const Icone = item.icone;
              const actif = onglet === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOnglet(item.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition-colors ${
                    actif
                      ? "bg-vert-moyen text-white ring-vert-moyen"
                      : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <Icone className="h-4 w-4" aria-hidden="true" />
                  {item.libelle}
                </button>
              );
            })}
          </nav>

          {onglet === "annees" && (
            <section className="space-y-4">
              <Carte className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">
                      Années scolaires
                    </h2>
                    <p className="mt-0.5 text-xs text-stone-500">
                      Établissement : {etablissementId}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="vert"
                    size="sm"
                    onClick={() => setFormAnneeOuvert((ouvert) => !ouvert)}
                  >
                    <FaPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Nouvelle année
                  </Button>
                </div>

                {formAnneeOuvert && (
                  <div className="mt-4 flex gap-2 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
                    <input
                      className={`${CLASSES_CHAMP} flex-1`}
                      value={nouvelleAnnee}
                      onChange={(event) => setNouvelleAnnee(event.target.value)}
                      placeholder="Ex. 2026-2027"
                      aria-label="Identifiant de l'année scolaire"
                    />
                    <Button
                      type="button"
                      variant="vert"
                      size="sm"
                      onClick={() => void creerAnnee()}
                      isLoading={actionEnCours}
                    >
                      Créer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormAnneeOuvert(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                )}
              </Carte>

              <Carte className="overflow-hidden">
                <ul className="divide-y divide-stone-100">
                  {annees.length === 0 && (
                    <li className="p-8 text-center text-sm text-stone-400">
                      Aucune année scolaire pour le moment.
                    </li>
                  )}
                  {annees.map((annee) => (
                    <li
                      key={annee.id_annee_scolaire}
                      className="flex flex-wrap items-center gap-3 px-5 py-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vert-moyen/10 text-vert-moyen">
                        <FaCalendarAlt className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {annee.id_annee_scolaire}
                        </p>
                        <Badge variante={varianteStatut(annee.statut)}>
                          {libelleStatut(annee.statut)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {annee.statut === "PREPAREE" && (
                          <>
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              onClick={() =>
                                changerStatutAnnee(annee, "OUVERTE")
                              }
                              isLoading={actionEnCours}
                            >
                              Ouvrir
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => supprimerAnnee(annee)}
                            >
                              <FaTrash className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              Supprimer
                            </Button>
                          </>
                        )}
                        {annee.statut === "OUVERTE" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                            title="La clôture nécessite un contrôle et un audit non encore disponibles."
                          >
                            Clôturer (indisponible)
                          </Button>
                        )}
                        {annee.statut === "CLOTUREE" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!etablissementId) return;
                              const idEtablissement = etablissementId;
                              demanderConfirmation({
                                titre: `Archiver l'année « ${annee.id_annee_scolaire} »`,
                                message:
                                  "L'archivage est une transition définitive vers l'état ARCHIVEE.",
                                action: async () => {
                                  await servicesOrganisationScolaire.anneesScolaires.changerStatut(
                                    annee.id_annee_scolaire,
                                    "ARCHIVEE",
                                  );
                                  setMessage({
                                    type: "succes",
                                    texte: "Année scolaire archivée.",
                                  });
                                  await chargerAnnees(idEtablissement);
                                },
                              });
                            }}
                          >
                            Archiver
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Carte>
            </section>
          )}

          {onglet === "referentiels" && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <GestionReferentiel
                titre="Cycles d'enseignement"
                description="Ex. Primaire, Collège, Lycée."
                icone={FaSchool}
                items={cycles}
                onAjouter={(id) => ajouterReferentiel("cycles", id)}
                onRenommer={(ancien, nouveau) =>
                  renommerReferentiel("cycles", ancien, nouveau)
                }
                onSupprimer={(id) => supprimerReferentiel("cycles", id)}
                demanderConfirmation={demanderConfirmation}
              />
              <GestionReferentiel
                titre="Niveaux d'enseignement"
                description="Ex. Sixième, Troisième, Terminale."
                icone={FaLayerGroup}
                items={niveaux}
                onAjouter={(id) => ajouterReferentiel("niveaux", id)}
                onRenommer={(ancien, nouveau) =>
                  renommerReferentiel("niveaux", ancien, nouveau)
                }
                onSupprimer={(id) => supprimerReferentiel("niveaux", id)}
                demanderConfirmation={demanderConfirmation}
              />
              <GestionReferentiel
                titre="Modèles de classe"
                description="Ex. A, B, Scientifique, Littéraire."
                icone={FaChalkboard}
                items={modeles}
                onAjouter={(id) => ajouterReferentiel("modeles", id)}
                onRenommer={(ancien, nouveau) =>
                  renommerReferentiel("modeles", ancien, nouveau)
                }
                onSupprimer={(id) => supprimerReferentiel("modeles", id)}
                demanderConfirmation={demanderConfirmation}
              />
            </section>
          )}

          {onglet === "classes" && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <Carte className="p-5">
                <h2 className="text-lg font-semibold text-stone-900">
                  {classeEdition ? "Modifier la classe" : "Nouvelle classe"}
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Année : {anneeSelectionnee || "—"}
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-medium text-stone-600">
                    Année scolaire
                    <select
                      className={`${CLASSES_CHAMP} mt-1`}
                      value={anneeSelectionnee}
                      onChange={(event) => setAnneeSelectionnee(event.target.value)}
                    >
                      {annees.length === 0 && <option value="">Aucune année</option>}
                      {annees.map((annee) => (
                        <option
                          key={annee.id_annee_scolaire}
                          value={annee.id_annee_scolaire}
                        >
                          {annee.id_annee_scolaire} ({libelleStatut(annee.statut)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-medium text-stone-600">
                    Identifiant de la classe
                    <input
                      className={`${CLASSES_CHAMP} mt-1`}
                      value={formClasse.id_classe_annuelle}
                      onChange={(event) =>
                        setFormClasse((precedent) => ({
                          ...precedent,
                          id_classe_annuelle: event.target.value,
                        }))
                      }
                      placeholder="Ex. 6eA"
                    />
                  </label>

                  <label className="block text-xs font-medium text-stone-600">
                    Niveau
                    <select
                      className={`${CLASSES_CHAMP} mt-1`}
                      value={formClasse.id_niveau}
                      onChange={(event) =>
                        setFormClasse((precedent) => ({
                          ...precedent,
                          id_niveau: event.target.value,
                        }))
                      }
                    >
                      <option value="">Sélectionner un niveau</option>
                      {niveaux.map((niveau) => (
                        <option key={niveau} value={niveau}>
                          {niveau}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-medium text-stone-600">
                    Modèle de classe
                    <select
                      className={`${CLASSES_CHAMP} mt-1`}
                      value={formClasse.id_modele_classe}
                      onChange={(event) =>
                        setFormClasse((precedent) => ({
                          ...precedent,
                          id_modele_classe: event.target.value,
                        }))
                      }
                    >
                      <option value="">Sélectionner un modèle</option>
                      {modeles.map((modele) => (
                        <option key={modele} value={modele}>
                          {modele}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-medium text-stone-600">
                    Capacité maximale (optionnel)
                    <input
                      className={`${CLASSES_CHAMP} mt-1`}
                      type="number"
                      min={0}
                      step={1}
                      value={formClasse.capacite_max}
                      onChange={(event) =>
                        setFormClasse((precedent) => ({
                          ...precedent,
                          capacite_max: event.target.value,
                        }))
                      }
                      placeholder="Ex. 40"
                    />
                  </label>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="vert"
                      onClick={() => void enregistrerClasse()}
                      isLoading={actionEnCours}
                    >
                      {classeEdition ? "Enregistrer" : "Créer la classe"}
                    </Button>
                    {classeEdition && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setClasseEdition(null);
                          setFormClasse(FORM_CLASSE_VIDE);
                        }}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              </Carte>

              <Carte className="overflow-hidden">
                <div className="border-b border-stone-100 px-5 py-4">
                  <h2 className="text-lg font-semibold text-stone-900">
                    Classes de l'année
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {classes.length} classe(s) pour {anneeSelectionnee || "—"}
                  </p>
                </div>
                <ul className="divide-y divide-stone-100">
                  {classes.length === 0 && (
                    <li className="p-8 text-center text-sm text-stone-400">
                      Aucune classe pour cette année.
                    </li>
                  )}
                  {classes.map((classe) => (
                    <li
                      key={classe.id_classe_annuelle}
                      className="flex flex-wrap items-center gap-3 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {classe.id_classe_annuelle}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {classe.id_niveau} · {classe.id_modele_classe}
                          {classe.capacite_max != null &&
                            ` · Capacité ${classe.capacite_max}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => demarrerEditionClasse(classe)}
                          aria-label={`Modifier ${classe.id_classe_annuelle}`}
                        >
                          <FaEdit className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => supprimerClasse(classe)}
                          aria-label={`Supprimer ${classe.id_classe_annuelle}`}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <FaTrash className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Carte>
            </section>
          )}
        </>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Carte className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-stone-900">
              {confirmation.titre}
            </h2>
            <p className="mt-2 text-sm text-stone-600">{confirmation.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmation(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void confirmerAction()}
                isLoading={actionEnCours}
              >
                Confirmer
              </Button>
            </div>
          </Carte>
        </div>
      )}
    </div>
  );
}
