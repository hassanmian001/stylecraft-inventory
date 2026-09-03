// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProductsScreen from "./ProductsScreen";
import type { AuditApi, BackupApi, ContactsApi, DashboardApi, InvoiceApi, ProductApi, ProductDto, PurchaseApi, ReportsApi, SalesApi, StockApi } from "@/types/stylecraft-api";

const sampleProducts: ProductDto[] = [
  {
    id: 1,
    name: "Oxford Shirt",
    sku: "OX-001",
    categoryName: "Shirts",
    purchasePriceCents: 1250,
    sellingPriceCents: 2499,
    currentStock: 3,
    lowStockThreshold: 5,
    isActive: true,
    isLowStock: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: 2,
    name: "Denim Jacket",
    sku: "DJ-010",
    categoryName: "Jackets",
    purchasePriceCents: 3500,
    sellingPriceCents: 6299,
    currentStock: 12,
    lowStockThreshold: 4,
    isActive: true,
    isLowStock: false,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

describe("ProductsScreen", () => {
  let productsApi: ProductApi;
  let purchasesApi: PurchaseApi;
  let reportsApi: ReportsApi;
  let salesApi: SalesApi;
    let invoicesApi: InvoiceApi;
    let backupApi: BackupApi;
    let dashboardApi: DashboardApi;
    let stockApi: StockApi;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    productsApi = {
      list: vi.fn().mockResolvedValue(sampleProducts),
      create: vi.fn().mockResolvedValue(sampleProducts[0]),
      update: vi.fn().mockResolvedValue(sampleProducts[0]),
      markInactive: vi.fn().mockResolvedValue({ ...sampleProducts[0], isActive: false }),
    };
    dashboardApi = { getSummary: vi.fn().mockResolvedValue({}) } as unknown as DashboardApi;
    stockApi = { adjust: vi.fn().mockResolvedValue({}) } as unknown as StockApi;
    purchasesApi = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      listSuppliers: vi.fn().mockResolvedValue([]),
      createSupplier: vi.fn().mockResolvedValue({}),
    } as unknown as PurchaseApi;
    reportsApi = { getReports: vi.fn().mockResolvedValue({}) } as unknown as ReportsApi;
    backupApi = { getSettings: vi.fn(), updateLocation: vi.fn(), create: vi.fn(), restore: vi.fn(), chooseDirectory: vi.fn(), chooseFile: vi.fn() } as unknown as BackupApi;
    invoicesApi = { getBySaleId: vi.fn().mockResolvedValue({}) } as unknown as InvoiceApi;
    salesApi = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      listCustomers: vi.fn().mockResolvedValue([]),
      createCustomer: vi.fn().mockResolvedValue({}),
    } as unknown as SalesApi;

    window.stylecraft = {
      audit: {} as AuditApi,
      backup: backupApi,
      contacts: {} as ContactsApi,
      dashboard: dashboardApi,
      invoices: invoicesApi,
      products: productsApi,
      purchases: purchasesApi,
      reports: reportsApi,
      sales: salesApi,
      settings: {} as never,
      stock: stockApi,
    };
  });

  it("renders products from the API with low-stock status", async () => {
    render(<ProductsScreen />);

    expect(await screen.findByText("Oxford Shirt")).toBeInTheDocument();
    expect(screen.getByText("Denim Jacket")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    expect(screen.getByText("Rs. 12.50")).toBeInTheDocument();
    expect(screen.getByText("Rs. 62.99")).toBeInTheDocument();
  });

  it("submits new product input with currency converted to cents", async () => {
    render(<ProductsScreen />);

    await screen.findByText("Oxford Shirt");

    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Linen Pants" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "lp-200" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Pants" } });
    fireEvent.change(screen.getByLabelText("Purchase price"), { target: { value: "18.75" } });
    fireEvent.change(screen.getByLabelText("Selling price"), { target: { value: "39.50" } });
    fireEvent.change(screen.getByLabelText("Current stock"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Low-stock threshold"), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: "Add product" }));

    await waitFor(() => {
      expect(productsApi.create).toHaveBeenCalledWith({
        name: "Linen Pants",
        sku: "lp-200",
        categoryName: "Pants",
        purchasePriceCents: 1875,
        sellingPriceCents: 3950,
        currentStock: 9,
        lowStockThreshold: 2,
        isActive: true,
      });
    });
  });

  it("submits stock adjustments with a required reason", async () => {
    render(<ProductsScreen />);

    await screen.findByText("Oxford Shirt");

    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Counted stock"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: " Physical count " } });
    fireEvent.change(screen.getByLabelText("Adjusted by"), { target: { value: " Owner " } });
    fireEvent.click(screen.getByRole("button", { name: "Adjust stock" }));

    await waitFor(() => {
      expect(stockApi.adjust).toHaveBeenCalledWith({
        productId: 1,
        newStock: 7,
        reason: "Physical count",
        actorName: "Owner",
      });
    });
  });
});
