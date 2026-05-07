import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { updateUser, changePassword, resetIcalToken } from "./actions";
import { listSiteWideOccasions, getExcludedPeopleForOccasion } from "@/lib/occasions-queries";
import { listPeopleSummary } from "@/lib/people-queries";
import { formatOccasionDate, getKnownOccasionLabel } from "@/lib/occasions";
import {
  createSiteWideOccasion,
  updateSiteWideOccasion,
  deleteSiteWideOccasion,
  excludePersonFromOccasion,
  includePersonInOccasion,
} from "./occasion-actions";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const email = session!.user!.email!.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) redirect("/login");

  const [siteWideOccasions, allPeople] = await Promise.all([
    listSiteWideOccasions(user.id),
    listPeopleSummary(user.id),
  ]);

  // Fetch exclusions per occasion
  const exclusionsByOccasion = new Map<number, Set<string>>();
  for (const occ of siteWideOccasions) {
    const excluded = await getExcludedPeopleForOccasion(occ.id);
    exclusionsByOccasion.set(occ.id, new Set(excluded));
  }

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
        <h2 className="text-lg font-medium">Site-wide occasions</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          These occasions appear on every person&apos;s profile and generate a single gift-list reminder email listing all included people.
        </p>

        {/* Add form */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-blue-600 hover:underline dark:text-brand-blue-400">+ Add occasion</summary>
          <form action={createSiteWideOccasion} className="mt-3 grid gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <label className="block">
              <div className="text-sm text-neutral-600">Type</div>
              <select name="kind" className="input-field mt-1">
                <option value="christmas">Christmas</option>
                <option value="easter">Easter</option>
                <option value="valentines">Valentine&apos;s Day</option>
                <option value="mothers_day">Mother&apos;s Day</option>
                <option value="fathers_day">Father&apos;s Day</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="block">
              <div className="text-sm text-neutral-600">Name (optional override)</div>
              <input name="name" className="input-field mt-1" placeholder="Leave blank to use default" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-sm text-neutral-600">Month (custom only)</div>
                <select name="occasionMonth" className="input-field mt-1">
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="text-sm text-neutral-600">Day (custom only)</div>
                <select name="occasionDay" className="input-field mt-1">
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <div className="text-sm text-neutral-600">Notes</div>
              <textarea name="notes" rows={2} className="input-field mt-1" />
            </label>
            <div>
              <button type="submit" className="btn-primary px-4 py-2 text-sm">Add occasion</button>
            </div>
          </form>
        </details>

        {/* Existing site-wide occasions */}
        {siteWideOccasions.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">No site-wide occasions yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {siteWideOccasions.map((occ) => {
              const excluded = exclusionsByOccasion.get(occ.id) ?? new Set<string>();
              return (
                <li key={occ.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{occ.name ?? getKnownOccasionLabel(occ.kind)}</p>
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {formatOccasionDate(occ.date, false, occ.kind)}
                        {occ.daysUntil !== null && (
                          <span className="ml-2 text-neutral-400">· {occ.daysUntil === 0 ? "today" : occ.daysUntil === 1 ? "tomorrow" : `in ${occ.daysUntil} days`}</span>
                        )}
                      </p>
                    </div>
                    <details className="shrink-0">
                      <summary className="cursor-pointer text-xs text-neutral-500 hover:underline">Edit / Delete</summary>
                      <form action={updateSiteWideOccasion} className="mt-2 grid gap-2">
                        <input type="hidden" name="occasionId" value={occ.id} />
                        <input type="hidden" name="kind" value={occ.kind} />
                        <input name="name" defaultValue={occ.name ?? ""} className="input-field text-sm" />
                        {occ.kind === "custom" && (
                          <div className="grid grid-cols-2 gap-2">
                            <select name="occasionMonth" defaultValue={occ.date?.slice(5, 7) ?? "01"} className="input-field text-sm">
                              {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                              ))}
                            </select>
                            <select name="occasionDay" defaultValue={occ.date?.slice(8, 10) ?? "01"} className="input-field text-sm">
                              {[...Array(31)].map((_, i) => (
                                <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <textarea name="notes" rows={2} defaultValue={occ.notes ?? ""} className="input-field text-sm" />
                        <button type="submit" className="btn-primary px-3 py-1.5 text-sm w-fit">Save</button>
                      </form>
                      <form action={deleteSiteWideOccasion} className="mt-2">
                        <input type="hidden" name="occasionId" value={occ.id} />
                        <button type="submit" className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">Delete</button>
                      </form>
                    </details>
                  </div>

                  {/* People exclusions */}
                  {allPeople.length > 0 && (
                    <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <p className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wide">People</p>
                      <div className="flex flex-wrap gap-2">
                        {allPeople.map((p) => {
                          const isExcluded = excluded.has(p.id);
                          return (
                            <form
                              key={p.id}
                              action={isExcluded ? includePersonInOccasion : excludePersonFromOccasion}
                              className="inline"
                            >
                              <input type="hidden" name="occasionId" value={occ.id} />
                              <input type="hidden" name="personId" value={p.id} />
                              <button
                                type="submit"
                                title={isExcluded ? "Click to include" : "Click to exclude"}
                                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                                  isExcluded
                                    ? "border-neutral-200 bg-neutral-100 text-neutral-400 line-through dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500"
                                    : "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-700 hover:bg-brand-blue-100 dark:border-brand-blue-900 dark:bg-brand-blue-950 dark:text-brand-blue-300"
                                }`}
                              >
                                {p.name}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-neutral-400">Click a person to exclude/include them from this occasion&apos;s reminder.</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
