import type { IpcMain } from "electron";

import type { BusinessSettingsDto } from "../src/types/stylecraft-api.js";
export { settingsChannels } from "./ipc-channels.js";
import { settingsChannels } from "./ipc-channels.js";

export function registerSettingsHandlers(ipcMain: IpcMain) {
  ipcMain.handle(settingsChannels.getBusinessSettings, async () => {
    const [{ getDatabasePath }, { getBusinessSettings }] = await Promise.all([import("../db/paths.js"), import("../db/settings-service.js")]);

    return getBusinessSettings(getDatabasePath());
  });

  ipcMain.handle(settingsChannels.updateBusinessSettings, async (_event, input: BusinessSettingsDto) => {
    const [{ getDatabasePath }, { updateBusinessSettings }] = await Promise.all([import("../db/paths.js"), import("../db/settings-service.js")]);

    return updateBusinessSettings(getDatabasePath(), input);
  });
}
