"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { requireCurrentUserId } from "@/lib/people-queries";
import {
  aiRequestLog,
  giftHistory,
  people,
  personTags,
  products,
  suggestions,
  tags,
  users,
  wishlistItems,
  wishlistStatus,
} from "@/db/schema";
import { searchProducts } from "@/lib/products/search";
import { suggestGiftsForPerson } from "@/lib/suggestions";
import { ensureDefaultReminders, sendReminderForPersonNow } from "@/lib/reminders";
import { savePhoto } from "@/lib/storage";
import { randomUUID } from "node:crypto";

type PeopleFlashTone = "success" | "warning" | "error";

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

async function setPeopleFlash(message: string, tone: PeopleFlashTone) {
  const store = await cookies();
  store.set(
    "people_flash",
    JSON.stringify({ message, tone, ts: Date.now() }),
    {
      path: "/people",
      maxAge: 30,
      httpOnly: true,
      sameSite: "lax",
    },
  );
}

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function parseBirthday(formData: FormData) {
  const birthYearKnown = formData.get("birthYearKnown") === "on";
  const yearStr = String(formData.get("birthdayYear") ?? "").trim();
  const monthStr = String(formData.get("birthdayMonth") ?? "").trim();
  const dayStr = String(formData.get("birthdayDay") ?? "").trim();

  if (!monthStr || !dayStr) return null;

  const month = Number(monthStr);
  const day = Number(dayStr);
  const year = birthYearKnown && yearStr ? Number(yearStr) : 2000;

  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;

  // Validate date
  const date = new Date(year, month - 1, day);
  if (date.getMonth() + 1 !== month || date.getDate() !== day) return null;

  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseMoneyToPence(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric * 100);
}

function parseTagNames(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split(",")) {
    const trimmed = raw.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function parseSizes(formData: FormData) {
  const top = String(formData.get("sizeTop") ?? "").trim();
  const bottom = String(formData.get("sizeBottom") ?? "").trim();
  const shoe = String(formData.get("sizeShoe") ?? "").trim();
  const ring = String(formData.get("sizeRing") ?? "").trim();
  const sizes = {
    ...(top ? { top } : {}),
    ...(bottom ? { bottom } : {}),
    ...(shoe ? { shoe } : {}),
    ...(ring ? { ring } : {}),
  };
  return Object.keys(sizes).length > 0 ? sizes : null;
}

function parseWishlistStatus(value: FormDataEntryValue | null): (typeof wishlistStatus.enumValues)[number] {
  const asString = typeof value === "string" ? value : "";
  if (wishlistStatus.enumValues.includes(asString as (typeof wishlistStatus.enumValues)[number])) {
    return asString as (typeof wishlistStatus.enumValues)[number];
  }
  return "idea";
}

async function syncTagsForPerson(userId: string, personId: string, tagValue: FormDataEntryValue | null) {
  const tagNames = parseTagNames(tagValue);

  await db.delete(personTags).where(eq(personTags.personId, personId));
  if (tagNames.length === 0) return;

  const existing = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, tagNames)));

  const existingByName = new Map(existing.map((row) => [row.name.toLowerCase(), row.id]));
  const missing = tagNames.filter((name) => !existingByName.has(name.toLowerCase()));

  if (missing.length > 0) {
    const inserted = await db
      .insert(tags)
      .values(missing.map((name) => ({ userId, name })))
      .returning({ id: tags.id, name: tags.name });

    for (const row of inserted) {
      existingByName.set(row.name.toLowerCase(), row.id);
    }
  }

  const tagIds = tagNames
    .map((name) => existingByName.get(name.toLowerCase()))
    .filter((id): id is number => typeof id === "number");

  if (tagIds.length > 0) {
    await db.insert(personTags).values(tagIds.map((tagId) => ({ personId, tagId })));
  }
}

async function personBelongsToUser(personId: string, userId: string) {
  const [row] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);
  return row?.id === personId;
}

async function wishlistBelongsToUser(wishlistItemId: string, userId: string) {
  const [row] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .innerJoin(people, eq(wishlistItems.personId, people.id))
    .where(and(eq(wishlistItems.id, wishlistItemId), eq(people.userId, userId)))
    .limit(1);
  return row?.id === wishlistItemId;
}

