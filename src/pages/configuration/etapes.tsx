import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  LuArrowRight,
  LuCalendar,
  LuCircleCheckBig,
  LuDownload,
  LuFileSpreadsheet,
  LuMail,
  LuPhone,
  LuPlus,
  LuSchool,
  LuTrash2,
  LuUserPlus,
} from "react-icons/lu";
import {
  Aide,
  Bouton,
  Champ,
  ChampAvecIcone,
  ChampTexte,
  carteCls,
  LienEtapePrecedente,
  ListeDeroulante,
  lienDangerCls,
  MessageErreur,
  NoteEnAttente,
  Puce,
  titreBlocCls,
} from "./composants";
import {
  auMoinsUnBaremeComplet,
  cx,
  DECOUPAGES,
  formaterIsoVersFrancais,
  FREQUENCES,
  INDICATIF_TELEPHONE,
  LANGUES,
  nouveauBareme,
  ROLES,
  SYSTEMES_CLASSES,
  uid,
} from "./donnees";
import type {
  Bareme,
  CleSystemeClasses,
  DonneesEcole,
  DonneesEleves,
  DonneesFrais,
  EleveBrouillon,
  MembreEquipe,
} from "./donnees";

/**
 * Les 6 étapes du parcours « Configuration initiale », fidèles à la
 * maquette vidéo. Les étapes Frais, Élèves et Équipe affichent un bandeau
 * d'honnêteté : leur interface existe, l'enregistrement en base arrive
 * avec les modules correspondants (facturation, dossier élève, base
 * distante).
 */

type EvenementChamp = ChangeEvent<HTMLInputElement | HTMLSelectElement>;

/* ============================== Étape 1 : École ============================== */

export function EtapeEcole({
  donnees,
  onChanger,
  onContinuer,
  enCours,
}: {
  donnees: DonneesEcole;
  onChanger: (donnees: DonneesEcole) => void;
  onContinuer: () => void;
  enCours: boolean;
}) {
  const maj = (cle: keyof DonneesEcole) => (evenement: EvenementChamp) => {
    onChanger({ ...donnees, [cle]: evenement.target.value } as DonneesEcole);
  };

  const datesKo =
    donnees.debut !== "" && donnees.fin !== "" && donnees.fin <= donnees.debut;
  const valide =
    donnees.nom.trim() !== "" &&
    donnees.libelle.trim() !== "" &&
    donnees.debut !== "" &&
    donnees.fin !== "" &&
    !datesKo;

  return (
    <>
      <Champ label="Nom de l'école">
        <ChampTexte
          value={donnees.nom}
          onChange={maj("nom")}
          placeholder="Ex : Groupe scolaire Les Étoiles"
        />
      </Champ>

      <Champ
        label="Langue de l'application"
        hint="Modifiable à tout moment dans les paramètres."
      >
        <ListeDeroulante
          value={donnees.langue}
          onChange={maj("langue")}
          options={LANGUES}
        />
      </Champ>

      <hr className="border-stone-200" />

      <h3 className={titreBlocCls}>Année scolaire en cours</h3>

      <Champ label="Libellé">
        <ChampTexte
          value={donnees.libelle}
          onChange={maj("libelle")}
          placeholder="2026-2027"
        />
      </Champ>

      <div className="flex flex-col gap-3.5 sm:flex-row">
        <Champ label="Début">
          <ChampAvecIcone
            icone={LuCalendar}
            type="date"
            value={donnees.debut}
            onChange={maj("debut")}
          />
        </Champ>
        <Champ label="Fin">
          <ChampAvecIcone
            icone={LuCalendar}
            type="date"
            value={donnees.fin}
            onChange={maj("fin")}
          />
        </Champ>
      </div>

      {datesKo ? (
        <MessageErreur>
          La date de fin doit être après la date de début.
        </MessageErreur>
      ) : null}

      <Champ
        label="Découpage"
        hint="Les notes, bulletins et absences sont rattachés à ces périodes."
      >
        <ListeDeroulante
          value={donnees.decoupage}
          onChange={(evenement) =>
            onChanger({
              ...donnees,
              decoupage: evenement.target.value as DonneesEcole["decoupage"],
            })
          }
          options={DECOUPAGES}
        />
      </Champ>

      <Bouton
        icone={LuSchool}
        onClick={onContinuer}
        disabled={!valide}
        enCours={enCours}
      >
        Créer l'école
      </Bouton>
    </>
  );
}

