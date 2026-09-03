import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const preloadPath = path.resolve("dist-electron", "electron", "preload.cjs");
const mainPath = path.resolve("dist-electron", "electron", "main.js");

test("main process loads the CommonJS preload file", () => {
  const mainSource = fs.readFileSync(mainPath, "utf8");

  assert.match(mainSource, /preload\.cjs/);
});

test("preload is CommonJS and exposes every StyleCraft API group", () => {
  const preloadSource = fs.readFileSync(preloadPath, "utf8");

  assert.match(preloadSource, /require\("electron"\)/);
  assert.match(preloadSource, /contextBridge\.exposeInMainWorld\("stylecraft"/);
  assert.match(preloadSource, /audit:/);
  assert.match(preloadSource, /backup:/);
  assert.match(preloadSource, /contacts:/);
  assert.match(preloadSource, /dashboard:/);
  assert.match(preloadSource, /ledger:/);
  assert.match(preloadSource, /products:/);
  assert.match(preloadSource, /purchases:/);
  assert.match(preloadSource, /reports:/);
  assert.match(preloadSource, /returns:/);
  assert.match(preloadSource, /sales:/);
  assert.match(preloadSource, /security:/);
  assert.match(preloadSource, /settings:/);
  assert.match(preloadSource, /stock:/);
  assert.doesNotMatch(preloadSource, /import /);
});
