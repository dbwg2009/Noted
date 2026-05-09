"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { giftGroups, giftGroupContributors, people, wishlistItems, users } from "@/db/schema";
import { requireCurrentUserId } from "@/lib/people-queries";
import { sendGroupGiftNotification, sendGroupGiftInvite } from "@/lib/notify/email";

function parsePence(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return null;
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

  if (personId) {
    const [person] = await db
      .select({ userId: people.userId })
      .from(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId)));
    if (!person) return;
  }

  if (wishlistItemId) {
    const [item] = await db
      .select({ userId: people.userId })
      .from(wishlistItems)
      .innerJoin(people, eq(wishlistItems.personId, people.id))
      .where(and(eq(wishlistItems.id, wishlistItemId), eq(people.userId, userId)));
    if (!item) return;
  }

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

  const rawStatus = formData.get("status");
  const validStatuses = ["planning", "ordered", "received"] as const;
  if (!validStatuses.includes(rawStatus as (typeof validStatuses)[number])) return;
  const status = rawStatus as (typeof validStatuses)[number];
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

  const [group] = await db
    .select({ userId: giftGroups.userId, title: giftGroups.title })
    .from(giftGroups)
    .where(eq(giftGroups.id, groupId));
  if (!group || group.userId !== userId) return;

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return;

  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || null;
  const contributionAmount = parsePence(formData.get("contributionAmount"));

  if (email) {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      // Link immediately and notify
      await db.insert(giftGroupContributors).values({
        groupId,
        userId: existingUser.id,
        name,
        email,
        contributionAmount,
        inviteAcceptedAt: new Date(),
      });
      try {
        await sendGroupGiftNotification(email, group.title, groupId);
      } catch {
        // email failure is non-fatal
      }
    } else {
      // Generate invite token valid for 30 days
      const inviteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const [row] = await db
        .insert(giftGroupContributors)
        .values({ groupId, name, email, contributionAmount, inviteExpiresAt })
        .returning({ inviteToken: giftGroupContributors.inviteToken });
      if (row?.inviteToken) {
        try {
          await sendGroupGiftInvite(email, group.title, row.inviteToken);
        } catch {
          // email failure is non-fatal
        }
      }
    }
  } else {
    // Offline contributor — no email, no invite
    await db.insert(giftGroupContributors).values({ groupId, name, contributionAmount });
  }

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
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));

  revalidatePath(`/gift-groups/${groupId}`);
}

export async function deleteContributor(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;

  const [group] = await db.select({ userId: giftGroups.userId }).from(giftGroups).where(eq(giftGroups.id, groupId));
  if (!group || group.userId !== userId) return;

  await db.delete(giftGroupContributors).where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));

  revalidatePath(`/gift-groups/${groupId}`);
}

export async function resendInvite(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;

  const [group] = await db
    .select({ userId: giftGroups.userId, title: giftGroups.title })
    .from(giftGroups)
    .where(eq(giftGroups.id, groupId));
  if (!group || group.userId !== userId) return;

  const [contributor] = await db
    .select({ email: giftGroupContributors.email, inviteAcceptedAt: giftGroupContributors.inviteAcceptedAt })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));
  if (!contributor?.email || contributor.inviteAcceptedAt) return;

  const inviteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [updated] = await db
    .update(giftGroupContributors)
    .set({ inviteExpiresAt })
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)))
    .returning({ inviteToken: giftGroupContributors.inviteToken });

  if (updated?.inviteToken) {
    try {
      await sendGroupGiftInvite(contributor.email, group.title, updated.inviteToken);
    } catch {
      // non-fatal
    }
  }

  revalidatePath(`/gift-groups/${groupId}`);
}

export async function acceptInvite(token: string) {
  const userId = await requireCurrentUserId();

  const [contributor] = await db
    .select({
      id: giftGroupContributors.id,
      groupId: giftGroupContributors.groupId,
      email: giftGroupContributors.email,
      userId: giftGroupContributors.userId,
      inviteExpiresAt: giftGroupContributors.inviteExpiresAt,
      inviteAcceptedAt: giftGroupContributors.inviteAcceptedAt,
    })
    .from(giftGroupContributors)
    .where(eq(giftGroupContributors.inviteToken, token));

  if (!contributor) return { error: "invalid" as const };
  if (contributor.inviteAcceptedAt) return { error: "already_accepted" as const };
  if (contributor.inviteExpiresAt && contributor.inviteExpiresAt < new Date()) return { error: "expired" as const };

  // Block if logged-in user's email doesn't match the invite email
  if (contributor.email) {
    const [me] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (!me || me.email.toLowerCase() !== contributor.email.toLowerCase()) return { error: "wrong_account" as const };
  }

  await db
    .update(giftGroupContributors)
    .set({ userId, inviteAcceptedAt: new Date() })
    .where(eq(giftGroupContributors.id, contributor.id));

  revalidatePath("/gift-groups");
  revalidatePath(`/gift-groups/${contributor.groupId}`);

  return { groupId: contributor.groupId };
}

export async function acceptInviteAction(formData: FormData) {
  const token = formData.get("token") as string;
  const result = await acceptInvite(token);
  if ("error" in result) {
    if (result.error === "wrong_account") {
      redirect(`/gift-groups/invite/${token}?error=wrong_account`);
    }
    redirect(`/gift-groups/invite/${token}?error=failed`);
  }
  redirect(`/gift-groups/${result.groupId}`);
}

export async function leaveGroup(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;

  // Verify the contributor row belongs to the current user
  const [row] = await db
    .select({ userId: giftGroupContributors.userId })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));
  if (!row || row.userId !== userId) return;

  await db.delete(giftGroupContributors).where(eq(giftGroupContributors.id, contributorId));

  revalidatePath("/gift-groups");
  redirect("/gift-groups");
}

export async function updateMyContribution(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;
  const contributionAmount = parsePence(formData.get("contributionAmount"));

  // Only the linked user can update their own row via this action
  const [row] = await db
    .select({ userId: giftGroupContributors.userId })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));
  if (!row || row.userId !== userId) return;

  await db
    .update(giftGroupContributors)
    .set({ contributionAmount })
    .where(eq(giftGroupContributors.id, contributorId));

  revalidatePath(`/gift-groups/${groupId}`);
}
