import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { assertEditPassword, clearEditPassword, EditPasswordError, getEditPasswordStatus, setEditPassword, verifyEditPassword } from "./edit-password-service";
import { getLedgerSummary } from "./ledger-service";
import { runMigrations } from "./migrate";
import { createProduct, getProduct } from "./products-service";
import { createSaleReturn } from "./returns-service";
import { createCustomer, createSale, getSale, SaleValidationError, updateSale } from "./sales-service";
import { auditLogs, stockMovements } from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-sale-edit-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeHoodie(databasePath: string) {
  return createProduct(databasePath, {
    name: "Hoodie",
    sku: "HOOD",
    purchasePriceCents: 1_000,
    sellingPriceCents: 2_000,
    lowStockThreshold: 1,
    isActive: true,
    variants: [
      { size: "L", sku: "HOOD-L", currentStock: 10, isActive: true },
      { size: "XL", sku: "HOOD-XL", currentStock: 10, isActive: true },
    ],
  });
}

function variantStock(databasePath: string, productId: number, label: string) {
  return getProduct(databasePath, productId).variants.find((variant) => variant.label === label)?.currentStock;
}

describe("editing a recorded sale", () => {
  it("puts the old stock back and takes the new quantity", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);
    const large = product.variants[0];

    const sale = createSale(databasePath, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: large.id, quantity: 3, unitPriceCents: 2_000 }],
    });

    expect(variantStock(databasePath, product.id, "L")).toBe(7);

    const edited = updateSale(databasePath, sale.id, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: large.id, quantity: 1, unitPriceCents: 2_000 }],
    });

    expect(edited.items).toHaveLength(1);
    expect(edited.totalAmountCents).toBe(2_000);
    expect(variantStock(databasePath, product.id, "L")).toBe(9);
    expect(getProduct(databasePath, product.id).currentStock).toBe(19);
  });

  it("moves stock between sizes when the size on the line is changed", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);
    const [large, extraLarge] = product.variants;

    const sale = createSale(databasePath, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: large.id, quantity: 2, unitPriceCents: 2_000 }],
    });

    updateSale(databasePath, sale.id, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: extraLarge.id, quantity: 2, unitPriceCents: 2_000 }],
    });

    expect(variantStock(databasePath, product.id, "L")).toBe(10);
    expect(variantStock(databasePath, product.id, "XL")).toBe(8);
  });

  it("keeps the invoice number and leaves one set of stock movements", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);

    const sale = createSale(databasePath, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 2_000 }],
    });

    updateSale(databasePath, sale.id, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 5, unitPriceCents: 2_200 }],
    });

    const { sqlite, db } = createDb(databasePath);

    try {
      const movements = db.select().from(stockMovements).where(eq(stockMovements.referenceId, sale.id)).all();
      expect(movements).toHaveLength(1);
      expect(movements[0].quantityChange).toBe(-5);
    } finally {
      sqlite.close();
    }

    expect(getSale(databasePath, sale.id).invoiceNumber).toBe(sale.invoiceNumber);
  });

  it("recalculates profit from the cost of the sizes actually sold", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);

    const sale = createSale(databasePath, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: 2_000 }],
    });

    expect(sale.profitAmountCents).toBe(1_000);

    const edited = updateSale(databasePath, sale.id, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 3, unitPriceCents: 2_500 }],
    });

    expect(edited.profitAmountCents).toBe(4_500);
  });

  it("updates the customer's ledger balance to match the corrected sale", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);
    const customer = createCustomer(databasePath, { name: "Bilal" });

    const sale = createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      amountPaidCents: 0,
      items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 2_000 }],
    });

    expect(getLedgerSummary(databasePath).customerReceivableCents).toBe(4_000);

    updateSale(databasePath, sale.id, {
      customerId: customer.id,
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      amountPaidCents: 1_000,
      items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: 2_000 }],
    });

    expect(getLedgerSummary(databasePath).customerReceivableCents).toBe(1_000);
  });

  it("records who edited the sale and what changed", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);

    const sale = createSale(databasePath, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 2_000 }],
    });

    updateSale(
      databasePath,
      sale.id,
      { customerName: "Ali", saleDate: new Date("2026-08-01T00:00:00.000Z"), items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: 2_000 }] },
      "Hassan",
    );

    const { sqlite, db } = createDb(databasePath);

    try {
      const log = db.select().from(auditLogs).where(eq(auditLogs.action, "sale.edited")).get();
      expect(log?.actorName).toBe("Hassan");

      const details = JSON.parse(log?.details ?? "{}");
      expect(details.before.totalAmountCents).toBe(4_000);
      expect(details.after.totalAmountCents).toBe(2_000);
    } finally {
      sqlite.close();
    }
  });

  it("refuses to edit a sale that already has a return against it", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);

    const sale = createSale(databasePath, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 2_000 }],
    });

    createSaleReturn(databasePath, {
      saleId: sale.id,
      returnDate: new Date("2026-08-03T00:00:00.000Z"),
      items: [{ sourceItemId: sale.items[0].id, quantity: 1 }],
    });

    expect(() =>
      updateSale(databasePath, sale.id, {
        customerName: "Ali",
        saleDate: new Date("2026-08-01T00:00:00.000Z"),
        items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: 2_000 }],
      }),
    ).toThrow(SaleValidationError);
  });

  it("leaves stock untouched when the edit is rejected", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeHoodie(databasePath);

    const sale = createSale(databasePath, {
      customerName: "Ali",
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 2_000 }],
    });

    expect(() =>
      updateSale(databasePath, sale.id, {
        customerName: "Ali",
        saleDate: new Date("2026-08-01T00:00:00.000Z"),
        items: [{ variantId: product.variants[0].id, quantity: 99, unitPriceCents: 2_000 }],
      }),
    ).toThrow(SaleValidationError);

    expect(variantStock(databasePath, product.id, "L")).toBe(8);
    expect(getSale(databasePath, sale.id).items[0].quantity).toBe(2);
  });
});

