import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "./migrate";
import {
  createProduct,
  listProducts,
  markProductInactive,
  ProductValidationError,
  updateProduct,
  type ProductInput,
} from "./products-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-products-"));
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

describe("product service validation", () => {
  it("rejects missing name, missing SKU, and negative money", () => {
    const databasePath = makeTempDatabasePath();

    expect(() =>
      createProduct(
        databasePath,
        makeProductInput({ name: "", sku: "A1", purchasePriceCents: 0, sellingPriceCents: 0, currentStock: 0, lowStockThreshold: 0 }),
      ),
    ).toThrow(ProductValidationError);
    expect(() =>
      createProduct(
        databasePath,
        makeProductInput({ name: "Shirt", sku: "", purchasePriceCents: 0, sellingPriceCents: 0, currentStock: 0, lowStockThreshold: 0 }),
      ),
    ).toThrow(ProductValidationError);
    expect(() =>
      createProduct(
        databasePath,
        makeProductInput({ name: "Shirt", sku: "a1", purchasePriceCents: -1, sellingPriceCents: 0, currentStock: 0, lowStockThreshold: 0 }),
      ),
    ).toThrow(ProductValidationError);
  });

  it("rejects negative or non-integer numeric fields", () => {
    const databasePath = makeTempDatabasePath();

    for (const invalidInput of [
      makeProductInput({ sellingPriceCents: -1 }),
      makeProductInput({ currentStock: -1 }),
      makeProductInput({ lowStockThreshold: -1 }),
      makeProductInput({ purchasePriceCents: 1.5 }),
      makeProductInput({ sellingPriceCents: 1.5 }),
      makeProductInput({ currentStock: 1.5 }),
      makeProductInput({ lowStockThreshold: 1.5 }),
    ]) {
      expect(() => createProduct(databasePath, invalidInput)).toThrow(ProductValidationError);
    }
  });
});

describe("product service", () => {
  it("creates products with normalized SKU, integer cents, category reuse, and low-stock status", () => {
    const databasePath = makeTempDatabasePath();

    const product = createProduct(
      databasePath,
      makeProductInput({ name: "  Oxford Shirt  ", sku: " sku-1 ", categoryName: "  Menswear  " }),
    );
    const sameCategoryProduct = createProduct(databasePath, makeProductInput({ name: "Jeans", sku: "SKU-2", categoryName: "Menswear" }));
    const uncategorizedProduct = createProduct(databasePath, makeProductInput({ name: "Gift Card", sku: "gift", categoryName: "   " }));

    expect(product).toMatchObject({
      name: "Oxford Shirt",
      sku: "SKU-1",
      categoryName: "Menswear",
      purchasePriceCents: 1_000,
      sellingPriceCents: 1_500,
      currentStock: 5,
      lowStockThreshold: 2,
      isActive: true,
      isLowStock: false,
    });
    expect(sameCategoryProduct.categoryName).toBe("Menswear");
    expect(uncategorizedProduct.categoryName).toBeNull();
    expect(typeof product.id).toBe("number");
    expect(product.createdAt).toBeInstanceOf(Date);
    expect(product.updatedAt).toBeInstanceOf(Date);
  });

  it("edits products and updates low-stock status", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "edit-1" }));

    const updated = updateProduct(
      databasePath,
      product.id,
      makeProductInput({
        name: "Updated Shirt",
        sku: " edit-2 ",
        categoryName: "Clearance",
        purchasePriceCents: 1_200,
        sellingPriceCents: 1_800,
        currentStock: 2,
        lowStockThreshold: 2,
        isActive: false,
      }),
    );

    expect(updated).toMatchObject({
      id: product.id,
      name: "Updated Shirt",
      sku: "EDIT-2",
      categoryName: "Clearance",
      purchasePriceCents: 1_200,
      sellingPriceCents: 1_800,
      currentStock: 2,
      lowStockThreshold: 2,
      isActive: false,
      isLowStock: true,
    });
  });

  it("rejects duplicate SKU values after trim and uppercase normalization", () => {
    const databasePath = makeTempDatabasePath();
    createProduct(databasePath, makeProductInput({ sku: " a1 " }));
    const secondProduct = createProduct(databasePath, makeProductInput({ name: "Pants", sku: "B1" }));

    expect(() => createProduct(databasePath, makeProductInput({ sku: "A1" }))).toThrow(ProductValidationError);
    expect(() => updateProduct(databasePath, secondProduct.id, makeProductInput({ sku: " a1 " }))).toThrow(ProductValidationError);
  });

  it("searches by name and SKU", () => {
    const databasePath = makeTempDatabasePath();
    const redShirt = createProduct(databasePath, makeProductInput({ name: "Red Shirt", sku: "SHIRT-1" }));
    const bluePants = createProduct(databasePath, makeProductInput({ name: "Blue Pants", sku: "PANT-1" }));

    expect(listProducts(databasePath, { search: "red" }).map((product) => product.id)).toEqual([redShirt.id]);
    expect(listProducts(databasePath, { search: "pant-1" }).map((product) => product.id)).toEqual([bluePants.id]);
  });

  it("filters by category, low-stock status, and active status", () => {
    const databasePath = makeTempDatabasePath();
    const activeLowStock = createProduct(
      databasePath,
      makeProductInput({ name: "Scarf", sku: "SCARF", categoryName: "Accessories", currentStock: 1, lowStockThreshold: 2 }),
    );
    const inactiveLowStock = createProduct(
      databasePath,
      makeProductInput({ name: "Belt", sku: "BELT", categoryName: "Accessories", currentStock: 0, lowStockThreshold: 0, isActive: false }),
    );
    const activeInStock = createProduct(
      databasePath,
      makeProductInput({ name: "Jacket", sku: "JACKET", categoryName: "Outerwear", currentStock: 8, lowStockThreshold: 2 }),
    );

    expect(listProducts(databasePath, { categoryName: "Accessories" }).map((product) => product.id)).toEqual([
      activeLowStock.id,
      inactiveLowStock.id,
    ]);
    expect(listProducts(databasePath, { isLowStock: true }).map((product) => product.id)).toEqual([activeLowStock.id, inactiveLowStock.id]);
    expect(listProducts(databasePath, { isLowStock: false }).map((product) => product.id)).toEqual([activeInStock.id]);
    expect(listProducts(databasePath, { isActive: true }).map((product) => product.id)).toEqual([activeLowStock.id, activeInStock.id]);
    expect(listProducts(databasePath, { isActive: false }).map((product) => product.id)).toEqual([inactiveLowStock.id]);
  });

  it("marks products inactive without deleting them", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ sku: "ACTIVE-1" }));

    const inactiveProduct = markProductInactive(databasePath, product.id);

    expect(inactiveProduct).toMatchObject({ id: product.id, isActive: false });
    expect(listProducts(databasePath, { isActive: false }).map((listedProduct) => listedProduct.id)).toEqual([product.id]);
  });

  it("persists products after reopening the same SQLite file", () => {
    const databasePath = makeTempDatabasePath();
    const product = createProduct(databasePath, makeProductInput({ name: "Persistent Shirt", sku: "persist-1" }));

    const reopenedProducts = listProducts(databasePath);

    expect(reopenedProducts).toHaveLength(1);
    expect(reopenedProducts[0]).toMatchObject({ id: product.id, name: "Persistent Shirt", sku: "PERSIST-1" });
  });
});
