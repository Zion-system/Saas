import type { SqlValue } from "@sqlite.org/sqlite-wasm";

export type SQLiteRow = Record<string, SqlValue>;

export interface SQLiteStatement {
  sql: string;
  bind?: SqlValue[];
}

export interface SQLiteExecutor {
  query(sql: string, bind?: SqlValue[]): Promise<SQLiteRow[]>;
  transaction(statements: SQLiteStatement[]): Promise<SQLiteRow[][]>;
}
