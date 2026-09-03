import { describe, expect, it } from "vitest";

import { schemaTableNames } from "./schema";

describe("database schema", () => {
  it("defines the required milestone 2 tables", () => {
    expect([...schemaTableNames].sort()).toEqual([
      "audit_logs",
      "categories",
      "customers",
      "products",
      "purchase_items",
      "purchase_return_items",
      "purchase_returns",
      "purchases",
      "sale_items",
      "sale_return_items",
      "sale_returns",
      "sales",
      "settings",
      "stock_movements",
      "suppliers",
    ]);
  });
});
