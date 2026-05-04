import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { updateUser, changePassword, resetIcalToken } from "./actions";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const email = session!.user!.email!.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const flashCookie = cookieStore.get("settings_flash");
  let flash: { message: string; tone: string } | null = null;
  if (flashCookie?.value) {
    try {
      const parsed = JSON.parse(flashCookie.value);
      if (parsed?.message) flash = { message: parsed.message, tone: parsed.tone ?? "success" };
    } catch (e) {
      // ignore
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {flash && (
        <div className={flash.tone === "error" ? "mt-4 rounded p-3 bg-red-50 text-red-700" : "mt-4 rounded p-3 bg-green-50 text-green-700"}>
          {flash.message}
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-medium">Profile</h2>
        <form action={updateUser} className="mt-3 grid gap-3">
          <label className="block">
            <div className="text-sm text-neutral-600">Name</div>
            <input name="name" defaultValue={user.name ?? ""} className="input-field mt-1" />
          </label>
          <label className="block">
            <div className="text-sm text-neutral-600">Email</div>
            <input name="email" type="email" defaultValue={user.email} className="input-field mt-1" />
          </label>
          <label className="block">
            <div className="text-sm text-neutral-600">Timezone</div>
            <input name="timezone" defaultValue={user.timezone ?? "Europe/London"} className="input-field mt-1" />
          </label>
          <label className="block">
            <div className="text-sm text-neutral-600">Default currency</div>
            <input name="defaultCurrency" defaultValue={user.defaultCurrency ?? "GBP"} className="input-field mt-1 w-32" />
          </label>
          <div className="mt-2">
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Save profile</button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Password</h2>
        <form action={changePassword} className="mt-3 grid gap-3">
          <label className="block">
            <div className="text-sm text-neutral-600">Current password</div>
            <input name="currentPassword" type="password" className="input-field mt-1" />
          </label>
          <label className="block">
            <div className="text-sm text-neutral-600">New password</div>
            <input name="newPassword" type="password" className="input-field mt-1" />
          </label>
          <div className="mt-2">
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Change password</button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Active session</h2>
        <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium">{user.name ?? "—"}</div>
              <div className="text-xs text-neutral-500">{user.email}</div>
              {session.expires && (
                <div className="text-xs text-neutral-400 mt-0.5">
                  Session expires {new Date(session.expires).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}
            </div>
            <form action={async () => { "use server"; const { signOut } = await import("@/lib/auth"); await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="text-xs text-red-600 hover:underline">Sign out</button>
            </form>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-400">Sessions are stored in a browser cookie. Signing out removes it from this device.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">iCal</h2>
        <p className="mt-2 text-sm text-neutral-600">Your iCal token is used for the private calendar feed.</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="rounded bg-neutral-50 px-3 py-2 text-sm font-mono dark:bg-neutral-800 dark:text-neutral-200">{user.icalToken}</div>
          <form action={resetIcalToken}>
            <button type="submit" className="px-3 py-2 text-sm rounded border">Reset token</button>
          </form>
        </div>
      </section>
    </main>
  );
}