/* ============================== Étape 2 : Classes ============================== */

export function EtapeClasses({
  systeme,
  selection,
  autresClasses,
  onSysteme,
  onSelection,
  onAjouterAutre,
  onContinuer,
  onRetour,
  enCours,
}: {
  systeme: CleSystemeClasses;
  selection: string[];
  autresClasses: string[];
  onSysteme: (cle: CleSystemeClasses) => void;
  onSelection: (selection: string[]) => void;
  onAjouterAutre: (libelle: string) => void;
  onContinuer: () => void;
  onRetour: () => void;
  enCours: boolean;
}) {
  const [saisie, setSaisie] = useState("");
  const systemeActif =
    SYSTEMES_CLASSES.find((s) => s.cle === systeme) ?? SYSTEMES_CLASSES[0];

  const basculer = (niveau: string) => {
    onSelection(
      selection.includes(niveau)
        ? selection.filter((item) => item !== niveau)
        : [...selection, niveau],
    );
  };

  const ajouterAutre = () => {
    const libelle = saisie.trim();
    if (libelle === "") return;
    onAjouterAutre(libelle);
    setSaisie("");
  };

  const groupesAffiches = [
    ...systemeActif.familles,
    ...(autresClasses.length > 0
      ? [{ titre: "Autres classes", niveaux: autresClasses }]
      : []),
  ];

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-stone-900">
          Système de classes
        </span>
        <div className="flex flex-wrap gap-2">
          {SYSTEMES_CLASSES.map((systemePropose) => (
            <Puce
              key={systemePropose.cle}
              actif={systeme === systemePropose.cle}
              onClick={() => onSysteme(systemePropose.cle)}
            >
              {systemePropose.libelle}
            </Puce>
          ))}
        </div>
        <Aide>
          Le système congolais correspond aux appellations officielles les plus
          courantes au Congo-Brazzaville.
        </Aide>
      </div>

      {groupesAffiches.length > 0 ? (
        groupesAffiches.map((groupe) => (
          <section key={groupe.titre} className="flex flex-col gap-2">
            <h3 className={titreBlocCls}>{groupe.titre}</h3>
            <div className="flex flex-wrap gap-2">
              {groupe.niveaux.map((niveau) => (
                <Puce
                  key={niveau}
                  actif={selection.includes(niveau)}
                  onClick={() => basculer(niveau)}
                >
                  {niveau}
                </Puce>
              ))}
            </div>
          </section>
        ))
      ) : (
        <Aide>
          Aucune classe proposée : ajoutez les vôtres une à une ci-dessous.
        </Aide>
      )}

      <section className="flex flex-col gap-2">
        <h3 className={titreBlocCls}>Ajouter une autre classe</h3>
        <div className="flex gap-2.5">
          <ChampTexte
            value={saisie}
            onChange={(evenement) => setSaisie(evenement.target.value)}
            onKeyDown={(evenement) => {
              if (evenement.key === "Enter") {
                evenement.preventDefault();
                ajouterAutre();
              }
            }}
            placeholder="Ex : 6e année B"
          />
          <Bouton
            variante="fantome"
            icone={LuPlus}
            onClick={ajouterAutre}
            disabled={saisie.trim() === ""}
          >
            Ajouter
          </Bouton>
        </div>
      </section>

      <Bouton
        iconeDroite={LuArrowRight}
        onClick={onContinuer}
        disabled={selection.length === 0}
        enCours={enCours}
      >
        Étape suivante
      </Bouton>
      {selection.length === 0 ? (
        <Aide>Choisissez au moins une classe pour continuer.</Aide>
      ) : null}
      <LienEtapePrecedente onRetour={onRetour} />
    </>
  );
}

/* ============================== Étape 3 : Frais ============================== */

