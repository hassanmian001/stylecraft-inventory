const { contextBridge, ipcRenderer } = require("electron");

const auditChannels = {
  list: "audit:list",
  create: "audit:create",
};

const backupChannels = {
  getSettings: "backup:getSettings",
  updateLocation: "backup:updateLocation",
  create: "backup:create",
  restore: "backup:restore",
  chooseDirectory: "backup:chooseDirectory",
  chooseFile: "backup:chooseFile",
};

const dashboardChannels = {
  getSummary: "dashboard:getSummary",
};

const contactsChannels = {
  listCustomers: "contacts:listCustomers",
  createCustomer: "contacts:createCustomer",
  updateCustomer: "contacts:updateCustomer",
  listSuppliers: "contacts:listSuppliers",
  createSupplier: "contacts:createSupplier",
  updateSupplier: "contacts:updateSupplier",
};

const invoiceChannels = {
  getBySaleId: "invoices:getBySaleId",
};

const productChannels = {
  list: "products:list",
  create: "products:create",
  update: "products:update",
  markInactive: "products:markInactive",
};

const purchaseChannels = {
  list: "purchases:list",
  create: "purchases:create",
  listSuppliers: "suppliers:list",
  createSupplier: "suppliers:create",
};

const reportsChannels = {
  getReports: "reports:getReports",
};

const returnsChannels = {
  listSaleCandidates: "returns:listSaleCandidates",
  createSaleReturn: "returns:createSaleReturn",
  listSaleReturns: "returns:listSaleReturns",
  listPurchaseCandidates: "returns:listPurchaseCandidates",
  createPurchaseReturn: "returns:createPurchaseReturn",
  listPurchaseReturns: "returns:listPurchaseReturns",
};

const salesChannels = {
  list: "sales:list",
  create: "sales:create",
  listCustomers: "customers:list",
  createCustomer: "customers:create",
};

const settingsChannels = {
  getBusinessSettings: "settings:getBusinessSettings",
  updateBusinessSettings: "settings:updateBusinessSettings",
};

const stockChannels = {
  adjust: "stock:adjust",
};

const updateChannels = {
  check: "update:check",
};

const stylecraftApi = {
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
