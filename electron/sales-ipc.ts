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

  ipcMain.handle(salesChannels.get, async (_event, id: number) => {
    const [{ getDatabasePath }, { getSale }] = await Promise.all([import("../db/paths.js"), import("../db/sales-service.js")]);

    return getSale(getDatabasePath(), id);
  });

  // Editing a recorded sale is gated on the shop's edit password. The check runs
  // here in the main process so the renderer can never skip it.
  ipcMain.handle(salesChannels.update, async (_event, id: number, input: SaleInput, password: string, actorName?: string | null) => {
    const [{ getDatabasePath }, { assertEditPassword }, { updateSale }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/edit-password-service.js"),
      import("../db/sales-service.js"),
    ]);
    const databasePath = getDatabasePath();

    assertEditPassword(databasePath, password);

    return updateSale(databasePath, id, input, actorName);
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
