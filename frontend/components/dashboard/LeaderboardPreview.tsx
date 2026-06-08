import Link from "next/link";

import { DashboardSummaryResponse } from "@/lib/types";
import { formatPercent, formatRating } from "@/lib/formatters";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function LeaderboardPreview({ rows }: { rows: DashboardSummaryResponse["leaderboard"] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
        <Badge>Live ratings</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3">Rank</th>
              <th className="pb-3">Player</th>
              <th className="pb-3">Rating</th>
              <th className="pb-3">Change</th>
              <th className="pb-3">Record</th>
              <th className="pb-3">Win %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
                <td className="py-3 text-slate-400">
                  —
                </td>
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
