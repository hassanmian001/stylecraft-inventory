# Milestone 4 Purchases Module Implementation Plan

## Context

Project: `D:\Antigravity\StyleCraft Invenetory Mannagement Software`

Git/worktree status: this workspace is not a git repository, so execute in place and do not attempt commits.

Approved design: `docs/superpowers/specs/2026-07-09-milestone-4-purchases-module-design.md`

Milestone source: `prd.json` Milestone 4, lines 73-87.

Important boundaries:

- Renderer code must not import `db/*`.
- Use Electron IPC/preload for DB-backed actions.
- Purchases must increase stock.
- Every purchase item must create a stock movement record.
- Purchase creation must use a database transaction.
- Money is integer cents.
- Keep stock calculations covered by tests.

## Existing Patterns To Follow

- Product service pattern: `db/products-service.ts`
- Product service tests: `db/products-service.test.ts`
- IPC pattern: `electron/products-ipc.ts`
- Preload bridge: `electron/preload.ts`
- Renderer API types: `src/types/stylecraft-api.ts`
- Products screen style: `src/components/products/ProductsScreen.tsx`
- Renderer tests: `src/components/products/ProductsScreen.test.tsx`

## Task 1: Add Purchase API Types

Files:

- Update `src/types/stylecraft-api.ts`

Steps:

1. Add supplier DTO/input types.
2. Add purchase item input and purchase create input types.
3. Add purchase history/detail DTO types.
4. Extend `StyleCraftApi` with `purchases`.

Expected type shape:

```ts
export type SupplierInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type SupplierDto = SupplierInput & {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseItemInput = {
  productId: number;
  quantity: number;
  unitCostCents: number;
};

export type PurchaseInput = {
  supplierId?: number | null;
  supplierName?: string | null;
  purchaseDate: Date | string;
  notes?: string | null;
  items: PurchaseItemInput[];
};
```

Keep final DTO names consistent between service and renderer.

## Task 2: Write Purchase Service Tests First

Files:

- Add `db/purchases-service.test.ts`

Use existing helpers/patterns from `db/products-service.test.ts`. Create products via `createProduct()` or direct service calls so tests exercise realistic stock rows.

Test cases:

1. `createPurchase` increases stock for a single item.
2. `createPurchase` inserts a stock movement with positive `quantityChange`, before stock, after stock, `movementType = "purchase"`, and `referenceType = "purchase"`.
3. Multi-item purchase updates two products and calculates total amount.
4. Failed purchase rolls back. Use one valid product id and one missing product id in the same purchase, then assert product stock and all purchase-related table counts are unchanged.
5. Invalid quantity is rejected.
6. Negative unit cost is rejected.
7. Duplicate product lines are rejected.
8. Inactive product is rejected.
9. Inline supplier creation works and `listSuppliers` returns it.
10. `listPurchases` returns supplier name, item count, and total.

Expected command before implementation:

- `npm run test:db`
- Expected: fails because `db/purchases-service.ts` does not exist yet.

## Task 3: Implement Purchase Service

Files:

- Add `db/purchases-service.ts`

Implementation notes:

- Import Drizzle helpers from `drizzle-orm` and schema tables from `./schema.js`.
- Export `PurchaseValidationError`.
- Run `runMigrations(databasePath)` at service entry points.
- Open DB with `createDb(databasePath)` and always `sqlite.close()` in `finally`.
- Use `db.transaction((tx) => { ... })` for purchase creation.

Service functions:

- `listSuppliers(databasePath?: string): SupplierDto[]`
- `createSupplier(databasePath: string | undefined, input: SupplierInput): SupplierDto`
- `createPurchase(databasePath: string | undefined, input: PurchaseInput): PurchaseDetailDto`
- `listPurchases(databasePath?: string): PurchaseHistoryDto[]`

Important validation:

- Trim supplier fields.
- Validate `purchaseDate` as a real date.
- Require at least one item.
- Product ids must be positive integers.
- Quantity must be positive integer.
- Unit cost cents must be non-negative integer.
- Reject duplicate product ids in a single purchase.
- Product must exist and be active.

Transaction behavior:

```ts
const createdPurchase = db.transaction((tx) => {
  const purchase = tx.insert(purchases).values(...).returning({ id: purchases.id }).get();

  for (const item of normalizedItems) {
    const product = tx.select().from(products).where(eq(products.id, item.productId)).get();
    const stockBefore = product.currentStock;
    const stockAfter = stockBefore + item.quantity;

    tx.insert(purchaseItems).values(...).run();
    tx.update(products).set({ currentStock: stockAfter, updatedAt: new Date() }).where(eq(products.id, item.productId)).run();
    tx.insert(stockMovements).values(...).run();
  }

  return purchase.id;
});
```

