# Milestone 3 Products Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Products module with add/edit/search/filter UI, SQLite persistence, validation, and low-stock indicators.

**Architecture:** Keep all SQLite and Drizzle access in Node/Electron-side code. React calls a narrow API exposed through Electron preload and IPC handlers. Product validation and persistence live in a tested `db/products-service.ts` service.

**Tech Stack:** Electron IPC, React, TypeScript, SQLite, Drizzle ORM, better-sqlite3, Vitest.

## Global Constraints

- Build strict Milestone 3 only from `prd.json`.
- Do not implement purchases, sales, stock movement records from business actions, reports, invoices, backup/restore, or packaging.
- The renderer must not import `db/*` modules directly.
- SKU must be stored as trimmed uppercase text and unique on that normalized value.
- Money must stay as integer cents at the service/database boundary.
- Product records are preserved with inactive status; do not hard delete products.
- Verification must prove add, edit, persistence after reopening the SQLite file, invalid-data rejection, search/filter, and low-stock detection.
- The workspace is currently not a git repository; commit steps should be skipped unless git is initialized before execution.

---

## File Structure

- Create `db/products-service.ts`: product validation, normalization, create/update/list/filter service.
- Create `db/products-service.test.ts`: service behavior tests using temporary SQLite databases.
- Modify `package.json`: include `db/products-service.test.ts` in `test:db`.
- Create `electron/products-ipc.ts`: product IPC channel constants and handler registration.
- Modify `electron/main.ts`: configure preload and register product handlers.
- Create `electron/preload.ts`: expose `window.stylecraft.products` bridge.
- Modify `tsconfig.node.json`: compile both `electron` and `db` Node-side files into `dist-electron` with root output folders.
- Modify `package.json`: update `main` to `dist-electron/electron/main.js` after the Node-side compile root changes.
- Modify `tests/electron/renderer-target.test.mjs`: import `dist-electron/electron/renderer-target.js` after the Node-side compile root changes.
- Create `src/types/stylecraft-api.ts`: renderer-safe product/API types.
- Create `src/components/products/ProductsScreen.tsx`: Products UI.
- Modify `src/App.tsx`: render `ProductsScreen` for Products section.
- Create `src/vite-env.d.ts`: include `window.stylecraft` global typing for renderer code.
- Modify `README.md`: note Products module status and development flow.

---

### Task 1: Product Service And Tests

**Files:**
- Create: `db/products-service.ts`
- Create: `db/products-service.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createDb(databasePath?: string)` from `db/client.ts`, tables from `db/schema.ts`, and `runMigrations(databasePath?: string)` from `db/migrate.ts`.
- Produces:
  - `type ProductInput`
  - `type ProductListFilters`
  - `type ProductDto`
  - `class ProductValidationError extends Error`
  - `createProduct(databasePath: string | undefined, input: ProductInput): ProductDto`
  - `updateProduct(databasePath: string | undefined, id: number, input: ProductInput): ProductDto`
  - `listProducts(databasePath?: string, filters?: ProductListFilters): ProductDto[]`
  - `markProductInactive(databasePath: string | undefined, id: number): ProductDto`

- [ ] **Step 1: Add service tests before implementation**

Create `db/products-service.test.ts` with tests for:

```ts
expect(() => createProduct(dbPath, { name: "", sku: "A1", purchasePriceCents: 0, sellingPriceCents: 0, currentStock: 0, lowStockThreshold: 0, isActive: true })).toThrow(ProductValidationError);
expect(() => createProduct(dbPath, { name: "Shirt", sku: "", purchasePriceCents: 0, sellingPriceCents: 0, currentStock: 0, lowStockThreshold: 0, isActive: true })).toThrow(ProductValidationError);
expect(() => createProduct(dbPath, { name: "Shirt", sku: "a1", purchasePriceCents: -1, sellingPriceCents: 0, currentStock: 0, lowStockThreshold: 0, isActive: true })).toThrow(ProductValidationError);
```

Also add tests that create a product, edit it, reject duplicate SKU after uppercase normalization, search by name/SKU, filter by category, low stock and active status, and reopen the same temp database file to confirm persistence.

- [ ] **Step 2: Include product service test in `test:db`**

Update `package.json` script:

```json
"test:db": "vitest run db/schema.test.ts db/client.test.ts db/verify.test.ts db/products-service.test.ts"
```

- [ ] **Step 3: Verify red**

Run:

```powershell
npm run test:db
```

Expected: FAIL because `db/products-service.ts` does not exist yet.

- [ ] **Step 4: Implement product service**

Implement `db/products-service.ts` with these rules:

```ts
function normalizeSku(sku: string) {
  return sku.trim().toUpperCase();
}

function isLowStock(currentStock: number, lowStockThreshold: number) {
  return currentStock <= lowStockThreshold;
}
```

Use Drizzle queries against `products` and `categories`. Create a category row by exact trimmed category name when provided and missing. Store empty category as `null`. Convert rows to `ProductDto` with `categoryName` and `isLowStock`.

- [ ] **Step 5: Verify green**

Run:

```powershell
npm run test:db
```

Expected: PASS, including product service tests.

- [ ] **Step 6: Commit or skip**

Run:

```powershell
git rev-parse --is-inside-work-tree
```

Expected in this workspace: FAIL with `fatal: not a git repository`. Skip commit. If git exists, commit with `feat: add product persistence service`.

---

### Task 2: Electron IPC And Preload Bridge

