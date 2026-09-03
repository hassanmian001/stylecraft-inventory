import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { ensureDatabaseDirectory } from "./paths.js";
import { settings } from "./schema.js";

const backupLocationKey = "backup.location";

export type BackupSettingsDto = {
  backupLocation: string;
  isDefaultLocation: boolean;
};

export type BackupResultDto = {
  backupPath: string;
  backupDirectory: string;
  createdAt: Date;
};

export type RestoreResultDto = {
  restoredFrom: string;
  restoredAt: Date;
};

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

function defaultBackupLocation(databasePath: string) {
  return path.join(path.dirname(databasePath), "backups");
}

function normalizePath(value: string, fieldName: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new BackupValidationError(`${fieldName} is required.`);
  }

  return path.resolve(trimmedValue);
}

function timestampForFileName(value: Date) {
  const pad = (part: number, length = 2) => String(part).padStart(length, "0");

  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}-${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}-${pad(value.getMilliseconds(), 3)}`;
}

function readBackupLocation(databasePath: string) {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db.select({ value: settings.value }).from(settings).where(eq(settings.key, backupLocationKey)).get()?.value.trim() || null;
  } finally {
    sqlite.close();
  }
}

export function getBackupSettings(databasePath: string): BackupSettingsDto {
  const savedLocation = readBackupLocation(databasePath);

  return {
    backupLocation: path.resolve(savedLocation ?? defaultBackupLocation(databasePath)),
    isDefaultLocation: savedLocation === null,
  };
}

export function updateBackupLocation(databasePath: string, backupLocation: string): BackupSettingsDto {
  const normalizedLocation = normalizePath(backupLocation, "Backup location");

  runMigrations(databasePath);
  fs.mkdirSync(normalizedLocation, { recursive: true });
  const { sqlite, db } = createDb(databasePath);

  try {
    db.insert(settings)
      .values({ key: backupLocationKey, value: normalizedLocation, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: normalizedLocation, updatedAt: new Date() } })
      .run();
  } finally {
    sqlite.close();
  }

  return getBackupSettings(databasePath);
}

export function createBackup(databasePath: string, backupLocation?: string | null, now = new Date()): BackupResultDto {
  runMigrations(databasePath);
  const sourcePath = ensureDatabaseDirectory(databasePath);
  const backupDirectory = backupLocation?.trim() ? normalizePath(backupLocation, "Backup location") : getBackupSettings(databasePath).backupLocation;

  fs.mkdirSync(backupDirectory, { recursive: true });

  const backupPath = path.join(backupDirectory, `stylecraft-backup-${timestampForFileName(now)}.sqlite`);

  try {
    fs.copyFileSync(sourcePath, backupPath, fs.constants.COPYFILE_EXCL);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
      throw new BackupValidationError("A backup file with this name already exists. Create another backup or choose a different location.");
    }

    throw error;
  }

  return { backupPath, backupDirectory, createdAt: now };
}

export function restoreBackup(databasePath: string, backupPath: string, now = new Date()): RestoreResultDto {
  const sourcePath = normalizePath(backupPath, "Backup file");

  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new BackupValidationError("Backup file was not found.");
  }

  const targetPath = ensureDatabaseDirectory(databasePath);
  const temporaryRestorePath = path.join(path.dirname(targetPath), `.restore-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);

  try {
    fs.copyFileSync(sourcePath, temporaryRestorePath);
    runMigrations(temporaryRestorePath);
    fs.copyFileSync(temporaryRestorePath, targetPath);
  } finally {
    fs.rmSync(temporaryRestorePath, { force: true });
  }

  return { restoredFrom: sourcePath, restoredAt: now };
}
