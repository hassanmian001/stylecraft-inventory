import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { runMigrations } from "./migrate";
import { createProduct, markProductInactive, type ProductInput } from "./products-service";
import {
  createPurchase,
  createSupplier,
  listPurchases,
  listSuppliers,
  PurchaseValidationError,
  type PurchaseInput,
} from "./purchases-service";
import { eq } from "drizzle-orm";
import { products, purchaseItems, purchases, stockMovements } from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-purchases-"));
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

function makePurchaseInput(overrides: Partial<PurchaseInput> = {}): PurchaseInput {
  return {
    supplierName: "Main Supplier",
    purchaseDate: new Date("2026-07-09T00:00:00.000Z"),
    notes: "Restock",
    items: [],
    ...overrides,
  };
}

function tableCounts(databasePath: string) {
  const { sqlite, db } = createDb(databasePath);

  try {
    return {
      purchases: db.select().from(purchases).all().length,
      purchaseItems: db.select().from(purchaseItems).all().length,
      stockMovements: db.select().from(stockMovements).all().length,
    };
  } finally {
    sqlite.close();
  }
}

describe("purchase service validation", () => {
  it("rejects invalid quantity, unit cost, duplicate products, missing products, and inactive products", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "VALID" }));
    const inactiveProduct = createProduct(databasePath, makeProductInput({ sku: "INACTIVE" }));
    markProductInactive(databasePath, inactiveProduct.id);

    expect(() => createPurchase(databasePath, makePurchaseInput({ items: [{ productId: product.id, quantity: 0, unitCostCents: 100 }] }))).toThrow(
      PurchaseValidationError,
    );
    expect(() => createPurchase(databasePath, makePurchaseInput({ items: [{ productId: product.id, quantity: 1, unitCostCents: -1 }] }))).toThrow(
      PurchaseValidationError,
    );
    expect(() =>
      createPurchase(
        databasePath,
        makePurchaseInput({
          items: [
            { productId: product.id, quantity: 1, unitCostCents: 100 },
            { productId: product.id, quantity: 2, unitCostCents: 100 },
          ],
        }),
      ),
    ).toThrow(PurchaseValidationError);
    expect(() => createPurchase(databasePath, makePurchaseInput({ items: [{ productId: 9999, quantity: 1, unitCostCents: 100 }] }))).toThrow(
      PurchaseValidationError,
    );
    expect(() =>
      createPurchase(databasePath, makePurchaseInput({ items: [{ productId: inactiveProduct.id, quantity: 1, unitCostCents: 100 }] })),
    ).toThrow(PurchaseValidationError);
  });
});

describe("purchase service", () => {
  it("creates a single-item purchase, increases stock, and records a stock movement", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "RESTOCK-1", currentStock: 5 }));

    const purchase = createPurchase(
      databasePath,
      makePurchaseInput({ items: [{ productId: product.id, quantity: 4, unitCostCents: 1_250 }] }),
    );

    expect(purchase).toMatchObject({
      supplierName: "Main Supplier",
      totalAmountCents: 5_000,
      notes: "Restock",
      items: [{ productId: product.id, productName: "Shirt", productSku: "RESTOCK-1", quantity: 4, unitCostCents: 1_250, totalCostCents: 5_000 }],
    });

    const { sqlite, db } = createDb(databasePath);

    try {
      const updatedProduct = db.select().from(products).where(eq(products.id, product.id)).get();
      const movement = db.select().from(stockMovements).where(eq(stockMovements.referenceId, purchase.id)).get();

      expect(updatedProduct?.currentStock).toBe(9);
      expect(movement).toMatchObject({
        productId: product.id,
        movementType: "purchase",
        referenceType: "purchase",
        quantityChange: 4,
        stockBefore: 5,
        stockAfter: 9,
      });
    } finally {
      sqlite.close();
    }
  });

  it("creates multi-item purchases and calculates totals", () => {
    const databasePath = makeTempDatabasePath();
    const shirt = createProduct(databasePath, makeProductInput({ sku: "SHIRT-1", currentStock: 2 }));
    const pants = createProduct(databasePath, makeProductInput({ name: "Pants", sku: "PANTS-1", currentStock: 7 }));

    const purchase = createPurchase(
      databasePath,
      makePurchaseInput({
        items: [
          { productId: shirt.id, quantity: 3, unitCostCents: 1_000 },
          { productId: pants.id, quantity: 2, unitCostCents: 2_500 },
        ],
      }),
    );

    expect(purchase.totalAmountCents).toBe(8_000);
    expect(purchase.items).toHaveLength(2);

    const { sqlite, db } = createDb(databasePath);

    try {
      expect(db.select().from(products).where(eq(products.id, shirt.id)).get()?.currentStock).toBe(5);
      expect(db.select().from(products).where(eq(products.id, pants.id)).get()?.currentStock).toBe(9);
      expect(db.select().from(stockMovements).all()).toHaveLength(2);
    } finally {
      sqlite.close();
    }
  });

  it("rolls back purchase rows, item rows, stock movements, and stock changes when a later item fails", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "ROLLBACK-1", currentStock: 5 }));
    const beforeCounts = tableCounts(databasePath);

    expect(() =>
      createPurchase(
        databasePath,
        makePurchaseInput({
          items: [
            { productId: product.id, quantity: 4, unitCostCents: 100 },
            { productId: 9999, quantity: 1, unitCostCents: 100 },
          ],
        }),
      ),
    ).toThrow(PurchaseValidationError);

    const { sqlite, db } = createDb(databasePath);

    try {
      expect(tableCounts(databasePath)).toEqual(beforeCounts);
      expect(db.select().from(products).where(eq(products.id, product.id)).get()?.currentStock).toBe(5);
    } finally {
      sqlite.close();
    }
  });

  it("creates and lists suppliers", () => {
    const databasePath = makeTempDatabasePath();

    const supplier = createSupplier(databasePath, { name: "  Fabric House  ", phone: " 555-0101 " });
    const listedSuppliers = listSuppliers(databasePath);

    expect(supplier).toMatchObject({ name: "Fabric House", phone: "555-0101" });
    expect(listedSuppliers).toHaveLength(1);
    expect(listedSuppliers[0]).toMatchObject({ id: supplier.id, name: "Fabric House" });
  });

  it("lists purchase history with supplier name, item count, date, and totals", () => {
    const databasePath = makeTempDatabasePath();
    const shirt = createProduct(databasePath, makeProductInput({ sku: "HISTORY-1" }));
    const pants = createProduct(databasePath, makeProductInput({ name: "Pants", sku: "HISTORY-2" }));
    const supplier = createSupplier(databasePath, { name: "History Supplier" });

    const purchase = createPurchase(
      databasePath,
      makePurchaseInput({
        supplierId: supplier.id,
        supplierName: null,
        items: [
          { productId: shirt.id, quantity: 1, unitCostCents: 1_000 },
          { productId: pants.id, quantity: 2, unitCostCents: 1_500 },
        ],
      }),
    );

    expect(listPurchases(databasePath)).toEqual([
      expect.objectContaining({
        id: purchase.id,
        supplierId: supplier.id,
        supplierName: "History Supplier",
        itemCount: 2,
        totalAmountCents: 4_000,
      }),
    ]);
  });
});
