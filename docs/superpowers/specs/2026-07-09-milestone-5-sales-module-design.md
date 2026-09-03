# Milestone 5 Sales Module Design

## Scope

Build the `prd.json` Milestone 5 Sales module:

- Sale form.
- Optional customer support.
- Transactional stock decrease.
- Oversell prevention.
- Profit calculation.
- Stock movement creation.

This milestone does not implement invoices, PDF export, reports, dashboard summaries, backup/restore, or packaging.

## Chosen Approach

Use a multi-item sale flow with simple inline customer support.

A sale can contain one or more product lines under one optional customer, sale date, payment method, and notes field. The renderer will call a narrow `window.stylecraft.sales` API exposed through Electron preload. All SQLite writes stay in the Electron main/Node side through a tested sales service.

## Architecture

- `db/sales-service.ts`: validation, customer creation/listing, sale creation, stock updates, oversell prevention, profit calculation, movement records, and sale history queries.
- `db/sales-service.test.ts`: business logic tests against temporary SQLite databases.
- `electron/sales-ipc.ts`: IPC channels and handlers for sales and customers.
- `electron/preload.ts`: exposes `window.stylecraft.sales`.
- `electron/main.ts`: registers sales IPC handlers.
- `src/types/stylecraft-api.ts`: renderer-safe customer, sale, and input DTO types.
- `src/components/sales/SalesScreen.tsx`: sale form and sale history UI.
- `src/components/sales/SalesScreen.test.tsx`: renderer tests.
- `src/App.tsx`: renders `SalesScreen` when Sales is selected.
- `package.json`: includes new DB and renderer tests.

Renderer code must not import `db/*` modules.

## Data Model

Use existing tables:

- `customers`
- `sales`
- `sale_items`
- `products`
- `stock_movements`

No schema migration is expected.

Sale input:

- `customerId`: optional existing customer id.
- `customerName`: optional inline customer name. If provided without `customerId`, create or reuse a customer by exact trimmed name.
- `saleDate`: date input converted to `Date` at the service boundary.
- `paymentMethod`: optional text.
- `notes`: optional text.
- `items`: one or more lines containing `productId`, `quantity`, `unitPriceCents`, and optional `discountAmountCents`.

Invoice number:

- Generate a simple unique invoice number inside the service using the sale id, for example `INV-000001`.
- Invoices are not rendered in this milestone.

## Business Rules

Sale validation:

- Sale date is required and valid.
- At least one item is required.
- Each item must reference an existing active product.
- Quantity must be a positive integer.
- Unit price must be a non-negative integer number of cents.
- Discount must be a non-negative integer number of cents and cannot exceed line subtotal.
- Duplicate product lines are rejected to avoid ambiguous stock updates.
- Customer is optional, but a provided customer name must not be blank after trimming.
- A sale cannot reduce product stock below zero.

Calculations:

- Line subtotal = `quantity * unitPriceCents`.
- Line total = line subtotal minus line discount.
- Line profit = line total minus `quantity * product.purchasePriceCents`.
- Sale subtotal = sum line subtotals.
- Sale discount = sum line discounts.
- Sale total = sum line totals.
- Sale profit = sum line profits.

Transactional write behavior:

1. Resolve or insert optional customer.
2. Insert sale header with a temporary invoice number.
3. Update invoice number from inserted sale id.
4. For each item, read current product stock and cost.
5. Reject overselling before changing stock.
6. Insert sale item with price, cost, discount, total, and profit.
7. Decrease product `current_stock` and update `updated_at`.
8. Insert one `stock_movements` row with `movement_type = "sale"`, `reference_type = "sale"`, `reference_id = sale.id`, negative `quantity_change`, `stock_before`, and `stock_after`.
9. Commit transaction.

If any step fails, the transaction rolls back.

## UI Behavior

The Sales tab will replace placeholder cards with a working screen:

- Header with sale count in current history view.
- Customer selector populated from existing customers.
- Inline customer name field for quick creation.
- Sale date defaulting to today.
- Payment method and notes fields.
- Item entry rows with product selector, quantity, unit price, and discount.
- Add/remove item row actions, while preventing removal of the final row.
- Calculated line totals and sale total.
- Sale history table showing invoice number, date, customer, total, profit, item count, payment method, and notes.
- Clear validation and save errors, especially oversell errors.
- Refresh product, customer, and history data after a sale is created.

## Testing And Verification

Required service tests:

- Creating a sale decreases product stock.
- Creating a sale inserts sale header and sale item rows.
- Creating a sale writes one stock movement per item with correct before/after values and negative quantity.
- Multi-item sales update each product correctly.
- Overselling is rejected and rolls back all changes.
- Sale profit is calculated from sale total minus stored product purchase cost.
- Discount affects total and profit correctly.
- Invalid quantity, invalid price, invalid discount, duplicate product lines, missing product, and inactive product are rejected.
- Inline customer creation works and customer listing returns it.
- Sale history returns invoice number, customer name, item count, totals, and profit.

Required renderer tests:

- Sales screen renders products, customers, and history from the API.
- Submitting a valid multi-item sale sends cents, discounts, quantities, and optional customer data to `window.stylecraft.sales.create`.
- Basic validation blocks invalid quantity before calling the API.

Verification commands:

- `npm run db:migrate`
- `npm run db:verify`
- `npm test`
- `npm run build`

## Out Of Scope

- Dedicated customer edit/delete management.
- Sale editing or deletion.
- Returns.
- Invoice rendering or PDF generation.
- Sales reports and dashboard cards.
