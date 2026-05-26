"use client";

import { api } from "@/lib/api";
import { MatchResponse, PlayerResponse, SessionResponse } from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildPlayersRows(players: PlayerResponse[]) {
  return players.map((player) => [
    player.id,
    player.display_name,
    player.first_name,
    player.last_name,
    player.email,
    player.is_active,
    player.rating,
  ]);
}

function buildSessionsRows(sessions: SessionResponse[]) {
  return sessions.map((session) => [
    session.id,
    session.name,
    session.session_date,
    session.location,
    session.notes,
    session.is_completed,
    session.match_count,
  ]);
}

function buildMatchesRows(matches: MatchResponse[]) {
  return matches.map((match) => [
    match.id,
    match.session_id,
    match.match_type,
    match.is_ranked,
    match.status,
    match.team_1.players.map((player) => player.display_name).join(" / "),
    match.team_1.score,
    match.team_2.players.map((player) => player.display_name).join(" / "),
    match.team_2.score,
  ]);
}

export function ExportCard() {
  async function exportPlayers() {
    const players = await api.getPlayers(false);
    downloadCsv(
      "picklerank-players.csv",
      ["id", "display_name", "first_name", "last_name", "email", "is_active", "rating"],
      buildPlayersRows(players),
    );
  }

  async function exportSessions() {
    const sessions = await api.getSessions();
    downloadCsv(
      "picklerank-sessions.csv",
      ["id", "name", "session_date", "location", "notes", "is_completed", "match_count"],
      buildSessionsRows(sessions),
    );
  }

  async function exportMatches() {
    const matches = await api.getMatches();
    downloadCsv(
      "picklerank-matches.csv",
      ["id", "session_id", "match_type", "is_ranked", "status", "team_1_players", "team_1_score", "team_2_players", "team_2_score"],
      buildMatchesRows(matches),
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Export Data</h3>
      <p className="mt-1 text-sm text-slate-400">Download roster, session, or match data as CSV for backup or offline cleanup.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => void exportPlayers()}>
          Export players
        </Button>
        <Button type="button" variant="secondary" onClick={() => void exportSessions()}>
          Export sessions
        </Button>
        <Button type="button" variant="secondary" onClick={() => void exportMatches()}>
          Export matches
        </Button>
      </div>
    </Card>
  );
}
