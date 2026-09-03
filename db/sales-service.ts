import { desc, eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { customers, products, saleItems, sales, stockMovements } from "./schema.js";

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
  productId: number;
  quantity: number;
  unitPriceCents: number;
  discountAmountCents?: number;
};

export type SaleInput = {
  customerId?: number | null;
  customerName?: string | null;
  saleDate: Date | string;
  paymentMethod?: string | null;
  notes?: string | null;
  items: SaleItemInput[];
};

export type SaleItemDto = {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
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

  const productIds = new Set<number>();
  const items = input.items.map((item) => {
    const discountAmountCents = item.discountAmountCents ?? 0;

    validatePositiveInteger(item.productId, "Product");
    validatePositiveInteger(item.quantity, "Quantity");
    validateNonNegativeInteger(item.unitPriceCents, "Unit price");
    validateNonNegativeInteger(discountAmountCents, "Discount");

    if (productIds.has(item.productId)) {
      throw new SaleValidationError("Each product can appear only once per sale.");
    }

    const lineSubtotalCents = item.quantity * item.unitPriceCents;

    if (discountAmountCents > lineSubtotalCents) {
      throw new SaleValidationError("Discount cannot exceed the line subtotal.");
    }

    productIds.add(item.productId);

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      discountAmountCents,
      subtotalCents: lineSubtotalCents,
      totalAmountCents: lineSubtotalCents - discountAmountCents,
    };
  });

  return {
    customerId: input.customerId ?? null,
    customerName,
    saleDate,
    paymentMethod,
    notes,
    items,
    subtotalCents: items.reduce((sum, item) => sum + item.subtotalCents, 0),
    discountAmountCents: items.reduce((sum, item) => sum + item.discountAmountCents, 0),
    totalAmountCents: items.reduce((sum, item) => sum + item.totalAmountCents, 0),
  };
}

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

function getSaleDetail(db: ReturnType<typeof createDb>["db"], id: number): SaleDetailDto {
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

  const items = db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: saleItems.quantity,
      unitPriceCents: saleItems.unitPriceCents,
      unitCostCents: saleItems.unitCostCents,
      discountAmountCents: saleItems.discountAmountCents,
      totalAmountCents: saleItems.totalAmountCents,
      profitAmountCents: saleItems.profitAmountCents,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, id))
    .all();

  return { ...row, items };
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
      let customerId = normalizedInput.customerId;

      if (customerId !== null) {
        const existingCustomer = tx.select().from(customers).where(eq(customers.id, customerId)).get();

        if (existingCustomer === undefined) {
          throw new SaleValidationError("Customer was not found.");
        }
      } else if (normalizedInput.customerName !== null) {
        const existingCustomer = tx.select().from(customers).where(eq(customers.name, normalizedInput.customerName)).get();
        customerId = existingCustomer?.id ?? tx.insert(customers).values({ name: normalizedInput.customerName }).returning({ id: customers.id }).get().id;
      }

      const productRows = normalizedInput.items.map((item) => {
        const product = tx.select().from(products).where(eq(products.id, item.productId)).get();

        if (product === undefined) {
          throw new SaleValidationError("Product was not found.");
        }

        if (!product.isActive) {
          throw new SaleValidationError("Inactive products cannot be sold.");
        }

        if (product.currentStock < item.quantity) {
          throw new SaleValidationError(`Cannot sell more than available stock for ${product.name}.`);
        }

        const costCents = item.quantity * product.purchasePriceCents;

        return {
          ...item,
          product,
          unitCostCents: product.purchasePriceCents,
          profitAmountCents: item.totalAmountCents - costCents,
        };
      });

      const profitAmountCents = productRows.reduce((sum, item) => sum + item.profitAmountCents, 0);
      const insertedSale = tx
        .insert(sales)
        .values({
          invoiceNumber: `TEMP-${Date.now()}`,
          customerId,
          saleDate: normalizedInput.saleDate,
          subtotalCents: normalizedInput.subtotalCents,
          discountAmountCents: normalizedInput.discountAmountCents,
          totalAmountCents: normalizedInput.totalAmountCents,
          profitAmountCents,
          paymentMethod: normalizedInput.paymentMethod,
          notes: normalizedInput.notes,
        })
        .returning({ id: sales.id })
        .get();

      tx.update(sales)
        .set({ invoiceNumber: formatInvoiceNumber(insertedSale.id), updatedAt: new Date() })
        .where(eq(sales.id, insertedSale.id))
        .run();

      for (const item of productRows) {
        const stockBefore = item.product.currentStock;
        const stockAfter = stockBefore - item.quantity;

        tx.insert(saleItems)
          .values({
            saleId: insertedSale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            unitCostCents: item.unitCostCents,
            discountAmountCents: item.discountAmountCents,
            totalAmountCents: item.totalAmountCents,
            profitAmountCents: item.profitAmountCents,
          })
          .run();

        tx.update(products)
          .set({ currentStock: stockAfter, updatedAt: new Date() })
          .where(eq(products.id, item.productId))
          .run();

        tx.insert(stockMovements)
          .values({
            productId: item.productId,
            movementType: "sale",
            referenceType: "sale",
            referenceId: insertedSale.id,
            quantityChange: -item.quantity,
            stockBefore,
            stockAfter,
            notes: normalizedInput.notes,
          })
          .run();
      }

      return insertedSale.id;
    });

    return getSaleDetail(db, saleId);
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
      itemCount: db.select().from(saleItems).where(eq(saleItems.saleId, row.id)).all().length,
    }));
  } finally {
    sqlite.close();
  }
}
