import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Birthday Gift Finder",
  description: "Track birthdays, capture gift ideas, and let AI find them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">
        <Nav />
        {children}
      </body>
    </html>
  );
}
