import { z } from "zod";

const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const suggestionSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().optional().nullable(),
  estimatedPriceMinGbp: z.number().optional().nullable(),
  estimatedPriceMaxGbp: z.number().optional().nullable(),
});

const suggestionsSchema = z.array(suggestionSchema);

export type SuggestionContext = {
  personName: string;
  relationship: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  sizes: Record<string, string> | null;
  avoid: string | null;
  notes: string | null;
  tags: string[];
  wishlist: Array<{ description: string; status: string }>;
  history: Array<{ title: string; reactionNotes: string | null }>;
};

export type SuggestionCandidate = {
  title: string;
  rationale: string | null;
  estimatedPriceMinPence: number | null;
  estimatedPriceMaxPence: number | null;
};

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

function buildPrompt(ctx: SuggestionContext) {
  const wishlistList =
    ctx.wishlist.length === 0
      ? "(empty)"
      : ctx.wishlist.map((w, i) => `${i + 1}. ${w.description} [${w.status}]`).join("\n");
  const historyList =
    ctx.history.length === 0
      ? "(none)"
      : ctx.history
          .map(
            (h, i) =>
              `${i + 1}. ${h.title}${h.reactionNotes ? ` — reaction: ${h.reactionNotes}` : ""}`,
          )
          .join("\n");
  const budget =
    ctx.budgetMin || ctx.budgetMax
      ? `${ctx.budgetMin ? `£${(ctx.budgetMin / 100).toFixed(2)}` : "—"} to ${
          ctx.budgetMax ? `£${(ctx.budgetMax / 100).toFixed(2)}` : "—"
        }`
      : "not specified";

  return `You are helping me brainstorm UK birthday gift ideas. Return ONLY a JSON array, no prose, no code fences.

Suggest 6 thoughtful, distinct gift ideas for this person. Avoid suggesting anything already on their wishlist or in their gift history. Use their interests, notes, and avoid-list. Spread across price points within their budget.

Person: ${ctx.personName}
Relationship: ${ctx.relationship ?? "not specified"}
Budget GBP: ${budget}
Sizes: ${JSON.stringify(ctx.sizes ?? {})}
Avoid: ${ctx.avoid ?? "none"}
Notes: ${ctx.notes ?? "none"}
Tags / interests: ${ctx.tags.join(", ") || "none"}

Wishlist (do NOT suggest these):
${wishlistList}

Already given (do NOT suggest these again):
${historyList}

Output schema (JSON array, 6 items):
{
  "title": string,            // concise gift idea title
  "rationale": string | null, // 1 sentence on why it fits
  "estimatedPriceMinGbp": number | null,
  "estimatedPriceMaxGbp": number | null
}`;
}

export async function suggestGiftsForPerson(ctx: SuggestionContext): Promise<SuggestionCandidate[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

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
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You output ONLY valid JSON arrays. No code fences, no commentary.",
        },
        { role: "user", content: buildPrompt(ctx) },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenRouter returned no content");

  const parsed = suggestionsSchema.parse(JSON.parse(extractJsonArray(text)));

  return parsed.map((s) => ({
    title: s.title,
    rationale: s.rationale ?? null,
    estimatedPriceMinPence: penceFromGbp(s.estimatedPriceMinGbp),
    estimatedPriceMaxPence: penceFromGbp(s.estimatedPriceMaxGbp),
  }));
}
