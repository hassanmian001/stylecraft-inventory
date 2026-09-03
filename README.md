# StyleCraft Inventory Management Software

Desktop inventory management software for a small business with around 50 products.

## Current State

Milestone 10 Windows packaging is implemented with SQLite persistence, including the database layer, Electron IPC bridge, preload API, Products UI, Purchases UI, Sales UI, live Dashboard UI, Reports UI, invoice preview/printing, manual backup/restore, and Windows installer packaging.

## Dashboard

- Show active product count and total stock quantity.
- Show inventory value at stored purchase cost.
- Show today sales, current month sales, and current month profit.
- Show low-stock products.
- Show best-selling products by sold quantity and sales value.

## Products

- Add and edit products with validation.
- Search products by name or SKU.
- Filter products by category, low-stock status, and active status.
- Show current stock and low-stock indicators.

## Purchases

- Create supplier purchases with one or more product lines.
- Add suppliers inline while recording purchases.
- Increase stock transactionally when a purchase is saved.
- Record one stock movement per purchased product line.
- Keep purchase history with supplier, item count, total, date, and notes.

## Sales

- Create customer sales with one or more product lines.
- Add customers inline while recording sales.
- Decrease stock transactionally when a sale is saved.
- Block sales that exceed available stock.
- Calculate sale totals, discounts, and profit from stored product cost.
- Record one stock movement per sold product line.
- Keep sale history with invoice number, customer, item count, total, profit, payment method, date, and notes.

## Reports

- View sales, purchase, profit, and stock reports.
- Filter sales, purchase, and profit reports by date range.
- Export the active report as an Excel-compatible CSV file.
- Open a printable report view for print or save-as-PDF.

## Invoices

- Use persisted sale invoice numbers.
- View invoice details from sale history.
- Show business settings, optional customer details, line items, discounts, and totals.
- Open a printable invoice view for print or save-as-PDF.

## Backup And Restore

- Configure the backup folder in Settings.
- Create timestamped manual SQLite backups.
- Prevent silent backup overwrite when a generated backup filename already exists.
- Restore the active database from a selected backup file.

## Windows Packaging

- Build a Windows NSIS installer with electron-builder.
- Store packaged app data in Electron's user data directory as `stylecraft.sqlite`.
- Ship Drizzle migrations with the packaged app resources.
- Write installer artifacts to `release/`.

## Development

Install dependencies:

```powershell
npm install
```

Start the local desktop app:

```powershell
npm run dev
```

Build renderer and Electron main process:

```powershell
npm run build
```

Preview the built app:

```powershell
npm run preview
```

Build an unpacked app directory for local inspection:

```powershell
npm run package:dir
```

Build the Windows installer:

```powershell
npm run package:win
```

## Database

Generate migrations from the Drizzle schema:

```powershell
npm run db:generate
```

Apply migrations to the local development database:

```powershell
npm run db:migrate
```

Verify the database with a sample query:

```powershell
npm run db:verify
```

The development database is created at `.local/stylecraft-dev.sqlite`. The packaged app uses Electron's user data directory and stores data in `stylecraft.sqlite`.

## Planned Features

- Optional automatic backup on app close
- App icon and code signing assets
