# Milestone 7 Reports And Exports Design

## Scope

Build the `prd.json` Milestone 7 Reports and exports module:

- Sales report.
- Purchase report.
- Profit report.
- Stock report.
- Date filters where relevant.
- Excel export.
- PDF export.

This milestone does not implement invoice rendering, scheduled reports, advanced charting, or backup/restore.

## Chosen Approach

Use a read-only reports service in the Electron main/Node side and a work-focused Reports screen in the renderer.

Reports will be fetched through `window.stylecraft.reports.getReports(filters)`. Date filters apply to sales, purchase, and profit reports. Stock report is a current-state report and is not date-filtered.

Exports will be dependency-free:

- Excel export: generate UTF-8 CSV files that open in Excel.
- PDF export: open a printable HTML report window and call print, allowing the desktop user to print or save as PDF.

This avoids adding heavy export dependencies while satisfying the milestone with openable exports.

## Data Model

No schema migration is expected.

Reports DTO:

- `salesRows`: invoice, date, customer, item count, subtotal, discount, total, profit, payment method, notes.
- `purchaseRows`: date, supplier, item count, total, notes.
- `profitRows`: invoice, date, customer, revenue, cost, discount, profit.
- `stockRows`: product, SKU, category, stock, threshold, purchase cost, selling price, inventory value, low-stock flag.
- `totals`: sales total, purchase total, revenue total, cost total, discount total, profit total, stock quantity, inventory value.

Date filters:

- `startDate` and `endDate` are optional.
- `YYYY-MM-DD` strings are parsed as local dates.
- Start date is inclusive at local start of day.
- End date is inclusive for the selected day by using the next local day as an exclusive boundary.

## UI Behavior

The Reports tab will replace placeholder cards with a working screen:

- Date filter controls.
- Report type tabs/select for Sales, Purchases, Profit, and Stock.
- Summary cards for totals relevant to the active report.
- Data table for the active report.
- CSV export button labelled Excel CSV.
- Print/Save PDF button.
- Loading and error states.

## Testing And Verification

Required service tests:

- Sales report rows and totals match sales records.
- Purchase report rows and totals match purchase records.
- Profit report uses stored sale item costs and discounts.
- Stock report matches current product stock and inventory value.
- Date filters include records inside the range and exclude records outside it.

Required renderer tests:

- Reports screen renders filtered report data from the API.
- Changing date filters reloads reports with filter values.
- CSV export creates a downloadable CSV payload.
- PDF export opens a printable report window.

Verification commands:

- `npm run db:migrate`
- `npm run db:verify`
- `npm test`
- `npm run build`

## Out Of Scope

- Native `.xlsx` workbook generation.
- Direct PDF file generation without print dialog.
- Charts.
- Saved report presets.
- Report scheduling.
