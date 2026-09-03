// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ContactsScreen from "./ContactsScreen";
import type { ContactsApi, ContactDto, StyleCraftApi } from "@/types/stylecraft-api";

const sampleCustomers: ContactDto[] = [
  {
    id: 1,
    name: "Ali Khan",
    phone: "0300-0000000",
    email: "ali@example.com",
    address: "Lahore",
    notes: "Repeat buyer",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: 2,
    name: "Sara Ahmed",
    phone: null,
    email: "sara@example.com",
    address: null,
    notes: "Wholesale",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

const sampleSuppliers: ContactDto[] = [
  {
    id: 10,
    name: "Fabric House",
    phone: "021-1111111",
    email: "fabric@example.com",
    address: "Karachi",
    notes: null,
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
  },
];

describe("ContactsScreen", () => {
  let contactsApi: ContactsApi;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    contactsApi = {
      listCustomers: vi.fn().mockResolvedValue(sampleCustomers),
      createCustomer: vi.fn().mockResolvedValue(sampleCustomers[0]),
      updateCustomer: vi.fn().mockResolvedValue(sampleCustomers[0]),
      listSuppliers: vi.fn().mockResolvedValue(sampleSuppliers),
      createSupplier: vi.fn().mockResolvedValue(sampleSuppliers[0]),
      updateSupplier: vi.fn().mockResolvedValue(sampleSuppliers[0]),
    };

    window.stylecraft = {
      backup: {} as never,
      contacts: contactsApi,
      dashboard: {} as never,
      invoices: {} as never,
      products: {} as never,
      purchases: {} as never,
      reports: {} as never,
      sales: {} as never,
      settings: {} as never,
      update: {} as never,
    } satisfies StyleCraftApi;
  });

  it("renders customers and switches to suppliers", async () => {
    render(<ContactsScreen />);

    expect(await screen.findByText("Ali Khan")).toBeInTheDocument();
    expect(screen.getByText("Sara Ahmed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Suppliers" }));

    expect(screen.getByText("Fabric House")).toBeInTheDocument();
  });

  it("creates a customer with normalized optional fields", async () => {
    render(<ContactsScreen />);

    await screen.findByText("Ali Khan");

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Hassan Tailors  " } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: " 0321 " } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: " Sialkot " } });
    fireEvent.click(screen.getByRole("button", { name: "Add customer" }));

    await waitFor(() => {
      expect(contactsApi.createCustomer).toHaveBeenCalledWith({
        name: "Hassan Tailors",
        phone: "0321",
        email: null,
        address: "Sialkot",
        notes: null,
      });
    });
  });

  it("searches and edits suppliers", async () => {
    render(<ContactsScreen />);

    await screen.findByText("Ali Khan");
    fireEvent.click(screen.getByRole("button", { name: "Suppliers" }));
    fireEvent.change(screen.getByLabelText("Search suppliers"), { target: { value: "karachi" } });

    const row = screen.getByText("Fabric House").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLTableRowElement).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Fabric House PK" } });
    fireEvent.click(screen.getByRole("button", { name: "Save supplier" }));

    await waitFor(() => {
      expect(contactsApi.updateSupplier).toHaveBeenCalledWith(10, {
        name: "Fabric House PK",
        phone: "021-1111111",
        email: "fabric@example.com",
        address: "Karachi",
        notes: null,
      });
    });
  });
});
