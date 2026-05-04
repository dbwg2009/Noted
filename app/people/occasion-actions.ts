"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { occasions, people, users } from "@/db/schema";
import { ensureDefaultReminders } from "@/lib/reminders";

async function requireCurrentUserId() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();

  if (!email) {
    throw new Error("Not authenticated");
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error("Authenticated user was not found in the database");
  return user.id;
}

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export async function createOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || null;
  const date = parseDate(formData.get("date"));
  const yearRecurring = formData.get("yearRecurring") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // For custom occasions date is required; for named kinds date may be omitted.
  if (!kind) return;
  if (kind === "custom" && !date) return;

  if (personId) {
    const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.id, personId), eq(people.userId, userId))).limit(1);
    if (!p) return;
  }

  const [created] = await db
    .insert(occasions)
    .values({ userId, personId: personId ?? undefined, kind: kind as any, name, date, yearRecurring, notes })
    .returning({ id: occasions.id });

  if (created && personId) {
    await ensureDefaultReminders(personId);
  }

  revalidatePath("/people");
  revalidatePath("/");
  if (personId) redirect(`/people/${personId}`);
}

export async function updateOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const id = Number(formData.get("occasionId") ?? 0);
  const kind = String(formData.get("kind") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || null;
  const yearRecurring = formData.get("yearRecurring") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !kind) return;
  // custom occasions must have a date
  if (kind === "custom" && !date) return;

  const [row] = await db.select({ personId: occasions.personId }).from(occasions).where(eq(occasions.id, id)).limit(1);
  if (!row) return;

  // verify ownership
  const [ownerCheck] = await db.select({ id: users.id }).from(users).where(eq(users.id, row.personId ? row.personId : userId)).limit(1);
  // If occasion is person-scoped, ensure that person belongs to user
  if (row.personId) {
    const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.id, row.personId), eq(people.userId, userId))).limit(1);
    if (!p) return;
  }

  await db
    .update(occasions)
    .set({ kind: kind as any, name, date, yearRecurring, notes })
    .where(eq(occasions.id, id));

  revalidatePath("/people");
  revalidatePath("/");
  if (row.personId) redirect(`/people/${row.personId}`);
}

export async function deleteOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const id = Number(formData.get("occasionId") ?? 0);
  if (!id) return;

  const [row] = await db.select({ personId: occasions.personId, userId: occasions.userId }).from(occasions).where(eq(occasions.id, id)).limit(1);
  if (!row) return;

  // If occasion has a personId, ensure the person belongs to the user
  if (row.personId) {
    const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.id, row.personId), eq(people.userId, userId))).limit(1);
    if (!p) return;
  } else {
    // user-level occasion must belong to current user
    if (row.userId !== userId) return;
  }

  await db.delete(occasions).where(eq(occasions.id, id));

  revalidatePath("/people");
  revalidatePath("/");
}