async function getWishlistContextForSearch(wishlistItemId: string, userId: string) {
  const [row] = await db
    .select({
      wishlistItemId: wishlistItems.id,
      wishlistDescription: wishlistItems.description,
      sourceNote: wishlistItems.sourceNote,
      personId: people.id,
      personName: people.name,
      relationship: people.relationship,
      budgetMin: people.budgetMin,
      budgetMax: people.budgetMax,
      sizes: people.sizes,
      avoid: people.avoid,
    })
    .from(wishlistItems)
    .innerJoin(people, eq(wishlistItems.personId, people.id))
    .where(and(eq(wishlistItems.id, wishlistItemId), eq(people.userId, userId)))
    .limit(1);

  if (!row) return null;

  const tagRows = await db
    .select({ name: tags.name })
    .from(personTags)
    .innerJoin(tags, eq(personTags.tagId, tags.id))
    .where(and(eq(personTags.personId, row.personId), eq(tags.userId, userId)))
    .orderBy(asc(tags.name));

  return {
    ...row,
    tags: tagRows.map((tag) => tag.name),
  };
}

export async function createPerson(formData: FormData) {
  const userId = await requireCurrentUserId();
  const name = String(formData.get("name") ?? "").trim();
  const birthYearKnown = formData.get("birthYearKnown") === "on";
  const birthday = parseBirthday(formData);

  if (!name || !birthday) {
    return;
  }

  const storedBirthday = birthday;

  // Handle photo upload
  let photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const photoFile = formData.get("photoFile") as File | null;
  if (photoFile && photoFile.size > 0) {
    try {
      photoUrl = await savePhoto(photoFile);
    } catch (err) {
      console.error("Failed to save photo:", err);
    }
  }

  const [created] = await db
    .insert(people)
    .values({
      userId,
      name,
      birthday: storedBirthday,
      birthYearKnown,
      relationship: String(formData.get("relationship") ?? "").trim() || null,
      photoUrl,
      budgetMin: parseMoneyToPence(formData.get("budgetMin")),
      budgetMax: parseMoneyToPence(formData.get("budgetMax")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      avoid: String(formData.get("avoid") ?? "").trim() || null,
      sizes: parseSizes(formData),
      updatedAt: new Date(),
    })
    .returning({ id: people.id });

  if (created) {
    await syncTagsForPerson(userId, created.id, formData.get("tags"));
    await ensureDefaultReminders(created.id);
  }

  revalidatePath("/people");
  revalidatePath("/");
  if (created) {
    redirect(`/people/${created.id}`);
  }
}

export async function updatePerson(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const birthYearKnown = formData.get("birthYearKnown") === "on";
  const birthday = parseBirthday(formData);

  if (!personId || !name || !birthday) {
    return;
  }
  if (!(await personBelongsToUser(personId, userId))) return;

  // If the birth year is unknown, normalise to placeholder year 2000 so the DB stores a valid date.
  let storedBirthday = birthday;

  // Handle photo upload - prefer new file, then fall back to existing URL from form
  const photoFile = formData.get("photoFile") as File | null;
  let photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  
  if (photoFile && photoFile.size > 0) {
    try {
      const savedPath = await savePhoto(photoFile);
      if (savedPath) {
        photoUrl = savedPath;
      }
    } catch (err) {
      console.error("Failed to save photo:", err);
    }
  }

  await db
    .update(people)
    .set({
      name,
      birthday: storedBirthday,
      birthYearKnown,
      relationship: String(formData.get("relationship") ?? "").trim() || null,
      photoUrl,
      budgetMin: parseMoneyToPence(formData.get("budgetMin")),
      budgetMax: parseMoneyToPence(formData.get("budgetMax")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      avoid: String(formData.get("avoid") ?? "").trim() || null,
      sizes: parseSizes(formData),
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, personId), eq(people.userId, userId)));

  await syncTagsForPerson(userId, personId, formData.get("tags"));

  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${personId}`);
}

export async function deletePerson(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");

  if (!personId) {
    return;
  }
  if (!(await personBelongsToUser(personId, userId))) return;

  await db.delete(people).where(and(eq(people.id, personId), eq(people.userId, userId)));
  revalidatePath("/people");
  revalidatePath("/");
  redirect("/people");
}

export async function createWishlistItem(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!personId || !description) return;
  if (!(await personBelongsToUser(personId, userId))) return;

  await db.insert(wishlistItems).values({
    personId,
    description,
    sourceNote: String(formData.get("sourceNote") ?? "").trim() || null,
    heardOn: parseDate(formData.get("heardOn")),
    status: parseWishlistStatus(formData.get("status")),
    priceMin: parseMoneyToPence(formData.get("priceMin")),
    priceMax: parseMoneyToPence(formData.get("priceMax")),
    updatedAt: new Date(),
  });

  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${personId}`);
}

