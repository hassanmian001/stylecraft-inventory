import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { getLedgerSummary, recordPayment } from "./ledger-service";
import { getProduct, listProducts, updateProduct } from "./products-service";
import { createPurchase } from "./purchases-service";
import { createSale, getSale, listSales, updateSale } from "./sales-service";
import { adjustStock } from "./stock-adjustments-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

type Journal = { entries: { tag: string }[] };

/**
 * Runs the real migrator against a folder holding only the migrations that
 * shipped before this release, so the database ends up exactly where an
 * installed copy sits — including the bookkeeping that stops them re-running.
 */
function migrateToPreviousRelease(databasePath: string) {
  const source = path.resolve("drizzle");
  const journal: Journal = JSON.parse(fs.readFileSync(path.join(source, "meta/_journal.json"), "utf8"));
  const previous = journal.entries.slice(0, journal.entries.length - 1);

  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-old-migrations-"));
  tempDirs.push(folder);
  fs.mkdirSync(path.join(folder, "meta"), { recursive: true });
  fs.writeFileSync(path.join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: previous }));

  for (const entry of previous) {
    fs.copyFileSync(path.join(source, `${entry.tag}.sql`), path.join(folder, `${entry.tag}.sql`));
  }

  const { sqlite, db } = createDb(databasePath);

  try {
    migrate(db, { migrationsFolder: folder });
  } finally {
    sqlite.close();
  }
}

/**
 * Builds a database at the schema an installed 0.1.5 copy would have, fills it
 * with the kind of records a shop already has, and stops short of the variant
 * migration. The tests then upgrade it and work with the result, which is the
 * path a real install takes.
 */
function makePreUpgradeDatabase() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-upgrade-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");

  migrateToPreviousRelease(databasePath);

  const db = new Database(databasePath);

  db.exec(`
    INSERT INTO products (id, name, sku, purchase_price_cents, selling_price_cents, current_stock, low_stock_threshold, is_active)
    VALUES (1, 'Hoodie', 'HOOD-1', 150000, 250000, 12, 3, 1),
           (2, 'T-Shirt', 'TEE-1', 50000, 90000, 40, 5, 1);
    INSERT INTO customers (id, name, phone) VALUES (1, 'Ali', '0300-1234567');
    INSERT INTO suppliers (id, name) VALUES (1, 'Fabric House');
    INSERT INTO sales (id, invoice_number, customer_id, sale_date, subtotal_cents, discount_amount_cents, total_amount_cents, profit_amount_cents, payment_method)
    VALUES (1, 'INV-000001', 1, 1750000000000, 250000, 0, 250000, 100000, 'Cash');
    INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price_cents, unit_cost_cents, discount_amount_cents, total_amount_cents, profit_amount_cents)
    VALUES (1, 1, 1, 1, 250000, 150000, 0, 250000, 100000);
    INSERT INTO purchases (id, supplier_id, purchase_date, total_amount_cents) VALUES (1, 1, 1749000000000, 600000);
    INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_cost_cents, total_cost_cents) VALUES (1, 1, 1, 4, 150000, 600000);
    INSERT INTO stock_movements (id, product_id, movement_type, reference_type, reference_id, quantity_change, stock_before, stock_after)
    VALUES (1, 1, 'sale', 'sale', 1, -1, 13, 12);
  `);
  db.close();

  return databasePath;
}

