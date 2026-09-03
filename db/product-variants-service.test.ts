import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "./migrate";
import { createProduct, getProduct, listProducts, markProductInactive, ProductValidationError, updateProduct, type ProductInput } from "./products-service";
import { createSale } from "./sales-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-variants-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeHoodieInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Hoodie",
    sku: "HOOD",
    categoryName: "Apparel",
    purchasePriceCents: 1_500,
    sellingPriceCents: 2_500,
    lowStockThreshold: 2,
    isActive: true,
    variants: [
      { size: "L", color: "Black", sku: "HOOD-L-BLK", currentStock: 6, isActive: true },
      { size: "XL", color: "Black", sku: "HOOD-XL-BLK", currentStock: 1, isActive: true },
      { size: "L", color: "Red", sku: "HOOD-L-RED", currentStock: 4, isActive: true },
    ],
    ...overrides,
  };
}

describe("product variants", () => {
  it("keeps stock per size and colour and rolls it up to the product", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeHoodieInput());

    expect(product.hasVariants).toBe(true);
    expect(product.currentStock).toBe(11);
    expect(product.variants.map((variant) => [variant.label, variant.currentStock])).toEqual([
      ["L / Black", 6],
      ["L / Red", 4],
      ["XL / Black", 1],
    ]);
  });

  it("gives a product with no sizes or colours one standard variant", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, {
      name: "Cap",
      sku: "CAP",
      purchasePriceCents: 500,
      sellingPriceCents: 900,
      currentStock: 7,
      lowStockThreshold: 1,
      isActive: true,
    });

    expect(product.hasVariants).toBe(false);
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0]).toMatchObject({ label: "Standard", sku: "CAP", currentStock: 7 });
    expect(product.currentStock).toBe(7);
  });

  it("falls back to the product price and threshold unless a variant overrides them", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(
      databasePath,
      makeHoodieInput({
        variants: [
          { size: "L", sku: "HOOD-L", currentStock: 3, isActive: true },
          { size: "XXL", sku: "HOOD-XXL", currentStock: 3, sellingPriceCents: 3_200, lowStockThreshold: 5, isActive: true },
        ],
      }),
    );

    const [large, extraLarge] = product.variants;

    expect(large).toMatchObject({ label: "L", purchasePriceCents: 1_500, sellingPriceCents: 2_500, lowStockThreshold: 2, sellingPriceOverrideCents: null });
    expect(extraLarge).toMatchObject({ label: "XXL", purchasePriceCents: 1_500, sellingPriceCents: 3_200, lowStockThreshold: 5 });
    expect(large.isLowStock).toBe(false);
    expect(extraLarge.isLowStock).toBe(true);
  });

  it("marks the product low when any single size is low", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeHoodieInput());

    expect(product.currentStock).toBe(11);
    expect(product.isLowStock).toBe(true);
    expect(listProducts(databasePath, { isLowStock: true }).map((row) => row.id)).toEqual([product.id]);
    expect(listProducts(databasePath, { isLowStock: false })).toEqual([]);
  });

  it("rejects a repeated size and colour combination and a repeated SKU", () => {
    const databasePath = makeTempDatabasePath();

    expect(() =>
      createProduct(
        databasePath,
        makeHoodieInput({
          variants: [
            { size: "L", color: "Black", sku: "A", currentStock: 1, isActive: true },
            { size: "L", color: "Black", sku: "B", currentStock: 1, isActive: true },
          ],
        }),
      ),
    ).toThrow(ProductValidationError);

    expect(() =>
      createProduct(
        databasePath,
        makeHoodieInput({
          variants: [
            { size: "L", sku: "SAME", currentStock: 1, isActive: true },
            { size: "M", sku: "SAME", currentStock: 1, isActive: true },
          ],
        }),
      ),
    ).toThrow(ProductValidationError);
  });

  it("adds, edits, and drops sizes on update", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeHoodieInput());
    const large = product.variants.find((variant) => variant.label === "L / Black");

    const updated = updateProduct(databasePath, product.id, {
      ...makeHoodieInput(),
      variants: [
        { id: large?.id, size: "L", color: "Black", sku: "HOOD-L-BLK", currentStock: 9, isActive: true },
        { size: "S", color: "Black", sku: "HOOD-S-BLK", currentStock: 2, isActive: true },
      ],
    });

    expect(updated.variants.map((variant) => variant.label)).toEqual(["L / Black", "S / Black"]);
    expect(updated.variants.find((variant) => variant.label === "L / Black")?.currentStock).toBe(9);
    expect(updated.currentStock).toBe(11);
  });

  it("deactivates rather than deletes a size that has already been sold", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeHoodieInput());
    const sold = product.variants[0];

    createSale(databasePath, {
      customerName: "Walk-in",
      saleDate: new Date("2026-07-09T00:00:00.000Z"),
      items: [{ variantId: sold.id, quantity: 1, unitPriceCents: 2_500 }],
    });

    const updated = updateProduct(databasePath, product.id, {
      ...makeHoodieInput(),
      variants: [{ size: "XL", color: "Black", sku: "HOOD-XL-BLK", currentStock: 1, isActive: true }],
    });

    const keptSize = updated.variants.find((variant) => variant.id === sold.id);

    expect(keptSize).toBeDefined();
    expect(keptSize?.isActive).toBe(false);
    expect(updated.variants.filter((variant) => variant.isActive).map((variant) => variant.label)).toEqual(["XL / Black"]);
  });

  it("saving a plain product again updates its standard variant instead of adding one", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, {
      name: "Cap",
      sku: "CAP",
      purchasePriceCents: 500,
      sellingPriceCents: 900,
      currentStock: 7,
      lowStockThreshold: 1,
      isActive: true,
    });

    const updated = updateProduct(databasePath, product.id, {
      name: "Cap",
      sku: "CAP",
      purchasePriceCents: 600,
      sellingPriceCents: 1_000,
      currentStock: 4,
      lowStockThreshold: 1,
      isActive: true,
    });

    expect(updated.variants).toHaveLength(1);
    expect(updated.currentStock).toBe(4);
  });

  it("deactivates every size when the product is marked inactive", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeHoodieInput());

    markProductInactive(databasePath, product.id);

    expect(getProduct(databasePath, product.id).variants.every((variant) => !variant.isActive)).toBe(true);
  });
});
