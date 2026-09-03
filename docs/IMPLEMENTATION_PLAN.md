# Implementation Plan

## Milestone 1: Project Scaffold

Create:

- Electron app
- React + TypeScript frontend
- Tailwind CSS
- shadcn/ui setup
- SQLite database connection
- Drizzle ORM setup
- Basic app shell with sidebar navigation

Verification:

- App starts locally.
- Main window opens.
- Renderer displays dashboard shell.
- Database file is created successfully.

## Milestone 2: Database Schema

Create tables:

- products
- categories
- suppliers
- customers
- purchases
- purchase_items
- sales
- sale_items
- stock_movements
- settings

Verification:

- Migrations run successfully.
- Tables exist.
- Seed data can be inserted and queried.

## Milestone 3: Products Module

Implement:

- Product list
- Add product dialog/page
- Edit product dialog/page
- Search and filters
- Low-stock indicator
- Active/inactive status

Verification:

- Products persist in SQLite.
- Invalid data is rejected.
- Search and filter work.

## Milestone 4: Purchases Module

Implement:

- Purchase creation
- Supplier selection/creation
- Purchase item entry
- Purchase history
- Automatic stock increase
- Stock movement creation

Verification:

- Purchase increases product stock.
- Stock movement is recorded.
- Transaction rolls back on failure.

## Milestone 5: Sales Module

Implement:

- Sale creation
- Customer selection/creation, optional
- Sale item entry
- Discount support
- Automatic stock decrease
- Oversell prevention
- Profit calculation

Verification:

- Sale decreases stock.
- Overselling is blocked.
- Stock movement is recorded.
- Profit is calculated correctly.

## Milestone 6: Dashboard

Implement:

- Product count
- Total inventory value
- Today sales
- Monthly sales
- Monthly profit
- Low-stock list
- Best-selling products

Verification:

- Dashboard values match database records.

## Milestone 7: Reports

Implement:

- Sales report
- Purchase report
- Profit report
- Stock report
- Date filters
- Excel export
- PDF export where useful

Verification:

- Reports match source records.
- Exports open correctly.

## Milestone 8: Invoices

Implement:

- Invoice number generation
- Receipt/invoice view
- Print or save as PDF
- Business settings on invoice

Verification:

- Invoice totals match sale totals.
- PDF is readable and formatted cleanly.

## Milestone 9: Backup And Restore

Implement:

- Manual backup
- Restore from backup
- Backup location setting
- Optional backup on app close

Verification:

- Backup file is created.
- Restore brings back previous data.
- Existing backups are not overwritten silently.

## Milestone 10: Packaging

Implement:

- Windows installer build
- App icon placeholder or configured asset path
- Production database path

Verification:

- Packaged app opens on Windows.
- Data persists after app restart.

