import { searchProductsWithEbay } from "./ebay";
import { searchProductsWithOpenRouter } from "./openrouter";
import type { ProductCandidate, ProductSearchContext } from "./types";

export type ProductSearchResult = {
  candidates: ProductCandidate[];
  llmQuotaHit: boolean;
};

export async function searchProducts(context: ProductSearchContext): Promise<ProductSearchResult> {
  let llmQuotaHit = false;
  try {
    const primary = await searchProductsWithOpenRouter(context);
    if (primary.length > 0) return { candidates: primary, llmQuotaHit };
  } catch (error) {
    console.error("OpenRouter product search failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    llmQuotaHit =
      message.includes("429") ||
      message.includes("Too Many Requests") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate limit");
  }

  try {
    const fallback = await searchProductsWithEbay(context);
    return { candidates: fallback, llmQuotaHit };
  } catch (error) {
    console.error("eBay product search failed:", error);
    return { candidates: [], llmQuotaHit };
  }
}
