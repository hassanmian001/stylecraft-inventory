import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { deletePayment, getLedgerStatement, getLedgerSummary, LedgerValidationError, recordPayment } from "./ledger-service";
import { runMigrations } from "./migrate";
import { createProduct } from "./products-service";
import { createPurchase, createSupplier } from "./purchases-service";
import { createSaleReturn } from "./returns-service";
import { createCustomer, createSale } from "./sales-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-ledger-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeProduct(databasePath: string) {
  return createProduct(databasePath, {
    name: "Hoodie",
    sku: "HOOD",
    purchasePriceCents: 1_000,
    sellingPriceCents: 2_000,
    currentStock: 20,
    lowStockThreshold: 1,
    isActive: true,
  });
}

describe("ledger service", () => {
  it("leaves nothing owing when a sale is paid in full", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeProduct(databasePath);
    const customer = createCustomer(databasePath, { name: "Ali" });

    const sale = createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 2_000 }],
    });

    expect(sale.totalAmountCents).toBe(4_000);
    expect(sale.amountPaidCents).toBe(4_000);
    expect(sale.balanceDueCents).toBe(0);

    const summary = getLedgerSummary(databasePath);
    expect(summary.customers[0]).toMatchObject({ partyName: "Ali", invoicedCents: 4_000, paidCents: 4_000, balanceCents: 0 });
    expect(summary.customerReceivableCents).toBe(0);
  });

  it("carries the unpaid part of a credit sale as the customer's balance", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeProduct(databasePath);
    const customer = createCustomer(databasePath, { name: "Bilal" });

    const sale = createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      amountPaidCents: 1_000,
      items: [{ variantId: product.variants[0].id, quantity: 2, unitPriceCents: 2_000 }],
    });

    expect(sale.balanceDueCents).toBe(3_000);
    expect(getLedgerSummary(databasePath).customerReceivableCents).toBe(3_000);
  });

  it("clears the balance once a later payment is recorded", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeProduct(databasePath);
    const customer = createCustomer(databasePath, { name: "Bilal" });

    createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      amountPaidCents: 0,
      items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: 2_000 }],
    });

    recordPayment(databasePath, {
      partyType: "customer",
      partyId: customer.id,
      amountCents: 2_000,
      paymentDate: new Date("2026-08-10T00:00:00.000Z"),
      method: "Cash",
    });

    expect(getLedgerSummary(databasePath).customers[0].balanceCents).toBe(0);
  });

  it("builds a running statement of invoices, payments, and returns", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeProduct(databasePath);
    const customer = createCustomer(databasePath, { name: "Chand" });

    const sale = createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      amountPaidCents: 0,
      items: [{ variantId: product.variants[0].id, quantity: 3, unitPriceCents: 2_000 }],
    });

    recordPayment(databasePath, {
      partyType: "customer",
      partyId: customer.id,
      amountCents: 2_000,
      paymentDate: new Date("2026-08-05T00:00:00.000Z"),
    });

    createSaleReturn(databasePath, {
      saleId: sale.id,
      returnDate: new Date("2026-08-07T00:00:00.000Z"),
      items: [{ sourceItemId: sale.items[0].id, quantity: 1 }],
    });

    const statement = getLedgerStatement(databasePath, "customer", customer.id);

    expect(statement.entries.map((entry) => [entry.kind, entry.debitCents, entry.creditCents, entry.balanceCents])).toEqual([
      ["sale", 6_000, 0, 6_000],
      ["payment", 0, 2_000, 4_000],
      ["sale_return", 0, 2_000, 2_000],
    ]);
    expect(statement.balanceCents).toBe(2_000);
  });

  it("tracks what the shop still owes a supplier", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeProduct(databasePath);
    const supplier = createSupplier(databasePath, { name: "Fabric House" });

    const purchase = createPurchase(databasePath, {
      supplierId: supplier.id,
      purchaseDate: new Date("2026-08-01T00:00:00.000Z"),
      amountPaidCents: 1_000,
      items: [{ variantId: product.variants[0].id, quantity: 5, unitCostCents: 1_000 }],
    });

    expect(purchase.balanceDueCents).toBe(4_000);

    const summary = getLedgerSummary(databasePath);
    expect(summary.suppliers[0]).toMatchObject({ partyName: "Fabric House", invoicedCents: 5_000, paidCents: 1_000, balanceCents: 4_000 });
    expect(summary.supplierPayableCents).toBe(4_000);

    recordPayment(databasePath, {
      partyType: "supplier",
      partyId: supplier.id,
      amountCents: 4_000,
      paymentDate: new Date("2026-08-20T00:00:00.000Z"),
    });

    expect(getLedgerSummary(databasePath).supplierPayableCents).toBe(0);
  });

  it("rejects payments with no amount or an unknown party", () => {
    const databasePath = makeTempDatabasePath();
    const customer = createCustomer(databasePath, { name: "Dawood" });

    expect(() => recordPayment(databasePath, { partyType: "customer", partyId: customer.id, amountCents: 0, paymentDate: new Date() })).toThrow(LedgerValidationError);
    expect(() => recordPayment(databasePath, { partyType: "customer", partyId: 9_999, amountCents: 500, paymentDate: new Date() })).toThrow(LedgerValidationError);
  });

  it("refuses to delete a payment that belongs to an invoice", () => {
    const databasePath = makeTempDatabasePath();
    const product = makeProduct(databasePath);
    const customer = createCustomer(databasePath, { name: "Erum" });

    createSale(databasePath, {
      customerId: customer.id,
      saleDate: new Date("2026-08-01T00:00:00.000Z"),
      amountPaidCents: 500,
      items: [{ variantId: product.variants[0].id, quantity: 1, unitPriceCents: 2_000 }],
    });

    const standalone = recordPayment(databasePath, {
      partyType: "customer",
      partyId: customer.id,
      amountCents: 500,
      paymentDate: new Date("2026-08-02T00:00:00.000Z"),
    });

    const statement = getLedgerStatement(databasePath, "customer", customer.id);
    expect(statement.entries.filter((entry) => entry.kind === "payment")).toHaveLength(2);

    deletePayment(databasePath, standalone.id);
    expect(getLedgerStatement(databasePath, "customer", customer.id).entries.filter((entry) => entry.kind === "payment")).toHaveLength(1);
  });
});
