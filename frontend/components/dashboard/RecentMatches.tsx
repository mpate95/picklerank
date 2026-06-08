import { DashboardSummaryResponse } from "@/lib/types";
import { formatDate } from "@/lib/formatters";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function RecentMatches({ matches }: { matches: DashboardSummaryResponse["recent_matches"] }) {
  return (
    <Card className="h-full p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Recent Matches</h3>
          <p className="mt-1 text-base text-slate-400">Latest recorded results across recent sessions.</p>
        </div>
        <Badge>{matches.length} logged</Badge>
      </div>
      <div className="space-y-3">
        {matches.length === 0 ? <p className="text-sm text-slate-400">No matches recorded yet.</p> : null}
        {matches.map((match) => (
          <div key={match.match_id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">{formatDate(match.session_date)}</div>
            <div className="flex items-center justify-between gap-4 text-[15px]">
              <div>
                <div className={`font-semibold ${match.winner_team_number === 1 ? "text-lime" : "text-white"}`}>
                  {match.team_1_names.join(" / ")}
                </div>
                <div className="mt-1 text-slate-300">{match.team_1_score}</div>
              </div>
              <span className="text-slate-500">vs</span>
              <div className="text-right">
                <div className={`font-semibold ${match.winner_team_number === 2 ? "text-lime" : "text-white"}`}>
                  {match.team_2_names.join(" / ")}
                </div>
                <div className="mt-1 text-slate-300">{match.team_2_score}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
