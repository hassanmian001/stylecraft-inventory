import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { auditLogs, products, stockMovements } from "./schema.js";

export type StockAdjustmentInput = {
  productId: number;
  newStock: number;
  reason: string;
  actorName?: string | null;
};

export type StockAdjustmentDto = {
  productId: number;
  productName: string;
  productSku: string;
  stockBefore: number;
  stockAfter: number;
  quantityChange: number;
  stockMovementId: number;
  auditLogId: number;
};

export class StockAdjustmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockAdjustmentValidationError";
  }
}

function nullableTrimmed(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeStockAdjustmentInput(input: StockAdjustmentInput) {
  if (!Number.isInteger(input.productId) || input.productId <= 0) {
    throw new StockAdjustmentValidationError("Product must be selected.");
  }

  if (!Number.isInteger(input.newStock) || input.newStock < 0) {
    throw new StockAdjustmentValidationError("New stock must be a whole number of zero or more.");
  }

  const reason = input.reason.trim();

  if (!reason) {
    throw new StockAdjustmentValidationError("Adjustment reason is required.");
  }

  return {
    productId: input.productId,
    newStock: input.newStock,
    reason,
    actorName: nullableTrimmed(input.actorName),
  };
}

export function adjustStock(databasePath: string | undefined, input: StockAdjustmentInput): StockAdjustmentDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeStockAdjustmentInput(input);

    return db.transaction((tx) => {
      const product = tx.select().from(products).where(eq(products.id, normalizedInput.productId)).get();

      if (product === undefined) {
        throw new StockAdjustmentValidationError("Product was not found.");
      }

      if (!product.isActive) {
        throw new StockAdjustmentValidationError("Inactive product stock cannot be adjusted.");
      }

      if (product.currentStock === normalizedInput.newStock) {
        throw new StockAdjustmentValidationError("New stock must be different from current stock.");
      }

      const stockBefore = product.currentStock;
      const stockAfter = normalizedInput.newStock;
      const quantityChange = stockAfter - stockBefore;

      tx.update(products)
        .set({ currentStock: stockAfter, updatedAt: new Date() })
        .where(eq(products.id, normalizedInput.productId))
        .run();

      const stockMovement = tx
        .insert(stockMovements)
        .values({
          productId: normalizedInput.productId,
          movementType: "adjustment",
          referenceType: "stock_adjustment",
          referenceId: null,
          quantityChange,
          stockBefore,
          stockAfter,
          notes: normalizedInput.reason,
        })
        .returning({ id: stockMovements.id })
        .get();

      const auditLog = tx
        .insert(auditLogs)
        .values({
          action: "stock.adjusted",
          entityType: "product",
          entityId: product.id,
          actorName: normalizedInput.actorName,
          details: JSON.stringify({
            productName: product.name,
            productSku: product.sku,
            stockBefore,
            stockAfter,
            quantityChange,
            reason: normalizedInput.reason,
            stockMovementId: stockMovement.id,
          }),
        })
        .returning({ id: auditLogs.id })
        .get();

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        stockBefore,
        stockAfter,
        quantityChange,
        stockMovementId: stockMovement.id,
        auditLogId: auditLog.id,
      };
    });
  } finally {
    sqlite.close();
  }
}
