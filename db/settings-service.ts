import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { settings } from "./schema.js";

const defaultBusinessPhone = "+92 326 0609031";
const defaultBusinessEmail = "stylecraftpk.com@gmail.com";

export type BusinessSettingsDto = {
  businessName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currencySymbol: string;
  invoicePrefix: string;
};

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

const businessSettingKeys = {
  businessName: "business.name",
  phone: "business.phone",
  email: "business.email",
  address: "business.address",
  currencySymbol: "currency.symbol",
  invoicePrefix: "invoice.prefix",
} as const;

function trimmedOrNull(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeBusinessSettings(input: BusinessSettingsDto): BusinessSettingsDto {
  const businessName = input.businessName.trim();
  const currencySymbol = input.currencySymbol.trim();
  const invoicePrefix = input.invoicePrefix.trim().toUpperCase();

  if (!businessName) {
    throw new SettingsValidationError("Business name is required.");
  }

  if (!currencySymbol) {
    throw new SettingsValidationError("Currency symbol is required.");
  }

  if (!invoicePrefix) {
    throw new SettingsValidationError("Invoice prefix is required.");
  }

  return {
    businessName,
    phone: trimmedOrNull(input.phone),
    email: trimmedOrNull(input.email),
    address: trimmedOrNull(input.address),
    currencySymbol,
    invoicePrefix,
  };
}

function rowsToBusinessSettings(rows: Array<typeof settings.$inferSelect>): BusinessSettingsDto {
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    businessName: trimmedOrNull(values.get(businessSettingKeys.businessName)) ?? "StyleCraft",
    phone: trimmedOrNull(values.get(businessSettingKeys.phone)) ?? defaultBusinessPhone,
    email: trimmedOrNull(values.get(businessSettingKeys.email)) ?? defaultBusinessEmail,
    address: trimmedOrNull(values.get(businessSettingKeys.address)),
    currencySymbol: trimmedOrNull(values.get(businessSettingKeys.currencySymbol)) ?? "Rs.",
    invoicePrefix: trimmedOrNull(values.get(businessSettingKeys.invoicePrefix)) ?? "INV",
  };
}

export function getBusinessSettings(databasePath?: string): BusinessSettingsDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return rowsToBusinessSettings(db.select().from(settings).all());
  } finally {
    sqlite.close();
  }
}

export function updateBusinessSettings(databasePath: string | undefined, input: BusinessSettingsDto): BusinessSettingsDto {
  runMigrations(databasePath);
  const normalizedInput = normalizeBusinessSettings(input);
  const { sqlite, db } = createDb(databasePath);
  const now = new Date();

  try {
    for (const [fieldName, key] of Object.entries(businessSettingKeys)) {
      const value = normalizedInput[fieldName as keyof BusinessSettingsDto] ?? "";
      db.insert(settings)
        .values({ key, value, updatedAt: now })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
        .run();
    }

    return rowsToBusinessSettings(db.select().from(settings).all());
  } finally {
    sqlite.close();
  }
}
