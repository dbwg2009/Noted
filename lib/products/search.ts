import { searchProductsWithEbay } from "./ebay";
import { searchProductsWithGemini } from "./gemini-grounded";
import type { ProductCandidate, ProductSearchContext } from "./types";

export type ProductSearchResult = {
  candidates: ProductCandidate[];
  geminiQuotaHit: boolean;
};

export async function searchProducts(context: ProductSearchContext): Promise<ProductSearchResult> {
  let geminiQuotaHit = false;
  try {
    const primary = await searchProductsWithGemini(context);
    if (primary.length > 0) return { candidates: primary, geminiQuotaHit };
  } catch (error) {
    console.error("Gemini product search failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    geminiQuotaHit =
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("Too Many Requests") ||
      message.toLowerCase().includes("quota");
  }

  try {
    const fallback = await searchProductsWithEbay(context);
    return { candidates: fallback, geminiQuotaHit };
  } catch (error) {
    console.error("eBay product search failed:", error);
    return { candidates: [], geminiQuotaHit };
  }
}
