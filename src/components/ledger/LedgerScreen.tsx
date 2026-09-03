import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type { LedgerPartySummaryDto, LedgerPartyType, LedgerStatementDto, LedgerSummaryDto } from "@/types/stylecraft-api";

const inputClass =
  "rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function parseAmountToCents(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

const entryLabels: Record<LedgerStatementDto["entries"][number]["kind"], string> = {
  sale: "Sale",
  purchase: "Purchase",
  payment: "Payment",
  sale_return: "Sale return",
  purchase_return: "Purchase return",
};

export default function LedgerScreen() {
  const [partyType, setPartyType] = useState<LedgerPartyType>("customer");
  const [summary, setSummary] = useState<LedgerSummaryDto | null>(null);
  const [statement, setStatement] = useState<LedgerStatementDto | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInputValue);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSummary(await window.stylecraft.ledger.getSummary());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load the ledger.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const openStatement = useCallback(async (nextPartyType: LedgerPartyType, partyId: number) => {
    setError(null);
    setSelectedPartyId(partyId);

    try {
      setStatement(await window.stylecraft.ledger.getStatement(nextPartyType, partyId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load the statement.");
    }
  }, []);

  function switchPartyType(nextPartyType: LedgerPartyType) {
    setPartyType(nextPartyType);
    setSelectedPartyId(null);
    setStatement(null);
  }

  async function handleRecordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedPartyId === null) {
      setError("Choose whose payment this is first.");
      return;
    }

    const amountCents = parseAmountToCents(paymentAmount);

    if (amountCents === null) {
      setError("Payment amount must be more than zero.");
      return;
    }

    setIsWorking(true);

    try {
      await window.stylecraft.ledger.recordPayment({
        partyType,
        partyId: selectedPartyId,
        amountCents,
        paymentDate: new Date(`${paymentDate}T00:00:00`),
        method: paymentMethod,
        notes: paymentNotes,
      });

      setPaymentAmount("");
      setPaymentNotes("");
      await loadSummary();
      await openStatement(partyType, selectedPartyId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not record the payment.");
    } finally {
      setIsWorking(false);
    }
  }

  const rows: LedgerPartySummaryDto[] = (partyType === "customer" ? summary?.customers : summary?.suppliers) ?? [];
  const visibleRows = showSettled ? rows : rows.filter((row) => row.balanceCents !== 0);
  const outstandingCents = partyType === "customer" ? (summary?.customerReceivableCents ?? 0) : (summary?.supplierPayableCents ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Khata</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Ledger</h2>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
          Every unpaid sale and purchase, and every payment against it. A balance is invoices minus payments minus returns.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => switchPartyType("customer")} size="sm" type="button" variant={partyType === "customer" ? "default" : "ghost"}>
          Customers owe us
        </Button>
        <Button onClick={() => switchPartyType("supplier")} size="sm" type="button" variant={partyType === "supplier" ? "default" : "ghost"}>
          We owe suppliers
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input checked={showSettled} onChange={(event) => setShowSettled(event.target.checked)} type="checkbox" />
          Show settled accounts
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
        <div className="text-sm text-slate-600 dark:text-slate-300">{partyType === "customer" ? "Total receivable" : "Total payable"}</div>
        <div className="text-2xl font-bold text-slate-950 dark:text-slate-50">{formatCurrency(outstandingCents)}</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">{partyType === "customer" ? "Customer" : "Supplier"}</th>
                <th className="px-4 py-3 font-semibold">Invoiced</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Returned</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={5}>
                    Loading ledger...
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={5}>
                    {rows.length === 0 ? "No accounts yet." : "Nothing outstanding — every account is settled."}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${selectedPartyId === row.partyId ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}
                    key={row.partyId}
                    onClick={() => void openStatement(partyType, row.partyId)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950 dark:text-slate-50">{row.partyName}</div>
                      {row.phone ? <div className="text-xs text-slate-500 dark:text-slate-400">{row.phone}</div> : null}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatCurrency(row.invoicedCents)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatCurrency(row.paidCents)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatCurrency(row.returnedCents)}</td>
                    <td className={`px-4 py-4 font-semibold ${row.balanceCents > 0 ? "text-red-600 dark:text-red-400" : "text-slate-950 dark:text-slate-50"}`}>
                      {formatCurrency(row.balanceCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statement ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-slate-50">{statement.partyName}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Balance {formatCurrency(statement.balanceCents)} {statement.balanceCents > 0 ? (partyType === "customer" ? "still to collect" : "still to pay") : "— settled"}
              </p>
            </div>
            <Button onClick={() => { setStatement(null); setSelectedPartyId(null); }} size="sm" type="button" variant="ghost">
              Close
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Entry</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Debit</th>
                  <th className="px-4 py-3 font-semibold">Credit</th>
                  <th className="px-4 py-3 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {statement.entries.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={6}>
                      No entries yet.
                    </td>
                  </tr>
                ) : (
                  statement.entries.map((entry, index) => (
                    <tr key={`${entry.kind}-${entry.reference}-${index}`}>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-slate-950 dark:text-slate-50">{entryLabels[entry.kind]}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{entry.reference}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{entry.debitCents === 0 ? "-" : formatCurrency(entry.debitCents)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{entry.creditCents === 0 ? "-" : formatCurrency(entry.creditCents)}</td>
                      <td className="px-4 py-3 font-medium text-slate-950 dark:text-slate-50">{formatCurrency(entry.balanceCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4" noValidate onSubmit={handleRecordPayment}>
            <h4 className="font-semibold text-slate-950 dark:text-slate-50">{partyType === "customer" ? "Record money received" : "Record money paid"}</h4>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="payment-amount">
                Amount
                <input className={inputClass} id="payment-amount" min="0" onChange={(event) => setPaymentAmount(event.target.value)} step="0.01" type="number" value={paymentAmount} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="payment-date">
                Date
                <input className={inputClass} id="payment-date" onChange={(event) => setPaymentDate(event.target.value)} type="date" value={paymentDate} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="payment-method">
                Method
                <input className={inputClass} id="payment-method" onChange={(event) => setPaymentMethod(event.target.value)} type="text" value={paymentMethod} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="payment-notes">
                Notes
                <input className={inputClass} id="payment-notes" onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Optional" type="text" value={paymentNotes} />
              </label>
            </div>

            <div>
              <Button disabled={isWorking} type="submit">
                Save payment
              </Button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
