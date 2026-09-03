import type { IpcMain } from "electron";

import type { AuditLogInput, AuditLogListFilters } from "../src/types/stylecraft-api.js";
export { auditChannels } from "./ipc-channels.js";
import { auditChannels } from "./ipc-channels.js";

export function registerAuditHandlers(ipcMain: IpcMain) {
  ipcMain.handle(auditChannels.list, async (_event, filters?: AuditLogListFilters) => {
    const [{ getDatabasePath }, { listAuditLogs }] = await Promise.all([import("../db/paths.js"), import("../db/audit-service.js")]);

    return listAuditLogs(getDatabasePath(), filters);
  });

  ipcMain.handle(auditChannels.create, async (_event, input: AuditLogInput) => {
    const [{ getDatabasePath }, { createAuditLog }] = await Promise.all([import("../db/paths.js"), import("../db/audit-service.js")]);

    return createAuditLog(getDatabasePath(), input);
  });
}