export function EtapeFrais({
  donnees,
  classesDisponibles,
  onChanger,
  onContinuer,
  onRetour,
  enCours,
}: {
  donnees: DonneesFrais;
  classesDisponibles: string[];
  onChanger: (donnees: DonneesFrais) => void;
  onContinuer: () => void;
  onRetour: () => void;
  enCours: boolean;
}) {
  const { baremes, inscription } = donnees;

  const majBareme = (id: string, correctifs: Partial<Bareme>) => {
    onChanger({
      ...donnees,
      baremes: baremes.map((b) => (b.id === id ? { ...b, ...correctifs } : b)),
    });
  };

  const majInscription = (correctifs: Partial<DonneesFrais["inscription"]>) => {
    onChanger({
      ...donnees,
      inscription: { ...inscription, ...correctifs },
    });
  };

  const valide = auMoinsUnBaremeComplet(baremes);

  return (
    <>
      <NoteEnAttente>
        Le module de facturation n'est pas encore branché : vos barèmes restent
        dans cette page et seront enregistrés quand la facturation sera
        construite. Vous pouvez passer cette étape sans risque.
      </NoteEnAttente>

      {baremes.map((bareme, index) => (
        <section key={bareme.id} className={carteCls}>
          <header className="flex items-center justify-between">
            <h3 className={titreBlocCls}>Barème {index + 1}</h3>
            {baremes.length > 1 ? (
              <button
                type="button"
                className={lienDangerCls}
                onClick={() =>
                  onChanger({
                    ...donnees,
                    baremes: baremes.filter((item) => item.id !== bareme.id),
                  })
                }
              >
                <LuTrash2 size={14} aria-hidden="true" /> Retirer
              </button>
            ) : null}
          </header>

          <Champ label="Intitulé">
            <ChampTexte
              value={bareme.intitule}
              onChange={(evenement) =>
                majBareme(bareme.id, { intitule: evenement.target.value })
              }
              placeholder="Ex : Scolarité"
            />
          </Champ>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Fréquence</span>
            <div className="flex flex-wrap gap-2">
              {FREQUENCES.map((frequence) => (
                <Puce
                  key={frequence}
                  actif={bareme.frequence === frequence}
                  onClick={() => majBareme(bareme.id, { frequence })}
                >
                  {frequence}
                </Puce>
              ))}
            </div>
          </div>

          <Champ
            label="Échéance"
            hint={
              bareme.echeance !== ""
                ? formaterIsoVersFrancais(bareme.echeance)
                : undefined
            }
          >
            <ChampAvecIcone
              icone={LuCalendar}
              type="date"
              value={bareme.echeance}
              onChange={(evenement) =>
                majBareme(bareme.id, { echeance: evenement.target.value })
              }
            />
          </Champ>

          <Champ
            label="Montant (FCFA)"
            hint={
              Number(bareme.montant) > 0
                ? `${Number(bareme.montant).toLocaleString("fr-FR")} FCFA`
                : undefined
            }
          >
            <ChampTexte
              type="number"
              min="0"
              inputMode="numeric"
              value={bareme.montant}
              onChange={(evenement) =>
                majBareme(bareme.id, { montant: evenement.target.value })
              }
              placeholder="50000"
            />
          </Champ>

          <Champ label="Classe concernée">
            <ListeDeroulante
              value={bareme.classe}
              onChange={(evenement) =>
                majBareme(bareme.id, { classe: evenement.target.value })
              }
              options={["Toutes les classes", ...classesDisponibles]}
            />
          </Champ>
        </section>
      ))}

      <button
        type="button"
        onClick={() =>
          onChanger({ ...donnees, baremes: [...baremes, nouveauBareme()] })
        }
        className="inline-flex items-center gap-1.5 self-center p-1.5 text-[13.5px] font-semibold hover:text-[#2d8a6b]"
      >
        <LuPlus size={16} aria-hidden="true" /> Ajouter un barème
      </button>

      <section className={carteCls}>
        <h3 className={titreBlocCls}>
          Frais d'inscription{" "}
          <span className="font-normal text-stone-500">(facultatif)</span>
        </h3>
        <p className="text-[12.5px] text-stone-500">
          Payés une seule fois, à l'inscription d'un élève — en plus de la
          scolarité.
        </p>

        <div className="flex flex-wrap gap-2">
          <Puce
            actif={inscription.mode === "meme"}
            onClick={() => majInscription({ mode: "meme" })}
          >
            Même montant pour toutes les classes
          </Puce>
          <Puce
            actif={inscription.mode === "parClasse"}
            onClick={() => majInscription({ mode: "parClasse" })}
          >
            Un montant par classe
          </Puce>
        </div>

        {inscription.mode === "meme" ? (
          <Champ label="Montant (FCFA)">
            <ChampTexte
              type="number"
              min="0"
              inputMode="numeric"
              value={inscription.montant}
              onChange={(evenement) =>
                majInscription({ montant: evenement.target.value })
              }
              placeholder="Laisser vide = pas de frais"
            />
          </Champ>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {classesDisponibles.map((classe) => (
              <Champ key={classe} label={classe}>
                <ChampTexte
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  value={inscription.parClasse[classe] ?? ""}
                  onChange={(evenement) =>
                    majInscription({
                      parClasse: {
                        ...inscription.parClasse,
                        [classe]: evenement.target.value,
                      },
                    })
                  }
                />
              </Champ>
            ))}
          </div>
        )}
      </section>

      <Bouton
        iconeDroite={LuArrowRight}
        onClick={onContinuer}
        disabled={!valide}
        enCours={enCours}
      >
        Continuer
      </Bouton>
      {!valide ? (
        <Aide>
          Renseignez au moins un barème (nom, montant, échéance) pour
          continuer.
        </Aide>
      ) : null}
      <LienEtapePrecedente onRetour={onRetour} />
    </>
  );
}

