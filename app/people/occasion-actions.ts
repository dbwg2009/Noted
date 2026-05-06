"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { occasions, people, users } from "@/db/schema";
import { ensureDefaultReminders } from "@/lib/reminders";
import { getKnownOccasionDate, getKnownOccasionLabel } from "@/lib/occasions";

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

function buildDateFromParts(formData: FormData): string | null {
  const month = String(formData.get("occasionMonth") ?? "").trim().padStart(2, "0");
  const day = String(formData.get("occasionDay") ?? "").trim().padStart(2, "0");
  if (!month || !day) return null;
  const year = new Date().getFullYear();
  const candidate = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

export async function createOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "").trim().toLowerCase();
  let name = String(formData.get("name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!kind) return;
  if (!name && kind !== "custom") {
    name = getKnownOccasionLabel(kind);
  }

  let date: string | null = null;
  if (kind === "custom" || kind === "anniversary") {
    date = buildDateFromParts(formData);
  } else {
    date = getKnownOccasionDate(kind);
  }
  if ((kind === "custom" || kind === "anniversary") && !date) return;

  if (personId) {
    const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.id, personId), eq(people.userId, userId))).limit(1);
    if (!p) return;
  }

  const [created] = await db
    .insert(occasions)
    .values({ userId, personId: personId ?? undefined, kind: kind as any, name, date, yearRecurring: true, notes })
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
  const kind = String(formData.get("kind") ?? "").trim().toLowerCase();
  let name = String(formData.get("name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !kind) return;
  if (!name && kind !== "custom") {
    name = getKnownOccasionLabel(kind);
  }

  let date: string | null = null;
  if (kind === "custom" || kind === "anniversary") {
    date = buildDateFromParts(formData);
  } else {
    date = getKnownOccasionDate(kind);
  }
  if ((kind === "custom" || kind === "anniversary") && !date) return;

  const [row] = await db.select({ personId: occasions.personId, userId: occasions.userId }).from(occasions).where(eq(occasions.id, id)).limit(1);
  if (!row) return;

  // verify ownership
  if (row.personId) {
    const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.id, row.personId), eq(people.userId, userId))).limit(1);
    if (!p) return;
  } else if (row.userId !== userId) {
    return;
  }

  await db
    .update(occasions)
    .set({ kind: kind as any, name, date, yearRecurring: true, notes })
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
  if (row.personId) revalidatePath(`/people/${row.personId}`);
}
