"use client";

import { useState } from "react";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
