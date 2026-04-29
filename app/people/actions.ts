"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  people,
  personTags,
  tags,
  users,
  wishlistItems,
  wishlistStatus,
} from "@/db/schema";

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
}

export async function deleteWishlistItem(formData: FormData) {
  const userId = await requireCurrentUserId();
  const wishlistItemId = String(formData.get("wishlistItemId") ?? "");

  if (!wishlistItemId) return;
  if (!(await wishlistBelongsToUser(wishlistItemId, userId))) return;

  await db.delete(wishlistItems).where(eq(wishlistItems.id, wishlistItemId));
  revalidatePath("/people");
}

export async function listPeopleForCurrentUser() {
  const userId = await requireCurrentUserId();
  const personRows = await db
    .select()
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(desc(people.createdAt));

  if (personRows.length === 0) return [];

  const personIds = personRows.map((person) => person.id);

  const [tagRows, wishlistRows] = await Promise.all([
    db
      .select({
        personId: personTags.personId,
        name: tags.name,
      })
      .from(personTags)
      .innerJoin(tags, eq(personTags.tagId, tags.id))
      .where(and(inArray(personTags.personId, personIds), eq(tags.userId, userId)))
      .orderBy(asc(tags.name)),
    db
      .select()
      .from(wishlistItems)
      .where(inArray(wishlistItems.personId, personIds))
      .orderBy(desc(wishlistItems.createdAt)),
  ]);

  const tagsByPerson = new Map<string, string[]>();
  for (const row of tagRows) {
    const current = tagsByPerson.get(row.personId) ?? [];
    current.push(row.name);
    tagsByPerson.set(row.personId, current);
  }

  const wishlistByPerson = new Map<string, typeof wishlistRows>();
  for (const row of wishlistRows) {
    const current = wishlistByPerson.get(row.personId) ?? [];
    current.push(row);
    wishlistByPerson.set(row.personId, current);
  }

  return personRows.map((person) => ({
    ...person,
    tags: tagsByPerson.get(person.id) ?? [],
    wishlist: wishlistByPerson.get(person.id) ?? [],
  }));
}
