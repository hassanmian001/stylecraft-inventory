import type { IpcMain } from "electron";

import type { PurchaseInput, SupplierInput } from "../src/types/stylecraft-api.js";
export { purchaseChannels } from "./ipc-channels.js";
import { purchaseChannels } from "./ipc-channels.js";

export function registerPurchaseHandlers(ipcMain: IpcMain) {
  ipcMain.handle(purchaseChannels.list, async () => {
    const [{ getDatabasePath }, { listPurchases }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/purchases-service.js"),
    ]);

    return listPurchases(getDatabasePath());
  });

  ipcMain.handle(purchaseChannels.create, async (_event, input: PurchaseInput) => {
    const [{ getDatabasePath }, { createPurchase }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/purchases-service.js"),
    ]);

    return createPurchase(getDatabasePath(), input);
  });

  ipcMain.handle(purchaseChannels.listSuppliers, async () => {
    const [{ getDatabasePath }, { listSuppliers }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/purchases-service.js"),
    ]);

    return listSuppliers(getDatabasePath());
  });

  ipcMain.handle(purchaseChannels.createSupplier, async (_event, input: SupplierInput) => {
    const [{ getDatabasePath }, { createSupplier }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/purchases-service.js"),
    ]);

    return createSupplier(getDatabasePath(), input);
  });
}
