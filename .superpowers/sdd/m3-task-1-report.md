# Milestone 3 Task 1 Report: Product Service And Tests

## Status

Completed.

## Files Changed

- Created `db/products-service.ts`.
- Existing `db/products-service.test.ts` was used as the Task 1 test file; no changes were needed.
- Existing `package.json` already included `db/products-service.test.ts` in `test:db`; no changes were needed.
- Created `.superpowers/sdd/m3-task-1-report.md`.

## Commands Run

1. `npm run test:db`
   - Outcome: Failed as expected before implementation.
   - Exact failure: `Error: Failed to load url ./products-service (resolved id: ./products-service) in D:/Antigravity/StyleCraft Invenetory Mannagement Software/db/products-service.test.ts. Does the file exist?`
   - Summary: `Test Files 1 failed | 3 passed (4)`, `Tests 5 passed (5)`.

2. `npm run test:db`
   - Outcome: Passed after implementation.
   - Summary: `Test Files 4 passed (4)`, `Tests 14 passed (14)`.

3. `git rev-parse --is-inside-work-tree`
   - Outcome: Failed as expected.
   - Exact output: `fatal: not a git repository (or any of the parent directories): .git`
   - Commit skipped.

## Implementation Notes

- `ProductInput`, `ProductListFilters`, `ProductDto`, `ProductValidationError`, `createProduct`, `updateProduct`, `listProducts`, and `markProductInactive` are exported from `db/products-service.ts`.
- SKU values are trimmed, uppercased, stored normalized, and checked for uniqueness on normalized value.
- Money fields remain integer cents and are rejected when negative or non-integer.
- Empty or whitespace-only category input maps to no category.
- Non-empty category input is trimmed and reused by exact trimmed name, or created when missing.
- Low-stock status is calculated as `currentStock <= lowStockThreshold`.
- Product inactivity is implemented as an update to `isActive: false`; products are not deleted.

## Deviations

- `db/products-service.test.ts` and the `test:db` script already existed before this task execution. I preserved them because they already matched the Task 1 plan and produced the required red failure before production code was added.

## Concerns

- The service runs migrations before each operation to satisfy the planned service/database boundary, which is simple and safe for this small app but may be optimized later if startup or repeated service calls become slow.
