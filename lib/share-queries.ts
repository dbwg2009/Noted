import { db } from "@/db";
import { wishlistShares, wishlistItems, products, people } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function getShareByToken(token: string) {
  const [share] = await db
    .select()
    .from(wishlistShares)
    .where(eq(wishlistShares.token, token))
    .limit(1);
  return share ?? null;
}

export async function getWishlistShareForPerson(personId: string) {
  const [share] = await db
    .select()
    .from(wishlistShares)
    .where(eq(wishlistShares.personId, personId))
    .limit(1);
  return share ?? null;
}

export async function getSharePageData(token: string) {
  const share = await getShareByToken(token);
  if (!share) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;

  const [person] = await db
    .select({ id: people.id, name: people.name })
    .from(people)
    .where(eq(people.id, share.personId))
    .limit(1);
  if (!person) return null;

  const visibleStatuses: ("idea" | "researching" | "chosen")[] = [];
  if (share.showIdea) visibleStatuses.push("idea");
  if (share.showResearching) visibleStatuses.push("researching");
  if (share.showChosen) visibleStatuses.push("chosen");

  const items =
    visibleStatuses.length > 0
      ? await db
          .select()
          .from(wishlistItems)
          .where(
            and(
              eq(wishlistItems.personId, share.personId),
              inArray(wishlistItems.status, visibleStatuses),
            ),
          )
      : [];

  const itemIds = items.map((i) => i.id);
  const prods =
    itemIds.length > 0
      ? await db
          .select()
          .from(products)
          .where(inArray(products.wishlistItemId, itemIds))
      : [];

  const productsByItem = new Map<string, typeof prods>();
  for (const p of prods) {
    if (!p.wishlistItemId) continue;
    const arr = productsByItem.get(p.wishlistItemId) ?? [];
    arr.push(p);
    productsByItem.set(p.wishlistItemId, arr);
  }

  return {
    share,
    person,
    items: items.map((item) => ({
      ...item,
      products: productsByItem.get(item.id) ?? [],
    })),
  };
}
