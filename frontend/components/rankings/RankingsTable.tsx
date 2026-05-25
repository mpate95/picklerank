import { CurrentRankingResponse } from "@/lib/types";
import { formatPercent, formatRating, formatSigned } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

export function RankingsTable({ rankings }: { rankings: CurrentRankingResponse[] }) {
  return (
    <Card>
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
            {rankings.map((row) => (
              <tr key={row.player_id} className="border-t border-white/5">
                <td className="py-4 text-white">{row.rank}</td>
                <td className="py-4 font-medium text-white">{row.display_name}</td>
                <td className="py-4 text-white">{formatRating(row.rating)}</td>
                <td className={`py-4 ${row.rating_change_last_session >= 0 ? "text-lime" : "text-coral"}`}>
                  {formatSigned(row.rating_change_last_session)}
                </td>
                <td className="py-4 text-slate-300">{row.wins}-{row.losses}</td>
                <td className="py-4 text-slate-300">{formatPercent(row.win_percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
