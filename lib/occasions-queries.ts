import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { occasions, occasionPersonExclusions, users, people } from "@/db/schema";
import { nextOccurrenceDate } from "@/lib/occasions";

export async function getOccasionsForPerson(personId: string) {
  return db
    .select()
    .from(occasions)
    .where(eq(occasions.personId, personId));
}

export async function listSiteWideOccasions(userId: string) {
  const rows = await db
    .select()
    .from(occasions)
    .where(and(eq(occasions.userId, userId), isNull(occasions.personId)))
    .orderBy(occasions.createdAt);

  const mapped = rows.map((r) => {
    const next = nextOccurrenceDate(r.date ?? null, r.yearRecurring);
    return {
      ...r,
      nextDate: next ? next.toISOString().slice(0, 10) : null,
      daysUntil: next ? Math.round((next.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : null,
    };
  });

  mapped.sort((a, b) => {
    if (a.nextDate === b.nextDate) return 0;
    if (a.nextDate === null) return 1;
    if (b.nextDate === null) return -1;
    return a.nextDate < b.nextDate ? -1 : 1;
  });

  return mapped;
}

export async function getExcludedPeopleForOccasion(occasionId: number): Promise<string[]> {
  const rows = await db
    .select({ personId: occasionPersonExclusions.personId })
    .from(occasionPersonExclusions)
    .where(eq(occasionPersonExclusions.occasionId, occasionId));
  return rows.map((r) => r.personId);
}

export async function getSiteWideOccasionsForPerson(userId: string, personId: string) {
  const siteWide = await listSiteWideOccasions(userId);
  if (siteWide.length === 0) return [];

  const occasionIds = siteWide.map((o) => o.id);
  const exclusionRows = await db
    .select({ occasionId: occasionPersonExclusions.occasionId })
    .from(occasionPersonExclusions)
    .where(
      and(
        inArray(occasionPersonExclusions.occasionId, occasionIds),
        eq(occasionPersonExclusions.personId, personId),
      ),
    );

  const excludedIds = new Set(exclusionRows.map((e) => e.occasionId));
  return siteWide.map((o) => ({ ...o, excluded: excludedIds.has(o.id) }));
}

// List upcoming occasions for a user, returning the occasion row plus a computed
// `nextDate` ISO string and `daysUntil` number.
export async function listUpcomingOccasions(userId: string, limit = 20) {
  const rows = await db
    .select({
      id: occasions.id,
      userId: occasions.userId,
      personId: occasions.personId,
      kind: occasions.kind,
      name: occasions.name,
      date: occasions.date,
      yearRecurring: occasions.yearRecurring,
      notes: occasions.notes,
      createdAt: occasions.createdAt,
    })
    .from(occasions)
    .where(eq(occasions.userId, userId))
    .orderBy(desc(occasions.createdAt))
    .limit(limit);

  const mapped = rows.map((r) => {
    const next = nextOccurrenceDate(r.date ?? null, r.yearRecurring);
    return {
      ...r,
      nextDate: next ? next.toISOString().slice(0, 10) : null,
      daysUntil: next ? Math.round((next.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : null,
    };
  });

  // sort by nextDate ascending, placing nulls last
  mapped.sort((a, b) => {
    if (a.nextDate === b.nextDate) return 0;
    if (a.nextDate === null) return 1;
    if (b.nextDate === null) return -1;
    return a.nextDate < b.nextDate ? -1 : 1;
  });

  return mapped;
}
