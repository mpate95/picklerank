"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { PlayerResponse, SessionDetailResponse, TournamentNodeResponse, TournamentResponse } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TogglePill } from "@/components/ui/TogglePill";

type EntryDraft = {
  player1Id: string;
  player2Id: string;
};

const BRACKET_SECTIONS: Array<{ key: TournamentNodeResponse["bracket"]; label: string }> = [
  { key: "winners", label: "Winners bracket" },
  { key: "losers", label: "Losers bracket" },
  { key: "grand_final", label: "Grand final" },
];

function createEmptyEntries(size: number): EntryDraft[] {
  return Array.from({ length: size }, () => ({ player1Id: "", player2Id: "" }));
}

function formatTournamentFormat(value: TournamentResponse["format"]) {
  return value === "double_elimination" ? "Double elimination" : "Single elimination";
}

function getChampionEntry(tournament: TournamentResponse) {
  const grandFinal = tournament.nodes.find((node) => node.bracket === "grand_final" && node.winner_entry_id);
  if (grandFinal && grandFinal.team_1?.id === grandFinal.winner_entry_id) {
    return grandFinal.team_1;
  }
  if (grandFinal && grandFinal.team_2?.id === grandFinal.winner_entry_id) {
    return grandFinal.team_2;
  }

  const winnersNodes = [...tournament.nodes]
    .filter((node) => node.bracket === "winners" && node.winner_entry_id)
    .sort((left, right) => right.round_number - left.round_number || right.slot_number - left.slot_number);
  const finalWinnersNode = winnersNodes[0];
  if (!finalWinnersNode) {
    return null;
  }
  if (finalWinnersNode.team_1?.id === finalWinnersNode.winner_entry_id) {
    return finalWinnersNode.team_1;
  }
  if (finalWinnersNode.team_2?.id === finalWinnersNode.winner_entry_id) {
    return finalWinnersNode.team_2;
  }
  return null;
}

function groupNodesByRound(nodes: TournamentNodeResponse[]) {
  const rounds = new Map<number, TournamentNodeResponse[]>();
  for (const node of nodes) {
    const list = rounds.get(node.round_number) ?? [];
    list.push(node);
    rounds.set(node.round_number, list);
  }
  return [...rounds.entries()]
    .sort(([left], [right]) => left - right)
    .map(([round, roundNodes]) => ({
      round,
      nodes: [...roundNodes].sort((left, right) => left.slot_number - right.slot_number),
    }));
}

function formatNodeStatus(node: TournamentNodeResponse) {
  if (node.status === "completed") {
    return "Saved";
  }
  if (node.status === "ready") {
    return "Ready";
  }
  return "Pending";
}

