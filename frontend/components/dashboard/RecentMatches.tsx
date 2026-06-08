import { DashboardSummaryResponse } from "@/lib/types";
import { formatDate } from "@/lib/formatters";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function RecentMatches({ matches }: { matches: DashboardSummaryResponse["recent_matches"] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Matches</h3>
        <Badge>{matches.length} logged</Badge>
      </div>
      <div className="space-y-3">
        {matches.length === 0 ? <p className="text-sm text-slate-400">No matches recorded yet.</p> : null}
        {matches.map((match) => (
          <div key={match.match_id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">{formatDate(match.session_date)}</div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-sm">
              <div className="min-w-0">
                <div className={`font-medium ${match.winner_team_number === 1 ? "text-lime" : "text-white"}`}>
                  {match.team_1_names.join(" / ")}
                </div>
                <div className="text-slate-300">{match.team_1_score}</div>
              </div>
              <span className="pt-1 text-center text-slate-500">vs</span>
              <div className="min-w-0 text-right">
                <div className={`font-medium ${match.winner_team_number === 2 ? "text-lime" : "text-white"}`}>
                  {match.team_2_names.join(" / ")}
                </div>
                <div className="text-slate-300">{match.team_2_score}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
