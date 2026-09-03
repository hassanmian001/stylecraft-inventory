import { desc, eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { formatVariantLabel, rollupProductStock } from "./products-service.js";
import {
  auditLogs,
  customers,
  productVariants,
  products,
  purchaseItems,
  purchaseReturnItems,
  purchaseReturns,
  purchases,
  saleItems,
  saleReturnItems,
  saleReturns,
  sales,
  stockMovements,
  suppliers,
} from "./schema.js";
import { loadVariantWithProduct } from "./variant-lookup.js";

export type ReturnItemInput = {
  sourceItemId: number;
  quantity: number;
};

export type SaleReturnInput = {
  saleId: number;
  returnDate: Date | string;
  notes?: string | null;
  actorName?: string | null;
  items: ReturnItemInput[];
};

export type PurchaseReturnInput = {
  purchaseId: number;
  returnDate: Date | string;
  notes?: string | null;
  actorName?: string | null;
  items: ReturnItemInput[];
};

export type SaleReturnableItemDto = {
  saleItemId: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  soldQuantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  unitPriceCents: number;
  unitCostCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
};

export type SaleReturnCandidateDto = {
  saleId: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  items: SaleReturnableItemDto[];
};

export type PurchaseReturnableItemDto = {
  purchaseItemId: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  purchasedQuantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  currentStock: number;
  unitCostCents: number;
  totalCostCents: number;
};

export type PurchaseReturnCandidateDto = {
  purchaseId: number;
  purchaseDate: Date;
  supplierName: string | null;
  items: PurchaseReturnableItemDto[];
};

export type SaleReturnDetailDto = {
  id: number;
  saleId: number;
  invoiceNumber: string;
  returnDate: Date;
  totalAmountCents: number;
  notes: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseReturnDetailDto = {
  id: number;
  purchaseId: number;
  returnDate: Date;
  supplierName: string | null;
  totalAmountCents: number;
  notes: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export class ReturnValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnValidationError";
  }
}

function nullableTrimmed(value: string | null | undefined) {
  return value?.trim() || null;
}

function validatePositiveInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ReturnValidationError(`${fieldName} must be a positive whole number.`);
  }
}

function normalizeReturnDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ReturnValidationError("Return date is required.");
  }

  return date;
}

function normalizeItems(items: ReturnItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ReturnValidationError("At least one return item is required.");
  }

  const sourceItemIds = new Set<number>();

  return items.map((item) => {
    validatePositiveInteger(item.sourceItemId, "Return item");
    validatePositiveInteger(item.quantity, "Return quantity");

    if (sourceItemIds.has(item.sourceItemId)) {
      throw new ReturnValidationError("Each item can appear only once per return.");
    }

    sourceItemIds.add(item.sourceItemId);
    return { sourceItemId: item.sourceItemId, quantity: item.quantity };
  });
}

function getReturnedSaleQuantities(db: ReturnType<typeof createDb>["db"]) {
  const quantities = new Map<number, number>();

  for (const item of db.select().from(saleReturnItems).all()) {
    quantities.set(item.saleItemId, (quantities.get(item.saleItemId) ?? 0) + item.quantity);
  }

  return quantities;
}

function getReturnedPurchaseQuantities(db: ReturnType<typeof createDb>["db"]) {
  const quantities = new Map<number, number>();

  for (const item of db.select().from(purchaseReturnItems).all()) {
    quantities.set(item.purchaseItemId, (quantities.get(item.purchaseItemId) ?? 0) + item.quantity);
  }

  return quantities;
}

export function listSaleReturnCandidates(databasePath?: string): SaleReturnCandidateDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const returnedQuantities = getReturnedSaleQuantities(db);
    const rows = db
      .select({
        saleId: sales.id,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sales.saleDate,
        customerName: customers.name,
        saleItemId: saleItems.id,
        productId: saleItems.productId,
        variantId: saleItems.variantId,
        productName: products.name,
        productSku: products.sku,
        variantSize: productVariants.size,
        variantColor: productVariants.color,
        soldQuantity: saleItems.quantity,
        unitPriceCents: saleItems.unitPriceCents,
        unitCostCents: saleItems.unitCostCents,
        discountAmountCents: saleItems.discountAmountCents,
        totalAmountCents: saleItems.totalAmountCents,
        profitAmountCents: saleItems.profitAmountCents,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(productVariants, eq(saleItems.variantId, productVariants.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.saleDate), desc(sales.id))
      .all();

    const candidates = new Map<number, SaleReturnCandidateDto>();

    for (const row of rows) {
      const returnedQuantity = returnedQuantities.get(row.saleItemId) ?? 0;
      const returnableQuantity = row.soldQuantity - returnedQuantity;

      if (returnableQuantity <= 0) {
        continue;
      }

      const candidate =
        candidates.get(row.saleId) ??
        {
          saleId: row.saleId,
          invoiceNumber: row.invoiceNumber,
          saleDate: row.saleDate,
          customerName: row.customerName,
          items: [],
        };

      candidate.items.push({
        saleItemId: row.saleItemId,
        productId: row.productId,
        variantId: row.variantId,
        productName: row.productName,
        productSku: row.productSku,
        variantLabel: formatVariantLabel(row.variantSize || null, row.variantColor || null),
        soldQuantity: row.soldQuantity,
        returnedQuantity,
        returnableQuantity,
        unitPriceCents: row.unitPriceCents,
        unitCostCents: row.unitCostCents,
        discountAmountCents: row.discountAmountCents,
        totalAmountCents: row.totalAmountCents,
        profitAmountCents: row.profitAmountCents,
      });

      candidates.set(row.saleId, candidate);
    }

    return [...candidates.values()];
  } finally {
    sqlite.close();
  }
}

