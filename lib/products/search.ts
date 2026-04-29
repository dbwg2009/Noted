import { searchProductsWithEbay } from "./ebay";
import { searchProductsWithGemini } from "./gemini-grounded";
import type { ProductCandidate, ProductSearchContext } from "./types";

export async function searchProducts(context: ProductSearchContext): Promise<ProductCandidate[]> {
  try {
    const primary = await searchProductsWithGemini(context);
    if (primary.length > 0) return primary;
  } catch {
    // Fall through to eBay fallback.
  }

  return searchProductsWithEbay(context);
}
