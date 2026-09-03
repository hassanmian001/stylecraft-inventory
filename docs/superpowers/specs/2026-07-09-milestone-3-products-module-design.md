# Milestone 3 Products Module Design

## Scope

Build the `prd.json` Milestone 3 Products module:

- Product list table.
- Add/edit product form.
- Product persistence in SQLite.
- Search and filters.
- Low-stock indicator.
- Product validation.

This milestone does not implement purchases, sales, stock movement creation from business actions, reports, invoices, backup/restore, or packaging.

## Chosen Approach

Use an Electron IPC-backed Products module.

React will render the Products screen and call a narrow API exposed by `electron/preload.ts`. SQLite access will stay in the Electron main/Node side through a tested product service. This preserves the Milestone 2 boundary that renderer code must not import database modules directly.

## Architecture

The module will use these areas:

- `db/products-service.ts`: validation, create, update, list, search, and filter logic.
- `db/products-service.test.ts`: product service tests using temporary SQLite databases.
- `electron/preload.ts`: exposes `window.stylecraft.products` to the renderer.
- `electron/main.ts`: registers product IPC handlers and configures the preload script.
- `src/types/stylecraft-api.ts`: renderer-safe API and product DTO types.
- `src/components/products/ProductsScreen.tsx`: product list, form, search, filters, and low-stock UI.
- `src/App.tsx`: renders `ProductsScreen` when Products is selected.

The renderer will not import `db/*` modules.

## Data Model

The existing `products` table will be used. Product DTOs will include:

- `id`
- `name`
- `sku`
- `categoryName`
- `purchasePriceCents`
- `sellingPriceCents`
- `currentStock`
- `lowStockThreshold`
- `isActive`
- `createdAt`
- `updatedAt`
- `isLowStock`

Category support in this milestone will be simple: the form accepts a category name. The service creates the category if it does not already exist and links the product to it. Empty category is allowed and stored as no category.

Money is stored as integer cents in SQLite. The UI may accept decimal currency input, but the service boundary will receive integer cents to keep persistence exact.

## Product Rules

Create and edit validation:

- Product name is required after trimming.
- SKU is required after trimming.
- SKU must be stored as trimmed uppercase text and unique on that normalized value.
- Purchase price and selling price must be zero or positive integer cents.
- Current stock must be a zero or positive integer.
- Low-stock threshold must be a zero or positive integer.
- Product status is active or inactive.

Editing an existing product updates `updated_at`. Marking inactive is an edit that sets `isActive` to false; records are not hard deleted.

## UI Behavior

The Products tab will replace placeholder cards with a working screen:

- Header with product count and an add-product action.
- Search input for product name or SKU.
- Category filter populated from current products.
- Low-stock filter.
- Active/inactive filter.
- Product table showing key fields.
- Low-stock visual state when `currentStock <= lowStockThreshold`.
- Add/edit form panel with validation errors.
- Edit action loads the selected product into the form.
- Mark inactive action updates the product status.

The design should stay simple and work-focused. No routing dependency is required for this milestone.

## Data Flow

1. Products screen loads and calls `window.stylecraft.products.list()`.
2. The preload bridge invokes Electron IPC.
3. Main process IPC handlers call `db/products-service.ts`.
4. Product service uses Drizzle and SQLite to read/write products.
5. The renderer refreshes the product list after create, update, or mark inactive.

## Error Handling

Service functions return clear validation errors for invalid product data and duplicate SKU attempts. IPC handlers convert thrown errors into renderer-safe messages. The UI displays validation messages near the form and does not silently discard failed saves.

Database connection or migration failures should remain visible in terminal output during development.

## Testing And Verification

Verification commands:

- `npm run db:migrate`
- `npm run db:verify`
- `npm test`
- `npm run build`

Required tests:

- Product validation rejects missing name and SKU.
- Product validation rejects negative prices, stock, and low-stock threshold.
- Creating a product persists it in SQLite.
- Editing a product updates it in SQLite.
- Duplicate SKU is rejected.
- Search by name and SKU works.
- Category, low-stock, and active filters work.
- Products persist when a new database connection is opened against the same SQLite file.

Manual or bounded startup verification should confirm the app starts and the Products screen renders without errors.

## Out Of Scope

- Purchase-created stock increases.
- Sale-created stock decreases.
- Stock movement records from purchases or sales.
- Profit calculations.
- Report/export screens.
- Product image upload.
- Barcode scanner support.
- Multi-user permissions.
