import type { IpcMain } from "electron";

import type { ReportFilters } from "../src/types/stylecraft-api.js";
export { reportsChannels } from "./ipc-channels.js";
import { reportsChannels } from "./ipc-channels.js";

export function registerReportsHandlers(ipcMain: IpcMain) {
  ipcMain.handle(reportsChannels.getReports, async (_event, filters?: ReportFilters) => {
    const [{ getDatabasePath }, { getReports }] = await Promise.all([import("../db/paths.js"), import("../db/reports-service.js")]);

    return getReports(getDatabasePath(), filters);
  });
}
