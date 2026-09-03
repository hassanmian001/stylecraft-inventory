import assert from "node:assert/strict";
import test from "node:test";

import { productChannels } from "../../dist-electron/electron/products-ipc.js";

test("exports stable product IPC channel names", () => {
  assert.equal(productChannels.list, "products:list");
  assert.equal(productChannels.create, "products:create");
  assert.equal(productChannels.update, "products:update");
  assert.equal(productChannels.markInactive, "products:markInactive");
});
