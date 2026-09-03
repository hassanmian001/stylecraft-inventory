# OpenCode Task List

## Task 1: Scaffold The App

- Create Electron + React + TypeScript project.
- Configure Vite if using it for the renderer.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Add sidebar navigation and placeholder routes.

Done when:

- `npm install` succeeds.
- `npm run dev` starts the desktop app.
- The app window shows the main layout.

## Task 2: Add Database Layer

- Add SQLite dependency.
- Add Drizzle ORM.
- Create schema files.
- Add migration scripts.
- Add a database connection module.

Done when:

- Migrations run.
- SQLite database file is created.
- A simple query works.

## Task 3: Build Products Module

- Product list table.
- Product form.
- Add/edit product.
- Product validation.
- Search/filter.
- Low-stock visual state.

Done when:

- Products can be created and edited.
- Products persist after app restart.

## Task 4: Build Purchases Module

- Purchase form.
- Purchase history table.
- Supplier support.
- Transactional stock increase.
- Stock movement record.

Done when:

- Creating a purchase increases stock correctly.

## Task 5: Build Sales Module

- Sale form.
- Customer optional.
- Transactional stock decrease.
- Oversell prevention.
- Profit calculation.
- Stock movement record.

Done when:

- Creating a sale decreases stock correctly.
- Selling more than available stock is blocked.

## Task 6: Build Dashboard

- Add summary cards.
- Add low-stock list.
- Add recent sales/purchases.
- Add best-selling products.

Done when:

- Dashboard numbers match database records.

## Task 7: Add Reports

- Sales report.
- Purchase report.
- Profit report.
- Stock report.
- Date filters.
- Excel export.
- PDF export.

Done when:

- Reports export correctly and match source records.

## Task 8: Add Invoices

- Invoice number generation.
- Invoice view.
- Print/save PDF.
- Business settings on invoice.

Done when:

- A sale can generate a readable invoice.

## Task 9: Add Backup And Restore

- Manual backup.
- Restore backup.
- Backup folder setting.
- Prevent accidental overwrite.

Done when:

- A backup can be created and restored successfully.

## Task 10: Package For Windows

- Configure electron-builder.
- Add app metadata.
- Build Windows installer.

Done when:

- Packaged app starts and persists data.

