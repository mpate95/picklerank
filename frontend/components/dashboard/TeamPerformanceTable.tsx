"use client";

import { useMemo, useState } from "react";

import { TeamStatsResponse } from "@/lib/types";
import { formatPercent } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

type SortOption = "default" | "record_desc" | "record_asc" | "win_desc" | "win_asc" | "streak_desc" | "streak_asc";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "default", label: "Default" },
  { value: "record_desc", label: "Record most wins" },
  { value: "record_asc", label: "Record fewest wins" },
  { value: "win_desc", label: "Win percent high to low" },
  { value: "win_asc", label: "Win percent low to high" },
  { value: "streak_desc", label: "Streak best first" },
  { value: "streak_asc", label: "Streak worst first" },
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

function compareTeams(left: TeamStatsResponse, right: TeamStatsResponse) {
  return `${left.player_1_name} ${left.player_2_name}`.localeCompare(`${right.player_1_name} ${right.player_2_name}`);
}

export function TeamPerformanceTable({ teams }: { teams: TeamStatsResponse[] }) {
  const [sortOption, setSortOption] = useState<SortOption>("default");

  const sortedTeams = useMemo(() => {
    const nextTeams = [...teams];

    nextTeams.sort((left, right) => {
      if (sortOption === "record_desc") {
        return right.wins - left.wins || left.losses - right.losses || left.games_played - right.games_played || compareTeams(left, right);
      }
      if (sortOption === "record_asc") {
        return left.wins - right.wins || right.losses - left.losses || left.games_played - right.games_played || compareTeams(left, right);
      }
      if (sortOption === "win_desc") {
        return right.win_percentage - left.win_percentage || right.wins - left.wins || right.games_played - left.games_played || compareTeams(left, right);
      }
      if (sortOption === "win_asc") {
        return left.win_percentage - right.win_percentage || left.wins - right.wins || left.games_played - right.games_played || compareTeams(left, right);
      }
      if (sortOption === "streak_desc") {
        return parseStreakValue(right.current_streak) - parseStreakValue(left.current_streak) || right.wins - left.wins || compareTeams(left, right);
      }
      if (sortOption === "streak_asc") {
        return parseStreakValue(left.current_streak) - parseStreakValue(right.current_streak) || left.wins - right.wins || compareTeams(left, right);
      }

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
    });

    return nextTeams;
  }, [teams, sortOption]);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Team Rankings</h3>
          <p className="mt-1 text-sm text-slate-400">Doubles pairings ranked by wins, win rate, volume, and current streak.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label htmlFor="team-rankings-sort" className="text-sm text-slate-400">
            Sort
          </label>
          <select
            id="team-rankings-sort"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="min-w-0 flex-1 rounded-full border border-line bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan sm:w-auto sm:flex-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {sortedTeams.length === 0 ? (
        <p className="text-sm text-slate-400">No doubles team history yet.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sortedTeams.map((team, index) => (
              <div key={`${team.player_1_id}-${team.player_2_id}`} className="rounded-2xl border border-white/5 bg-slate-950/35 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Rank #{index + 1}</div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {team.player_1_name} / {team.player_2_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{team.games_played} matches</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Streak</div>
                    <div className="mt-1 text-sm text-slate-300">{team.current_streak}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Record</div>
                    <div className="mt-1 text-slate-300">{team.wins}-{team.losses}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Win %</div>
                    <div className="mt-1 text-slate-300">{formatPercent(team.win_percentage)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3">Rank</th>
                <th className="pb-3">Team</th>
                <th className="pb-3">Record</th>
                <th className="pb-3">Win %</th>
                <th className="pb-3">Streak</th>
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
        </>
      )}
    </Card>
  );
}
