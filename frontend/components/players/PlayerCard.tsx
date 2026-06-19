import { ReactNode } from "react";

import { PlayerDetailStatsResponse, PlayerDetailResponse } from "@/lib/types";
import { formatPercent, formatRating } from "@/lib/formatters";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function PlayerCard({
  player,
  stats,
  actions,
  heading,
}: {
  player: PlayerDetailResponse;
  stats: PlayerDetailStatsResponse;
  actions?: ReactNode;
  heading?: ReactNode;
}) {
  const rankLabel = !player.is_active ? "Rank -" : player.current_rank !== null ? `Rank #${player.current_rank}` : "Unranked";

  return (
    <Card>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan/70">Player profile</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {heading ?? <h2 className="text-3xl font-semibold text-white">{player.display_name}</h2>}
            <Badge className={player.is_active ? "text-lime" : "text-coral"}>{player.is_active ? "Active" : "Inactive"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            <span>Rating {formatRating(player.rating)}</span>
            <span>{rankLabel}</span>
            <span>Streak {stats.current_streak}</span>
          </div>
          {player.is_active && !player.is_leaderboard_qualified ? (
            <p className="mt-3 text-sm text-slate-400">
              This player is below the leaderboard qualifier of {player.leaderboard_qualifier_min_games} games.
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[260px]">
          {actions ? <div className="sm:col-span-2">{actions}</div> : null}
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
