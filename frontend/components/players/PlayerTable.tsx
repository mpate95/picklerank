"use client";

import Link from "next/link";

import { formatRating } from "@/lib/formatters";
import { PlayerResponse, PlayerStatsResponse } from "@/lib/types";

import { Card } from "@/components/ui/Card";

export function PlayerTable({
  players,
  statsByPlayerId,
}: {
  players: PlayerResponse[];
  statsByPlayerId: Record<string, PlayerStatsResponse | undefined>;
}) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3">Player</th>
              <th className="pb-3">Rating</th>
              <th className="pb-3">Record</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const stats = statsByPlayerId[player.id];

              return (
                <tr key={player.id} className="border-t border-white/5">
                  <td className="py-3 font-medium">
                    <Link href={`/players/${player.id}`} className="text-white transition hover:text-cyan">
                      {player.display_name}
                    </Link>
                  </td>
                  <td className="py-3 text-slate-200">{formatRating(player.rating)}</td>
                  <td className="py-3 text-slate-300">{stats ? `${stats.wins}-${stats.losses}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
