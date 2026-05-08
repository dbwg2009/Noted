"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { giftGroups, giftGroupContributors } from "@/db/schema";
import { requireCurrentUserId } from "@/lib/people-queries";

function parsePence(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const n = parseFloat(value);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function createGiftGroup(formData: FormData) {
  const userId = await requireCurrentUserId();

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return;

  const personId = (formData.get("personId") as string | null) || null;
  const wishlistItemId = (formData.get("wishlistItemId") as string | null) || null;
  const targetAmount = parsePence(formData.get("targetAmount"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const [group] = await db
    .insert(giftGroups)
    .values({ userId, title, personId, wishlistItemId, targetAmount, notes })
    .returning({ id: giftGroups.id });

  revalidatePath("/gift-groups");
  redirect(`/gift-groups/${group.id}`);
}

export async function updateGiftGroup(formData: FormData) {
  const userId = await requireCurrentUserId();
  const id = formData.get("groupId") as string;

  const [existing] = await db.select({ userId: giftGroups.userId }).from(giftGroups).where(eq(giftGroups.id, id));
  if (!existing || existing.userId !== userId) return;

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return;

  const status = formData.get("status") as "planning" | "ordered" | "received";
  const targetAmount = parsePence(formData.get("targetAmount"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  await db.update(giftGroups).set({ title, status, targetAmount, notes }).where(eq(giftGroups.id, id));

  revalidatePath(`/gift-groups/${id}`);
  revalidatePath("/gift-groups");
}

export async function deleteGiftGroup(formData: FormData) {
  const userId = await requireCurrentUserId();
  const id = formData.get("groupId") as string;

  const [existing] = await db.select({ userId: giftGroups.userId }).from(giftGroups).where(eq(giftGroups.id, id));
  if (!existing || existing.userId !== userId) return;

  await db.delete(giftGroups).where(eq(giftGroups.id, id));

  revalidatePath("/gift-groups");
  redirect("/gift-groups");
}

export async function addContributor(formData: FormData) {
  const userId = await requireCurrentUserId();
  const groupId = formData.get("groupId") as string;

  const [group] = await db.select({ userId: giftGroups.userId }).from(giftGroups).where(eq(giftGroups.id, groupId));
  if (!group || group.userId !== userId) return;

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return;

  const email = (formData.get("email") as string | null)?.trim() || null;
  const contributionAmount = parsePence(formData.get("contributionAmount"));

  await db.insert(giftGroupContributors).values({ groupId, name, email, contributionAmount });

  revalidatePath(`/gift-groups/${groupId}`);
}

export async function updateContributor(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;

  const [group] = await db.select({ userId: giftGroups.userId }).from(giftGroups).where(eq(giftGroups.id, groupId));
  if (!group || group.userId !== userId) return;

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return;

  const email = (formData.get("email") as string | null)?.trim() || null;
  const contributionAmount = parsePence(formData.get("contributionAmount"));
  const paid = formData.get("paid") === "on";

  await db
    .update(giftGroupContributors)
    .set({ name, email, contributionAmount, paid })
    .where(eq(giftGroupContributors.id, contributorId));

  revalidatePath(`/gift-groups/${groupId}`);
}

export async function deleteContributor(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;

  const [group] = await db.select({ userId: giftGroups.userId }).from(giftGroups).where(eq(giftGroups.id, groupId));
  if (!group || group.userId !== userId) return;

  await db.delete(giftGroupContributors).where(eq(giftGroupContributors.id, contributorId));

  revalidatePath(`/gift-groups/${groupId}`);
}
