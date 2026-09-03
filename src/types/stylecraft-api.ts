export type ProductVariantInput = {
  id?: number | null;
  size?: string | null;
  color?: string | null;
  sku: string;
  purchasePriceCents?: number | null;
  sellingPriceCents?: number | null;
  currentStock: number;
  lowStockThreshold?: number | null;
  isActive: boolean;
};

export type ProductInput = {
  name: string;
  sku: string;
  categoryName?: string | null;
  purchasePriceCents: number;
  sellingPriceCents: number;
  currentStock?: number;
  lowStockThreshold: number;
  isActive: boolean;
  variants?: ProductVariantInput[];
};

export type ProductListFilters = {
  search?: string;
  categoryName?: string | null;
  isLowStock?: boolean;
  isActive?: boolean;
};

export type ProductVariantDto = {
  id: number;
  productId: number;
  size: string | null;
  color: string | null;
  label: string;
  sku: string;
  purchasePriceCents: number;
  sellingPriceCents: number;
  purchasePriceOverrideCents: number | null;
  sellingPriceOverrideCents: number | null;
  currentStock: number;
  lowStockThreshold: number;
  lowStockThresholdOverride: number | null;
  isActive: boolean;
  isLowStock: boolean;
};

export type ProductDto = {
  id: number;
  name: string;
  sku: string;
  categoryName: string | null;
  purchasePriceCents: number;
  sellingPriceCents: number;
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLowStock: boolean;
  hasVariants: boolean;
  variants: ProductVariantDto[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProductApi = {
  list(filters?: ProductListFilters): Promise<ProductDto[]>;
  get(id: number): Promise<ProductDto>;
  create(input: ProductInput): Promise<ProductDto>;
  update(id: number, input: ProductInput): Promise<ProductDto>;
  markInactive(id: number): Promise<ProductDto>;
};

export type AuditLogInput = {
  action: string;
  entityType: string;
  entityId?: number | null;
  actorName?: string | null;
  details?: string | null;
};

export type AuditLogListFilters = {
  action?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  search?: string | null;
};

export type AuditLogDto = {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  actorName: string | null;
  details: string | null;
  createdAt: Date;
};

export type AuditApi = {
  list(filters?: AuditLogListFilters): Promise<AuditLogDto[]>;
  create(input: AuditLogInput): Promise<AuditLogDto>;
};

export type SupplierInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type SupplierDto = SupplierInput & {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseItemInput = {
  variantId: number;
  quantity: number;
  unitCostCents: number;
};

export type PurchaseInput = {
  supplierId?: number | null;
  supplierName?: string | null;
  purchaseDate: Date | string;
  amountPaidCents?: number;
  notes?: string | null;
  items: PurchaseItemInput[];
};

export type PurchaseItemDto = {
  id: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  variantSku: string | null;
  quantity: number;
  unitCostCents: number;
  totalCostCents: number;
};

export type PurchaseDetailDto = {
  id: number;
  supplierId: number | null;
  supplierName: string | null;
  purchaseDate: Date;
  totalAmountCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  notes: string | null;
  items: PurchaseItemDto[];
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseHistoryDto = {
  id: number;
  supplierId: number | null;
  supplierName: string | null;
  purchaseDate: Date;
  totalAmountCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  notes: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseApi = {
  list(): Promise<PurchaseHistoryDto[]>;
  create(input: PurchaseInput): Promise<PurchaseDetailDto>;
  listSuppliers(): Promise<SupplierDto[]>;
  createSupplier(input: SupplierInput): Promise<SupplierDto>;
};

export type CustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type CustomerDto = CustomerInput & {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type ContactListFilters = {
  search?: string;
};

export type ContactDto = ContactInput & {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactsApi = {
  listCustomers(filters?: ContactListFilters): Promise<ContactDto[]>;
  createCustomer(input: ContactInput): Promise<ContactDto>;
  updateCustomer(id: number, input: ContactInput): Promise<ContactDto>;
  listSuppliers(filters?: ContactListFilters): Promise<ContactDto[]>;
  createSupplier(input: ContactInput): Promise<ContactDto>;
  updateSupplier(id: number, input: ContactInput): Promise<ContactDto>;
};

export type SaleItemInput = {
  variantId: number;
  quantity: number;
  unitPriceCents: number;
  discountAmountCents?: number;
};

export type SaleInput = {
  customerId?: number | null;
  customerName?: string | null;
  saleDate: Date | string;
  amountPaidCents?: number;
  paymentMethod?: string | null;
  notes?: string | null;
  items: SaleItemInput[];
};

export type SaleItemDto = {
  id: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  variantSku: string | null;
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
};

export type SaleDetailDto = {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string | null;
  saleDate: Date;
  subtotalCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  paymentMethod: string | null;
  notes: string | null;
  items: SaleItemDto[];
  createdAt: Date;
  updatedAt: Date;
};

export type SaleHistoryDto = Omit<SaleDetailDto, "items"> & {
  itemCount: number;
};

export type SalesApi = {
  list(): Promise<SaleHistoryDto[]>;
  get(id: number): Promise<SaleDetailDto>;
  create(input: SaleInput): Promise<SaleDetailDto>;
  update(id: number, input: SaleInput, password: string, actorName?: string | null): Promise<SaleDetailDto>;
  listCustomers(): Promise<CustomerDto[]>;
  createCustomer(input: CustomerInput): Promise<CustomerDto>;
};

export type DashboardLowStockProductDto = {
  id: number;
  variantId: number;
  name: string;
  sku: string;
  variantLabel: string;
  currentStock: number;
  lowStockThreshold: number;
};

export type DashboardBestSellingProductDto = {
  productId: number;
  name: string;
  sku: string;
  quantitySold: number;
  totalSalesCents: number;
};

export type DashboardSummaryDto = {
  productCount: number;
  totalStockQuantity: number;
  inventoryValueCents: number;
  todaySalesCents: number;
  currentMonthSalesCents: number;
  currentMonthProfitCents: number;
  lowStockProducts: DashboardLowStockProductDto[];
  bestSellingProducts: DashboardBestSellingProductDto[];
};

export type DashboardApi = {
  getSummary(): Promise<DashboardSummaryDto>;
};

export type ReportFilters = {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

export type SalesReportRowDto = {
  id: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  itemCount: number;
  subtotalCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
  paymentMethod: string | null;
  notes: string | null;
};

export type PurchaseReportRowDto = {
  id: number;
  purchaseDate: Date;
  supplierName: string | null;
  itemCount: number;
  totalAmountCents: number;
  notes: string | null;
};

export type ProfitReportRowDto = {
  saleId: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  revenueCents: number;
  costCents: number;
  discountAmountCents: number;
  profitAmountCents: number;
};

export type StockReportRowDto = {
  productId: number;
  variantId: number;
  name: string;
  sku: string;
  variantLabel: string;
  categoryName: string | null;
  currentStock: number;
  lowStockThreshold: number;
  purchasePriceCents: number;
  sellingPriceCents: number;
  inventoryValueCents: number;
  isLowStock: boolean;
  isActive: boolean;
};

export type ReportsTotalsDto = {
  salesTotalCents: number;
  purchaseTotalCents: number;
  revenueCents: number;
  costCents: number;
  discountCents: number;
  profitCents: number;
  stockQuantity: number;
  inventoryValueCents: number;
};

export type ReportsDto = {
  filters: ReportFilters;
  salesRows: SalesReportRowDto[];
  purchaseRows: PurchaseReportRowDto[];
  profitRows: ProfitReportRowDto[];
  stockRows: StockReportRowDto[];
  totals: ReportsTotalsDto;
};

export type ReportsApi = {
  getReports(filters?: ReportFilters): Promise<ReportsDto>;
};

export type ReturnItemInput = {
  sourceItemId: number;
  quantity: number;
};

export type SaleReturnInput = {
  saleId: number;
  returnDate: Date | string;
  notes?: string | null;
  actorName?: string | null;
  items: ReturnItemInput[];
};

export type PurchaseReturnInput = {
  purchaseId: number;
  returnDate: Date | string;
  notes?: string | null;
  actorName?: string | null;
  items: ReturnItemInput[];
};

export type SaleReturnableItemDto = {
  saleItemId: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  soldQuantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  unitPriceCents: number;
  unitCostCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  profitAmountCents: number;
};

export type SaleReturnCandidateDto = {
  saleId: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  items: SaleReturnableItemDto[];
};

export type PurchaseReturnableItemDto = {
  purchaseItemId: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSku: string;
  variantLabel: string;
  purchasedQuantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  currentStock: number;
  unitCostCents: number;
  totalCostCents: number;
};

export type PurchaseReturnCandidateDto = {
  purchaseId: number;
  purchaseDate: Date;
  supplierName: string | null;
  items: PurchaseReturnableItemDto[];
};

export type SaleReturnDetailDto = {
  id: number;
  saleId: number;
  invoiceNumber: string;
  returnDate: Date;
  totalAmountCents: number;
  notes: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseReturnDetailDto = {
  id: number;
  purchaseId: number;
  returnDate: Date;
  supplierName: string | null;
  totalAmountCents: number;
  notes: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReturnsApi = {
  listSaleCandidates(): Promise<SaleReturnCandidateDto[]>;
  createSaleReturn(input: SaleReturnInput): Promise<SaleReturnDetailDto>;
  listSaleReturns(): Promise<SaleReturnDetailDto[]>;
  listPurchaseCandidates(): Promise<PurchaseReturnCandidateDto[]>;
  createPurchaseReturn(input: PurchaseReturnInput): Promise<PurchaseReturnDetailDto>;
  listPurchaseReturns(): Promise<PurchaseReturnDetailDto[]>;
};

export type InvoiceBusinessSettingsDto = {
  businessName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currencySymbol: string;
  invoicePrefix: string;
};

export type InvoiceLineItemDto = {
  id: number;
  productId: number;
  variantLabel: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
};

export type InvoiceDetailDto = {
  saleId: number;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  subtotalCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  paymentMethod: string | null;
  notes: string | null;
  business: InvoiceBusinessSettingsDto;
  items: InvoiceLineItemDto[];
};

export type InvoiceApi = {
  getBySaleId(saleId: number): Promise<InvoiceDetailDto>;
};

export type BackupSettingsDto = {
  backupLocation: string;
  isDefaultLocation: boolean;
};

export type BackupResultDto = {
  backupPath: string;
  backupDirectory: string;
  createdAt: Date;
};

export type RestoreResultDto = {
  restoredFrom: string;
  restoredAt: Date;
};

export type BackupApi = {
  getSettings(): Promise<BackupSettingsDto>;
  updateLocation(backupLocation: string): Promise<BackupSettingsDto>;
  create(): Promise<BackupResultDto>;
  restore(backupPath: string): Promise<RestoreResultDto>;
  chooseDirectory(): Promise<string | null>;
  chooseFile(): Promise<string | null>;
};

export type BusinessSettingsDto = {
  businessName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currencySymbol: string;
  invoicePrefix: string;
};

export type SettingsApi = {
  getBusinessSettings(): Promise<BusinessSettingsDto>;
  updateBusinessSettings(input: BusinessSettingsDto): Promise<BusinessSettingsDto>;
};

export type StockAdjustmentInput = {
  variantId: number;
  newStock: number;
  reason: string;
  actorName?: string | null;
};

export type StockAdjustmentDto = {
  productId: number;
  variantId: number;
  productName: string;
  productSku: string;
  variantLabel: string;
  variantSku: string;
  stockBefore: number;
  stockAfter: number;
  quantityChange: number;
  stockMovementId: number;
  auditLogId: number;
};

export type StockApi = {
  adjust(input: StockAdjustmentInput): Promise<StockAdjustmentDto>;
};

export type UpdateCheckResult =
  | { status: "dev-mode" }
  | { status: "up-to-date"; currentVersion: string }
  | { status: "update-available"; version: string }
  | { status: "already-downloaded"; version: string }
  | { status: "error"; message: string };

export type UpdateApi = {
  check(): Promise<UpdateCheckResult>;
};

export type LedgerPartyType = "customer" | "supplier";

export type PaymentInput = {
  partyType: LedgerPartyType;
  partyId: number;
  amountCents: number;
  paymentDate: Date | string;
  method?: string | null;
  notes?: string | null;
};

export type PaymentDto = {
  id: number;
  partyType: LedgerPartyType;
  partyId: number;
  direction: "in" | "out";
  amountCents: number;
  paymentDate: Date;
  method: string | null;
  notes: string | null;
  saleId: number | null;
  purchaseId: number | null;
};

export type LedgerEntryDto = {
  date: Date;
  kind: "sale" | "purchase" | "payment" | "sale_return" | "purchase_return";
  reference: string;
  description: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
};

export type LedgerPartySummaryDto = {
  partyType: LedgerPartyType;
  partyId: number;
  partyName: string;
  phone: string | null;
  invoicedCents: number;
  paidCents: number;
  returnedCents: number;
  balanceCents: number;
};

export type LedgerStatementDto = LedgerPartySummaryDto & {
  entries: LedgerEntryDto[];
};

export type LedgerSummaryDto = {
  customers: LedgerPartySummaryDto[];
  suppliers: LedgerPartySummaryDto[];
  customerReceivableCents: number;
  supplierPayableCents: number;
};

export type LedgerApi = {
  getSummary(): Promise<LedgerSummaryDto>;
  getStatement(partyType: LedgerPartyType, partyId: number): Promise<LedgerStatementDto>;
  recordPayment(input: PaymentInput): Promise<PaymentDto>;
  deletePayment(id: number): Promise<void>;
};

export type EditPasswordStatusDto = {
  isSet: boolean;
};

export type SecurityApi = {
  getEditPasswordStatus(): Promise<EditPasswordStatusDto>;
  setEditPassword(newPassword: string, currentPassword?: string | null): Promise<EditPasswordStatusDto>;
  clearEditPassword(currentPassword: string): Promise<EditPasswordStatusDto>;
  verifyEditPassword(password: string): Promise<boolean>;
};
export type StyleCraftApi = {
  audit: AuditApi;
  backup: BackupApi;
  contacts: ContactsApi;
  dashboard: DashboardApi;
  invoices: InvoiceApi;
  ledger: LedgerApi;
  products: ProductApi;
  purchases: PurchaseApi;
  reports: ReportsApi;
  returns: ReturnsApi;
  sales: SalesApi;
  security: SecurityApi;
  settings: SettingsApi;
  stock: StockApi;
  update: UpdateApi;
};
