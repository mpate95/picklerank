"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Medal, PlusSquare, Users } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/players", label: "Players", icon: Users },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/matches/new", label: "New Match", icon: PlusSquare },
  { href: "/rankings", label: "Rankings", icon: Medal },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, session, logout } = useAuth();
  const visibleItems = items.filter((item) => item.href !== "/matches/new" || isAdmin);

  return (
    <aside className="w-full rounded-[2rem] border border-line bg-court/80 p-5 shadow-panel md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-72">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan/70">PickleRank</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Court Control</h1>
        <p className="mt-2 text-sm text-slate-300">Track ladders, sessions, and doubles battles.</p>
      </div>
      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-lime text-slate-950"
                  : "text-slate-200 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 rounded-3xl border border-white/8 bg-slate-950/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
          {isAdmin ? "Admin mode" : "Read only"}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {isAdmin ? `Signed in as ${session.username}.` : "Public visitors can browse, but only the admin can edit."}
        </p>
        <div className="mt-4">
          {isAdmin ? (
            <Button variant="secondary" onClick={() => void logout()}>
              Log out
            </Button>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-cyan hover:text-white">
              Admin login
            </Link>
          )}
        </div>
      </div>
      <div className="mt-10 rounded-3xl border border-cyan/15 bg-slate-950/50 p-4">
        <div className="mb-3 flex items-center gap-2 text-cyan">
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Live Stack</span>
        </div>
        <p className="text-sm text-slate-300">FastAPI backend, Postgres, React Query, and Recharts wired together.</p>
      </div>
    </aside>
  );
}
