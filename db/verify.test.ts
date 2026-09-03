import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "./migrate";
import { runDatabaseVerification } from "./verify";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-verify-"));
  tempDirs.push(dir);
  return path.join(dir, "test.sqlite");
}

describe("database verification", () => {
  it("runs migrations and verifies a settings query", () => {
    const databasePath = makeTempDatabasePath();

    runMigrations(databasePath);
    const result = runDatabaseVerification(databasePath);

    expect(fs.existsSync(databasePath)).toBe(true);
    expect(result).toEqual({ key: "db.verify", value: "ok" });
  });
});
