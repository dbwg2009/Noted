"use client";
import type { ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<"form">, "action"> & {
  action: (formData: FormData) => Promise<void>;
};

export function ActionForm({ action, children, ...props }: Props) {
  return (
    <form {...props} action={(fd) => { void action(fd); }}>
      {children}
    </form>
  );
}
