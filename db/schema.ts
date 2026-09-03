import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => ({
    nameIdx: uniqueIndex("categories_name_unique").on(table.name),
  }),
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    purchasePriceCents: integer("purchase_price_cents").notNull().default(0),
    sellingPriceCents: integer("selling_price_cents").notNull().default(0),
    currentStock: integer("current_stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    skuIdx: uniqueIndex("products_sku_unique").on(table.sku),
    nameIdx: index("products_name_idx").on(table.name),
    categoryIdx: index("products_category_id_idx").on(table.categoryId),
  }),
);

// One row per size/colour combination of a product. Stock lives here, not on
// the product: a product's current_stock is a rollup of its variants. Price and
// low-stock columns are nullable and fall back to the product's own values, so a
// shop only fills them in when one size costs more than the rest.
//
// size and colour default to "" rather than NULL because SQLite treats NULLs as
// distinct in unique indexes, which would let the same combination be added twice.
export const productVariants = sqliteTable(
  "product_variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull().default(""),
    color: text("color").notNull().default(""),
    sku: text("sku").notNull(),
    purchasePriceCents: integer("purchase_price_cents"),
    sellingPriceCents: integer("selling_price_cents"),
    currentStock: integer("current_stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    skuIdx: uniqueIndex("product_variants_sku_unique").on(table.sku),
    productIdx: index("product_variants_product_id_idx").on(table.productId),
    comboIdx: uniqueIndex("product_variants_combo_unique").on(table.productId, table.size, table.color),
  }),
);

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  ...timestamps,
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  ...timestamps,
});

export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  purchaseDate: integer("purchase_date", { mode: "timestamp_ms" }).notNull(),
  totalAmountCents: integer("total_amount_cents").notNull().default(0),
  amountPaidCents: integer("amount_paid_cents").notNull().default(0),
  notes: text("notes"),
  ...timestamps,
});

export const purchaseItems = sqliteTable("purchase_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull(),
  totalCostCents: integer("total_cost_cents").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceNumber: text("invoice_number").notNull(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    saleDate: integer("sale_date", { mode: "timestamp_ms" }).notNull(),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountAmountCents: integer("discount_amount_cents").notNull().default(0),
    totalAmountCents: integer("total_amount_cents").notNull().default(0),
    profitAmountCents: integer("profit_amount_cents").notNull().default(0),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => ({
    invoiceIdx: uniqueIndex("sales_invoice_number_unique").on(table.invoiceNumber),
  }),
);

export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull(),
  discountAmountCents: integer("discount_amount_cents").notNull().default(0),
  totalAmountCents: integer("total_amount_cents").notNull(),
  profitAmountCents: integer("profit_amount_cents").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const saleReturns = sqliteTable("sale_returns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "restrict" }),
  returnDate: integer("return_date", { mode: "timestamp_ms" }).notNull(),
  totalAmountCents: integer("total_amount_cents").notNull().default(0),
  notes: text("notes"),
  ...timestamps,
});

export const saleReturnItems = sqliteTable("sale_return_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleReturnId: integer("sale_return_id")
    .notNull()
    .references(() => saleReturns.id, { onDelete: "cascade" }),
  saleItemId: integer("sale_item_id")
    .notNull()
    .references(() => saleItems.id, { onDelete: "restrict" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  discountAmountCents: integer("discount_amount_cents").notNull().default(0),
  totalAmountCents: integer("total_amount_cents").notNull(),
  profitReversalCents: integer("profit_reversal_cents").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const purchaseReturns = sqliteTable("purchase_returns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "restrict" }),
  returnDate: integer("return_date", { mode: "timestamp_ms" }).notNull(),
  totalAmountCents: integer("total_amount_cents").notNull().default(0),
  notes: text("notes"),
  ...timestamps,
});

export const purchaseReturnItems = sqliteTable("purchase_return_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseReturnId: integer("purchase_return_id")
    .notNull()
    .references(() => purchaseReturns.id, { onDelete: "cascade" }),
  purchaseItemId: integer("purchase_item_id")
    .notNull()
    .references(() => purchaseItems.id, { onDelete: "restrict" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitCostCents: integer("unit_cost_cents").notNull(),
  totalCostCents: integer("total_cost_cents").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "restrict" }),
    movementType: text("movement_type", { enum: ["purchase", "sale", "adjustment", "return"] }).notNull(),
    referenceType: text("reference_type").notNull(),
    referenceId: integer("reference_id"),
    quantityChange: integer("quantity_change").notNull(),
    stockBefore: integer("stock_before").notNull(),
    stockAfter: integer("stock_after").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    productIdx: index("stock_movements_product_id_idx").on(table.productId),
  }),
);

// Money moving between the shop and a customer or supplier, outside of the sale
// or purchase itself. A ledger balance is the party's invoices minus their
// payments minus their returns, so an amount paid up front is recorded here too
// (linked back through saleId / purchaseId) rather than only on the invoice.
export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    partyType: text("party_type", { enum: ["customer", "supplier"] }).notNull(),
    partyId: integer("party_id").notNull(),
    direction: text("direction", { enum: ["in", "out"] }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    paymentDate: integer("payment_date", { mode: "timestamp_ms" }).notNull(),
    method: text("method"),
    notes: text("notes"),
    saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }),
    purchaseId: integer("purchase_id").references(() => purchases.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => ({
    partyIdx: index("payments_party_idx").on(table.partyType, table.partyId),
    dateIdx: index("payments_payment_date_idx").on(table.paymentDate),
  }),
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),
    actorName: text("actor_name"),
    details: text("details"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export const schemaTableNames = [
  "audit_logs",
  "categories",
  "customers",
  "payments",
  "product_variants",
  "products",
  "purchase_items",
  "purchase_return_items",
  "purchase_returns",
  "purchases",
  "sale_return_items",
  "sale_returns",
  "sale_items",
  "sales",
  "settings",
  "stock_movements",
  "suppliers",
] as const;
