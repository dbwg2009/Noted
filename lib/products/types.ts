export type ProductCandidate = {
  title: string;
  description?: string | null;
  retailer?: string | null;
  url: string;
  imageUrl?: string | null;
  pricePence?: number | null;
  currency?: string | null;
  inStock?: boolean | null;
  rawPayload?: unknown;
};

export type ProductSearchContext = {
  wishlistDescription: string;
  sourceNote?: string | null;
  personName: string;
  relationship?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  sizes?: Record<string, string> | null;
  avoid?: string | null;
  tags?: string[];
};
