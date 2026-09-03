import { and, eq, like, ne, or, sql } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { categories, products } from "./schema.js";

export type ProductInput = {
  name: string;
  sku: string;
  categoryName?: string | null;
  purchasePriceCents: number;
  sellingPriceCents: number;
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export type ProductListFilters = {
  search?: string;
  categoryName?: string | null;
  isLowStock?: boolean;
  isActive?: boolean;
};

export type ProductDto = {
  id: number;
  name: string;
  sku: string;
  categoryName: string | null;
  purchasePriceCents: number;
  sellingPriceCents: number;
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

function normalizeSku(sku: string) {
  return sku.trim().toUpperCase();
}

function isLowStock(currentStock: number, lowStockThreshold: number) {
  return currentStock <= lowStockThreshold;
}

function validateNonNegativeInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ProductValidationError(`${fieldName} must be a non-negative integer.`);
  }
}

function normalizeInput(input: ProductInput) {
  const name = input.name.trim();
  const sku = normalizeSku(input.sku);
  const categoryName = input.categoryName?.trim() || null;

  if (!name) {
    throw new ProductValidationError("Product name is required.");
  }

  if (!sku) {
    throw new ProductValidationError("SKU is required.");
  }

  validateNonNegativeInteger(input.purchasePriceCents, "Purchase price");
  validateNonNegativeInteger(input.sellingPriceCents, "Selling price");
  validateNonNegativeInteger(input.currentStock, "Current stock");
  validateNonNegativeInteger(input.lowStockThreshold, "Low-stock threshold");

  if (typeof input.isActive !== "boolean") {
    throw new ProductValidationError("Active status is required.");
  }

  return {
    name,
    sku,
    categoryName,
    purchasePriceCents: input.purchasePriceCents,
    sellingPriceCents: input.sellingPriceCents,
    currentStock: input.currentStock,
    lowStockThreshold: input.lowStockThreshold,
    isActive: input.isActive,
  };
}

function productSelect() {
  return {
    id: products.id,
    name: products.name,
    sku: products.sku,
    categoryName: categories.name,
    purchasePriceCents: products.purchasePriceCents,
    sellingPriceCents: products.sellingPriceCents,
    currentStock: products.currentStock,
    lowStockThreshold: products.lowStockThreshold,
    isActive: products.isActive,
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
  };
}

function toProductDto(row: Omit<ProductDto, "isLowStock">): ProductDto {
  return {
    ...row,
    isLowStock: isLowStock(row.currentStock, row.lowStockThreshold),
  };
}

function getCategoryId(db: ReturnType<typeof createDb>["db"], categoryName: string | null) {
  if (categoryName === null) {
    return null;
  }

  const existingCategory = db.select().from(categories).where(eq(categories.name, categoryName)).get();

  if (existingCategory !== undefined) {
    return existingCategory.id;
  }

  const insertedCategory = db.insert(categories).values({ name: categoryName }).returning({ id: categories.id }).get();
  return insertedCategory.id;
}

function getProductById(db: ReturnType<typeof createDb>["db"], id: number) {
  const row = db
    .select(productSelect())
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .get();

  if (row === undefined) {
    throw new ProductValidationError("Product was not found.");
  }

  return toProductDto(row);
}

function assertSkuIsUnique(db: ReturnType<typeof createDb>["db"], sku: string, excludingProductId?: number) {
  const filters = [eq(products.sku, sku)];

  if (excludingProductId !== undefined) {
    filters.push(ne(products.id, excludingProductId));
  }

  const duplicateProduct = db
    .select({ id: products.id })
    .from(products)
    .where(and(...filters))
    .get();

  if (duplicateProduct !== undefined) {
    throw new ProductValidationError("SKU must be unique.");
  }
}

export function createProduct(databasePath: string | undefined, input: ProductInput): ProductDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeInput(input);
    assertSkuIsUnique(db, normalizedInput.sku);
    const categoryId = getCategoryId(db, normalizedInput.categoryName);
    const insertedProduct = db
      .insert(products)
      .values({
        name: normalizedInput.name,
        sku: normalizedInput.sku,
        categoryId,
        purchasePriceCents: normalizedInput.purchasePriceCents,
        sellingPriceCents: normalizedInput.sellingPriceCents,
        currentStock: normalizedInput.currentStock,
        lowStockThreshold: normalizedInput.lowStockThreshold,
        isActive: normalizedInput.isActive,
      })
      .returning({ id: products.id })
      .get();

    return getProductById(db, insertedProduct.id);
  } finally {
    sqlite.close();
  }
}

export function updateProduct(databasePath: string | undefined, id: number, input: ProductInput): ProductDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    getProductById(db, id);
    const normalizedInput = normalizeInput(input);
    assertSkuIsUnique(db, normalizedInput.sku, id);
    const categoryId = getCategoryId(db, normalizedInput.categoryName);

    db.update(products)
      .set({
        name: normalizedInput.name,
        sku: normalizedInput.sku,
        categoryId,
        purchasePriceCents: normalizedInput.purchasePriceCents,
        sellingPriceCents: normalizedInput.sellingPriceCents,
        currentStock: normalizedInput.currentStock,
        lowStockThreshold: normalizedInput.lowStockThreshold,
        isActive: normalizedInput.isActive,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .run();

    return getProductById(db, id);
  } finally {
    sqlite.close();
  }
}

export function listProducts(databasePath?: string, filters: ProductListFilters = {}): ProductDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const whereClauses = [];
    const search = filters.search?.trim();
    const categoryName = filters.categoryName?.trim();

    if (search) {
      const searchPattern = `%${search}%`;
      whereClauses.push(or(like(products.name, searchPattern), like(products.sku, searchPattern)));
    }

    if (categoryName) {
      whereClauses.push(eq(categories.name, categoryName));
    }

    if (filters.isLowStock === true) {
      whereClauses.push(sql`${products.currentStock} <= ${products.lowStockThreshold}`);
    } else if (filters.isLowStock === false) {
      whereClauses.push(sql`${products.currentStock} > ${products.lowStockThreshold}`);
    }

    if (filters.isActive !== undefined) {
      whereClauses.push(eq(products.isActive, filters.isActive));
    }

    const rows = db
      .select(productSelect())
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(products.id)
      .all();

    return rows.map(toProductDto);
  } finally {
    sqlite.close();
  }
}

export function markProductInactive(databasePath: string | undefined, id: number): ProductDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    getProductById(db, id);
    db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id)).run();
    return getProductById(db, id);
  } finally {
    sqlite.close();
  }
}
