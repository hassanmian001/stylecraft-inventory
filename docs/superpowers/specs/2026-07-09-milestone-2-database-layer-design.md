# Milestone 2 Database Layer Design

## Scope

Build the `prd.json` Milestone 2 database layer only:

- Install SQLite and Drizzle dependencies.
- Create typed schema files.
- Create migrations.
- Add a database connection module.
- Verify migrations run, a database file is created, and a sample query works.

This milestone does not implement product CRUD, purchase workflows, sales workflows, reports, invoices, backup/restore, or UI persistence.

## Chosen Approach

Use SQLite through `better-sqlite3` with Drizzle ORM and Drizzle Kit migrations.

This keeps database access on the Electron main/Node side, gives typed table definitions for later service functions, and supports explicit migrations before the Products module is added.

## Architecture

The database layer will use these areas:

- `db/schema.ts`: typed Drizzle table definitions.
- `db/client.ts`: SQLite connection and Drizzle database factory.
- `db/migrate.ts`: migration runner for the local database file.
- `db/verify.ts`: simple verification script that opens the database and runs a sample query.
- `drizzle.config.ts`: Drizzle Kit configuration.
- `drizzle/`: generated SQL migrations.
- `.local/`: ignored local development database folder.

The renderer will not import database modules directly. Later milestones should expose database-backed operations through Electron-safe service or IPC boundaries.

## Database Location

For development verification, the SQLite file will live at `.local/stylecraft-dev.sqlite`.

`.local/` must be ignored by git because it contains local runtime data. Packaged app storage paths will be handled later when Windows packaging is implemented.

## Schema

Milestone 2 will create the full initial table set from `docs/DATABASE_SCHEMA.md` so later milestones can build on stable relationships:

- `categories`
- `products`
- `suppliers`
- `customers`
- `purchases`
- `purchase_items`
- `sales`
- `sale_items`
- `stock_movements`
- `settings`

Tables will include IDs, timestamps, core business fields, and foreign keys where records reference each other. Monetary values will be stored as integer cents to avoid floating-point financial errors.

Product records will support inactive status instead of hard deletion. Stock movements will include movement type, reference type, reference ID, quantity change, stock before, and stock after.

## Data Flow

Milestone 2 data flow is command-line verification only:

1. `npm run db:generate` creates migration SQL from the Drizzle schema.
2. `npm run db:migrate` creates or opens `.local/stylecraft-dev.sqlite` and applies migrations.
3. `npm run db:verify` runs a sample query against a real table and prints the result.

UI screens will continue to show placeholder content until Milestone 3 connects Products to the database.

## Error Handling

Database scripts should fail with a non-zero exit code if migrations or sample queries fail. The failure should include the underlying error message so the problem can be diagnosed from terminal output.

The database directory should be created automatically before opening the SQLite file.

## Testing And Verification

Verification commands for Milestone 2:

- `npm install`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:verify`
- `npm test`
- `npm run build`

Acceptance criteria:

- SQLite and Drizzle dependencies install successfully.
- Migration SQL is generated.
- Migrations run successfully.
- `.local/stylecraft-dev.sqlite` is created.
- A sample query against a migrated table succeeds.
- Existing Electron and renderer tests still pass.
- The app still builds.

## Out Of Scope

- Product add/edit/search UI.
- Persisting products from the renderer.
- Purchase and sale transaction service functions.
- Profit calculations.
- Stock movement creation from business actions.
- Production app data path selection.
- Backup and restore behavior.
