"use server";

import { randomUUID } from "crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { giftGroups, giftGroupContributors, people, wishlistItems, users } from "@/db/schema";
import { requireCurrentUserId } from "@/lib/people-queries";
import { sendGroupGiftInvite } from "@/lib/notify/email";

function newInvite() {
  return { inviteToken: randomUUID(), inviteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
}

function maskEmailForLog(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = local.length <= 2 ? "**" : `${local[0]}…${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

function parsePence(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function createGiftGroup(formData: FormData) {
  const userId = await requireCurrentUserId();

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return;

  let personId = (formData.get("personId") as string | null) || null;
  const wishlistItemId = (formData.get("wishlistItemId") as string | null) || null;
  const targetAmount = parsePence(formData.get("targetAmount"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (wishlistItemId) {
    const [item] = await db
      .select({ personId: wishlistItems.personId })
      .from(wishlistItems)
      .innerJoin(people, eq(wishlistItems.personId, people.id))
      .where(and(eq(wishlistItems.id, wishlistItemId), eq(people.userId, userId)));
    if (!item) return;
    if (personId) {
      if (personId !== item.personId) return;
    } else {
      personId = item.personId;
    }
  } else if (personId) {
    const [person] = await db
      .select({ userId: people.userId })
      .from(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId)));
    if (!person) return;
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
    const [emailDupe] = await db
      .select({ id: giftGroupContributors.id })
      .from(giftGroupContributors)
      .where(and(eq(giftGroupContributors.groupId, groupId), eq(giftGroupContributors.email, email)))
      .limit(1);
    if (emailDupe) {
      revalidatePath(`/gift-groups/${groupId}`);
      return;
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      // Skip silently if this user is already a contributor
      const [already] = await db
        .select({ id: giftGroupContributors.id })
        .from(giftGroupContributors)
        .where(and(eq(giftGroupContributors.groupId, groupId), eq(giftGroupContributors.userId, existingUser.id)));
      if (already) {
        revalidatePath(`/gift-groups/${groupId}`);
        return;
      }
      // Registered user: link by userId, generate token, require explicit in-app accept
      const { inviteToken, inviteExpiresAt } = newInvite();
      const [inserted] = await db
        .insert(giftGroupContributors)
        .values({
          groupId,
          userId: existingUser.id,
          name,
          email,
          contributionAmount,
          inviteToken,
          inviteExpiresAt,
        })
        .returning({ id: giftGroupContributors.id });
      try {
        await sendGroupGiftInvite(email, group.title, inviteToken, true);
      } catch (err) {
        console.error("[gift-groups] sendGroupGiftInvite failed", {
          groupId,
          contributorId: inserted.id,
          maskedRecipient: maskEmailForLog(email),
        }, err);
      }
    } else {
      // Unregistered user: invite link goes to sign-up
      const { inviteToken, inviteExpiresAt } = newInvite();
      const [inserted] = await db
        .insert(giftGroupContributors)
        .values({ groupId, name, email, contributionAmount, inviteToken, inviteExpiresAt })
        .returning({ id: giftGroupContributors.id });
      try {
        await sendGroupGiftInvite(email, group.title, inviteToken, false);
      } catch (err) {
        console.error("[gift-groups] sendGroupGiftInvite failed", {
          groupId,
          contributorId: inserted.id,
          maskedRecipient: maskEmailForLog(email),
        }, err);
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

  const [existingContributor] = await db
    .select({
      email: giftGroupContributors.email,
      userId: giftGroupContributors.userId,
      inviteAcceptedAt: giftGroupContributors.inviteAcceptedAt,
    })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));
  if (!existingContributor) return;

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return;

  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || null;
  const contributionAmount = parsePence(formData.get("contributionAmount"));
  const paid = formData.get("paid") === "on";

  if (email) {
    const [emailDupe] = await db
      .select({ id: giftGroupContributors.id })
      .from(giftGroupContributors)
      .where(
        and(
          eq(giftGroupContributors.groupId, groupId),
          eq(giftGroupContributors.email, email),
          ne(giftGroupContributors.id, contributorId),
        ),
      )
      .limit(1);
    if (emailDupe) return;
  }

  const emailChanged = (existingContributor.email ?? "").toLowerCase() !== (email ?? "").toLowerCase();
  let nextUserId: string | null | undefined;
  let nextInviteToken: string | null | undefined;
  let nextInviteExpiresAt: Date | null | undefined;
  let nextInviteAcceptedAt: Date | null | undefined;
  let sendInviteEmail: string | null = null;
  let inviteIsLinkedUser = false;

  if (emailChanged) {
    if (!email) {
      nextUserId = null;
      nextInviteToken = null;
      nextInviteExpiresAt = null;
      nextInviteAcceptedAt = null;
    } else {
      const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existingUser) {
        const [already] = await db
          .select({ id: giftGroupContributors.id })
          .from(giftGroupContributors)
          .where(
            and(
              eq(giftGroupContributors.groupId, groupId),
              eq(giftGroupContributors.userId, existingUser.id),
            ),
          );
        if (already && already.id !== contributorId) return;
        nextUserId = existingUser.id;
        inviteIsLinkedUser = true;
      } else {
        nextUserId = null;
      }

      const { inviteToken, inviteExpiresAt } = newInvite();
      nextInviteToken = inviteToken;
      nextInviteExpiresAt = inviteExpiresAt;
      nextInviteAcceptedAt = null;
      sendInviteEmail = email;
    }
  }

  await db
    .update(giftGroupContributors)
    .set({
      name,
      email,
      contributionAmount,
      paid,
      ...(nextUserId !== undefined ? { userId: nextUserId } : {}),
      ...(nextInviteToken !== undefined ? { inviteToken: nextInviteToken } : {}),
      ...(nextInviteExpiresAt !== undefined ? { inviteExpiresAt: nextInviteExpiresAt } : {}),
      ...(nextInviteAcceptedAt !== undefined ? { inviteAcceptedAt: nextInviteAcceptedAt } : {}),
    })
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));

  if (sendInviteEmail) {
    const [groupTitle] = await db.select({ title: giftGroups.title }).from(giftGroups).where(eq(giftGroups.id, groupId));
    if (groupTitle?.title && nextInviteToken) {
      try {
        await sendGroupGiftInvite(sendInviteEmail, groupTitle.title, nextInviteToken, inviteIsLinkedUser);
      } catch (err) {
        console.error("[gift-groups] updateContributor sendGroupGiftInvite failed", {
          groupId,
          contributorId,
          maskedRecipient: maskEmailForLog(sendInviteEmail),
        }, err);
      }
    }
  }

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
    .select({
      email: giftGroupContributors.email,
      userId: giftGroupContributors.userId,
      inviteAcceptedAt: giftGroupContributors.inviteAcceptedAt,
    })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));
  if (!contributor?.email || contributor.inviteAcceptedAt) return;

  const { inviteToken, inviteExpiresAt } = newInvite();
  await db
    .update(giftGroupContributors)
    .set({ inviteToken, inviteExpiresAt })
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));

  try {
    await sendGroupGiftInvite(contributor.email, group.title, inviteToken, !!contributor.userId);
  } catch (err) {
    console.error("[gift-groups] resendInvite sendGroupGiftInvite failed", {
      groupId,
      contributorId,
      maskedRecipient: maskEmailForLog(contributor.email),
    }, err);
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

  if (contributor.email) {
    const linkedOk = contributor.userId !== null && contributor.userId === userId;
    if (!linkedOk) {
      const [me] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
      if (!me || me.email.toLowerCase() !== contributor.email.toLowerCase()) return { error: "wrong_account" as const };
    }
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
    if (result.error === "invalid" || result.error === "already_accepted" || result.error === "expired") {
      redirect(`/gift-groups/invite/${token}?error=${result.error}`);
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

export async function acceptLinkedInvite(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;

  const [row] = await db
    .select({
      userId: giftGroupContributors.userId,
      inviteExpiresAt: giftGroupContributors.inviteExpiresAt,
      inviteAcceptedAt: giftGroupContributors.inviteAcceptedAt,
    })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));
  if (!row || row.userId !== userId) return;
  if (row.inviteAcceptedAt) return;
  if (row.inviteExpiresAt && row.inviteExpiresAt < new Date()) {
    redirect(`/gift-groups?error=invite_expired`);
  }

  await db
    .update(giftGroupContributors)
    .set({ inviteAcceptedAt: new Date() })
    .where(eq(giftGroupContributors.id, contributorId));

  revalidatePath("/gift-groups");
  revalidatePath(`/gift-groups/${groupId}`);
  redirect(`/gift-groups/${groupId}`);
}

export async function declineInvitation(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contributorId = formData.get("contributorId") as string;
  const groupId = formData.get("groupId") as string;

  const [row] = await db
    .select({ userId: giftGroupContributors.userId })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.id, contributorId), eq(giftGroupContributors.groupId, groupId)));
  if (!row || row.userId !== userId) return;

  await db.delete(giftGroupContributors).where(eq(giftGroupContributors.id, contributorId));

  revalidatePath("/gift-groups");
}
