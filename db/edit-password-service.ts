import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { settings } from "./schema.js";

const editPasswordKey = "security.sale_edit_password";
const keyLength = 64;

export type EditPasswordStatusDto = {
  isSet: boolean;
};

export class EditPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditPasswordError";
  }
}

/** Stored as `scrypt$<salt hex>$<hash hex>` so the plain password is never kept. */
function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, keyLength).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyAgainstStored(password: string, stored: string) {
  const [scheme, salt, expected] = stored.split("$");

  if (scheme !== "scrypt" || !salt || !expected) {
    return false;
  }

  const actual = scryptSync(password, salt, keyLength).toString("hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function readStoredPassword(databasePath?: string) {
  const { sqlite, db } = createDb(databasePath);

  try {
    return db.select().from(settings).where(eq(settings.key, editPasswordKey)).get()?.value ?? null;
  } finally {
    sqlite.close();
  }
}

export function getEditPasswordStatus(databasePath?: string): EditPasswordStatusDto {
  runMigrations(databasePath);
  return { isSet: readStoredPassword(databasePath) !== null };
}

/**
 * Sets or changes the password that unlocks editing a recorded sale. Once a
 * password exists the current one has to be supplied to replace it, so someone
 * who finds an unattended till cannot simply lock the owner out.
 */
export function setEditPassword(databasePath: string | undefined, newPassword: string, currentPassword?: string | null): EditPasswordStatusDto {
  runMigrations(databasePath);

  const trimmed = newPassword.trim();

  if (trimmed.length < 4) {
    throw new EditPasswordError("Password must be at least 4 characters.");
  }

  const stored = readStoredPassword(databasePath);

  if (stored !== null && !verifyAgainstStored((currentPassword ?? "").trim(), stored)) {
    throw new EditPasswordError("Current password is not correct.");
  }

  const { sqlite, db } = createDb(databasePath);
  const now = new Date();

  try {
    const value = hashPassword(trimmed);
    db.insert(settings)
      .values({ key: editPasswordKey, value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
      .run();

    return { isSet: true };
  } finally {
    sqlite.close();
  }
}

export function clearEditPassword(databasePath: string | undefined, currentPassword: string): EditPasswordStatusDto {
  runMigrations(databasePath);
  const stored = readStoredPassword(databasePath);

  if (stored === null) {
    return { isSet: false };
  }

  if (!verifyAgainstStored(currentPassword.trim(), stored)) {
    throw new EditPasswordError("Current password is not correct.");
  }

  const { sqlite, db } = createDb(databasePath);

  try {
    db.delete(settings).where(eq(settings.key, editPasswordKey)).run();
    return { isSet: false };
  } finally {
    sqlite.close();
  }
}

export function verifyEditPassword(databasePath: string | undefined, password: string): boolean {
  runMigrations(databasePath);
  const stored = readStoredPassword(databasePath);

  // With no password configured, editing is open — the shop has not asked for the lock.
  if (stored === null) {
    return true;
  }

  return verifyAgainstStored(password.trim(), stored);
}

/** Throws unless the supplied password unlocks editing. */
export function assertEditPassword(databasePath: string | undefined, password: string | null | undefined) {
  if (!verifyEditPassword(databasePath, password ?? "")) {
    throw new EditPasswordError("Edit password is not correct.");
  }
}
