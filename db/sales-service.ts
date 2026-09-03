import { and, desc, eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { formatVariantLabel, rollupProductStock } from "./products-service.js";
import { auditLogs, customers, payments, productVariants, products, saleItems, saleReturns, sales, stockMovements } from "./schema.js";
import { effectivePurchasePriceCents, loadVariantWithProduct } from "./variant-lookup.js";

export type CustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type CustomerDto = CustomerInput & {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SaleItemInput = {
  variantId: number;
  quantity: number;
  unitPriceCents: number;
  discountAmountCents?: number;
};

export type SaleInput = {
  customerId?: number | null;
  customerName?: string | null;
  saleDate: Date | string;
  amountPaidCents?: number;
  paymentMethod?: string | null;
  notes?: string | null;
  items: SaleItemInput[];
};

export type SaleItemDto = {
  id: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  variantSku: string | null;
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
};

export type SaleDetailDto = {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  saleDate: Date;
  subtotalCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  paymentMethod: string | null;
  notes: string | null;
  items: SaleItemDto[];
  createdAt: Date;
  updatedAt: Date;
};

export type SaleHistoryDto = Omit<SaleDetailDto, "items"> & {
  itemCount: number;
};

export class SaleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaleValidationError";
  }
}

type Db = ReturnType<typeof createDb>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbClient = Db | Tx;

function nullableTrimmed(value: string | null | undefined) {
  return value?.trim() || null;
}

function validatePositiveInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SaleValidationError(`${fieldName} must be a positive whole number.`);
  }
}

function validateNonNegativeInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new SaleValidationError(`${fieldName} must be a non-negative whole number.`);
  }
}

function normalizeSaleDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new SaleValidationError("Sale date is required.");
  }

  return date;
}

function normalizeCustomerInput(input: CustomerInput) {
  const name = input.name.trim();

  if (!name) {
    throw new SaleValidationError("Customer name is required.");
  }

  return {
    name,
    phone: nullableTrimmed(input.phone),
    email: nullableTrimmed(input.email),
    address: nullableTrimmed(input.address),
    notes: nullableTrimmed(input.notes),
  };
}

function normalizeSaleInput(input: SaleInput) {
  const saleDate = normalizeSaleDate(input.saleDate);
  const customerName = nullableTrimmed(input.customerName);
  const paymentMethod = nullableTrimmed(input.paymentMethod);
  const notes = nullableTrimmed(input.notes);

  if (input.customerId !== null && input.customerId !== undefined) {
    validatePositiveInteger(input.customerId, "Customer");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new SaleValidationError("At least one sale item is required.");
  }

  const variantIds = new Set<number>();
  const items = input.items.map((item) => {
    const discountAmountCents = item.discountAmountCents ?? 0;

    validatePositiveInteger(item.variantId, "Product size/colour");
    validatePositiveInteger(item.quantity, "Quantity");
    validateNonNegativeInteger(item.unitPriceCents, "Unit price");
    validateNonNegativeInteger(discountAmountCents, "Discount");

    if (variantIds.has(item.variantId)) {
      throw new SaleValidationError("Each size/colour can appear only once per sale.");
    }

    const lineSubtotalCents = item.quantity * item.unitPriceCents;

    if (discountAmountCents > lineSubtotalCents) {
      throw new SaleValidationError("Discount cannot exceed the line subtotal.");
    }

    variantIds.add(item.variantId);

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      discountAmountCents,
      subtotalCents: lineSubtotalCents,
      totalAmountCents: lineSubtotalCents - discountAmountCents,
    };
  });

  const totalAmountCents = items.reduce((sum, item) => sum + item.totalAmountCents, 0);
  const amountPaidCents = input.amountPaidCents ?? totalAmountCents;

  validateNonNegativeInteger(amountPaidCents, "Amount paid");

  if (amountPaidCents > totalAmountCents) {
    throw new SaleValidationError("Amount paid cannot be more than the sale total.");
  }

  return {
    customerId: input.customerId ?? null,
    customerName,
    saleDate,
    amountPaidCents,
    paymentMethod,
    notes,
    items,
    subtotalCents: items.reduce((sum, item) => sum + item.subtotalCents, 0),
    discountAmountCents: items.reduce((sum, item) => sum + item.discountAmountCents, 0),
    totalAmountCents,
  };
}