export function listPurchaseReturnCandidates(databasePath?: string): PurchaseReturnCandidateDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const returnedQuantities = getReturnedPurchaseQuantities(db);
    const rows = db
      .select({
        purchaseId: purchases.id,
        purchaseDate: purchases.purchaseDate,
        supplierName: suppliers.name,
        purchaseItemId: purchaseItems.id,
        productId: purchaseItems.productId,
        variantId: purchaseItems.variantId,
        productName: products.name,
        productSku: products.sku,
        variantSize: productVariants.size,
        variantColor: productVariants.color,
        purchasedQuantity: purchaseItems.quantity,
        unitCostCents: purchaseItems.unitCostCents,
        totalCostCents: purchaseItems.totalCostCents,
        currentStock: productVariants.currentStock,
      })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
      .innerJoin(products, eq(purchaseItems.productId, products.id))
      .leftJoin(productVariants, eq(purchaseItems.variantId, productVariants.id))
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.purchaseDate), desc(purchases.id))
      .all();

    const candidates = new Map<number, PurchaseReturnCandidateDto>();

    for (const row of rows) {
      const returnedQuantity = returnedQuantities.get(row.purchaseItemId) ?? 0;
      const returnableQuantity = row.purchasedQuantity - returnedQuantity;

      if (returnableQuantity <= 0) {
        continue;
      }

      const candidate =
        candidates.get(row.purchaseId) ??
        {
          purchaseId: row.purchaseId,
          purchaseDate: row.purchaseDate,
          supplierName: row.supplierName,
          items: [],
        };

      candidate.items.push({
        purchaseItemId: row.purchaseItemId,
        productId: row.productId,
        variantId: row.variantId,
        productName: row.productName,
        productSku: row.productSku,
        variantLabel: formatVariantLabel(row.variantSize || null, row.variantColor || null),
        purchasedQuantity: row.purchasedQuantity,
        returnedQuantity,
        returnableQuantity,
        currentStock: row.currentStock ?? 0,
        unitCostCents: row.unitCostCents,
        totalCostCents: row.totalCostCents,
      });

      candidates.set(row.purchaseId, candidate);
    }

    return [...candidates.values()];
  } finally {
    sqlite.close();
  }
}

