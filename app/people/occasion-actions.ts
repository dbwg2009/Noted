"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { occasions, people } from "@/db/schema";
import { requireCurrentUserId } from "@/lib/people-queries";
import { ensureDefaultReminders } from "@/lib/reminders";
import { getKnownOccasionDate, getKnownOccasionLabel } from "@/lib/occasions";

function buildDateFromParts(formData: FormData): string | null {
  const rawMonth = String(formData.get("occasionMonth") ?? "").trim();
  const rawDay = String(formData.get("occasionDay") ?? "").trim();
  if (!rawMonth || !rawDay) return null;
  const month = rawMonth.padStart(2, "0");
  const day = rawDay.padStart(2, "0");
  const year = new Date().getFullYear();
  const candidate = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function buildOccasionDate(kind: string, formData: FormData): string | null {
  if (kind === "custom" || kind === "anniversary") return buildDateFromParts(formData);
  return getKnownOccasionDate(kind);
}

export async function createOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "").trim().toLowerCase();
  let name = String(formData.get("name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!kind) return;
  if (!name && kind !== "custom") name = getKnownOccasionLabel(kind);

  const date = buildOccasionDate(kind, formData);
  if ((kind === "custom" || kind === "anniversary") && !date) return;

  if (personId) {
    const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.id, personId), eq(people.userId, userId))).limit(1);
    if (!p) return;
  }

  const [created] = await db
    .insert(occasions)
    .values({ userId, personId: personId ?? undefined, kind: kind as any, name, date, yearRecurring: true, notes })
    .returning({ id: occasions.id });

  if (created && personId) await ensureDefaultReminders(personId);

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
  if (!name && kind !== "custom") name = getKnownOccasionLabel(kind);

  const date = buildOccasionDate(kind, formData);
  if ((kind === "custom" || kind === "anniversary") && !date) return;

  const [row] = await db.select({ personId: occasions.personId, userId: occasions.userId }).from(occasions).where(eq(occasions.id, id)).limit(1);
  if (!row) return;

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

  revalidatePath("/");
  if (row.personId) redirect(`/people/${row.personId}`);
}

export async function deleteOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const id = Number(formData.get("occasionId") ?? 0);
  if (!id) return;

  const [row] = await db.select({ personId: occasions.personId, userId: occasions.userId }).from(occasions).where(eq(occasions.id, id)).limit(1);
  if (!row) return;

  if (row.personId) {
    const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.id, row.personId), eq(people.userId, userId))).limit(1);
    if (!p) return;
  } else if (row.userId !== userId) {
    return;
  }

  await db.delete(occasions).where(eq(occasions.id, id));

  revalidatePath("/");
  if (row.personId) revalidatePath(`/people/${row.personId}`);
}
