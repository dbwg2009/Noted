import { searchProductsWithEbay } from "./ebay";
import { searchProductsWithOpenRouter } from "./openrouter";
import type { ProductCandidate, ProductSearchContext } from "./types";

export type ProductSearchResult = {
  candidates: ProductCandidate[];
  llmRateLimited: boolean;
  llmError: string | null;
  ebayConfigured: boolean;
  ebayError: string | null;
};

function detectRateLimit(message: string) {
  return (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.toLowerCase().includes("quota") ||
    message.toLowerCase().includes("rate limit")
  );
}

export async function searchProducts(context: ProductSearchContext): Promise<ProductSearchResult> {
  let llmRateLimited = false;
  let llmError: string | null = null;

  try {
    const primary = await searchProductsWithOpenRouter(context);
    if (primary.length > 0) {
      return {
        candidates: primary,
        llmRateLimited: false,
        llmError: null,
        ebayConfigured: Boolean(process.env.EBAY_APP_ID),
        ebayError: null,
      };
    }
  } catch (error) {
    console.error("OpenRouter product search failed:", error);
    llmError = error instanceof Error ? error.message : String(error);
    llmRateLimited = detectRateLimit(llmError);
  }

  const ebayConfigured = Boolean(process.env.EBAY_APP_ID);
  let ebayError: string | null = null;
  try {
    const fallback = await searchProductsWithEbay(context);
    return {
      candidates: fallback,
      llmRateLimited,
      llmError,
      ebayConfigured,
      ebayError: null,
    };
  } catch (error) {
    console.error("eBay product search failed:", error);
    ebayError = error instanceof Error ? error.message : String(error);
    return { candidates: [], llmRateLimited, llmError, ebayConfigured, ebayError };
  }
}
