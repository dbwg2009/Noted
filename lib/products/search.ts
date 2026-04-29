import { searchProductsWithEbay } from "./ebay";
import { searchProductsWithGemini } from "./gemini-grounded";
import type { ProductCandidate, ProductSearchContext } from "./types";

export async function searchProducts(context: ProductSearchContext): Promise<ProductCandidate[]> {
  try {
    const primary = await searchProductsWithGemini(context);
    if (primary.length > 0) return primary;
  } catch (error) {
    console.error("Gemini product search failed:", error);
  }

  try {
    return await searchProductsWithEbay(context);
  } catch (error) {
    console.error("eBay product search failed:", error);
    return [];
  }
}
