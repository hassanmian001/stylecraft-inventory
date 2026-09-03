import { Download, FileText, Printer } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type { ReportFilters, ReportsDto } from "@/types/stylecraft-api";

type ReportType = "sales" | "purchases" | "profit" | "stock";

type TableReport = {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

const reportTypes: Array<{ id: ReportType; label: string }> = [
  { id: "sales", label: "Sales" },
  { id: "purchases", label: "Purchases" },
  { id: "profit", label: "Profit" },
  { id: "stock", label: "Stock" },
];

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTableReport(type: ReportType, reports: ReportsDto): TableReport {
  if (type === "sales") {
    return {
      title: "Sales Report",
      columns: ["Invoice", "Date", "Customer", "Items", "Subtotal", "Discount", "Total", "Profit", "Payment", "Notes"],
      rows: reports.salesRows.map((row) => [
        row.invoiceNumber,
        formatDate(row.saleDate),
        row.customerName ?? "No customer",
        row.itemCount,
        formatCurrency(row.subtotalCents),
        formatCurrency(row.discountAmountCents),
        formatCurrency(row.totalAmountCents),
        formatCurrency(row.profitAmountCents),
        row.paymentMethod ?? "-",
        row.notes ?? "-",
      ]),
    };
  }

  if (type === "purchases") {
    return {
      title: "Purchase Report",
      columns: ["Date", "Supplier", "Items", "Total", "Notes"],
      rows: reports.purchaseRows.map((row) => [formatDate(row.purchaseDate), row.supplierName ?? "No supplier", row.itemCount, formatCurrency(row.totalAmountCents), row.notes ?? "-"],),
    };
  }

  if (type === "profit") {
    return {
      title: "Profit Report",
      columns: ["Invoice", "Date", "Customer", "Revenue", "Cost", "Discount", "Profit"],
      rows: reports.profitRows.map((row) => [
        row.invoiceNumber,
        formatDate(row.saleDate),
        row.customerName ?? "No customer",
        formatCurrency(row.revenueCents),
        formatCurrency(row.costCents),
        formatCurrency(row.discountAmountCents),
        formatCurrency(row.profitAmountCents),
      ]),
    };
  }

  return {
    title: "Stock Report",
    columns: ["Product", "SKU", "Category", "Stock", "Low-stock threshold", "Purchase", "Selling", "Inventory value", "Low stock", "Status"],
    rows: reports.stockRows.map((row) => [
      row.name,
      row.sku,
      row.categoryName ?? "Uncategorized",
      row.currentStock,
      row.lowStockThreshold,
      formatCurrency(row.purchasePriceCents),
      formatCurrency(row.sellingPriceCents),
      formatCurrency(row.inventoryValueCents),
      row.isLowStock ? "Yes" : "No",
      row.isActive ? "Active" : "Inactive",
    ]),
  };
}

function downloadCsv(report: TableReport) {
  const csv = [report.columns, ...report.rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.title.toLowerCase().replaceAll(" ", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport(report: TableReport) {
  const printableWindow = window.open("", "_blank");

  if (printableWindow === null) {
    throw new Error("Could not open print window.");
  }

  const headers = report.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const rows = report.rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  printableWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(report.title)}</title><style>body{font-family:Arial,sans-serif;margin:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}h1{font-size:20px}</style></head><body><h1>${escapeHtml(report.title)}</h1><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
}

function totalsForReport(type: ReportType, reports: ReportsDto) {
  if (type === "sales") {
    return [
      { label: "Sales total", value: formatCurrency(reports.totals.salesTotalCents) },
      { label: "Rows", value: String(reports.salesRows.length) },
    ];
  }

  if (type === "purchases") {
    return [
      { label: "Purchase total", value: formatCurrency(reports.totals.purchaseTotalCents) },
      { label: "Rows", value: String(reports.purchaseRows.length) },
    ];
  }

  if (type === "profit") {
    return [
      { label: "Revenue", value: formatCurrency(reports.totals.revenueCents) },
      { label: "Cost", value: formatCurrency(reports.totals.costCents) },
      { label: "Profit", value: formatCurrency(reports.totals.profitCents) },
    ];
  }

  return [
    { label: "Stock quantity", value: String(reports.totals.stockQuantity) },
    { label: "Inventory value", value: formatCurrency(reports.totals.inventoryValueCents) },
    { label: "Products", value: String(reports.stockRows.length) },
  ];
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<ReportsDto | null>(null);
  const [activeReport, setActiveReport] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true);
      setError(null);

      const filters: ReportFilters = {};

      if (startDate) {
        filters.startDate = startDate;
      }

      if (endDate) {
        filters.endDate = endDate;
      }

      try {
        setReports(await window.stylecraft.reports.getReports(filters));
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load reports.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadReports();
  }, [startDate, endDate]);

  const tableReport = reports === null ? null : getTableReport(activeReport, reports);

  function handleCsvExport() {
    if (tableReport !== null) {
      downloadCsv(tableReport);
    }
  }

  function handlePdfExport() {
    if (tableReport !== null) {
      try {
        printReport(tableReport);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not open PDF export.");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Milestone 7 reports and exports</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Reports</h2>
          <p className="mt-2 max-w-2xl text-slate-600">Review sales, purchases, profit, and current stock with exportable tables.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="reports-start-date">
          Start date
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="reports-start-date"
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="reports-end-date">
          End date
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="reports-end-date"
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </label>
        <div className="flex items-end">
          <Button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            type="button"
            variant="ghost"
          >
            Clear dates
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {reportTypes.map((reportType) => (
          <Button key={reportType.id} onClick={() => setActiveReport(reportType.id)} type="button" variant={activeReport === reportType.id ? "default" : "ghost"}>
            {reportType.label}
          </Button>
        ))}
      </div>

      {isLoading || reports === null || tableReport === null ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Loading reports...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {totalsForReport(activeReport, reports).map((total) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={total.label}>
                <div className="text-sm font-medium text-slate-500">{total.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-950">{total.value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h3 className="font-semibold text-slate-950">{tableReport.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCsvExport} size="sm" type="button" variant="ghost">
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export Excel CSV
                </Button>
                <Button onClick={handlePdfExport} size="sm" type="button" variant="ghost">
                  <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
                  Print / Save PDF
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {tableReport.columns.map((column) => (
                      <th className="px-4 py-3 font-semibold" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tableReport.rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5 text-slate-500" colSpan={tableReport.columns.length}>
                        No rows match these filters.
                      </td>
                    </tr>
                  ) : (
                    tableReport.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((value, columnIndex) => (
                          <td className="px-4 py-4 text-slate-600" key={`${rowIndex}-${columnIndex}`}>
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