function BracketOverview({
  tournament,
}: {
  tournament: TournamentResponse;
}) {
  return (
    <div className="mt-6 grid gap-5 rounded-3xl border border-white/5 bg-slate-950/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Bracket view</h5>
          <p className="mt-1 text-xs text-slate-500">Read-only overview of the current tournament path.</p>
        </div>
        <Badge className="border-white/10 bg-white/[0.03] text-slate-300">{formatTournamentFormat(tournament.format)}</Badge>
      </div>

      <div className="grid gap-4">
        {BRACKET_SECTIONS.map((section) => {
          const sectionNodes = tournament.nodes.filter((node) => node.bracket === section.key);
          if (sectionNodes.length === 0) {
            return null;
          }

          return (
            <div key={`overview-${section.key}`} className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{section.label}</p>
                <span className="text-xs text-slate-500">{sectionNodes.length} games</span>
              </div>
              <div className="-mx-4 overflow-x-auto px-4 pb-2">
                <div className="flex min-w-max snap-x snap-mandatory gap-4">
                  {groupNodesByRound(sectionNodes).map((round, roundIndex, rounds) => (
                    <div
                      key={`overview-${section.key}-${round.round}`}
                      className="relative w-[250px] shrink-0 snap-start rounded-2xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Round {round.round}</p>
                      <div className="grid gap-3">
                        {round.nodes.map((node) => (
                          <div key={`overview-node-${node.id}`} className="group relative rounded-2xl border border-white/5 bg-slate-950/50 p-3">
                            {roundIndex < rounds.length - 1 ? (
                              <>
                                <div className="pointer-events-none absolute right-[-13px] top-1/2 hidden h-px w-3 -translate-y-1/2 bg-white/10 lg:block" />
                                <div className="pointer-events-none absolute right-[-16px] top-1/2 hidden h-2 w-2 -translate-y-1/2 rotate-45 border-r border-t border-white/10 lg:block" />
                              </>
                            ) : null}
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-slate-400">Game {node.slot_number}</span>
                              <Badge className={node.status === "completed" ? "border-lime/20 bg-lime/10 text-lime" : "text-slate-300"}>
                                {formatNodeStatus(node)}
                              </Badge>
                            </div>
                            <div className="grid gap-2">
                              {[
                                { team: node.team_1, score: node.team_1_score, isWinner: node.winner_entry_id === node.team_1?.id },
                                { team: node.team_2, score: node.team_2_score, isWinner: node.winner_entry_id === node.team_2?.id },
                              ].map((slot, index) => (
                                <div
                                  key={`${node.id}-${index}`}
                                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                                    slot.isWinner ? "border-lime/30 bg-lime/10" : "border-white/5 bg-white/[0.02]"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    {slot.team ? (
                                      <p className="line-clamp-2 text-sm text-white">
                                        <span className="text-slate-400">#{slot.team.seed}</span>{" "}
                                        {slot.team.player_1.display_name} / {slot.team.player_2.display_name}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-slate-500">Waiting for matchup</p>
                                    )}
                                  </div>
                                  <span className="shrink-0 text-sm font-semibold text-white">{slot.score ?? "-"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TournamentGameCard({
  tournamentId,
  node,
  editable,
  onTournamentUpdated,
}: {
  tournamentId: string;
  node: TournamentNodeResponse;
  editable: boolean;
  onTournamentUpdated: (tournament: TournamentResponse) => void;
}) {
  const [team1Score, setTeam1Score] = useState(node.team_1_score?.toString() ?? "");
  const [team2Score, setTeam2Score] = useState(node.team_2_score?.toString() ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const mutation = useMutation({
    mutationFn: (payload: { team_1_score: number | null; team_2_score: number | null }) =>
      api.updateTournamentNodeScore(tournamentId, node.id, payload),
    onSuccess: (updatedTournament) => {
      setSaveState("saved");
      onTournamentUpdated(updatedTournament);
    },
    onError: () => {
      setSaveState("error");
    },
  });

  useEffect(() => {
    setTeam1Score(node.team_1_score?.toString() ?? "");
    setTeam2Score(node.team_2_score?.toString() ?? "");
    setSaveState("idle");
  }, [node.id, node.team_1_score, node.team_2_score, node.team_1?.id, node.team_2?.id]);

  const parsedTeam1Score = team1Score === "" ? null : Number.parseInt(team1Score, 10);
  const parsedTeam2Score = team2Score === "" ? null : Number.parseInt(team2Score, 10);
  const scoresAreValid =
    parsedTeam1Score !== null &&
    parsedTeam2Score !== null &&
    Number.isInteger(parsedTeam1Score) &&
    parsedTeam1Score >= 0 &&
    Number.isInteger(parsedTeam2Score) &&
    parsedTeam2Score >= 0 &&
    parsedTeam1Score !== parsedTeam2Score;
  const hasPersistedScores = node.team_1_score !== null && node.team_2_score !== null;
  const hasPendingScoreChange =
    scoresAreValid &&
    (parsedTeam1Score !== node.team_1_score || parsedTeam2Score !== node.team_2_score);
  const canScore = editable && node.team_1 !== null && node.team_2 !== null;

  useEffect(() => {
    if (!canScore || !hasPendingScoreChange || mutation.isPending) {
      return;
    }
    setSaveState("saving");
    const timeoutId = window.setTimeout(() => {
      mutation.mutate({
        team_1_score: parsedTeam1Score,
        team_2_score: parsedTeam2Score,
      });
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [canScore, hasPendingScoreChange, mutation, mutation.isPending, parsedTeam1Score, parsedTeam2Score]);

  const saveMessage =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : null;

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">Game {node.slot_number}</span>
        <div className="flex items-center gap-2">
          <Badge className={node.status === "completed" ? "border-lime/20 bg-lime/10 text-lime" : ""}>
            {formatNodeStatus(node)}
          </Badge>
          {saveMessage ? <span className={`text-xs ${saveState === "error" ? "text-coral" : "text-slate-400"}`}>{saveMessage}</span> : null}
        </div>
      </div>

      {node.team_1 && node.team_2 ? (
        <div className="mt-4 grid gap-3">
          {[
            { key: "team1", team: node.team_1, value: team1Score, setValue: setTeam1Score, isWinner: node.winner_entry_id === node.team_1.id },
            { key: "team2", team: node.team_2, value: team2Score, setValue: setTeam2Score, isWinner: node.winner_entry_id === node.team_2.id },
          ].map((slot) => (
            <div
              key={slot.key}
              className={`grid grid-cols-[minmax(0,1fr)_92px] items-center gap-3 rounded-2xl border px-3 py-3 ${
                slot.isWinner ? "border-lime/30 bg-lime/10" : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">
                  Seed {slot.team.seed}: {slot.team.player_1.display_name} / {slot.team.player_2.display_name}
                </div>
              </div>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={slot.value}
                onChange={(event) => {
                  setSaveState("idle");
                  slot.setValue(event.target.value);
                }}
                disabled={!canScore}
                className="h-12 text-center text-base font-semibold"
              />
            </div>
          ))}
          {!scoresAreValid && team1Score !== "" && team2Score !== "" ? (
            <p className="text-sm text-coral">Enter two different non-negative scores.</p>
          ) : null}
          {canScore && (hasPersistedScores || team1Score !== "" || team2Score !== "") ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="px-0 text-coral hover:bg-transparent hover:text-white"
                disabled={mutation.isPending}
                onClick={() => {
                  setTeam1Score("");
                  setTeam2Score("");
                  setSaveState("saving");
                  mutation.mutate({ team_1_score: null, team_2_score: null });
                }}
              >
                Clear result
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
          Waiting for earlier games to determine the matchup.
        </div>
      )}
    </div>
  );
}

export function SessionTournamentPanel({
  sessionId,
  tournaments,
}: {
  sessionId: string;
  tournaments: TournamentResponse[];
}) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(tournaments.length === 0);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<TournamentResponse["format"]>("single_elimination");
  const [bracketSize, setBracketSize] = useState(4);
  const [entries, setEntries] = useState<EntryDraft[]>(() => createEmptyEntries(4));

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => api.getPlayers(true),
    enabled: isAdmin,
  });

  const availableBracketSizes = format === "double_elimination" ? [4, 8] : [2, 4, 8];

  useEffect(() => {
    if (!availableBracketSizes.includes(bracketSize)) {
      const nextSize = availableBracketSizes[0];
      setBracketSize(nextSize);
      setEntries(createEmptyEntries(nextSize));
    }
  }, [availableBracketSizes, bracketSize]);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; format: TournamentResponse["format"]; entries: EntryDraft[] }) =>
      api.createTournament(sessionId, {
        name: payload.name,
        format: payload.format,
        entries: payload.entries.map((entry, index) => ({
          seed: index + 1,
          player_1_id: entry.player1Id,
          player_2_id: entry.player2Id,
        })),
      }),
    onSuccess: () => {
      setName("");
      setFormat("single_elimination");
      setBracketSize(4);
      setEntries(createEmptyEntries(4));
      setShowForm(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTournament,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
    },
  });
  const finalizeMutation = useMutation({
    mutationFn: api.finalizeTournament,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings", "current"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["players"] }),
      ]);
    },
  });
  const revokeMutation = useMutation({
    mutationFn: api.revokeTournament,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session", sessionId] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings", "current"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["players"] }),
      ]);
    },
  });

  const activePlayers = useMemo(() => players.filter((player) => player.is_active), [players]);
  const selectedPlayerIds = useMemo(
    () => entries.flatMap((entry) => [entry.player1Id, entry.player2Id]).filter(Boolean),
    [entries],
  );
  const formIsComplete =
    name.trim().length > 0 &&
    entries.every((entry) => entry.player1Id && entry.player2Id && entry.player1Id !== entry.player2Id) &&
    new Set(selectedPlayerIds).size === selectedPlayerIds.length;

  function updateSessionTournament(updatedTournament: TournamentResponse) {
    queryClient.setQueryData<SessionDetailResponse | undefined>(["session", sessionId], (current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        tournaments: current.tournaments.map((tournament) =>
          tournament.id === updatedTournament.id ? updatedTournament : tournament,
        ),
      };
    });
  }

  function updateBracketSize(nextSize: number) {
    setBracketSize(nextSize);
    setEntries(createEmptyEntries(nextSize));
  }

  function updateEntry(index: number, slot: "player1Id" | "player2Id", value: string) {
    setEntries((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [slot]: value } : entry)),
    );
  }

  function availablePlayersFor(index: number, slot: "player1Id" | "player2Id"): PlayerResponse[] {
    const currentValue = entries[index]?.[slot] ?? "";
    const takenIds = new Set(
      entries.flatMap((entry, entryIndex) =>
        entryIndex === index
          ? [slot === "player1Id" ? entry.player2Id : entry.player1Id]
          : [entry.player1Id, entry.player2Id],
      ).filter(Boolean),
    );

    return activePlayers.filter((player) => player.id === currentValue || !takenIds.has(player.id));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formIsComplete) {
      return;
    }
    createMutation.mutate({ name: name.trim(), format, entries });
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Tournaments</h3>
          <p className="mt-1 text-sm text-slate-400">
            Draft tournaments stay separate from rankings and session matches until finalization.
          </p>
        </div>
        {isAdmin ? (
          <Button type="button" variant="secondary" onClick={() => setShowForm((current) => !current)}>
            {showForm ? "Hide draft form" : "New tournament"}
          </Button>
        ) : null}
      </div>

      {isAdmin && showForm ? (
        <form className="mt-5 grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="tournament_name">Tournament name</Label>
              <Input
                id="tournament_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Saturday Session Cup"
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
              <div>
                <Label>Format</Label>
                <div className="flex flex-wrap gap-2">
                  <TogglePill
                    type="button"
                    active={format === "single_elimination"}
                    onClick={() => setFormat("single_elimination")}
                  >
                    Single elimination
                  </TogglePill>
                  <TogglePill
                    type="button"
                    active={format === "double_elimination"}
                    onClick={() => setFormat("double_elimination")}
                  >
                    Double elimination
                  </TogglePill>
                </div>
              </div>
              <div>
                <Label htmlFor="bracket_size">Teams</Label>
                <select
                  id="bracket_size"
                  className="w-full rounded-2xl border border-line bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                  value={bracketSize}
                  onChange={(event) => updateBracketSize(Number(event.target.value))}
                >
                  {availableBracketSizes.map((size) => (
                    <option key={size} value={size}>
                      {size} teams
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {entries.map((entry, index) => (
              <div key={index} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Seed {index + 1}</span>
                  <Badge className="border-cyan/20 bg-cyan/10 text-cyan">Doubles</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`seed_${index}_player_1`}>Player 1</Label>
                    <select
                      id={`seed_${index}_player_1`}
                      className="w-full rounded-2xl border border-line bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                      value={entry.player1Id}
                      onChange={(event) => updateEntry(index, "player1Id", event.target.value)}
                    >
                      <option value="">Select player</option>
                      {availablePlayersFor(index, "player1Id").map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`seed_${index}_player_2`}>Player 2</Label>
                    <select
                      id={`seed_${index}_player_2`}
                      className="w-full rounded-2xl border border-line bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                      value={entry.player2Id}
                      onChange={(event) => updateEntry(index, "player2Id", event.target.value)}
                    >
                      <option value="">Select player</option>
                      {availablePlayersFor(index, "player2Id").map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {createMutation.error ? <p className="text-sm text-coral">{createMutation.error.message}</p> : null}
          {!formIsComplete ? (
            <p className="text-sm text-slate-400">Enter a name and fill every seed with one unique doubles team.</p>
          ) : null}
          <Button type="submit" disabled={createMutation.isPending || !formIsComplete}>
            {createMutation.isPending ? "Saving draft..." : "Create draft tournament"}
          </Button>
        </form>
      ) : null}

      <div className="mt-5 grid gap-4">
        {tournaments.length === 0 ? <p className="text-sm text-slate-400">No tournaments created for this session.</p> : null}
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            {(() => {
              const champion = getChampionEntry(tournament);
              return (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold text-white">{tournament.name}</h4>
                  <Badge className="border-lime/20 bg-lime/10 text-lime">{tournament.status}</Badge>
                  <Badge>{formatTournamentFormat(tournament.format)}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {tournament.bracket_size} teams seeded on {formatDate(tournament.created_at)}
                </p>
                {tournament.status === "finalized" ? (
                  <div className="mt-1 space-y-1 text-sm text-slate-400">
                    <p>{tournament.materialized_match_count} ranked matches materialized into the session.</p>
                    {champion ? (
                      <p className="text-slate-300">
                        Champion: Seed {champion.seed} - {champion.player_1.display_name} / {champion.player_2.display_name}
                      </p>
                    ) : null}
                    {tournament.finalized_at ? <p>Finalized on {formatDate(tournament.finalized_at)}</p> : null}
                  </div>
                ) : null}
              </div>
              {isAdmin ? (
                <div className="flex flex-wrap justify-end gap-3">
                  {tournament.status === "draft" ? (
                    <>
                      <Button
                        type="button"
                        disabled={!tournament.can_finalize || finalizeMutation.isPending}
                        onClick={() => finalizeMutation.mutate(tournament.id)}
                      >
                        {finalizeMutation.isPending ? "Finalizing..." : "Finalize"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-0 text-coral hover:bg-transparent hover:text-white"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (!window.confirm(`Delete ${tournament.name}? This removes the draft tournament and its teams.`)) {
                            return;
                          }
                          deleteMutation.mutate(tournament.id);
                        }}
                      >
                        Delete draft
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(tournament.id)}
                    >
                      {revokeMutation.isPending ? "Revoking..." : "Revoke to draft"}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
              );
            })()}
            {isAdmin && tournament.status === "draft" && !tournament.can_finalize ? (
              <p className="mt-3 text-sm text-slate-400">Score every unlocked game before finalizing this tournament.</p>
            ) : null}
            {isAdmin && tournament.status === "finalized" && !tournament.can_revoke ? (
              <p className="mt-3 text-sm text-coral">
                Revoke is blocked because newer ranked matches were added after this tournament was finalized.
              </p>
            ) : null}
            {finalizeMutation.error && finalizeMutation.variables === tournament.id ? (
              <p className="mt-3 text-sm text-coral">{finalizeMutation.error.message}</p>
            ) : null}
            {revokeMutation.error && revokeMutation.variables === tournament.id ? (
              <p className="mt-3 text-sm text-coral">{revokeMutation.error.message}</p>
            ) : null}

            <div className="mt-4 grid gap-2">
              {tournament.entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-300">Seed {entry.seed}</span>
                  <span className="text-right text-slate-100">
                    {entry.player_1.display_name} / {entry.player_2.display_name}
                  </span>
                </div>
              ))}
            </div>

            {isAdmin ? (
              <div className="mt-5 grid gap-5">
                {BRACKET_SECTIONS.map((section) => {
                  const sectionNodes = tournament.nodes.filter((node) => node.bracket === section.key);
                  if (sectionNodes.length === 0) {
                    return null;
                  }

                  return (
                    <div key={section.key} className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</h5>
                        <Badge>{sectionNodes.length} games</Badge>
                      </div>
                      {groupNodesByRound(sectionNodes).map((round) => (
                        <div key={`${section.key}-${round.round}`} className="grid gap-3">
                          <p className="text-sm font-medium text-slate-300">Round {round.round}</p>
                          <div className="grid gap-3">
                            {round.nodes.map((node) => (
                              <TournamentGameCard
                                key={node.id}
                                tournamentId={tournament.id}
                                node={node}
                                editable={tournament.status === "draft"}
                                onTournamentUpdated={updateSessionTournament}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : null}
            <BracketOverview tournament={tournament} />
          </div>
        ))}
      </div>
    </Card>
  );
}
