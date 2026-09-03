import type { ProductDto, ProductVariantDto } from "@/types/stylecraft-api";

const selectClass =
  "rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-950 dark:text-slate-50 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50";

function activeVariants(product: ProductDto | undefined): ProductVariantDto[] {
  return product?.variants.filter((variant) => variant.isActive) ?? [];
}

/** Finds the size/colour a stored line points at, along with the product it belongs to. */
export function findVariant(products: ProductDto[], variantId: number) {
  for (const product of products) {
    const variant = product.variants.find((entry) => entry.id === variantId);

    if (variant !== undefined) {
      return { product, variant };
    }
  }

  return undefined;
}

type VariantPickerProps = {
  idPrefix: string;
  label: string;
  products: ProductDto[];
  productId: string;
  variantId: string;
  onProductChange: (productId: string) => void;
  onVariantChange: (variantId: string) => void;
};

/**
 * Two linked dropdowns: pick the style, then the size/colour that carries stock.
 * A product with only a standard variant still shows the second dropdown, so the
 * quantity being bought or sold is always tied to a specific row of stock.
 */
export function VariantPicker({ idPrefix, label, products, productId, variantId, onProductChange, onVariantChange }: VariantPickerProps) {
  const selectedProduct = products.find((product) => String(product.id) === productId);
  const variants = activeVariants(selectedProduct);

  return (
    <>
      <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={`${idPrefix}-product`}>
        {label}
        <select className={selectClass} id={`${idPrefix}-product`} onChange={(event) => onProductChange(event.target.value)} value={productId}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku}) - stock {product.currentStock}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={`${idPrefix}-variant`}>
        Size / colour
        <select className={selectClass} disabled={variants.length === 0} id={`${idPrefix}-variant`} onChange={(event) => onVariantChange(event.target.value)} value={variantId}>
          <option value="">{selectedProduct === undefined ? "Pick a product first" : "Select size/colour"}</option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label} - stock {variant.currentStock}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
