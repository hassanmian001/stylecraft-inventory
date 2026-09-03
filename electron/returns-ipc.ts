import type { IpcMain } from "electron";

import type { PurchaseReturnInput, SaleReturnInput } from "../src/types/stylecraft-api.js";
export { returnsChannels } from "./ipc-channels.js";
import { returnsChannels } from "./ipc-channels.js";

export function registerReturnsHandlers(ipcMain: IpcMain) {
  ipcMain.handle(returnsChannels.listSaleCandidates, async () => {
    const [{ getDatabasePath }, { listSaleReturnCandidates }] = await Promise.all([import("../db/paths.js"), import("../db/returns-service.js")]);

    return listSaleReturnCandidates(getDatabasePath());
  });

  ipcMain.handle(returnsChannels.createSaleReturn, async (_event, input: SaleReturnInput) => {
    const [{ getDatabasePath }, { createSaleReturn }] = await Promise.all([import("../db/paths.js"), import("../db/returns-service.js")]);

    return createSaleReturn(getDatabasePath(), input);
  });

  ipcMain.handle(returnsChannels.listSaleReturns, async () => {
    const [{ getDatabasePath }, { listSaleReturns }] = await Promise.all([import("../db/paths.js"), import("../db/returns-service.js")]);

    return listSaleReturns(getDatabasePath());
  });

  ipcMain.handle(returnsChannels.listPurchaseCandidates, async () => {
    const [{ getDatabasePath }, { listPurchaseReturnCandidates }] = await Promise.all([import("../db/paths.js"), import("../db/returns-service.js")]);

    return listPurchaseReturnCandidates(getDatabasePath());
  });

  ipcMain.handle(returnsChannels.createPurchaseReturn, async (_event, input: PurchaseReturnInput) => {
    const [{ getDatabasePath }, { createPurchaseReturn }] = await Promise.all([import("../db/paths.js"), import("../db/returns-service.js")]);

    return createPurchaseReturn(getDatabasePath(), input);
  });

  ipcMain.handle(returnsChannels.listPurchaseReturns, async () => {
    const [{ getDatabasePath }, { listPurchaseReturns }] = await Promise.all([import("../db/paths.js"), import("../db/returns-service.js")]);

    return listPurchaseReturns(getDatabasePath());
  });
}
