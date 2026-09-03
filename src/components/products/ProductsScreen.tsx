import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type { ProductDto, ProductInput, ProductListFilters, ProductVariantDto, ProductVariantInput, StockAdjustmentInput } from "@/types/stylecraft-api";

type VariantFormState = {
  key: string;
  id: number | null;
  size: string;
  color: string;
  sku: string;
  currentStock: string;
  purchasePrice: string;
  sellingPrice: string;
  lowStockThreshold: string;
  isActive: boolean;
};

type ProductFormState = {
  name: string;
  sku: string;
  categoryName: string;
  purchasePrice: string;
  sellingPrice: string;
  lowStockThreshold: string;
  isActive: boolean;
  variants: VariantFormState[];
};

type StockAdjustmentFormState = {
  variantId: string;
  newStock: string;
  reason: string;
  actorName: string;
};

const inputClass =
  "rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50";

let variantKeyCounter = 0;

function nextVariantKey() {
  variantKeyCounter += 1;
  return `variant-${variantKeyCounter}`;
}

function makeEmptyVariant(): VariantFormState {
  return {
    key: nextVariantKey(),
    id: null,
    size: "",
    color: "",
    sku: "",
    currentStock: "0",
    purchasePrice: "",
    sellingPrice: "",
    lowStockThreshold: "",
    isActive: true,
  };
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  categoryName: "",
  purchasePrice: "",
  sellingPrice: "",
  lowStockThreshold: "0",
  isActive: true,
  variants: [makeEmptyVariant()],
};

const emptyStockAdjustmentForm: StockAdjustmentFormState = {
  variantId: "",
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

/** Turns "Hoodie" + "L" + "Black" into HOOD-L-BLACK, so SKUs need not be typed. */
function suggestVariantSku(productSku: string, size: string, color: string) {
  const parts = [productSku, size, color].map((part) => part.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(Boolean);
  return parts.join("-");
}

function variantToForm(variant: ProductVariantDto): VariantFormState {
  return {
    key: nextVariantKey(),
    id: variant.id,
    size: variant.size ?? "",
    color: variant.color ?? "",
    sku: variant.sku,
    currentStock: String(variant.currentStock),
    purchasePrice: variant.purchasePriceOverrideCents === null ? "" : centsToInput(variant.purchasePriceOverrideCents),
    sellingPrice: variant.sellingPriceOverrideCents === null ? "" : centsToInput(variant.sellingPriceOverrideCents),
    lowStockThreshold: variant.lowStockThresholdOverride === null ? "" : String(variant.lowStockThresholdOverride),
    isActive: variant.isActive,
  };
}

function productToForm(product: ProductDto): ProductFormState {
  return {
    name: product.name,
    sku: product.sku,
    categoryName: product.categoryName ?? "",
    purchasePrice: centsToInput(product.purchasePriceCents),
    sellingPrice: centsToInput(product.sellingPriceCents),
    lowStockThreshold: String(product.lowStockThreshold),
    isActive: product.isActive,
    variants: product.variants.length > 0 ? product.variants.map(variantToForm) : [makeEmptyVariant()],
  };
}

function buildVariantInput(variant: VariantFormState, productSku: string): { input?: ProductVariantInput; error?: string } {
  const currentStock = Number(variant.currentStock);

  if (!Number.isInteger(currentStock) || currentStock < 0) {
    return { error: "Stock for each size/colour must be a whole number of zero or more." };
  }

  const sku = variant.sku.trim() || suggestVariantSku(productSku, variant.size, variant.color);

  if (!sku) {
    return { error: "Every size/colour needs its own SKU." };
  }

  const optionalCents = (value: string, label: string) => {
    if (!value.trim()) {
      return { value: null as number | null };
    }

    const cents = decimalStringToCents(value);

    if (!Number.isFinite(cents) || cents < 0) {
      return { error: `${label} must be a valid zero or positive amount.` };
    }

    return { value: cents };
  };

  const purchase = optionalCents(variant.purchasePrice, "Purchase price");
  const selling = optionalCents(variant.sellingPrice, "Selling price");

  if (purchase.error) {
    return { error: purchase.error };
  }

  if (selling.error) {
    return { error: selling.error };
  }

  let lowStockThreshold: number | null = null;

  if (variant.lowStockThreshold.trim()) {
    const parsed = Number(variant.lowStockThreshold);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return { error: "Alert level must be a whole number of zero or more." };
    }

    lowStockThreshold = parsed;
  }

  return {
    input: {
      id: variant.id,
      size: variant.size.trim() || null,
      color: variant.color.trim() || null,
      sku,
      currentStock,
      purchasePriceCents: purchase.value ?? null,
      sellingPriceCents: selling.value ?? null,
      lowStockThreshold,
      isActive: variant.isActive,
    },
  };
}

function buildProductInput(form: ProductFormState): { input?: ProductInput; error?: string } {
  const purchasePriceCents = decimalStringToCents(form.purchasePrice);
  const sellingPriceCents = decimalStringToCents(form.sellingPrice);
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

  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
    return { error: "Alert level must be a whole number of zero or more." };
  }

  if (form.variants.length === 0) {
    return { error: "Add at least one size/colour row." };
  }

  const variants: ProductVariantInput[] = [];

  for (const variant of form.variants) {
    const { input, error } = buildVariantInput(variant, form.sku.trim());

    if (!input) {
      return { error };
    }

    variants.push(input);
  }

  return {
    input: {
      name: form.name.trim(),
      sku: form.sku.trim(),
      categoryName: form.categoryName.trim() || null,
      purchasePriceCents,
      sellingPriceCents,
      lowStockThreshold,
      isActive: form.isActive,
      variants,
    },
  };
}

