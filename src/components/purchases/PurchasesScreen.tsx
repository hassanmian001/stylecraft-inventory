import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type { ProductDto, PurchaseHistoryDto, PurchaseInput, SupplierDto } from "@/types/stylecraft-api";

type ItemFormState = {
  rowId: number;
  productId: string;
  quantity: string;
  unitCost: string;
};

type PurchaseFormState = {
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  notes: string;
  items: ItemFormState[];
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function makeItem(rowId: number): ItemFormState {
  return { rowId, productId: "", quantity: "1", unitCost: "0.00" };
}

function makeEmptyForm(): PurchaseFormState {
  return {
    supplierId: "",
    supplierName: "",
    purchaseDate: todayInputValue(),
    notes: "",
    items: [makeItem(1)],
  };
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

function lineTotalCents(item: ItemFormState) {
  const quantity = Number(item.quantity);
  const unitCostCents = decimalStringToCents(item.unitCost);

  if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitCostCents) || unitCostCents < 0) {
    return 0;
  }

  return quantity * unitCostCents;
}

function buildPurchaseInput(form: PurchaseFormState): { input?: PurchaseInput; error?: string } {
  if (!form.purchaseDate) {
    return { error: "Purchase date is required." };
  }

  const seenProductIds = new Set<number>();
  const items = [];

  for (const item of form.items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    const unitCostCents = decimalStringToCents(item.unitCost);

    if (!Number.isInteger(productId) || productId <= 0) {
      return { error: "Select a product for every purchase item." };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { error: "Quantity must be a positive whole number." };
    }

    if (!Number.isInteger(unitCostCents) || unitCostCents < 0) {
      return { error: "Unit cost must be a valid zero or positive amount." };
    }

    if (seenProductIds.has(productId)) {
      return { error: "Each product can appear only once per purchase." };
    }

    seenProductIds.add(productId);
    items.push({ productId, quantity, unitCostCents });
  }

  return {
    input: {
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      supplierName: form.supplierName.trim() || null,
      purchaseDate: form.purchaseDate,
      notes: form.notes.trim() || null,
      items,
    },
  };
}

export default function PurchasesScreen() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [purchases, setPurchases] = useState<PurchaseHistoryDto[]>([]);
  const [form, setForm] = useState<PurchaseFormState>(() => makeEmptyForm());
  const [nextRowId, setNextRowId] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPurchasesScreen() {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedProducts, loadedSuppliers, loadedPurchases] = await Promise.all([
        window.stylecraft.products.list({ isActive: true }),
        window.stylecraft.purchases.listSuppliers(),
        window.stylecraft.purchases.list(),
      ]);

      setProducts(loadedProducts);
      setSuppliers(loadedSuppliers);
      setPurchases(loadedPurchases);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load purchases.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPurchasesScreen();
  }, []);

  function updateItem(rowId: number, changes: Partial<ItemFormState>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.rowId === rowId ? { ...item, ...changes } : item)),
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, makeItem(nextRowId)] }));
    setNextRowId((current) => current + 1);
  }

  function removeItem(rowId: number) {
    setForm((current) => {
      if (current.items.length === 1) {
        return current;
      }

      return { ...current, items: current.items.filter((item) => item.rowId !== rowId) };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const { input, error: validationError } = buildPurchaseInput(form);

    if (!input) {
      setError(validationError ?? "Purchase details are incomplete.");
      return;
    }

    try {
      await window.stylecraft.purchases.create(input);
      setForm(makeEmptyForm());
      setNextRowId(2);
      await loadPurchasesScreen();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save purchase.");
    }
  }

  const totalCents = form.items.reduce((sum, item) => sum + lineTotalCents(item), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Milestone 4 purchases module</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Purchases</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Record supplier purchases, increase stock transactionally, and keep purchase history available.
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">{purchases.length}</span> purchases in history
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950">Create purchase</h3>
            <p className="mt-1 text-sm text-slate-500">Each saved item increases stock and records a stock movement.</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm">
            Total {formatCurrency(totalCents)}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="purchase-supplier">
            Supplier
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="purchase-supplier"
              onChange={(event) => setForm((current) => ({ ...current, supplierId: event.target.value }))}
              value={form.supplierId}
            >
              <option value="">No existing supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="purchase-new-supplier">
            New supplier name
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="purchase-new-supplier"
              onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))}
              placeholder="Optional"
              value={form.supplierName}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="purchase-date">
            Purchase date
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="purchase-date"
              onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))}
              type="date"
              value={form.purchaseDate}
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="purchase-notes">
          Notes
          <textarea
            className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="purchase-notes"
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            value={form.notes}
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-slate-950">Items</h4>
            <Button onClick={addItem} type="button" variant="ghost">
              Add item
            </Button>
          </div>

          {form.items.map((item, index) => (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px_140px_120px_auto]" key={item.rowId}>
              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor={`purchase-product-${item.rowId}`}>
                Product {index + 1}
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id={`purchase-product-${item.rowId}`}
                  onChange={(event) => updateItem(item.rowId, { productId: event.target.value })}
                  value={item.productId}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - stock {product.currentStock}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor={`purchase-quantity-${item.rowId}`}>
                Quantity
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id={`purchase-quantity-${item.rowId}`}
                  min="1"
                  onChange={(event) => updateItem(item.rowId, { quantity: event.target.value })}
                  step="1"
                  type="number"
                  value={item.quantity}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor={`purchase-unit-cost-${item.rowId}`}>
                Unit cost
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id={`purchase-unit-cost-${item.rowId}`}
                  min="0"
                  onChange={(event) => updateItem(item.rowId, { unitCost: event.target.value })}
                  step="0.01"
                  type="number"
                  value={item.unitCost}
                />
              </label>

              <div className="grid gap-1 text-sm font-medium text-slate-700">
                Line total
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950">{formatCurrency(lineTotalCents(item))}</div>
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
            Save purchase
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-slate-950">Purchase history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={5}>
                    Loading purchases...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={5}>
                    No purchases recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-4 py-4 text-slate-600">{formatDate(purchase.purchaseDate)}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">{purchase.supplierName ?? "No supplier"}</td>
                    <td className="px-4 py-4 text-slate-600">{purchase.itemCount}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950">{formatCurrency(purchase.totalAmountCents)}</td>
                    <td className="px-4 py-4 text-slate-600">{purchase.notes ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
