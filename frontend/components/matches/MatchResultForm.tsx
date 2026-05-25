"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TeamSelector } from "@/components/matches/TeamSelector";

export function MatchResultForm() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [isRanked, setIsRanked] = useState(true);
  const [team1Ids, setTeam1Ids] = useState<string[]>([]);
  const [team2Ids, setTeam2Ids] = useState<string[]>([]);
  const [team1Score, setTeam1Score] = useState(11);
  const [team2Score, setTeam2Score] = useState(8);

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.getSessions,
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => api.getPlayers(true),
  });

  const mutation = useMutation({
    mutationFn: api.createMatch,
    onSuccess: () => {
      setTeam1Ids([]);
      setTeam2Ids([]);
      setTeam1Score(11);
      setTeam2Score(8);
      setIsRanked(true);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings", "current"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
    },
  });

  const availablePlayers = useMemo(() => players.filter((player) => player.is_active), [players]);
  const openSessions = useMemo(() => sessions.filter((session) => !session.is_completed), [sessions]);

  function toggleSelection(playerId: string, team: 1 | 2) {
    if (team === 1) {
      setTeam1Ids((current) => {
        const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
        return next.slice(0, 2);
      });
      setTeam2Ids((current) => current.filter((id) => id !== playerId));
      return;
    }

    setTeam2Ids((current) => {
      const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
      return next.slice(0, 2);
    });
    setTeam1Ids((current) => current.filter((id) => id !== playerId));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      session_id: sessionId,
      match_type: "doubles",
      is_ranked: isRanked,
      team_1: { player_ids: team1Ids, score: team1Score },
      team_2: { player_ids: team2Ids, score: team2Score },
    });
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Record Match</h3>
      <form className="mt-4 grid gap-5" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div>
            <Label htmlFor="session_id">Session</Label>
            <select
              id="session_id"
              className="w-full rounded-2xl border border-line bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              required
            >
              <option value="">Select a session</option>
              {openSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            {openSessions.length === 0 ? (
              <p className="mt-2 text-xs text-coral">No open sessions available. Reopen a completed session or create a new one.</p>
            ) : null}
          </div>
          <div>
            <Label>Match type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`flex h-[50px] items-center justify-center rounded-2xl border text-sm font-semibold ${
                  isRanked ? "border-lime bg-lime/10 text-lime" : "border-line bg-slate-950/60 text-slate-300"
                }`}
                onClick={() => setIsRanked(true)}
              >
                Ranked
              </button>
              <button
                type="button"
                className={`flex h-[50px] items-center justify-center rounded-2xl border text-sm font-semibold ${
                  !isRanked ? "border-coral bg-coral/10 text-coral" : "border-line bg-slate-950/60 text-slate-300"
                }`}
                onClick={() => setIsRanked(false)}
              >
                Unranked
              </button>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          isRanked ? "border-lime/30 bg-lime/10 text-lime" : "border-coral/30 bg-coral/10 text-coral"
        }`}>
          {isRanked
            ? "This match will update ratings and leaderboard positions."
            : "This match will be recorded for stats only and will not change ratings."}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamSelector
            title="Team 1"
            players={availablePlayers}
            selectedIds={team1Ids}
            onToggle={(playerId) => toggleSelection(playerId, 1)}
            score={team1Score}
            onScoreChange={setTeam1Score}
          />
          <TeamSelector
            title="Team 2"
            players={availablePlayers}
            selectedIds={team2Ids}
            onToggle={(playerId) => toggleSelection(playerId, 2)}
            score={team2Score}
            onScoreChange={setTeam2Score}
          />
        </div>
        {mutation.error ? <p className="text-sm text-coral">{mutation.error.message}</p> : null}
        {mutation.isSuccess ? <p className="text-sm text-lime">Match saved. Enter the next one when ready.</p> : null}
        <Button type="submit" disabled={mutation.isPending || !sessionId}>
          {mutation.isPending ? "Saving..." : `Save ${isRanked ? "ranked" : "unranked"} match`}
        </Button>
      </form>
    </Card>
  );
}
