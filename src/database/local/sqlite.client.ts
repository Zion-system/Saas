import type { SqlValue } from "@sqlite.org/sqlite-wasm";
import type { SQLiteRow, SQLiteStatement } from "./sqlite.types";

interface SQLiteReadyResponse {
  type: "READY";
  requestId: number;
  message: string;
  schemaVersion: number;
}

interface SQLiteWriteResponse {
  type: "WRITE_SUCCESS";
  requestId: number;
  message: string;
}

interface SQLiteReadResponse {
  type: "READ_SUCCESS";
  requestId: number;
  rows: TestRow[];
}

interface SQLiteErrorResponse {
  type: "ERROR";
  requestId: number;
  message: string;
  resultCode?: number;
}

interface SQLiteQueryResponse {
  type: "QUERY_SUCCESS";
  requestId: number;
  rows: SQLiteRow[];
}

interface SQLiteTransactionResponse {
  type: "TRANSACTION_SUCCESS";
  requestId: number;
  rows: SQLiteRow[][];
}

export class SQLiteCommandError extends Error {
  readonly resultCode?: number;

  constructor(message: string, resultCode?: number) {
    super(message);
    this.name = "SQLiteCommandError";
    this.resultCode = resultCode;
  }
}

interface TestRow {
  id: number;
  message: string;
  created_at: string;
}

type SQLiteResponse =
  | SQLiteReadyResponse
  | SQLiteWriteResponse
  | SQLiteReadResponse
  | SQLiteQueryResponse
  | SQLiteTransactionResponse
  | SQLiteErrorResponse;

interface PendingRequest {
  resolve: (response: SQLiteResponse) => void;
  reject: (error: Error) => void;
  timeout: number;
}

let worker: Worker | null = null;

let requestCounter = 0;

const pendingRequests = new Map<number, PendingRequest>();

let initializationPromise: Promise<SQLiteReadyResponse> | null = null;

function creerWorker(): Worker {
  const instance = new Worker(new URL("./sqlite.worker.ts", import.meta.url), {
    type: "module",
  });

  instance.onmessage = (event: MessageEvent<SQLiteResponse>) => {
    const response = event.data;
    const pending = pendingRequests.get(response.requestId);

    if (!pending) return;

    window.clearTimeout(pending.timeout);
    pendingRequests.delete(response.requestId);

    if (response.type === "ERROR") {
      pending.reject(
        new SQLiteCommandError(response.message, response.resultCode),
      );
    } else {
      pending.resolve(response);
    }
  };

  instance.onerror = () => {
    const error = new Error("Erreur de communication avec le Worker SQLite.");

    for (const pending of pendingRequests.values()) {
      window.clearTimeout(pending.timeout);
      pending.reject(error);
    }

    pendingRequests.clear();

    instance.terminate();
    worker = null;
    initializationPromise = null;
  };

  return instance;
}

function envoyerCommande(
  type: string,
  payload?: unknown,
): Promise<SQLiteResponse> {
  if (!worker) {
    return Promise.reject(new Error("Le Worker SQLite n'est pas disponible."));
  }

  const requestId = ++requestCounter;

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingRequests.delete(requestId);

      reject(new Error(`Délai dépassé pour la commande SQLite : ${type}`));
    }, 15000);

    pendingRequests.set(requestId, {
      resolve,
      reject,
      timeout,
    });

    worker!.postMessage({
      type,
      payload,
      requestId,
    });
  });
}

export function initialiserBaseLocale(): Promise<SQLiteReadyResponse> {
  if (initializationPromise) {
    return initializationPromise;
  }

  worker = creerWorker();

  initializationPromise = envoyerCommande("INIT")
    .then((response) => {
      if (response.type !== "READY") {
        throw new Error("Réponse inattendue lors de l'initialisation.");
      }

      return response;
    })
    .catch((error: unknown) => {
      worker?.terminate();
      worker = null;
      initializationPromise = null;

      throw error;
    });

  return initializationPromise;
}

export async function testerEcriture(message: string): Promise<void> {
  await initialiserBaseLocale();

  const response = await envoyerCommande("TEST_WRITE", { message });

  if (response.type !== "WRITE_SUCCESS") {
    throw new Error("Échec de l'enregistrement du test.");
  }
}

export async function testerLecture(): Promise<TestRow[]> {
  await initialiserBaseLocale();

  const response = await envoyerCommande("TEST_READ");

  if (response.type !== "READ_SUCCESS") {
    throw new Error("Échec de la lecture des données.");
  }

  return response.rows;
}

export async function executerRequete(
  sql: string,
  bind: SqlValue[] = [],
): Promise<SQLiteRow[]> {
  await initialiserBaseLocale();

  const response = await envoyerCommande("QUERY", { sql, bind });

  if (response.type !== "QUERY_SUCCESS") {
    throw new Error("Réponse inattendue lors de l'exécution SQL.");
  }

  return response.rows;
}

export async function executerTransaction(
  statements: SQLiteStatement[],
): Promise<SQLiteRow[][]> {
  await initialiserBaseLocale();

  const response = await envoyerCommande("TRANSACTION", { statements });

  if (response.type !== "TRANSACTION_SUCCESS") {
    throw new Error("Réponse inattendue lors de la transaction SQLite.");
  }

  return response.rows;
}
