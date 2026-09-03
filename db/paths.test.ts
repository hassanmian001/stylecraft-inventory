import path from "node:path";
import { describe, expect, it } from "vitest";

import { defaultDatabasePath, getDatabasePath } from "./paths";

describe("database paths", () => {
  it("uses the local development database by default", () => {
    expect(getDatabasePath(undefined, undefined)).toBe(defaultDatabasePath);
  });

  it("uses an explicit database path before a data directory", () => {
    expect(getDatabasePath("custom.sqlite", "data-dir")).toBe(path.resolve("custom.sqlite"));
  });

  it("uses stylecraft.sqlite inside the configured app data directory", () => {
    expect(getDatabasePath(undefined, "data-dir")).toBe(path.resolve("data-dir", "stylecraft.sqlite"));
  });
});
