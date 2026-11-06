import { useEffect, useState } from "react";
import {
  initialiserBaseLocale,
  testerEcriture,
  testerLecture,
} from "./database/local/sqlite.client";

interface TestRow {
  id: number;
  message: string;
  created_at: string;
}

function App() {
  const [statut, setStatut] = useState("Initialisation de SQLite...");
  const [lignes, setLignes] = useState<TestRow[]>([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    initialiserBaseLocale()
      .then(() => setStatut("SQLite initialisé avec succès."))
      .catch((error: Error) => setStatut(error.message));
  }, []);

  async function ecrire() {
    setChargement(true);

    try {
      const message = `Test OPFS ${new Date().toISOString()}`;

      await testerEcriture(message);

      setStatut("Écriture réussie.");
    } catch (error) {
      setStatut(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setChargement(false);
    }
  }

  async function lire() {
    setChargement(true);

    try {
      const resultats = await testerLecture();

      setLignes(resultats);
      setStatut(`${resultats.length} enregistrement(s) récupéré(s).`);
    } catch (error) {
      setStatut(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-4 text-2xl font-bold">Diagnostic SQLite OPFS</h1>

        <p className="mb-6 rounded bg-slate-100 p-4">Statut : {statut}</p>

        <div className="flex gap-3">
          <button
            onClick={ecrire}
            disabled={chargement}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Tester l'écriture
          </button>

          <button
            onClick={lire}
            disabled={chargement}
            className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Lire les données
          </button>
        </div>

        <h2 className="mb-3 mt-8 text-lg font-semibold">Enregistrements</h2>

        <ul className="space-y-2">
          {lignes.map((ligne) => (
            <li key={ligne.id} className="rounded bg-slate-50 p-3">
              <p>{ligne.message}</p>
              <small className="text-slate-500">{ligne.created_at}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
