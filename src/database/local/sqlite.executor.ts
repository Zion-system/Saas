import { executerRequete, executerTransaction } from "./sqlite.client";
import type { SQLiteExecutor } from "./sqlite.types";

export const sqliteWorkerExecutor: SQLiteExecutor = {
  query: executerRequete,
  transaction: executerTransaction,
};
