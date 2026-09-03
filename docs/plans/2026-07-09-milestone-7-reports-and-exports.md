# Milestone 7 Reports And Exports Implementation Plan

## Context

Project: `D:\Antigravity\StyleCraft Invenetory Mannagement Software`

Git/worktree status: this workspace is not a git repository, so execute in place and do not attempt commits.

Milestone source: `prd.json` Milestone 7.

Important boundaries:

- Renderer code must not import `db/*`.
- Report calculations must be tested in a Node-side service.
- Money is integer cents.
- Sales and purchase write behavior must not change.
- Excel export is CSV for this milestone.
- PDF export uses browser print/save-as-PDF.

## Tasks

1. Extend `src/types/stylecraft-api.ts` with reports filter, row, totals, DTO, and API types.
2. Add `db/reports-service.test.ts` covering sales, purchases, profit, stock, totals, and date filters.
3. Add `db/reports-service.ts` with `getReports(databasePath, filters)`.
4. Add `electron/reports-ipc.ts` and wire it into `electron/preload.ts` and `electron/main.ts`.
5. Add `src/components/reports/ReportsScreen.tsx` with report tabs, date filters, tables, CSV export, and print export.
6. Add `src/components/reports/ReportsScreen.test.tsx`.
7. Update `src/App.tsx` to render `ReportsScreen` on the Reports tab.
8. Update `package.json` test scripts to include reports tests.
9. Update `README.md` current state and Reports section.
10. Run `npm run db:migrate`, `npm run db:verify`, `npm test`, and `npm run build`.

## Calculation Rules

- Date filters apply to sales, purchases, and profit reports.
- Date filters do not apply to stock report.
- Sales totals use stored sale totals.
- Purchase totals use stored purchase totals.
- Profit rows use stored sale item unit costs, discounts, totals, and profit.
- Stock inventory value is current stock multiplied by product purchase cost.
- Low-stock flag is `currentStock <= lowStockThreshold`.

## Verification Expectations

- DB tests prove report values match seeded products, purchases, and sales.
- Renderer tests prove filtering, display, CSV export, and print export work.
- Full `npm test` passes.
- Production `npm run build` passes.
