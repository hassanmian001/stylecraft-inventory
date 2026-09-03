import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.js";
import { ensureDatabaseDirectory, getDatabasePath } from "./paths.js";

export type StyleCraftDatabase = BetterSQLite3Database<typeof schema>;

export function createSqliteConnection(databasePath = getDatabasePath()) {
  const resolvedPath = ensureDatabaseDirectory(databasePath);
  const sqlite = new Database(resolvedPath);
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export function createDb(databasePath = getDatabasePath()) {
  const sqlite = createSqliteConnection(databasePath);
  const db = drizzle(sqlite, { schema });

  return { sqlite, db };
}
