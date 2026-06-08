"use client";

import { useMemo, useState } from "react";

import { TeamStatsResponse } from "@/lib/types";
import { formatPercent } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

type SortOption =
  | "default"
  | "record_most_wins"
  | "record_fewest_wins"
  | "win_high"
  | "win_low"
  | "streak_best"
  | "streak_worst";

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
      if (sortOption === "record_most_wins") {
        return right.wins - left.wins || left.losses - right.losses || left.games_played - right.games_played || compareTeams(left, right);
      }
      if (sortOption === "record_fewest_wins") {
        return left.wins - right.wins || right.losses - left.losses || left.games_played - right.games_played || compareTeams(left, right);
      }
      if (sortOption === "win_high") {
        return right.win_percentage - left.win_percentage || right.wins - left.wins || right.games_played - left.games_played || compareTeams(left, right);
      }
      if (sortOption === "win_low") {
        return left.win_percentage - right.win_percentage || left.wins - right.wins || left.games_played - right.games_played || compareTeams(left, right);
      }
      if (sortOption === "streak_best") {
        return parseStreakValue(right.current_streak) - parseStreakValue(left.current_streak) || right.wins - left.wins || compareTeams(left, right);
      }
      if (sortOption === "streak_worst") {
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
        <div className="flex items-center gap-2">
          <label htmlFor="team-rankings-sort" className="text-sm text-slate-400">
            Sort
          </label>
          <select
            id="team-rankings-sort"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="rounded-full border border-line bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan"
          >
            <option value="default">Default rank</option>
            <option value="record_most_wins">Most wins</option>
            <option value="record_fewest_wins">Fewest wins</option>
            <option value="win_high">Highest win percent</option>
            <option value="win_low">Lowest win percent</option>
            <option value="streak_best">Best streak</option>
            <option value="streak_worst">Worst streak</option>
          </select>
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
      )}
    </Card>
  );
}
