import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerAuditHandlers } from "./audit-ipc.js";
import { registerBackupHandlers } from "./backup-ipc.js";
import { registerContactsHandlers } from "./contacts-ipc.js";
import { registerDashboardHandlers } from "./dashboard-ipc.js";
import { registerInvoiceHandlers } from "./invoices-ipc.js";
import { registerProductHandlers } from "./products-ipc.js";
import { registerPurchaseHandlers } from "./purchases-ipc.js";
import { registerReportsHandlers } from "./reports-ipc.js";
import { registerReturnsHandlers } from "./returns-ipc.js";
import { getRendererTarget } from "./renderer-target.js";
import { registerSalesHandlers } from "./sales-ipc.js";
import { registerSettingsHandlers } from "./settings-ipc.js";
import { registerStockHandlers } from "./stock-ipc.js";
import { registerUpdateHandlers } from "./update-ipc.js";
import { initAutoUpdater } from "./updater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | undefined;

function configureRuntimePaths() {
  process.env.STYLECRAFT_DATA_DIR ??= app.getPath("userData");
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "StyleCraft Inventory",
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = window;
  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = undefined;
    }
  });

  const rendererTarget = getRendererTarget(
    process.env.VITE_DEV_SERVER_URL,
    path.join(__dirname, "../../dist/index.html"),
  );

  if (rendererTarget.type === "url") {
    void window.loadURL(rendererTarget.value);
    window.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void window.loadFile(rendererTarget.value);
}

void app.whenReady().then(() => {
  configureRuntimePaths();
  registerAuditHandlers(ipcMain);
  registerBackupHandlers(ipcMain);
  registerContactsHandlers(ipcMain);
  registerDashboardHandlers(ipcMain);
  registerInvoiceHandlers(ipcMain);
  registerProductHandlers(ipcMain);
  registerPurchaseHandlers(ipcMain);
  registerReportsHandlers(ipcMain);
  registerReturnsHandlers(ipcMain);
  registerSalesHandlers(ipcMain);
  registerSettingsHandlers(ipcMain);
  registerStockHandlers(ipcMain);
  registerUpdateHandlers(ipcMain, () => mainWindow);
  createWindow();
  initAutoUpdater(() => mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
