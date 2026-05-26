"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { MatchResponse } from "@/lib/types";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function SessionMatchList({ matches, sessionId }: { matches: MatchResponse[]; sessionId: string }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const voidMutation = useMutation({
    mutationFn: api.voidMatch,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings", "current"] }),
        queryClient.invalidateQueries({ queryKey: ["players"] }),
      ]);
    },
  });

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-white">Session Matches</h3>
      <div className="space-y-3">
        {matches.length === 0 ? <p className="text-sm text-slate-400">No matches logged yet.</p> : null}
        {matches.map((match) => (
          <div key={match.id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
              <span>{match.is_ranked ? "Ranked" : "Unranked"}</span>
              <span>{match.status}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <div className={match.team_1.is_winner ? "text-lime" : "text-white"}>
                <div className="font-medium">{match.team_1.players.map((player) => player.display_name).join(" / ")}</div>
                <div>{match.team_1.score}</div>
              </div>
              <span className="text-slate-500">vs</span>
              <div className={`text-right ${match.team_2.is_winner ? "text-lime" : "text-white"}`}>
                <div className="font-medium">{match.team_2.players.map((player) => player.display_name).join(" / ")}</div>
                <div>{match.team_2.score}</div>
              </div>
            </div>
            {isAdmin ? (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  className="px-0 text-coral hover:bg-transparent hover:text-white"
                  disabled={match.status === "voided" || voidMutation.isPending}
                  onClick={() => {
                    if (!window.confirm("Delete this match? Ranked results may affect ratings and only eligible matches can be voided.")) {
                      return;
                    }
                    voidMutation.mutate(match.id);
                  }}
                >
                  {match.status === "voided" ? "Voided" : "Delete match"}
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
