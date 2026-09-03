# Milestone 3 Task 2 Report

Status: DONE_WITH_CONCERNS

Task: `### Task 2: Electron IPC And Preload Bridge` from `docs/superpowers/plans/2026-07-09-milestone-3-products-module.md`.

Scope: Strict Milestone 3 Task 2 only. No Products UI, purchase/sale workflows, stock movement workflow code, reports, invoices, backup/restore, packaging, or README changes were added.

## Files Changed

- Created `electron/products-ipc.ts`
- Created `electron/preload.ts`
- Modified `electron/main.ts`
- Modified `tsconfig.node.json`
- Created `src/types/stylecraft-api.ts`
- Created `src/vite-env.d.ts`
- Created `tests/electron/products-ipc.test.mjs`
- Modified `tests/electron/renderer-target.test.mjs`
- Modified `package.json`
- Created `.superpowers/sdd/m3-task-2-report.md`

## Implementation Notes

- Added stable product IPC channel constants: `products:list`, `products:create`, `products:update`, `products:markInactive`.
- Added `registerProductHandlers(ipcMain)` with handlers for list, create, update, and mark inactive.
- Handlers use the default database path via `getDatabasePath()` and call the Task 1 product service functions.
- Added preload bridge at `window.stylecraft.products` using `contextBridge.exposeInMainWorld` and `ipcRenderer.invoke`.
- Wired `electron/main.ts` to register product handlers once after `app.whenReady()` starts and before creating the window.
- Added BrowserWindow preload config with `path.join(__dirname, "preload.js")`.
- Updated production renderer file path to `path.join(__dirname, "../../dist/index.html")` for `dist-electron/electron/main.js` output.
- Updated Node-side compile root so Electron and DB runtime files emit under `dist-electron/electron` and `dist-electron/db`.
- Updated `package.json` main path to `dist-electron/electron/main.js`.
- Updated existing renderer target test import to `../../dist-electron/electron/renderer-target.js`.
- Added renderer-safe product API types and global `window.stylecraft` typing.

## Commands Run And Outcomes

- `npm run test:electron`
  Outcome: Expected RED failure after adding `tests/electron/products-ipc.test.mjs` first. Build succeeded, Node test failed with `Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...\dist-electron\electron\products-ipc.js` imported from `tests/electron/products-ipc.test.mjs`. Summary: 3 tests, 2 pass, 1 fail.

- `npm run test:electron`
  Outcome: Initial GREEN attempt failed during `tsc -p tsconfig.node.json` after adding DB files to the Node compile. Errors were NodeNext extension errors in existing `db/*` files and declaration type errors from `db/client.ts`.

- `npm run test:electron`
  Outcome: Passed after changing the Node compile config. Summary: 3 tests, 3 pass, 0 fail.

- `npm run build`
  Outcome: Passed. Vite built 1583 modules and emitted `dist/index.html`, CSS, and JS assets. `tsc -p tsconfig.node.json` completed.

- `git rev-parse --is-inside-work-tree`
  Outcome: Failed with `fatal: not a git repository (or any of the parent directories): .git`. Commit skipped.

- `node -e "import(...)"` runtime DB service import check, first two attempts
  Outcome: Failed due to malformed PowerShell/JavaScript quoting in the diagnostic command, not due to application code.

- `node -e "import(\`"./dist-electron/db/products-service.js\`").then(() => console.log(\`"compiled DB service import: ok\`")).catch((error) => { console.error(error.code + \`": \`" + error.message); process.exit(1); })"`
  Outcome: Failed before the post-compile patch with `ERR_MODULE_NOT_FOUND: Cannot find module ...\dist-electron\db\client imported from ...\dist-electron\db\products-service.js`.

- `npm run test:electron`
  Outcome: Passed after adding the `build:electron` post-compile import extension patch. Summary: 3 tests, 3 pass, 0 fail.

- `node -e "import(\`"./dist-electron/db/products-service.js\`").then(() => console.log(\`"compiled DB service import: ok\`")).catch((error) => { console.error(error.code + \`": \`" + error.message); process.exit(1); })"`
  Outcome: Passed with `compiled DB service import: ok`.

