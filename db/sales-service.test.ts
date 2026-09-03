import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { runMigrations } from "./migrate";
import { createProduct, markProductInactive, type ProductInput } from "./products-service";
import { createCustomer, createSale, listCustomers, listSales, SaleValidationError, type SaleInput } from "./sales-service";
import { products, saleItems, sales, stockMovements } from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-sales-"));
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
    customerName: "Walk-in Customer",
    saleDate: new Date("2026-07-09T00:00:00.000Z"),
    paymentMethod: "Cash",
    notes: "Counter sale",
    items: [],
    ...overrides,
  };
}

function tableCounts(databasePath: string) {
  const { sqlite, db } = createDb(databasePath);

  try {
    return {
      sales: db.select().from(sales).all().length,
      saleItems: db.select().from(saleItems).all().length,
      stockMovements: db.select().from(stockMovements).all().length,
    };
  } finally {
    sqlite.close();
  }
}

describe("sales service validation", () => {
  it("rejects invalid quantity, price, discount, duplicate products, missing products, and inactive products", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "VALID" }));
    const inactiveProduct = createProduct(databasePath, makeProductInput({ sku: "INACTIVE" }));
    markProductInactive(databasePath, inactiveProduct.id);

    expect(() => createSale(databasePath, makeSaleInput({ items: [{ variantId: product.variants[0].id, quantity: 0, unitPriceCents: 100 }] }))).toThrow(
      SaleValidationError,
    );
    expect(() => createSale(databasePath, makeSaleInput({ items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: -1 }] }))).toThrow(
      SaleValidationError,
    );
    expect(() =>
      createSale(databasePath, makeSaleInput({ items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: 100, discountAmountCents: 101 }] })),
    ).toThrow(SaleValidationError);
    expect(() =>
      createSale(
        databasePath,
        makeSaleInput({
          items: [
            { variantId: product.variants[0].id, quantity: 1, unitPriceCents: 100 },
            { variantId: product.variants[0].id, quantity: 2, unitPriceCents: 100 },
          ],
        }),
      ),
    ).toThrow(SaleValidationError);
    expect(() => createSale(databasePath, makeSaleInput({ items: [{ variantId: 9999, quantity: 1, unitPriceCents: 100 }] }))).toThrow(
      SaleValidationError,
    );
    expect(() => createSale(databasePath, makeSaleInput({ items: [{ variantId: inactiveProduct.variants[0].id, quantity: 1, unitPriceCents: 100 }] }))).toThrow(
      SaleValidationError,
    );
  });
});

