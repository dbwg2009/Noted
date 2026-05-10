import { db } from "@/db";
import { giftGroups, giftGroupContributors, people, wishlistItems } from "@/db/schema";
import { and, eq, desc, inArray, isNotNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

async function attachContributors<T extends { id: string }>(groups: T[]) {
  if (groups.length === 0) return groups.map((g) => ({ ...g, contributors: [] as (typeof allContributors), totalRaised: 0 }));
  const groupIds = groups.map((g) => g.id);
  const allContributors = await db
    .select()
    .from(giftGroupContributors)
    .where(inArray(giftGroupContributors.groupId, groupIds));
  const byGroup = new Map<string, typeof allContributors>();
  for (const g of groups) byGroup.set(g.id, []);
  for (const c of allContributors) byGroup.get(c.groupId)?.push(c);
  return groups.map((g) => {
    const contributors = byGroup.get(g.id) ?? [];
    const totalRaised = contributors.reduce((sum, c) => sum + (c.contributionAmount ?? 0), 0);
    return { ...g, contributors, totalRaised };
  });
}

const groupSelectFields = {
  id: giftGroups.id,
  title: giftGroups.title,
  status: giftGroups.status,
  targetAmount: giftGroups.targetAmount,
  notes: giftGroups.notes,
  createdAt: giftGroups.createdAt,
  personId: giftGroups.personId,
  personName: people.name,
  wishlistItemId: giftGroups.wishlistItemId,
  wishlistItemDescription: wishlistItems.description,
};

async function fetchGroups(where: SQL) {
  return db
    .select({ ...groupSelectFields, ownerId: giftGroups.userId })
    .from(giftGroups)
    .leftJoin(people, eq(giftGroups.personId, people.id))
    .leftJoin(wishlistItems, eq(giftGroups.wishlistItemId, wishlistItems.id))
    .where(where)
    .orderBy(desc(giftGroups.createdAt));
}

export async function listGiftGroups(userId: string) {
  const owned = await fetchGroups(eq(giftGroups.userId, userId));

  // Groups the user is a contributor on (but doesn't own), split by acceptance
  const contributingRows = await db
    .select({ groupId: giftGroupContributors.groupId, inviteAcceptedAt: giftGroupContributors.inviteAcceptedAt, contributorId: giftGroupContributors.id })
    .from(giftGroupContributors)
    .where(eq(giftGroupContributors.userId, userId));

  const nonOwnedRows = contributingRows.filter((r) => !owned.some((g) => g.id === r.groupId));
  const acceptedIds = nonOwnedRows.filter((r) => r.inviteAcceptedAt !== null).map((r) => r.groupId);
  const pendingRows = nonOwnedRows.filter((r) => r.inviteAcceptedAt === null);
  const pendingIds = pendingRows.map((r) => r.groupId);

  const [contributing, pendingGroups, ownedWithContributors] = await Promise.all([
    acceptedIds.length === 0
      ? attachContributors([])
      : fetchGroups(inArray(giftGroups.id, acceptedIds)).then(attachContributors),
    pendingIds.length === 0
      ? attachContributors([])
      : fetchGroups(inArray(giftGroups.id, pendingIds)).then(attachContributors),
    attachContributors(owned),
  ]);

  // Attach the contributorId so the list page can build accept/decline forms
  const pendingByGroup = new Map(pendingRows.map((r) => [r.groupId, r.contributorId]));
  const pendingInvitations = pendingGroups
    .map((g) => {
      const contributorId = pendingByGroup.get(g.id);
      if (!contributorId) return null;
      return { ...g, contributorId };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  return { owned: ownedWithContributors, contributing, pendingInvitations };
}

export async function getGiftGroup(id: string, userId: string) {
  const [group] = await db
    .select({
      id: giftGroups.id,
      title: giftGroups.title,
      status: giftGroups.status,
      targetAmount: giftGroups.targetAmount,
      notes: giftGroups.notes,
      createdAt: giftGroups.createdAt,
      userId: giftGroups.userId,
      personId: giftGroups.personId,
      personName: people.name,
      wishlistItemId: giftGroups.wishlistItemId,
      wishlistItemDescription: wishlistItems.description,
      occasionId: giftGroups.occasionId,
    })
    .from(giftGroups)
    .leftJoin(people, eq(giftGroups.personId, people.id))
    .leftJoin(wishlistItems, eq(giftGroups.wishlistItemId, wishlistItems.id))
    .where(eq(giftGroups.id, id));

  if (!group) return null;

  const isOwner = group.userId === userId;

  // Allow access if owner or linked contributor
  if (!isOwner) {
    const [myRow] = await db
      .select({ id: giftGroupContributors.id })
      .from(giftGroupContributors)
      .where(and(eq(giftGroupContributors.groupId, id), eq(giftGroupContributors.userId, userId), isNotNull(giftGroupContributors.inviteAcceptedAt)));
    if (!myRow) return null;
  }

  const contributors = await db
    .select()
    .from(giftGroupContributors)
    .where(eq(giftGroupContributors.groupId, id))
    .orderBy(giftGroupContributors.createdAt);

  const totalRaised = contributors.reduce((sum, c) => sum + (c.contributionAmount ?? 0), 0);

  return { ...group, isOwner, contributors, totalRaised };
}

export async function getContributorByInviteToken(token: string) {
  const [row] = await db
    .select({
      id: giftGroupContributors.id,
      groupId: giftGroupContributors.groupId,
      name: giftGroupContributors.name,
      email: giftGroupContributors.email,
      userId: giftGroupContributors.userId,
      inviteExpiresAt: giftGroupContributors.inviteExpiresAt,
      inviteAcceptedAt: giftGroupContributors.inviteAcceptedAt,
      groupTitle: giftGroups.title,
      groupOwnerId: giftGroups.userId,
    })
    .from(giftGroupContributors)
    .innerJoin(giftGroups, eq(giftGroupContributors.groupId, giftGroups.id))
    .where(eq(giftGroupContributors.inviteToken, token));

  return row ?? null;
}
