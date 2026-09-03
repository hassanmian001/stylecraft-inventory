import { desc, eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { formatVariantLabel } from "./products-service.js";
import { categories, customers, productVariants, products, purchaseItems, purchases, saleItems, sales, suppliers } from "./schema.js";

export type ReportFilters = {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

export type SalesReportRowDto = {
  id: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  itemCount: number;
  subtotalCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
  paymentMethod: string | null;
  notes: string | null;
};

export type PurchaseReportRowDto = {
  id: number;
  purchaseDate: Date;
  supplierName: string | null;
  itemCount: number;
  totalAmountCents: number;
  notes: string | null;
};

export type ProfitReportRowDto = {
  saleId: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  revenueCents: number;
  costCents: number;
  discountAmountCents: number;
  profitAmountCents: number;
};

export type StockReportRowDto = {
  productId: number;
  variantId: number;
  name: string;
  sku: string;
  variantLabel: string;
  categoryName: string | null;
  currentStock: number;
  lowStockThreshold: number;
  purchasePriceCents: number;
  sellingPriceCents: number;
  inventoryValueCents: number;
  isLowStock: boolean;
  isActive: boolean;
};

export type ReportsTotalsDto = {
  salesTotalCents: number;
  purchaseTotalCents: number;
  revenueCents: number;
  costCents: number;
  discountCents: number;
  profitCents: number;
  stockQuantity: number;
  inventoryValueCents: number;
};

export type ReportsDto = {
  filters: ReportFilters;
  salesRows: SalesReportRowDto[];
  purchaseRows: PurchaseReportRowDto[];
  profitRows: ProfitReportRowDto[];
  stockRows: StockReportRowDto[];
  totals: ReportsTotalsDto;
};

function parseFilterDate(value: Date | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match !== null) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfNextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function normalizeFilters(filters: ReportFilters = {}) {
  const startDate = parseFilterDate(filters.startDate);
  const endDate = parseFilterDate(filters.endDate);

  return {
    startDate,
    endDate,
    startBoundary: startDate === null ? null : startOfDay(startDate),
    endBoundary: endDate === null ? null : startOfNextDay(endDate),
  };
}

function isInDateRange(date: Date, normalizedFilters: ReturnType<typeof normalizeFilters>) {
  const time = date.getTime();

  if (normalizedFilters.startBoundary !== null && time < normalizedFilters.startBoundary.getTime()) {
    return false;
  }

  if (normalizedFilters.endBoundary !== null && time >= normalizedFilters.endBoundary.getTime()) {
    return false;
  }

  return true;
}

export function getReports(databasePath?: string, filters: ReportFilters = {}): ReportsDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedFilters = normalizeFilters(filters);
    const saleRows = db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sales.saleDate,
        customerName: customers.name,
        subtotalCents: sales.subtotalCents,
        discountAmountCents: sales.discountAmountCents,
        totalAmountCents: sales.totalAmountCents,
        profitAmountCents: sales.profitAmountCents,
        paymentMethod: sales.paymentMethod,
        notes: sales.notes,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.saleDate), desc(sales.id))
      .all()
      .filter((sale) => isInDateRange(sale.saleDate, normalizedFilters));
    const purchaseRows = db
      .select({
        id: purchases.id,
        purchaseDate: purchases.purchaseDate,
        supplierName: suppliers.name,
        totalAmountCents: purchases.totalAmountCents,
        notes: purchases.notes,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.purchaseDate), desc(purchases.id))
      .all()
      .filter((purchase) => isInDateRange(purchase.purchaseDate, normalizedFilters));
    const saleItemRows = db
      .select({
        saleId: saleItems.saleId,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sales.saleDate,
        customerName: customers.name,
        quantity: saleItems.quantity,
        unitCostCents: saleItems.unitCostCents,
        discountAmountCents: saleItems.discountAmountCents,
        totalAmountCents: saleItems.totalAmountCents,
        profitAmountCents: saleItems.profitAmountCents,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .all()
      .filter((item) => isInDateRange(item.saleDate, normalizedFilters));
    const profitBySale = new Map<number, ProfitReportRowDto>();

    for (const item of saleItemRows) {
      const existing = profitBySale.get(item.saleId);
      const costCents = item.quantity * item.unitCostCents;

      if (existing === undefined) {
        profitBySale.set(item.saleId, {
          saleId: item.saleId,
          invoiceNumber: item.invoiceNumber,
          saleDate: item.saleDate,
          customerName: item.customerName,
          revenueCents: item.totalAmountCents,
          costCents,
          discountAmountCents: item.discountAmountCents,
          profitAmountCents: item.profitAmountCents,
        });
      } else {
        existing.revenueCents += item.totalAmountCents;
        existing.costCents += costCents;
        existing.discountAmountCents += item.discountAmountCents;
        existing.profitAmountCents += item.profitAmountCents;
      }
    }

    const salesReportRows: SalesReportRowDto[] = saleRows.map((sale) => ({
      ...sale,
      itemCount: db.select().from(saleItems).where(eq(saleItems.saleId, sale.id)).all().length,
    }));
    const purchaseReportRows: PurchaseReportRowDto[] = purchaseRows.map((purchase) => ({
      ...purchase,
      itemCount: db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchase.id)).all().length,
    }));
    const profitRows = Array.from(profitBySale.values()).sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime() || b.saleId - a.saleId);
    // One row per size/colour: a style can hold plenty of stock overall while
    // one size has run out, and that is exactly what the shop needs to see.
    const stockRows: StockReportRowDto[] = db
      .select({
        productId: products.id,
        variantId: productVariants.id,
        name: products.name,
        sku: productVariants.sku,
        variantSize: productVariants.size,
        variantColor: productVariants.color,
        categoryName: categories.name,
        currentStock: productVariants.currentStock,
        variantLowStockThreshold: productVariants.lowStockThreshold,
        productLowStockThreshold: products.lowStockThreshold,
        variantPurchasePriceCents: productVariants.purchasePriceCents,
        productPurchasePriceCents: products.purchasePriceCents,
        variantSellingPriceCents: productVariants.sellingPriceCents,
        productSellingPriceCents: products.sellingPriceCents,
        isActive: productVariants.isActive,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(products.name, productVariants.size, productVariants.color)
      .all()
      .map((row) => {
        const lowStockThreshold = row.variantLowStockThreshold ?? row.productLowStockThreshold;
        const purchasePriceCents = row.variantPurchasePriceCents ?? row.productPurchasePriceCents;
        const sellingPriceCents = row.variantSellingPriceCents ?? row.productSellingPriceCents;

        return {
          productId: row.productId,
          variantId: row.variantId,
          name: row.name,
          sku: row.sku,
          variantLabel: formatVariantLabel(row.variantSize || null, row.variantColor || null),
          categoryName: row.categoryName,
          currentStock: row.currentStock,
          lowStockThreshold,
          purchasePriceCents,
          sellingPriceCents,
          inventoryValueCents: row.currentStock * purchasePriceCents,
          isLowStock: row.currentStock <= lowStockThreshold,
          isActive: row.isActive,
        };
      });

    return {
      filters,
      salesRows: salesReportRows,
      purchaseRows: purchaseReportRows,
      profitRows,
      stockRows,
      totals: {
        salesTotalCents: salesReportRows.reduce((sum, sale) => sum + sale.totalAmountCents, 0),
        purchaseTotalCents: purchaseReportRows.reduce((sum, purchase) => sum + purchase.totalAmountCents, 0),
        revenueCents: profitRows.reduce((sum, row) => sum + row.revenueCents, 0),
        costCents: profitRows.reduce((sum, row) => sum + row.costCents, 0),
        discountCents: profitRows.reduce((sum, row) => sum + row.discountAmountCents, 0),
        profitCents: profitRows.reduce((sum, row) => sum + row.profitAmountCents, 0),
        stockQuantity: stockRows.reduce((sum, row) => sum + row.currentStock, 0),
        inventoryValueCents: stockRows.reduce((sum, row) => sum + row.inventoryValueCents, 0),
      },
    };
  } finally {
    sqlite.close();
  }
}
