"use client";

import Link from "next/link";
import { useState } from "react";

import { DashboardSummaryResponse } from "@/lib/types";
import { formatPercent, formatRating } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

type SortKey = "default" | "rating" | "streak" | "record" | "winPercentage";
type SortDirection = "desc" | "asc";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "default", label: "Rank" },
  { value: "rating", label: "Rating" },
  { value: "streak", label: "Streak" },
  { value: "record", label: "Record" },
  { value: "winPercentage", label: "Win %" },
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
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedRows = [...rows].sort((left, right) => {
    let result = 0;

    if (sortKey === "rating") {
      result = right.rating - left.rating || left.rank - right.rank;
    }
    if (sortKey === "streak") {
      result =
        parseStreakValue(streakByPlayerId[right.player_id]) - parseStreakValue(streakByPlayerId[left.player_id]) ||
        left.rank - right.rank;
    }
    if (sortKey === "record") {
      result = right.wins - left.wins || left.losses - right.losses || left.rank - right.rank;
    }
    if (sortKey === "winPercentage") {
      result = right.win_percentage - left.win_percentage || right.wins - left.wins || left.rank - right.rank;
    }
    if (sortKey === "default") {
      return left.rank - right.rank;
    }

    return sortDirection === "desc" ? result : -result;
  });
  return (
    <Card className="h-full p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Leaderboard</h3>
          <p className="mt-1 text-base text-slate-400">Current player ratings and records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <label className="text-sm font-medium text-slate-300" htmlFor="leaderboard-sort">
            Sort by
          </label>
          <select
            id="leaderboard-sort"
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
      <div className="overflow-x-auto">
        <table className="min-w-[42rem] text-left text-[15px]">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3 pr-4 whitespace-nowrap">Rank</th>
              <th className="pb-3 pr-4 whitespace-nowrap">Player</th>
              <th className="pb-3 pr-4 whitespace-nowrap">Rating</th>
              <th className="pb-3 pr-4 whitespace-nowrap">Streak</th>
              <th className="pb-3 pr-4 whitespace-nowrap">Record</th>
              <th className="pb-3 whitespace-nowrap">Win %</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.player_id} className="border-t border-white/5">
                <td className="py-3 pr-4 whitespace-nowrap text-white">{row.rank}</td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <Link
                    href={`/players/${row.player_id}`}
                    className="font-medium text-cyan underline decoration-cyan/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                  >
                    {row.display_name}
                  </Link>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap text-white">{formatRating(row.rating)}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-slate-400">{streakByPlayerId[row.player_id] ?? "—"}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-slate-300">{row.wins}-{row.losses}</td>
                <td className="py-3 whitespace-nowrap text-slate-300">{formatPercent(row.win_percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
