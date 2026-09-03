import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { getInvoiceBySaleId, InvoiceValidationError } from "./invoices-service";
import { runMigrations } from "./migrate";
import { createProduct, type ProductInput } from "./products-service";
import { createCustomer, createSale, type SaleInput } from "./sales-service";
import { settings } from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-invoices-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeProductInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Oxford Shirt",
    sku: "OX-001",
    categoryName: "Shirts",
    purchasePriceCents: 1_250,
    sellingPriceCents: 2_499,
    currentStock: 5,
    lowStockThreshold: 2,
    isActive: true,
    ...overrides,
  };
}

function makeSaleInput(overrides: Partial<SaleInput> = {}): SaleInput {
  return {
    saleDate: new Date("2026-07-09T00:00:00.000Z"),
    paymentMethod: "Cash",
    notes: "Counter sale",
    items: [],
    ...overrides,
  };
}

function upsertSetting(databasePath: string, key: string, value: string) {
  const { sqlite, db } = createDb(databasePath);

  try {
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
      .run();
  } finally {
    sqlite.close();
  }
}

describe("invoice service", () => {
  it("returns a sale invoice with business settings, customer details, line items, and persisted totals", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput());
    const customer = createCustomer(databasePath, {
      name: "Jane Buyer",
      phone: "555-0102",
      email: "jane@example.com",
      address: "12 Market Street",
    });

    upsertSetting(databasePath, "business.name", "StyleCraft Studio");
    upsertSetting(databasePath, "business.phone", "555-0100");
    upsertSetting(databasePath, "business.email", "hello@stylecraft.test");
    upsertSetting(databasePath, "business.address", "1 Main Street");
    upsertSetting(databasePath, "currency.symbol", "Rs. ");
    upsertSetting(databasePath, "invoice.prefix", "SC");

    const sale = createSale(
      databasePath,
      makeSaleInput({ customerId: customer.id, items: [{ productId: product.id, quantity: 2, unitPriceCents: 2_500, discountAmountCents: 500 }] }),
    );

    const invoice = getInvoiceBySaleId(databasePath, sale.id);

    expect(invoice).toMatchObject({
      saleId: sale.id,
      invoiceNumber: "INV-000001",
      customerName: "Jane Buyer",
      customerPhone: "555-0102",
      customerEmail: "jane@example.com",
      customerAddress: "12 Market Street",
      subtotalCents: 5_000,
      discountAmountCents: 500,
      totalAmountCents: 4_500,
      paymentMethod: "Cash",
      notes: "Counter sale",
      business: {
        businessName: "StyleCraft Studio",
        phone: "555-0100",
        email: "hello@stylecraft.test",
        address: "1 Main Street",
        currencySymbol: "Rs.",
        invoicePrefix: "SC",
      },
      items: [
        {
          productId: product.id,
          productName: "Oxford Shirt",
          productSku: "OX-001",
          quantity: 2,
          unitPriceCents: 2_500,
          discountAmountCents: 500,
          totalAmountCents: 4_500,
        },
      ],
    });
  });

  it("uses safe business defaults when settings are absent", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "DEFAULTS" }));
    const sale = createSale(databasePath, makeSaleInput({ items: [{ productId: product.id, quantity: 1, unitPriceCents: 2_499 }] }));

    expect(getInvoiceBySaleId(databasePath, sale.id).business).toEqual({
      businessName: "StyleCraft",
      phone: "+92 326 0609031",
      email: "stylecraftpk.com@gmail.com",
      address: null,
      currencySymbol: "Rs.",
      invoicePrefix: "INV",
    });
  });

  it("rejects invalid or missing sale IDs", () => {
    const databasePath = makeTempDatabasePath();

    expect(() => getInvoiceBySaleId(databasePath, 0)).toThrow(InvoiceValidationError);
    expect(() => getInvoiceBySaleId(databasePath, 999)).toThrow(InvoiceValidationError);
  });
});
