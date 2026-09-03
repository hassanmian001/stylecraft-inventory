import type { IpcMain } from "electron";

import type { ProductInput, ProductListFilters } from "../src/types/stylecraft-api.js";
export { productChannels } from "./ipc-channels.js";
import { productChannels } from "./ipc-channels.js";

export function registerProductHandlers(ipcMain: IpcMain) {
  ipcMain.handle(productChannels.list, async (_event, filters?: ProductListFilters) => {
    const [{ getDatabasePath }, { listProducts }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/products-service.js"),
    ]);

    return listProducts(getDatabasePath(), filters);
  });

  ipcMain.handle(productChannels.get, async (_event, id: number) => {
    const [{ getDatabasePath }, { getProduct }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/products-service.js"),
    ]);

    return getProduct(getDatabasePath(), id);
  });

  ipcMain.handle(productChannels.create, async (_event, input: ProductInput) => {
    const [{ getDatabasePath }, { createProduct }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/products-service.js"),
    ]);

    return createProduct(getDatabasePath(), input);
  });

  ipcMain.handle(productChannels.update, async (_event, id: number, input: ProductInput) => {
    const [{ getDatabasePath }, { updateProduct }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/products-service.js"),
    ]);

    return updateProduct(getDatabasePath(), id, input);
  });

  ipcMain.handle(productChannels.markInactive, async (_event, id: number) => {
    const [{ getDatabasePath }, { markProductInactive }] = await Promise.all([
      import("../db/paths.js"),
      import("../db/products-service.js"),
    ]);

    return markProductInactive(getDatabasePath(), id);
  });
}
