"use client";

export function IcalUrlInput({ value }: { value: string }) {
  return (
    <input
      readOnly
      value={value}
      className="mt-1 w-full bg-transparent text-sm font-mono text-neutral-700 outline-none dark:text-neutral-300"
      onFocus={(e) => e.target.select()}
    />
  );
}
