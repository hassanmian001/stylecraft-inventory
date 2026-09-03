# Milestone 1 Project Scaffold Design

## Scope

Build the first `prd.json` milestone only: an Electron desktop app scaffold with React, TypeScript, Tailwind CSS, shadcn/ui-compatible structure, and an app shell with sidebar navigation.

This milestone does not implement SQLite, Drizzle, migrations, or product persistence. Those start in later milestones.

## Chosen Approach

Use a small Vite + Electron scaffold instead of a larger framework template.

This keeps the project explicit and easy to evolve across later milestones. The renderer will be a Vite React app. The Electron main process will create the desktop window and load the Vite dev server during development or the built renderer files in production.

## Architecture

The scaffold will use these main areas:

- `electron/`: Electron main process code.
- `src/`: React renderer code.
- `src/components/`: shared UI components.
- `src/lib/`: small utilities such as class name merging.
- root config files for TypeScript, Vite, Tailwind, PostCSS, and Electron scripts.

The renderer will not use a routing dependency in milestone 1. Navigation state can stay in React because the milestone only needs placeholder screens and a working shell. A router can be introduced later if deep links or URL-based routing become useful.

## User Interface

The initial UI will be work-focused and simple:

- Left sidebar with Dashboard, Products, Purchases, Sales, Reports, and Settings.
- Main content area with a page title and placeholder content for the selected section.
- Dashboard selected by default.
- Basic responsive behavior so the shell remains usable on smaller windows.

Tailwind will provide styling. shadcn/ui compatibility will be prepared through `components.json`, path aliases, and shared utility conventions. Initial local components may be minimal because the project is being created from an empty workspace.

## Data Flow

Milestone 1 has no persisted app data. UI state is limited to the selected navigation item in the renderer.

Future milestones will add an Electron-safe database boundary for SQLite operations rather than directly coupling renderer components to persistence.

## Error Handling

Electron startup should fail visibly in the terminal if the main process cannot create a window or load the renderer. Renderer errors should surface through Vite during development.

User-facing business errors are out of scope for milestone 1 because no business actions are implemented yet.

## Testing And Verification

Verification commands for milestone 1:

- `npm install`
- `npm run dev`
- `npm run build` or the closest available typecheck/build script

Acceptance criteria:

- Dependencies install successfully.
- The desktop app starts locally.
- A desktop window opens.
- The main layout renders without errors.
- Placeholder screens are reachable from the sidebar.

## Out Of Scope

- SQLite and Drizzle setup.
- Database schema or migrations.
- Products CRUD.
- Purchases, sales, reports, invoices, backups, and packaging.
- Authentication or staff permissions.
