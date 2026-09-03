import { app, dialog } from "electron";
import type { BrowserWindow } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let promptOpen = false;
let intervalHandle: NodeJS.Timeout | undefined;

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
    detail: "Restart karne par naya version install ho jayega. Aap chahen to baad mein bhi kar sakte hain \u2014 app band karte waqt khud install ho jayega.",
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

export function initAutoUpdater(getWindow: () => BrowserWindow | undefined) {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    console.warn("[updater] error:", error);
  });

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
