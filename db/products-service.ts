import { and, eq, inArray, like, ne, or, sql } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { categories, productVariants, products, purchaseItems, purchaseReturnItems, saleItems, saleReturnItems, stockMovements } from "./schema.js";

export type ProductVariantInput = {
  id?: number | null;
  size?: string | null;
  color?: string | null;
  sku: string;
  purchasePriceCents?: number | null;
  sellingPriceCents?: number | null;
  currentStock: number;
  lowStockThreshold?: number | null;
  isActive: boolean;
};

export type ProductInput = {
  name: string;
  sku: string;
  categoryName?: string | null;
  purchasePriceCents: number;
  sellingPriceCents: number;
  currentStock?: number;
  lowStockThreshold: number;
  isActive: boolean;
  variants?: ProductVariantInput[];
};

export type ProductListFilters = {
  search?: string;
  categoryName?: string | null;
  isLowStock?: boolean;
  isActive?: boolean;
};

export type ProductVariantDto = {
  id: number;
  productId: number;
  size: string | null;
  color: string | null;
  label: string;
  sku: string;
  purchasePriceCents: number;
  sellingPriceCents: number;
  purchasePriceOverrideCents: number | null;
  sellingPriceOverrideCents: number | null;
  currentStock: number;
  lowStockThreshold: number;
  lowStockThresholdOverride: number | null;
  isActive: boolean;
  isLowStock: boolean;
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
  hasVariants: boolean;
  variants: ProductVariantDto[];
  createdAt: Date;
  updatedAt: Date;
};

export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

type Db = ReturnType<typeof createDb>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Helpers below run both directly and inside a transaction. */
type DbClient = Db | Tx;

function normalizeSku(sku: string) {
  return sku.trim().toUpperCase();
}

function normalizeVariantAttribute(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function formatVariantLabel(size: string | null, color: string | null) {
  const parts = [size, color].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length === 0 ? "Standard" : parts.join(" / ");
}

function isLowStock(currentStock: number, lowStockThreshold: number) {
  return currentStock <= lowStockThreshold;
}

function validateNonNegativeInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ProductValidationError(`${fieldName} must be a non-negative integer.`);
  }
}

function validateOptionalNonNegativeInteger(value: number | null | undefined, fieldName: string) {
  if (value === null || value === undefined) {
    return null;
  }

  validateNonNegativeInteger(value, fieldName);
  return value;
}

function normalizeVariantInput(input: ProductVariantInput) {
  const sku = normalizeSku(input.sku);

  if (!sku) {
    throw new ProductValidationError("Every size/colour needs its own SKU.");
  }

  validateNonNegativeInteger(input.currentStock, "Current stock");

  if (typeof input.isActive !== "boolean") {
    throw new ProductValidationError("Active status is required for every size/colour.");
  }

  return {
    id: input.id ?? null,
    size: normalizeVariantAttribute(input.size),
    color: normalizeVariantAttribute(input.color),
    sku,
    purchasePriceCents: validateOptionalNonNegativeInteger(input.purchasePriceCents, "Purchase price"),
    sellingPriceCents: validateOptionalNonNegativeInteger(input.sellingPriceCents, "Selling price"),
    currentStock: input.currentStock,
    lowStockThreshold: validateOptionalNonNegativeInteger(input.lowStockThreshold, "Low-stock threshold"),
    isActive: input.isActive,
  };
}

type NormalizedVariant = ReturnType<typeof normalizeVariantInput>;

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
  validateNonNegativeInteger(input.lowStockThreshold, "Low-stock threshold");

  if (typeof input.isActive !== "boolean") {
    throw new ProductValidationError("Active status is required.");
  }

  // A product with no sizes or colours still gets one variant, so stock always
  // lives in the same place no matter how the product is set up.
  const suppliedVariants = input.variants ?? [];
  const variants: NormalizedVariant[] =
    suppliedVariants.length === 0
      ? [
          normalizeVariantInput({
            size: null,
            color: null,
            sku,
            currentStock: input.currentStock ?? 0,
            isActive: input.isActive,
          }),
        ]
      : suppliedVariants.map(normalizeVariantInput);

  const seenCombinations = new Set<string>();
  const seenSkus = new Set<string>();

  for (const variant of variants) {
    const combination = `${variant.size.toLowerCase()}::${variant.color.toLowerCase()}`;

    if (seenCombinations.has(combination)) {
      throw new ProductValidationError("The same size and colour cannot be added twice.");
    }

    if (seenSkus.has(variant.sku)) {
      throw new ProductValidationError("SKU must be unique.");
    }

    seenCombinations.add(combination);
    seenSkus.add(variant.sku);
  }

  return {
    name,
    sku,
    categoryName,
    purchasePriceCents: input.purchasePriceCents,
    sellingPriceCents: input.sellingPriceCents,
    lowStockThreshold: input.lowStockThreshold,
    isActive: input.isActive,
    variants,
  };
}

