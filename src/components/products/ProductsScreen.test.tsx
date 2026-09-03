// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProductsScreen from "./ProductsScreen";
import type { AuditApi, BackupApi, ContactsApi, DashboardApi, InvoiceApi, ProductApi, ProductDto, ProductVariantDto, PurchaseApi, ReportsApi, SalesApi, StockApi } from "@/types/stylecraft-api";

function makeVariant(overrides: Partial<ProductVariantDto> & Pick<ProductVariantDto, "id" | "productId" | "sku">): ProductVariantDto {
  return {
    size: null,
    color: null,
    label: "Standard",
    purchasePriceCents: 1250,
    sellingPriceCents: 2499,
    purchasePriceOverrideCents: null,
    sellingPriceOverrideCents: null,
    currentStock: 0,
    lowStockThreshold: 5,
    lowStockThresholdOverride: null,
    isActive: true,
    isLowStock: false,
    ...overrides,
  };
}

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
    hasVariants: true,
    variants: [
      makeVariant({ id: 11, productId: 1, sku: "OX-001-S", size: "S", label: "S", currentStock: 1, isLowStock: true }),
      makeVariant({ id: 12, productId: 1, sku: "OX-001-M", size: "M", label: "M", currentStock: 2, isLowStock: true }),
    ],
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
    hasVariants: false,
    variants: [makeVariant({ id: 21, productId: 2, sku: "DJ-010", currentStock: 12, purchasePriceCents: 3500, sellingPriceCents: 6299, lowStockThreshold: 4 })],
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
      get: vi.fn().mockResolvedValue(sampleProducts[0]),
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
      ledger: {} as never,
      products: productsApi,
      purchases: purchasesApi,
      reports: reportsApi,
      sales: salesApi,
      security: {} as never,
      settings: {} as never,
      update: {} as never,
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

  it("shows the stock held by each size", async () => {
    render(<ProductsScreen />);

    await screen.findByText("Oxford Shirt");

    expect(screen.getByText("S 1")).toBeInTheDocument();
    expect(screen.getByText("M 2")).toBeInTheDocument();
  });

  it("submits a plain product as a single standard variant", async () => {
    render(<ProductsScreen />);

    await screen.findByText("Oxford Shirt");

    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Linen Pants" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "lp-200" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Pants" } });
    fireEvent.change(screen.getByLabelText("Purchase price"), { target: { value: "18.75" } });
    fireEvent.change(screen.getByLabelText("Selling price"), { target: { value: "39.50" } });
    fireEvent.change(screen.getByLabelText("Alert at stock"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Variant stock"), { target: { value: "9" } });

    fireEvent.click(screen.getByRole("button", { name: "Add product" }));

    await waitFor(() => {
      expect(productsApi.create).toHaveBeenCalledWith({
        name: "Linen Pants",
        sku: "lp-200",
        categoryName: "Pants",
        purchasePriceCents: 1875,
        sellingPriceCents: 3950,
        lowStockThreshold: 2,
        isActive: true,
        variants: [
          {
            id: null,
            size: null,
            color: null,
            sku: "LP-200",
            currentStock: 9,
            purchasePriceCents: null,
            sellingPriceCents: null,
            lowStockThreshold: null,
            isActive: true,
          },
        ],
      });
    });
  });

  it("submits a product with two sizes and a price override on one", async () => {
    render(<ProductsScreen />);

    await screen.findByText("Oxford Shirt");

    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Hoodie" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "HOOD" } });
    fireEvent.change(screen.getByLabelText("Purchase price"), { target: { value: "15.00" } });
    fireEvent.change(screen.getByLabelText("Selling price"), { target: { value: "25.00" } });
    fireEvent.change(screen.getByLabelText("Alert at stock"), { target: { value: "2" } });

    fireEvent.change(screen.getAllByLabelText("Size")[0], { target: { value: "L" } });
    fireEvent.change(screen.getAllByLabelText("Colour")[0], { target: { value: "Black" } });
    fireEvent.change(screen.getAllByLabelText("Variant stock")[0], { target: { value: "6" } });

    fireEvent.click(screen.getByRole("button", { name: "Add size/colour" }));

    fireEvent.change(screen.getAllByLabelText("Size")[1], { target: { value: "XXL" } });
    fireEvent.change(screen.getAllByLabelText("Colour")[1], { target: { value: "Black" } });
    fireEvent.change(screen.getAllByLabelText("Variant stock")[1], { target: { value: "2" } });
    fireEvent.change(screen.getAllByLabelText("Variant selling price")[1], { target: { value: "32.00" } });

    fireEvent.click(screen.getByRole("button", { name: "Add product" }));

    await waitFor(() => {
      expect(productsApi.create).toHaveBeenCalled();
    });

    const submitted = vi.mocked(productsApi.create).mock.calls[0][0];

    expect(submitted.variants).toEqual([
      { id: null, size: "L", color: "Black", sku: "HOOD-L-BLACK", currentStock: 6, purchasePriceCents: null, sellingPriceCents: null, lowStockThreshold: null, isActive: true },
      { id: null, size: "XXL", color: "Black", sku: "HOOD-XXL-BLACK", currentStock: 2, purchasePriceCents: null, sellingPriceCents: 3200, lowStockThreshold: null, isActive: true },
    ]);
  });

  it("opens a product for editing when its row is clicked", async () => {
    render(<ProductsScreen />);

    const row = (await screen.findByText("Oxford Shirt")).closest("tr");
    expect(row).not.toBeNull();

    fireEvent.click(row as HTMLElement);

    expect(await screen.findByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(screen.getByLabelText("Product name")).toHaveValue("Oxford Shirt");
    expect(screen.getAllByLabelText("Size").map((input) => (input as HTMLInputElement).value)).toEqual(["S", "M"]);
  });

  it("submits stock adjustments against a size with a required reason", async () => {
    render(<ProductsScreen />);

    await screen.findByText("Oxford Shirt");

    fireEvent.change(screen.getByLabelText("Product size/colour"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Counted stock"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: " Physical count " } });
    fireEvent.change(screen.getByLabelText("Adjusted by"), { target: { value: " Owner " } });
    fireEvent.click(screen.getByRole("button", { name: "Adjust stock" }));

    await waitFor(() => {
      expect(stockApi.adjust).toHaveBeenCalledWith({
        variantId: 12,
        newStock: 7,
        reason: "Physical count",
        actorName: "Owner",
      });
    });
  });
});
