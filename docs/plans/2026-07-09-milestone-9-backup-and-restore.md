# Milestone 9 Backup And Restore Implementation Plan

## Context

The app stores data in a local SQLite database and already has a `settings` table. Milestone 9 adds backup/restore without a schema change.

## Task 1: Add Backup API Types

- Update `src/types/stylecraft-api.ts` with backup settings/result DTOs.
- Add `BackupApi` methods for settings, location update, create backup, restore, choose directory, and choose file.
- Add `backup: BackupApi` to `StyleCraftApi`.

## Task 2: Add Backup Service

- Create `db/backup-service.ts`.
- Use `backup.location` in the settings table.
- Default backup location to `.local/backups` beside the active database.
- Create backups with timestamped filenames and `COPYFILE_EXCL`.
- Restore by copying the backup to a temporary file, running migrations against the temporary file, then replacing the active database.

## Task 3: Add Electron IPC And Preload

- Create `electron/backup-ipc.ts`.
- Register handlers in `electron/main.ts`.
- Expose `window.stylecraft.backup.*` in `electron/preload.ts`.
- Use Electron dialogs for choosing backup directory and backup file.

## Task 4: Add Settings UI

- Create `src/components/settings/SettingsScreen.tsx`.
- Add backup location input, choose folder, save location, create backup, restore path input, choose file, and restore action.
- Render Settings screen in `src/App.tsx`.

## Task 5: Add Tests

- Add `db/backup-service.test.ts`.
- Add `src/components/settings/SettingsScreen.test.tsx`.
- Update existing renderer mocks to include the new backup API.
- Add new test files to `package.json` scripts.

## Task 6: Update README And Verify

- Update `README.md` with backup/restore status.
- Run `npm run db:migrate`.
- Run `npm run db:verify`.
- Run `npm test`.
- Run `npm run build`.
