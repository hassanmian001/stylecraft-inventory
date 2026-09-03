import { app, dialog } from "electron";
import type { BrowserWindow } from "electron";
import electronUpdater from "electron-updater";

import type { UpdateCheckResult } from "../src/types/stylecraft-api.js";

const { autoUpdater } = electronUpdater;

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let promptOpen = false;
let intervalHandle: NodeJS.Timeout | undefined;
let downloadedVersion: string | undefined;
let configured = false;

async function promptRestart(window: BrowserWindow | undefined, version: string) {
  if (promptOpen) {
    return;
  }

  promptOpen = true;

  const options = {
    type: "info" as const,
    buttons: ["Abhi restart karein", "Baad mein"],
    defaultId: 0,
    cancelId: 1,
    title: "Update tayyar hai",
    message: `StyleCraft Inventory ${version} download ho chuka hai.`,
    detail: "Restart karne par naya version install ho jayega. Aap chahen to baad mein bhi kar sakte hain — app band karte waqt khud install ho jayega.",
  };

  const { response } = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options);

  promptOpen = false;

  if (response === 0) {
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
  }
}

function checkQuietly() {
  autoUpdater.checkForUpdates().catch((error: unknown) => {
    console.warn("[updater] check failed:", error);
  });
}

function configureAutoUpdater() {
  if (configured) {
    return;
  }

  configured = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    console.warn("[updater] error:", error);
  });

  autoUpdater.on("update-downloaded", (info) => {
    downloadedVersion = info.version;
  });
}

export function initAutoUpdater(getWindow: () => BrowserWindow | undefined) {
  if (!app.isPackaged) {
    return;
  }

  configureAutoUpdater();

  autoUpdater.on("update-downloaded", (info) => {
    void promptRestart(getWindow(), info.version);
  });

  checkQuietly();

  intervalHandle = setInterval(checkQuietly, CHECK_INTERVAL_MS);

  app.on("before-quit", () => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = undefined;
    }
  });
}

export async function checkForUpdatesManually(getWindow: () => BrowserWindow | undefined): Promise<UpdateCheckResult> {
  if (!app.isPackaged) {
    return { status: "dev-mode" };
  }

  configureAutoUpdater();

  if (downloadedVersion) {
    void promptRestart(getWindow(), downloadedVersion);
    return { status: "already-downloaded", version: downloadedVersion };
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      autoUpdater.off("update-available", onAvailable);
      autoUpdater.off("update-not-available", onNotAvailable);
      autoUpdater.off("error", onError);
    };

    const onAvailable = (info: { version: string }) => {
      cleanup();
      resolve({ status: "update-available", version: info.version });
    };

    const onNotAvailable = () => {
      cleanup();
      resolve({ status: "up-to-date", currentVersion: app.getVersion() });
    };

    const onError = (error: Error) => {
      cleanup();
      resolve({ status: "error", message: error.message });
    };

    autoUpdater.once("update-available", onAvailable);
    autoUpdater.once("update-not-available", onNotAvailable);
    autoUpdater.once("error", onError);

    autoUpdater.checkForUpdates().catch(onError);
  });
}
