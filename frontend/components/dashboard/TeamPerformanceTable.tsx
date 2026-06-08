"use client";

import { useState } from "react";

import { TeamStatsResponse } from "@/lib/types";
import { formatPercent } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

type SortKey = "default" | "record" | "winPercentage" | "streak";
type SortDirection = "desc" | "asc";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "default", label: "Rank" },
  { value: "record", label: "Record" },
  { value: "winPercentage", label: "Win %" },
  { value: "streak", label: "Streak" },
];

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
  return (
    <Card className="h-full p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Team Rankings</h3>
          <p className="mt-1 text-base text-slate-400">Doubles pairings ranked by wins, win rate, volume, and current streak.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <label className="text-sm font-medium text-slate-300" htmlFor="team-rankings-sort">
            Sort by
          </label>
          <select
            id="team-rankings-sort"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="rounded-full border border-line bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as SortDirection)}
            className="rounded-full border border-line bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan"
          >
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSortKey("default");
              setSortDirection("desc");
            }}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Reset sort
          </button>
        </div>
      </div>
      {sortedTeams.length === 0 ? (
        <p className="text-sm text-slate-400">No doubles team history yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[40rem] text-left text-[15px]">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3 pr-4 whitespace-nowrap">Rank</th>
                <th className="pb-3 pr-4 whitespace-nowrap">Team</th>
                <th className="pb-3 pr-4 whitespace-nowrap">Record</th>
                <th className="pb-3 pr-4 whitespace-nowrap">Win %</th>
                <th className="pb-3 whitespace-nowrap">Streak</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => (
                <tr key={`${team.player_1_id}-${team.player_2_id}`} className="border-t border-white/5">
                  <td className="py-4 pr-4 whitespace-nowrap text-white">{index + 1}</td>
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <div className="font-medium text-white">
                      {team.player_1_name} / {team.player_2_name}
                    </div>
                    <div className="text-xs text-slate-500">{team.games_played} matches</div>
                  </td>
                  <td className="py-4 pr-4 whitespace-nowrap text-slate-300">
                    {team.wins}-{team.losses}
                  </td>
                  <td className="py-4 pr-4 whitespace-nowrap text-slate-300">{formatPercent(team.win_percentage)}</td>
                  <td className="py-4 whitespace-nowrap text-slate-300">{team.current_streak}</td>
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
