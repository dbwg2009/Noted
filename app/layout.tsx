import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noted",
  description: "Personal birthday tracking and gift planning.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen bg-white dark:bg-neutral-950">
        <Nav />
        {children}
      </body>
    </html>
  );
}