describe("sale edit password", () => {
  it("leaves editing open until a password is set", () => {
    const databasePath = makeTempDatabasePath();

    expect(getEditPasswordStatus(databasePath).isSet).toBe(false);
    expect(verifyEditPassword(databasePath, "")).toBe(true);
    expect(() => assertEditPassword(databasePath, null)).not.toThrow();
  });

  it("accepts the right password and rejects the wrong one", () => {
    const databasePath = makeTempDatabasePath();

    setEditPassword(databasePath, "shop123");

    expect(getEditPasswordStatus(databasePath).isSet).toBe(true);
    expect(verifyEditPassword(databasePath, "shop123")).toBe(true);
    expect(verifyEditPassword(databasePath, "wrong")).toBe(false);
    expect(() => assertEditPassword(databasePath, "wrong")).toThrow(EditPasswordError);
  });

  it("never stores the password itself", () => {
    const databasePath = makeTempDatabasePath();

    setEditPassword(databasePath, "shop123");

    const contents = fs.readFileSync(databasePath, "latin1");
    expect(contents).not.toContain("shop123");
  });

  it("requires the current password before changing or clearing it", () => {
    const databasePath = makeTempDatabasePath();

    setEditPassword(databasePath, "first-pass");

    expect(() => setEditPassword(databasePath, "second-pass", "nope")).toThrow(EditPasswordError);
    expect(() => clearEditPassword(databasePath, "nope")).toThrow(EditPasswordError);

    setEditPassword(databasePath, "second-pass", "first-pass");
    expect(verifyEditPassword(databasePath, "second-pass")).toBe(true);

    clearEditPassword(databasePath, "second-pass");
    expect(getEditPasswordStatus(databasePath).isSet).toBe(false);
  });

  it("rejects a password that is too short to be worth having", () => {
    const databasePath = makeTempDatabasePath();

    expect(() => setEditPassword(databasePath, "ab")).toThrow(EditPasswordError);
  });
});
