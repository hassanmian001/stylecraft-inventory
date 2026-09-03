# Milestone 6 Dashboard Implementation Plan

## Context

Project: `D:\Antigravity\StyleCraft Invenetory Mannagement Software`

Git/worktree status: this workspace is not a git repository, so execute in place and do not attempt commits.

Milestone source: `prd.json` Milestone 6.

Important boundaries:

- Renderer code must not import `db/*`.
- Dashboard calculations must be tested in a Node-side service.
- Money is integer cents.
- Existing sales and purchase behavior must not change.

## Tasks

1. Extend `src/types/stylecraft-api.ts` with dashboard DTO and API types.
2. Add `db/dashboard-service.test.ts` with deterministic date-based aggregate tests.
3. Add `db/dashboard-service.ts` with `getDashboardSummary(databasePath, now?)`.
4. Add `electron/dashboard-ipc.ts` and wire it into `electron/preload.ts` and `electron/main.ts`.
5. Add `src/components/dashboard/DashboardScreen.tsx`.
6. Add `src/components/dashboard/DashboardScreen.test.tsx`.
7. Update `src/App.tsx` to render `DashboardScreen` on the dashboard tab.
8. Update `package.json` test scripts to include dashboard tests.
9. Update `README.md` current state and Dashboard section.
10. Run `npm run db:migrate`, `npm run db:verify`, `npm test`, and `npm run build`.

## Calculation Rules

- Product and inventory metrics include active products only.
- Inventory value is current stock multiplied by stored purchase cost.
- Today uses local start/end of day based on `now`.
- Current month uses local month boundaries based on `now`.
- Best-selling products aggregate all sale items for now; date filters are out of scope until Reports.
- Low-stock products are active products where `currentStock <= lowStockThreshold`.

## Verification Expectations

- DB tests prove all aggregate values match seeded records.
- Renderer tests prove API data is displayed and errors are visible.
- Full `npm test` passes.
- Production `npm run build` passes.
