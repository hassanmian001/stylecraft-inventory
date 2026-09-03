// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardScreen from "./DashboardScreen";
import type { BackupApi, DashboardApi, DashboardSummaryDto, InvoiceApi, ProductApi, PurchaseApi, ReportsApi, SalesApi } from "@/types/stylecraft-api";

const sampleSummary: DashboardSummaryDto = {
  productCount: 12,
  totalStockQuantity: 94,
  inventoryValueCents: 125_500,
  todaySalesCents: 8_500,
  currentMonthSalesCents: 72_500,
  currentMonthProfitCents: 21_250,
  lowStockProducts: [
    { id: 1, name: "Oxford Shirt", sku: "OX-001", currentStock: 2, lowStockThreshold: 5 },
    { id: 2, name: "Denim Jacket", sku: "DJ-010", currentStock: 1, lowStockThreshold: 3 },
  ],
  bestSellingProducts: [
    { productId: 3, name: "Chino Pants", sku: "CP-200", quantitySold: 9, totalSalesCents: 35_500 },
    { productId: 1, name: "Oxford Shirt", sku: "OX-001", quantitySold: 6, totalSalesCents: 18_000 },
  ],
};

describe("DashboardScreen", () => {
  let dashboardApi: DashboardApi;
  let productsApi: ProductApi;
  let purchasesApi: PurchaseApi;
  let reportsApi: ReportsApi;
  let salesApi: SalesApi;
  let invoicesApi: InvoiceApi;
  let backupApi: BackupApi;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    dashboardApi = {
      getSummary: vi.fn().mockResolvedValue(sampleSummary),
    };
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
    reportsApi = { getReports: vi.fn().mockResolvedValue({}) } as unknown as ReportsApi;
    salesApi = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      listCustomers: vi.fn().mockResolvedValue([]),
      createCustomer: vi.fn().mockResolvedValue({}),
    } as unknown as SalesApi;
    backupApi = { getSettings: vi.fn(), updateLocation: vi.fn(), create: vi.fn(), restore: vi.fn(), chooseDirectory: vi.fn(), chooseFile: vi.fn() } as unknown as BackupApi;
    invoicesApi = { getBySaleId: vi.fn().mockResolvedValue({}) } as unknown as InvoiceApi;

    window.stylecraft = { backup: backupApi, dashboard: dashboardApi, invoices: invoicesApi, products: productsApi, purchases: purchasesApi, reports: reportsApi, sales: salesApi, settings: {} as never };
  });

  it("renders summary cards from the API", async () => {
    render(<DashboardScreen />);

    expect(await screen.findByText("Active products")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,255.00")).toBeInTheDocument();
    expect(screen.getByText("Rs. 85.00")).toBeInTheDocument();
    expect(screen.getByText("Rs. 725.00")).toBeInTheDocument();
    expect(screen.getByText("Rs. 212.50")).toBeInTheDocument();
  });

  it("renders low-stock and best-selling lists", async () => {
    render(<DashboardScreen />);

    expect(await screen.findByText("Low-stock products")).toBeInTheDocument();
    expect(screen.getAllByText("Oxford Shirt")).toHaveLength(2);
    expect(screen.getByText("2 left")).toBeInTheDocument();
    expect(screen.getByText("Chino Pants")).toBeInTheDocument();
    expect(screen.getByText("9 sold")).toBeInTheDocument();
    expect(screen.getByText("Rs. 355.00")).toBeInTheDocument();
  });

  it("shows an error when loading fails", async () => {
    dashboardApi.getSummary = vi.fn().mockRejectedValue(new Error("Dashboard unavailable"));

    render(<DashboardScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard unavailable");
  });
});