- `npm run build`
  Outcome: Passed. Vite built 1583 modules and emitted `dist/index.html`, CSS, and JS assets. `build:electron` ran `tsc -p tsconfig.node.json` and the post-compile DB import extension patch.

## Exact Final Verification Outcomes

- Final `npm run test:electron`: PASS. Node test summary showed 3 tests, 3 pass, 0 fail.
- Final `npm run build`: PASS. Renderer build and Electron build completed without errors.
- Git repository check: not a git repository; commit skipped.
- Compiled main output check: `dist-electron/electron/main.js` contains `path.join(__dirname, "../../dist/index.html")` and preload `path.join(__dirname, "preload.js")`.

## Deviations

- `registerProductHandlers` accepts `ipcMain` as an argument instead of importing Electron at module top level. This keeps `electron/products-ipc.ts` safe for Node tests and preload imports of `productChannels`.
- `tsconfig.node.json` uses `module: "ES2020"` and `moduleResolution: "Bundler"` instead of the previous `NodeNext` settings because existing `db/*` files use extensionless relative imports and DB files were outside the allowed modification list.
- `package.json` `build:electron` now includes a post-compile Node command to patch emitted `dist-electron/db/*.js` relative imports from extensionless ESM specifiers to `.js` specifiers. This was needed to make compiled DB service imports work without modifying disallowed `db/*` source files.

## Concerns

- The post-compile import patch is a workaround caused by the Task 2 allowlist excluding `db/*` files. A cleaner follow-up would update runtime DB source imports to NodeNext-compatible `.js` specifiers and return `tsconfig.node.json` to NodeNext-style module resolution.
- The IPC handler behavior is covered at the channel constant level only, matching the current Task 2 plan. End-to-end IPC invocation tests are not present.

## Task 2 Fix

Files changed:

- `package.json`
- `tsconfig.node.json`
- `db/client.ts`
- `db/migrate.ts`
- `db/products-service.ts`
- `db/verify.ts`
- `.superpowers/sdd/m3-task-2-report.md`

Changes:

- Removed the `build:electron` post-compile import patch and made it exactly `tsc -p tsconfig.node.json`.
- Restored `tsconfig.node.json` to `module: "NodeNext"` and `moduleResolution: "NodeNext"` while preserving `outDir: "dist-electron"` and `rootDir: "."`.
- Updated Node-side runtime DB relative imports to explicit `.js` ESM specifiers.
- Preserved existing Electron IPC/preload imports, behavior, and output paths.

Commands run and outcomes:

- `npx tsc -p tsconfig.node.json --noEmit --module NodeNext --moduleResolution NodeNext`
  Outcome before fix: Failed with TS2835 errors for extensionless runtime imports in `db/client.ts`, `db/migrate.ts`, `db/products-service.ts`, and `db/verify.ts`.
- `npx tsc -p tsconfig.node.json --noEmit --module NodeNext --moduleResolution NodeNext`
  Outcome after fix: Passed with no output.
- `npm run test:electron`
  Outcome: Passed. `build:electron` ran `tsc -p tsconfig.node.json`; Node test summary showed 3 tests, 3 pass, 0 fail, duration 94.3298ms.
- `npm run build`
  Outcome: Passed. Vite transformed 1583 modules and built `dist/index.html`, CSS, and JS assets; `build:electron` ran `tsc -p tsconfig.node.json`.
- `node -e "import('./dist-electron/db/products-service.js').then(()=>console.log('compiled DB service import: ok')).catch((error)=>{console.error((error.code || error.name) + ': ' + error.message); process.exit(1);})"`
  Outcome: Passed with `compiled DB service import: ok`.
- `git rev-parse --is-inside-work-tree`
  Outcome: Failed with `fatal: not a git repository (or any of the parent directories): .git`; commit skipped.

Concerns:

- No remaining concerns for the requested NodeNext import/build fix.