export async function updateWishlistItem(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!wishlistItemId || !description) return;
  if (!(await wishlistBelongsToUser(wishlistItemId, userId))) return;

  const [item] = await db
    .select({ personId: wishlistItems.personId })
    .from(wishlistItems)
    .where(eq(wishlistItems.id, wishlistItemId))
    .limit(1);

  await db
    .update(wishlistItems)
    .set({
      description,
      sourceNote: String(formData.get("sourceNote") ?? "").trim() || null,
      heardOn: parseDate(formData.get("heardOn")),
      status: parseWishlistStatus(formData.get("status")),
      priceMin: parseMoneyToPence(formData.get("priceMin")),
      priceMax: parseMoneyToPence(formData.get("priceMax")),
      updatedAt: new Date(),
    })
    .where(eq(wishlistItems.id, wishlistItemId));

  revalidatePath("/people");
  revalidatePath("/");
  if (item) revalidatePath(`/people/${item.personId}`);
}

export async function deleteWishlistItem(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");

  if (!wishlistItemId) return;
  if (!(await wishlistBelongsToUser(wishlistItemId, userId))) return;

  const [item] = await db
    .select({ personId: wishlistItems.personId })
    .from(wishlistItems)
    .where(eq(wishlistItems.id, wishlistItemId))
    .limit(1);

  await db.delete(wishlistItems).where(eq(wishlistItems.id, wishlistItemId));
  revalidatePath("/people");
  revalidatePath("/");
  if (item) revalidatePath(`/people/${item.personId}`);
}

export async function findProductsForWishlistItem(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");
  if (!wishlistItemId) {
    await setPeopleFlash("No wishlist item was selected.", "error");
    return;
  }

  const context = await getWishlistContextForSearch(wishlistItemId, userId);
  if (!context) {
    await setPeopleFlash("Could not load wishlist item context.", "error");
    return;
  }

  const searchResult = await searchProducts({
    wishlistDescription: context.wishlistDescription,
    sourceNote: context.sourceNote,
    personName: context.personName,
    relationship: context.relationship,
    budgetMin: context.budgetMin,
    budgetMax: context.budgetMax,
    sizes: context.sizes,
    avoid: context.avoid,
    tags: context.tags,
  });
  const { candidates, llmRateLimited, llmError, ebayConfigured, ebayError } = searchResult;

  if (candidates.length > 0) {
    // Clear previous AI search results for this item to prevent accumulation
    await db
      .delete(products)
      .where(and(eq(products.wishlistItemId, wishlistItemId), eq(products.source, "ai_search")));

    await db.insert(products).values(
      candidates.map((candidate) => ({
        wishlistItemId: context.wishlistItemId,
        personId: context.personId,
        title: candidate.title,
        description: candidate.description ?? null,
        imageUrl: candidate.imageUrl ?? null,
        retailer: candidate.retailer ?? null,
        url: candidate.url,
        price: candidate.pricePence ?? null,
        currency: candidate.currency ?? "GBP",
        inStock: candidate.inStock ?? null,
        source: "ai_search" as const,
        rawPayload: candidate.rawPayload ?? null,
      })),
    );
    await setPeopleFlash(
      llmError
        ? `LLM call failed (${truncate(llmError, 100)}); eBay fallback saved ${candidates.length} result(s).`
        : `Saved ${candidates.length} product result(s).`,
      llmError ? "warning" : "success",
    );
  } else {
    const parts: string[] = [];
    if (llmError) {
      parts.push(
        llmRateLimited
          ? `LLM rate-limited: ${truncate(llmError, 140)}`
          : `LLM error: ${truncate(llmError, 140)}`,
      );
    } else {
      parts.push("LLM returned no candidates");
    }
    if (!ebayConfigured) {
      parts.push("eBay fallback not configured (set EBAY_APP_ID to enable)");
    } else if (ebayError) {
      parts.push(`eBay error: ${truncate(ebayError, 100)}`);
    } else {
      parts.push("eBay returned no matches");
    }
    await setPeopleFlash(parts.join(" · "), "warning");
  }

  await db.insert(aiRequestLog).values({
    userId,
    kind: "product_search",
    promptTokens: null,
    completionTokens: null,
    costEstimate: null,
  });

  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${context.personId}`);
}

export async function addManualProduct(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const retailer = String(formData.get("retailer") ?? "").trim();
  const pricePence = parseMoneyToPence(formData.get("price"));

  if (!wishlistItemId || !title || !url) return;
  const context = await getWishlistContextForSearch(wishlistItemId, userId);
  if (!context) return;

  await db.insert(products).values({
    wishlistItemId,
    personId: context.personId,
    title,
    url,
    retailer: retailer || null,
    price: pricePence,
    currency: "GBP",
    source: "manual",
  });

  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${context.personId}`);
}

