import { dialog, type IpcMain } from "electron";

export { backupChannels } from "./ipc-channels.js";
import { backupChannels } from "./ipc-channels.js";

export function registerBackupHandlers(ipcMain: IpcMain) {
  ipcMain.handle(backupChannels.getSettings, async () => {
    const [{ getDatabasePath }, { getBackupSettings }] = await Promise.all([import("../db/paths.js"), import("../db/backup-service.js")]);

    return getBackupSettings(getDatabasePath());
  });

  ipcMain.handle(backupChannels.updateLocation, async (_event, backupLocation: string) => {
    const [{ getDatabasePath }, { updateBackupLocation }] = await Promise.all([import("../db/paths.js"), import("../db/backup-service.js")]);

    return updateBackupLocation(getDatabasePath(), backupLocation);
  });

  ipcMain.handle(backupChannels.create, async () => {
    const [{ getDatabasePath }, { createBackup }] = await Promise.all([import("../db/paths.js"), import("../db/backup-service.js")]);

    return createBackup(getDatabasePath());
  });

  ipcMain.handle(backupChannels.restore, async (_event, backupPath: string) => {
    const [{ getDatabasePath }, { restoreBackup }] = await Promise.all([import("../db/paths.js"), import("../db/backup-service.js")]);

    return restoreBackup(getDatabasePath(), backupPath);
  });

  ipcMain.handle(backupChannels.chooseDirectory, async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });

    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle(backupChannels.chooseFile, async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: "SQLite backups", extensions: ["sqlite", "db"] }],
      properties: ["openFile"],
    });

    return result.canceled ? null : result.filePaths[0] ?? null;
  });
}
