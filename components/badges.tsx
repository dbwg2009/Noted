import { cn } from "@/lib/cn";
import { formatRelativeBirthday } from "@/lib/birthdays";

const STATUS_STYLES: Record<string, string> = {
  idea: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  researching: "bg-brand-blue-100 text-brand-blue-800 dark:bg-brand-blue-900/40 dark:text-brand-blue-200",
  chosen: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  purchased: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  given: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status] ?? STATUS_STYLES.idea,
      )}
    >
      {status}
    </span>
  );
}

export function CountdownBadge({ days }: { days: number }) {
  const tone =
    days <= 0
      ? "bg-rose-500 text-white"
      : days <= 7
        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
        : days <= 30
          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tone)}>
      {days === 0 ? "🎂 Today" : formatRelativeBirthday(days)}
    </span>
  );
}

export function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-teal-100 px-2 py-0.5 text-[11px] font-medium text-brand-teal-800 dark:bg-brand-teal-900/40 dark:text-brand-teal-200">
      {children}
    </span>
  );
}

export function Avatar({ name, photoUrl, size = 48 }: { name: string; photoUrl: string | null; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid place-items-center rounded-full bg-gradient-to-br from-brand-blue-400 to-brand-teal-400 font-semibold text-white shadow-inner"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
