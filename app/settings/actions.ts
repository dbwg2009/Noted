"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { requireCurrentUserId } from "@/lib/people-queries";

async function setSettingsFlash(message: string, tone: "success" | "error") {
  const store = await cookies();
  store.set("settings_flash", JSON.stringify({ message, tone, ts: Date.now() }), {
    path: "/settings",
    maxAge: 30,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function updateUser(formData: FormData) {
  const userId = await requireCurrentUserId();
  const name = String(formData.get("name") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "Europe/London";
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "").trim() || "GBP";

  if (!email) {
    await setSettingsFlash("Email is required.", "error");
    return redirect("/settings");
  }

  // Ensure email uniqueness
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing && existing.id !== userId) {
    await setSettingsFlash("Email is already in use.", "error");
    return redirect("/settings");
  }

  await db.update(users).set({ name, email, timezone, defaultCurrency }).where(eq(users.id, userId));

  revalidatePath("/");
  revalidatePath("/settings");
  await setSettingsFlash("Profile updated.", "success");
  return redirect("/settings");
}

export async function changePassword(formData: FormData) {
  const userId = await requireCurrentUserId();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!newPassword || newPassword.length < 8) {
    await setSettingsFlash("New password must be at least 8 characters.", "error");
    return redirect("/settings");
  }

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  const hash = row?.passwordHash;
  if (!hash) {
    await setSettingsFlash("No existing password set for this account.", "error");
    return redirect("/settings");
  }

  const ok = bcrypt.compareSync(currentPassword, hash);
  if (!ok) {
    await setSettingsFlash("Current password is incorrect.", "error");
    return redirect("/settings");
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

  await setSettingsFlash("Password updated.", "success");
  return redirect("/settings");
}

export async function resetIcalToken(formData: FormData) {
  const userId = await requireCurrentUserId();
  const token = randomUUID();
  await db.update(users).set({ icalToken: token }).where(eq(users.id, userId));
  await setSettingsFlash("iCal token reset.", "success");
  revalidatePath("/settings");
  return redirect("/settings");
}
