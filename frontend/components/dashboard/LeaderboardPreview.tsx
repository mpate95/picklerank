"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardSummaryResponse } from "@/lib/types";
import { formatPercent, formatRating } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

type SortOption =
  | "default"
  | "rating_high"
  | "rating_low"
  | "streak_best"
  | "streak_worst"
  | "record_most_wins"
  | "record_fewest_wins"
  | "win_high"
  | "win_low";

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

export function LeaderboardPreview({
  rows,
  streakByPlayerId,
}: {
  rows: DashboardSummaryResponse["leaderboard"];
  streakByPlayerId: Record<string, string | undefined>;
}) {
  const [sortOption, setSortOption] = useState<SortOption>("default");

  const sortedRows = useMemo(() => {
    const nextRows = [...rows];

    nextRows.sort((left, right) => {
      if (sortOption === "rating_high") {
        return right.rating - left.rating || left.rank - right.rank;
      }
      if (sortOption === "rating_low") {
        return left.rating - right.rating || left.rank - right.rank;
      }
      if (sortOption === "streak_best") {
        return (
          parseStreakValue(streakByPlayerId[right.player_id]) - parseStreakValue(streakByPlayerId[left.player_id]) ||
          left.rank - right.rank
        );
      }
      if (sortOption === "streak_worst") {
        return (
          parseStreakValue(streakByPlayerId[left.player_id]) - parseStreakValue(streakByPlayerId[right.player_id]) ||
          left.rank - right.rank
        );
      }
      if (sortOption === "record_most_wins") {
        return right.wins - left.wins || left.losses - right.losses || left.rank - right.rank;
      }
      if (sortOption === "record_fewest_wins") {
        return left.wins - right.wins || right.losses - left.losses || left.rank - right.rank;
      }
      if (sortOption === "win_high") {
        return right.win_percentage - left.win_percentage || right.wins - left.wins || left.rank - right.rank;
      }
      if (sortOption === "win_low") {
        return left.win_percentage - right.win_percentage || left.wins - right.wins || left.rank - right.rank;
      }

      return left.rank - right.rank;
    });

    return nextRows;
  }, [rows, sortOption, streakByPlayerId]);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="leaderboard-sort" className="text-sm text-slate-400">
            Sort
          </label>
          <select
            id="leaderboard-sort"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="rounded-full border border-line bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan"
          >
            <option value="default">Default rank</option>
            <option value="rating_high">Highest rating</option>
            <option value="rating_low">Lowest rating</option>
            <option value="streak_best">Best streak</option>
            <option value="streak_worst">Worst streak</option>
            <option value="record_most_wins">Most wins</option>
            <option value="record_fewest_wins">Fewest wins</option>
            <option value="win_high">Highest win percent</option>
            <option value="win_low">Lowest win percent</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3">Rank</th>
              <th className="pb-3">Player</th>
              <th className="pb-3">Rating</th>
              <th className="pb-3">Streak</th>
              <th className="pb-3">Record</th>
              <th className="pb-3">Win %</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.player_id} className="border-t border-white/5">
                <td className="py-3 text-white">{row.rank}</td>
                <td className="py-3">
                  <Link
                    href={`/players/${row.player_id}`}
                    className="font-medium text-cyan underline decoration-cyan/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                  >
                    {row.display_name}
                  </Link>
                </td>
                <td className="py-3 text-white">{formatRating(row.rating)}</td>
                <td className="py-3 text-slate-400">{streakByPlayerId[row.player_id] ?? "—"}</td>
                <td className="py-3 text-slate-300">{row.wins}-{row.losses}</td>
                <td className="py-3 text-slate-300">{formatPercent(row.win_percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