function buildStockAdjustmentInput(form: StockAdjustmentFormState): { input?: StockAdjustmentInput; error?: string } {
  const variantId = Number(form.variantId);
  const newStock = Number(form.newStock);

  if (!Number.isInteger(variantId) || variantId <= 0) {
    return { error: "Select a size/colour to adjust." };
  }

  if (!Number.isInteger(newStock) || newStock < 0) {
    return { error: "Counted stock must be a whole number of zero or more." };
  }

  if (!form.reason.trim()) {
    return { error: "Adjustment reason is required." };
  }

  return {
    input: {
      variantId,
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

      setForm({ ...emptyForm, variants: [makeEmptyVariant()] });
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

  function selectStockAdjustmentVariant(variantId: string) {
    const selected = adjustableVariants.find((entry) => String(entry.variant.id) === variantId);

    setStockAdjustmentForm((current) => ({
      ...current,
      variantId,
      newStock: selected ? String(selected.variant.currentStock) : "",
    }));
  }

  function updateVariant(key: string, changes: Partial<VariantFormState>) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) => {
        if (variant.key !== key) {
          return variant;
        }

        const merged = { ...variant, ...changes };

        // Keep filling in the SKU from the size and colour until it is typed by hand.
        if ((changes.size !== undefined || changes.color !== undefined) && (!variant.sku || variant.sku === suggestVariantSku(current.sku, variant.size, variant.color))) {
          merged.sku = suggestVariantSku(current.sku, merged.size, merged.color);
        }

        return merged;
      }),
    }));
  }

  function addVariantRow() {
    setForm((current) => ({ ...current, variants: [...current.variants, makeEmptyVariant()] }));
  }

  function removeVariantRow(key: string) {
    setForm((current) => ({
      ...current,
      variants: current.variants.length === 1 ? current.variants : current.variants.filter((variant) => variant.key !== key),
    }));
  }

  function startEditing(product: ProductDto) {
    setEditingProductId(product.id);
    setForm(productToForm(product));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingProductId(null);
    setForm({ ...emptyForm, variants: [makeEmptyVariant()] });
    setError(null);
  }

  const categories = Array.from(new Set(products.map((product) => product.categoryName).filter(Boolean) as string[])).sort();
  const adjustableVariants = products
    .filter((product) => product.isActive)
    .flatMap((product) => product.variants.filter((variant) => variant.isActive).map((variant) => ({ product, variant })));
  const selectedAdjustment = adjustableVariants.find((entry) => String(entry.variant.id) === stockAdjustmentForm.variantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Catalog</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Products</h2>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            One entry per style. Add its sizes and colours below — each one carries its own stock, and its own price only when it differs.
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <span className="font-semibold">{products.length}</span> products in view
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </div>
      ) : null}

      <form className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4" onSubmit={handleSubmit}>
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-slate-50">{editingProductId === null ? "Add product" : "Edit product"}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Prices are entered as decimals and saved as integer cents.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="product-name">
            Product name
            <input className={inputClass} id="product-name" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="product-sku">
            SKU
            <input className={inputClass} id="product-sku" onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} value={form.sku} />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="product-category">
            Category
            <input className={inputClass} id="product-category" onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))} value={form.categoryName} />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="product-low-stock">
            Alert at stock
            <input
              className={inputClass}
              id="product-low-stock"
              min="0"
              onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))}
              step="1"
              type="number"
              value={form.lowStockThreshold}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="product-purchase-price">
            Purchase price
            <input
              className={inputClass}
              id="product-purchase-price"
              min="0"
              onChange={(event) => setForm((current) => ({ ...current, purchasePrice: event.target.value }))}
              step="0.01"
              type="number"
              value={form.purchasePrice}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="product-selling-price">
            Selling price
            <input
              className={inputClass}
              id="product-selling-price"
              min="0"
              onChange={(event) => setForm((current) => ({ ...current, sellingPrice: event.target.value }))}
              step="0.01"
              type="number"
              value={form.sellingPrice}
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="product-active">
            <input checked={form.isActive} id="product-active" onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" />
            Active
          </label>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="font-semibold text-slate-950 dark:text-slate-50">Sizes and colours</h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Leave both blank for a product that has no sizes. Leave a price blank to use the product price above.
              </p>
            </div>
            <Button onClick={addVariantRow} size="sm" type="button" variant="ghost">
              Add size/colour
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-2 font-semibold">Size</th>
                  <th className="px-2 py-2 font-semibold">Colour</th>
                  <th className="px-2 py-2 font-semibold">SKU</th>
                  <th className="px-2 py-2 font-semibold">Stock</th>
                  <th className="px-2 py-2 font-semibold">Purchase</th>
                  <th className="px-2 py-2 font-semibold">Selling</th>
                  <th className="px-2 py-2 font-semibold">Alert at</th>
                  <th className="px-2 py-2 font-semibold">Active</th>
                  <th className="px-2 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {form.variants.map((variant) => (
                  <tr key={variant.key}>
                    <td className="px-2 py-1">
                      <input aria-label="Size" className={`${inputClass} w-24`} onChange={(event) => updateVariant(variant.key, { size: event.target.value })} placeholder="L" value={variant.size} />
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label="Colour" className={`${inputClass} w-28`} onChange={(event) => updateVariant(variant.key, { color: event.target.value })} placeholder="Black" value={variant.color} />
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label="Variant SKU" className={`${inputClass} w-36`} onChange={(event) => updateVariant(variant.key, { sku: event.target.value })} value={variant.sku} />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        aria-label="Variant stock"
                        className={`${inputClass} w-20`}
                        min="0"
                        onChange={(event) => updateVariant(variant.key, { currentStock: event.target.value })}
                        step="1"
                        type="number"
                        value={variant.currentStock}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        aria-label="Variant purchase price"
                        className={`${inputClass} w-24`}
                        min="0"
                        onChange={(event) => updateVariant(variant.key, { purchasePrice: event.target.value })}
                        placeholder="same"
                        step="0.01"
                        type="number"
                        value={variant.purchasePrice}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        aria-label="Variant selling price"
                        className={`${inputClass} w-24`}
                        min="0"
                        onChange={(event) => updateVariant(variant.key, { sellingPrice: event.target.value })}
                        placeholder="same"
                        step="0.01"
                        type="number"
                        value={variant.sellingPrice}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        aria-label="Variant alert level"
                        className={`${inputClass} w-20`}
                        min="0"
                        onChange={(event) => updateVariant(variant.key, { lowStockThreshold: event.target.value })}
                        placeholder="same"
                        step="1"
                        type="number"
                        value={variant.lowStockThreshold}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label="Variant active" checked={variant.isActive} onChange={(event) => updateVariant(variant.key, { isActive: event.target.checked })} type="checkbox" />
                    </td>
                    <td className="px-2 py-1">
                      <Button disabled={form.variants.length === 1} onClick={() => removeVariantRow(variant.key)} size="sm" type="button" variant="ghost">
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{editingProductId === null ? "Add product" : "Save changes"}</Button>
          {editingProductId !== null ? (
            <Button onClick={cancelEditing} type="button" variant="ghost">
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <form className="grid gap-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4" noValidate onSubmit={handleStockAdjustmentSubmit}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-slate-50">Adjust stock</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Correct a physical count. Each adjustment records a stock movement and audit log entry.</p>
          </div>
          {selectedAdjustment ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 shadow-sm">
              Current stock <span className="font-semibold text-slate-950 dark:text-slate-50">{selectedAdjustment.variant.currentStock}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="stock-adjustment-variant">
            Product size/colour
            <select className={inputClass} id="stock-adjustment-variant" onChange={(event) => selectStockAdjustmentVariant(event.target.value)} value={stockAdjustmentForm.variantId}>
              <option value="">Select size/colour</option>
              {adjustableVariants.map(({ product, variant }) => (
                <option key={variant.id} value={variant.id}>
                  {product.name} - {variant.label} ({variant.sku}) - stock {variant.currentStock}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="stock-adjustment-new-stock">
            Counted stock
            <input
              className={inputClass}
              id="stock-adjustment-new-stock"
              min="0"
              onChange={(event) => setStockAdjustmentForm((current) => ({ ...current, newStock: event.target.value }))}
              step="1"
              type="number"
              value={stockAdjustmentForm.newStock}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="stock-adjustment-reason">
            Reason
            <input
              className={inputClass}
              id="stock-adjustment-reason"
              onChange={(event) => setStockAdjustmentForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Physical count, damaged item, correction"
              value={stockAdjustmentForm.reason}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="stock-adjustment-actor">
            Adjusted by
            <input
              className={inputClass}
              id="stock-adjustment-actor"
              onChange={(event) => setStockAdjustmentForm((current) => ({ ...current, actorName: event.target.value }))}
              placeholder="Optional"
              value={stockAdjustmentForm.actorName}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isLoading || adjustableVariants.length === 0} type="submit">
            Adjust stock
          </Button>
        </div>
      </form>

      <div className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="products-search">
          Search
          <input className={inputClass} id="products-search" onChange={(event) => setSearch(event.target.value)} placeholder="Name or SKU" value={search} />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="products-category-filter">
          Category filter
          <select className={inputClass} id="products-category-filter" onChange={(event) => setCategoryName(event.target.value)} value={categoryName}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="products-low-stock-filter">
          Stock filter
          <select className={inputClass} id="products-low-stock-filter" onChange={(event) => setLowStockFilter(event.target.value)} value={lowStockFilter}>
            <option value="all">All stock levels</option>
            <option value="low">Low stock only</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="products-status-filter">
          Status filter
          <select className={inputClass} id="products-status-filter" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={7}>
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={7}>
                    No products match these filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${editingProductId === product.id ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}
                    key={product.id}
                    onClick={() => startEditing(product)}
                    title="Open this product"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950 dark:text-slate-50">{product.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{product.sku}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{product.categoryName ?? "Uncategorized"}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatCurrency(product.purchasePriceCents)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatCurrency(product.sellingPriceCents)}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950 dark:text-slate-50">{product.currentStock}</div>
                      {product.hasVariants ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {product.variants.map((variant) => (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                variant.isLowStock
                                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                              key={variant.id}
                            >
                              {variant.label} {variant.currentStock}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400">Alert at {product.lowStockThreshold}</div>
                      )}
                      {product.isLowStock ? (
                        <div className="mt-1 inline-flex rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">Low stock</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          product.isActive
                            ? "inline-flex rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                            : "inline-flex rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        }
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={(event) => { event.stopPropagation(); startEditing(product); }} size="sm" type="button" variant="ghost">
                          Edit
                        </Button>
                        {product.isActive ? (
                          <Button onClick={(event) => { event.stopPropagation(); void handleMarkInactive(product); }} size="sm" type="button" variant="ghost">
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
