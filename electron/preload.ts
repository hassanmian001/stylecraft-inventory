import { contextBridge, ipcRenderer } from "electron";

import { auditChannels, backupChannels, contactsChannels, dashboardChannels, invoiceChannels, productChannels, purchaseChannels, reportsChannels, returnsChannels, salesChannels, settingsChannels, stockChannels, updateChannels } from "./ipc-channels.js";
import type { StyleCraftApi } from "../src/types/stylecraft-api.js";

const stylecraftApi: StyleCraftApi = {
  audit: {
    list: (filters) => ipcRenderer.invoke(auditChannels.list, filters),
    create: (input) => ipcRenderer.invoke(auditChannels.create, input),
  },
  backup: {
    getSettings: () => ipcRenderer.invoke(backupChannels.getSettings),
    updateLocation: (backupLocation) => ipcRenderer.invoke(backupChannels.updateLocation, backupLocation),
    create: () => ipcRenderer.invoke(backupChannels.create),
    restore: (backupPath) => ipcRenderer.invoke(backupChannels.restore, backupPath),
    chooseDirectory: () => ipcRenderer.invoke(backupChannels.chooseDirectory),
    chooseFile: () => ipcRenderer.invoke(backupChannels.chooseFile),
  },
  contacts: {
    listCustomers: (filters) => ipcRenderer.invoke(contactsChannels.listCustomers, filters),
    createCustomer: (input) => ipcRenderer.invoke(contactsChannels.createCustomer, input),
    updateCustomer: (id, input) => ipcRenderer.invoke(contactsChannels.updateCustomer, id, input),
    listSuppliers: (filters) => ipcRenderer.invoke(contactsChannels.listSuppliers, filters),
    createSupplier: (input) => ipcRenderer.invoke(contactsChannels.createSupplier, input),
    updateSupplier: (id, input) => ipcRenderer.invoke(contactsChannels.updateSupplier, id, input),
  },
  dashboard: {
    getSummary: () => ipcRenderer.invoke(dashboardChannels.getSummary),
  },
  invoices: {
    getBySaleId: (saleId) => ipcRenderer.invoke(invoiceChannels.getBySaleId, saleId),
  },
  products: {
    list: (filters) => ipcRenderer.invoke(productChannels.list, filters),
    create: (input) => ipcRenderer.invoke(productChannels.create, input),
    update: (id, input) => ipcRenderer.invoke(productChannels.update, id, input),
    markInactive: (id) => ipcRenderer.invoke(productChannels.markInactive, id),
  },
  purchases: {
    list: () => ipcRenderer.invoke(purchaseChannels.list),
    create: (input) => ipcRenderer.invoke(purchaseChannels.create, input),
    listSuppliers: () => ipcRenderer.invoke(purchaseChannels.listSuppliers),
    createSupplier: (input) => ipcRenderer.invoke(purchaseChannels.createSupplier, input),
  },
  reports: {
    getReports: (filters) => ipcRenderer.invoke(reportsChannels.getReports, filters),
  },
  returns: {
    listSaleCandidates: () => ipcRenderer.invoke(returnsChannels.listSaleCandidates),
    createSaleReturn: (input) => ipcRenderer.invoke(returnsChannels.createSaleReturn, input),
    listSaleReturns: () => ipcRenderer.invoke(returnsChannels.listSaleReturns),
    listPurchaseCandidates: () => ipcRenderer.invoke(returnsChannels.listPurchaseCandidates),
    createPurchaseReturn: (input) => ipcRenderer.invoke(returnsChannels.createPurchaseReturn, input),
    listPurchaseReturns: () => ipcRenderer.invoke(returnsChannels.listPurchaseReturns),
  },
  sales: {
    list: () => ipcRenderer.invoke(salesChannels.list),
    create: (input) => ipcRenderer.invoke(salesChannels.create, input),
    listCustomers: () => ipcRenderer.invoke(salesChannels.listCustomers),
    createCustomer: (input) => ipcRenderer.invoke(salesChannels.createCustomer, input),
  },
  settings: {
    getBusinessSettings: () => ipcRenderer.invoke(settingsChannels.getBusinessSettings),
    updateBusinessSettings: (input) => ipcRenderer.invoke(settingsChannels.updateBusinessSettings, input),
  },
  stock: {
    adjust: (input) => ipcRenderer.invoke(stockChannels.adjust, input),
  },
  update: {
    check: () => ipcRenderer.invoke(updateChannels.check),
  },
};

contextBridge.exposeInMainWorld("stylecraft", stylecraftApi);
