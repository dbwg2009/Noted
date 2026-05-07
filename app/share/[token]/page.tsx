import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSharePageData } from "@/lib/share-queries";

export const dynamic = "force-dynamic";

function poundsFromPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

const statusLabel: Record<string, string> = {
  idea: "Idea",
  researching: "Researching",
  chosen: "Chosen",
};

const statusColour: Record<string, string> = {
  idea: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  researching: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  chosen: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharePageData(token);
  if (!data) notFound();

  const { person, items, share } = data;

  return (
    <div className="min-h-screen bg-brand-blue-50 dark:bg-neutral-950">
      {/* Branded header — no nav links, no sign-out */}
      <header className="bg-brand-blue-600 shadow-md dark:bg-brand-blue-900">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo/icon.png" alt="Noted" width={36} height={36} priority />
            <span className="text-lg font-semibold tracking-tight text-white">Noted</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {person.name}&rsquo;s wishlist
        </h1>
        {share.expiresAt && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            This link expires {share.expiresAt.toLocaleDateString("en-GB")}
          </p>
        )}

        {items.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
            No wishlist items to show yet.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">{item.description}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusColour[item.status] ?? ""}`}
                  >
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </div>

                {item.sourceNote && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {item.sourceNote}
                    {item.heardOn && ` · ${item.heardOn}`}
                  </p>
                )}

                {share.showPrices && (item.priceMin !== null || item.priceMax !== null) && (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {item.priceMin !== null ? poundsFromPence(item.priceMin) : ""}
                    {item.priceMin !== null && item.priceMax !== null ? " – " : ""}
                    {item.priceMax !== null ? poundsFromPence(item.priceMax) : ""}
                  </p>
                )}

                {item.products.length > 0 && (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {item.products.map((p) => (
                      <li
                        key={p.id}
                        className="flex gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"
                      >
                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                            {p.retailer && <span>{p.retailer}</span>}
                            {share.showPrices && p.price !== null && (
                              <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                                {poundsFromPence(p.price)}
                              </span>
                            )}
                            <span
                              className={`rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${
                                p.source === "ai_search"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                  : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                              }`}
                            >
                              {p.source === "ai_search" ? "AI" : "Manual"}
                            </span>
                          </div>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-medium text-brand-blue-600 hover:underline dark:text-brand-blue-400"
                          >
                            View product →
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center text-xs text-neutral-400 dark:text-neutral-600">
          Shared via{" "}
          <Link href="/" className="hover:underline">
            Noted
          </Link>{" "}
          · Read-only view
        </p>
      </main>
    </div>
  );
}
