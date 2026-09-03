// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ReturnsScreen from "./ReturnsScreen";
import type { ReturnsApi, StyleCraftApi } from "@/types/stylecraft-api";

describe("ReturnsScreen", () => {
  let returnsApi: ReturnsApi;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    returnsApi = {
      listSaleCandidates: vi.fn().mockResolvedValue([
        {
          saleId: 10,
          invoiceNumber: "INV-000010",
          saleDate: new Date(2026, 6, 9),
          customerName: "Jane Buyer",
          items: [
            {
              saleItemId: 100,
              productId: 1,
              productName: "Oxford Shirt",
              productSku: "OX-001",
              soldQuantity: 2,
              returnedQuantity: 0,
              returnableQuantity: 2,
              unitPriceCents: 2499,
              unitCostCents: 1250,
              discountAmountCents: 0,
              totalAmountCents: 4998,
              profitAmountCents: 2498,
            },
          ],
        },
      ]),
      createSaleReturn: vi.fn().mockResolvedValue({}),
      listSaleReturns: vi.fn().mockResolvedValue([
        {
          id: 1,
          saleId: 10,
          invoiceNumber: "INV-000010",
          returnDate: new Date(2026, 6, 10),
          totalAmountCents: 2499,
          notes: "Size exchange",
          itemCount: 1,
          createdAt: new Date(2026, 6, 10),
          updatedAt: new Date(2026, 6, 10),
        },
      ]),
      listPurchaseCandidates: vi.fn().mockResolvedValue([
        {
          purchaseId: 20,
          purchaseDate: new Date(2026, 6, 8),
          supplierName: "Fabric House",
          items: [
            {
              purchaseItemId: 200,
              productId: 2,
              productName: "Denim Jacket",
              productSku: "DJ-010",
              purchasedQuantity: 4,
              returnedQuantity: 0,
              returnableQuantity: 4,
              currentStock: 9,
              unitCostCents: 3500,
              totalCostCents: 14_000,
            },
          ],
        },
      ]),
      createPurchaseReturn: vi.fn().mockResolvedValue({}),
      listPurchaseReturns: vi.fn().mockResolvedValue([]),
    };

    window.stylecraft = {
      audit: {} as never,
      backup: {} as never,
      contacts: {} as never,
      dashboard: {} as never,
      invoices: {} as never,
      products: {} as never,
      purchases: {} as never,
      reports: {} as never,
      returns: returnsApi,
      sales: {} as never,
      settings: {} as never,
      update: {} as never,
      stock: {} as never,
    } satisfies StyleCraftApi;
  });

  it("renders sale return candidates and history", async () => {
    render(<ReturnsScreen />);

    expect(await screen.findByText("INV-000010 - Jane Buyer - Jul 9, 2026")).toBeInTheDocument();
    expect(screen.getByText("Size exchange")).toBeInTheDocument();
    expect(screen.getByText("Rs. 24.99")).toBeInTheDocument();
  });

  it("submits a sales return", async () => {
    render(<ReturnsScreen />);

    await screen.findByText("INV-000010 - Jane Buyer - Jul 9, 2026");
    fireEvent.change(screen.getByLabelText("Sale"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Item"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Return date"), { target: { value: "2026-07-11" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: " Customer return " } });
    fireEvent.change(screen.getByLabelText("Processed by"), { target: { value: " Owner " } });
    fireEvent.click(screen.getByRole("button", { name: "Save sales return" }));

    await waitFor(() => {
      expect(returnsApi.createSaleReturn).toHaveBeenCalledWith({
        saleId: 10,
        returnDate: "2026-07-11",
        notes: "Customer return",
        actorName: "Owner",
        items: [{ sourceItemId: 100, quantity: 1 }],
      });
    });
  });

  it("submits a purchase return", async () => {
    render(<ReturnsScreen />);

    await screen.findByText("INV-000010 - Jane Buyer - Jul 9, 2026");
    fireEvent.click(screen.getByRole("button", { name: "Purchase returns" }));
    fireEvent.change(screen.getByLabelText("Purchase"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Item"), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Return date"), { target: { value: "2026-07-12" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Damaged batch" } });
    fireEvent.click(screen.getByRole("button", { name: "Save purchase return" }));

    await waitFor(() => {
      expect(returnsApi.createPurchaseReturn).toHaveBeenCalledWith({
        purchaseId: 20,
        returnDate: "2026-07-12",
        notes: "Damaged batch",
        actorName: null,
        items: [{ sourceItemId: 200, quantity: 2 }],
      });
    });
  });
});