export async function deleteProduct(formData: FormData) {
  const userId = await requireCurrentUserId();
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return;

  const [row] = await db
    .select({ id: products.id, personId: products.personId })
    .from(products)
    .innerJoin(people, eq(products.personId, people.id))
    .where(and(eq(products.id, productId), eq(people.userId, userId)))
    .limit(1);

  if (!row) return;

  await db.delete(products).where(eq(products.id, productId));
  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${row.personId}`);
}


// --- Phase 3: suggestions ---

async function getPersonContextForSuggestions(personId: string, userId: string) {
  const [row] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);
  if (!row) return null;

  const [tagRows, wishlistRows, historyRows] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(personTags)
      .innerJoin(tags, eq(personTags.tagId, tags.id))
      .where(and(eq(personTags.personId, personId), eq(tags.userId, userId)))
      .orderBy(asc(tags.name)),
    db
      .select({ description: wishlistItems.description, status: wishlistItems.status })
      .from(wishlistItems)
      .where(eq(wishlistItems.personId, personId)),
    db
      .select({ title: giftHistory.title, reactionNotes: giftHistory.reactionNotes })
      .from(giftHistory)
      .where(eq(giftHistory.personId, personId)),
  ]);

  return {
    person: row,
    tags: tagRows.map((t) => t.name),
    wishlist: wishlistRows,
    history: historyRows,
  };
}

export async function suggestGifts(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");
  if (!personId) return;

  const context = await getPersonContextForSuggestions(personId, userId);
  if (!context) {
    await setPeopleFlash("Could not load person context.", "error");
    return;
  }

  let candidates: Awaited<ReturnType<typeof suggestGiftsForPerson>> = [];
  try {
    candidates = await suggestGiftsForPerson({
      personName: context.person.name,
      relationship: context.person.relationship,
      budgetMin: context.person.budgetMin,
      budgetMax: context.person.budgetMax,
      sizes: context.person.sizes,
      avoid: context.person.avoid,
      notes: context.person.notes,
      tags: context.tags,
      wishlist: context.wishlist,
      history: context.history,
    });
  } catch (error) {
    console.error("Suggestion generation failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    const rateLimited =
      message.includes("429") ||
      message.includes("Too Many Requests") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate limit");
    await setPeopleFlash(
      rateLimited
        ? `LLM rate-limited: ${truncate(message, 140)}`
        : `LLM error: ${truncate(message, 160)}`,
      "warning",
    );
    return;
  }

  if (candidates.length === 0) {
    await setPeopleFlash("The model returned no suggestions this time.", "warning");
    return;
  }

  await db.insert(suggestions).values(
    candidates.map((c) => ({
      personId,
      title: c.title,
      rationale: c.rationale,
      estimatedPriceMin: c.estimatedPriceMinPence,
      estimatedPriceMax: c.estimatedPriceMaxPence,
    })),
  );

  await db.insert(aiRequestLog).values({
    userId,
    kind: "suggestion",
    promptTokens: null,
    completionTokens: null,
    costEstimate: null,
  });

  await setPeopleFlash(`Generated ${candidates.length} new gift idea(s).`, "success");
  revalidatePath(`/people/${personId}`);
}

async function suggestionBelongsToUser(suggestionId: string, userId: string) {
  const [row] = await db
    .select({ id: suggestions.id, personId: suggestions.personId })
    .from(suggestions)
    .innerJoin(people, eq(suggestions.personId, people.id))
    .where(and(eq(suggestions.id, suggestionId), eq(people.userId, userId)))
    .limit(1);
  return row;
}

export async function dismissSuggestion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;
  const row = await suggestionBelongsToUser(suggestionId, userId);
  if (!row) return;

  await db.delete(suggestions).where(eq(suggestions.id, suggestionId));
  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${row.personId}`);
}

