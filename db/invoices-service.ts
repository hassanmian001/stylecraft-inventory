import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { formatVariantLabel } from "./products-service.js";
import { customers, productVariants, products, saleItems, sales, settings } from "./schema.js";

const defaultBusinessPhone = "+92 326 0609031";
const defaultBusinessEmail = "stylecraftpk.com@gmail.com";

export type InvoiceBusinessSettingsDto = {
  businessName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currencySymbol: string;
  invoicePrefix: string;
};

export type InvoiceLineItemDto = {
  id: number;
  productId: number;
  variantLabel: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
};

export type InvoiceDetailDto = {
  saleId: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  subtotalCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  paymentMethod: string | null;
  notes: string | null;
  business: InvoiceBusinessSettingsDto;
  items: InvoiceLineItemDto[];
};

export class InvoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceValidationError";
  }
}

function validateSaleId(saleId: number) {
  if (!Number.isInteger(saleId) || saleId <= 0) {
    throw new InvoiceValidationError("Sale ID must be a positive whole number.");
  }
}

function trimmedOrNull(value: string | null | undefined) {
  return value?.trim() || null;
}

function getBusinessSettings(rows: Array<typeof settings.$inferSelect>): InvoiceBusinessSettingsDto {
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    businessName: trimmedOrNull(values.get("business.name")) ?? "StyleCraft",
    phone: trimmedOrNull(values.get("business.phone")) ?? defaultBusinessPhone,
    email: trimmedOrNull(values.get("business.email")) ?? defaultBusinessEmail,
    address: trimmedOrNull(values.get("business.address")),
    currencySymbol: trimmedOrNull(values.get("currency.symbol")) ?? "Rs.",
    invoicePrefix: trimmedOrNull(values.get("invoice.prefix")) ?? "INV",
  };
}

export function getInvoiceBySaleId(databasePath: string | undefined, saleId: number): InvoiceDetailDto {
  validateSaleId(saleId);
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const sale = db
      .select({
        saleId: sales.id,
        invoiceNumber: sales.invoiceNumber,
        saleDate: sales.saleDate,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        customerAddress: customers.address,
        subtotalCents: sales.subtotalCents,
        discountAmountCents: sales.discountAmountCents,
        totalAmountCents: sales.totalAmountCents,
        paymentMethod: sales.paymentMethod,
        notes: sales.notes,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.id, saleId))
      .get();

    if (sale === undefined) {
      throw new InvoiceValidationError("Sale was not found.");
    }

    const itemRows = db
      .select({
        id: saleItems.id,
        productId: saleItems.productId,
        productName: products.name,
        productSku: products.sku,
        variantSize: productVariants.size,
        variantColor: productVariants.color,
        quantity: saleItems.quantity,
        unitPriceCents: saleItems.unitPriceCents,
        discountAmountCents: saleItems.discountAmountCents,
        totalAmountCents: saleItems.totalAmountCents,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(productVariants, eq(saleItems.variantId, productVariants.id))
      .where(eq(saleItems.saleId, saleId))
      .all();

    const items = itemRows.map(({ variantSize, variantColor, ...item }) => ({
      ...item,
      variantLabel: formatVariantLabel(variantSize || null, variantColor || null),
    }));

    return {
      ...sale,
      business: getBusinessSettings(db.select().from(settings).all()),
      items,
    };
  } finally {
    sqlite.close();
  }
}
