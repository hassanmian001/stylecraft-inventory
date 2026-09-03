import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getBusinessSettings, SettingsValidationError, updateBusinessSettings } from "./settings-service";
import { runMigrations } from "./migrate";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-settings-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

describe("settings service", () => {
  it("returns PKR business defaults", () => {
    expect(getBusinessSettings(makeTempDatabasePath())).toEqual({
      businessName: "StyleCraft",
      phone: "+92 326 0609031",
      email: "stylecraftpk.com@gmail.com",
      address: null,
      currencySymbol: "Rs.",
      invoicePrefix: "INV",
    });
  });

  it("saves and normalizes business settings", () => {
    const databasePath = makeTempDatabasePath();

    const settings = updateBusinessSettings(databasePath, {
      businessName: " StyleCraft Lahore ",
      phone: " 0300-0000000 ",
      email: " sales@example.com ",
      address: " Lahore ",
      currencySymbol: " Rs. ",
      invoicePrefix: " sc ",
    });

    expect(settings).toEqual({
      businessName: "StyleCraft Lahore",
      phone: "0300-0000000",
      email: "sales@example.com",
      address: "Lahore",
      currencySymbol: "Rs.",
      invoicePrefix: "SC",
    });
    expect(getBusinessSettings(databasePath)).toEqual(settings);
  });

  it("rejects missing required business settings", () => {
    const databasePath = makeTempDatabasePath();

    expect(() =>
      updateBusinessSettings(databasePath, {
        businessName: "",
        phone: null,
        email: null,
        address: null,
        currencySymbol: "Rs.",
        invoicePrefix: "INV",
      }),
    ).toThrow(SettingsValidationError);
  });
});
