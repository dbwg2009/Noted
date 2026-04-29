import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { ProductCandidate, ProductSearchContext } from "./types";

const modelName = "gemini-2.0-flash";

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
  const normalized = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const start = normalized.indexOf("[");
  const end = normalized.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response did not contain a JSON array");
  }
  return normalized.slice(start, end + 1);
}

export async function searchProductsWithGemini(context: ProductSearchContext): Promise<ProductCandidate[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `You are helping with UK birthday gift shopping.
Return ONLY a JSON array and nothing else.

Find up to 6 real products that match this wishlist item:
- Wishlist item: ${context.wishlistDescription}
- Source note: ${context.sourceNote ?? "none"}
- Person: ${context.personName}
- Relationship: ${context.relationship ?? "not specified"}
- Budget min GBP: ${context.budgetMin ? (context.budgetMin / 100).toFixed(2) : "not specified"}
- Budget max GBP: ${context.budgetMax ? (context.budgetMax / 100).toFixed(2) : "not specified"}
- Sizes: ${JSON.stringify(context.sizes ?? {})}
- Avoid list: ${context.avoid ?? "none"}
- Tags: ${(context.tags ?? []).join(", ") || "none"}
- Region: UK
- Currency: GBP

Output schema:
[
  {
    "title": "string",
    "description": "string | null",
    "retailer": "string | null",
    "url": "https://...",
    "imageUrl": "https://... | null",
    "priceGbp": number | null,
    "inStock": boolean | null
  }
]`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const text =
    typeof response.text === "function" ? await response.text() : String(response.text ?? "");
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
