# OpenCode Project Brief

## Project

Build **StyleCraft Inventory Management Software**, a Windows desktop app for a small business with around 50 products.

The app must keep complete records of:

- Products and stock levels
- Purchases from suppliers
- Sales to customers
- Stock movement history
- Profit and inventory value
- Invoices and reports
- Local backups and restore

## Preferred Stack

- Desktop runtime: Electron
- Frontend: React + TypeScript
- Styling: Tailwind CSS
- UI components: shadcn/ui
- Database: SQLite
- ORM: Drizzle ORM
- Testing: Vitest for business logic, Playwright if UI testing is added
- Packaging: electron-builder for Windows installer

If this stack is changed, explain why before implementing.

## Build Strategy

Build the app in small, working milestones. Do not try to create every feature in one pass.

Start with:

1. Project scaffold
2. Database schema
3. App shell and navigation
4. Products module
5. Purchases module
6. Sales module
7. Dashboard and reports
8. PDF/Excel export
9. Backup/restore
10. Windows packaging

## First Task

Create the Electron + React + TypeScript app scaffold, install required dependencies, configure Tailwind and shadcn/ui, set up SQLite + Drizzle, and implement the initial Products module.

The first working version should allow a user to:

- Open the desktop app
- Add a product
- Edit a product
- Search/filter products
- See current stock and low-stock threshold
- Save products in SQLite

## Business Rules

- Purchases increase stock.
- Sales decrease stock.
- A sale cannot be completed if sold quantity is greater than available stock.
- Every stock change must create a stock movement record.
- Profit is sale revenue minus purchase cost.
- Prefer soft delete or inactive status for business records.
- Reports must be date-filterable.
- Backup files must not silently overwrite older backups.

## Important Files

- `docs/PRODUCT_REQUIREMENTS.md`: full product requirements
- `docs/IMPLEMENTATION_PLAN.md`: build phases
- `docs/DATABASE_SCHEMA.md`: suggested database structure
- `docs/OPENCODE_TASKS.md`: step-by-step tasks
- `prd.json`: machine-readable task list

## Quality Requirements

- Keep financial and stock calculations in tested service functions.
- Use database transactions for purchases and sales.
- Use typed Drizzle schemas and migrations.
- Keep UI simple, work-focused, and suitable for daily business use.
- Validate forms before saving data.
- Show clear errors for failed sales, missing fields, and backup problems.

## Suggested OpenCode Prompt

```text
Read OPENCODE.md and the docs folder. Build the project according to prd.json, starting with milestone 1. Use Electron, React, TypeScript, SQLite, Drizzle, Tailwind, and shadcn/ui. Implement incrementally and verify each milestone before moving to the next.
```

