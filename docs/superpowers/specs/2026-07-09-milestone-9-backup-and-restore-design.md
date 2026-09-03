# Milestone 9 Backup And Restore Design

## Goal

Protect local SQLite data with manual backups and a restore flow that is clear, testable, and does not overwrite existing backup files silently.

## Scope

- Store the backup directory in the existing `settings` table under `backup.location`.
- Use a default backup directory beside the app database when no custom location is configured.
- Create manual backup files with date/time in the filename.
- Refuse to overwrite an existing backup path.
- Restore the active database from a selected backup file.
- Expose backup and restore through the Settings screen.

## Data Rules

- Backup files copy the SQLite database file exactly after migrations have run.
- Backup filenames use `stylecraft-backup-YYYYMMDD-HHmmss-SSS.sqlite`.
- Existing backup files are never overwritten silently; exact path collisions fail.
- Restore validates a temporary copy by running migrations before replacing the active database.

## UI Rules

- Settings must show the active backup location.
- User can save a backup location manually or choose a folder via Electron dialog.
- User can create a backup and see the generated path.
- User can choose a backup file or type a backup path, then restore it.
- Restore success must clearly state that the database has been restored.

## Non-Goals

- No automatic backup on app close in this milestone.
- No cloud backup.
- No scheduled backups.
- No schema migration is required.

## Verification

- Service tests cover backup creation, no-overwrite behavior, location settings, and restore.
- UI tests cover loading settings, saving backup location, creating backup, and restoring a selected file path.
- Migration, DB verification, all tests, and build pass.
