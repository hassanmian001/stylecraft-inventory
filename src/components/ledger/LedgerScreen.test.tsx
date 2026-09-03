// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LedgerScreen from "./LedgerScreen";
import type { LedgerApi, LedgerStatementDto, LedgerSummaryDto } from "@/types/stylecraft-api";

const summary: LedgerSummaryDto = {
  customers: [
    { partyType: "customer", partyId: 1, partyName: "Ali", phone: "0300-1112222", invoicedCents: 10_000, paidCents: 4_000, returnedCents: 0, balanceCents: 6_000 },
    { partyType: "customer", partyId: 2, partyName: "Settled Sohail", phone: null, invoicedCents: 5_000, paidCents: 5_000, returnedCents: 0, balanceCents: 0 },
  ],
  suppliers: [{ partyType: "supplier", partyId: 9, partyName: "Fabric House", phone: null, invoicedCents: 20_000, paidCents: 12_000, returnedCents: 0, balanceCents: 8_000 }],
  customerReceivableCents: 6_000,
  supplierPayableCents: 8_000,
};

const statement: LedgerStatementDto = {
  ...summary.customers[0],
  entries: [
    { date: new Date("2026-08-01T00:00:00.000Z"), kind: "sale", reference: "INV-000001", description: "Sale invoice", debitCents: 10_000, creditCents: 0, balanceCents: 10_000 },
    { date: new Date("2026-08-05T00:00:00.000Z"), kind: "payment", reference: "Cash", description: "Payment received", debitCents: 0, creditCents: 4_000, balanceCents: 6_000 },
  ],
};

describe("LedgerScreen", () => {
  let ledgerApi: LedgerApi;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    ledgerApi = {
      getSummary: vi.fn().mockResolvedValue(summary),
      getStatement: vi.fn().mockResolvedValue(statement),
      recordPayment: vi.fn().mockResolvedValue({}),
      deletePayment: vi.fn().mockResolvedValue(undefined),
    };

    window.stylecraft = { ledger: ledgerApi } as unknown as typeof window.stylecraft;
  });

  it("lists customers who still owe money and hides settled accounts", async () => {
    render(<LedgerScreen />);

    expect(await screen.findByText("Ali")).toBeInTheDocument();
    expect(screen.queryByText("Settled Sohail")).not.toBeInTheDocument();
    // The same amount appears in the receivable total and on Ali's row.
    expect(screen.getAllByText("Rs. 60.00")).toHaveLength(2);
    expect(screen.getByText("Total receivable")).toBeInTheDocument();
  });

  it("shows settled accounts once asked for", async () => {
    render(<LedgerScreen />);

    await screen.findByText("Ali");
    fireEvent.click(screen.getByLabelText("Show settled accounts"));

    expect(await screen.findByText("Settled Sohail")).toBeInTheDocument();
  });

  it("switches to what the shop owes suppliers", async () => {
    render(<LedgerScreen />);

    await screen.findByText("Ali");
    fireEvent.click(screen.getByRole("button", { name: "We owe suppliers" }));

    expect(await screen.findByText("Fabric House")).toBeInTheDocument();
    expect(screen.getByText("Total payable")).toBeInTheDocument();
  });

  it("opens a running statement when a row is clicked", async () => {
    render(<LedgerScreen />);

    const row = (await screen.findByText("Ali")).closest("tr");
    fireEvent.click(row as HTMLElement);

    await waitFor(() => {
      expect(ledgerApi.getStatement).toHaveBeenCalledWith("customer", 1);
    });

    expect(await screen.findByText("INV-000001")).toBeInTheDocument();
    expect(screen.getByText("Sale")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();
  });

  it("records a payment against the open account", async () => {
    render(<LedgerScreen />);

    const row = (await screen.findByText("Ali")).closest("tr");
    fireEvent.click(row as HTMLElement);

    await screen.findByText("INV-000001");

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Final settlement" } });
    fireEvent.click(screen.getByRole("button", { name: "Save payment" }));

    await waitFor(() => {
      expect(ledgerApi.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({ partyType: "customer", partyId: 1, amountCents: 6_000, notes: "Final settlement" }),
      );
    });
  });

  it("refuses a payment with no amount", async () => {
    render(<LedgerScreen />);

    const row = (await screen.findByText("Ali")).closest("tr");
    fireEvent.click(row as HTMLElement);

    await screen.findByText("INV-000001");
    fireEvent.click(screen.getByRole("button", { name: "Save payment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Payment amount must be more than zero.");
    expect(ledgerApi.recordPayment).not.toHaveBeenCalled();
  });
});
