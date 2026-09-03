import { useEffect, useState } from "react";

import { findVariant, VariantPicker } from "@/components/products/VariantPicker";
import { Button } from "@/components/ui/button";
import { styleCraftLogoDataUri } from "@/lib/branding";
import { formatCurrency } from "@/lib/currency";
import type { CustomerDto, InvoiceDetailDto, ProductDto, SaleDetailDto, SaleHistoryDto, SaleInput } from "@/types/stylecraft-api";

type ItemFormState = {
  rowId: number;
  productId: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

type SaleFormState = {
  customerId: string;
  customerName: string;
  saleDate: string;
  amountPaid: string;
  paymentMethod: string;
  notes: string;
  items: ItemFormState[];
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function makeItem(rowId: number): ItemFormState {
  return { rowId, productId: "", variantId: "", quantity: "1", unitPrice: "0.00", discount: "0.00" };
}

function makeEmptyForm(): SaleFormState {
  return {
    customerId: "",
    customerName: "",
    saleDate: todayInputValue(),
    amountPaid: "",
    paymentMethod: "",
    notes: "",
    items: [makeItem(1)],
  };
}

function formatInvoiceCurrency(cents: number, currencySymbol: string) {
  return formatCurrency(cents, currencySymbol);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function decimalStringToCents(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return Number.NaN;
  }

  return Math.round(amount * 100);
}

function escapeHtml(value: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printInvoice(invoice: InvoiceDetailDto) {
  const printableWindow = window.open("", "_blank");

  if (printableWindow === null) {
    throw new Error("Could not open print window.");
  }

  const businessLines = [invoice.business.phone, invoice.business.email, invoice.business.address]
    .filter((line): line is string => line !== null && line.trim() !== "")
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  const customerLines = [invoice.customerName, invoice.customerPhone, invoice.customerEmail, invoice.customerAddress]
    .filter((line): line is string => line !== null && line.trim() !== "")
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  const itemRows = invoice.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.productName)}</td><td>${escapeHtml(item.productSku)}</td><td>${item.quantity}</td><td>${escapeHtml(formatInvoiceCurrency(item.unitPriceCents, invoice.business.currencySymbol))}</td><td>${escapeHtml(formatInvoiceCurrency(item.discountAmountCents, invoice.business.currencySymbol))}</td><td>${escapeHtml(formatInvoiceCurrency(item.totalAmountCents, invoice.business.currencySymbol))}</td></tr>`,
    )
    .join("");

  printableWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(invoice.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#0f172a}.header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #0f172a;padding-bottom:18px}.brand{display:flex;align-items:center;gap:14px}.logo{width:62px;height:62px;object-fit:contain}.muted{color:#475569;font-size:13px}.box{margin-top:24px;border:1px solid #cbd5e1;border-radius:12px;padding:16px}table{border-collapse:collapse;width:100%;margin-top:18px;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}.totals{margin-left:auto;margin-top:18px;width:280px}.totals div{display:flex;justify-content:space-between;padding:6px 0}.total{font-weight:700;border-top:1px solid #cbd5e1}</style></head><body><div class="header"><div class="brand"><img class="logo" src="${styleCraftLogoDataUri}" alt="StyleCraft logo"><div><h1>${escapeHtml(invoice.business.businessName)}</h1><div class="muted">${businessLines}</div></div></div><div><h2>Invoice ${escapeHtml(invoice.invoiceNumber)}</h2><div class="muted">Date: ${escapeHtml(formatDate(invoice.saleDate))}</div><div class="muted">Payment: ${escapeHtml(invoice.paymentMethod ?? "-")}</div></div></div><div class="box"><strong>Bill To</strong><div class="muted">${customerLines || "No customer"}</div></div><table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table><div class="totals"><div><span>Subtotal</span><span>${escapeHtml(formatInvoiceCurrency(invoice.subtotalCents, invoice.business.currencySymbol))}</span></div><div><span>Discount</span><span>${escapeHtml(formatInvoiceCurrency(invoice.discountAmountCents, invoice.business.currencySymbol))}</span></div><div class="total"><span>Total</span><span>${escapeHtml(formatInvoiceCurrency(invoice.totalAmountCents, invoice.business.currencySymbol))}</span></div></div>${invoice.notes ? `<div class="box"><strong>Notes</strong><div class="muted">${escapeHtml(invoice.notes)}</div></div>` : ""}</body></html>`);
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
}

