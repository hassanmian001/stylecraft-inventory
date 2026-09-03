// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PurchasesScreen from "./PurchasesScreen";
import type { BackupApi, DashboardApi, InvoiceApi, ProductApi, ProductDto, PurchaseApi, PurchaseHistoryDto, ReportsApi, SalesApi, SupplierDto } from "@/types/stylecraft-api";

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

const sampleSuppliers: SupplierDto[] = [
  {
    id: 1,
    name: "Fabric House",
    phone: null,
    email: null,
    address: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const sampleHistory: PurchaseHistoryDto[] = [
  {
    id: 10,
    supplierId: 1,
    supplierName: "Fabric House",
    purchaseDate: new Date("2026-07-09T00:00:00.000Z"),
    totalAmountCents: 7250,
    notes: "Initial restock",
    itemCount: 2,
    createdAt: new Date("2026-07-09T00:00:00.000Z"),
    updatedAt: new Date("2026-07-09T00:00:00.000Z"),
  },
];

describe("PurchasesScreen", () => {
  let productsApi: ProductApi;
  let purchasesApi: PurchaseApi;
  let reportsApi: ReportsApi;
  let salesApi: SalesApi;
  let invoicesApi: InvoiceApi;
  let backupApi: BackupApi;
  let dashboardApi: DashboardApi;

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
    purchasesApi = {
      list: vi.fn().mockResolvedValue(sampleHistory),
      create: vi.fn().mockResolvedValue({ ...sampleHistory[0], items: [] }),
      listSuppliers: vi.fn().mockResolvedValue(sampleSuppliers),
      createSupplier: vi.fn().mockResolvedValue(sampleSuppliers[0]),
    };
    salesApi = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      listCustomers: vi.fn().mockResolvedValue([]),
      createCustomer: vi.fn().mockResolvedValue({}),
    } as unknown as SalesApi;
    reportsApi = { getReports: vi.fn().mockResolvedValue({}) } as unknown as ReportsApi;
    backupApi = { getSettings: vi.fn(), updateLocation: vi.fn(), create: vi.fn(), restore: vi.fn(), chooseDirectory: vi.fn(), chooseFile: vi.fn() } as unknown as BackupApi;
    invoicesApi = { getBySaleId: vi.fn().mockResolvedValue({}) } as unknown as InvoiceApi;

    window.stylecraft = { backup: backupApi, dashboard: dashboardApi, invoices: invoicesApi, products: productsApi, purchases: purchasesApi, reports: reportsApi, sales: salesApi, settings: {} as never };
  });

  it("renders products, suppliers, and purchase history", async () => {
    render(<PurchasesScreen />);

    expect(await screen.findAllByText("Fabric House")).toHaveLength(2);
    expect(screen.getByText("Oxford Shirt (OX-001) - stock 3")).toBeInTheDocument();
    expect(screen.getByText("Denim Jacket (DJ-010) - stock 12")).toBeInTheDocument();
    expect(screen.getByText("Initial restock")).toBeInTheDocument();
    expect(screen.getByText("Rs. 72.50")).toBeInTheDocument();
  });

  it("submits a multi-item purchase with currency converted to cents", async () => {
    render(<PurchasesScreen />);

    await screen.findByText("Initial restock");

    fireEvent.change(screen.getByLabelText("Supplier"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Purchase date"), { target: { value: "2026-07-10" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Weekly restock" } });
    fireEvent.change(screen.getByLabelText("Product 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Unit cost"), { target: { value: "12.50" } });

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    fireEvent.change(screen.getByLabelText("Product 2"), { target: { value: "2" } });
    fireEvent.change(screen.getAllByLabelText("Quantity")[1], { target: { value: "2" } });
    fireEvent.change(screen.getAllByLabelText("Unit cost")[1], { target: { value: "35.75" } });

    fireEvent.click(screen.getByRole("button", { name: "Save purchase" }));

    await waitFor(() => {
      expect(purchasesApi.create).toHaveBeenCalledWith({
        supplierId: 1,
        supplierName: null,
        purchaseDate: "2026-07-10",
        notes: "Weekly restock",
        items: [
          { productId: 1, quantity: 4, unitCostCents: 1250 },
          { productId: 2, quantity: 2, unitCostCents: 3575 },
        ],
      });
    });
  });

  it("blocks invalid quantity before calling the API", async () => {
    render(<PurchasesScreen />);

    await screen.findByText("Initial restock");

    fireEvent.change(screen.getByLabelText("Product 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save purchase" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Quantity must be a positive whole number.");
    expect(purchasesApi.create).not.toHaveBeenCalled();
  });
});
