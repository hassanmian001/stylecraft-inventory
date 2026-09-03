import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type {
  PurchaseReturnCandidateDto,
  PurchaseReturnDetailDto,
  PurchaseReturnInput,
  SaleReturnCandidateDto,
  SaleReturnDetailDto,
  SaleReturnInput,
} from "@/types/stylecraft-api";

type ReturnMode = "sales" | "purchases";

type ReturnFormState = {
  sourceId: string;
  sourceItemId: string;
  quantity: string;
  returnDate: string;
  notes: string;
  actorName: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyForm(): ReturnFormState {
  return {
    sourceId: "",
    sourceItemId: "",
    quantity: "1",
    returnDate: todayInputValue(),
    notes: "",
    actorName: "",
  };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function buildSaleReturnInput(form: ReturnFormState): { input?: SaleReturnInput; error?: string } {
  const saleId = Number(form.sourceId);
  const sourceItemId = Number(form.sourceItemId);
  const quantity = Number(form.quantity);

  if (!Number.isInteger(saleId) || saleId <= 0) {
    return { error: "Select a sale to return." };
  }

  if (!Number.isInteger(sourceItemId) || sourceItemId <= 0) {
    return { error: "Select a sale item to return." };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Return quantity must be a positive whole number." };
  }

  if (!form.returnDate) {
    return { error: "Return date is required." };
  }

  return {
    input: {
      saleId,
      returnDate: form.returnDate,
      notes: form.notes.trim() || null,
      actorName: form.actorName.trim() || null,
      items: [{ sourceItemId, quantity }],
    },
  };
}

function buildPurchaseReturnInput(form: ReturnFormState): { input?: PurchaseReturnInput; error?: string } {
  const purchaseId = Number(form.sourceId);
  const sourceItemId = Number(form.sourceItemId);
  const quantity = Number(form.quantity);

  if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
    return { error: "Select a purchase to return." };
  }

  if (!Number.isInteger(sourceItemId) || sourceItemId <= 0) {
    return { error: "Select a purchase item to return." };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Return quantity must be a positive whole number." };
  }

  if (!form.returnDate) {
    return { error: "Return date is required." };
  }

  return {
    input: {
      purchaseId,
      returnDate: form.returnDate,
      notes: form.notes.trim() || null,
      actorName: form.actorName.trim() || null,
      items: [{ sourceItemId, quantity }],
    },
  };
}

export default function ReturnsScreen() {
  const [mode, setMode] = useState<ReturnMode>("sales");
  const [saleCandidates, setSaleCandidates] = useState<SaleReturnCandidateDto[]>([]);
  const [purchaseCandidates, setPurchaseCandidates] = useState<PurchaseReturnCandidateDto[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturnDetailDto[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnDetailDto[]>([]);
  const [form, setForm] = useState<ReturnFormState>(() => makeEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReturnsScreen() {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedSaleCandidates, loadedPurchaseCandidates, loadedSaleReturns, loadedPurchaseReturns] = await Promise.all([
        window.stylecraft.returns.listSaleCandidates(),
        window.stylecraft.returns.listPurchaseCandidates(),
        window.stylecraft.returns.listSaleReturns(),
        window.stylecraft.returns.listPurchaseReturns(),
      ]);

      setSaleCandidates(loadedSaleCandidates);
      setPurchaseCandidates(loadedPurchaseCandidates);
      setSaleReturns(loadedSaleReturns);
      setPurchaseReturns(loadedPurchaseReturns);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load returns.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReturnsScreen();
  }, []);

  function switchMode(nextMode: ReturnMode) {
    setMode(nextMode);
    setForm(makeEmptyForm());
    setError(null);
  }

  function selectSource(sourceId: string) {
    setForm((current) => ({ ...current, sourceId, sourceItemId: "", quantity: "1" }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      if (mode === "sales") {
        const { input, error: validationError } = buildSaleReturnInput(form);

        if (!input) {
          setError(validationError ?? "Sale return details are incomplete.");
          return;
        }

        await window.stylecraft.returns.createSaleReturn(input);
      } else {
        const { input, error: validationError } = buildPurchaseReturnInput(form);

        if (!input) {
          setError(validationError ?? "Purchase return details are incomplete.");
          return;
        }

        await window.stylecraft.returns.createPurchaseReturn(input);
      }

      setForm(makeEmptyForm());
      await loadReturnsScreen();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save return.");
    }
  }

  const activeSaleCandidate = saleCandidates.find((candidate) => candidate.saleId === Number(form.sourceId));
  const activePurchaseCandidate = purchaseCandidates.find((candidate) => candidate.purchaseId === Number(form.sourceId));
  const selectedSaleItem = activeSaleCandidate?.items.find((item) => item.saleItemId === Number(form.sourceItemId));
  const selectedPurchaseItem = activePurchaseCandidate?.items.find((item) => item.purchaseItemId === Number(form.sourceItemId));
  const maxReturnQuantity = mode === "sales" ? selectedSaleItem?.returnableQuantity : selectedPurchaseItem?.returnableQuantity;
  const activeReturns = mode === "sales" ? saleReturns : purchaseReturns;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Returns workflow</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Sales & purchase returns</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Process customer returns and supplier returns while keeping original transactions intact.
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">{saleReturns.length}</span> sale returns · <span className="font-semibold">{purchaseReturns.length}</span> purchase returns
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => switchMode("sales")} type="button" variant={mode === "sales" ? "default" : "ghost"}>
          Sales returns
        </Button>
        <Button onClick={() => switchMode("purchases")} type="button" variant={mode === "purchases" ? "default" : "ghost"}>
          Purchase returns
        </Button>
      </div>

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" noValidate onSubmit={handleSubmit}>
        <div>
          <h3 className="font-semibold text-slate-950">Create {mode === "sales" ? "sales" : "purchase"} return</h3>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "sales" ? "Customer returns increase stock." : "Supplier returns decrease stock and cannot exceed available stock."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="return-source">
            {mode === "sales" ? "Sale" : "Purchase"}
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="return-source"
              onChange={(event) => selectSource(event.target.value)}
              value={form.sourceId}
            >
              <option value="">Select {mode === "sales" ? "sale" : "purchase"}</option>
              {mode === "sales"
                ? saleCandidates.map((candidate) => (
                    <option key={candidate.saleId} value={candidate.saleId}>
                      {candidate.invoiceNumber} - {candidate.customerName ?? "No customer"} - {formatDate(candidate.saleDate)}
                    </option>
                  ))
                : purchaseCandidates.map((candidate) => (
                    <option key={candidate.purchaseId} value={candidate.purchaseId}>
                      Purchase #{candidate.purchaseId} - {candidate.supplierName ?? "No supplier"} - {formatDate(candidate.purchaseDate)}
                    </option>
                  ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="return-item">
            Item
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="return-item"
              onChange={(event) => setForm((current) => ({ ...current, sourceItemId: event.target.value }))}
              value={form.sourceItemId}
            >
              <option value="">Select item</option>
              {mode === "sales"
                ? activeSaleCandidate?.items.map((item) => (
                    <option key={item.saleItemId} value={item.saleItemId}>
                      {item.productName} ({item.productSku}) - returnable {item.returnableQuantity}
                    </option>
                  ))
                : activePurchaseCandidate?.items.map((item) => (
                    <option key={item.purchaseItemId} value={item.purchaseItemId}>
                      {item.productName} ({item.productSku}) - returnable {item.returnableQuantity}, stock {item.currentStock}
                    </option>
                  ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="return-quantity">
            Quantity
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="return-quantity"
              max={maxReturnQuantity ?? undefined}
              min="1"
              onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              step="1"
              type="number"
              value={form.quantity}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="return-date">
            Return date
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="return-date"
              onChange={(event) => setForm((current) => ({ ...current, returnDate: event.target.value }))}
              type="date"
              value={form.returnDate}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="return-actor">
            Processed by
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="return-actor"
              onChange={(event) => setForm((current) => ({ ...current, actorName: event.target.value }))}
              placeholder="Optional"
              value={form.actorName}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="return-notes">
            Notes
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="return-notes"
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Reason or reference"
              value={form.notes}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isLoading} type="submit">
            Save {mode === "sales" ? "sales" : "purchase"} return
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-slate-950">{mode === "sales" ? "Sales return history" : "Purchase return history"}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Return</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={6}>
                    Loading returns...
                  </td>
                </tr>
              ) : activeReturns.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={6}>
                    No {mode === "sales" ? "sales" : "purchase"} returns recorded yet.
                  </td>
                </tr>
              ) : mode === "sales" ? (
                saleReturns.map((saleReturn) => (
                  <tr key={saleReturn.id}>
                    <td className="px-4 py-4 font-medium text-slate-950">#{saleReturn.id}</td>
                    <td className="px-4 py-4 text-slate-600">{saleReturn.invoiceNumber}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(saleReturn.returnDate)}</td>
                    <td className="px-4 py-4 text-slate-600">{saleReturn.itemCount}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950">{formatCurrency(saleReturn.totalAmountCents)}</td>
                    <td className="px-4 py-4 text-slate-600">{saleReturn.notes ?? "-"}</td>
                  </tr>
                ))
              ) : (
                purchaseReturns.map((purchaseReturn) => (
                  <tr key={purchaseReturn.id}>
                    <td className="px-4 py-4 font-medium text-slate-950">#{purchaseReturn.id}</td>
                    <td className="px-4 py-4 text-slate-600">Purchase #{purchaseReturn.purchaseId}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(purchaseReturn.returnDate)}</td>
                    <td className="px-4 py-4 text-slate-600">{purchaseReturn.itemCount}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950">{formatCurrency(purchaseReturn.totalAmountCents)}</td>
                    <td className="px-4 py-4 text-slate-600">{purchaseReturn.notes ?? "-"}</td>
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
