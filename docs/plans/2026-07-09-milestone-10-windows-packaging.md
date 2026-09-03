# Milestone 10 Windows Packaging Implementation Plan

## Context

The app already builds a renderer bundle and Electron main/preload bundle. Milestone 10 adds Windows installer packaging and ensures packaged app data is stored outside the installation directory.

## Task 1: Add Production Database Path Handling

- Update `db/paths.ts` to support `STYLECRAFT_DATA_DIR`.
- Keep `STYLECRAFT_DB_PATH` as the strongest override.
- Add a helper that resolves `stylecraft.sqlite` under the data directory.
- Update `electron/main.ts` to set `STYLECRAFT_DATA_DIR` from `app.getPath("userData")` before registering IPC handlers.

## Task 2: Add Path Tests

- Add `db/paths.test.ts`.
- Cover default dev path, explicit DB override, and data directory path.
- Add the test to `package.json` `test:db`.

## Task 3: Install And Configure electron-builder

- Install `electron-builder` as a dev dependency.
- Add scripts:
  - `package:win`: build and create Windows installer.
  - `package:dir`: build and create unpacked app directory for local inspection.
- Add `build` metadata to `package.json` with app ID, product name, files, extra resources, and NSIS config.

## Task 4: Update Docs

- Update `README.md` with Milestone 10 status and packaging commands.

## Task 5: Verify

- Run `npm run db:migrate`.
- Run `npm run db:verify`.
- Run `npm test`.
- Run `npm run build`.
- Run `npm run package:win`.
