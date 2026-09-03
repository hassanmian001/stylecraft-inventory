import fs from "node:fs";
import path from "node:path";

export const defaultDatabasePath = path.resolve(process.cwd(), ".local", "stylecraft-dev.sqlite");

export function getDatabasePath(customPath = process.env.STYLECRAFT_DB_PATH, dataDirectory = process.env.STYLECRAFT_DATA_DIR) {
  if (customPath?.trim()) {
    return path.resolve(customPath);
  }

  if (dataDirectory?.trim()) {
    return path.resolve(dataDirectory, "stylecraft.sqlite");
  }

  return defaultDatabasePath;
}

export function ensureDatabaseDirectory(databasePath = getDatabasePath()) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  return databasePath;
}
