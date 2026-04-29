import type { ProductCandidate, ProductSearchContext } from "./types";

type EbayBrowseResponse = {
  findItemsByKeywordsResponse?: Array<{
    searchResult?: Array<{
      item?: Array<{
        title?: string[];
        viewItemURL?: string[];
        galleryURL?: string[];
        sellingStatus?: Array<{
          currentPrice?: Array<{ __value__?: string; "@currencyId"?: string }>;
        }>;
        condition?: Array<{ conditionDisplayName?: string[] }>;
      }>;
    }>;
  }>;
};

function first<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value[0] : undefined;
}

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
  const endpoint = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${encodeURIComponent(
    appId,
  )}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&GLOBAL-ID=EBAY-GB&paginationInput.entriesPerPage=8&itemFilter(0).name=ListingType&itemFilter(0).value=FixedPrice&keywords=${query}`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return [];

  const payload = (await response.json()) as EbayBrowseResponse;
  const items = first(first(payload.findItemsByKeywordsResponse)?.searchResult)?.item ?? [];

  return items
    .map((item) => {
      const currentPrice = first(first(item.sellingStatus)?.currentPrice);
      return {
        title: first(item.title) ?? "",
        description: first(first(item.condition)?.conditionDisplayName) ?? null,
        retailer: "eBay",
        url: first(item.viewItemURL) ?? "",
        imageUrl: first(item.galleryURL) ?? null,
        pricePence: parsePence(currentPrice?.__value__, currentPrice?.["@currencyId"]),
        currency: currentPrice?.["@currencyId"] ?? "GBP",
        inStock: true,
        rawPayload: item,
      };
    })
    .filter((item) => item.title && item.url);
}
