import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  giftHistory,
  people,
  products,
  reminders,
  suggestions,
  users,
  wishlistItems,
} from "@/db/schema";
import { parseBirthday } from "@/lib/birthdays";
import { sendReminderDigest } from "@/lib/notify/email";

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

  const rows = await db
    .select({
      reminderId: reminders.id,
      leadDays: reminders.leadDays,
      lastSentForYear: reminders.lastSentForYear,
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
    .innerJoin(users, eq(people.userId, users.id));

  const due: DueReminder[] = [];
  for (const row of rows) {
    const parsed = parseBirthday(row.birthday);
    if (!parsed) continue;
    const target = addDays(todayStart, row.leadDays);
    if (target.getMonth() + 1 !== parsed.month || target.getDate() !== parsed.day) continue;
    if (row.lastSentForYear === target.getFullYear()) continue;
    due.push({
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
    });
  }
  return due;
}

export type ShortlistEntry = {
  kind: "product" | "suggestion";
  title: string;
  retailer: string | null;
  url: string | null;
  pricePence: number | null;
  rationale: string | null;
};

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
  if (due.length === 0) {
    return { dueCount: 0, sent: 0, errors: [] as string[] };
  }

  const byUser = new Map<string, DueReminder[]>();
  for (const reminder of due) {
    const list = byUser.get(reminder.userId) ?? [];
    list.push(reminder);
    byUser.set(reminder.userId, list);
  }

  const errors: string[] = [];
  let sent = 0;

  for (const [userId, userDue] of byUser) {
    const digest = await buildDigestForUser(userId, userDue[0].userEmail, userDue);
    try {
      await sendReminderDigest(digest);
      sent += 1;
      // Mark every reminder as sent for this target year.
      for (const reminder of userDue) {
        await db
          .update(reminders)
          .set({ lastSentAt: new Date(), lastSentForYear: reminder.targetYear })
          .where(eq(reminders.id, reminder.reminderId));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Reminder digest send failed:", error);
      errors.push(`${digest.userEmail}: ${message}`);
    }
  }

  return { dueCount: due.length, sent, errors };
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
// Suppress unused-import warning if giftHistory / and not used in this module yet.
void giftHistory;
void and;
