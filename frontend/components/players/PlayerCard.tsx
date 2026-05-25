import { PlayerDetailStatsResponse, PlayerDetailResponse } from "@/lib/types";
import { formatPercent, formatRating } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

export function PlayerCard({
  player,
  stats,
}: {
  player: PlayerDetailResponse;
  stats: PlayerDetailStatsResponse;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan/70">Player profile</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{player.display_name}</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            <span>Rating {formatRating(player.rating)}</span>
            <span>Rank #{player.current_rank ?? "-"}</span>
            <span>Streak {stats.current_streak}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Record</p>
            <div className="mt-2 text-xl font-semibold text-white">
              {stats.wins}-{stats.losses}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Win %</p>
            <div className="mt-2 text-xl font-semibold text-white">{formatPercent(stats.win_percentage)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
