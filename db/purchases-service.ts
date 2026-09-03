import { desc, eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { formatVariantLabel, rollupProductStock } from "./products-service.js";
import { payments, productVariants, products, purchaseItems, purchases, stockMovements, suppliers } from "./schema.js";
import { loadVariantWithProduct } from "./variant-lookup.js";

export type SupplierInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type SupplierDto = SupplierInput & {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseItemInput = {
  variantId: number;
  quantity: number;
  unitCostCents: number;
};

export type PurchaseInput = {
  supplierId?: number | null;
  supplierName?: string | null;
  purchaseDate: Date | string;
  amountPaidCents?: number;
  notes?: string | null;
  items: PurchaseItemInput[];
};

export type PurchaseItemDto = {
  id: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  variantSku: string | null;
  quantity: number;
  unitCostCents: number;
  totalCostCents: number;
};

export type PurchaseDetailDto = {
  id: number;
  supplierId: number | null;
  supplierName: string | null;
  purchaseDate: Date;
  totalAmountCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  notes: string | null;
  items: PurchaseItemDto[];
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseHistoryDto = Omit<PurchaseDetailDto, "items"> & {
  itemCount: number;
};

export class PurchaseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseValidationError";
  }
}

function nullableTrimmed(value: string | null | undefined) {
  return value?.trim() || null;
}

function validatePositiveInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new PurchaseValidationError(`${fieldName} must be a positive whole number.`);
  }
}

function validateNonNegativeInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new PurchaseValidationError(`${fieldName} must be a non-negative whole number.`);
  }
}

function normalizeSupplierInput(input: SupplierInput) {
  const name = input.name.trim();

  if (!name) {
    throw new PurchaseValidationError("Supplier name is required.");
  }

  return {
    name,
    phone: nullableTrimmed(input.phone),
    email: nullableTrimmed(input.email),
    address: nullableTrimmed(input.address),
    notes: nullableTrimmed(input.notes),
  };
}

function normalizePurchaseDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new PurchaseValidationError("Purchase date is required.");
  }

  return date;
}

function normalizePurchaseInput(input: PurchaseInput) {
  const purchaseDate = normalizePurchaseDate(input.purchaseDate);
  const supplierName = nullableTrimmed(input.supplierName);
  const notes = nullableTrimmed(input.notes);

  if (input.supplierId !== null && input.supplierId !== undefined) {
    validatePositiveInteger(input.supplierId, "Supplier");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new PurchaseValidationError("At least one purchase item is required.");
  }

  const variantIds = new Set<number>();
  const items = input.items.map((item) => {
    validatePositiveInteger(item.variantId, "Product size/colour");
    validatePositiveInteger(item.quantity, "Quantity");
    validateNonNegativeInteger(item.unitCostCents, "Unit cost");

    if (variantIds.has(item.variantId)) {
      throw new PurchaseValidationError("Each size/colour can appear only once per purchase.");
    }

    variantIds.add(item.variantId);

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitCostCents: item.unitCostCents,
      totalCostCents: item.quantity * item.unitCostCents,
    };
  });

  const totalAmountCents = items.reduce((sum, item) => sum + item.totalCostCents, 0);
  const amountPaidCents = input.amountPaidCents ?? totalAmountCents;

  validateNonNegativeInteger(amountPaidCents, "Amount paid");

  if (amountPaidCents > totalAmountCents) {
    throw new PurchaseValidationError("Amount paid cannot be more than the purchase total.");
  }

  return {
    supplierId: input.supplierId ?? null,
    supplierName,
    purchaseDate,
    amountPaidCents,
    notes,
    items,
    totalAmountCents,
  };
}

function toSupplierDto(row: typeof suppliers.$inferSelect): SupplierDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getPurchaseDetail(db: ReturnType<typeof createDb>["db"], id: number): PurchaseDetailDto {
  const row = db
    .select({
      id: purchases.id,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      purchaseDate: purchases.purchaseDate,
      totalAmountCents: purchases.totalAmountCents,
      amountPaidCents: purchases.amountPaidCents,
      notes: purchases.notes,
      createdAt: purchases.createdAt,
      updatedAt: purchases.updatedAt,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchases.id, id))
    .get();

  if (row === undefined) {
    throw new PurchaseValidationError("Purchase was not found.");
  }

  const itemRows = db
    .select({
      id: purchaseItems.id,
      productId: purchaseItems.productId,
      variantId: purchaseItems.variantId,
      productName: products.name,
      productSku: products.sku,
      variantSize: productVariants.size,
      variantColor: productVariants.color,
      variantSku: productVariants.sku,
      quantity: purchaseItems.quantity,
      unitCostCents: purchaseItems.unitCostCents,
      totalCostCents: purchaseItems.totalCostCents,
    })
    .from(purchaseItems)
    .innerJoin(products, eq(purchaseItems.productId, products.id))
    .leftJoin(productVariants, eq(purchaseItems.variantId, productVariants.id))
    .where(eq(purchaseItems.purchaseId, id))
    .all();

  const items = itemRows.map(({ variantSize, variantColor, ...item }) => ({
    ...item,
    variantLabel: formatVariantLabel(variantSize || null, variantColor || null),
  }));

  return {
    ...row,
    balanceDueCents: row.totalAmountCents - row.amountPaidCents,
    items,
  };
}

