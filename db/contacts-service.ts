import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { customers, suppliers } from "./schema.js";

export type ContactInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type ContactListFilters = {
  search?: string;
};

export type ContactDto = ContactInput & {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export class ContactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactValidationError";
  }
}

function nullableTrimmed(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeContactInput(input: ContactInput) {
  const name = input.name.trim();

  if (!name) {
    throw new ContactValidationError("Contact name is required.");
  }

  return {
    name,
    phone: nullableTrimmed(input.phone),
    email: nullableTrimmed(input.email),
    address: nullableTrimmed(input.address),
    notes: nullableTrimmed(input.notes),
  };
}

function validateId(id: number, label: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ContactValidationError(`${label} must be a positive whole number.`);
  }
}

function matchesSearch(contact: ContactDto, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [contact.name, contact.phone, contact.email, contact.address, contact.notes].some((value) =>
    (value ?? "").toLowerCase().includes(normalizedSearch),
  );
}

function toSupplierDto(row: typeof suppliers.$inferSelect): ContactDto {
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

function toCustomerDto(row: typeof customers.$inferSelect): ContactDto {
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

export function listSuppliers(databasePath?: string, filters: ContactListFilters = {}): ContactDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db
      .select()
      .from(suppliers)
      .orderBy(suppliers.name)
      .all()
      .map(toSupplierDto)
      .filter((supplier) => matchesSearch(supplier, filters.search ?? ""));
  } finally {
    sqlite.close();
  }
}

export function createSupplier(databasePath: string | undefined, input: ContactInput): ContactDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeContactInput(input);
    const insertedSupplier = db.insert(suppliers).values(normalizedInput).returning({ id: suppliers.id }).get();
    const supplier = db.select().from(suppliers).where(eq(suppliers.id, insertedSupplier.id)).get();

    if (supplier === undefined) {
      throw new ContactValidationError("Supplier was not found after creation.");
    }

    return toSupplierDto(supplier);
  } finally {
    sqlite.close();
  }
}

export function updateSupplier(databasePath: string | undefined, id: number, input: ContactInput): ContactDto {
  validateId(id, "Supplier");
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeContactInput(input);
    const result = db.update(suppliers).set({ ...normalizedInput, updatedAt: new Date() }).where(eq(suppliers.id, id)).run();

    if (result.changes === 0) {
      throw new ContactValidationError("Supplier was not found.");
    }

    const supplier = db.select().from(suppliers).where(eq(suppliers.id, id)).get();

    if (supplier === undefined) {
      throw new ContactValidationError("Supplier was not found after update.");
    }

    return toSupplierDto(supplier);
  } finally {
    sqlite.close();
  }
}

export function listCustomers(databasePath?: string, filters: ContactListFilters = {}): ContactDto[] {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    return db
      .select()
      .from(customers)
      .orderBy(customers.name)
      .all()
      .map(toCustomerDto)
      .filter((customer) => matchesSearch(customer, filters.search ?? ""));
  } finally {
    sqlite.close();
  }
}

export function createCustomer(databasePath: string | undefined, input: ContactInput): ContactDto {
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeContactInput(input);
    const insertedCustomer = db.insert(customers).values(normalizedInput).returning({ id: customers.id }).get();
    const customer = db.select().from(customers).where(eq(customers.id, insertedCustomer.id)).get();

    if (customer === undefined) {
      throw new ContactValidationError("Customer was not found after creation.");
    }

    return toCustomerDto(customer);
  } finally {
    sqlite.close();
  }
}

export function updateCustomer(databasePath: string | undefined, id: number, input: ContactInput): ContactDto {
  validateId(id, "Customer");
  runMigrations(databasePath);
  const { sqlite, db } = createDb(databasePath);

  try {
    const normalizedInput = normalizeContactInput(input);
    const result = db.update(customers).set({ ...normalizedInput, updatedAt: new Date() }).where(eq(customers.id, id)).run();

    if (result.changes === 0) {
      throw new ContactValidationError("Customer was not found.");
    }

    const customer = db.select().from(customers).where(eq(customers.id, id)).get();

    if (customer === undefined) {
      throw new ContactValidationError("Customer was not found after update.");
    }

    return toCustomerDto(customer);
  } finally {
    sqlite.close();
  }
}
