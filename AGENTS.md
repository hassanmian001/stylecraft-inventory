# Agent Instructions

This repository is for building **StyleCraft Inventory Management Software**.

Before making code changes:

1. Read `OPENCODE.md`.
2. Read the files in `docs/`.
3. Use `prd.json` as the milestone/task source.

Build incrementally. Start with milestone 1 unless the user asks for a different milestone.

Preferred stack:

- Electron
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- SQLite
- Drizzle ORM
- Vitest
- electron-builder

Important rules:

- Purchases must increase stock.
- Sales must decrease stock.
- Do not allow selling more than available stock.
- Every stock change must create a stock movement record.
- Use database transactions for purchases and sales.
- Keep stock and profit calculations covered by tests.

When a milestone is complete, run the relevant tests or verification commands and report what passed.

