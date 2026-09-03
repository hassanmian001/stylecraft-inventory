import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const electronDir = path.resolve("electron");
const preloadPath = path.join(electronDir, "preload.cjs");

function readIpcFiles() {
  return fs
    .readdirSync(electronDir)
    .filter((name) => name.endsWith("-ipc.ts"))
    .map((name) => fs.readFileSync(path.join(electronDir, name), "utf8"))
    .join("\n");
}

/**
 * The preload is a hand-written mirror of ipc-channels.ts, and a channel the
 * renderer invokes with no handler behind it fails only at runtime, in whichever
 * screen happens to call it. These checks catch that at build time instead.
 */
test("every channel the preload invokes has a handler registered", () => {
  const preloadSource = fs.readFileSync(preloadPath, "utf8");
  const handlerSource = readIpcFiles();

  const invoked = [...preloadSource.matchAll(/ipcRenderer\.invoke\((\w+)\.(\w+)/g)].map(([, group, member]) => `${group}.${member}`);

  assert.ok(invoked.length > 30, `expected the preload to expose many channels, found ${invoked.length}`);

  const missing = invoked.filter((channel) => !handlerSource.includes(`ipcMain.handle(${channel}`));

  assert.deepEqual(missing, [], `channels with no ipcMain.handle: ${missing.join(", ")}`);
});

/**
 * Electron throws on the second ipcMain.handle for a channel, and that rejection
 * happens during startup where nothing surfaces it — the app just comes up with
 * handlers missing. A repeated registration is always a mistake, so fail on it.
 */
test("no channel is registered twice", () => {
  const duplicates = [];

  for (const name of fs.readdirSync(electronDir).filter((entry) => entry.endsWith("-ipc.ts"))) {
    const source = fs.readFileSync(path.join(electronDir, name), "utf8");
    const registered = [...source.matchAll(/ipcMain\.handle\((\w+\.\w+)/g)].map(([, channel]) => channel);
    const seen = new Set();

    for (const channel of registered) {
      if (seen.has(channel)) {
        duplicates.push(`${name}: ${channel}`);
      }

      seen.add(channel);
    }
  }

  assert.deepEqual(duplicates, [], `channels registered more than once: ${duplicates.join(", ")}`);
});

test("channel names are unique across every group", () => {
  const channelsSource = fs.readFileSync(path.join(electronDir, "ipc-channels.ts"), "utf8");
  const names = [...channelsSource.matchAll(/"([a-z]+:[A-Za-z]+)"/g)].map(([, name]) => name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

  assert.deepEqual(duplicates, [], `duplicate wire names in ipc-channels.ts: ${duplicates.join(", ")}`);
});

test("preload channel names match ipc-channels.ts", () => {
  const preloadSource = fs.readFileSync(preloadPath, "utf8");
  const channelsSource = fs.readFileSync(path.join(electronDir, "ipc-channels.ts"), "utf8");

  // Both files spell out the wire names as string literals; they have to agree.
  const names = (source) => new Set([...source.matchAll(/"([a-z]+:[A-Za-z]+)"/g)].map(([, name]) => name));

  const fromChannels = names(channelsSource);
  const fromPreload = names(preloadSource);
  const onlyInPreload = [...fromPreload].filter((name) => !fromChannels.has(name));

  assert.deepEqual(onlyInPreload, [], `preload names not in ipc-channels.ts: ${onlyInPreload.join(", ")}`);
});

test("main registers every handler module", () => {
  const mainSource = fs.readFileSync(path.join(electronDir, "main.ts"), "utf8");
  const registrars = fs
    .readdirSync(electronDir)
    .filter((name) => name.endsWith("-ipc.ts"))
    .map((name) => fs.readFileSync(path.join(electronDir, name), "utf8"))
    .flatMap((source) => [...source.matchAll(/export function (register\w+Handlers)/g)].map(([, fn]) => fn));

  const unregistered = registrars.filter((fn) => !mainSource.includes(`${fn}(ipcMain`));

  assert.deepEqual(unregistered, [], `handler modules never registered in main.ts: ${unregistered.join(", ")}`);
});
