import { AlertTriangle, BarChart3, Boxes, PackageCheck, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { formatCurrency } from "@/lib/currency";
import type { DashboardSummaryDto } from "@/types/stylecraft-api";

function metricCards(summary: DashboardSummaryDto) {
  return [
    { label: "Active products", value: String(summary.productCount), detail: "Products currently available", icon: Boxes },
    { label: "Stock quantity", value: String(summary.totalStockQuantity), detail: "Units on hand", icon: PackageCheck },
    { label: "Inventory value", value: formatCurrency(summary.inventoryValueCents), detail: "At purchase cost", icon: Boxes },
    { label: "Today sales", value: formatCurrency(summary.todaySalesCents), detail: "Sales recorded today", icon: BarChart3 },
    { label: "Month sales", value: formatCurrency(summary.currentMonthSalesCents), detail: "Current month revenue", icon: TrendingUp },
    { label: "Month profit", value: formatCurrency(summary.currentMonthProfitCents), detail: "Current month margin", icon: TrendingUp },
  ];
}

export default function DashboardScreen() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      setIsLoading(true);
      setError(null);

      try {
        setSummary(await window.stylecraft.dashboard.getSummary());
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSummary();
  }, []);

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
        {error}
      </div>
    );
  }

  if (summary === null) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No dashboard data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Milestone 6 dashboard</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-2 max-w-2xl text-slate-600">Live operating snapshot from products, stock, and sales records.</p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">{summary.lowStockProducts.length}</span> low-stock products
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metricCards(summary).map((card) => {
          const Icon = card.icon;

          return (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={card.label}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="text-sm font-medium text-slate-500">{card.label}</div>
              <div className="mt-2 text-2xl font-bold text-slate-950">{card.value}</div>
              <div className="mt-1 text-xs text-slate-500">{card.detail}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <h3 className="font-semibold text-slate-950">Low-stock products</h3>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {summary.lowStockProducts.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500">No products are currently low on stock.</div>
            ) : (
              summary.lowStockProducts.map((product) => (
                <div className="flex items-center justify-between gap-4 px-4 py-4" key={product.id}>
                  <div>
                    <div className="font-medium text-slate-950">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.sku}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold text-amber-700">{product.currentStock} left</div>
                    <div className="text-xs text-slate-500">Alert at {product.lowStockThreshold}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <h3 className="font-semibold text-slate-950">Best-selling products</h3>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {summary.bestSellingProducts.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500">No sales have been recorded yet.</div>
            ) : (
              summary.bestSellingProducts.map((product) => (
                <div className="flex items-center justify-between gap-4 px-4 py-4" key={product.productId}>
                  <div>
                    <div className="font-medium text-slate-950">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.sku}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold text-slate-950">{product.quantitySold} sold</div>
                    <div className="text-xs text-slate-500">{formatCurrency(product.totalSalesCents)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
