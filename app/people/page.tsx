import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        CRUD coming in Phase 1.
      </p>
    </main>
  );
}
