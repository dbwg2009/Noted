"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { people, users } from "@/db/schema";

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

export async function createPerson(formData: FormData) {
  const userId = await requireCurrentUserId();
  const name = String(formData.get("name") ?? "").trim();
  const birthday = parseDate(formData.get("birthday"));
  const birthYearKnown = formData.get("birthYearKnown") === "on";

  if (!name || !birthday) {
    return;
  }

  await db.insert(people).values({
    userId,
    name,
    birthday,
    birthYearKnown,
    relationship: String(formData.get("relationship") ?? "").trim() || null,
    budgetMin: parseMoneyToPence(formData.get("budgetMin")),
    budgetMax: parseMoneyToPence(formData.get("budgetMax")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    avoid: String(formData.get("avoid") ?? "").trim() || null,
    updatedAt: new Date(),
  });

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

  await db
    .update(people)
    .set({
      name,
      birthday,
      birthYearKnown,
      relationship: String(formData.get("relationship") ?? "").trim() || null,
      budgetMin: parseMoneyToPence(formData.get("budgetMin")),
      budgetMax: parseMoneyToPence(formData.get("budgetMax")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      avoid: String(formData.get("avoid") ?? "").trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, personId), eq(people.userId, userId)));

  revalidatePath("/people");
}

export async function deletePerson(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "");

  if (!personId) {
    return;
  }

  await db.delete(people).where(and(eq(people.id, personId), eq(people.userId, userId)));
  revalidatePath("/people");
}

export async function listPeopleForCurrentUser() {
  const userId = await requireCurrentUserId();
  return db
    .select()
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(desc(people.createdAt));
}
