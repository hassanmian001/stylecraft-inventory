// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ReportsScreen from "./ReportsScreen";
import type { BackupApi, DashboardApi, InvoiceApi, ProductApi, PurchaseApi, ReportsApi, ReportsDto, SalesApi } from "@/types/stylecraft-api";

const sampleReports: ReportsDto = {
  filters: {},
  salesRows: [
    {
      id: 1,
      invoiceNumber: "INV-000001",
      saleDate: new Date("2026-07-09T00:00:00.000Z"),
      customerName: "Jane Buyer",
      itemCount: 2,
      subtotalCents: 6000,
      discountAmountCents: 100,
      totalAmountCents: 5900,
      profitAmountCents: 1900,
      paymentMethod: "Cash",
      notes: "Included sale",
    },
  ],
  purchaseRows: [
    {
      id: 1,
      purchaseDate: new Date("2026-07-09T00:00:00.000Z"),
      supplierName: "Fabric House",
      itemCount: 2,
      totalAmountCents: 8000,
      notes: "Included purchase",
    },
  ],
  profitRows: [
    {
      saleId: 1,
      invoiceNumber: "INV-000001",
      saleDate: new Date("2026-07-09T00:00:00.000Z"),
      customerName: "Jane Buyer",
      revenueCents: 5900,
      costCents: 4000,
      discountAmountCents: 100,
      profitAmountCents: 1900,
    },
  ],
  stockRows: [
    {
      productId: 1,
      name: "Oxford Shirt",
      sku: "SHIRT",
      categoryName: "Apparel",
      currentStock: 7,
      lowStockThreshold: 2,
      purchasePriceCents: 1000,
      sellingPriceCents: 1500,
      inventoryValueCents: 7000,
      isLowStock: false,
      isActive: true,
    },
  ],
  totals: {
    salesTotalCents: 5900,
    purchaseTotalCents: 8000,
    revenueCents: 5900,
    costCents: 4000,
    discountCents: 100,
    profitCents: 1900,
    stockQuantity: 7,
    inventoryValueCents: 7000,
  },
};

describe("ReportsScreen", () => {
  let dashboardApi: DashboardApi;
  let productsApi: ProductApi;
  let purchasesApi: PurchaseApi;
  let reportsApi: ReportsApi;
  let salesApi: SalesApi;
  let invoicesApi: InvoiceApi;
  let backupApi: BackupApi;
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;
  let openedWindow: { document: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }; focus: ReturnType<typeof vi.fn>; print: ReturnType<typeof vi.fn> };

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    dashboardApi = { getSummary: vi.fn().mockResolvedValue({}) } as unknown as DashboardApi;
    productsApi = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      markInactive: vi.fn().mockResolvedValue({}),
    } as unknown as ProductApi;
    purchasesApi = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      listSuppliers: vi.fn().mockResolvedValue([]),
      createSupplier: vi.fn().mockResolvedValue({}),
    } as unknown as PurchaseApi;
    reportsApi = {
      getReports: vi.fn().mockResolvedValue(sampleReports),
    };
    salesApi = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      listCustomers: vi.fn().mockResolvedValue([]),
      createCustomer: vi.fn().mockResolvedValue({}),
    } as unknown as SalesApi;
    backupApi = { getSettings: vi.fn(), updateLocation: vi.fn(), create: vi.fn(), restore: vi.fn(), chooseDirectory: vi.fn(), chooseFile: vi.fn() } as unknown as BackupApi;
    invoicesApi = { getBySaleId: vi.fn().mockResolvedValue({}) } as unknown as InvoiceApi;
    createObjectUrl = vi.fn().mockReturnValue("blob:reports");
    revokeObjectUrl = vi.fn();
    openedWindow = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };

    Object.defineProperty(window.URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    vi.spyOn(window, "open").mockReturnValue(openedWindow as unknown as Window);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    window.stylecraft = { backup: backupApi, dashboard: dashboardApi, invoices: invoicesApi, products: productsApi, purchases: purchasesApi, reports: reportsApi, sales: salesApi, settings: {} as never, update: {} as never };
  });

  it("renders sales report data from the API", async () => {
    render(<ReportsScreen />);

    expect(await screen.findByText("Sales Report")).toBeInTheDocument();
    expect(screen.getByText("INV-000001")).toBeInTheDocument();
    expect(screen.getByText("Jane Buyer")).toBeInTheDocument();
    expect(screen.getAllByText("Rs. 59.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rs. 19.00").length).toBeGreaterThan(0);
  });

  it("reloads reports when date filters change", async () => {
    render(<ReportsScreen />);

    await screen.findByText("Sales Report");
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-07-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-07-31" } });

    await waitFor(() => {
      expect(reportsApi.getReports).toHaveBeenLastCalledWith({ startDate: "2026-07-01", endDate: "2026-07-31" });
    });
  });

  it("exports the active report as CSV", async () => {
    render(<ReportsScreen />);

    await screen.findByText("Sales Report");
    fireEvent.click(screen.getByRole("button", { name: /Export Excel CSV/ }));

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:reports");
  });

  it("opens a printable report window for PDF export", async () => {
    render(<ReportsScreen />);

    await screen.findByText("Sales Report");
    fireEvent.click(screen.getByRole("button", { name: /Print \/ Save PDF/ }));

    expect(window.open).toHaveBeenCalled();
    expect(openedWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("Sales Report"));
    expect(openedWindow.print).toHaveBeenCalled();
  });
});
