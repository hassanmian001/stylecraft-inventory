import { and, asc, eq, sql } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { customers, payments, purchaseReturns, purchases, saleReturns, sales, suppliers } from "./schema.js";

export type LedgerPartyType = "customer" | "supplier";

export type PaymentInput = {
  partyType: LedgerPartyType;
  partyId: number;
  amountCents: number;
  paymentDate: Date | string;
  method?: string | null;
  notes?: string | null;
};

export type PaymentDto = {
  id: number;
  partyType: LedgerPartyType;
  partyId: number;
  direction: "in" | "out";
  amountCents: number;
  paymentDate: Date;
  method: string | null;
  notes: string | null;
  saleId: number | null;
  purchaseId: number | null;
};

/**
 * A single line of a khata. `debitCents` is what the party owes the shop (or the
 * shop owes them, for suppliers) and `creditCents` is what has settled.
 */
export type LedgerEntryDto = {
  date: Date;
  kind: "sale" | "purchase" | "payment" | "sale_return" | "purchase_return";
  reference: string;
  description: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
};

export type LedgerPartySummaryDto = {
  partyType: LedgerPartyType;
  partyId: number;
  partyName: string;
  phone: string | null;
  invoicedCents: number;
  paidCents: number;
  returnedCents: number;
  balanceCents: number;
};

export type LedgerStatementDto = LedgerPartySummaryDto & {
  entries: LedgerEntryDto[];
};

export type LedgerSummaryDto = {
  customers: LedgerPartySummaryDto[];
  suppliers: LedgerPartySummaryDto[];
  customerReceivableCents: number;
  supplierPayableCents: number;
};

export class LedgerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerValidationError";
  }
}

type Db = ReturnType<typeof createDb>["db"];

function nullableTrimmed(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizePaymentDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new LedgerValidationError("Payment date is required.");
  }

  return date;
}

function normalizePaymentInput(input: PaymentInput) {
  if (input.partyType !== "customer" && input.partyType !== "supplier") {
    throw new LedgerValidationError("Payment must belong to a customer or a supplier.");
  }

  if (!Number.isInteger(input.partyId) || input.partyId <= 0) {
    throw new LedgerValidationError(input.partyType === "customer" ? "Customer must be selected." : "Supplier must be selected.");
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new LedgerValidationError("Payment amount must be more than zero.");
  }

  return {
    partyType: input.partyType,
    partyId: input.partyId,
    direction: input.partyType === "customer" ? ("in" as const) : ("out" as const),
    amountCents: input.amountCents,
    paymentDate: normalizePaymentDate(input.paymentDate),
    method: nullableTrimmed(input.method),
    notes: nullableTrimmed(input.notes),
  };
}

function customerSummaries(db: Db): LedgerPartySummaryDto[] {
  const rows = db.select().from(customers).orderBy(asc(customers.name)).all();

  return rows.map((customer) => {
    const invoicedCents =
      db
        .select({ total: sql<number>`coalesce(sum(${sales.totalAmountCents}), 0)` })
        .from(sales)
        .where(eq(sales.customerId, customer.id))
        .get()?.total ?? 0;

    const paidCents =
      db
        .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)` })
        .from(payments)
        .where(and(eq(payments.partyType, "customer"), eq(payments.partyId, customer.id)))
        .get()?.total ?? 0;

    const returnedCents =
      db
        .select({ total: sql<number>`coalesce(sum(${saleReturns.totalAmountCents}), 0)` })
        .from(saleReturns)
        .innerJoin(sales, eq(saleReturns.saleId, sales.id))
        .where(eq(sales.customerId, customer.id))
        .get()?.total ?? 0;

    return {
      partyType: "customer" as const,
      partyId: customer.id,
      partyName: customer.name,
      phone: customer.phone,
      invoicedCents,
      paidCents,
      returnedCents,
      balanceCents: invoicedCents - paidCents - returnedCents,
    };
  });
}

function supplierSummaries(db: Db): LedgerPartySummaryDto[] {
  const rows = db.select().from(suppliers).orderBy(asc(suppliers.name)).all();

  return rows.map((supplier) => {
    const invoicedCents =
      db
        .select({ total: sql<number>`coalesce(sum(${purchases.totalAmountCents}), 0)` })
        .from(purchases)
        .where(eq(purchases.supplierId, supplier.id))
        .get()?.total ?? 0;

    const paidCents =
      db
        .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)` })
        .from(payments)
        .where(and(eq(payments.partyType, "supplier"), eq(payments.partyId, supplier.id)))
        .get()?.total ?? 0;

    const returnedCents =
      db
        .select({ total: sql<number>`coalesce(sum(${purchaseReturns.totalAmountCents}), 0)` })
        .from(purchaseReturns)
        .innerJoin(purchases, eq(purchaseReturns.purchaseId, purchases.id))
        .where(eq(purchases.supplierId, supplier.id))
        .get()?.total ?? 0;

    return {
      partyType: "supplier" as const,
      partyId: supplier.id,
      partyName: supplier.name,
      phone: supplier.phone,
      invoicedCents,
      paidCents,
      returnedCents,
      balanceCents: invoicedCents - paidCents - returnedCents,
    };
  });
}

export function getLedgerSummary(databasePath?: string): LedgerSummaryDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const customerRows = customerSummaries(db);
    const supplierRows = supplierSummaries(db);

    return {
      customers: customerRows,
      suppliers: supplierRows,
      customerReceivableCents: customerRows.reduce((sum, row) => sum + Math.max(row.balanceCents, 0), 0),
      supplierPayableCents: supplierRows.reduce((sum, row) => sum + Math.max(row.balanceCents, 0), 0),
    };
  } finally {
    sqlite.close();
  }
}