function toVariantDto(row: typeof productVariants.$inferSelect, product: { purchasePriceCents: number; sellingPriceCents: number; lowStockThreshold: number }): ProductVariantDto {
  const size = row.size || null;
  const color = row.color || null;
  const lowStockThreshold = row.lowStockThreshold ?? product.lowStockThreshold;

  return {
    id: row.id,
    productId: row.productId,
    size,
    color,
    label: formatVariantLabel(size, color),
    sku: row.sku,
    purchasePriceCents: row.purchasePriceCents ?? product.purchasePriceCents,
    sellingPriceCents: row.sellingPriceCents ?? product.sellingPriceCents,
    purchasePriceOverrideCents: row.purchasePriceCents,
    sellingPriceOverrideCents: row.sellingPriceCents,
    currentStock: row.currentStock,
    lowStockThreshold,
    lowStockThresholdOverride: row.lowStockThreshold,
    isActive: row.isActive,
    isLowStock: isLowStock(row.currentStock, lowStockThreshold),
  };
}

function listVariantRows(db: DbClient, productIds: number[]) {
  if (productIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds))
    .orderBy(productVariants.size, productVariants.color, productVariants.id)
    .all();
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

type ProductRow = Omit<ProductDto, "isLowStock" | "hasVariants" | "variants">;

function toProductDto(row: ProductRow, variantRows: (typeof productVariants.$inferSelect)[]): ProductDto {
  const variants = variantRows.map((variantRow) => toVariantDto(variantRow, row));
  const currentStock = variants.reduce((sum, variant) => sum + variant.currentStock, 0);
  const hasVariants = variants.some((variant) => variant.size !== null || variant.color !== null);

  return {
    ...row,
    currentStock,
    hasVariants,
    variants,
    // A style counts as low when any one of its sizes/colours is low, even if the
    // others are well stocked.
    isLowStock: variants.length > 0 ? variants.some((variant) => variant.isLowStock) : isLowStock(currentStock, row.lowStockThreshold),
  };
}

