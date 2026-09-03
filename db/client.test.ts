import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { defaultDatabasePath, ensureDatabaseDirectory, getDatabasePath } from "./paths";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-db-"));
  tempDirs.push(dir);
  return path.join(dir, "nested", "test.sqlite");
}

describe("database paths", () => {
  it("defaults to the local development database path", () => {
    expect(defaultDatabasePath.endsWith(path.join(".local", "stylecraft-dev.sqlite"))).toBe(true);
    expect(getDatabasePath()).toBe(defaultDatabasePath);
  });

  it("creates the database directory", () => {
    const databasePath = makeTempDatabasePath();

    expect(ensureDatabaseDirectory(databasePath)).toBe(databasePath);
    expect(fs.existsSync(path.dirname(databasePath))).toBe(true);
  });
});

describe("database client", () => {
  it("creates a SQLite file and enables foreign keys", () => {
    const databasePath = makeTempDatabasePath();
    const { sqlite } = createDb(databasePath);

    const pragma = sqlite.pragma("foreign_keys", { simple: true });
    sqlite.close();

    expect(fs.existsSync(databasePath)).toBe(true);
    expect(pragma).toBe(1);
  });
});
