"use client";

import { useState } from "react";

import { TeamStatsResponse } from "@/lib/types";
import { formatPercent } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/utils";

type SortKey = "default" | "record" | "winPercentage" | "streak";
type SortDirection = "desc" | "asc";

const SORT_LABELS: Record<SortKey, string> = {
  default: "Team rank",
  record: "Record",
  winPercentage: "Win %",
  streak: "Streak",
};

function parseStreakValue(streak: string | undefined) {
  if (!streak || streak === "-") {
    return 0;
  }

  const kind = streak[0];
  const count = Number(streak.slice(1)) || 0;
  if (kind === "W") {
    return count;
  }
  if (kind === "L") {
    return -count;
  }
  return 0;
}

export function TeamPerformanceTable({ teams }: { teams: TeamStatsResponse[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const sortSummary =
    sortKey === "default" ? "Default ranking" : `${SORT_LABELS[sortKey]} ${sortDirection === "desc" ? "high to low" : "low to high"}`;

  const sortedTeams = [...teams].sort((left, right) => {
    let result = 0;

    if (sortKey === "record") {
      result = right.wins - left.wins || left.losses - right.losses || left.games_played - right.games_played || compareTeams(left, right);
    }
    if (sortKey === "winPercentage") {
      result =
        right.win_percentage - left.win_percentage ||
        right.wins - left.wins ||
        right.games_played - left.games_played ||
        compareTeams(left, right);
    }
    if (sortKey === "streak") {
      result =
        parseStreakValue(right.current_streak) - parseStreakValue(left.current_streak) ||
        right.wins - left.wins ||
        compareTeams(left, right);
    }
    if (sortKey === "default") {
      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }
      if (right.win_percentage !== left.win_percentage) {
        return right.win_percentage - left.win_percentage;
      }
      if (right.games_played !== left.games_played) {
        return right.games_played - left.games_played;
      }
      if (right.point_differential !== left.point_differential) {
        return right.point_differential - left.point_differential;
      }
      return compareTeams(left, right);
    }

    return sortDirection === "desc" ? result : -result;
  });

  function headerButton(label: string, key: Exclude<SortKey, "default">) {
    const isActive = sortKey === key;
    const indicator = isActive ? (sortDirection === "desc" ? "↓" : "↑") : "↕";

    function handleClick() {
      if (isActive) {
        setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
        return;
      }
      setSortKey(key);
      setSortDirection("desc");
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex min-h-9 items-center gap-1 rounded-md px-1 font-medium transition hover:text-white",
          isActive && "bg-white/5 font-semibold text-white underline decoration-cyan/60 underline-offset-4",
        )}
        aria-pressed={isActive}
      >
        {label}
        <span className={cn("text-xs text-slate-500 transition", isActive && "text-cyan", !isActive && "opacity-80")}>{indicator}</span>
      </button>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Team Rankings</h3>
          <p className="mt-1 text-sm text-slate-400">Doubles pairings ranked by wins, win rate, volume, and current streak.</p>
          <p className="mt-1 text-xs text-slate-400">Tap a stat header to sort. Tap again to reverse.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[11px] font-medium text-cyan">
            {sortSummary}
          </span>
          <button
            type="button"
            onClick={() => {
              setSortKey("default");
              setSortDirection("desc");
            }}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Reset sort
          </button>
        </div>
      </div>
      {sortedTeams.length === 0 ? (
        <p className="text-sm text-slate-400">No doubles team history yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3">Rank</th>
                <th className="pb-3">Team</th>
                <th className="pb-3">{headerButton("Record", "record")}</th>
                <th className="pb-3">{headerButton("Win %", "winPercentage")}</th>
                <th className="pb-3">{headerButton("Streak", "streak")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => (
                <tr key={`${team.player_1_id}-${team.player_2_id}`} className="border-t border-white/5">
                  <td className="py-4 text-white">{index + 1}</td>
                  <td className="py-4">
                    <div className="font-medium text-white">
                      {team.player_1_name} / {team.player_2_name}
                    </div>
                    <div className="text-xs text-slate-500">{team.games_played} matches</div>
                  </td>
                  <td className="py-4 text-slate-300">
                    {team.wins}-{team.losses}
                  </td>
                  <td className="py-4 text-slate-300">{formatPercent(team.win_percentage)}</td>
                  <td className="py-4 text-slate-300">{team.current_streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function compareTeams(left: TeamStatsResponse, right: TeamStatsResponse) {
  return `${left.player_1_name} ${left.player_2_name}`.localeCompare(`${right.player_1_name} ${right.player_2_name}`);
}
