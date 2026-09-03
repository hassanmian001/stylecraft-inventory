# Milestone 4 Purchases Module Design

## Scope

Build the `prd.json` Milestone 4 Purchases module:

- Purchase form.
- Supplier support.
- Purchase history.
- Transactional stock increase.
- Stock movement creation.

This milestone does not implement sales, oversell prevention, profit calculations, invoices, reports, backup/restore, or packaging.

## Chosen Approach

Use a multi-item purchase flow with simple inline supplier support.

A purchase can contain one or more product lines under one supplier, purchase date, and notes field. The renderer will call a narrow `window.stylecraft.purchases` API exposed through Electron preload. All SQLite writes stay in the Electron main/Node side through a tested purchase service.

This keeps the UI practical for real supplier receipts while staying within Milestone 4 acceptance criteria.

## Architecture

The module will use these areas:

- `db/purchases-service.ts`: validation, supplier creation/listing, purchase creation, stock updates, movement records, and purchase history queries.
- `db/purchases-service.test.ts`: business logic tests against temporary SQLite databases.
- `electron/purchases-ipc.ts`: IPC channels and handlers for purchases and suppliers.
- `electron/preload.ts`: exposes `window.stylecraft.purchases` to the renderer.
- `electron/main.ts`: registers purchase IPC handlers.
- `src/types/stylecraft-api.ts`: renderer-safe supplier, purchase, and input DTO types.
- `src/components/purchases/PurchasesScreen.tsx`: purchase form and purchase history UI.
- `src/components/purchases/PurchasesScreen.test.tsx`: renderer tests for form submission and history rendering.
- `src/App.tsx`: renders `PurchasesScreen` when Purchases is selected.
- `package.json`: includes new DB and renderer test files in existing scripts.

Renderer code must not import `db/*` modules.

## Data Model

Use the existing Milestone 2 tables:

- `suppliers`
- `purchases`
- `purchase_items`
- `products`
- `stock_movements`

No schema migration is expected for this milestone.

Purchase input:

- `supplierId`: existing supplier id, optional when creating a new supplier by name.
- `supplierName`: optional inline supplier name. If provided without `supplierId`, create or reuse a supplier by exact trimmed name.
- `purchaseDate`: ISO/date input converted to `Date` at the service boundary.
- `notes`: optional.
- `items`: one or more lines containing `productId`, `quantity`, and `unitCostCents`.

Purchase history DTO:

- Purchase id, date, supplier name, total amount, notes, and item count.

Purchase detail DTO returned after creation:

- Purchase header fields.
- Item rows with product id, product name, SKU, quantity, unit cost, and total cost.
- Stock movement ids are not required in the renderer DTO, but tests must verify movement rows exist.

Money remains integer cents. Quantities remain whole numbers.

## Business Rules

Purchase creation validation:

- Purchase date is required and valid.
- At least one item is required.
- Each item must reference an existing active product.
- Quantity must be a positive integer.
- Unit cost must be a non-negative integer number of cents.
- Duplicate product lines are rejected to avoid ambiguous stock updates.
- Supplier is optional only if no supplier name is provided; when a name is provided it must not be blank after trimming.

Transactional write behavior:

1. Insert or resolve supplier if needed.
2. Insert purchase header.
3. For each item, read the current product stock.
4. Insert purchase item with calculated total cost.
5. Increase product `current_stock` by item quantity and update `updated_at`.
6. Insert one `stock_movements` row with `movement_type = "purchase"`, `reference_type = "purchase"`, `reference_id = purchase.id`, positive `quantity_change`, `stock_before`, and `stock_after`.
7. Commit transaction.

If any step fails, the entire transaction rolls back.

## UI Behavior

The Purchases tab will replace the placeholder cards with a working screen:

- Header with purchase count in current history view.
- Supplier selector populated from existing suppliers.
- Inline supplier name field for quick creation.
- Purchase date field defaulting to today.
- Notes field.
- Item entry rows with product selector, quantity, and unit cost.
- Add/remove item row actions, while preventing removal of the final row.
- Calculated line totals and purchase total.
- Purchase history table showing date, supplier, total, item count, and notes.
- Clear validation and save errors.
- Refresh product, supplier, and history data after a purchase is created.

The UI should stay work-focused and mobile-safe using the existing card/table style.

## Data Flow

1. Purchases screen loads products, suppliers, and purchase history through `window.stylecraft`.
2. User selects or enters supplier details and adds one or more item rows.
3. UI validates obvious form errors and sends integer cents to IPC.
4. Main process IPC handler calls `db/purchases-service.ts`.
5. Purchase service runs the transactional write and returns the created purchase.
6. Renderer resets the form and reloads products/history so updated stock is visible in later product selectors and Products screen.

## Error Handling

Service errors should be clear enough to show directly in the UI, matching the Products module style.

Expected validation errors include missing purchase date, missing items, invalid quantity, invalid unit cost, duplicate product lines, inactive/missing product, and invalid supplier name.

Database failures should remain visible during development. The service must close SQLite connections in `finally` blocks.

## Testing And Verification

Required service tests:

- Creating a purchase increases product stock.
- Creating a purchase inserts purchase header and purchase item rows.
- Creating a purchase writes one stock movement per item with correct before/after values.
- Multi-item purchases update each product correctly.
- Purchase total equals sum of line totals.
- Failed purchase rolls back product stock, purchase rows, purchase items, and stock movements.
- Invalid quantity, invalid unit cost, duplicate product lines, missing product, and inactive product are rejected.
- Inline supplier creation works and supplier listing returns it.
- Purchase history returns supplier name, item count, date, and totals.

Required renderer tests:

- Purchases screen renders products, suppliers, and history from the API.
- Submitting a valid multi-item purchase sends cents and quantities to `window.stylecraft.purchases.create`.
- Basic validation blocks missing/invalid item input.

Verification commands:

- `npm run db:migrate`
- `npm run db:verify`
- `npm test`
- `npm run build`

## Out Of Scope

- Dedicated supplier edit/delete management.
- Purchase editing or deletion.
- Returning purchased stock.
- Sales stock decrease and profit calculations.
- Report export for purchase history.
- Invoice or receipt generation.
