import type { IpcMain } from "electron";
export { invoiceChannels } from "./ipc-channels.js";
import { invoiceChannels } from "./ipc-channels.js";

export function registerInvoiceHandlers(ipcMain: IpcMain) {
  ipcMain.handle(invoiceChannels.getBySaleId, async (_event, saleId: number) => {
    const [{ getDatabasePath }, { getInvoiceBySaleId }] = await Promise.all([import("../db/paths.js"), import("../db/invoices-service.js")]);

    return getInvoiceBySaleId(getDatabasePath(), saleId);
  });
}
