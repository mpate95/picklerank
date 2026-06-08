"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import { use, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { formatDate, formatPercent, formatRating } from "@/lib/formatters";
import { useAuth } from "@/components/auth/AuthProvider";
import { PlayerCard } from "@/components/players/PlayerCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const playerId = use(params).id;
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const playerQuery = useQuery({
    queryKey: ["player", playerId],
    queryFn: () => api.getPlayer(playerId),
  });
  const statsQuery = useQuery({
    queryKey: ["stats", "player", playerId],
    queryFn: () => api.getSinglePlayerStats(playerId),
  });
  const deactivateMutation = useMutation({
    mutationFn: api.deactivatePlayer,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["player", playerId] }),
        queryClient.invalidateQueries({ queryKey: ["stats", "player", playerId] }),
        queryClient.invalidateQueries({ queryKey: ["stats", "players"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings", "current"] }),
      ]);
    },
  });
  const renameMutation = useMutation({
    mutationFn: (displayName: string) => api.updatePlayer(playerId, { display_name: displayName }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["player", playerId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings", "current"] }),
      ]);
      setIsEditingName(false);
    },
  });

  useEffect(() => {
    setDraftName(playerQuery.data?.display_name ?? "");
  }, [playerQuery.data?.display_name]);

  if (playerQuery.isLoading || statsQuery.isLoading) {
    return <div className="text-sm text-slate-400">Loading player profile...</div>;
  }

  if (playerQuery.error || statsQuery.error || !playerQuery.data || !statsQuery.data) {
    return <div className="text-sm text-coral">Failed to load player profile.</div>;
  }

  const player = playerQuery.data;
  const stats = statsQuery.data;

  const trimmedDraftName = draftName.trim();
  const canSaveName = trimmedDraftName.length > 0 && trimmedDraftName !== player.display_name;

  return (
    <div className="space-y-6">
      <PlayerCard
        player={player}
        stats={stats}
        heading={
          isEditingName ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="min-w-[220px] text-2xl font-semibold"
                aria-label="Player display name"
              />
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-10 rounded-full px-0 text-lime hover:bg-lime/10 hover:text-lime"
                disabled={renameMutation.isPending || !canSaveName}
                onClick={() => renameMutation.mutate(trimmedDraftName)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-10 rounded-full px-0 hover:bg-white/5"
                disabled={renameMutation.isPending}
                onClick={() => {
                  setDraftName(player.display_name);
                  setIsEditingName(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-3xl font-semibold text-white">{player.display_name}</h2>
              {isAdmin ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 rounded-full px-0 hover:bg-white/5"
                  onClick={() => setIsEditingName(true)}
                  aria-label="Edit player name"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          )
        }
        actions={
          isAdmin ? (
            <div className="space-y-2">
              {renameMutation.error ? <p className="text-sm text-coral">{renameMutation.error.message}</p> : null}
              <div className="flex justify-start sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-coral hover:bg-transparent hover:text-white"
                  disabled={!player.is_active || deactivateMutation.isPending}
                  onClick={() => {
                    if (!window.confirm(`Deactivate ${player.display_name}? They will remain in historical results.`)) {
                      return;
                    }
                    deactivateMutation.mutate(player.id);
                  }}
                >
                  {player.is_active ? "Deactivate player" : "Player inactive"}
                </Button>
              </div>
            </div>
          ) : null
        }
      />
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
