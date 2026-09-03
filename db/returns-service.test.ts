import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { listAuditLogs } from "./audit-service";
import { runMigrations } from "./migrate";
import { createProduct, type ProductInput } from "./products-service";
import { createPurchase } from "./purchases-service";
import { createSale } from "./sales-service";
import { products, purchaseReturnItems, saleReturnItems, stockMovements } from "./schema";
import {
  createPurchaseReturn,
  createSaleReturn,
  listPurchaseReturnCandidates,
  listPurchaseReturns,
  listSaleReturnCandidates,
  listSaleReturns,
  ReturnValidationError,
} from "./returns-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-returns-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeProductInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Shirt",
    sku: "A1",
    categoryName: "Apparel",
    purchasePriceCents: 1_000,
    sellingPriceCents: 1_500,
    currentStock: 5,
    lowStockThreshold: 2,
    isActive: true,
    ...overrides,
  };
}

describe("returns service", () => {
  it("creates a sale return, increases stock, records movement, and creates audit log", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ currentStock: 5, purchasePriceCents: 1_000 }));
    const sale = createSale(databasePath, {
      customerName: "Walk-in",
      saleDate: new Date("2026-07-10T00:00:00.000Z"),
      items: [{ productId: product.id, quantity: 3, unitPriceCents: 1_500, discountAmountCents: 300 }],
    });
    const candidate = listSaleReturnCandidates(databasePath)[0];

    const saleReturn = createSaleReturn(databasePath, {
      saleId: sale.id,
      returnDate: new Date("2026-07-11T00:00:00.000Z"),
      notes: "Customer size exchange",
      actorName: "Owner",
      items: [{ sourceItemId: candidate.items[0].saleItemId, quantity: 2 }],
    });

    expect(saleReturn).toMatchObject({ saleId: sale.id, invoiceNumber: "INV-000001", totalAmountCents: 2_800, itemCount: 1 });
    expect(listSaleReturns(databasePath)).toHaveLength(1);
    expect(listSaleReturnCandidates(databasePath)[0].items[0]).toMatchObject({ returnedQuantity: 2, returnableQuantity: 1 });

    const { sqlite, db } = createDb(databasePath);

    try {
      expect(db.select().from(products).where(eq(products.id, product.id)).get()?.currentStock).toBe(4);
      expect(db.select().from(saleReturnItems).all()[0]).toMatchObject({ quantity: 2, totalAmountCents: 2_800, profitReversalCents: 800 });
      expect(db.select().from(stockMovements).where(eq(stockMovements.referenceType, "sale_return")).get()).toMatchObject({
        quantityChange: 2,
        stockBefore: 2,
        stockAfter: 4,
      });
    } finally {
      sqlite.close();
    }

    expect(listAuditLogs(databasePath, { action: "sale.returned" })[0]).toMatchObject({ entityId: sale.id, actorName: "Owner" });
  });

  it("blocks sale returns above the remaining sold quantity", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ currentStock: 5 }));
    const sale = createSale(databasePath, {
      saleDate: new Date("2026-07-10T00:00:00.000Z"),
      items: [{ productId: product.id, quantity: 1, unitPriceCents: 1_500 }],
    });
    const saleItemId = listSaleReturnCandidates(databasePath)[0].items[0].saleItemId;

    expect(() =>
      createSaleReturn(databasePath, {
        saleId: sale.id,
        returnDate: new Date("2026-07-11T00:00:00.000Z"),
        items: [{ sourceItemId: saleItemId, quantity: 2 }],
      }),
    ).toThrow(ReturnValidationError);
  });

  it("creates a purchase return, decreases stock, records movement, and blocks negative stock", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ currentStock: 2 }));
    const purchase = createPurchase(databasePath, {
      supplierName: "Fabric House",
      purchaseDate: new Date("2026-07-10T00:00:00.000Z"),
      items: [{ productId: product.id, quantity: 4, unitCostCents: 1_250 }],
    });
    const candidate = listPurchaseReturnCandidates(databasePath)[0];

    const purchaseReturn = createPurchaseReturn(databasePath, {
      purchaseId: purchase.id,
      returnDate: new Date("2026-07-11T00:00:00.000Z"),
      notes: "Damaged batch",
      actorName: "Manager",
      items: [{ sourceItemId: candidate.items[0].purchaseItemId, quantity: 3 }],
    });

    expect(purchaseReturn).toMatchObject({ purchaseId: purchase.id, supplierName: "Fabric House", totalAmountCents: 3_750, itemCount: 1 });
    expect(listPurchaseReturns(databasePath)).toHaveLength(1);

    const { sqlite, db } = createDb(databasePath);

    try {
      expect(db.select().from(products).where(eq(products.id, product.id)).get()?.currentStock).toBe(3);
      expect(db.select().from(purchaseReturnItems).all()[0]).toMatchObject({ quantity: 3, totalCostCents: 3_750 });
      expect(db.select().from(stockMovements).where(eq(stockMovements.referenceType, "purchase_return")).get()).toMatchObject({
        quantityChange: -3,
        stockBefore: 6,
        stockAfter: 3,
      });
    } finally {
      sqlite.close();
    }

    expect(() =>
      createPurchaseReturn(databasePath, {
        purchaseId: purchase.id,
        returnDate: new Date("2026-07-12T00:00:00.000Z"),
        items: [{ sourceItemId: candidate.items[0].purchaseItemId, quantity: 2 }],
      }),
    ).toThrow(ReturnValidationError);
    expect(listAuditLogs(databasePath, { action: "purchase.returned" })[0]).toMatchObject({ entityId: purchase.id, actorName: "Manager" });
  });
});