function getCategoryId(db: DbClient, categoryName: string | null) {
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

/** Keeps products.current_stock in step with the variants that actually hold stock. */
export function rollupProductStock(db: DbClient, productId: number) {
  const total = db
    .select({ total: sql<number>`coalesce(sum(${productVariants.currentStock}), 0)` })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .get();

  db.update(products)
    .set({ currentStock: total?.total ?? 0, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .run();
}

function getProductById(db: DbClient, id: number) {
  const row = db
    .select(productSelect())
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .get();

  if (row === undefined) {
    throw new ProductValidationError("Product was not found.");
  }

  return toProductDto(row, listVariantRows(db, [id]));
}

function assertSkuIsUnique(db: DbClient, sku: string, excludingProductId?: number) {
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

function assertVariantSkuIsUnique(db: DbClient, sku: string, excludingVariantId?: number | null) {
  const filters = [eq(productVariants.sku, sku)];

  if (excludingVariantId !== null && excludingVariantId !== undefined) {
    filters.push(ne(productVariants.id, excludingVariantId));
  }

  const duplicate = db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(...filters))
    .get();

  if (duplicate !== undefined) {
    throw new ProductValidationError("SKU must be unique.");
  }
}

/** True when a variant is referenced by any purchase, sale, return, or movement. */
function variantHasHistory(db: DbClient, variantId: number) {
  const tables = [
    { table: purchaseItems, column: purchaseItems.variantId },
    { table: saleItems, column: saleItems.variantId },
    { table: purchaseReturnItems, column: purchaseReturnItems.variantId },
    { table: saleReturnItems, column: saleReturnItems.variantId },
    { table: stockMovements, column: stockMovements.variantId },
  ] as const;

  return tables.some(({ table, column }) => db.select({ id: sql<number>`1` }).from(table).where(eq(column, variantId)).get() !== undefined);
}

function saveVariants(db: DbClient, productId: number, variants: NormalizedVariant[]) {
  const existingVariants = db.select().from(productVariants).where(eq(productVariants.productId, productId)).all();
  const keptIds = new Set<number>();

  for (const variant of variants) {
    assertVariantSkuIsUnique(db, variant.sku, variant.id);

    const values = {
      productId,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      purchasePriceCents: variant.purchasePriceCents,
      sellingPriceCents: variant.sellingPriceCents,
      currentStock: variant.currentStock,
      lowStockThreshold: variant.lowStockThreshold,
      isActive: variant.isActive,
    };

    if (variant.id !== null) {
      const existing = existingVariants.find((row) => row.id === variant.id);

      if (existing === undefined) {
        throw new ProductValidationError("Size/colour was not found on this product.");
      }

      db.update(productVariants)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(productVariants.id, variant.id))
        .run();
      keptIds.add(variant.id);
      continue;
    }

    // No id, but the product may already carry this size/colour — a plain product
    // being saved again always arrives as one unnamed variant with no id. Match on
    // the combination so the existing row is updated instead of duplicated.
    const matching = existingVariants.find((row) => row.size === variant.size && row.color === variant.color && !keptIds.has(row.id));

    if (matching !== undefined) {
      db.update(productVariants)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(productVariants.id, matching.id))
        .run();
      keptIds.add(matching.id);
      continue;
    }

    const inserted = db.insert(productVariants).values(values).returning({ id: productVariants.id }).get();
    keptIds.add(inserted.id);
  }

  // A size/colour the user removed is deleted only when nothing references it;
  // otherwise it is kept but deactivated so its history stays readable.
  for (const existing of existingVariants) {
    if (keptIds.has(existing.id)) {
      continue;
    }

    if (variantHasHistory(db, existing.id)) {
      db.update(productVariants).set({ isActive: false, updatedAt: new Date() }).where(eq(productVariants.id, existing.id)).run();
      continue;
    }

    db.delete(productVariants).where(eq(productVariants.id, existing.id)).run();
  }
}

export function createProduct(databasePath: string | undefined, input: ProductInput): ProductDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeInput(input);

    const productId = db.transaction((tx) => {
      assertSkuIsUnique(tx, normalizedInput.sku);
      const categoryId = getCategoryId(tx, normalizedInput.categoryName);
      const insertedProduct = tx
        .insert(products)
        .values({
          name: normalizedInput.name,
          sku: normalizedInput.sku,
          categoryId,
          purchasePriceCents: normalizedInput.purchasePriceCents,
          sellingPriceCents: normalizedInput.sellingPriceCents,
          currentStock: 0,
          lowStockThreshold: normalizedInput.lowStockThreshold,
          isActive: normalizedInput.isActive,
        })
        .returning({ id: products.id })
        .get();

      saveVariants(tx, insertedProduct.id, normalizedInput.variants);
      rollupProductStock(tx, insertedProduct.id);

      return insertedProduct.id;
    });

    return getProductById(db, productId);
  } finally {
    sqlite.close();
  }
}

export function updateProduct(databasePath: string | undefined, id: number, input: ProductInput): ProductDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeInput(input);

    db.transaction((tx) => {
      const existing = tx.select({ id: products.id }).from(products).where(eq(products.id, id)).get();

      if (existing === undefined) {
        throw new ProductValidationError("Product was not found.");
      }

      assertSkuIsUnique(tx, normalizedInput.sku, id);
      const categoryId = getCategoryId(tx, normalizedInput.categoryName);

      tx.update(products)
        .set({
          name: normalizedInput.name,
          sku: normalizedInput.sku,
          categoryId,
          purchasePriceCents: normalizedInput.purchasePriceCents,
          sellingPriceCents: normalizedInput.sellingPriceCents,
          lowStockThreshold: normalizedInput.lowStockThreshold,
          isActive: normalizedInput.isActive,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .run();

      saveVariants(tx, id, normalizedInput.variants);
      rollupProductStock(tx, id);
    });

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

    const variantRows = listVariantRows(db, rows.map((row) => row.id));
    const dtos = rows.map((row) => toProductDto(row, variantRows.filter((variant) => variant.productId === row.id)));

    // Low stock is a property of the variants, so it is filtered after the rollup
    // rather than in SQL against the cached products.current_stock column.
    if (filters.isLowStock === true) {
      return dtos.filter((product) => product.isLowStock);
    }

    if (filters.isLowStock === false) {
      return dtos.filter((product) => !product.isLowStock);
    }

    return dtos;
  } finally {
    sqlite.close();
  }
}

export function getProduct(databasePath: string | undefined, id: number): ProductDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return getProductById(db, id);
  } finally {
    sqlite.close();
  }
}

export function markProductInactive(databasePath: string | undefined, id: number): ProductDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    db.transaction((tx) => {
      const existing = tx.select({ id: products.id }).from(products).where(eq(products.id, id)).get();

      if (existing === undefined) {
        throw new ProductValidationError("Product was not found.");
      }

      tx.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id)).run();
      tx.update(productVariants).set({ isActive: false, updatedAt: new Date() }).where(eq(productVariants.productId, id)).run();
    });

    return getProductById(db, id);
  } finally {
    sqlite.close();
  }
}
