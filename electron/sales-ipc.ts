import type { IpcMain } from "electron";

import type { CustomerInput, SaleInput } from "../src/types/stylecraft-api.js";
export { salesChannels } from "./ipc-channels.js";
import { salesChannels } from "./ipc-channels.js";

export function registerSalesHandlers(ipcMain: IpcMain) {
  ipcMain.handle(salesChannels.list, async () => {
    const [{ getDatabasePath }, { listSales }] = await Promise.all([import("../db/paths.js"), import("../db/sales-service.js")]);

    return listSales(getDatabasePath());
  });

  ipcMain.handle(salesChannels.create, async (_event, input: SaleInput) => {
    const [{ getDatabasePath }, { createSale }] = await Promise.all([import("../db/paths.js"), import("../db/sales-service.js")]);

    return createSale(getDatabasePath(), input);
  });

  ipcMain.handle(salesChannels.listCustomers, async () => {
    const [{ getDatabasePath }, { listCustomers }] = await Promise.all([import("../db/paths.js"), import("../db/sales-service.js")]);

    return listCustomers(getDatabasePath());
  });

  ipcMain.handle(salesChannels.createCustomer, async (_event, input: CustomerInput) => {
    const [{ getDatabasePath }, { createCustomer }] = await Promise.all([import("../db/paths.js"), import("../db/sales-service.js")]);

    return createCustomer(getDatabasePath(), input);
  });
}