/* ============================== Étape 4 : Élèves ============================== */

const zoneDepotCls =
  "flex w-full flex-col items-center gap-1 rounded-xl border-[1.5px] border-dashed border-stone-300 bg-stone-100 p-4 text-center transition-colors hover:border-[#2d8a6b]";

export function EtapeEleves({
  donnees,
  classesDisponibles,
  onChanger,
  onContinuer,
  onRetour,
  enCours,
}: {
  donnees: DonneesEleves;
  classesDisponibles: string[];
  onChanger: (donnees: DonneesEleves) => void;
  onContinuer: () => void;
  onRetour: () => void;
  enCours: boolean;
}) {
  const formulaireVide: Omit<EleveBrouillon, "id"> = {
    prenom: "",
    nom: "",
    sexe: "",
    classe: "",
    parent: "",
    telephone: "",
  };

  const [formulaire, setFormulaire] = useState(formulaireVide);
  const fichierRef = useRef<HTMLInputElement>(null);

  const majFormulaire = (cle: keyof Omit<EleveBrouillon, "id">) =>
    (evenement: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormulaire({ ...formulaire, [cle]: evenement.target.value });

  const peutAjouter =
    formulaire.prenom.trim() !== "" && formulaire.nom.trim() !== "";

  const ajouter = () => {
    if (!peutAjouter) return;
    onChanger({
      ...donnees,
      liste: [
        ...donnees.liste,
        {
          id: uid(),
          ...formulaire,
          classe: formulaire.classe !== "" ? formulaire.classe : "Sans classe pour l'instant",
        },
      ],
    });
    setFormulaire(formulaireVide);
  };

  const retirer = (id: string) => {
    onChanger({
      ...donnees,
      liste: donnees.liste.filter((eleve) => eleve.id !== id),
    });
  };

  const telechargerModele = () => {
    const csv =
      "Prénom;Nom;Sexe;Classe;Nom du parent;Téléphone du parent\n" +
      `Ana;MBOUMBA;F;${classesDisponibles[0] ?? "CP1"};Mme LOUANGO;${INDICATIF_TELEPHONE} 06 123 45 67\n`;
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: "modele-eleves.csv",
    }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <NoteEnAttente>
        Le dossier élève (noms, classe, parents) n'est pas encore construit :
        vos élèves restent dans cette page et seront enregistrés avec le
        module Élèves. Pour l'instant, l'import de fichier prépare seulement
        votre modèle.
      </NoteEnAttente>

      <section className={carteCls}>
        <h3 className={titreBlocCls}>Ajouter un élève à la main</h3>

        <div className="flex flex-col gap-3.5 sm:flex-row">
          <Champ label="Prénom">
            <ChampTexte
              value={formulaire.prenom}
              onChange={majFormulaire("prenom")}
            />
          </Champ>
          <Champ label="Nom">
            <ChampTexte
              value={formulaire.nom}
              onChange={majFormulaire("nom")}
            />
          </Champ>
        </div>

        <div className="flex flex-col gap-3.5 sm:flex-row">
          <Champ label="Sexe">
            <ListeDeroulante
              value={formulaire.sexe}
              onChange={majFormulaire("sexe")}
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
              onChange={majFormulaire("classe")}
              options={[
                { valeur: "", libelle: "Sans classe pour l'instant" },
                ...classesDisponibles,
              ]}
            />
          </Champ>
        </div>

        <div className="flex flex-col gap-3.5 sm:flex-row">
          <Champ label="Nom du parent (facultatif)">
            <ChampTexte
              value={formulaire.parent}
              onChange={majFormulaire("parent")}
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
                onChange={majFormulaire("telephone")}
                placeholder="06 123 45 67"
              />
            </div>
          </Champ>
        </div>

        <Bouton
          variante="secondaire"
          icone={LuUserPlus}
          onClick={ajouter}
          disabled={!peutAjouter}
        >
          Ajouter cet élève
        </Bouton>
      </section>

      {donnees.liste.length > 0 ? (
        <section className="flex flex-col gap-2.5" aria-live="polite">
          <h3 className={titreBlocCls}>
            Élèves ajoutés ({donnees.liste.length})
          </h3>
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {donnees.liste.map((eleve) => (
              <li
                key={eleve.id}
                className="flex items-center gap-3 px-3.5 py-2.5"
              >
                <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-stone-100 text-[11px] font-bold uppercase text-stone-500">
                  {eleve.prenom.charAt(0)}
                  {eleve.nom.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {eleve.nom.toUpperCase()} {eleve.prenom}
                </span>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">
                  {eleve.classe}
                </span>
                <button
                  type="button"
                  className={cx(lienDangerCls, "shrink-0")}
                  aria-label={`Retirer ${eleve.prenom} ${eleve.nom}`}
                  onClick={() => retirer(eleve.id)}
                >
                  <LuTrash2 size={14} aria-hidden="true" /> Retirer
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={carteCls}>
        <h3 className={titreBlocCls}>Ou préparer un fichier Excel</h3>

        <button type="button" onClick={telechargerModele} className={zoneDepotCls}>
          <LuDownload size={20} aria-hidden="true" className="text-[#2d8a6b]" />
          <strong className="text-sm">Télécharger le modèle Excel</strong>
          <span className="text-[12.5px] text-stone-500">
            Les colonnes attendues, avec un exemple rempli.
          </span>
        </button>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={donnees.facturerInscription}
            onChange={(evenement) =>
              onChanger({
                ...donnees,
                facturerInscription: evenement.target.checked,
              })
            }
            className="mt-0.5 size-4 accent-[#2d8a6b]"
          />
          <span className="flex flex-col text-[13.5px]">
            <strong className="font-semibold">
              Facturer les frais d'inscription aux élèves importés
            </strong>
            <span className="text-[12.5px] text-stone-500">
              À décocher pour un registre d'élèves déjà scolarisés.
            </span>
          </span>
        </label>

        <input
          ref={fichierRef}
          type="file"
          hidden
          accept=".xlsx,.xls,.csv"
          onChange={(evenement) =>
            onChanger({
              ...donnees,
              fichier: evenement.target.files?.[0] ?? null,
            })
          }
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
            {donnees.fichier
              ? donnees.fichier.name
              : "Choisir votre fichier Excel"}
          </strong>
          <span className="text-[12.5px] text-stone-500">
            {donnees.fichier
              ? "Cliquez pour changer de fichier"
              : ".xlsx, .xls ou .csv"}
          </span>
        </button>
      </section>

      <Bouton
        iconeDroite={LuArrowRight}
        onClick={onContinuer}
        enCours={enCours}
      >
        {donnees.liste.length > 0 || donnees.fichier
          ? "Continuer"
          : "Passer cette étape"}
      </Bouton>
      <LienEtapePrecedente onRetour={onRetour} />
    </>
  );
}

/* ============================== Étape 5 : Équipe ============================== */

export function EtapeEquipe({
  membres,
  onChanger,
  onContinuer,
  onRetour,
  enCours,
}: {
  membres: MembreEquipe[];
  onChanger: (membres: MembreEquipe[]) => void;
  onContinuer: () => void;
  onRetour: () => void;
  enCours: boolean;
}) {
  const [formulaire, setFormulaire] = useState({
    nom: "",
    email: "",
    role: ROLES[1] ?? "Enseignant",
  });

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulaire.email);

  const ajouter = () => {
    if (formulaire.nom.trim() === "" || !emailOk) return;
    onChanger([...membres, { id: uid(), ...formulaire }]);
    setFormulaire({ nom: "", email: "", role: formulaire.role });
  };

  return (
    <>
      <NoteEnAttente>
        Envoyer des invitations par e-mail exige une connexion : cette étape
        deviendra réelle quand la base distante (Supabase) sera branchée. Pour
        l'instant, votre liste sert de préparation.
      </NoteEnAttente>

      <section className={carteCls}>
        <h3 className={titreBlocCls}>Inviter un membre</h3>
        <div className="flex flex-col gap-3.5 sm:flex-row">
          <Champ label="Nom complet">
            <ChampTexte
              value={formulaire.nom}
              onChange={(evenement) =>
                setFormulaire({ ...formulaire, nom: evenement.target.value })
              }
            />
          </Champ>
          <Champ label="Rôle">
            <ListeDeroulante
              value={formulaire.role}
              onChange={(evenement) =>
                setFormulaire({ ...formulaire, role: evenement.target.value })
              }
              options={ROLES}
            />
          </Champ>
        </div>
        <Champ
          label="E-mail"
          hint={
            formulaire.email !== "" && !emailOk
              ? "Saisissez une adresse e-mail valide."
              : "Une invitation sera envoyée à cette adresse plus tard."
          }
        >
          <ChampAvecIcone
            icone={LuMail}
            type="email"
            value={formulaire.email}
            onChange={(evenement) =>
              setFormulaire({ ...formulaire, email: evenement.target.value })
            }
            placeholder="prenom@ecole.cg"
          />
        </Champ>
        <Bouton
          variante="secondaire"
          icone={LuUserPlus}
          onClick={ajouter}
          disabled={formulaire.nom.trim() === "" || !emailOk}
        >
          Ajouter ce membre
        </Bouton>
      </section>

      {membres.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <h3 className={titreBlocCls}>Membres préparés ({membres.length})</h3>
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {membres.map((membre) => (
              <li
                key={membre.id}
                className="flex items-center gap-3 px-3.5 py-2.5"
              >
                <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-stone-100 text-[11px] font-bold uppercase text-stone-500">
                  {membre.nom
                    .split(" ")
                    .map((partie) => partie.charAt(0))
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="flex min-w-0 flex-1 flex-col text-sm">
                  {membre.nom}
                  <small className="truncate text-xs text-stone-500">
                    {membre.email}
                  </small>
                </span>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">
                  {membre.role}
                </span>
                <button
                  type="button"
                  className={cx(lienDangerCls, "shrink-0")}
                  aria-label={`Retirer ${membre.nom}`}
                  onClick={() =>
                    onChanger(membres.filter((item) => item.id !== membre.id))
                  }
                >
                  <LuTrash2 size={14} aria-hidden="true" /> Retirer
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Bouton
        iconeDroite={LuArrowRight}
        onClick={onContinuer}
        enCours={enCours}
      >
        {membres.length > 0
          ? "Terminer la configuration"
          : "Passer cette étape"}
      </Bouton>
      <LienEtapePrecedente onRetour={onRetour} />
    </>
  );
}

/* ============================== Étape 6 : Terminé ============================== */

export type EtatLigne = "enregistre" | "enAttente";

export interface LigneResume {
  libelle: string;
  valeur: string;
  etat: EtatLigne;
}

export function EtapeTermine({
  lignes,
  onTerminer,
}: {
  lignes: LigneResume[];
  onTerminer: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3.5 rounded-2xl bg-emerald-100 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2d8a6b] text-white">
          <LuCircleCheckBig size={20} aria-hidden="true" />
        </span>
        <p>
          Votre école est prête. Vous pouvez compléter le reste depuis le
          tableau de bord.
        </p>
      </div>

      <dl className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {lignes.map((ligne) => (
          <div key={ligne.libelle} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-stone-500">{ligne.libelle}</dt>
            <dd className="flex items-center gap-2 text-right">
              <span className="font-semibold">{ligne.valeur}</span>
              <span
                className={
                  ligne.etat === "enregistre"
                    ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800"
                    : "shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800"
                }
              >
                {ligne.etat === "enregistre" ? "Enregistré" : "En attente"}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-[12.5px] text-stone-500">
        « En attente » : ces informations seront enregistrées avec les modules
        correspondants (facturation, dossier élève, base distante).
      </p>

      <Bouton iconeDroite={LuArrowRight} onClick={onTerminer}>
        Accéder au tableau de bord
      </Bouton>
    </>
  );
}
