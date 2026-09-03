import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "./migrate";
import {
  ContactValidationError,
  createCustomer,
  createSupplier,
  listCustomers,
  listSuppliers,
  updateCustomer,
  updateSupplier,
  type ContactInput,
} from "./contacts-service";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stylecraft-contacts-"));
  tempDirs.push(dir);
  const databasePath = path.join(dir, "test.sqlite");
  runMigrations(databasePath);
  return databasePath;
}

function makeContactInput(overrides: Partial<ContactInput> = {}): ContactInput {
  return {
    name: "Ali Khan",
    phone: "0300-0000000",
    email: "ali@example.com",
    address: "Lahore",
    notes: "Repeat buyer",
    ...overrides,
  };
}

describe("contacts service", () => {
  it("creates, lists, and searches customers", () => {
    const databasePath = makeTempDatabasePath();
    const ali = createCustomer(databasePath, makeContactInput({ name: "  Ali Khan  ", phone: "  0300  " }));
    createCustomer(databasePath, makeContactInput({ name: "Sara Ahmed", email: "sara@example.com", notes: "Wholesale" }));

    expect(ali).toMatchObject({ name: "Ali Khan", phone: "0300" });
    expect(listCustomers(databasePath).map((customer) => customer.name)).toEqual(["Ali Khan", "Sara Ahmed"]);
    expect(listCustomers(databasePath, { search: "wholesale" }).map((customer) => customer.name)).toEqual(["Sara Ahmed"]);
  });

  it("creates, lists, searches, and updates suppliers", () => {
    const databasePath = makeTempDatabasePath();
    const supplier = createSupplier(databasePath, makeContactInput({ name: "Fabric House", address: "Karachi" }));
    createSupplier(databasePath, makeContactInput({ name: "Thread Mart", phone: "021-111" }));

    const updated = updateSupplier(databasePath, supplier.id, makeContactInput({ name: "Fabric House PK", address: "Karachi Saddar" }));

    expect(updated).toMatchObject({ id: supplier.id, name: "Fabric House PK", address: "Karachi Saddar" });
    expect(listSuppliers(databasePath, { search: "021" }).map((listedSupplier) => listedSupplier.name)).toEqual(["Thread Mart"]);
  });

  it("updates customers and rejects invalid inputs", () => {
    const databasePath = makeTempDatabasePath();
    const customer = createCustomer(databasePath, makeContactInput({ name: "Walk-in Customer" }));

    const updated = updateCustomer(databasePath, customer.id, makeContactInput({ name: "Walk-in Customer", phone: "" }));

    expect(updated.phone).toBeNull();
    expect(() => createCustomer(databasePath, makeContactInput({ name: "   " }))).toThrow(ContactValidationError);
    expect(() => updateCustomer(databasePath, 999, makeContactInput())).toThrow(ContactValidationError);
    expect(() => updateSupplier(databasePath, 0, makeContactInput())).toThrow(ContactValidationError);
  });
});
