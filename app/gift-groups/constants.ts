export const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

export const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  ordered: "Ordered",
  received: "Received",
};

export const STATUS_COLOURS: Record<string, string> = {
  planning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ordered:
    "bg-brand-blue-100 text-brand-blue-800 dark:bg-brand-blue-900/40 dark:text-brand-blue-200",
  received: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};
