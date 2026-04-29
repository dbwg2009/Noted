"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  aiRequestLog,
  people,
  personTags,
  products,
  tags,
  users,
  wishlistItems,
  wishlistStatus,
} from "@/db/schema";
import { searchProducts } from "@/lib/products/search";

type PeopleFlashTone = "success" | "warning" | "error";

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

async function requireCurrentUserId() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();

  if (!email) {
    throw new Error("Not authenticated");
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    throw new Error("Authenticated user was not found in the database");
  }

  return user.id;
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
  const birthday = parseDate(formData.get("birthday"));
  const birthYearKnown = formData.get("birthYearKnown") === "on";

  if (!name || !birthday) {
    return;
  }

  const [created] = await db
    .insert(people)
    .values({
      userId,
      name,
      birthday,
      birthYearKnown,
      relationship: String(formData.get("relationship") ?? "").trim() || null,
      photoUrl: String(formData.get("photoUrl") ?? "").trim() || null,
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
  const birthday = parseDate(formData.get("birthday"));
  const birthYearKnown = formData.get("birthYearKnown") === "on";

  if (!personId || !name || !birthday) {
    return;
  }
  if (!(await personBelongsToUser(personId, userId))) return;

  await db
    .update(people)
    .set({
      name,
      birthday,
      birthYearKnown,
      relationship: String(formData.get("relationship") ?? "").trim() || null,
      photoUrl: String(formData.get("photoUrl") ?? "").trim() || null,
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
}

export async function updateWishlistItem(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!wishlistItemId || !description) return;
  if (!(await wishlistBelongsToUser(wishlistItemId, userId))) return;

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
}

export async function deleteWishlistItem(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");

  if (!wishlistItemId) return;
  if (!(await wishlistBelongsToUser(wishlistItemId, userId))) return;

  await db.delete(wishlistItems).where(eq(wishlistItems.id, wishlistItemId));
  revalidatePath("/people");
  revalidatePath("/");
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
  const { candidates, llmQuotaHit } = searchResult;

  if (candidates.length > 0) {
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
      llmQuotaHit
        ? `LLM quota is exhausted right now; fallback saved ${candidates.length} product result(s).`
        : `Saved ${candidates.length} product result(s).`,
      llmQuotaHit ? "warning" : "success",
    );
  } else if (!llmQuotaHit) {
    await setPeopleFlash("No product matches were found this time.", "warning");
  } else {
    await setPeopleFlash(
      "LLM quota is currently exhausted and fallback search returned no results.",
      "warning",
    );
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
}

export async function deleteProduct(formData: FormData) {
  const userId = await requireCurrentUserId();
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return;

  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(people, eq(products.personId, people.id))
    .where(and(eq(products.id, productId), eq(people.userId, userId)))
    .limit(1);

  if (!row) return;

  await db.delete(products).where(eq(products.id, productId));
  revalidatePath("/people");
  revalidatePath("/");
}

