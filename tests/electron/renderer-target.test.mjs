import assert from "node:assert/strict";
import test from "node:test";

import { getRendererTarget } from "../../dist-electron/electron/renderer-target.js";

test("uses the dev server only when a dev server URL is provided", () => {
  assert.deepEqual(getRendererTarget("http://127.0.0.1:5173", "C:/app/dist/index.html"), {
    type: "url",
    value: "http://127.0.0.1:5173",
  });
});

test("uses built renderer files when no dev server URL is provided", () => {
  assert.deepEqual(getRendererTarget(undefined, "C:/app/dist/index.html"), {
    type: "file",
    value: "C:/app/dist/index.html",
  });
});
