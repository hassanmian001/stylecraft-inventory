import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type { ProductDto, ProductInput, ProductListFilters, StockAdjustmentInput } from "@/types/stylecraft-api";

type ProductFormState = {
  name: string;
  sku: string;
  categoryName: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  lowStockThreshold: string;
  isActive: boolean;
};

type StockAdjustmentFormState = {
  productId: string;
  newStock: string;
  reason: string;
  actorName: string;
};

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  categoryName: "",
  purchasePrice: "",
  sellingPrice: "",
  currentStock: "0",
  lowStockThreshold: "0",
  isActive: true,
};

const emptyStockAdjustmentForm: StockAdjustmentFormState = {
  productId: "",
  newStock: "",
  reason: "",
  actorName: "",
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function decimalStringToCents(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return Number.NaN;
  }

  return Math.round(amount * 100);
}

function productToForm(product: ProductDto): ProductFormState {
  return {
    name: product.name,
    sku: product.sku,
    categoryName: product.categoryName ?? "",
    purchasePrice: centsToInput(product.purchasePriceCents),
    sellingPrice: centsToInput(product.sellingPriceCents),
    currentStock: String(product.currentStock),
    lowStockThreshold: String(product.lowStockThreshold),
    isActive: product.isActive,
  };
}

function buildProductInput(form: ProductFormState): { input?: ProductInput; error?: string } {
  const purchasePriceCents = decimalStringToCents(form.purchasePrice);
  const sellingPriceCents = decimalStringToCents(form.sellingPrice);
  const currentStock = Number(form.currentStock);
  const lowStockThreshold = Number(form.lowStockThreshold);

  if (!form.name.trim()) {
    return { error: "Product name is required." };
  }

  if (!form.sku.trim()) {
    return { error: "SKU is required." };
  }

  if (purchasePriceCents < 0 || sellingPriceCents < 0 || !Number.isFinite(purchasePriceCents + sellingPriceCents)) {
    return { error: "Prices must be valid zero or positive amounts." };
  }

  if (!Number.isInteger(currentStock) || !Number.isInteger(lowStockThreshold) || currentStock < 0 || lowStockThreshold < 0) {
    return { error: "Stock quantities must be whole numbers of zero or more." };
  }

  return {
    input: {
      name: form.name.trim(),
      sku: form.sku.trim(),
      categoryName: form.categoryName.trim() || null,
      purchasePriceCents,
      sellingPriceCents,
      currentStock,
      lowStockThreshold,
      isActive: form.isActive,
    },
  };
}

