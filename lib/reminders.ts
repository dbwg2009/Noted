import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  occasionPersonExclusions,
  occasions,
  people,
  products,
  reminders,
  suggestions,
  users,
  wishlistItems,
} from "@/db/schema";
import { parseBirthday } from "@/lib/birthdays";
import { sendReminderDigest, sendSiteWideOccasionEmail } from "@/lib/notify/email";

export const DEFAULT_LEAD_DAYS = [30, 14, 7, 1];

type DueReminder = {
  reminderId: string;
  personId: string;
  personName: string;
  relationship: string | null;
  birthday: string;
  birthYearKnown: boolean;
  budgetMin: number | null;
  budgetMax: number | null;
  leadDays: number;
  targetDate: string; // yyyy-mm-dd
  targetYear: number;
  userId: string;
  userEmail: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function findDueReminders(today = new Date()): Promise<DueReminder[]> {
  const todayStart = startOfDay(today);
  const todayIso = formatIso(todayStart);

  // Filter in SQL: birthday month/day must equal (today + lead_days) month/day,
  // and the reminder must not have already been sent for that target year.
  const rows = await db
    .select({
      reminderId: reminders.id,
      leadDays: reminders.leadDays,
      personId: people.id,
      personName: people.name,
      relationship: people.relationship,
      birthday: people.birthday,
      birthYearKnown: people.birthYearKnown,
      budgetMin: people.budgetMin,
      budgetMax: people.budgetMax,
      userId: users.id,
      userEmail: users.email,
    })
    .from(reminders)
    .innerJoin(people, eq(reminders.personId, people.id))
    .innerJoin(users, eq(people.userId, users.id))
    .where(
      and(
        sql`EXTRACT(MONTH FROM ${people.birthday}) = EXTRACT(MONTH FROM ${todayIso}::date + ${reminders.leadDays})`,
        sql`EXTRACT(DAY FROM ${people.birthday}) = EXTRACT(DAY FROM ${todayIso}::date + ${reminders.leadDays})`,
        or(
          isNull(reminders.lastSentForYear),
          sql`${reminders.lastSentForYear} != EXTRACT(YEAR FROM ${todayIso}::date + ${reminders.leadDays})::int`,
        ),
      ),
    );

  return rows.map((row) => {
    const target = addDays(todayStart, row.leadDays);
    return {
      reminderId: row.reminderId,
      personId: row.personId,
      personName: row.personName,
      relationship: row.relationship,
      birthday: row.birthday,
      birthYearKnown: row.birthYearKnown,
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      leadDays: row.leadDays,
      targetDate: formatIso(target),
      targetYear: target.getFullYear(),
      userId: row.userId,
      userEmail: row.userEmail,
    };
  });
}

export type ShortlistEntry = {
  kind: "product" | "suggestion";
  title: string;
  retailer: string | null;
  url: string | null;
  pricePence: number | null;
  rationale: string | null;
};

async function allWishlistItemsDone(personId: string): Promise<boolean> {
  const rows = await db.select({ status: wishlistItems.status }).from(wishlistItems).where(eq(wishlistItems.personId, personId));
  if (rows.length === 0) return false;
  return rows.every((r) => r.status === "purchased" || r.status === "given");
}

async function buildShortlistForPerson(
  personId: string,
  budgetMin: number | null,
  budgetMax: number | null,
): Promise<ShortlistEntry[]> {
  const wishlistRows = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(eq(wishlistItems.personId, personId));
  const wishlistIds = wishlistRows.map((w) => w.id);

  const productRows =
    wishlistIds.length === 0
      ? []
      : await db
          .select()
          .from(products)
          .where(inArray(products.wishlistItemId, wishlistIds));

  const suggestionRows = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.personId, personId));

  const matchesBudget = (price: number | null) => {
    if (price === null) return true;
    if (budgetMin !== null && price < budgetMin) return false;
    if (budgetMax !== null && price > budgetMax) return false;
    return true;
  };

  const productEntries: ShortlistEntry[] = productRows
    .filter((p) => matchesBudget(p.price))
    .map((p) => ({
      kind: "product",
      title: p.title,
      retailer: p.retailer,
      url: p.url,
      pricePence: p.price,
      rationale: null,
    }));

  const suggestionEntries: ShortlistEntry[] = suggestionRows.map((s) => ({
    kind: "suggestion",
    title: s.title,
    retailer: null,
    url: null,
    pricePence: s.estimatedPriceMin ?? s.estimatedPriceMax ?? null,
    rationale: s.rationale,
  }));

  // Prioritise real products over suggestions, then sort by price ascending,
  // then cap at 5 entries.
  const combined = [...productEntries, ...suggestionEntries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "product" ? -1 : 1;
    return (a.pricePence ?? Infinity) - (b.pricePence ?? Infinity);
  });
  return combined.slice(0, 5);
}

