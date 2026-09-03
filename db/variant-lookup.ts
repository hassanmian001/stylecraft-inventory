import { eq } from "drizzle-orm";

import { createDb } from "./client.js";
import { productVariants, products } from "./schema.js";

type Db = ReturnType<typeof createDb>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbClient = Db | Tx;

export type VariantWithProduct = {
  variant: typeof productVariants.$inferSelect;
  product: typeof products.$inferSelect;
};

/**
 * Loads the size/colour a transaction line points at along with its product, so
 * callers can check stock and prices in one place. `fail` lets each service throw
 * its own validation error type.
 */
export function loadVariantWithProduct(db: DbClient, variantId: number, fail: (message: string) => never): VariantWithProduct {
  const variant = db.select().from(productVariants).where(eq(productVariants.id, variantId)).get();

  if (variant === undefined) {
    fail("Product size/colour was not found.");
  }

  const product = db.select().from(products).where(eq(products.id, variant.productId)).get();

  if (product === undefined) {
    fail("Product was not found.");
  }

  return { variant, product };
}

/** The variant's own price when it overrides the product, otherwise the product's. */
export function effectivePurchasePriceCents({ variant, product }: VariantWithProduct) {
  return variant.purchasePriceCents ?? product.purchasePriceCents;
}

export function effectiveSellingPriceCents({ variant, product }: VariantWithProduct) {
  return variant.sellingPriceCents ?? product.sellingPriceCents;
}
