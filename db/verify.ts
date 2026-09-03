import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { getDatabasePath } from "./paths.js";
import { settings } from "./schema.js";

function isMainModule() {
  return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

export function runDatabaseVerification(databasePath = getDatabasePath()) {
  const { sqlite, db } = createDb(databasePath);

  try {
    const now = new Date();

    db.insert(settings)
      .values({ key: "db.verify", value: "ok", updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: "ok", updatedAt: now },
      })
      .run();

    const row = db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(eq(settings.key, "db.verify"))
      .get();

    if (!row) {
      throw new Error("Database verification failed: db.verify setting was not found");
    }

    return row;
  } finally {
    sqlite.close();
  }
}

if (isMainModule()) {
  const databasePath = getDatabasePath();
  const row = runDatabaseVerification(databasePath);
  console.log(`Sample query succeeded for ${databasePath}: ${row.key}=${row.value}`);
}