function buildStockAdjustmentInput(form: StockAdjustmentFormState): { input?: StockAdjustmentInput; error?: string } {
  const productId = Number(form.productId);
  const newStock = Number(form.newStock);

  if (!Number.isInteger(productId) || productId <= 0) {
    return { error: "Select a product to adjust." };
  }

  if (!Number.isInteger(newStock) || newStock < 0) {
    return { error: "Counted stock must be a whole number of zero or more." };
  }

  if (!form.reason.trim()) {
    return { error: "Adjustment reason is required." };
  }

  return {
    input: {
      productId,
      newStock,
      reason: form.reason.trim(),
      actorName: form.actorName.trim() || null,
    },
  };
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [stockAdjustmentForm, setStockAdjustmentForm] = useState<StockAdjustmentFormState>(emptyStockAdjustmentForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts() {
    setIsLoading(true);
    setError(null);

    const filters: ProductListFilters = {};

    if (search.trim()) {
      filters.search = search.trim();
    }

    if (categoryName) {
      filters.categoryName = categoryName;
    }

    if (lowStockFilter === "low") {
      filters.isLowStock = true;
    }

    if (statusFilter !== "all") {
      filters.isActive = statusFilter === "active";
    }

    try {
      setProducts(await window.stylecraft.products.list(filters));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load products.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, [search, categoryName, lowStockFilter, statusFilter]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const { input, error: validationError } = buildProductInput(form);

    if (!input) {
      setError(validationError ?? "Product details are incomplete.");
      return;
    }

    try {
      if (editingProductId === null) {
        await window.stylecraft.products.create(input);
      } else {
        await window.stylecraft.products.update(editingProductId, input);
      }

      setForm(emptyForm);
      setEditingProductId(null);
      await loadProducts();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save product.");
    }
  }

  async function handleMarkInactive(product: ProductDto) {
    setError(null);

    try {
      await window.stylecraft.products.markInactive(product.id);
      await loadProducts();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not mark product inactive.");
    }
  }

  async function handleStockAdjustmentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const { input, error: validationError } = buildStockAdjustmentInput(stockAdjustmentForm);

    if (!input) {
      setError(validationError ?? "Stock adjustment details are incomplete.");
      return;
    }

    try {
      await window.stylecraft.stock.adjust(input);
      setStockAdjustmentForm(emptyStockAdjustmentForm);
      await loadProducts();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not adjust stock.");
    }
  }

  function selectStockAdjustmentProduct(productId: string) {
    const selectedProduct = products.find((product) => product.id === Number(productId));

    setStockAdjustmentForm((current) => ({
      ...current,
      productId,
      newStock: selectedProduct ? String(selectedProduct.currentStock) : "",
    }));
  }

  function startEditing(product: ProductDto) {
    setEditingProductId(product.id);
    setForm(productToForm(product));
  }

  function cancelEditing() {
    setEditingProductId(null);
    setForm(emptyForm);
    setError(null);
  }

  const categories = Array.from(new Set(products.map((product) => product.categoryName).filter(Boolean) as string[])).sort();
  const activeProducts = products.filter((product) => product.isActive);
  const selectedStockAdjustmentProduct = products.find((product) => product.id === Number(stockAdjustmentForm.productId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Milestone 3 products module</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Products</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Maintain the product catalog, stock levels, pricing, active status, and low-stock alerts.
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">{products.length}</span> products in view
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="md:col-span-2">
          <h3 className="font-semibold text-slate-950">{editingProductId === null ? "Add product" : "Edit product"}</h3>
          <p className="mt-1 text-sm text-slate-500">Prices are entered as decimals and saved as integer cents.</p>
        </div>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="product-name">
          Product name
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="product-name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            value={form.name}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="product-sku">
          SKU
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="product-sku"
            onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
            value={form.sku}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="product-category">
          Category
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="product-category"
            onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))}
            value={form.categoryName}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="product-purchase-price">
          Purchase price
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="product-purchase-price"
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, purchasePrice: event.target.value }))}
            step="0.01"
            type="number"
            value={form.purchasePrice}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="product-selling-price">
          Selling price
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="product-selling-price"
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, sellingPrice: event.target.value }))}
            step="0.01"
            type="number"
            value={form.sellingPrice}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="product-current-stock">
          Current stock
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="product-current-stock"
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, currentStock: event.target.value }))}
            step="1"
            type="number"
            value={form.currentStock}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="product-low-stock-threshold">
          Low-stock threshold
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="product-low-stock-threshold"
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))}
            step="1"
            type="number"
            value={form.lowStockThreshold}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700" htmlFor="product-is-active">
          <input
            checked={form.isActive}
            id="product-is-active"
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            type="checkbox"
          />
          Active product
        </label>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit">{editingProductId === null ? "Add product" : "Save changes"}</Button>
          {editingProductId !== null ? (
            <Button onClick={cancelEditing} type="button" variant="ghost">
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <form className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4" noValidate onSubmit={handleStockAdjustmentSubmit}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950">Adjust stock</h3>
            <p className="mt-1 text-sm text-slate-600">
              Correct a physical count. Each adjustment records a stock movement and audit log entry.
            </p>
          </div>
          {selectedStockAdjustmentProduct ? (
            <div className="rounded-xl bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
              Current stock <span className="font-semibold text-slate-950">{selectedStockAdjustmentProduct.currentStock}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="stock-adjustment-product">
            Product
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="stock-adjustment-product"
              onChange={(event) => selectStockAdjustmentProduct(event.target.value)}
              value={stockAdjustmentForm.productId}
            >
              <option value="">Select product</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) - stock {product.currentStock}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="stock-adjustment-new-stock">
            Counted stock
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="stock-adjustment-new-stock"
              min="0"
              onChange={(event) => setStockAdjustmentForm((current) => ({ ...current, newStock: event.target.value }))}
              step="1"
              type="number"
              value={stockAdjustmentForm.newStock}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="stock-adjustment-reason">
            Reason
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="stock-adjustment-reason"
              onChange={(event) => setStockAdjustmentForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Physical count, damaged item, correction"
              value={stockAdjustmentForm.reason}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="stock-adjustment-actor">
            Adjusted by
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="stock-adjustment-actor"
              onChange={(event) => setStockAdjustmentForm((current) => ({ ...current, actorName: event.target.value }))}
              placeholder="Optional"
              value={stockAdjustmentForm.actorName}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isLoading || activeProducts.length === 0} type="submit">
            Adjust stock
          </Button>
        </div>
      </form>

      <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="products-search">
          Search
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="products-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or SKU"
            value={search}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="products-category-filter">
          Category filter
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="products-category-filter"
            onChange={(event) => setCategoryName(event.target.value)}
            value={categoryName}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="products-low-stock-filter">
          Stock filter
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="products-low-stock-filter"
            onChange={(event) => setLowStockFilter(event.target.value)}
            value={lowStockFilter}
          >
            <option value="all">All stock levels</option>
            <option value="low">Low stock only</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="products-status-filter">
          Status filter
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="products-status-filter"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Purchase</th>
                <th className="px-4 py-3 font-semibold">Selling</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={7}>
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={7}>
                    No products match these filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.sku}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{product.categoryName ?? "Uncategorized"}</td>
                    <td className="px-4 py-4 text-slate-600">{formatCurrency(product.purchasePriceCents)}</td>
                    <td className="px-4 py-4 text-slate-600">{formatCurrency(product.sellingPriceCents)}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">{product.currentStock}</div>
                      <div className="text-xs text-slate-500">Alert at {product.lowStockThreshold}</div>
                      {product.isLowStock ? (
                        <div className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                          Low stock
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          product.isActive
                            ? "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                            : "inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                        }
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => startEditing(product)} size="sm" type="button" variant="ghost">
                          Edit
                        </Button>
                        {product.isActive ? (
                          <Button onClick={() => void handleMarkInactive(product)} size="sm" type="button" variant="ghost">
                            Mark inactive
                          </Button>
                        ) : null}
                      </div>
                    </td>
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
