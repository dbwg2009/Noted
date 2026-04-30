import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  giftHistory,
  people,
  personTags,
  products,
  reminders,
  suggestions,
  tags,
  users,
  wishlistItems,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { daysUntil, ageOnNextBirthday } from "@/lib/birthdays";

export async function requireCurrentUserId() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) throw new Error("Not authenticated");
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error("Authenticated user was not found in the database");
  return user.id;
}

export async function listPeopleSummary(userId: string) {
  const personRows = await db.select().from(people).where(eq(people.userId, userId)).orderBy(asc(people.name));
  if (personRows.length === 0) return [];

  const personIds = personRows.map((p) => p.id);
  const tagRows = await db
    .select({ personId: personTags.personId, name: tags.name })
    .from(personTags)
    .innerJoin(tags, eq(personTags.tagId, tags.id))
    .where(and(inArray(personTags.personId, personIds), eq(tags.userId, userId)))
    .orderBy(asc(tags.name));

  const tagsByPerson = new Map<string, string[]>();
  for (const r of tagRows) {
    const list = tagsByPerson.get(r.personId) ?? [];
    list.push(r.name);
    tagsByPerson.set(r.personId, list);
  }

  return personRows.map((p) => ({
    ...p,
    tags: tagsByPerson.get(p.id) ?? [],
    daysUntilBirthday: daysUntil(p.birthday) ?? 999,
    nextAge: ageOnNextBirthday({ birthday: p.birthday, birthYearKnown: p.birthYearKnown }),
  }));
}

export async function getPersonDetail(personId: string, userId: string) {
  const [person] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);
  if (!person) return null;

  const [tagRows, wishlistRows, suggestionRows, historyRows, reminderRows] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(personTags)
      .innerJoin(tags, eq(personTags.tagId, tags.id))
      .where(and(eq(personTags.personId, personId), eq(tags.userId, userId)))
      .orderBy(asc(tags.name)),
    db.select().from(wishlistItems).where(eq(wishlistItems.personId, personId)).orderBy(desc(wishlistItems.createdAt)),
    db.select().from(suggestions).where(eq(suggestions.personId, personId)).orderBy(desc(suggestions.createdAt)),
    db.select().from(giftHistory).where(eq(giftHistory.personId, personId)).orderBy(desc(giftHistory.givenOn)),
    db.select().from(reminders).where(eq(reminders.personId, personId)).orderBy(asc(reminders.leadDays)),
  ]);

  const wishlistIds = wishlistRows.map((w) => w.id);
  const productRows =
    wishlistIds.length === 0
      ? []
      : await db
          .select()
          .from(products)
          .where(inArray(products.wishlistItemId, wishlistIds))
          .orderBy(desc(products.createdAt));

  const productsByWishlist = new Map<string, typeof productRows>();
  for (const row of productRows) {
    if (!row.wishlistItemId) continue;
    const list = productsByWishlist.get(row.wishlistItemId) ?? [];
    list.push(row);
    productsByWishlist.set(row.wishlistItemId, list);
  }

  return {
    ...person,
    tags: tagRows.map((t) => t.name),
    daysUntilBirthday: daysUntil(person.birthday) ?? 999,
    nextAge: ageOnNextBirthday({ birthday: person.birthday, birthYearKnown: person.birthYearKnown }),
    wishlist: wishlistRows.map((w) => ({
      ...w,
      products: productsByWishlist.get(w.id) ?? [],
    })),
    suggestions: suggestionRows,
    history: historyRows,
    reminders: reminderRows,
  };
}
