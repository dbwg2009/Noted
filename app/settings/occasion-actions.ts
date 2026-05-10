"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db";
import { occasionKind, occasions, occasionPersonExclusions, people } from "@/db/schema";

type OccasionKindValue = (typeof occasionKind.enumValues)[number];
import { requireCurrentUserId } from "@/lib/people-queries";
import { ensureSiteWideOccasionReminders } from "@/lib/reminders";
import { getKnownOccasionDate, getKnownOccasionLabel } from "@/lib/occasions";

async function setSettingsFlash(message: string, tone: "success" | "error") {
  const store = await cookies();
  store.set("settings_flash", JSON.stringify({ message, tone, ts: Date.now() }), {
    path: "/settings",
    maxAge: 30,
    httpOnly: true,
    sameSite: "lax",
  });
}

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
  if (kind === "custom") return buildDateFromParts(formData);
  return getKnownOccasionDate(kind);
}

export async function createSiteWideOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const kind = String(formData.get("kind") ?? "").trim().toLowerCase();
  let name = String(formData.get("name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!kind) return;
  if (!name && kind !== "custom") name = getKnownOccasionLabel(kind);

  const date = buildOccasionDate(kind, formData);
  if (kind === "custom" && !date) return;

  if (kind !== "custom") {
    const [dupe] = await db
      .select({ id: occasions.id })
      .from(occasions)
      .where(and(eq(occasions.userId, userId), isNull(occasions.personId), eq(occasions.kind, kind as OccasionKindValue)))
      .limit(1);
    if (dupe) {
      await setSettingsFlash(`${getKnownOccasionLabel(kind)} is already set up site-wide.`, "error");
      return;
    }
  }

  const [created] = await db
    .insert(occasions)
    .values({ userId, personId: null, kind: kind as OccasionKindValue, name, date, yearRecurring: true, notes })
    .returning({ id: occasions.id });

  if (created) await ensureSiteWideOccasionReminders(created.id);

  revalidatePath("/settings");
}

export async function updateSiteWideOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const id = Number(formData.get("occasionId") ?? 0);
  const kind = String(formData.get("kind") ?? "").trim().toLowerCase();
  let name = String(formData.get("name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !kind) return;
  if (!name && kind !== "custom") name = getKnownOccasionLabel(kind);

  const date = buildOccasionDate(kind, formData);
  if (kind === "custom" && !date) return;

  const [row] = await db
    .select({ userId: occasions.userId })
    .from(occasions)
    .where(and(eq(occasions.id, id), isNull(occasions.personId)))
    .limit(1);
  if (!row || row.userId !== userId) return;

  await db
    .update(occasions)
    .set({ kind: kind as OccasionKindValue, name, date, yearRecurring: true, notes })
    .where(eq(occasions.id, id));

  revalidatePath("/settings");
}

export async function deleteSiteWideOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const id = Number(formData.get("occasionId") ?? 0);
  if (!id) return;

  const [row] = await db
    .select({ userId: occasions.userId })
    .from(occasions)
    .where(and(eq(occasions.id, id), isNull(occasions.personId)))
    .limit(1);
  if (!row || row.userId !== userId) return;

  await db.delete(occasions).where(eq(occasions.id, id));
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function excludePersonFromOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const occasionId = Number(formData.get("occasionId") ?? 0);
  const personId = String(formData.get("personId") ?? "").trim();
  const referrer = String(formData.get("_referrer") ?? "").trim();
  if (!occasionId || !personId) return;

  const [occ] = await db
    .select({ userId: occasions.userId })
    .from(occasions)
    .where(and(eq(occasions.id, occasionId), isNull(occasions.personId)))
    .limit(1);
  if (!occ || occ.userId !== userId) return;

  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);
  if (!person) return;

  await db.insert(occasionPersonExclusions).values({ occasionId, personId }).onConflictDoNothing();

  revalidatePath("/settings");
  if (referrer.startsWith("/people/")) revalidatePath(referrer);
}

export async function includePersonInOccasion(formData: FormData) {
  const userId = await requireCurrentUserId();
  const occasionId = Number(formData.get("occasionId") ?? 0);
  const personId = String(formData.get("personId") ?? "").trim();
  const referrer = String(formData.get("_referrer") ?? "").trim();
  if (!occasionId || !personId) return;

  const [occ] = await db
    .select({ userId: occasions.userId })
    .from(occasions)
    .where(and(eq(occasions.id, occasionId), isNull(occasions.personId)))
    .limit(1);
  if (!occ || occ.userId !== userId) return;

  await db
    .delete(occasionPersonExclusions)
    .where(
      and(
        eq(occasionPersonExclusions.occasionId, occasionId),
        eq(occasionPersonExclusions.personId, personId),
      ),
    );

  revalidatePath("/settings");
  if (referrer.startsWith("/people/")) revalidatePath(referrer);
}
