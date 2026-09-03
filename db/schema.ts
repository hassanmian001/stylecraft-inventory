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