export type DigestPersonBlock = {
  personId: string;
  personName: string;
  relationship: string | null;
  birthday: string;
  birthYearKnown: boolean;
  leadDays: number;
  targetDate: string;
  shortlist: ShortlistEntry[];
};

export type DigestUserBlock = {
  userId: string;
  userEmail: string;
  blocks: DigestPersonBlock[];
};

export async function buildDigestForUser(
  userId: string,
  userEmail: string,
  due: DueReminder[],
): Promise<DigestUserBlock> {
  const blocks: DigestPersonBlock[] = [];
  for (const reminder of due) {
    if (await allWishlistItemsDone(reminder.personId)) continue;
    const shortlist = await buildShortlistForPerson(
      reminder.personId,
      reminder.budgetMin,
      reminder.budgetMax,
    );
    blocks.push({
      personId: reminder.personId,
      personName: reminder.personName,
      relationship: reminder.relationship,
      birthday: reminder.birthday,
      birthYearKnown: reminder.birthYearKnown,
      leadDays: reminder.leadDays,
      targetDate: reminder.targetDate,
      shortlist,
    });
  }
  return { userId, userEmail, blocks };
}

export async function runDailyReminders(today = new Date()) {
  const due = await findDueReminders(today);
  const dueSiteWide = await findDueSiteWideReminders(today);

  if (due.length === 0 && dueSiteWide.length === 0) {
    return { dueCount: 0, sent: 0, errors: [] as string[] };
  }

  const errors: string[] = [];
  let sent = 0;
  const sentAt = new Date();

  // Birthday / person-occasion reminders — grouped digest per user
  if (due.length > 0) {
    const byUser = new Map<string, DueReminder[]>();
    for (const reminder of due) {
      const list = byUser.get(reminder.userId) ?? [];
      list.push(reminder);
      byUser.set(reminder.userId, list);
    }

    for (const [userId, userDue] of byUser) {
      const digest = await buildDigestForUser(userId, userDue[0].userEmail, userDue);
      const byYear = new Map<number, string[]>();
      for (const r of userDue) {
        const ids = byYear.get(r.targetYear) ?? [];
        ids.push(r.reminderId);
        byYear.set(r.targetYear, ids);
      }
      try {
        if (digest.blocks.length > 0) {
          await sendReminderDigest(digest);
          sent += 1;
        }
        for (const [year, ids] of byYear) {
          await db
            .update(reminders)
            .set({ lastSentAt: sentAt, lastSentForYear: year })
            .where(inArray(reminders.id, ids));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Reminder digest send failed:", error);
        errors.push(`${digest.userEmail}: ${message}`);
      }
    }
  }

  // Site-wide occasion reminders — one email per (user, reminder) with all non-excluded people listed
  for (const sw of dueSiteWide) {
    try {
      // Fetch all people for this user
      const allPeople = await db
        .select({ id: people.id, name: people.name, relationship: people.relationship })
        .from(people)
        .where(eq(people.userId, sw.userId));

      // Filter out excluded people
      const exclusionRows = await db
        .select({ personId: occasionPersonExclusions.personId })
        .from(occasionPersonExclusions)
        .where(eq(occasionPersonExclusions.occasionId, sw.occasionId));
      const excludedIds = new Set(exclusionRows.map((e) => e.personId));
      const includedPeople = allPeople.filter((p) => !excludedIds.has(p.id));

      // Remove people whose wishlist items linked to this occasion are all purchased/given
      let finalPeople = includedPeople;
      if (includedPeople.length > 0) {
        const personIds = includedPeople.map((p) => p.id);
        const linkedItems = await db
          .select({ personId: wishlistItems.personId, status: wishlistItems.status })
          .from(wishlistItems)
          .where(and(inArray(wishlistItems.personId, personIds), eq(wishlistItems.occasionId, sw.occasionId)));
        const byPerson = new Map<string, string[]>();
        for (const row of linkedItems) {
          const list = byPerson.get(row.personId) ?? [];
          list.push(row.status);
          byPerson.set(row.personId, list);
        }
        finalPeople = includedPeople.filter((p) => {
          const statuses = byPerson.get(p.id);
          if (!statuses || statuses.length === 0) return true;
          return statuses.some((s) => s !== "purchased" && s !== "given");
        });
      }

      const occasionLabel = sw.occasionName ?? sw.occasionKind;
      const result = await sendSiteWideOccasionEmail(
        sw.userEmail,
        occasionLabel,
        sw.leadDays,
        finalPeople,
      );
      if (!result.skipped) {
        sent += 1;
        await db
          .update(reminders)
          .set({ lastSentAt: sentAt, lastSentForYear: sw.targetYear })
          .where(eq(reminders.id, sw.reminderId));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Site-wide occasion reminder send failed:", error);
      errors.push(`${sw.userEmail} (${sw.occasionName ?? sw.occasionKind}): ${message}`);
    }
  }

  return { dueCount: due.length + dueSiteWide.length, sent, errors };
}

export async function ensureDefaultReminders(personId: string) {
  const existing = await db
    .select({ leadDays: reminders.leadDays })
    .from(reminders)
    .where(eq(reminders.personId, personId));
  const have = new Set(existing.map((r) => r.leadDays));
  const missing = DEFAULT_LEAD_DAYS.filter((d) => !have.has(d));
  if (missing.length === 0) return;
  await db.insert(reminders).values(
    missing.map((leadDays) => ({ personId, leadDays, channel: "email" })),
  );
}

export async function ensureSiteWideOccasionReminders(occasionId: number) {
  const existing = await db
    .select({ leadDays: reminders.leadDays })
    .from(reminders)
    .where(and(isNull(reminders.personId), eq(reminders.occasionId, occasionId)));
  const have = new Set(existing.map((r) => r.leadDays));
  const missing = DEFAULT_LEAD_DAYS.filter((d) => !have.has(d));
  if (missing.length > 0) {
    await db.insert(reminders).values(
      missing.map((leadDays) => ({ occasionId, leadDays, channel: "email" })),
    );
  }
}

type DueSiteWideReminder = {
  reminderId: string;
  occasionId: number;
  occasionName: string | null;
  occasionKind: string;
  occasionDate: string;
  leadDays: number;
  targetDate: string;
  targetYear: number;
  userId: string;
  userEmail: string;
};

export async function findDueSiteWideReminders(today = new Date()): Promise<DueSiteWideReminder[]> {
  const todayStart = startOfDay(today);
  const todayIso = formatIso(todayStart);

  const rows = await db
    .select({
      reminderId: reminders.id,
      leadDays: reminders.leadDays,
      lastSentForYear: reminders.lastSentForYear,
      occasionId: occasions.id,
      occasionName: occasions.name,
      occasionKind: occasions.kind,
      occasionDate: occasions.date,
      yearRecurring: occasions.yearRecurring,
      userId: users.id,
      userEmail: users.email,
    })
    .from(reminders)
    .innerJoin(occasions, eq(reminders.occasionId, occasions.id))
    .innerJoin(users, eq(occasions.userId, users.id))
    .where(
      and(
        isNull(reminders.personId),
        isNotNull(reminders.occasionId),
        isNotNull(occasions.date),
        isNull(occasions.personId),
        or(
          and(
            sql`EXTRACT(MONTH FROM ${occasions.date}) = EXTRACT(MONTH FROM ${todayIso}::date + ${reminders.leadDays})`,
            sql`EXTRACT(DAY FROM ${occasions.date}) = EXTRACT(DAY FROM ${todayIso}::date + ${reminders.leadDays})`,
            sql`${occasions.yearRecurring} = true`,
          ),
          and(
            sql`${occasions.yearRecurring} = false`,
            sql`${occasions.date} = ${todayIso}::date + ${reminders.leadDays}`,
          ),
        ),
        or(
          isNull(reminders.lastSentForYear),
          sql`${reminders.lastSentForYear} != EXTRACT(YEAR FROM ${todayIso}::date + ${reminders.leadDays})::int`,
        ),
      ),
    );

  return rows
    .map((row) => {
      if (!row.occasionDate) return null;
      const parsed = new Date(row.occasionDate);
      const candidateYear = todayStart.getFullYear();
      let target = new Date(candidateYear, parsed.getMonth(), parsed.getDate());
      if (target < todayStart) {
        target = new Date(candidateYear + 1, parsed.getMonth(), parsed.getDate());
      }
      return {
        reminderId: row.reminderId,
        occasionId: row.occasionId,
        occasionName: row.occasionName,
        occasionKind: row.occasionKind,
        occasionDate: row.occasionDate,
        leadDays: row.leadDays,
        targetDate: formatIso(target),
        targetYear: target.getFullYear(),
        userId: row.userId,
        userEmail: row.userEmail,
      } as DueSiteWideReminder;
    })
    .filter((v): v is DueSiteWideReminder => v !== null);
}

export async function sendReminderForPersonNow(personId: string) {
  const [row] = await db
    .select({
      personId: people.id,
      personName: people.name,
      relationship: people.relationship,
      birthday: people.birthday,
      birthYearKnown: people.birthYearKnown,
      budgetMin: people.budgetMin,
      budgetMax: people.budgetMax,
      userId: users.id,
      userEmail: users.email,
    })
    .from(people)
    .innerJoin(users, eq(people.userId, users.id))
    .where(eq(people.id, personId))
    .limit(1);
  if (!row) throw new Error("Person not found");

  const todayStart = startOfDay(new Date());
  const parsed = parseBirthday(row.birthday);
  if (!parsed) throw new Error("Person has an invalid birthday");
  let target = new Date(todayStart.getFullYear(), parsed.month - 1, parsed.day);
  if (target < todayStart) {
    target = new Date(todayStart.getFullYear() + 1, parsed.month - 1, parsed.day);
  }
  const leadDays = Math.max(
    0,
    Math.round((target.getTime() - todayStart.getTime()) / 86_400_000),
  );

  const due: DueReminder = {
    reminderId: "test-send",
    personId: row.personId,
    personName: row.personName,
    relationship: row.relationship,
    birthday: row.birthday,
    birthYearKnown: row.birthYearKnown,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    leadDays,
    targetDate: formatIso(target),
    targetYear: target.getFullYear(),
    userId: row.userId,
    userEmail: row.userEmail,
  };

  const digest = await buildDigestForUser(row.userId, row.userEmail, [due]);
  await sendReminderDigest(digest);
}

export async function getRemindersForPerson(personId: string) {
  return db
    .select()
    .from(reminders)
    .where(eq(reminders.personId, personId));
}

export async function getNextScheduledReminder(personId: string, today = new Date()) {
  const todayStart = startOfDay(today);
  const [person] = await db
    .select({ birthday: people.birthday })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);
  if (!person) return null;
  const parsed = parseBirthday(person.birthday);
  if (!parsed) return null;

  const personReminders = await db
    .select()
    .from(reminders)
    .where(eq(reminders.personId, personId));

  let best: { leadDays: number; sendOn: string } | null = null;
  for (const reminder of personReminders) {
    let candidateYear = todayStart.getFullYear();
    let target = new Date(candidateYear, parsed.month - 1, parsed.day);
    if (target < todayStart) {
      candidateYear += 1;
      target = new Date(candidateYear, parsed.month - 1, parsed.day);
    }
    const sendDate = addDays(target, -reminder.leadDays);
    if (sendDate < todayStart) continue;
    if (reminder.lastSentForYear === candidateYear) continue;
    if (!best) {
      best = { leadDays: reminder.leadDays, sendOn: formatIso(sendDate) };
      continue;
    }
    if (sendDate < new Date(best.sendOn)) {
      best = { leadDays: reminder.leadDays, sendOn: formatIso(sendDate) };
    }
  }

  return best;
}