export async function promoteSuggestionToWishlist(formData: FormData) {
  const userId = await requireCurrentUserId();
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;

  const [row] = await db
    .select()
    .from(suggestions)
    .innerJoin(people, eq(suggestions.personId, people.id))
    .where(and(eq(suggestions.id, suggestionId), eq(people.userId, userId)))
    .limit(1);
  if (!row) return;

  const s = row.suggestions;
  await db.insert(wishlistItems).values({
    personId: s.personId,
    description: s.title,
    sourceNote: s.rationale ? `From AI suggestion: ${s.rationale}` : "From AI suggestion",
    status: "researching",
    priceMin: s.estimatedPriceMin,
    priceMax: s.estimatedPriceMax,
    updatedAt: new Date(),
  });

  await db.delete(suggestions).where(eq(suggestions.id, suggestionId));

  await setPeopleFlash(`"${s.title}" added to wishlist.`, "success");
  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${s.personId}`);
}

// --- Phase 3: gift history ---

export async function markWishlistItemGiven(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");
  const givenOn = parseDate(formData.get("givenOn"));
  if (!wishlistItemId || !givenOn) return;
  if (!(await wishlistBelongsToUser(wishlistItemId, userId))) return;

  const [item] = await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.id, wishlistItemId))
    .limit(1);
  if (!item) return;

  await db.insert(giftHistory).values({
    personId: item.personId,
    wishlistItemId: item.id,
    title: item.description,
    pricePaid: parseMoneyToPence(formData.get("pricePaid")),
    currency: "GBP",
    givenOn,
    reactionNotes: String(formData.get("reactionNotes") ?? "").trim() || null,
  });

  await db
    .update(wishlistItems)
    .set({ status: "given", updatedAt: new Date() })
    .where(eq(wishlistItems.id, wishlistItemId));

  await setPeopleFlash(`Marked "${item.description}" as given.`, "success");
  revalidatePath("/people");
  revalidatePath("/");
  revalidatePath(`/people/${item.personId}`);
}

export async function addGiftHistoryEntry(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const givenOn = parseDate(formData.get("givenOn"));
  if (!personId || !title || !givenOn) return;
  if (!(await personBelongsToUser(personId, userId))) return;

  await db.insert(giftHistory).values({
    personId,
    title,
    pricePaid: parseMoneyToPence(formData.get("pricePaid")),
    currency: "GBP",
    givenOn,
    reactionNotes: String(formData.get("reactionNotes") ?? "").trim() || null,
  });

  revalidatePath(`/people/${personId}`);
}

export async function deleteGiftHistoryEntry(formData: FormData) {
  const userId = await requireCurrentUserId();
  const historyId = String(formData.get("historyId") ?? "");
  if (!historyId) return;

  const [row] = await db
    .select({ id: giftHistory.id, personId: giftHistory.personId })
    .from(giftHistory)
    .innerJoin(people, eq(giftHistory.personId, people.id))
    .where(and(eq(giftHistory.id, historyId), eq(people.userId, userId)))
    .limit(1);
  if (!row) return;

  await db.delete(giftHistory).where(eq(giftHistory.id, historyId));
  revalidatePath(`/people/${row.personId}`);
}

// --- Phase 4: reminders ---

export async function sendTestReminder(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");
  if (!personId) return;
  if (!(await personBelongsToUser(personId, userId))) return;

  try {
    await sendReminderForPersonNow(personId);
    await setPeopleFlash("Test reminder email sent.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Test reminder failed:", error);
    await setPeopleFlash(`Could not send test email: ${truncate(message, 160)}`, "error");
  }
  revalidatePath(`/people/${personId}`);
}

export async function backfillDefaultReminders(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");
  if (!personId) return;
  if (!(await personBelongsToUser(personId, userId))) return;
  await ensureDefaultReminders(personId);
  revalidatePath(`/people/${personId}`);
}

export async function resetIcalToken() {
  const userId = await requireCurrentUserId();
  const newToken = randomUUID();
  await db.update(users).set({ icalToken: newToken }).where(eq(users.id, userId));
  revalidatePath("/");
  revalidatePath("/people");
}
