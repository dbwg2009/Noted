"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { wishlistShares, people } from "@/db/schema";
import { requireCurrentUserId } from "@/lib/people-queries";

async function verifyPersonOwnership(personId: string, userId: string) {
  const [p] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);
  return !!p;
}

function parseExpiresAt(preset: string): Date | null {
  const now = new Date();
  if (preset === "1m") return new Date(new Date(now).setMonth(now.getMonth() + 1));
  if (preset === "3m") return new Date(new Date(now).setMonth(now.getMonth() + 3));
  if (preset === "1y") return new Date(new Date(now).setFullYear(now.getFullYear() + 1));
  return null;
}

export async function upsertWishlistShare(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "").trim();
  if (!personId) return;
  if (!(await verifyPersonOwnership(personId, userId))) return;

  const showPrices = formData.get("showPrices") === "on";
  const showIdea = formData.get("showIdea") === "on";
  const showResearching = formData.get("showResearching") === "on";
  const showChosen = formData.get("showChosen") === "on";
  const expiresAt = parseExpiresAt(String(formData.get("expiresPreset") ?? "never"));

  const [existing] = await db
    .select({ id: wishlistShares.id })
    .from(wishlistShares)
    .where(eq(wishlistShares.personId, personId))
    .limit(1);

  if (existing) {
    await db
      .update(wishlistShares)
      .set({ showPrices, showIdea, showResearching, showChosen, expiresAt })
      .where(eq(wishlistShares.personId, personId));
  } else {
    await db.insert(wishlistShares).values({
      personId,
      showPrices,
      showIdea,
      showResearching,
      showChosen,
      expiresAt,
    });
  }

  revalidatePath(`/people/${personId}`);
}

export async function regenerateWishlistShare(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "").trim();
  if (!personId) return;
  if (!(await verifyPersonOwnership(personId, userId))) return;

  const [existing] = await db
    .select()
    .from(wishlistShares)
    .where(eq(wishlistShares.personId, personId))
    .limit(1);

  await db.delete(wishlistShares).where(eq(wishlistShares.personId, personId));
  await db.insert(wishlistShares).values({
    personId,
    showPrices: existing?.showPrices ?? true,
    showIdea: existing?.showIdea ?? true,
    showResearching: existing?.showResearching ?? true,
    showChosen: existing?.showChosen ?? true,
    expiresAt: existing?.expiresAt ?? null,
  });

  revalidatePath(`/people/${personId}`);
}

export async function revokeWishlistShare(formData: FormData) {
  const userId = await requireCurrentUserId();
  const personId = String(formData.get("personId") ?? "").trim();
  if (!personId) return;
  if (!(await verifyPersonOwnership(personId, userId))) return;

  await db.delete(wishlistShares).where(eq(wishlistShares.personId, personId));

  revalidatePath(`/people/${personId}`);
}
