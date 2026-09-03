# Milestone 10 Windows Packaging Design

## Goal

Package StyleCraft Inventory as a Windows desktop installer and ensure packaged app data is written to a durable user data directory.

## Scope

- Configure `electron-builder` for Windows NSIS installer output.
- Add app metadata and packaging scripts.
- Include built renderer files, built Electron files, Drizzle migrations, and required runtime package metadata.
- Set a packaged-app data directory through Electron `app.getPath("userData")`.
- Keep CLI/dev database commands using `.local/stylecraft-dev.sqlite` unless explicitly overridden.

## Data Rules

- `STYLECRAFT_DB_PATH` remains the highest-priority database override.
- `STYLECRAFT_DATA_DIR` points the app to `stylecraft.sqlite` inside a writable data directory.
- When neither env var is set, local scripts continue using `.local/stylecraft-dev.sqlite`.
- Migrations must still run from packaged app resources.

## Packaging Rules

- `npm run package:win` builds renderer and Electron code first, then invokes `electron-builder --win nsis`.
- Installer artifacts are written to `release/`.
- The package is not published by default.
- No code signing is configured in this milestone.

## Verification

- Unit tests cover database path precedence.
- Electron tests still pass.
- `npm run db:migrate`, `npm run db:verify`, `npm test`, and `npm run build` pass.
- `npm run package:win` completes and produces a Windows installer artifact.
