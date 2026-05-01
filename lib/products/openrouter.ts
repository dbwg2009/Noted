import { z } from "zod";
import type { ProductCandidate, ProductSearchContext } from "./types";

const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const productSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  retailer: z.string().optional().nullable(),
  url: z.string().url(),
  imageUrl: z.string().url().optional().nullable(),
  priceGbp: z.number().optional().nullable(),
  inStock: z.boolean().optional().nullable(),
});

const productsSchema = z.array(productSchema).max(4);

function penceFromGbp(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function extractJsonArray(text: string) {
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/i, "");
  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("OpenRouter response did not contain a JSON array");
  }
  return stripped.slice(start, end + 1);
}
function buildPrompt(context: ProductSearchContext) {
  const minGbp = context.budgetMin ? (context.budgetMin / 100).toFixed(2) : null;
  const maxGbp = context.budgetMax ? (context.budgetMax / 100).toFixed(2) : null;
  const budgetLine =
    minGbp || maxGbp
      ? `CRITICAL BUDGET RULE: Every single product MUST fall strictly within the price range £${minGbp ?? "0"} to £${maxGbp ?? "unlimited"}. DO NOT suggest products even £0.01 above this maximum or below this minimum. If you cannot find items in range, return fewer results or an empty array.`
      : "Budget: not specified — pick a sensible mid-range price.";

  return `You are helping with UK birthday gift shopping. Return ONLY a JSON array, no prose, no code fences.

Suggest 3 or 4 product candidates (max 4) that fit this wishlist item.

RETAILER PREFERENCE — try in this order:
  1. Amazon UK (amazon.co.uk) — preferred for most items.
  2. Other major UK retailers: John Lewis, Argos, Currys, Waterstones, Lego.com, Smyths, Boots.
Only fall back to a smaller/specialty retailer if none of the above carry the item.

URL RULES — links must lead to a real, currently-purchasable page:
  - Only include URLs you are highly confident exist and lead to a CURRENT listing.
  - Do NOT link to discontinued or out-of-stock products.
  - If unsure of the exact product URL, use the retailer's search-results page, e.g.
    https://www.amazon.co.uk/s?k=<url-encoded+keywords>
    https://www.johnlewis.com/search?search-term=<keywords>
  - Never invent /dp/ASIN or product IDs you are not certain about.

${budgetLine}

Wishlist item: ${context.wishlistDescription}
Source note: ${context.sourceNote ?? "none"}
Recipient: ${context.personName}
Relationship: ${context.relationship ?? "not specified"}
Sizes: ${JSON.stringify(context.sizes ?? {})}
Avoid: ${context.avoid ?? "none"}
Tags / interests: ${(context.tags ?? []).join(", ") || "none"}
Region: UK · Currency: GBP

Output schema (JSON array, 3 or 4 items, each item):
{
  "title": string,
  "description": string | null,
  "retailer": string | null,
  "url": "https://...",
  "imageUrl": "https://... | null",
  "priceGbp": number | null,    // must be within the budget above when one is given
  "inStock": boolean | null     // true only if you are confident the item is currently available
}`;
}

export async function searchProductsWithOpenRouter(
  context: ProductSearchContext,
): Promise<ProductCandidate[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  const referer = process.env.OPENROUTER_REFERER?.trim() || "http://localhost:3000";
  const appName = process.env.OPENROUTER_APP_NAME?.trim() || "Noted";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": appName,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `Reply with ONLY a valid JSON array. No prose, no markdown, no code fences.\n\n${buildPrompt(context)}`,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.error("OpenRouter HTTP error", {
      status: response.status,
      model,
      bodySnippet: errBody.slice(0, 500),
    });
    throw new Error(`OpenRouter HTTP ${response.status}: ${errBody.slice(0, 200) || response.statusText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("OpenRouter returned no content");
  }

  const parsed = productsSchema.parse(JSON.parse(extractJsonArray(text)));

  return parsed.map((product) => ({
    title: product.title,
    description: product.description ?? null,
    retailer: product.retailer ?? null,
    url: product.url,
    imageUrl: product.imageUrl ?? null,
    pricePence: penceFromGbp(product.priceGbp),
    currency: "GBP",
    inStock: product.inStock ?? null,
    rawPayload: product,
  }));
}