type NormalizedSale = ReturnType<typeof normalizeSaleInput>;

function toCustomerDto(row: typeof customers.$inferSelect): CustomerDto {
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

function formatInvoiceNumber(id: number) {
  return `INV-${String(id).padStart(6, "0")}`;
}

function getSaleDetail(db: DbClient, id: number): SaleDetailDto {
  const row = db
    .select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      customerId: sales.customerId,
      customerName: customers.name,
      saleDate: sales.saleDate,
      subtotalCents: sales.subtotalCents,
      discountAmountCents: sales.discountAmountCents,
      totalAmountCents: sales.totalAmountCents,
      profitAmountCents: sales.profitAmountCents,
      amountPaidCents: sales.amountPaidCents,
      paymentMethod: sales.paymentMethod,
      notes: sales.notes,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.id, id))
    .get();

  if (row === undefined) {
    throw new SaleValidationError("Sale was not found.");
  }

  const itemRows = db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      variantId: saleItems.variantId,
      productName: products.name,
      productSku: products.sku,
      variantSize: productVariants.size,
      variantColor: productVariants.color,
      variantSku: productVariants.sku,
      quantity: saleItems.quantity,
      unitPriceCents: saleItems.unitPriceCents,
      unitCostCents: saleItems.unitCostCents,
      discountAmountCents: saleItems.discountAmountCents,
      totalAmountCents: saleItems.totalAmountCents,
      profitAmountCents: saleItems.profitAmountCents,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(productVariants, eq(saleItems.variantId, productVariants.id))
    .where(eq(saleItems.saleId, id))
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

/** Resolves the customer a sale belongs to, creating one when only a name was typed. */
function resolveCustomerId(tx: DbClient, normalizedInput: NormalizedSale) {
  if (normalizedInput.customerId !== null) {
    const existingCustomer = tx.select().from(customers).where(eq(customers.id, normalizedInput.customerId)).get();

    if (existingCustomer === undefined) {
      throw new SaleValidationError("Customer was not found.");
    }

    return normalizedInput.customerId;
  }

  if (normalizedInput.customerName !== null) {
    const existingCustomer = tx.select().from(customers).where(eq(customers.name, normalizedInput.customerName)).get();
    return existingCustomer?.id ?? tx.insert(customers).values({ name: normalizedInput.customerName }).returning({ id: customers.id }).get().id;
  }

  return null;
}

/**
 * Writes the sale lines, takes the stock off each size/colour, and records the
 * movements. Shared by create and edit so both paths price and deduct identically.
 */
function writeSaleItems(tx: DbClient, saleId: number, normalizedInput: NormalizedSale) {
  let profitAmountCents = 0;

  for (const item of normalizedInput.items) {
    const variantWithProduct = loadVariantWithProduct(tx, item.variantId, (message) => {
      throw new SaleValidationError(message);
    });
    const { variant, product } = variantWithProduct;

    if (!product.isActive || !variant.isActive) {
      throw new SaleValidationError("Inactive products cannot be sold.");
    }

    if (variant.currentStock < item.quantity) {
      throw new SaleValidationError(`Cannot sell more than available stock for ${product.name} (${formatVariantLabel(variant.size || null, variant.color || null)}).`);
    }

    const unitCostCents = effectivePurchasePriceCents(variantWithProduct);
    const lineProfitCents = item.totalAmountCents - item.quantity * unitCostCents;
    const stockBefore = variant.currentStock;
    const stockAfter = stockBefore - item.quantity;

    profitAmountCents += lineProfitCents;

    tx.insert(saleItems)
      .values({
        saleId,
        productId: product.id,
        variantId: variant.id,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        unitCostCents,
        discountAmountCents: item.discountAmountCents,
        totalAmountCents: item.totalAmountCents,
        profitAmountCents: lineProfitCents,
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
        movementType: "sale",
        referenceType: "sale",
        referenceId: saleId,
        quantityChange: -item.quantity,
        stockBefore,
        stockAfter,
        notes: normalizedInput.notes,
      })
      .run();
  }

  return profitAmountCents;
}

