"use client";

import { useFormStatus } from "react-dom";

type Props = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function AiSubmitButton({ idleLabel, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} ${pending ? "cursor-wait opacity-70" : ""} inline-flex items-center gap-2`}
    >
      {pending && (
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      <span>{pending ? pendingLabel : idleLabel}</span>
    </button>
  );
}
