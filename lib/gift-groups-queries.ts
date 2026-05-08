import { db } from "@/db";
import { giftGroups, giftGroupContributors, people, wishlistItems } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function listGiftGroups(userId: string) {
  const groups = await db
    .select({
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
    })
    .from(giftGroups)
    .leftJoin(people, eq(giftGroups.personId, people.id))
    .leftJoin(wishlistItems, eq(giftGroups.wishlistItemId, wishlistItems.id))
    .where(eq(giftGroups.userId, userId))
    .orderBy(desc(giftGroups.createdAt));

  if (groups.length === 0) return [];

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

  if (!group || group.userId !== userId) return null;

  const contributors = await db
    .select()
    .from(giftGroupContributors)
    .where(eq(giftGroupContributors.groupId, id))
    .orderBy(giftGroupContributors.createdAt);

  const totalRaised = contributors.reduce((sum, c) => sum + (c.contributionAmount ?? 0), 0);

  return { ...group, contributors, totalRaised };
}
