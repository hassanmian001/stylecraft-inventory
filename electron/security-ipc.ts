import type { IpcMain } from "electron";

export { securityChannels } from "./ipc-channels.js";
import { securityChannels } from "./ipc-channels.js";

export function registerSecurityHandlers(ipcMain: IpcMain) {
  ipcMain.handle(securityChannels.getEditPasswordStatus, async () => {
    const [{ getDatabasePath }, { getEditPasswordStatus }] = await Promise.all([import("../db/paths.js"), import("../db/edit-password-service.js")]);

    return getEditPasswordStatus(getDatabasePath());
  });

  ipcMain.handle(securityChannels.setEditPassword, async (_event, newPassword: string, currentPassword?: string | null) => {
    const [{ getDatabasePath }, { setEditPassword }] = await Promise.all([import("../db/paths.js"), import("../db/edit-password-service.js")]);

    return setEditPassword(getDatabasePath(), newPassword, currentPassword);
  });

  ipcMain.handle(securityChannels.clearEditPassword, async (_event, currentPassword: string) => {
    const [{ getDatabasePath }, { clearEditPassword }] = await Promise.all([import("../db/paths.js"), import("../db/edit-password-service.js")]);

    return clearEditPassword(getDatabasePath(), currentPassword);
  });

  ipcMain.handle(securityChannels.verifyEditPassword, async (_event, password: string) => {
    const [{ getDatabasePath }, { verifyEditPassword }] = await Promise.all([import("../db/paths.js"), import("../db/edit-password-service.js")]);

    return verifyEditPassword(getDatabasePath(), password);
  });
}
