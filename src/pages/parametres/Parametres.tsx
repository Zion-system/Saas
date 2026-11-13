import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  LuCircleAlert,
  LuCircleCheckBig,
  LuDownload,
  LuInfo,
  LuUpload,
} from "react-icons/lu";
import { executerRequete } from "../../database/local/sqlite.client";
import {
  TAILLE_MAX_SAUVEGARDE_OCTETS,
  faireSauvegarde,
  restaurerDepuisFichier,
  validerSauvegarde,
  type ResumeRestauration,
  type SauvegardeDonnees,
} from "../../services/sauvegarde/sauvegarde.service";
import {
  Aide,
  MessageErreur,
  astuceCls,
  carteCls,
  champCls,
  titreBlocCls,
} from "../configuration/composants";
import { cx } from "../configuration/donnees";

/**
 * Page « Paramètres » — l'entretien de l'application : sauvegarde
 * (la photocopie du cahier), restauration (recharger la photocopie) et
 * rappel du principe offline-first. La route /parametres existait déjà
 * dans le menu ; elle pointe désormais vers cette vraie page.
 */

function messageDErreur(erreur: unknown): string {
  return erreur instanceof Error
    ? erreur.message
    : "Erreur inconnue. Réessayez.";
}

/** Taille lisible en français (virgule décimale, Ko / Mo). */
function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;

  if (octets < 1024 * 1024) {
    return `${(octets / 1024).toFixed(1).replace(".", ",")} Ko`;
  }

  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function telecharger(nomFichier: string, contenu: string): void {
  const url = URL.createObjectURL(
    new Blob([contenu], { type: "application/json" }),
  );
  const lien = document.createElement("a");

  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

export function Parametres() {
  // État de la base (version du schéma + compteurs actuels).
  const [versionSchema, setVersionSchema] = useState<number | null>(null);
  const [nbEleves, setNbEleves] = useState<number | null>(null);
  const [nbClasses, setNbClasses] = useState<number | null>(null);

  // Sauvegarde.
  const [enCoursSauvegarde, setEnCoursSauvegarde] = useState(false);
  const [succesSauvegarde, setSuccesSauvegarde] = useState<string | null>(null);
  const [erreurSauvegarde, setErreurSauvegarde] = useState<string | null>(null);

  // Restauration.
  const [fichierChoisi, setFichierChoisi] = useState<File | null>(null);
  const [resumeChoisi, setResumeChoisi] = useState<SauvegardeDonnees | null>(
    null,
  );
  const [erreurRestauration, setErreurRestauration] = useState<string | null>(
    null,
  );
  const [caseComprise, setCaseComprise] = useState(false);
  const [enCoursRestauration, setEnCoursRestauration] = useState(false);
  const [restaurationReussie, setRestaurationReussie] =
    useState<ResumeRestauration | null>(null);

  useEffect(() => {
    let vivant = true;

    async function chargerInfosBase() {
      try {
        const version = await executerRequete(
          "SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;",
        );
        const eleves = await executerRequete(
          "SELECT COUNT(*) AS n FROM eleve;",
        );
        const classes = await executerRequete(
          "SELECT COUNT(*) AS n FROM classe_annuelle;",
        );

        if (!vivant) return;

        setVersionSchema(Number(version[0]?.version ?? 0));
        setNbEleves(Number(eleves[0]?.n ?? 0));
        setNbClasses(Number(classes[0]?.n ?? 0));
      } catch {
        // La base n'est pas encore prête : les compteurs restent « … ».
      }
    }

    void chargerInfosBase();

    return () => {
      vivant = false;
    };
  }, []);

  async function sauvegarder() {
    setEnCoursSauvegarde(true);
    setSuccesSauvegarde(null);
    setErreurSauvegarde(null);

    try {
      const resultat = await faireSauvegarde();

      telecharger(resultat.nomFichier, resultat.contenu);
      setSuccesSauvegarde(
        `${resultat.nomFichier} (${formatTaille(resultat.tailleOctets)})`,
      );
    } catch (erreur) {
      setErreurSauvegarde(messageDErreur(erreur));
    } finally {
      setEnCoursSauvegarde(false);
    }
  }

  async function choisirFichier(evenement: ChangeEvent<HTMLInputElement>) {
    setErreurRestauration(null);
    setResumeChoisi(null);
    setCaseComprise(false);
    setRestaurationReussie(null);

    const fichier = evenement.target.files?.[0] ?? null;
    setFichierChoisi(fichier);

    if (!fichier) return;

    if (fichier.size > TAILLE_MAX_SAUVEGARDE_OCTETS) {
      setErreurRestauration(
        "Ce fichier est trop volumineux. La limite est de 40 Mo.",
      );
      return;
    }

    try {
      const texte = await fichier.text();
      // Aperçu : si la version réelle de la base n'a pas pu être lue au
      // chargement, on laisse passer l'aperçu — le contrôle complet
      // (fraîcheur comprise) est refait au moment de restaurer.
      setResumeChoisi(
        validerSauvegarde(texte, versionSchema ?? Number.MAX_SAFE_INTEGER),
      );
    } catch (erreur) {
      setErreurRestauration(messageDErreur(erreur));
    }
  }

  async function restaurer() {
    if (!fichierChoisi || !resumeChoisi || !caseComprise) return;

    setEnCoursRestauration(true);
    setErreurRestauration(null);

    try {
      const resume = await restaurerDepuisFichier(fichierChoisi);

      setRestaurationReussie(resume);
    } catch (erreur) {
      setErreurRestauration(messageDErreur(erreur));
    } finally {
      setEnCoursRestauration(false);
    }
  }

  const lignesFichier =
    resumeChoisi?.resume.reduce((total, table) => total + table.lignes, 0) ?? 0;
  const elevesFichier =
    resumeChoisi?.resume.find((table) => table.table === "eleve")?.lignes ?? 0;
  const classesFichier =
    resumeChoisi?.resume.find((table) => table.table === "classe_annuelle")
      ?.lignes ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pt-2">
      {/* En-tête compact, même gabarit que la page Élèves. */}
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Paramètres</h1>
        <p className="mt-0.5 text-[13px] text-stone-500">
          Sauvegarde, restauration et entretien de votre application.
        </p>
      </div>

      {/* ── Sauvegarde ─────────────────────────────────────────── */}
      <section className={carteCls}>
        <div className="space-y-1">
          <h2 className={titreBlocCls}>Sauvegarder mes données</h2>
          <p className={astuceCls}>
            Une sauvegarde est la photocopie de tout votre cahier : élèves,
            classes, responsables, historiques. Le fichier est téléchargé sur
            cet appareil ; mettez-en ensuite une copie à l'abri (clé USB,
            Google Drive, e-mail).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-fit">
            <button
              type="button"
              onClick={() => void sauvegarder()}
              disabled={enCoursSauvegarde}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-[#2d8a6b] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#247a5d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuDownload size={17} aria-hidden="true" />
              {enCoursSauvegarde
                ? "Lecture de la base…"
                : "Sauvegarder maintenant"}
            </button>
          </div>
          {enCoursSauvegarde ? (
            <p className={astuceCls}>
              La base est en cours de lecture, ne fermez pas l'application.
            </p>
          ) : null}
        </div>

        {succesSauvegarde ? (
          <p className="flex items-start gap-2 rounded-[10px] bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800">
            <LuCircleCheckBig
              size={15}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <span>
              Sauvegarde téléchargée : <strong>{succesSauvegarde}</strong>.
              Pensez à la copier hors de l'appareil.
            </span>
          </p>
        ) : null}

        {erreurSauvegarde ? <MessageErreur>{erreurSauvegarde}</MessageErreur> : null}
      </section>

      {/* ── Restauration ───────────────────────────────────────── */}
      <section className={carteCls}>
        <div className="space-y-1">
          <h2 className={titreBlocCls}>Restaurer une sauvegarde</h2>
          <p className={astuceCls}>
            Rechargez une photocopie à la place du cahier actuel. À utiliser
            si cet appareil a été changé, ou si quelque chose s'est mal passé.
          </p>
        </div>

        <p className="flex items-start gap-2 rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
          <LuCircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            <strong>Attention :</strong> la restauration remplace{" "}
            <strong>toutes</strong> les données actuelles par celles du fichier
            choisi. Si vous voulez garder les données actuelles, faites une
            sauvegarde d'abord.
          </span>
        </p>

        {restaurationReussie ? (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-[10px] bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800">
              <LuCircleCheckBig
                size={15}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              <span>
                Restauration réussie : {restaurationReussie.tablesRestaurees}{" "}
                tables et {restaurationReussie.lignesRestaurees} lignes
                remises en place (base v{restaurationReussie.schemaVersion},
                sauvegarde du {restaurationReussie.heureLocale}).
              </span>
            </p>
            <p className={astuceCls}>
              Il reste à recharger l'application pour que toutes les pages
              reprennent les données restaurées.
            </p>
            <div className="w-fit">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-[#2d8a6b] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#247a5d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a6b]"
              >
                Recharger l'application
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              accept=".json,application/json"
              onChange={(evenement) => void choisirFichier(evenement)}
              className={cx(
                champCls,
                "h-auto py-2.5 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-stone-200 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-stone-700 hover:file:bg-stone-300",
              )}
            />
            <p className={astuceCls}>
              Le fichier attendu est celui téléchargé par « Sauvegarder
              maintenant » : son nom commence par
              « sauvegarde-gestion-scolaire- ».
            </p>

            {resumeChoisi ? (
              <div className="rounded-[10px] bg-stone-50 px-3.5 py-3 text-[13px] text-stone-700">
                <p className="font-semibold text-stone-900">
                  Sauvegarde du {resumeChoisi.heureLocale}
                </p>
                <p className="mt-0.5">
                  Base v{resumeChoisi.schemaVersion} · {lignesFichier} lignes
                  (dont {elevesFichier} élèves et {classesFichier} classes).
                </p>
                {nbEleves !== null ? (
                  <p className="mt-0.5 text-stone-500">
                    Aujourd'hui dans l'application : {nbEleves} élèves et{" "}
                    {nbClasses} classes, qui seront remplacés.
                  </p>
                ) : null}
              </div>
            ) : null}

            <label className="flex items-start gap-2.5 text-[13.5px] text-stone-700">
              <input
                type="checkbox"
                checked={caseComprise}
                onChange={(evenement) =>
                  setCaseComprise(evenement.target.checked)
                }
                className="mt-0.5 size-4 accent-[#2d8a6b]"
              />
              <span>
                Je comprends que toutes les données actuelles seront remplacées
                par celles du fichier choisi.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void restaurer()}
              disabled={
                !resumeChoisi || !caseComprise || enCoursRestauration
              }
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-[10px] bg-red-600 px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuUpload size={16} aria-hidden="true" />
              {enCoursRestauration ? "Restauration en cours…" : "Restaurer"}
            </button>

            {erreurRestauration ? (
              <MessageErreur>{erreurRestauration}</MessageErreur>
            ) : null}

            {enCoursRestauration ? (
              <Aide>
                La base est en cours de reconstruction, ne fermez pas
                l'application.
              </Aide>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Où vivent les données ──────────────────────────────── */}
      <section className={carteCls}>
        <div className="space-y-1">
          <h2 className={titreBlocCls}>Où vivent vos données ?</h2>
          <p className={astuceCls}>
            Votre école est enregistrée dans la mémoire de cet appareil (base
            SQLite locale) : rien ne circule sur Internet et l'application
            marche même sans réseau. C'est pourquoi la sauvegarde ci-dessus est
            votre seule photocopie. Le lien vers un serveur central (Supabase)
            viendra plus tard.
          </p>
        </div>

        <p className={astuceCls}>
          {versionSchema !== null ? (
            <>
              Base à jour : v{versionSchema}
              {nbEleves !== null ? (
                <>
                  {" "}
                  · actuellement {nbEleves} élèves et {nbClasses} classes.
                </>
              ) : null}
            </>
          ) : (
            <>Compteurs indisponibles pour le moment.</>
          )}
        </p>

        <Link
          to="/diagnostic"
          className="inline-flex items-center gap-1.5 self-start rounded p-1 text-[12.5px] text-stone-500 hover:text-stone-900 hover:underline focus-visible:outline-2 focus-visible:outline-[#2d8a6b]"
        >
          <LuInfo size={14} aria-hidden="true" />
          Ouvrir le diagnostic de la base de données
        </Link>
      </section>

      <Aide>
        Conseil : faites une sauvegarde après chaque grande journée de saisie,
        et gardez toujours une copie hors de l'appareil.
      </Aide>
    </div>
  );
}
