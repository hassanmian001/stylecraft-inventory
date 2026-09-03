# Milestone 8 Invoices Design

## Goal

Add readable invoices for completed sales without changing existing stock or financial records.

## Scope

- Reuse the invoice number already generated when a sale is created.
- Build a read-only invoice DTO from the existing `sales`, `sale_items`, `products`, `customers`, and `settings` tables.
- Show invoice details from the Sales history table.
- Support print/save-as-PDF through the browser print dialog.

## Data Rules

- Invoice totals must come from persisted sale totals, not recalculated UI state.
- Line totals must come from persisted sale item totals.
- Business information must come from `settings` when present.
- Missing business settings must fall back to safe defaults so existing databases remain usable.

## UI Rules

- Add an invoice action to each sale history row.
- Show invoice number, sale date, business details, optional customer name, payment method, notes, line items, subtotal, discount, and total.
- Print/save PDF must use a clean printable document with escaped text.

## Non-Goals

- No schema migration is required.
- No separate invoice table is required for this milestone.
- No new PDF generation dependency is required.

## Verification

- Service test confirms invoice totals and settings mapping.
- UI test confirms the invoice action loads and displays invoice details.
- Existing migration, database verification, test, and build commands pass.