export function listSuppliers(databasePath?: string): SupplierDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db.select().from(suppliers).orderBy(suppliers.name).all().map(toSupplierDto);
  } finally {
    sqlite.close();
  }
}

export function createSupplier(databasePath: string | undefined, input: SupplierInput): SupplierDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeSupplierInput(input);
    const insertedSupplier = db.insert(suppliers).values(normalizedInput).returning({ id: suppliers.id }).get();
    const supplier = db.select().from(suppliers).where(eq(suppliers.id, insertedSupplier.id)).get();

    if (supplier === undefined) {
      throw new PurchaseValidationError("Supplier was not found after creation.");
    }

    return toSupplierDto(supplier);
  } finally {
    sqlite.close();
  }
}

export function createPurchase(databasePath: string | undefined, input: PurchaseInput): PurchaseDetailDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizePurchaseInput(input);

    const purchaseId = db.transaction((tx) => {
      let supplierId = normalizedInput.supplierId;

      if (supplierId !== null) {
        const existingSupplier = tx.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();

        if (existingSupplier === undefined) {
          throw new PurchaseValidationError("Supplier was not found.");
        }
      } else if (normalizedInput.supplierName !== null) {
        const existingSupplier = tx.select().from(suppliers).where(eq(suppliers.name, normalizedInput.supplierName)).get();
        supplierId = existingSupplier?.id ?? tx.insert(suppliers).values({ name: normalizedInput.supplierName }).returning({ id: suppliers.id }).get().id;
      }

      const insertedPurchase = tx
        .insert(purchases)
        .values({
          supplierId,
          purchaseDate: normalizedInput.purchaseDate,
          totalAmountCents: normalizedInput.totalAmountCents,
          amountPaidCents: normalizedInput.amountPaidCents,
          notes: normalizedInput.notes,
        })
        .returning({ id: purchases.id })
        .get();

      for (const item of normalizedInput.items) {
        const { variant, product } = loadVariantWithProduct(tx, item.variantId, (message) => {
          throw new PurchaseValidationError(message);
        });

        if (!product.isActive || !variant.isActive) {
          throw new PurchaseValidationError("Inactive products cannot be purchased.");
        }

        const stockBefore = variant.currentStock;
        const stockAfter = stockBefore + item.quantity;

        tx.insert(purchaseItems)
          .values({
            purchaseId: insertedPurchase.id,
            productId: product.id,
            variantId: variant.id,
            quantity: item.quantity,
            unitCostCents: item.unitCostCents,
            totalCostCents: item.totalCostCents,
          })
          .run();

        tx.update(productVariants)
          .set({ currentStock: stockAfter, updatedAt: new Date() })
          .where(eq(productVariants.id, variant.id))
          .run();
        rollupProductStock(tx, product.id);

        tx.insert(stockMovements)
          .values({
            productId: product.id,
            variantId: variant.id,
            movementType: "purchase",
            referenceType: "purchase",
            referenceId: insertedPurchase.id,
            quantityChange: item.quantity,
            stockBefore,
            stockAfter,
            notes: normalizedInput.notes,
          })
          .run();
      }

      // Money handed over at purchase time is a ledger entry too, so a supplier
      // balance is always invoices minus payments with nothing counted twice.
      if (supplierId !== null && normalizedInput.amountPaidCents > 0) {
        tx.insert(payments)
          .values({
            partyType: "supplier",
            partyId: supplierId,
            direction: "out",
            amountCents: normalizedInput.amountPaidCents,
            paymentDate: normalizedInput.purchaseDate,
            method: null,
            notes: "Paid with purchase",
            purchaseId: insertedPurchase.id,
          })
          .run();
      }

      return insertedPurchase.id;
    });

    return getPurchaseDetail(db, purchaseId);
  } finally {
    sqlite.close();
  }
}

export function listPurchases(databasePath?: string): PurchaseHistoryDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const rows = db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        purchaseDate: purchases.purchaseDate,
        totalAmountCents: purchases.totalAmountCents,
        amountPaidCents: purchases.amountPaidCents,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
        updatedAt: purchases.updatedAt,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.purchaseDate), desc(purchases.id))
      .all();

    return rows.map((row) => ({
      ...row,
      balanceDueCents: row.totalAmountCents - row.amountPaidCents,
      itemCount: db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, row.id)).all().length,
    }));
  } finally {
    sqlite.close();
  }
}
