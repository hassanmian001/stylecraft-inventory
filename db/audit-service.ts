import { desc, eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { auditLogs } from "./schema.js";

export type AuditLogInput = {
  action: string;
  entityType: string;
  entityId?: number | null;
  actorName?: string | null;
  details?: string | null;
};

export type AuditLogListFilters = {
  action?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  search?: string | null;
};

export type AuditLogDto = {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  actorName: string | null;
  details: string | null;
  createdAt: Date;
};

export class AuditValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditValidationError";
  }
}

function nullableTrimmed(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeAuditLogInput(input: AuditLogInput) {
  const action = input.action.trim();
  const entityType = input.entityType.trim();

  if (!action) {
    throw new AuditValidationError("Audit action is required.");
  }

  if (!entityType) {
    throw new AuditValidationError("Audit entity type is required.");
  }

  if (input.entityId !== null && input.entityId !== undefined && (!Number.isInteger(input.entityId) || input.entityId <= 0)) {
    throw new AuditValidationError("Audit entity ID must be a positive whole number.");
  }

  return {
    action,
    entityType,
    entityId: input.entityId ?? null,
    actorName: nullableTrimmed(input.actorName),
    details: nullableTrimmed(input.details),
  };
}

function toAuditLogDto(row: typeof auditLogs.$inferSelect): AuditLogDto {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorName: row.actorName,
    details: row.details,
    createdAt: row.createdAt,
  };
}

function matchesFilters(log: AuditLogDto, filters: AuditLogListFilters) {
  if (filters.action && log.action !== filters.action.trim()) {
    return false;
  }

  if (filters.entityType && log.entityType !== filters.entityType.trim()) {
    return false;
  }

  if (filters.entityId !== null && filters.entityId !== undefined && log.entityId !== filters.entityId) {
    return false;
  }

  const search = filters.search?.trim().toLowerCase();

  if (!search) {
    return true;
  }

  return [log.action, log.entityType, log.actorName, log.details].some((value) => (value ?? "").toLowerCase().includes(search));
}

export function createAuditLog(databasePath: string | undefined, input: AuditLogInput): AuditLogDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeAuditLogInput(input);
    const insertedAuditLog = db.insert(auditLogs).values(normalizedInput).returning({ id: auditLogs.id }).get();
    const auditLog = db.select().from(auditLogs).where(eq(auditLogs.id, insertedAuditLog.id)).get();

    if (auditLog === undefined) {
      throw new AuditValidationError("Audit log was not found after creation.");
    }

    return toAuditLogDto(auditLog);
  } finally {
    sqlite.close();
  }
}

export function listAuditLogs(databasePath?: string, filters: AuditLogListFilters = {}): AuditLogDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .all()
      .map(toAuditLogDto)
      .filter((log) => matchesFilters(log, filters));
  } finally {
    sqlite.close();
  }
}
