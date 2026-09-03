import type { IpcMain } from "electron";
export { dashboardChannels } from "./ipc-channels.js";
import { dashboardChannels } from "./ipc-channels.js";

export function registerDashboardHandlers(ipcMain: IpcMain) {
  ipcMain.handle(dashboardChannels.getSummary, async () => {
    const [{ getDatabasePath }, { getDashboardSummary }] = await Promise.all([import("../db/paths.js"), import("../db/dashboard-service.js")]);

    return getDashboardSummary(getDatabasePath());
  });
}