describe("upgrading an existing install", () => {
  it("keeps every product and its stock, as one standard size each", () => {
    const databasePath = makePreUpgradeDatabase();
    const products = listProducts(databasePath);

    expect(products.map((product) => [product.name, product.currentStock])).toEqual([
      ["Hoodie", 12],
      ["T-Shirt", 40],
    ]);
    expect(products.every((product) => product.variants.length === 1)).toBe(true);
    expect(products.every((product) => !product.hasVariants)).toBe(true);
    expect(products[0].variants[0]).toMatchObject({ label: "Standard", sku: "HOOD-1", currentStock: 12 });
  });

  it("keeps variant prices following the product until one is overridden", () => {
    const databasePath = makePreUpgradeDatabase();
    const [hoodie] = listProducts(databasePath);

    expect(hoodie.variants[0]).toMatchObject({ purchasePriceCents: 150000, sellingPriceCents: 250000, purchasePriceOverrideCents: null });
  });

  it("keeps past sales and purchases readable, with their sizes attached", () => {
    const databasePath = makePreUpgradeDatabase();
    const sale = getSale(databasePath, 1);

    expect(sale.invoiceNumber).toBe("INV-000001");
    expect(sale.items).toHaveLength(1);
    expect(sale.items[0]).toMatchObject({ variantLabel: "Standard", quantity: 1, totalAmountCents: 250000 });
    expect(sale.items[0].variantId).not.toBeNull();
  });

  it("treats history as settled so no old customer suddenly appears to owe money", () => {
    const databasePath = makePreUpgradeDatabase();
    const summary = getLedgerSummary(databasePath);

    expect(summary.customerReceivableCents).toBe(0);
    expect(summary.supplierPayableCents).toBe(0);
    expect(summary.customers[0]).toMatchObject({ partyName: "Ali", invoicedCents: 250000, paidCents: 250000, balanceCents: 0 });
  });

  it("lets sizes be added to a product that had none, keeping its existing stock", () => {
    const databasePath = makePreUpgradeDatabase();
    const hoodie = getProduct(databasePath, 1);
    const standard = hoodie.variants[0];

    const updated = updateProduct(databasePath, hoodie.id, {
      name: hoodie.name,
      sku: hoodie.sku,
      purchasePriceCents: hoodie.purchasePriceCents,
      sellingPriceCents: hoodie.sellingPriceCents,
      lowStockThreshold: hoodie.lowStockThreshold,
      isActive: true,
      variants: [
        { id: standard.id, size: "L", color: "Black", sku: "HOOD-1-L-BLACK", currentStock: standard.currentStock, isActive: true },
        { size: "XL", color: "Black", sku: "HOOD-1-XL-BLACK", currentStock: 4, isActive: true },
      ],
    });

    expect(updated.hasVariants).toBe(true);
    expect(updated.currentStock).toBe(16);
    expect(updated.variants.map((variant) => variant.label)).toEqual(["L / Black", "XL / Black"]);
    // The renamed row is the original, so the old sale still points at it.
    expect(getSale(databasePath, 1).items[0].variantId).toBe(standard.id);
  });

  it("runs the whole new workflow on the upgraded database", () => {
    const databasePath = makePreUpgradeDatabase();
    const hoodie = getProduct(databasePath, 1);
    const standard = hoodie.variants[0];

    const withSizes = updateProduct(databasePath, hoodie.id, {
      name: hoodie.name,
      sku: hoodie.sku,
      purchasePriceCents: hoodie.purchasePriceCents,
      sellingPriceCents: hoodie.sellingPriceCents,
      lowStockThreshold: hoodie.lowStockThreshold,
      isActive: true,
      variants: [
        { id: standard.id, size: "L", sku: "HOOD-1-L", currentStock: 12, isActive: true },
        { size: "XL", sku: "HOOD-1-XL", currentStock: 0, sellingPriceCents: 300000, isActive: true },
      ],
    });

    const large = withSizes.variants.find((variant) => variant.label === "L");
    const extraLarge = withSizes.variants.find((variant) => variant.label === "XL");

    expect(large).toBeDefined();
    expect(extraLarge).toBeDefined();

    // Restock the new size on credit from the supplier.
    const purchase = createPurchase(databasePath, {
      supplierId: 1,
      purchaseDate: new Date("2026-09-01T00:00:00.000Z"),
      amountPaidCents: 200000,
      items: [{ variantId: extraLarge!.id, quantity: 5, unitCostCents: 160000 }],
    });

    expect(purchase.balanceDueCents).toBe(600000);
    expect(getProduct(databasePath, 1).variants.find((variant) => variant.label === "XL")?.currentStock).toBe(5);

    // Sell the new size, part paid.
    const sale = createSale(databasePath, {
      customerId: 1,
      saleDate: new Date("2026-09-02T00:00:00.000Z"),
      amountPaidCents: 100000,
      items: [{ variantId: extraLarge!.id, quantity: 2, unitPriceCents: 300000 }],
    });

    expect(sale.totalAmountCents).toBe(600000);
    expect(sale.balanceDueCents).toBe(500000);
    expect(sale.items[0].variantLabel).toBe("XL");
    expect(getProduct(databasePath, 1).variants.find((variant) => variant.label === "XL")?.currentStock).toBe(3);

    // Correct the sale down to one piece.
    const corrected = updateSale(
      databasePath,
      sale.id,
      { customerId: 1, saleDate: new Date("2026-09-02T00:00:00.000Z"), amountPaidCents: 100000, items: [{ variantId: extraLarge!.id, quantity: 1, unitPriceCents: 300000 }] },
      "Hassan",
    );

    expect(corrected.totalAmountCents).toBe(300000);
    expect(getProduct(databasePath, 1).variants.find((variant) => variant.label === "XL")?.currentStock).toBe(4);

    // Count the shelf and correct the other size.
    adjustStock(databasePath, { variantId: large!.id, newStock: 10, reason: "Physical count" });
    expect(getProduct(databasePath, 1).variants.find((variant) => variant.label === "L")?.currentStock).toBe(10);
    expect(getProduct(databasePath, 1).currentStock).toBe(14);

    // Settle part of the customer's khata.
    recordPayment(databasePath, { partyType: "customer", partyId: 1, amountCents: 150000, paymentDate: new Date("2026-09-05T00:00:00.000Z"), method: "Cash" });

    const summary = getLedgerSummary(databasePath);

    // 250000 old (settled) + 300000 new sale, against 250000 + 100000 + 150000 paid.
    expect(summary.customers[0]).toMatchObject({ invoicedCents: 550000, paidCents: 500000, balanceCents: 50000 });
    // 600000 old purchase (settled) + 800000 restock, against 600000 + 200000 paid.
    expect(summary.suppliers[0]).toMatchObject({ invoicedCents: 1_400_000, paidCents: 800_000, balanceCents: 600_000 });
    expect(listSales(databasePath)).toHaveLength(2);
  });
});
