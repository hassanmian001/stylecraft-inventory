import type { IpcMain } from "electron";

import type { StockAdjustmentInput } from "../src/types/stylecraft-api.js";
export { stockChannels } from "./ipc-channels.js";
import { stockChannels } from "./ipc-channels.js";

export function registerStockHandlers(ipcMain: IpcMain) {
  ipcMain.handle(stockChannels.adjust, async (_event, input: StockAdjustmentInput) => {
    const [{ getDatabasePath }, { adjustStock }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/stock-adjustments-service.js"),
    ]);

    return adjustStock(getDatabasePath(), input);
  });
}
