# Milestone 6 Dashboard Design

## Scope

Build the `prd.json` Milestone 6 Dashboard:

- Product count.
- Total inventory value.
- Today sales.
- Current month sales.
- Current month profit.
- Low-stock products.
- Best-selling products.

This milestone does not implement export reports, invoices, backup/restore, or packaging.

## Chosen Approach

Use a read-only dashboard service in the Electron main/Node side.

The renderer will call `window.stylecraft.dashboard.getSummary()` through preload. The service will read from the existing products, sales, and sale_items tables and return a single DTO with all dashboard metrics. This keeps aggregate calculations tested and prevents renderer imports from `db/*`.

## Data Model

No schema migration is expected.

Metrics:

- `productCount`: count of active products.
- `totalStockQuantity`: sum of active product `current_stock`.
- `inventoryValueCents`: sum of active product `current_stock * purchase_price_cents`.
- `todaySalesCents`: sum of sale `total_amount_cents` for sales in the current local day.
- `currentMonthSalesCents`: sum of sale `total_amount_cents` for sales in the current local month.
- `currentMonthProfitCents`: sum of sale `profit_amount_cents` for sales in the current local month.
- `lowStockProducts`: active products where `current_stock <= low_stock_threshold`, ordered by stock pressure.
- `bestSellingProducts`: products ranked by sold quantity and revenue from `sale_items`.

The service accepts an optional `now` date for deterministic tests. The IPC path uses the current runtime date.

## UI Behavior

The Dashboard tab will replace the placeholder cards with a working screen:

- Header with a short operational description.
- Summary cards for product count, stock quantity, inventory value, today sales, month sales, and month profit.
- Low-stock product list with current stock and threshold.
- Best-selling product list with sold quantity and sales value.
- Loading and error states following the existing Products/Purchases/Sales style.

## Testing And Verification

Required service tests:

- Counts active products only.
- Computes total stock quantity and inventory value from active products.
- Computes today sales from sales within the current local day.
- Computes current month sales and profit from sales within the current local month.
- Returns low-stock active products only.
- Ranks best-selling products by sold quantity and revenue.

Required renderer tests:

- Dashboard renders summary cards from the API.
- Dashboard renders low-stock and best-selling lists.
- Dashboard shows an error when loading fails.

Verification commands:

- `npm run db:migrate`
- `npm run db:verify`
- `npm test`
- `npm run build`

## Out Of Scope

- Date filter controls.
- Exportable reports.
- Charts.
- Inventory adjustments.
- Multi-warehouse stock.
