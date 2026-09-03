import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { formatVariantLabel, rollupProductStock } from "./products-service.js";
import { auditLogs, productVariants, products, stockMovements } from "./schema.js";

export type StockAdjustmentInput = {
  variantId: number;
  newStock: number;
  reason: string;
  actorName?: string | null;
};

export type StockAdjustmentDto = {
  productId: number;
  variantId: number;
  productName: string;
  productSku: string;
  variantLabel: string;
  variantSku: string;
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
  if (!Number.isInteger(input.variantId) || input.variantId <= 0) {
    throw new StockAdjustmentValidationError("Product size/colour must be selected.");
  }

  if (!Number.isInteger(input.newStock) || input.newStock < 0) {
    throw new StockAdjustmentValidationError("New stock must be a whole number of zero or more.");
  }

  const reason = input.reason.trim();

  if (!reason) {
    throw new StockAdjustmentValidationError("Adjustment reason is required.");
  }

  return {
    variantId: input.variantId,
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
      const variant = tx.select().from(productVariants).where(eq(productVariants.id, normalizedInput.variantId)).get();

      if (variant === undefined) {
        throw new StockAdjustmentValidationError("Product size/colour was not found.");
      }

      const product = tx.select().from(products).where(eq(products.id, variant.productId)).get();

      if (product === undefined) {
        throw new StockAdjustmentValidationError("Product was not found.");
      }

      if (!product.isActive || !variant.isActive) {
        throw new StockAdjustmentValidationError("Inactive product stock cannot be adjusted.");
      }

      if (variant.currentStock === normalizedInput.newStock) {
        throw new StockAdjustmentValidationError("New stock must be different from current stock.");
      }

      const stockBefore = variant.currentStock;
      const stockAfter = normalizedInput.newStock;
      const quantityChange = stockAfter - stockBefore;
      const variantLabel = formatVariantLabel(variant.size || null, variant.color || null);

      tx.update(productVariants)
        .set({ currentStock: stockAfter, updatedAt: new Date() })
        .where(eq(productVariants.id, variant.id))
        .run();
      rollupProductStock(tx, product.id);

      const stockMovement = tx
        .insert(stockMovements)
        .values({
          productId: product.id,
          variantId: variant.id,
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
            variantLabel,
            variantSku: variant.sku,
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
        variantId: variant.id,
        productName: product.name,
        productSku: product.sku,
        variantLabel,
        variantSku: variant.sku,
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
