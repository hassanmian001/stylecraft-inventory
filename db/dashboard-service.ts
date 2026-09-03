import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { formatVariantLabel } from "./products-service.js";
import { productVariants, products, saleItems, sales } from "./schema.js";

export type DashboardLowStockProductDto = {
  id: number;
  variantId: number;
  name: string;
  sku: string;
  variantLabel: string;
  currentStock: number;
  lowStockThreshold: number;
};

export type DashboardBestSellingProductDto = {
  productId: number;
  name: string;
  sku: string;
  quantitySold: number;
  totalSalesCents: number;
};

export type DashboardSummaryDto = {
  productCount: number;
  totalStockQuantity: number;
  inventoryValueCents: number;
  todaySalesCents: number;
  currentMonthSalesCents: number;
  currentMonthProfitCents: number;
  lowStockProducts: DashboardLowStockProductDto[];
  bestSellingProducts: DashboardBestSellingProductDto[];
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfNextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function isInRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

export function getDashboardSummary(databasePath?: string, now = new Date()): DashboardSummaryDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const productRows = db.select().from(products).all();
    const activeProducts = productRows.filter((product) => product.isActive);
    const saleRows = db.select().from(sales).all();
    const todayStart = startOfDay(now);
    const tomorrowStart = startOfNextDay(now);
    const monthStart = startOfMonth(now);
    const nextMonthStart = startOfNextMonth(now);
    const todaySalesCents = saleRows
      .filter((sale) => isInRange(sale.saleDate, todayStart, tomorrowStart))
      .reduce((sum, sale) => sum + sale.totalAmountCents, 0);
    const currentMonthSales = saleRows.filter((sale) => isInRange(sale.saleDate, monthStart, nextMonthStart));
    const bestSellingByProduct = new Map<number, DashboardBestSellingProductDto>();

    for (const row of db
      .select({
        productId: saleItems.productId,
        name: products.name,
        sku: products.sku,
        quantity: saleItems.quantity,
        totalAmountCents: saleItems.totalAmountCents,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .all()) {
      const existing = bestSellingByProduct.get(row.productId);

      if (existing === undefined) {
        bestSellingByProduct.set(row.productId, {
          productId: row.productId,
          name: row.name,
          sku: row.sku,
          quantitySold: row.quantity,
          totalSalesCents: row.totalAmountCents,
        });
      } else {
        existing.quantitySold += row.quantity;
        existing.totalSalesCents += row.totalAmountCents;
      }
    }

    // Low stock is judged per size/colour: a style is not really covered just
    // because its other sizes are stacked up.
    const lowStockVariants: DashboardLowStockProductDto[] = db
      .select({
        id: products.id,
        variantId: productVariants.id,
        name: products.name,
        sku: productVariants.sku,
        variantSize: productVariants.size,
        variantColor: productVariants.color,
        currentStock: productVariants.currentStock,
        variantLowStockThreshold: productVariants.lowStockThreshold,
        productLowStockThreshold: products.lowStockThreshold,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.isActive, true))
      .all()
      .map((row) => ({
        id: row.id,
        variantId: row.variantId,
        name: row.name,
        sku: row.sku,
        variantLabel: formatVariantLabel(row.variantSize || null, row.variantColor || null),
        currentStock: row.currentStock,
        lowStockThreshold: row.variantLowStockThreshold ?? row.productLowStockThreshold,
      }))
      .filter((row) => row.currentStock <= row.lowStockThreshold)
      .sort((a, b) => a.currentStock - b.currentStock || a.name.localeCompare(b.name));

    return {
      productCount: activeProducts.length,
      totalStockQuantity: activeProducts.reduce((sum, product) => sum + product.currentStock, 0),
      inventoryValueCents: activeProducts.reduce((sum, product) => sum + product.currentStock * product.purchasePriceCents, 0),
      todaySalesCents,
      currentMonthSalesCents: currentMonthSales.reduce((sum, sale) => sum + sale.totalAmountCents, 0),
      currentMonthProfitCents: currentMonthSales.reduce((sum, sale) => sum + sale.profitAmountCents, 0),
      lowStockProducts: lowStockVariants,
      bestSellingProducts: Array.from(bestSellingByProduct.values()).sort(
        (a, b) => b.quantitySold - a.quantitySold || b.totalSalesCents - a.totalSalesCents || a.name.localeCompare(b.name),
      ),
    };
  } finally {
    sqlite.close();
  }
}
