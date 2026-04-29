import type { ProductCandidate, ProductSearchContext } from "./types";

type EbayBrowseResponse = {
  itemSummaries?: Array<{
    title?: string;
    itemWebUrl?: string;
    image?: { imageUrl?: string };
    price?: { value?: string; currency?: string };
    condition?: string;
  }>;
};

function parsePence(value: string | undefined, currency: string | undefined) {
  if (!value) return null;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  if (currency && currency !== "GBP") return null;
  return Math.round(numeric * 100);
}

export async function searchProductsWithEbay(context: ProductSearchContext): Promise<ProductCandidate[]> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return [];

  const query = encodeURIComponent(context.wishlistDescription);
  const endpoint = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&limit=8&filter=buyingOptions:{FIXED_PRICE}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${appId}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as EbayBrowseResponse;
  const summaries = payload.itemSummaries ?? [];

  return summaries
    .map((item) => ({
      title: item.title ?? "",
      description: item.condition ?? null,
      retailer: "eBay",
      url: item.itemWebUrl ?? "",
      imageUrl: item.image?.imageUrl ?? null,
      pricePence: parsePence(item.price?.value, item.price?.currency),
      currency: item.price?.currency ?? "GBP",
      inStock: true,
      rawPayload: item,
    }))
    .filter((item) => item.title && item.url);
}
