import type { BrowserWindow, IpcMain } from "electron";

import { updateChannels } from "./ipc-channels.js";
import { checkForUpdatesManually } from "./updater.js";

export function registerUpdateHandlers(ipcMain: IpcMain, getWindow: () => BrowserWindow | undefined) {
  ipcMain.handle(updateChannels.check, async () => {
    return checkForUpdatesManually(getWindow);
  });
}
