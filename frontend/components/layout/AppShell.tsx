import { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 md:px-6">
      <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0">
          <Header />
          {children}
        </main>
      </div>
    </div>
  );
}
