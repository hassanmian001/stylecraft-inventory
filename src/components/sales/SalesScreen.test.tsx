// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SalesScreen from "./SalesScreen";
import type { BackupApi, CustomerDto, DashboardApi, InvoiceApi, InvoiceDetailDto, ProductApi, ProductDto, PurchaseApi, ReportsApi, SaleHistoryDto, SalesApi } from "@/types/stylecraft-api";

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

const sampleCustomers: CustomerDto[] = [
  {
    id: 1,
    name: "Jane Buyer",
    phone: null,
    email: null,
    address: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const sampleHistory: SaleHistoryDto[] = [
  {
    id: 10,
    invoiceNumber: "INV-000010",
    customerId: 1,
    customerName: "Jane Buyer",
    saleDate: new Date("2026-07-09T00:00:00.000Z"),
    subtotalCents: 8250,
    discountAmountCents: 1000,
    totalAmountCents: 7250,
    profitAmountCents: 2500,
    paymentMethod: "Cash",
    notes: "Counter sale",
    itemCount: 2,
    createdAt: new Date("2026-07-09T00:00:00.000Z"),
    updatedAt: new Date("2026-07-09T00:00:00.000Z"),
  },
];

const sampleInvoice: InvoiceDetailDto = {
  saleId: 10,
  invoiceNumber: "INV-000010",
  saleDate: new Date("2026-07-09T00:00:00.000Z"),
  customerName: "Jane Buyer",
  customerPhone: "555-0102",
  customerEmail: "jane@example.com",
  customerAddress: "12 Market Street",
  subtotalCents: 8250,
  discountAmountCents: 1000,
  totalAmountCents: 7250,
  paymentMethod: "Cash",
  notes: "Counter sale",
  business: {
    businessName: "StyleCraft Studio",
    phone: "555-0100",
    email: "hello@stylecraft.test",
    address: "1 Main Street",
    currencySymbol: "Rs.",
    invoicePrefix: "INV",
  },
  items: [
    {
      id: 1,
      productId: 1,
      productName: "Oxford Shirt",
      productSku: "OX-001",
      quantity: 2,
      unitPriceCents: 2499,
      discountAmountCents: 1000,
      totalAmountCents: 3998,
    },
    {
      id: 2,
      productId: 2,
      productName: "Denim Jacket",
      productSku: "DJ-010",
      quantity: 1,
      unitPriceCents: 4252,
      discountAmountCents: 0,
      totalAmountCents: 4252,
    },
  ],
};

describe("SalesScreen", () => {
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
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      listSuppliers: vi.fn().mockResolvedValue([]),
      createSupplier: vi.fn().mockResolvedValue({}),
    } as unknown as PurchaseApi;
    salesApi = {
      list: vi.fn().mockResolvedValue(sampleHistory),
      create: vi.fn().mockResolvedValue({ ...sampleHistory[0], items: [] }),
      listCustomers: vi.fn().mockResolvedValue(sampleCustomers),
      createCustomer: vi.fn().mockResolvedValue(sampleCustomers[0]),
    };
    reportsApi = { getReports: vi.fn().mockResolvedValue({}) } as unknown as ReportsApi;
    backupApi = { getSettings: vi.fn(), updateLocation: vi.fn(), create: vi.fn(), restore: vi.fn(), chooseDirectory: vi.fn(), chooseFile: vi.fn() } as unknown as BackupApi;
    invoicesApi = { getBySaleId: vi.fn().mockResolvedValue(sampleInvoice) };

    window.stylecraft = { backup: backupApi, dashboard: dashboardApi, invoices: invoicesApi, products: productsApi, purchases: purchasesApi, reports: reportsApi, sales: salesApi, settings: {} as never };
  });

  it("renders products, customers, and sale history", async () => {
    render(<SalesScreen />);

    expect(await screen.findAllByText("Jane Buyer")).toHaveLength(2);
    expect(screen.getByText("Oxford Shirt (OX-001) - stock 3")).toBeInTheDocument();
    expect(screen.getByText("Denim Jacket (DJ-010) - stock 12")).toBeInTheDocument();
    expect(screen.getByText("INV-000010")).toBeInTheDocument();
    expect(screen.getByText("Counter sale")).toBeInTheDocument();
    expect(screen.getByText("Rs. 72.50")).toBeInTheDocument();
    expect(screen.getByText("Rs. 25.00")).toBeInTheDocument();
  });

  it("submits a multi-item sale with currency converted to cents", async () => {
    render(<SalesScreen />);

    await screen.findByText("INV-000010");

    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Sale date"), { target: { value: "2026-07-10" } });
    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "Card" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Weekend sale" } });
    fireEvent.change(screen.getByLabelText("Product 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Unit price"), { target: { value: "24.99" } });
    fireEvent.change(screen.getByLabelText("Discount"), { target: { value: "1.50" } });

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    fireEvent.change(screen.getByLabelText("Product 2"), { target: { value: "2" } });
    fireEvent.change(screen.getAllByLabelText("Quantity")[1], { target: { value: "1" } });
    fireEvent.change(screen.getAllByLabelText("Unit price")[1], { target: { value: "62.99" } });
    fireEvent.change(screen.getAllByLabelText("Discount")[1], { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: "Save sale" }));

    await waitFor(() => {
      expect(salesApi.create).toHaveBeenCalledWith({
        customerId: 1,
        customerName: null,
        saleDate: "2026-07-10",
        paymentMethod: "Card",
        notes: "Weekend sale",
        items: [
          { productId: 1, quantity: 2, unitPriceCents: 2499, discountAmountCents: 150 },
          { productId: 2, quantity: 1, unitPriceCents: 6299, discountAmountCents: 0 },
        ],
      });
    });
  });

  it("blocks invalid quantity before calling the API", async () => {
    render(<SalesScreen />);

    await screen.findByText("INV-000010");

    fireEvent.change(screen.getByLabelText("Product 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save sale" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Quantity must be a positive whole number.");
    expect(salesApi.create).not.toHaveBeenCalled();
  });

  it("loads and displays an invoice preview from sale history", async () => {
    render(<SalesScreen />);

    await screen.findByText("INV-000010");
    fireEvent.click(screen.getByRole("button", { name: "View invoice" }));

    expect(await screen.findByRole("region", { name: "Invoice preview" })).toBeInTheDocument();
    expect(invoicesApi.getBySaleId).toHaveBeenCalledWith(10);
    expect(screen.getByText("Invoice INV-000010")).toBeInTheDocument();
    expect(screen.getByText("StyleCraft Studio")).toBeInTheDocument();
    expect(screen.getByText("Oxford Shirt")).toBeInTheDocument();
    expect(screen.getAllByText("Rs. 72.50")).not.toHaveLength(0);
  });
});