**Files:**
- Create: `electron/products-ipc.ts`
- Create: `electron/preload.ts`
- Modify: `electron/main.ts`
- Modify: `tsconfig.node.json`
- Create: `src/types/stylecraft-api.ts`
- Create: `tests/electron/products-ipc.test.mjs`
- Modify: `tests/electron/renderer-target.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: product service functions from Task 1.
- Produces: `window.stylecraft.products.list(filters)`, `.create(input)`, `.update(id, input)`, `.markInactive(id)`.

- [ ] **Step 1: Add IPC/preload tests**

Create `tests/electron/products-ipc.test.mjs` that imports compiled `dist-electron/electron/products-ipc.js` and asserts exported channel names are stable:

```js
assert.equal(productChannels.list, "products:list");
assert.equal(productChannels.create, "products:create");
assert.equal(productChannels.update, "products:update");
assert.equal(productChannels.markInactive, "products:markInactive");
```

Keep `test:electron` as `npm run build:electron && node --test tests/electron/*.test.mjs`; the new file name must match `tests/electron/*.test.mjs`.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm run test:electron
```

Expected: FAIL because `dist-electron/electron/products-ipc.js` does not exist yet.

- [ ] **Step 3: Implement IPC channels and handlers**

Create `electron/products-ipc.ts` exporting `productChannels` and `registerProductHandlers()`. Handlers call service functions with the default DB path.

- [ ] **Step 4: Add preload bridge**

Create `electron/preload.ts` using `contextBridge.exposeInMainWorld("stylecraft", { products: ... })` and `ipcRenderer.invoke`.

- [ ] **Step 5: Wire Electron main**

Modify `electron/main.ts` to set:

```ts
preload: path.join(__dirname, "preload.js")
```

Call `registerProductHandlers()` once after `app.whenReady()` starts, before creating the window. Because `main.js` will compile to `dist-electron/electron/main.js`, update the production renderer file path to `path.join(__dirname, "../../dist/index.html")`.

- [ ] **Step 6: Update existing Electron test import path**

Modify `tests/electron/renderer-target.test.mjs` to import:

```js
import { getRendererTarget } from "../../dist-electron/electron/renderer-target.js";
```

- [ ] **Step 7: Add renderer API types**

Create `src/types/stylecraft-api.ts` and declare `window.stylecraft` types for product APIs.

- [ ] **Step 8: Verify green**

Run:

```powershell
npm run test:electron
npm run build
```

Expected: both PASS.

- [ ] **Step 9: Commit or skip**

Run git detection and skip commit if not a repo.

---

### Task 3: Products Screen UI

**Files:**
- Create: `src/components/products/ProductsScreen.tsx`
- Create: `src/components/products/ProductsScreen.test.tsx`
- Modify: `src/App.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `window.stylecraft.products` API from Task 2 and product DTO types from `src/types/stylecraft-api.ts`.
- Produces: Products tab UI with list, add/edit form, search, category/low-stock/status filters, low-stock indicator, and mark inactive action.

- [ ] **Step 1: Add renderer test**

Create `src/components/products/ProductsScreen.test.tsx` using Vitest and React Testing Library if already installed; otherwise add `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` as dev dependencies. Test that the screen renders product rows from a mocked `window.stylecraft.products.list`, shows low-stock text for low-stock products, and submits create input through `window.stylecraft.products.create`.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm run test:renderer
```

Expected: FAIL because `ProductsScreen` does not exist or is not wired.

- [ ] **Step 3: Implement Products screen**

Build a simple controlled form and table. Use cents internally by converting decimal string inputs to integer cents before calling the API. Display cents as currency strings in the table. Keep validation errors visible above or near form fields.

- [ ] **Step 4: Wire Products tab**

Modify `src/App.tsx` so Products renders `<ProductsScreen />`; other sections keep placeholder cards.

- [ ] **Step 5: Update renderer test script**

Ensure `test:renderer` runs both existing app-content test and Products screen test.

- [ ] **Step 6: Verify green**

Run:

```powershell
npm run test:renderer
npm run build
```

Expected: both PASS.

- [ ] **Step 7: Commit or skip**

Run git detection and skip commit if not a repo.

---

### Task 4: End-To-End Milestone Verification And Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: service, IPC, preload, and UI from Tasks 1-3.
- Produces: documented Products module status and verified Milestone 3 acceptance criteria.

- [ ] **Step 1: Update README**

Update Current State to say Milestone 3 Products module is implemented with SQLite persistence. Add a short Products section listing add/edit/search/filter/low-stock support.

- [ ] **Step 2: Run database checks**

Run:

```powershell
npm run db:migrate
npm run db:verify
```

Expected: both PASS.

- [ ] **Step 3: Run full tests**

Run:

```powershell
npm test
```

Expected: PASS for Electron, renderer, and DB tests.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 5: Bounded app startup check**

Run `npm run dev` in a bounded process, verify Vite and Electron launch, then clean up processes. Expected: Products screen can render without startup errors.

- [ ] **Step 6: Commit or skip**

Run git detection and skip commit if not a repo.

## Self-Review Notes

- Spec coverage: service, IPC bridge, renderer UI, validation, persistence, search/filter, low-stock indicator, tests, and final verification are covered.
- Scope check: purchases, sales, stock movements from business actions, reports, invoices, backup/restore, and packaging are excluded.
- Placeholder scan: no unspecified implementation placeholders remain.
- Type consistency: product DTO/input/filter names are shared across service, IPC, preload, and renderer tasks.