export function createSaleReturn(databasePath: string | undefined, input: SaleReturnInput): SaleReturnDetailDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    validatePositiveInteger(input.saleId, "Sale");
    const returnDate = normalizeReturnDate(input.returnDate);
    const normalizedItems = normalizeItems(input.items);
    const notes = nullableTrimmed(input.notes);
    const actorName = nullableTrimmed(input.actorName);

    return db.transaction((tx) => {
      const sale = tx.select().from(sales).where(eq(sales.id, input.saleId)).get();

      if (sale === undefined) {
        throw new ReturnValidationError("Sale was not found.");
      }

      const returnRows = normalizedItems.map((item) => {
        const saleItem = tx.select().from(saleItems).where(eq(saleItems.id, item.sourceItemId)).get();

        if (saleItem === undefined || saleItem.saleId !== input.saleId) {
          throw new ReturnValidationError("Sale return item was not found on the selected sale.");
        }

        if (saleItem.variantId === null) {
          throw new ReturnValidationError("This sale line has no size/colour recorded and cannot be returned.");
        }

        const { variant, product } = loadVariantWithProduct(tx, saleItem.variantId, (message) => {
          throw new ReturnValidationError(message);
        });

        const returnedQuantity = tx
          .select()
          .from(saleReturnItems)
          .where(eq(saleReturnItems.saleItemId, saleItem.id))
          .all()
          .reduce((sum, returnItem) => sum + returnItem.quantity, 0);
        const returnableQuantity = saleItem.quantity - returnedQuantity;

        if (item.quantity > returnableQuantity) {
          throw new ReturnValidationError(`Cannot return more than sold quantity for ${product.name}.`);
        }

        return {
          ...item,
          saleItem,
          product,
          variant,
          discountAmountCents: Math.round((saleItem.discountAmountCents * item.quantity) / saleItem.quantity),
          totalAmountCents: Math.round((saleItem.totalAmountCents * item.quantity) / saleItem.quantity),
          profitReversalCents: Math.round((saleItem.profitAmountCents * item.quantity) / saleItem.quantity),
        };
      });
      const totalAmountCents = returnRows.reduce((sum, item) => sum + item.totalAmountCents, 0);
      const insertedReturn = tx
        .insert(saleReturns)
        .values({ saleId: input.saleId, returnDate, totalAmountCents, notes })
        .returning({ id: saleReturns.id })
        .get();

      for (const row of returnRows) {
        const stockBefore = row.variant.currentStock;
        const stockAfter = stockBefore + row.quantity;

        tx.insert(saleReturnItems)
          .values({
            saleReturnId: insertedReturn.id,
            saleItemId: row.saleItem.id,
            productId: row.product.id,
            variantId: row.variant.id,
            quantity: row.quantity,
            unitPriceCents: row.saleItem.unitPriceCents,
            discountAmountCents: row.discountAmountCents,
            totalAmountCents: row.totalAmountCents,
            profitReversalCents: row.profitReversalCents,
          })
          .run();

        tx.update(productVariants).set({ currentStock: stockAfter, updatedAt: new Date() }).where(eq(productVariants.id, row.variant.id)).run();
        rollupProductStock(tx, row.product.id);
        tx.insert(stockMovements)
          .values({
            productId: row.product.id,
            variantId: row.variant.id,
            movementType: "return",
            referenceType: "sale_return",
            referenceId: insertedReturn.id,
            quantityChange: row.quantity,
            stockBefore,
            stockAfter,
            notes,
          })
          .run();
      }

      tx.insert(auditLogs)
        .values({
          action: "sale.returned",
          entityType: "sale",
          entityId: input.saleId,
          actorName,
          details: JSON.stringify({ saleReturnId: insertedReturn.id, totalAmountCents, notes }),
        })
        .run();

      return {
        id: insertedReturn.id,
        saleId: input.saleId,
        invoiceNumber: sale.invoiceNumber,
        returnDate,
        totalAmountCents,
        notes,
        itemCount: returnRows.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  } finally {
    sqlite.close();
  }
}

export function createPurchaseReturn(databasePath: string | undefined, input: PurchaseReturnInput): PurchaseReturnDetailDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    validatePositiveInteger(input.purchaseId, "Purchase");
    const returnDate = normalizeReturnDate(input.returnDate);
    const normalizedItems = normalizeItems(input.items);
    const notes = nullableTrimmed(input.notes);
    const actorName = nullableTrimmed(input.actorName);

    return db.transaction((tx) => {
      const purchase = tx.select().from(purchases).where(eq(purchases.id, input.purchaseId)).get();

      if (purchase === undefined) {
        throw new ReturnValidationError("Purchase was not found.");
      }

      const returnRows = normalizedItems.map((item) => {
        const purchaseItem = tx.select().from(purchaseItems).where(eq(purchaseItems.id, item.sourceItemId)).get();

        if (purchaseItem === undefined || purchaseItem.purchaseId !== input.purchaseId) {
          throw new ReturnValidationError("Purchase return item was not found on the selected purchase.");
        }

        if (purchaseItem.variantId === null) {
          throw new ReturnValidationError("This purchase line has no size/colour recorded and cannot be returned.");
        }

        const { variant, product } = loadVariantWithProduct(tx, purchaseItem.variantId, (message) => {
          throw new ReturnValidationError(message);
        });

        const returnedQuantity = tx
          .select()
          .from(purchaseReturnItems)
          .where(eq(purchaseReturnItems.purchaseItemId, purchaseItem.id))
          .all()
          .reduce((sum, returnItem) => sum + returnItem.quantity, 0);
        const returnableQuantity = purchaseItem.quantity - returnedQuantity;

        if (item.quantity > returnableQuantity) {
          throw new ReturnValidationError(`Cannot return more than purchased quantity for ${product.name}.`);
        }

        if (variant.currentStock < item.quantity) {
          throw new ReturnValidationError(`Cannot return ${product.name} to supplier because only ${variant.currentStock} are in stock.`);
        }

        return {
          ...item,
          purchaseItem,
          product,
          variant,
          totalCostCents: Math.round((purchaseItem.totalCostCents * item.quantity) / purchaseItem.quantity),
        };
      });
      const totalAmountCents = returnRows.reduce((sum, item) => sum + item.totalCostCents, 0);
      const insertedReturn = tx
        .insert(purchaseReturns)
        .values({ purchaseId: input.purchaseId, returnDate, totalAmountCents, notes })
        .returning({ id: purchaseReturns.id })
        .get();

      for (const row of returnRows) {
        const stockBefore = row.variant.currentStock;
        const stockAfter = stockBefore - row.quantity;

        tx.insert(purchaseReturnItems)
          .values({
            purchaseReturnId: insertedReturn.id,
            purchaseItemId: row.purchaseItem.id,
            productId: row.product.id,
            variantId: row.variant.id,
            quantity: row.quantity,
            unitCostCents: row.purchaseItem.unitCostCents,
            totalCostCents: row.totalCostCents,
          })
          .run();

        tx.update(productVariants).set({ currentStock: stockAfter, updatedAt: new Date() }).where(eq(productVariants.id, row.variant.id)).run();
        rollupProductStock(tx, row.product.id);
        tx.insert(stockMovements)
          .values({
            productId: row.product.id,
            variantId: row.variant.id,
            movementType: "return",
            referenceType: "purchase_return",
            referenceId: insertedReturn.id,
            quantityChange: -row.quantity,
            stockBefore,
            stockAfter,
            notes,
          })
          .run();
      }

      tx.insert(auditLogs)
        .values({
          action: "purchase.returned",
          entityType: "purchase",
          entityId: input.purchaseId,
          actorName,
          details: JSON.stringify({ purchaseReturnId: insertedReturn.id, totalAmountCents, notes }),
        })
        .run();

      const supplier = purchase.supplierId === null ? undefined : tx.select().from(suppliers).where(eq(suppliers.id, purchase.supplierId)).get();

      return {
        id: insertedReturn.id,
        purchaseId: input.purchaseId,
        returnDate,
        supplierName: supplier?.name ?? null,
        totalAmountCents,
        notes,
        itemCount: returnRows.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
  } finally {
    sqlite.close();
  }
}

function getSaleReturnDetail(db: ReturnType<typeof createDb>["db"], id: number): SaleReturnDetailDto {
  const row = db
    .select({
      id: saleReturns.id,
      saleId: saleReturns.saleId,
      invoiceNumber: sales.invoiceNumber,
      returnDate: saleReturns.returnDate,
      totalAmountCents: saleReturns.totalAmountCents,
      notes: saleReturns.notes,
      createdAt: saleReturns.createdAt,
      updatedAt: saleReturns.updatedAt,
    })
    .from(saleReturns)
    .innerJoin(sales, eq(saleReturns.saleId, sales.id))
    .where(eq(saleReturns.id, id))
    .get();

  if (row === undefined) {
    throw new ReturnValidationError("Sale return was not found.");
  }

  return { ...row, itemCount: db.select().from(saleReturnItems).where(eq(saleReturnItems.saleReturnId, id)).all().length };
}

function getPurchaseReturnDetail(db: ReturnType<typeof createDb>["db"], id: number): PurchaseReturnDetailDto {
  const row = db
    .select({
      id: purchaseReturns.id,
      purchaseId: purchaseReturns.purchaseId,
      returnDate: purchaseReturns.returnDate,
      supplierName: suppliers.name,
      totalAmountCents: purchaseReturns.totalAmountCents,
      notes: purchaseReturns.notes,
      createdAt: purchaseReturns.createdAt,
      updatedAt: purchaseReturns.updatedAt,
    })
    .from(purchaseReturns)
    .innerJoin(purchases, eq(purchaseReturns.purchaseId, purchases.id))
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchaseReturns.id, id))
    .get();

  if (row === undefined) {
    throw new ReturnValidationError("Purchase return was not found.");
  }

  return { ...row, itemCount: db.select().from(purchaseReturnItems).where(eq(purchaseReturnItems.purchaseReturnId, id)).all().length };
}

export function listSaleReturns(databasePath?: string): SaleReturnDetailDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db
      .select({ id: saleReturns.id })
      .from(saleReturns)
      .orderBy(desc(saleReturns.returnDate), desc(saleReturns.id))
      .all()
      .map((row) => getSaleReturnDetail(db, row.id));
  } finally {
    sqlite.close();
  }
}

export function listPurchaseReturns(databasePath?: string): PurchaseReturnDetailDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db
      .select({ id: purchaseReturns.id })
      .from(purchaseReturns)
      .orderBy(desc(purchaseReturns.returnDate), desc(purchaseReturns.id))
      .all()
      .map((row) => getPurchaseReturnDetail(db, row.id));
  } finally {
    sqlite.close();
  }
}
