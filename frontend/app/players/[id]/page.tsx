"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { formatDate, formatPercent, formatRating } from "@/lib/formatters";
import { PlayerCard } from "@/components/players/PlayerCard";
import { Card } from "@/components/ui/Card";

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const playerId = use(params).id;
  const playerQuery = useQuery({
    queryKey: ["player", playerId],
    queryFn: () => api.getPlayer(playerId),
  });
  const statsQuery = useQuery({
    queryKey: ["stats", "player", playerId],
    queryFn: () => api.getSinglePlayerStats(playerId),
  });

  if (playerQuery.isLoading || statsQuery.isLoading) {
    return <div className="text-sm text-slate-400">Loading player profile...</div>;
  }

  if (playerQuery.error || statsQuery.error || !playerQuery.data || !statsQuery.data) {
    return <div className="text-sm text-coral">Failed to load player profile.</div>;
  }

  const player = playerQuery.data;
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <PlayerCard player={player} stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-white">Recent Form</h3>
          <div className="flex gap-2">
            {stats.recent_form.length === 0 ? <p className="text-sm text-slate-400">No matches yet.</p> : null}
            {stats.recent_form.map((result, index) => (
              <span
                key={`${result}-${index}`}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl font-semibold ${
                  result === "W" ? "bg-lime/15 text-lime" : "bg-coral/15 text-coral"
                }`}
              >
                {result}
              </span>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-slate-500">Points For</p>
              <div className="mt-1 text-xl font-semibold text-white">{stats.points_for}</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-slate-500">Points Against</p>
              <div className="mt-1 text-xl font-semibold text-white">{stats.points_against}</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-slate-500">Avg For</p>
              <div className="mt-1 text-xl font-semibold text-white">{formatRating(stats.avg_points_for)}</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-slate-500">Win %</p>
              <div className="mt-1 text-xl font-semibold text-white">{formatPercent(stats.win_percentage)}</div>
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-white">Match History</h3>
          <div className="space-y-3">
            {stats.match_history.length === 0 ? <p className="text-sm text-slate-400">No match history yet.</p> : null}
            {stats.match_history.map((match) => (
              <div key={match.match_id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{formatDate(match.session_date)}</span>
                  <span className={match.result === "W" ? "text-lime" : "text-coral"}>{match.result}</span>
                </div>
                <div className="mt-2 text-white">
                  {match.team_score} - {match.opponent_score}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