function buildEntries(rows: Omit<LedgerEntryDto, "balanceCents">[]): LedgerEntryDto[] {
  const sorted = [...rows].sort((left, right) => left.date.getTime() - right.date.getTime());
  let balanceCents = 0;

  return sorted.map((row) => {
    balanceCents += row.debitCents - row.creditCents;
    return { ...row, balanceCents };
  });
}

export function getLedgerStatement(databasePath: string | undefined, partyType: LedgerPartyType, partyId: number): LedgerStatementDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const summaries = partyType === "customer" ? customerSummaries(db) : supplierSummaries(db);
    const summary = summaries.find((row) => row.partyId === partyId);

    if (summary === undefined) {
      throw new LedgerValidationError(partyType === "customer" ? "Customer was not found." : "Supplier was not found.");
    }

    const rows: Omit<LedgerEntryDto, "balanceCents">[] = [];

    if (partyType === "customer") {
      for (const sale of db.select().from(sales).where(eq(sales.customerId, partyId)).all()) {
        rows.push({
          date: sale.saleDate,
          kind: "sale",
          reference: sale.invoiceNumber,
          description: "Sale invoice",
          debitCents: sale.totalAmountCents,
          creditCents: 0,
        });
      }

      for (const row of db
        .select({ id: saleReturns.id, returnDate: saleReturns.returnDate, totalAmountCents: saleReturns.totalAmountCents, invoiceNumber: sales.invoiceNumber })
        .from(saleReturns)
        .innerJoin(sales, eq(saleReturns.saleId, sales.id))
        .where(eq(sales.customerId, partyId))
        .all()) {
        rows.push({
          date: row.returnDate,
          kind: "sale_return",
          reference: row.invoiceNumber,
          description: "Sale return",
          debitCents: 0,
          creditCents: row.totalAmountCents,
        });
      }
    } else {
      for (const purchase of db.select().from(purchases).where(eq(purchases.supplierId, partyId)).all()) {
        rows.push({
          date: purchase.purchaseDate,
          kind: "purchase",
          reference: `PUR-${String(purchase.id).padStart(6, "0")}`,
          description: "Purchase bill",
          debitCents: purchase.totalAmountCents,
          creditCents: 0,
        });
      }

      for (const row of db
        .select({ id: purchaseReturns.id, returnDate: purchaseReturns.returnDate, totalAmountCents: purchaseReturns.totalAmountCents, purchaseId: purchaseReturns.purchaseId })
        .from(purchaseReturns)
        .innerJoin(purchases, eq(purchaseReturns.purchaseId, purchases.id))
        .where(eq(purchases.supplierId, partyId))
        .all()) {
        rows.push({
          date: row.returnDate,
          kind: "purchase_return",
          reference: `PUR-${String(row.purchaseId).padStart(6, "0")}`,
          description: "Purchase return",
          debitCents: 0,
          creditCents: row.totalAmountCents,
        });
      }
    }

    for (const payment of db
      .select()
      .from(payments)
      .where(and(eq(payments.partyType, partyType), eq(payments.partyId, partyId)))
      .all()) {
      rows.push({
        date: payment.paymentDate,
        kind: "payment",
        reference: payment.method ?? "Payment",
        description: payment.notes ?? (partyType === "customer" ? "Payment received" : "Payment made"),
        debitCents: 0,
        creditCents: payment.amountCents,
      });
    }

    return { ...summary, entries: buildEntries(rows) };
  } finally {
    sqlite.close();
  }
}

export function recordPayment(databasePath: string | undefined, input: PaymentInput): PaymentDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizePaymentInput(input);

    if (normalizedInput.partyType === "customer") {
      const customer = db.select({ id: customers.id }).from(customers).where(eq(customers.id, normalizedInput.partyId)).get();

      if (customer === undefined) {
        throw new LedgerValidationError("Customer was not found.");
      }
    } else {
      const supplier = db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, normalizedInput.partyId)).get();

      if (supplier === undefined) {
        throw new LedgerValidationError("Supplier was not found.");
      }
    }

    const inserted = db.insert(payments).values(normalizedInput).returning({ id: payments.id }).get();
    const row = db.select().from(payments).where(eq(payments.id, inserted.id)).get();

    if (row === undefined) {
      throw new LedgerValidationError("Payment was not found after saving.");
    }

    return {
      id: row.id,
      partyType: row.partyType,
      partyId: row.partyId,
      direction: row.direction,
      amountCents: row.amountCents,
      paymentDate: row.paymentDate,
      method: row.method,
      notes: row.notes,
      saleId: row.saleId,
      purchaseId: row.purchaseId,
    };
  } finally {
    sqlite.close();
  }
}

export function deletePayment(databasePath: string | undefined, id: number): void {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const row = db.select().from(payments).where(eq(payments.id, id)).get();

    if (row === undefined) {
      throw new LedgerValidationError("Payment was not found.");
    }

    // Payments attached to an invoice were entered as part of that sale or
    // purchase, so they are corrected by editing the invoice, not deleted here.
    if (row.saleId !== null || row.purchaseId !== null) {
      throw new LedgerValidationError("This payment was recorded with an invoice. Edit the invoice to change it.");
    }

    db.delete(payments).where(eq(payments.id, id)).run();
  } finally {
    sqlite.close();
  }
}
