import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "./migrate";
import { createProduct, type ProductInput } from "./products-service";
import { createPurchase, createSupplier } from "./purchases-service";
import { getReports } from "./reports-service";
import { createCustomer, createSale } from "./sales-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-reports-"));
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

describe("reports service", () => {
  it("builds sales, purchase, profit, and stock reports with date filters", () => {
    const databasePath = makeTempDatabasePath();
    const shirt = createProduct(databasePath, makeProductInput({ name: "Oxford Shirt", sku: "SHIRT", purchasePriceCents: 1_000, currentStock: 5 }));
    const pants = createProduct(databasePath, makeProductInput({ name: "Chino Pants", sku: "PANTS", purchasePriceCents: 2_000, currentStock: 3 }));
    const supplier = createSupplier(databasePath, { name: "Fabric House" });
    const customer = createCustomer(databasePath, { name: "Jane Buyer" });

    createPurchase(databasePath, {
      supplierId: supplier.id,
      purchaseDate: new Date(2026, 6, 9, 9),
      items: [
        { variantId: shirt.variants[0].id, quantity: 4, unitCostCents: 1_000 },
        { variantId: pants.variants[0].id, quantity: 2, unitCostCents: 2_000 },
      ],
      notes: "Included purchase",
    });
    createPurchase(databasePath, {
      supplierId: supplier.id,
      purchaseDate: new Date(2026, 5, 30, 9),
      items: [{ variantId: shirt.variants[0].id, quantity: 1, unitCostCents: 1_000 }],
      notes: "Old purchase",
    });
    createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date(2026, 6, 9, 10),
      paymentMethod: "Cash",
      notes: "Included sale",
      items: [
        { variantId: shirt.variants[0].id, quantity: 2, unitPriceCents: 1_500, discountAmountCents: 100 },
        { variantId: pants.variants[0].id, quantity: 1, unitPriceCents: 3_000 },
      ],
    });
    createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date(2026, 5, 30, 10),
      items: [{ variantId: shirt.variants[0].id, quantity: 1, unitPriceCents: 1_500 }],
    });

    const reports = getReports(databasePath, { startDate: "2026-07-01", endDate: "2026-07-31" });

    expect(reports.salesRows).toEqual([
      expect.objectContaining({
        invoiceNumber: "INV-000001",
        customerName: "Jane Buyer",
        itemCount: 2,
        subtotalCents: 6_000,
        discountAmountCents: 100,
        totalAmountCents: 5_900,
        profitAmountCents: 1_900,
        paymentMethod: "Cash",
        notes: "Included sale",
      }),
    ]);
    expect(reports.purchaseRows).toEqual([
      expect.objectContaining({ supplierName: "Fabric House", itemCount: 2, totalAmountCents: 8_000, notes: "Included purchase" }),
    ]);
    expect(reports.profitRows).toEqual([
      expect.objectContaining({ invoiceNumber: "INV-000001", revenueCents: 5_900, costCents: 4_000, discountAmountCents: 100, profitAmountCents: 1_900 }),
    ]);
    expect(reports.stockRows).toEqual([
      expect.objectContaining({ name: "Chino Pants", currentStock: 4, inventoryValueCents: 8_000, isLowStock: false }),
      expect.objectContaining({ name: "Oxford Shirt", currentStock: 7, inventoryValueCents: 7_000, isLowStock: false }),
    ]);
    expect(reports.totals).toMatchObject({
      salesTotalCents: 5_900,
      purchaseTotalCents: 8_000,
      revenueCents: 5_900,
      costCents: 4_000,
      discountCents: 100,
      profitCents: 1_900,
      stockQuantity: 11,
      inventoryValueCents: 15_000,
    });
  });

  it("returns empty date-filtered reports while stock remains current-state", () => {
    const databasePath = makeTempDatabasePath();
    createProduct(databasePath, makeProductInput({ name: "Stock Only", sku: "STOCK", currentStock: 2, lowStockThreshold: 5 }));

    const reports = getReports(databasePath, { startDate: "2026-01-01", endDate: "2026-01-31" });

    expect(reports.salesRows).toEqual([]);
    expect(reports.purchaseRows).toEqual([]);
    expect(reports.profitRows).toEqual([]);
    expect(reports.stockRows).toEqual([expect.objectContaining({ name: "Stock Only", isLowStock: true })]);
  });
});
