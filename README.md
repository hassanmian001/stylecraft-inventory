# StyleCraft Inventory Management Software

Desktop inventory management software for a small business with around 50 products.

## Current State

SQLite persistence with the database layer, Electron IPC bridge, preload API, and screens for Products, Purchases, Sales, Returns, Ledger, Dashboard, Reports and Settings; invoice preview and printing; manual backup and restore; a Windows installer; and automatic updates from GitHub Releases.

Stock is held per size and colour, sales and purchases can be left part paid and tracked on a khata, a recorded sale can be corrected behind a password, and the whole app has a dark mode.

## Dashboard

- Show active product count and total stock quantity.
- Show inventory value at stored purchase cost.
- Show today sales, current month sales, and current month profit.
- Show low-stock products.
- Show best-selling products by sold quantity and sales value.

## Products

- One entry per style, with a table of its sizes and colours underneath.
- Stock is held per size/colour; the product total is the sum of them.
- A size can override the product's purchase price, selling price, or alert level; left blank it follows the product.
- SKUs for each size/colour are filled in from the product SKU plus the size and colour, and can be typed over.
- Click any row in the list to open that product for editing.
- A style counts as low on stock when any one of its sizes is low.
- Removing a size deletes it only if nothing references it; otherwise it is kept and deactivated so its history stays readable.
- Stock adjustments are recorded against a specific size/colour.
- Search products by name or SKU.
- Filter products by category, low-stock status, and active status.

## Purchases

- Create supplier purchases with one or more lines, each naming a product and a size/colour.
- Record how much was paid now; anything short of the total stays on the supplier's khata.
- Add suppliers inline while recording purchases.
- Increase stock transactionally when a purchase is saved.
- Record one stock movement per purchased product line.
- Keep purchase history with supplier, item count, total, date, and notes.

## Sales

- Create customer sales with one or more lines, each naming a product and a size/colour.
- Record how much was paid now; anything short of the total stays on the customer's khata.
- Correct a recorded sale from its history row: the original stock deduction is put back and the new lines applied, so stock, profit and the customer's balance end up as if it had been entered that way.
- Editing asks for the password set in Settings, checked in the main process. Sales that already have a return against them cannot be edited.
- Add customers inline while recording sales.
- Decrease stock transactionally when a sale is saved.
- Block sales that exceed available stock.
- Calculate sale totals, discounts, and profit from stored product cost.
- Record one stock movement per sold product line.
- Keep sale history with invoice number, customer, item count, total, profit, payment method, date, and notes.

## Ledger

- Customer khata: what each customer still owes, and supplier khata: what the shop still owes each supplier.
- A balance is invoices minus payments minus returns, so nothing is counted twice.
- Click a party to see a running statement of every invoice, payment and return against them.
- Record a payment received or paid against an open balance.
- Settled accounts are hidden until asked for.

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

## Appearance

- Light, dark, or match the Windows setting; the choice is remembered and applied before the window paints.
- Toggle from the sidebar, or pick the mode in Settings.

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
