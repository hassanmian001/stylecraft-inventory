const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const electronExe = path.resolve("node_modules", "electron", "dist", process.platform === "win32" ? "electron.exe" : "electron");
const probeScript = path.resolve("scripts", "probe-packaged-sqlite.cjs");
const nativeModulePath = path.resolve(
  "release",
  "win-unpacked",
  "resources",
  "app.asar.unpacked",
  "node_modules",
  "better-sqlite3",
  "build",
  "Release",
  "better_sqlite3.node",
);

if (!fs.existsSync(electronExe)) {
  throw new Error(`Electron executable was not found: ${electronExe}`);
}

if (!fs.existsSync(nativeModulePath)) {
  throw new Error(`Packaged better-sqlite3 native module was not found: ${nativeModulePath}`);
}

const result = spawnSync(electronExe, [probeScript, nativeModulePath], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.stdout.write(result.stdout);
  throw new Error("Packaged better-sqlite3 native module is not compatible with Electron.");
}

process.stdout.write(result.stdout);