function lineTotalCents(item: ItemFormState) {
  const quantity = Number(item.quantity);
  const unitPriceCents = decimalStringToCents(item.unitPrice);
  const discountAmountCents = decimalStringToCents(item.discount);

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(unitPriceCents) ||
    unitPriceCents < 0 ||
    !Number.isFinite(discountAmountCents) ||
    discountAmountCents < 0
  ) {
    return 0;
  }

  return Math.max(0, quantity * unitPriceCents - discountAmountCents);
}

function buildSaleInput(form: SaleFormState): { input?: SaleInput; error?: string } {
  if (!form.saleDate) {
    return { error: "Sale date is required." };
  }

  const seenVariantIds = new Set<number>();
  const items = [];

  for (const item of form.items) {
    const variantId = Number(item.variantId);
    const quantity = Number(item.quantity);
    const unitPriceCents = decimalStringToCents(item.unitPrice);
    const discountAmountCents = decimalStringToCents(item.discount);

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return { error: "Select a size/colour for every sale item." };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { error: "Quantity must be a positive whole number." };
    }

    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
      return { error: "Unit price must be a valid zero or positive amount." };
    }

    if (!Number.isInteger(discountAmountCents) || discountAmountCents < 0) {
      return { error: "Discount must be a valid zero or positive amount." };
    }

    if (discountAmountCents > quantity * unitPriceCents) {
      return { error: "Discount cannot exceed the line subtotal." };
    }

    if (seenVariantIds.has(variantId)) {
      return { error: "Each size/colour can appear only once per sale." };
    }

    seenVariantIds.add(variantId);
    items.push({ variantId, quantity, unitPriceCents, discountAmountCents });
  }

  const totalAmountCents = items.reduce((sum, item) => sum + Math.max(0, item.quantity * item.unitPriceCents - item.discountAmountCents), 0);
  let amountPaidCents = totalAmountCents;

  if (form.amountPaid.trim()) {
    amountPaidCents = decimalStringToCents(form.amountPaid);

    if (!Number.isInteger(amountPaidCents) || amountPaidCents < 0) {
      return { error: "Amount paid must be a valid zero or positive amount." };
    }

    if (amountPaidCents > totalAmountCents) {
      return { error: "Amount paid cannot be more than the sale total." };
    }
  }

  if (amountPaidCents < totalAmountCents && !form.customerId && !form.customerName.trim()) {
    return { error: "Choose or name a customer before leaving part of a sale unpaid, so the balance has a khata to sit on." };
  }

  return {
    input: {
      customerId: form.customerId ? Number(form.customerId) : null,
      customerName: form.customerName.trim() || null,
      saleDate: form.saleDate,
      amountPaidCents,
      paymentMethod: form.paymentMethod.trim() || null,
      notes: form.notes.trim() || null,
      items,
    },
  };
}

/** Turns a recorded sale back into editable form state. */
function saleToForm(sale: SaleDetailDto, products: ProductDto[]): SaleFormState {
  return {
    customerId: sale.customerId === null ? "" : String(sale.customerId),
    customerName: "",
    saleDate: new Date(sale.saleDate).toISOString().slice(0, 10),
    amountPaid: (sale.amountPaidCents / 100).toFixed(2),
    paymentMethod: sale.paymentMethod ?? "",
    notes: sale.notes ?? "",
    items: sale.items.map((item, index) => {
      const owner = item.variantId === null ? undefined : products.find((product) => product.variants.some((variant) => variant.id === item.variantId));

      return {
        rowId: index + 1,
        productId: owner === undefined ? String(item.productId) : String(owner.id),
        variantId: item.variantId === null ? "" : String(item.variantId),
        quantity: String(item.quantity),
        unitPrice: (item.unitPriceCents / 100).toFixed(2),
        discount: (item.discountAmountCents / 100).toFixed(2),
      };
    }),
  };
}

