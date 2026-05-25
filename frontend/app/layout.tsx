import type { Metadata } from "next";
import { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PickleRank",
  description: "Track pickleball sessions, matches, rankings, and stats.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
