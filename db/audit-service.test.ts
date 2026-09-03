import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { AuditValidationError, createAuditLog, listAuditLogs, type AuditLogInput } from "./audit-service";
import { runMigrations } from "./migrate";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-audit-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeAuditInput(overrides: Partial<AuditLogInput> = {}): AuditLogInput {
  return {
    action: "stock.adjusted",
    entityType: "product",
    entityId: 1,
    actorName: "Owner",
    details: "Adjusted stock after physical count.",
    ...overrides,
  };
}

describe("audit service", () => {
  it("creates and lists audit logs in newest-first order", () => {
    const databasePath = makeTempDatabasePath();
    createAuditLog(databasePath, makeAuditInput({ action: "product.created", entityId: 1 }));
    const secondLog = createAuditLog(databasePath, makeAuditInput({ action: "product.updated", entityId: 2, actorName: " Manager " }));

    const logs = listAuditLogs(databasePath);

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ id: secondLog.id, action: "product.updated", actorName: "Manager" });
    expect(logs[0].createdAt).toBeInstanceOf(Date);
  });

  it("filters audit logs by entity, action, and search text", () => {
    const databasePath = makeTempDatabasePath();
    createAuditLog(databasePath, makeAuditInput({ action: "product.created", entityType: "product", entityId: 1, details: "Oxford Shirt" }));
    createAuditLog(databasePath, makeAuditInput({ action: "sale.created", entityType: "sale", entityId: 2, details: "Invoice INV-000002" }));

    expect(listAuditLogs(databasePath, { entityType: "sale" }).map((log) => log.action)).toEqual(["sale.created"]);
    expect(listAuditLogs(databasePath, { entityType: "product", entityId: 1 }).map((log) => log.action)).toEqual(["product.created"]);
    expect(listAuditLogs(databasePath, { action: "sale.created", search: "invoice" }).map((log) => log.entityId)).toEqual([2]);
  });

  it("rejects invalid audit logs", () => {
    const databasePath = makeTempDatabasePath();

    expect(() => createAuditLog(databasePath, makeAuditInput({ action: " " }))).toThrow(AuditValidationError);
    expect(() => createAuditLog(databasePath, makeAuditInput({ entityType: " " }))).toThrow(AuditValidationError);
    expect(() => createAuditLog(databasePath, makeAuditInput({ entityId: 0 }))).toThrow(AuditValidationError);
  });
});
