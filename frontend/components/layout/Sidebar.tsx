"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Medal, Menu, PlusSquare, Settings2, Users, X } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);
  const visibleItems = items.filter((item) => item.href !== "/matches/new" || isAdmin);
  const currentItem = visibleItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-[1.6rem] border border-line bg-panel/80 px-4 py-3 backdrop-blur md:hidden">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan/70">PickleRank</p>
          <p className="mt-1 text-sm font-medium text-white">{currentItem?.label ?? "Court Control"}</p>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 text-white"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={closeMenu}
          />
          <div className="absolute inset-y-0 right-0 flex w-[86vw] max-w-sm flex-col border-l border-white/10 bg-[#0b1620] p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan/70">PickleRank</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Court Control</h2>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
                onClick={closeMenu}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-8 space-y-2">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
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

            <div className="mt-auto rounded-3xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Settings2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isAdmin ? session.username ?? "Admin" : "Viewing mode"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {isAdmin ? "Admin controls are available across the app." : "Browse freely. Editing stays behind login."}
              </p>
              <div className="mt-4">
                {isAdmin ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      void logout();
                      closeMenu();
                    }}
                  >
                    Log out
                  </Button>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="inline-flex text-sm font-semibold text-cyan hover:text-white"
                  >
                    Admin login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="hidden w-full rounded-[2rem] border border-line bg-court/80 p-5 shadow-panel md:sticky md:top-6 md:flex md:h-[calc(100vh-3rem)] md:w-72 md:flex-col">
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
        <div className="mt-auto pt-6">
          <div className="w-full rounded-3xl border border-white/8 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{isAdmin ? session.username ?? "Admin" : "Viewing mode"}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {isAdmin ? "Editing is unlocked." : "Login only if you need to manage data."}
                </p>
              </div>
              {isAdmin ? (
                <Button variant="secondary" className="shrink-0" onClick={() => void logout()}>
                  Log out
                </Button>
              ) : (
                <Link href="/login" className="shrink-0 text-sm font-semibold text-cyan hover:text-white">
                  Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
