"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardSummaryResponse } from "@/lib/types";
import { formatPercent, formatRating } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

type SortOption = "default" | "rating_desc" | "rating_asc" | "streak_desc" | "streak_asc" | "record_desc" | "record_asc" | "win_desc" | "win_asc";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "default", label: "Default" },
  { value: "rating_desc", label: "Rating high to low" },
  { value: "rating_asc", label: "Rating low to high" },
  { value: "streak_desc", label: "Streak best first" },
  { value: "streak_asc", label: "Streak worst first" },
  { value: "record_desc", label: "Record most wins" },
  { value: "record_asc", label: "Record fewest wins" },
  { value: "win_desc", label: "Win percent high to low" },
  { value: "win_asc", label: "Win percent low to high" },
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
      if (sortOption === "rating_desc") {
        return right.rating - left.rating || left.rank - right.rank;
      }
      if (sortOption === "rating_asc") {
        return left.rating - right.rating || left.rank - right.rank;
      }
      if (sortOption === "streak_desc") {
        return (
          parseStreakValue(streakByPlayerId[right.player_id]) - parseStreakValue(streakByPlayerId[left.player_id]) ||
          left.rank - right.rank
        );
      }
      if (sortOption === "streak_asc") {
        return (
          parseStreakValue(streakByPlayerId[left.player_id]) - parseStreakValue(streakByPlayerId[right.player_id]) ||
          left.rank - right.rank
        );
      }
      if (sortOption === "record_desc") {
        return right.wins - left.wins || left.losses - right.losses || left.rank - right.rank;
      }
      if (sortOption === "record_asc") {
        return left.wins - right.wins || right.losses - left.losses || left.rank - right.rank;
      }
      if (sortOption === "win_desc") {
        return right.win_percentage - left.win_percentage || right.wins - left.wins || left.rank - right.rank;
      }
      if (sortOption === "win_asc") {
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
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label htmlFor="leaderboard-sort" className="text-sm text-slate-400">
            Sort
          </label>
          <select
            id="leaderboard-sort"
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
      <div className="space-y-3 md:hidden">
        {sortedRows.map((row) => (
          <div key={row.player_id} className="rounded-2xl border border-white/5 bg-slate-950/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Rank #{row.rank}</div>
                <Link
                  href={`/players/${row.player_id}`}
                  className="mt-1 block truncate font-medium text-cyan underline decoration-cyan/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                >
                  {row.display_name}
                </Link>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Rating</div>
                <div className="text-base font-semibold text-white">{formatRating(row.rating)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Streak</div>
                <div className="mt-1 text-slate-300">{streakByPlayerId[row.player_id] ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Record</div>
                <div className="mt-1 text-slate-300">{row.wins}-{row.losses}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-500">Win %</div>
                <div className="mt-1 text-slate-300">{formatPercent(row.win_percentage)}</div>
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
