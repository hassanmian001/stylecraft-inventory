import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createDb } from "./client.js";
import { getDatabasePath } from "./paths.js";

function isMainModule() {
  return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

export function getMigrationsFolder() {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  const packagedMigrationsPath = resourcesPath === undefined ? null : path.join(resourcesPath, "drizzle");

  if (packagedMigrationsPath !== null && fs.existsSync(packagedMigrationsPath)) {
    return packagedMigrationsPath;
  }

  return path.resolve(process.cwd(), "drizzle");
}

export function runMigrations(databasePath = getDatabasePath()) {
  const { sqlite, db } = createDb(databasePath);

  try {
    migrate(db, { migrationsFolder: getMigrationsFolder() });
  } finally {
    sqlite.close();
  }
}

if (isMainModule()) {
  const databasePath = getDatabasePath();
  runMigrations(databasePath);
  console.log(`Migrations applied to ${databasePath}`);
}
