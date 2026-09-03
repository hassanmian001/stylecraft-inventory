# Milestone 5 Sales Module Implementation Plan

## Context

Project: `D:\Antigravity\StyleCraft Invenetory Mannagement Software`

Git/worktree status: this workspace is not a git repository, so execute in place and do not attempt commits.

Approved direction: implement `prd.json` Milestone 5 with a multi-item sales flow mirroring the Purchases module.

Important boundaries:

- Renderer code must not import `db/*`.
- Use Electron IPC/preload for DB-backed actions.
- Sales must decrease stock transactionally.
- Overselling must be rejected.
- Every sale item must create a stock movement record.
- Profit calculations must be covered by tests.
- Money is integer cents.

## Tasks

1. Extend `src/types/stylecraft-api.ts` with customer, sale input, sale DTO, and `SalesApi` types.
2. Add `db/sales-service.test.ts` covering stock decrease, oversell rollback, movements, profit, discount, customer creation, and history.
3. Add `db/sales-service.ts` with `listCustomers`, `createCustomer`, `createSale`, and `listSales`.
4. Add `electron/sales-ipc.ts` and wire it into `electron/preload.ts` and `electron/main.ts`.
5. Add `src/components/sales/SalesScreen.tsx` and connect it from `src/App.tsx`.
6. Add `src/components/sales/SalesScreen.test.tsx`.
7. Update `package.json` test scripts to include sales service and sales screen tests.
8. Update `README.md` current state and Sales section.
9. Run `npm run db:migrate`, `npm run db:verify`, `npm test`, and `npm run build`.

## Service Rules

The service must validate:

- Valid sale date.
- At least one item.
- Positive integer product id and quantity.
- Non-negative integer unit price cents and discount cents.
- Discount cannot exceed `quantity * unitPriceCents`.
- No duplicate product ids in one sale.
- Product exists and is active.
- Product has enough stock.

The service must calculate:

- `subtotalCents = sum(quantity * unitPriceCents)`.
- `discountAmountCents = sum(line discount)`.
- `totalAmountCents = subtotalCents - discountAmountCents`.
- `profitAmountCents = totalAmountCents - sum(quantity * product.purchasePriceCents)`.

The transaction must insert sale, update invoice number, insert sale items, decrease stock, and insert stock movements. Any failure must roll back all changes.

## Verification Expectations

- DB tests include rollback and profit coverage.
- Renderer tests prove cents conversion and custom validation.
- Full `npm test` passes.
- Production `npm run build` passes.
