# Milestone 8 Invoices Implementation Plan

## Context

StyleCraft already creates sales with persisted invoice numbers and totals. Milestone 8 adds invoice retrieval, preview, and print/save-PDF from those existing sale records.

## Task 1: Add Invoice DTOs

- Update `src/types/stylecraft-api.ts` with invoice business settings, line item, and detail DTOs.
- Add `InvoiceApi` with `getBySaleId(saleId: number): Promise<InvoiceDetailDto>`.
- Add `invoices: InvoiceApi` to `StyleCraftApi`.

## Task 2: Add Invoice Service

- Create `db/invoices-service.ts`.
- Run migrations before reads.
- Validate `saleId` as a positive integer.
- Query sale/customer fields, sale item/product fields, and settings.
- Return settings defaults for missing keys.
- Throw a validation error when the sale is not found.

## Task 3: Add IPC And Preload Wiring

- Create `electron/invoices-ipc.ts` with channel `invoices:getBySaleId`.
- Register the handler in `electron/main.ts`.
- Import channels and expose `window.stylecraft.invoices.getBySaleId` in `electron/preload.ts`.

## Task 4: Add Sales UI Invoice Preview

- Update `src/components/sales/SalesScreen.tsx`.
- Add a View invoice button per sale row.
- Load invoice details through `window.stylecraft.invoices.getBySaleId`.
- Render a preview card with business info, customer info, item rows, and totals.
- Add Print / Save PDF using a printable popup window.

## Task 5: Add Tests

- Add `db/invoices-service.test.ts` for invoice lookup, totals, and settings defaults.
- Update `src/components/sales/SalesScreen.test.tsx` for invoice loading and preview display.

## Task 6: Update README And Verify

- Update `README.md` with Milestone 8 details.
- Run `npm run db:migrate`.
- Run `npm run db:verify`.
- Run `npm test`.
- Run `npm run build`.