export default function SalesScreen() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [sales, setSales] = useState<SaleHistoryDto[]>([]);
  const [form, setForm] = useState<SaleFormState>(() => makeEmptyForm());
  const [nextRowId, setNextRowId] = useState(2);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetailDto | null>(null);
  const [invoiceLoadingSaleId, setInvoiceLoadingSaleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<string | null>(null);
  const [editPasswordRequired, setEditPasswordRequired] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editActorName, setEditActorName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function loadSalesScreen() {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedProducts, loadedCustomers, loadedSales] = await Promise.all([
        window.stylecraft.products.list({ isActive: true }),
        window.stylecraft.sales.listCustomers(),
        window.stylecraft.sales.list(),
      ]);

      setProducts(loadedProducts);
      setCustomers(loadedCustomers);
      setSales(loadedSales);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load sales.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSalesScreen();
  }, []);

  function updateItem(rowId: number, changes: Partial<ItemFormState>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.rowId === rowId ? { ...item, ...changes } : item)),
    }));
  }

  function selectProduct(rowId: number, productId: string) {
    const product = products.find((entry) => String(entry.id) === productId);
    const available = product?.variants.filter((variant) => variant.isActive) ?? [];

    // A product with a single size needs no second choice.
    const variantId = available.length === 1 ? String(available[0].id) : "";

    updateItem(rowId, { productId, variantId, unitPrice: available.length === 1 ? (available[0].sellingPriceCents / 100).toFixed(2) : "0.00" });
  }

  function selectVariant(rowId: number, variantId: string) {
    const found = findVariant(products, Number(variantId));

    updateItem(rowId, { variantId, unitPrice: found ? (found.variant.sellingPriceCents / 100).toFixed(2) : "0.00" });
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, makeItem(nextRowId)] }));
    setNextRowId((current) => current + 1);
  }

  function removeItem(rowId: number) {
    setForm((current) => (current.items.length === 1 ? current : { ...current, items: current.items.filter((item) => item.rowId !== rowId) }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const { input, error: validationError } = buildSaleInput(form);

    if (!input) {
      setError(validationError ?? "Sale details are incomplete.");
      return;
    }

    try {
      if (editingSaleId === null) {
        await window.stylecraft.sales.create(input);
        setNotice("Sale saved.");
      } else {
        if (editPasswordRequired && !editPassword.trim()) {
          setError("Enter the edit password to save changes to a recorded sale.");
          return;
        }

        await window.stylecraft.sales.update(editingSaleId, input, editPassword, editActorName.trim() || null);
        setNotice(`Sale ${editingInvoiceNumber ?? ""} updated.`);
      }

      cancelSaleEdit();
      await loadSalesScreen();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save sale.");
    }
  }

  /** Loads a recorded sale back into the form so its details can be corrected. */
  async function startSaleEdit(saleId: number) {
    setError(null);
    setNotice(null);

    try {
      const [sale, passwordStatus] = await Promise.all([window.stylecraft.sales.get(saleId), window.stylecraft.security.getEditPasswordStatus()]);

      setEditingSaleId(sale.id);
      setEditingInvoiceNumber(sale.invoiceNumber);
      setEditPasswordRequired(passwordStatus.isSet);
      setEditPassword("");
      setForm(saleToForm(sale, products));
      setNextRowId(sale.items.length + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not open the sale for editing.");
    }
  }

  function cancelSaleEdit() {
    setForm(makeEmptyForm());
    setNextRowId(2);
    setEditingSaleId(null);
    setEditingInvoiceNumber(null);
    setEditPassword("");
    setEditPasswordRequired(false);
  }

  async function handleViewInvoice(saleId: number) {
    setError(null);
    setInvoiceLoadingSaleId(saleId);

    try {
      setSelectedInvoice(await window.stylecraft.invoices.getBySaleId(saleId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load invoice.");
    } finally {
      setInvoiceLoadingSaleId(null);
    }
  }

  function handlePrintInvoice() {
    if (selectedInvoice === null) {
      return;
    }

    try {
      printInvoice(selectedInvoice);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not open invoice print window.");
    }
  }

  const totalCents = form.items.reduce((sum, item) => sum + lineTotalCents(item), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Milestone 5 sales module</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Sales</h2>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Record sales, block overselling, calculate profit, decrease stock, and produce readable invoices.</p>
        </div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">{sales.length}</span> sales in history
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm font-medium text-green-800 dark:text-green-200" role="status">
          {notice}
        </div>
      ) : null}

      <form className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-slate-50">{editingSaleId === null ? "Create sale" : `Edit sale ${editingInvoiceNumber ?? ""}`}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {editingSaleId === null
                ? "Each saved item decreases stock and records a stock movement."
                : "Saving puts the original stock back and applies these lines instead."}
            </p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-950 dark:text-slate-50 shadow-sm">Total {formatCurrency(totalCents)}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-customer">
            Customer
            <select
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="sale-customer"
              onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
              value={form.customerId}
            >
              <option value="">No existing customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-new-customer">
            New customer name
            <input
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="sale-new-customer"
              onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
              placeholder="Optional"
              value={form.customerName}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-date">
            Sale date
            <input
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="sale-date"
              onChange={(event) => setForm((current) => ({ ...current, saleDate: event.target.value }))}
              type="date"
              value={form.saleDate}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-payment-method">
            Payment method
            <input
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="sale-payment-method"
              onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              placeholder="Optional"
              value={form.paymentMethod}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-amount-paid">
            Amount paid now
            <input
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50"
              id="sale-amount-paid"
              min="0"
              onChange={(event) => setForm((current) => ({ ...current, amountPaid: event.target.value }))}
              placeholder={`Leave blank for paid in full (${formatCurrency(totalCents)})`}
              step="0.01"
              type="number"
              value={form.amountPaid}
            />
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {form.amountPaid.trim()
                ? `Goes on the customer's khata: ${formatCurrency(Math.max(totalCents - decimalStringToCents(form.amountPaid), 0))}`
                : "Nothing will be left owing."}
            </span>
          </label>
        </div>

        {editingSaleId !== null ? (
          <div className="grid gap-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 md:grid-cols-2">
            <div className="md:col-span-2 text-sm text-slate-700 dark:text-slate-200">
              {editPasswordRequired
                ? "Editing a recorded sale needs the edit password set in Settings."
                : "No edit password is set. Anyone using this computer can change a recorded sale — set one in Settings."}
            </div>
            {editPasswordRequired ? (
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-edit-password">
                Edit password
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50"
                  id="sale-edit-password"
                  onChange={(event) => setEditPassword(event.target.value)}
                  type="password"
                  value={editPassword}
                />
              </label>
            ) : null}
            <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-edit-actor">
              Edited by
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50"
                id="sale-edit-actor"
                onChange={(event) => setEditActorName(event.target.value)}
                placeholder="Optional, saved in the audit log"
                value={editActorName}
              />
            </label>
          </div>
        ) : null}

        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="sale-notes">
          Notes
          <textarea
            className="min-h-20 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="sale-notes"
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            value={form.notes}
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-950 dark:text-slate-50">Items</h4>
            <Button onClick={addItem} type="button" variant="ghost">
              Add item
            </Button>
          </div>

          {form.items.map((item, index) => (
            <div
              className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_120px_110px_auto]"
              key={item.rowId}
            >
              <VariantPicker
                idPrefix={`sale-${item.rowId}`}
                label={`Product ${index + 1}`}
                onProductChange={(productId) => selectProduct(item.rowId, productId)}
                onVariantChange={(variantId) => selectVariant(item.rowId, variantId)}
                productId={item.productId}
                products={products}
                variantId={item.variantId}
              />

              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={`sale-quantity-${item.rowId}`}>
                Quantity
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id={`sale-quantity-${item.rowId}`}
                  min="1"
                  onChange={(event) => updateItem(item.rowId, { quantity: event.target.value })}
                  step="1"
                  type="number"
                  value={item.quantity}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={`sale-unit-price-${item.rowId}`}>
                Unit price
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id={`sale-unit-price-${item.rowId}`}
                  min="0"
                  onChange={(event) => updateItem(item.rowId, { unitPrice: event.target.value })}
                  step="0.01"
                  type="number"
                  value={item.unitPrice}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={`sale-discount-${item.rowId}`}>
                Discount
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id={`sale-discount-${item.rowId}`}
                  min="0"
                  onChange={(event) => updateItem(item.rowId, { discount: event.target.value })}
                  step="0.01"
                  type="number"
                  value={item.discount}
                />
              </label>

              <div className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                Line total
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-950 dark:text-slate-50">{formatCurrency(lineTotalCents(item))}</div>
              </div>

              <div className="flex items-end">
                {form.items.length > 1 ? (
                  <Button onClick={() => removeItem(item.rowId)} type="button" variant="ghost">
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isLoading || products.length === 0} type="submit">
            {editingSaleId === null ? "Save sale" : "Save changes"}
          </Button>
          {editingSaleId !== null ? (
            <Button onClick={cancelSaleEdit} type="button" variant="ghost">
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
          <h3 className="font-semibold text-slate-950 dark:text-slate-50">Sale history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Profit</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={11}>
                    Loading sales...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={11}>
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-4 py-4 font-medium text-slate-950 dark:text-slate-50">{sale.invoiceNumber}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(sale.saleDate)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{sale.customerName ?? "No customer"}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{sale.itemCount}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950 dark:text-slate-50">{formatCurrency(sale.totalAmountCents)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatCurrency(sale.amountPaidCents)}</td>
                    <td className={`px-4 py-4 font-medium ${sale.balanceDueCents > 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}>
                      {formatCurrency(sale.balanceDueCents)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-950 dark:text-slate-50">{formatCurrency(sale.profitAmountCents)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{sale.paymentMethod ?? "-"}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{sale.notes ?? "-"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={invoiceLoadingSaleId === sale.id} onClick={() => handleViewInvoice(sale.id)} size="sm" type="button" variant="ghost">
                          {invoiceLoadingSaleId === sale.id ? "Loading..." : "View invoice"}
                        </Button>
                        <Button onClick={() => void startSaleEdit(sale.id)} size="sm" type="button" variant="ghost">
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice ? (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm" aria-label="Invoice preview">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Milestone 8 invoice preview</p>
              <div className="mt-2 flex items-center gap-3">
                <img alt="StyleCraft logo" className="h-12 w-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1" src={styleCraftLogoDataUri} />
                <h3 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Invoice {selectedInvoice.invoiceNumber}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(selectedInvoice.saleDate)}</p>
            </div>
            <Button onClick={handlePrintInvoice} type="button" variant="ghost">
              Print / Save PDF
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4">
              <h4 className="font-semibold text-slate-950 dark:text-slate-50">Business</h4>
              <p className="mt-2 font-medium text-slate-800">{selectedInvoice.business.businessName}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedInvoice.business.phone ?? "No phone"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedInvoice.business.email ?? "No email"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedInvoice.business.address ?? "No address"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4">
              <h4 className="font-semibold text-slate-950 dark:text-slate-50">Customer</h4>
              <p className="mt-2 font-medium text-slate-800">{selectedInvoice.customerName ?? "No customer"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedInvoice.customerPhone ?? "No phone"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedInvoice.customerEmail ?? "No email"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedInvoice.customerAddress ?? "No address"}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Unit price</th>
                  <th className="px-4 py-3 font-semibold">Discount</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {selectedInvoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-medium text-slate-950 dark:text-slate-50">
                      {item.productName}
                      {item.variantLabel && item.variantLabel !== "Standard" ? <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{item.variantLabel}</span> : null}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.productSku}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.quantity}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatInvoiceCurrency(item.unitPriceCents, selectedInvoice.business.currencySymbol)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatInvoiceCurrency(item.discountAmountCents, selectedInvoice.business.currencySymbol)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950 dark:text-slate-50">{formatInvoiceCurrency(item.totalAmountCents, selectedInvoice.business.currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 text-sm md:ml-auto md:w-80">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span>{formatInvoiceCurrency(selectedInvoice.subtotalCents, selectedInvoice.business.currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Discount</span>
              <span>{formatInvoiceCurrency(selectedInvoice.discountAmountCents, selectedInvoice.business.currencySymbol)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-lg font-bold text-slate-950 dark:text-slate-50">
              <span>Total</span>
              <span>{formatInvoiceCurrency(selectedInvoice.totalAmountCents, selectedInvoice.business.currencySymbol)}</span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
