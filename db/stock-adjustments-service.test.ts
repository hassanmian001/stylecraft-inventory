import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { listAuditLogs } from "./audit-service";
import { runMigrations } from "./migrate";
import { createProduct, type ProductInput } from "./products-service";
import { stockMovements } from "./schema";
import { adjustStock, StockAdjustmentValidationError } from "./stock-adjustments-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-stock-adjustments-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeProductInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Oxford Shirt",
    sku: "OX-1",
    categoryName: "Shirts",
    purchasePriceCents: 1_000,
    sellingPriceCents: 1_800,
    currentStock: 5,
    lowStockThreshold: 2,
    isActive: true,
    ...overrides,
  };
}

describe("stock adjustment service", () => {
  it("updates stock, records a stock movement, and creates an audit log in one workflow", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput());

    const adjustment = adjustStock(databasePath, {
      productId: product.id,
      newStock: 8,
      reason: "Physical count",
      actorName: "Owner",
    });

    expect(adjustment).toMatchObject({
      productId: product.id,
      productName: "Oxford Shirt",
      productSku: "OX-1",
      stockBefore: 5,
      stockAfter: 8,
      quantityChange: 3,
    });

    const { sqlite, db } = createDb(databasePath);

    try {
      const movement = db.select().from(stockMovements).where(eq(stockMovements.id, adjustment.stockMovementId)).get();

      expect(movement).toMatchObject({
        productId: product.id,
        movementType: "adjustment",
        referenceType: "stock_adjustment",
        quantityChange: 3,
        stockBefore: 5,
        stockAfter: 8,
        notes: "Physical count",
      });
    } finally {
      sqlite.close();
    }

    const auditLogs = listAuditLogs(databasePath, { action: "stock.adjusted", entityType: "product", entityId: product.id });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({ id: adjustment.auditLogId, actorName: "Owner" });
    expect(auditLogs[0].details).toContain("Physical count");
  });

  it("allows stock decreases without allowing negative stock", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ currentStock: 5 }));

    const adjustment = adjustStock(databasePath, { productId: product.id, newStock: 2, reason: "Damaged items" });

    expect(adjustment.quantityChange).toBe(-3);
    expect(adjustment.stockAfter).toBe(2);
    expect(() => adjustStock(databasePath, { productId: product.id, newStock: -1, reason: "Invalid" })).toThrow(StockAdjustmentValidationError);
  });

  it("rejects no-op, missing reason, missing product, and inactive product adjustments", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ currentStock: 5 }));
    const inactiveProduct = createProduct(databasePath, makeProductInput({ sku: "INACTIVE", isActive: false }));

    expect(() => adjustStock(databasePath, { productId: product.id, newStock: 5, reason: "No change" })).toThrow(StockAdjustmentValidationError);
    expect(() => adjustStock(databasePath, { productId: product.id, newStock: 4, reason: " " })).toThrow(StockAdjustmentValidationError);
    expect(() => adjustStock(databasePath, { productId: 999, newStock: 4, reason: "Missing" })).toThrow(StockAdjustmentValidationError);
    expect(() => adjustStock(databasePath, { productId: inactiveProduct.id, newStock: 4, reason: "Inactive" })).toThrow(StockAdjustmentValidationError);
  });
});