describe("sales service", () => {
  it("creates a single-item sale, decreases stock, records movement, and calculates profit", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "SALE-1", currentStock: 5, purchasePriceCents: 1_000 }));

    const sale = createSale(
      databasePath,
      makeSaleInput({ items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 1_500, discountAmountCents: 200 }] }),
    );

    expect(sale).toMatchObject({
      invoiceNumber: "INV-000001",
      customerName: "Walk-in Customer",
      subtotalCents: 3_000,
      discountAmountCents: 200,
      totalAmountCents: 2_800,
      profitAmountCents: 800,
      paymentMethod: "Cash",
      items: [
        {
          productId: product.id,
          productName: "Shirt",
          productSku: "SALE-1",
          quantity: 2,
          unitPriceCents: 1_500,
          unitCostCents: 1_000,
          discountAmountCents: 200,
          totalAmountCents: 2_800,
          profitAmountCents: 800,
        },
      ],
    });

    const { sqlite, db } = createDb(databasePath);

    try {
      const updatedProduct = db.select().from(products).where(eq(products.id, product.id)).get();
      const movement = db.select().from(stockMovements).where(eq(stockMovements.referenceId, sale.id)).get();

      expect(updatedProduct?.currentStock).toBe(3);
      expect(movement).toMatchObject({
        productId: product.id,
        movementType: "sale",
        referenceType: "sale",
        quantityChange: -2,
        stockBefore: 5,
        stockAfter: 3,
      });
    } finally {
      sqlite.close();
    }
  });

  it("creates multi-item sales and calculates totals", () => {
    const databasePath = makeTempDatabasePath();
    const shirt = createProduct(databasePath, makeProductInput({ sku: "SHIRT-1", currentStock: 5, purchasePriceCents: 1_000 }));
    const pants = createProduct(databasePath, makeProductInput({ name: "Pants", sku: "PANTS-1", currentStock: 7, purchasePriceCents: 2_000 }));

    const sale = createSale(
      databasePath,
      makeSaleInput({
        items: [
          { variantId: shirt.variants[0].id, quantity: 2, unitPriceCents: 1_500 },
          { variantId: pants.variants[0].id, quantity: 3, unitPriceCents: 3_000, discountAmountCents: 500 },
        ],
      }),
    );

    expect(sale.subtotalCents).toBe(12_000);
    expect(sale.discountAmountCents).toBe(500);
    expect(sale.totalAmountCents).toBe(11_500);
    expect(sale.profitAmountCents).toBe(3_500);

    const { sqlite, db } = createDb(databasePath);

    try {
      expect(db.select().from(products).where(eq(products.id, shirt.id)).get()?.currentStock).toBe(3);
      expect(db.select().from(products).where(eq(products.id, pants.id)).get()?.currentStock).toBe(4);
      expect(db.select().from(stockMovements).all()).toHaveLength(2);
    } finally {
      sqlite.close();
    }
  });

  it("blocks overselling and rolls back sale rows, item rows, stock movements, and stock changes", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "ROLLBACK-1", currentStock: 5 }));
    const beforeCounts = tableCounts(databasePath);

    expect(() => createSale(databasePath, makeSaleInput({ items: [{ variantId: product.variants[0].id, quantity: 6, unitPriceCents: 1_500 }] }))).toThrow(
      SaleValidationError,
    );

    const { sqlite, db } = createDb(databasePath);

    try {
      expect(tableCounts(databasePath)).toEqual(beforeCounts);
      expect(db.select().from(products).where(eq(products.id, product.id)).get()?.currentStock).toBe(5);
    } finally {
      sqlite.close();
    }
  });

  it("creates and lists customers", () => {
    const databasePath = makeTempDatabasePath();

    const customer = createCustomer(databasePath, { name: "  Jane Buyer  ", phone: " 555-0102 " });
    const listedCustomers = listCustomers(databasePath);

    expect(customer).toMatchObject({ name: "Jane Buyer", phone: "555-0102" });
    expect(listedCustomers).toHaveLength(1);
    expect(listedCustomers[0]).toMatchObject({ id: customer.id, name: "Jane Buyer" });
  });

  it("lists sale history with invoice number, customer name, item count, totals, and profit", () => {
    const databasePath = makeTempDatabasePath();
    const shirt = createProduct(databasePath, makeProductInput({ sku: "HISTORY-1", currentStock: 4, purchasePriceCents: 1_000 }));
    const pants = createProduct(databasePath, makeProductInput({ name: "Pants", sku: "HISTORY-2", currentStock: 4, purchasePriceCents: 1_500 }));
    const customer = createCustomer(databasePath, { name: "History Customer" });

    const sale = createSale(
      databasePath,
      makeSaleInput({
        customerId: customer.id,
        customerName: null,
        items: [
          { variantId: shirt.variants[0].id, quantity: 1, unitPriceCents: 1_500 },
          { variantId: pants.variants[0].id, quantity: 2, unitPriceCents: 2_500 },
        ],
      }),
    );

    expect(listSales(databasePath)).toEqual([
      expect.objectContaining({
        id: sale.id,
        invoiceNumber: "INV-000001",
        customerId: customer.id,
        customerName: "History Customer",
        itemCount: 2,
        totalAmountCents: 6_500,
        profitAmountCents: 2_500,
      }),
    ]);
  });
});