/** Puts back the stock a sale took and clears its lines, movements, and payment. */
function unwindSale(tx: DbClient, saleId: number) {
  const existingItems = tx.select().from(saleItems).where(eq(saleItems.saleId, saleId)).all();

  for (const item of existingItems) {
    if (item.variantId === null) {
      continue;
    }

    const variant = tx.select().from(productVariants).where(eq(productVariants.id, item.variantId)).get();

    if (variant === undefined) {
      continue;
    }

    tx.update(productVariants)
      .set({ currentStock: variant.currentStock + item.quantity, updatedAt: new Date() })
      .where(eq(productVariants.id, variant.id))
      .run();
    rollupProductStock(tx, variant.productId);
  }

  tx.delete(saleItems).where(eq(saleItems.saleId, saleId)).run();
  // referenceId alone is not unique across movement sources, so the reference
  // type has to be matched too or a purchase with the same id loses its history.
  tx.delete(stockMovements).where(and(eq(stockMovements.referenceType, "sale"), eq(stockMovements.referenceId, saleId))).run();
  tx.delete(payments).where(eq(payments.saleId, saleId)).run();
}

function recordSalePayment(tx: DbClient, saleId: number, customerId: number | null, normalizedInput: NormalizedSale) {
  if (customerId === null || normalizedInput.amountPaidCents <= 0) {
    return;
  }

  tx.insert(payments)
    .values({
      partyType: "customer",
      partyId: customerId,
      direction: "in",
      amountCents: normalizedInput.amountPaidCents,
      paymentDate: normalizedInput.saleDate,
      method: normalizedInput.paymentMethod,
      notes: "Paid with sale",
      saleId,
    })
    .run();
}

export function listCustomers(databasePath?: string): CustomerDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db.select().from(customers).orderBy(customers.name).all().map(toCustomerDto);
  } finally {
    sqlite.close();
  }
}

export function createCustomer(databasePath: string | undefined, input: CustomerInput): CustomerDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeCustomerInput(input);
    const insertedCustomer = db.insert(customers).values(normalizedInput).returning({ id: customers.id }).get();
    const customer = db.select().from(customers).where(eq(customers.id, insertedCustomer.id)).get();

    if (customer === undefined) {
      throw new SaleValidationError("Customer was not found after creation.");
    }

    return toCustomerDto(customer);
  } finally {
    sqlite.close();
  }
}

export function createSale(databasePath: string | undefined, input: SaleInput): SaleDetailDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeSaleInput(input);

    const saleId = db.transaction((tx) => {
      const customerId = resolveCustomerId(tx, normalizedInput);
      const insertedSale = tx
        .insert(sales)
        .values({
          invoiceNumber: `TEMP-${Date.now()}`,
          customerId,
          saleDate: normalizedInput.saleDate,
          subtotalCents: normalizedInput.subtotalCents,
          discountAmountCents: normalizedInput.discountAmountCents,
          totalAmountCents: normalizedInput.totalAmountCents,
          profitAmountCents: 0,
          amountPaidCents: normalizedInput.amountPaidCents,
          paymentMethod: normalizedInput.paymentMethod,
          notes: normalizedInput.notes,
        })
        .returning({ id: sales.id })
        .get();

      const profitAmountCents = writeSaleItems(tx, insertedSale.id, normalizedInput);

      tx.update(sales)
        .set({ invoiceNumber: formatInvoiceNumber(insertedSale.id), profitAmountCents, updatedAt: new Date() })
        .where(eq(sales.id, insertedSale.id))
        .run();

      recordSalePayment(tx, insertedSale.id, customerId, normalizedInput);

      return insertedSale.id;
    });

    return getSaleDetail(db, saleId);
  } finally {
    sqlite.close();
  }
}

