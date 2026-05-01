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

const productsSchema = z.array(productSchema);

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
  return `You are helping with UK birthday gift shopping. Return ONLY a JSON array, no prose, no code fences.

Suggest exactly 3 or 4 product candidates that fit this wishlist item. Prefer well-known UK retailers (Amazon UK, John Lewis, Argos, Currys, Waterstones, Lego.com, etc.). 

IMPORTANT: Only include URLs you are 100% confident exist and lead directly to the product. If you are not absolutely sure of the specific product URL, provide the retailer's search results page or homepage URL instead. Do NOT hallucinate deep links.
...
Output schema (JSON array, 3-4 items):
Wishlist item: ${context.wishlistDescription}
Source note: ${context.sourceNote ?? "none"}
Recipient: ${context.personName}
Relationship: ${context.relationship ?? "not specified"}
Budget min GBP: ${context.budgetMin ? (context.budgetMin / 100).toFixed(2) : "not specified"}
Budget max GBP: ${context.budgetMax ? (context.budgetMax / 100).toFixed(2) : "not specified"}
Sizes: ${JSON.stringify(context.sizes ?? {})}
Avoid: ${context.avoid ?? "none"}
Tags / interests: ${(context.tags ?? []).join(", ") || "none"}
Region: UK · Currency: GBP

Output schema (JSON array, each item):
{
  "title": string,
  "description": string | null,
  "retailer": string | null,
  "url": "https://...",
  "imageUrl": "https://... | null",
  "priceGbp": number | null,
  "inStock": boolean | null
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
  const appName = process.env.OPENROUTER_APP_NAME?.trim() || "Birthday Gift Finder";

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
