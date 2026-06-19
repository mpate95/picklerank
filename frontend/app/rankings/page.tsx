"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { LeaderboardSettingsCard } from "@/components/rankings/LeaderboardSettingsCard";
import { RankingsTable } from "@/components/rankings/RankingsTable";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function RankingsPage() {
  const { data: rankings = [], isLoading, error } = useQuery({
    queryKey: ["rankings", "current"],
    queryFn: api.getCurrentRankings,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings", "leaderboard"],
    queryFn: api.getLeaderboardSettings,
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Rankings"
        description="Current ladder, rating swings, and live record context."
      />
      {settingsQuery.data ? <LeaderboardSettingsCard settings={settingsQuery.data} /> : null}
      {isLoading ? <p className="text-sm text-slate-400">Loading rankings...</p> : null}
      {error || settingsQuery.error ? (
        <p className="text-sm text-coral">
          {error instanceof Error
            ? error.message
            : settingsQuery.error instanceof Error
              ? settingsQuery.error.message
              : "Failed to load rankings."}
        </p>
      ) : null}
      {!isLoading && !error ? <RankingsTable rankings={rankings} /> : null}
    </div>
  );
}
