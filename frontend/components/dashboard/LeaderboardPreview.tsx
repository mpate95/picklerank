"use client";

import Link from "next/link";
import { useState } from "react";

import { DashboardSummaryResponse } from "@/lib/types";
import { formatPercent, formatRating } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/utils";

type SortKey = "default" | "rating" | "streak" | "record" | "winPercentage";
type SortDirection = "desc" | "asc";

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
          "inline-flex min-h-8 items-center gap-1 py-1 font-medium whitespace-nowrap transition hover:text-white",
          isActive && "font-semibold text-white underline decoration-cyan/60 underline-offset-4",
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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
          <p className="mt-1 text-sm text-slate-400">Current player ratings and records. Tap column labels to sort.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => {
              setSortKey("default");
              setSortDirection("desc");
            }}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Reset sort
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3 pr-4 whitespace-nowrap">Rank</th>
              <th className="pb-3 pr-4 whitespace-nowrap">Player</th>
              <th className="pb-3 pr-4 whitespace-nowrap">{headerButton("Rating", "rating")}</th>
              <th className="pb-3 pr-4 whitespace-nowrap">{headerButton("Streak", "streak")}</th>
              <th className="pb-3 pr-4 whitespace-nowrap">{headerButton("Record", "record")}</th>
              <th className="pb-3 whitespace-nowrap">{headerButton("Win %", "winPercentage")}</th>
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
