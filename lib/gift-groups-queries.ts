import { db } from "@/db";
import { giftGroups, giftGroupContributors, people, wishlistItems } from "@/db/schema";
import { and, eq, desc, inArray, or } from "drizzle-orm";

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

export async function listGiftGroups(userId: string) {
  const owned = await db
    .select({ ...groupSelectFields, ownerId: giftGroups.userId })
    .from(giftGroups)
    .leftJoin(people, eq(giftGroups.personId, people.id))
    .leftJoin(wishlistItems, eq(giftGroups.wishlistItemId, wishlistItems.id))
    .where(eq(giftGroups.userId, userId))
    .orderBy(desc(giftGroups.createdAt));

  // Groups the user is a contributor on (but doesn't own)
  const contributingRows = await db
    .select({ groupId: giftGroupContributors.groupId })
    .from(giftGroupContributors)
    .where(and(eq(giftGroupContributors.userId, userId)));

  const contributingIds = contributingRows
    .map((r) => r.groupId)
    .filter((id) => !owned.some((g) => g.id === id));

  const contributing =
    contributingIds.length === 0
      ? []
      : await db
          .select({ ...groupSelectFields, ownerId: giftGroups.userId })
          .from(giftGroups)
          .leftJoin(people, eq(giftGroups.personId, people.id))
          .leftJoin(wishlistItems, eq(giftGroups.wishlistItemId, wishlistItems.id))
          .where(inArray(giftGroups.id, contributingIds))
          .orderBy(desc(giftGroups.createdAt));

  const ownedWithContributors = await attachContributors(owned);
  const contributingWithContributors = await attachContributors(contributing);

  return { owned: ownedWithContributors, contributing: contributingWithContributors };
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
      .where(and(eq(giftGroupContributors.groupId, id), eq(giftGroupContributors.userId, userId)));
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
