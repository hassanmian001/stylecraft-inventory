// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SettingsScreen from "./SettingsScreen";
import type { BackupApi, DashboardApi, InvoiceApi, ProductApi, PurchaseApi, ReportsApi, SalesApi, SettingsApi, UpdateApi } from "@/types/stylecraft-api";

describe("SettingsScreen", () => {
  let backupApi: BackupApi;
  let settingsApi: SettingsApi;
  let updateApi: UpdateApi;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    backupApi = {
      getSettings: vi.fn().mockResolvedValue({ backupLocation: "D:\\Backups", isDefaultLocation: false }),
      updateLocation: vi.fn().mockResolvedValue({ backupLocation: "E:\\StyleCraftBackups", isDefaultLocation: false }),
      create: vi.fn().mockResolvedValue({
        backupPath: "E:\\StyleCraftBackups\\stylecraft-backup-20260709-101112-013.sqlite",
        backupDirectory: "E:\\StyleCraftBackups",
        createdAt: new Date("2026-07-09T10:11:12.013Z"),
      }),
      restore: vi.fn().mockResolvedValue({ restoredFrom: "E:\\StyleCraftBackups\\backup.sqlite", restoredAt: new Date("2026-07-09T11:00:00.000Z") }),
      chooseDirectory: vi.fn().mockResolvedValue("E:\\StyleCraftBackups"),
      chooseFile: vi.fn().mockResolvedValue("E:\\StyleCraftBackups\\backup.sqlite"),
    };
    settingsApi = {
      getBusinessSettings: vi.fn().mockResolvedValue({
        businessName: "StyleCraft Lahore",
        phone: "0300-0000000",
        email: "sales@stylecraft.test",
        address: "Lahore",
        currencySymbol: "Rs.",
        invoicePrefix: "INV",
      }),
      updateBusinessSettings: vi.fn().mockImplementation(async (input) => ({ ...input, invoicePrefix: input.invoicePrefix.toUpperCase() })),
    };
    updateApi = {
      check: vi.fn().mockResolvedValue({ status: "up-to-date", currentVersion: "0.1.4" }),
    };

    window.stylecraft = {
      backup: backupApi,
      dashboard: { getSummary: vi.fn().mockResolvedValue({}) } as unknown as DashboardApi,
      invoices: { getBySaleId: vi.fn().mockResolvedValue({}) } as unknown as InvoiceApi,
      products: { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}), markInactive: vi.fn().mockResolvedValue({}) } as unknown as ProductApi,
      purchases: { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}), listSuppliers: vi.fn().mockResolvedValue([]), createSupplier: vi.fn().mockResolvedValue({}) } as unknown as PurchaseApi,
      reports: { getReports: vi.fn().mockResolvedValue({}) } as unknown as ReportsApi,
      sales: { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}), listCustomers: vi.fn().mockResolvedValue([]), createCustomer: vi.fn().mockResolvedValue({}) } as unknown as SalesApi,
      settings: settingsApi,
      update: updateApi,
    };
  });

  it("loads and saves business settings", async () => {
    render(<SettingsScreen />);

    expect(await screen.findByDisplayValue("StyleCraft Lahore")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rs.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "StyleCraft Karachi" } });
    fireEvent.change(screen.getByLabelText("Invoice prefix"), { target: { value: "sc" } });
    fireEvent.click(screen.getByRole("button", { name: "Save business settings" }));

    await waitFor(() => {
      expect(settingsApi.updateBusinessSettings).toHaveBeenCalledWith({
        businessName: "StyleCraft Karachi",
        phone: "0300-0000000",
        email: "sales@stylecraft.test",
        address: "Lahore",
        currencySymbol: "Rs.",
        invoicePrefix: "sc",
      });
    });
  });

  it("loads and displays the configured backup location", async () => {
    render(<SettingsScreen />);

    expect(await screen.findByDisplayValue("D:\\Backups")).toBeInTheDocument();
    expect(screen.getByText("Current location: D:\\Backups")).toBeInTheDocument();
  });

  it("chooses and saves a backup location", async () => {
    render(<SettingsScreen />);

    await screen.findByDisplayValue("D:\\Backups");
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByDisplayValue("E:\\StyleCraftBackups")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save location" }));

    await waitFor(() => {
      expect(backupApi.updateLocation).toHaveBeenCalledWith("E:\\StyleCraftBackups");
    });
  });

  it("creates a manual backup", async () => {
    render(<SettingsScreen />);

    await screen.findByDisplayValue("D:\\Backups");
    fireEvent.click(screen.getByRole("button", { name: "Create backup" }));

    expect(await screen.findByRole("status")).toHaveTextContent("stylecraft-backup-20260709-101112-013.sqlite");
    expect(backupApi.create).toHaveBeenCalled();
  });

  it("chooses and restores a backup file", async () => {
    render(<SettingsScreen />);

    await screen.findByDisplayValue("D:\\Backups");
    fireEvent.click(screen.getByRole("button", { name: "Choose backup file" }));

    expect(await screen.findByDisplayValue("E:\\StyleCraftBackups\\backup.sqlite")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore backup" }));

    await waitFor(() => {
      expect(backupApi.restore).toHaveBeenCalledWith("E:\\StyleCraftBackups\\backup.sqlite");
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Database restored");
  });

  it("checks for updates and shows the result", async () => {
    render(<SettingsScreen />);

    await screen.findByDisplayValue("D:\\Backups");
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));

    expect(updateApi.check).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("You're on the latest version (v0.1.4).");
  });

  it("shows an error when the update check fails", async () => {
    updateApi.check = vi.fn().mockRejectedValue(new Error("Network unreachable"));
    window.stylecraft.update = updateApi;

    render(<SettingsScreen />);

    await screen.findByDisplayValue("D:\\Backups");
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Could not check for updates: Network unreachable");
  });
});
