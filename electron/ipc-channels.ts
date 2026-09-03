export const auditChannels = {
  list: "audit:list",
  create: "audit:create",
} as const;

export const backupChannels = {
  getSettings: "backup:getSettings",
  updateLocation: "backup:updateLocation",
  create: "backup:create",
  restore: "backup:restore",
  chooseDirectory: "backup:chooseDirectory",
  chooseFile: "backup:chooseFile",
} as const;

export const dashboardChannels = {
  getSummary: "dashboard:getSummary",
} as const;

export const contactsChannels = {
  listCustomers: "contacts:listCustomers",
  createCustomer: "contacts:createCustomer",
  updateCustomer: "contacts:updateCustomer",
  listSuppliers: "contacts:listSuppliers",
  createSupplier: "contacts:createSupplier",
  updateSupplier: "contacts:updateSupplier",
} as const;

export const invoiceChannels = {
  getBySaleId: "invoices:getBySaleId",
} as const;

export const productChannels = {
  list: "products:list",
  get: "products:get",
  create: "products:create",
  update: "products:update",
  markInactive: "products:markInactive",
} as const;

export const purchaseChannels = {
  list: "purchases:list",
  create: "purchases:create",
  listSuppliers: "suppliers:list",
  createSupplier: "suppliers:create",
} as const;

export const reportsChannels = {
  getReports: "reports:getReports",
} as const;

export const returnsChannels = {
  listSaleCandidates: "returns:listSaleCandidates",
  createSaleReturn: "returns:createSaleReturn",
  listSaleReturns: "returns:listSaleReturns",
  listPurchaseCandidates: "returns:listPurchaseCandidates",
  createPurchaseReturn: "returns:createPurchaseReturn",
  listPurchaseReturns: "returns:listPurchaseReturns",
} as const;

export const salesChannels = {
  list: "sales:list",
  get: "sales:get",
  create: "sales:create",
  update: "sales:update",
  listCustomers: "customers:list",
  createCustomer: "customers:create",
} as const;

export const settingsChannels = {
  getBusinessSettings: "settings:getBusinessSettings",
  updateBusinessSettings: "settings:updateBusinessSettings",
} as const;

export const ledgerChannels = {
  getSummary: "ledger:getSummary",
  getStatement: "ledger:getStatement",
  recordPayment: "ledger:recordPayment",
  deletePayment: "ledger:deletePayment",
} as const;

export const securityChannels = {
  getEditPasswordStatus: "security:getEditPasswordStatus",
  setEditPassword: "security:setEditPassword",
  clearEditPassword: "security:clearEditPassword",
  verifyEditPassword: "security:verifyEditPassword",
} as const;

export const stockChannels = {
  adjust: "stock:adjust",
} as const;

export const updateChannels = {
  check: "update:check",
} as const;
