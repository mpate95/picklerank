"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { RankingsTable } from "@/components/rankings/RankingsTable";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function RankingsPage() {
  const { data: rankings = [], isLoading, error } = useQuery({
    queryKey: ["rankings", "current"],
    queryFn: api.getCurrentRankings,
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Rankings"
        description="Current ladder, rating swings, and live record context."
      />
      {isLoading ? <p className="text-sm text-slate-400">Loading rankings...</p> : null}
      {error ? <p className="text-sm text-coral">{error instanceof Error ? error.message : "Failed to load rankings."}</p> : null}
      {!isLoading && !error ? <RankingsTable rankings={rankings} /> : null}
    </div>
  );
}
