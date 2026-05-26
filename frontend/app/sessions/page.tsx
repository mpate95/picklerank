"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminNotice } from "@/components/auth/AdminNotice";
import { SessionForm } from "@/components/sessions/SessionForm";
import { SessionTable } from "@/components/sessions/SessionTable";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function SessionsPage() {
  const { isAdmin } = useAuth();
  const [showMobileForm, setShowMobileForm] = useState(false);
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.getSessions,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading title="Sessions" description="Weekly meetups, locations, and match volume." />
          {isAdmin ? (
            <Button
              type="button"
              variant="secondary"
              className="xl:hidden"
              onClick={() => setShowMobileForm((current) => !current)}
            >
              {showMobileForm ? "Hide form" : "New session"}
            </Button>
          ) : null}
        </div>
        {isAdmin && showMobileForm ? (
          <div className="mb-6 xl:hidden">
            <SessionForm />
          </div>
        ) : null}
        {isLoading ? <p className="text-sm text-slate-400">Loading sessions...</p> : null}
        {error ? <p className="text-sm text-coral">{error instanceof Error ? error.message : "Failed to load sessions."}</p> : null}
        {!isLoading && !error ? <SessionTable sessions={sessions} /> : null}
      </div>
      <div className="hidden xl:block xl:pt-14">
        {isAdmin ? <SessionForm /> : <AdminNotice title="Session management is admin only" />}
      </div>
    </div>
  );
}
