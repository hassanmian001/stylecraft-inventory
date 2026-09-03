import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "./migrate";
import { createProduct, markProductInactive, type ProductInput } from "./products-service";
import { getDashboardSummary } from "./dashboard-service";
import { createSale, type SaleInput } from "./sales-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-dashboard-"));
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

function makeSaleInput(overrides: Partial<SaleInput> = {}): SaleInput {
  return {
    saleDate: new Date(2026, 6, 9, 10),
    items: [],
    ...overrides,
  };
}

describe("dashboard service", () => {
  it("summarizes active products, inventory value, sales windows, low stock, and best sellers", () => {
    const databasePath = makeTempDatabasePath();
    const shirt = createProduct(
      databasePath,
      makeProductInput({ name: "Oxford Shirt", sku: "SHIRT", currentStock: 10, lowStockThreshold: 3, purchasePriceCents: 1_000 }),
    );
    const pants = createProduct(
      databasePath,
      makeProductInput({ name: "Chino Pants", sku: "PANTS", currentStock: 4, lowStockThreshold: 4, purchasePriceCents: 2_000 }),
    );
    const belt = createProduct(
      databasePath,
      makeProductInput({ name: "Leather Belt", sku: "BELT", currentStock: 1, lowStockThreshold: 2, purchasePriceCents: 500 }),
    );
    const inactive = createProduct(
      databasePath,
      makeProductInput({ name: "Archived Hat", sku: "HAT", currentStock: 99, lowStockThreshold: 100, purchasePriceCents: 10_000 }),
    );
    markProductInactive(databasePath, inactive.id);

    createSale(
      databasePath,
      makeSaleInput({
        saleDate: new Date(2026, 6, 9, 10),
        items: [
          { variantId: shirt.variants[0].id, quantity: 3, unitPriceCents: 2_000 },
          { variantId: pants.variants[0].id, quantity: 1, unitPriceCents: 3_000, discountAmountCents: 500 },
        ],
      }),
    );
    createSale(
      databasePath,
      makeSaleInput({
        saleDate: new Date(2026, 6, 8, 10),
        items: [{ variantId: belt.variants[0].id, quantity: 1, unitPriceCents: 1_500 }],
      }),
    );
    createSale(
      databasePath,
      makeSaleInput({
        saleDate: new Date(2026, 5, 30, 10),
        items: [{ variantId: shirt.variants[0].id, quantity: 1, unitPriceCents: 2_000 }],
      }),
    );

    const summary = getDashboardSummary(databasePath, new Date(2026, 6, 9, 12));

    expect(summary.productCount).toBe(3);
    expect(summary.totalStockQuantity).toBe(9);
    expect(summary.inventoryValueCents).toBe(12_000);
    expect(summary.todaySalesCents).toBe(8_500);
    expect(summary.currentMonthSalesCents).toBe(10_000);
    expect(summary.currentMonthProfitCents).toBe(4_500);
    expect(summary.lowStockProducts).toEqual([
      { id: belt.id, variantId: belt.variants[0].id, name: "Leather Belt", sku: "BELT", variantLabel: "Standard", currentStock: 0, lowStockThreshold: 2 },
      { id: pants.id, variantId: pants.variants[0].id, name: "Chino Pants", sku: "PANTS", variantLabel: "Standard", currentStock: 3, lowStockThreshold: 4 },
    ]);
    expect(summary.bestSellingProducts).toEqual([
      { productId: shirt.id, name: "Oxford Shirt", sku: "SHIRT", quantitySold: 4, totalSalesCents: 8_000 },
      { productId: pants.id, name: "Chino Pants", sku: "PANTS", quantitySold: 1, totalSalesCents: 2_500 },
      { productId: belt.id, name: "Leather Belt", sku: "BELT", quantitySold: 1, totalSalesCents: 1_500 },
    ]);
  });

  it("returns zero values and empty lists for an empty database", () => {
    const databasePath = makeTempDatabasePath();

    expect(getDashboardSummary(databasePath, new Date(2026, 6, 9, 12))).toEqual({
      productCount: 0,
      totalStockQuantity: 0,
      inventoryValueCents: 0,
      todaySalesCents: 0,
      currentMonthSalesCents: 0,
      currentMonthProfitCents: 0,
      lowStockProducts: [],
      bestSellingProducts: [],
    });
  });
});