/**
 * Replaces a sale with corrected details. The original stock deduction is put
 * back before the new lines are applied, so stock ends up as if the sale had
 * been entered this way in the first place. Sales that already have a return
 * against them are refused, because the return points at the old lines.
 */
export function updateSale(databasePath: string | undefined, id: number, input: SaleInput, actorName?: string | null): SaleDetailDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeSaleInput(input);

    db.transaction((tx) => {
      const existingSale = tx.select().from(sales).where(eq(sales.id, id)).get();

      if (existingSale === undefined) {
        throw new SaleValidationError("Sale was not found.");
      }

      const existingReturn = tx.select({ id: saleReturns.id }).from(saleReturns).where(eq(saleReturns.saleId, id)).get();

      if (existingReturn !== undefined) {
        throw new SaleValidationError("This sale already has a return recorded against it and can no longer be edited.");
      }

      const before = getSaleDetail(tx, id);

      unwindSale(tx, id);

      const customerId = resolveCustomerId(tx, normalizedInput);

      tx.update(sales)
        .set({
          customerId,
          saleDate: normalizedInput.saleDate,
          subtotalCents: normalizedInput.subtotalCents,
          discountAmountCents: normalizedInput.discountAmountCents,
          totalAmountCents: normalizedInput.totalAmountCents,
          amountPaidCents: normalizedInput.amountPaidCents,
          paymentMethod: normalizedInput.paymentMethod,
          notes: normalizedInput.notes,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, id))
        .run();

      const profitAmountCents = writeSaleItems(tx, id, normalizedInput);

      tx.update(sales).set({ profitAmountCents, updatedAt: new Date() }).where(eq(sales.id, id)).run();

      recordSalePayment(tx, id, customerId, normalizedInput);

      tx.insert(auditLogs)
        .values({
          action: "sale.edited",
          entityType: "sale",
          entityId: id,
          actorName: nullableTrimmed(actorName),
          details: JSON.stringify({
            invoiceNumber: existingSale.invoiceNumber,
            before: {
              totalAmountCents: before.totalAmountCents,
              amountPaidCents: before.amountPaidCents,
              items: before.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
            },
            after: {
              totalAmountCents: normalizedInput.totalAmountCents,
              amountPaidCents: normalizedInput.amountPaidCents,
              items: normalizedInput.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
            },
          }),
        })
        .run();
    });

    return getSaleDetail(db, id);
  } finally {
    sqlite.close();
  }
}

export function getSale(databasePath: string | undefined, id: number): SaleDetailDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return getSaleDetail(db, id);
  } finally {
    sqlite.close();
  }
}

export function listSales(databasePath?: string): SaleHistoryDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const rows = db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        customerId: sales.customerId,
        customerName: customers.name,
        saleDate: sales.saleDate,
        subtotalCents: sales.subtotalCents,
        discountAmountCents: sales.discountAmountCents,
        totalAmountCents: sales.totalAmountCents,
        profitAmountCents: sales.profitAmountCents,
        amountPaidCents: sales.amountPaidCents,
        paymentMethod: sales.paymentMethod,
        notes: sales.notes,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.saleDate), desc(sales.id))
      .all();

    return rows.map((row) => ({
      ...row,
      balanceDueCents: row.totalAmountCents - row.amountPaidCents,
      itemCount: db.select().from(saleItems).where(eq(saleItems.saleId, row.id)).all().length,
    }));
  } finally {
    sqlite.close();
  }
}