After implementation, run:

- `npm run test:db`
- Expected: DB tests pass including the new purchase tests.

## Task 4: Add Purchase IPC And Preload Bridge

Files:

- Add `electron/purchases-ipc.ts`
- Update `electron/preload.ts`
- Update `electron/main.ts`

IPC channels:

- `purchases:list`
- `purchases:create`
- `suppliers:list`
- `suppliers:create`

Pattern:

```ts
ipcMain.handle(purchaseChannels.create, async (_event, input: PurchaseInput) => {
  const [{ getDatabasePath }, { createPurchase }] = await Promise.all([
    import("../db/paths.js"),
    import("../db/purchases-service.js"),
  ]);

  return createPurchase(getDatabasePath(), input);
});
```

Preload shape:

```ts
purchases: {
  list: () => ipcRenderer.invoke(purchaseChannels.list),
  create: (input) => ipcRenderer.invoke(purchaseChannels.create, input),
  listSuppliers: () => ipcRenderer.invoke(purchaseChannels.listSuppliers),
  createSupplier: (input) => ipcRenderer.invoke(purchaseChannels.createSupplier, input),
}
```

Run:

- `npm run test:electron`
- Expected: Electron build and tests pass.

## Task 5: Build Purchases Screen Tests

Files:

- Add `src/components/purchases/PurchasesScreen.test.tsx`

Test setup:

- Mock `window.stylecraft.products.list` with two active products.
- Mock `window.stylecraft.purchases.listSuppliers` with one supplier.
- Mock `window.stylecraft.purchases.list` with one history row.
- Mock `window.stylecraft.purchases.create`.

Test cases:

1. Renders products, supplier, and purchase history.
2. Submits a valid purchase with two item rows and converts decimal unit costs to cents.
3. Displays validation error and does not call API when quantity is invalid.

Expected command before UI implementation:

- `npm run test:renderer`
- Expected: fails because `PurchasesScreen` does not exist yet.

## Task 6: Implement Purchases Screen

Files:

- Add `src/components/purchases/PurchasesScreen.tsx`
- Update `src/App.tsx`

UI requirements:

- Load products through `window.stylecraft.products.list({ isActive: true })`.
- Load suppliers through `window.stylecraft.purchases.listSuppliers()`.
- Load history through `window.stylecraft.purchases.list()`.
- Default purchase date to today's `YYYY-MM-DD`.
- Keep at least one item row.
- Add item row button.
- Remove item row button, disabled/hidden for the only row.
- Product select, quantity input, and unit cost input per row.
- Calculate and display line total and purchase total.
- Supplier selector plus inline new supplier name field.
- On submit, call `window.stylecraft.purchases.create(input)`.
- Reset form and reload products/suppliers/history after success.
- Display validation or save errors in an alert.

Use local helpers similar to `ProductsScreen.tsx`:

- `formatCurrency(cents: number)`
- `decimalStringToCents(value: string)`
- `buildPurchaseInput(...)`

Update `App.tsx`:

- Import `PurchasesScreen`.
- Render it when `activeSection.id === "purchases"`.
- Preserve existing placeholder behavior for all other tabs.

Run:

- `npm run test:renderer`
- Expected: renderer tests pass including Purchases screen.

## Task 7: Update Test Scripts

Files:

- Update `package.json`

Add new tests to scripts:

```json
"test:db": "vitest run db/schema.test.ts db/client.test.ts db/verify.test.ts db/products-service.test.ts db/purchases-service.test.ts",
"test:renderer": "vitest run src/app-content.test.ts src/components/products/ProductsScreen.test.tsx src/components/purchases/PurchasesScreen.test.tsx"
```

Run:

- `npm test`
- Expected: all Electron, renderer, and DB tests pass.

## Task 8: Update README Or Milestone Notes If Present

Files:

- Inspect `README.md`.
- Update only if the existing README has milestone status or feature notes.

Mention:

- Purchases can be created with suppliers and multiple items.
- Stock increases transactionally.
- Stock movement rows are recorded.

## Task 9: Final Verification

Run these commands from project root:

- `npm run db:migrate`
- `npm run db:verify`
- `npm test`
- `npm run build`

Expected results:

- Migration completes without errors.
- `db.verify=ok` appears.
- All tests pass.
- Renderer and Electron builds pass.

## Completion Report

Report:

- Files changed.
- Tests/verification commands run and outcomes.
- Any known limitations, especially that dedicated supplier management and purchase editing are out of scope.
