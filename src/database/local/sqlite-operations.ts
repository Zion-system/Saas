import type { SQLiteRow, SQLiteStatement } from "./sqlite.types";

export type SQLiteStatementRunner = (statement: SQLiteStatement) => SQLiteRow[];
export type SQLiteControlRunner = (sql: string) => void;

export function executerTransactionSQLite(
  runStatement: SQLiteStatementRunner,
  runControl: SQLiteControlRunner,
  statements: SQLiteStatement[],
): SQLiteRow[][] {
  if (statements.length === 0) {
    throw new Error("La transaction doit contenir au moins une instruction.");
  }

  runControl("BEGIN IMMEDIATE;");

  try {
    const rows = statements.map(runStatement);
    runControl("COMMIT;");
    return rows;
  } catch (error) {
    try {
      runControl("ROLLBACK;");
    } catch {
      // Préserver l'erreur initiale.
    }

    throw error;
  }
}
