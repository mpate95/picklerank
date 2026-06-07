"use client";

import { TeamStatsResponse } from "@/lib/types";
import { formatPercent, formatSigned } from "@/lib/formatters";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function TeamPerformanceTable({ teams }: { teams: TeamStatsResponse[] }) {
  const rankedTeams = [...teams].sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }
    if (right.win_percentage !== left.win_percentage) {
      return right.win_percentage - left.win_percentage;
    }
    if (right.games_played !== left.games_played) {
      return right.games_played - left.games_played;
    }
    if (right.point_differential !== left.point_differential) {
      return right.point_differential - left.point_differential;
    }
    return `${left.player_1_name} ${left.player_2_name}`.localeCompare(`${right.player_1_name} ${right.player_2_name}`);
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Team Rankings</h3>
          <p className="mt-1 text-sm text-slate-400">Doubles pairings ranked by wins, win rate, volume, and point differential.</p>
        </div>
        <Badge>{rankedTeams.length} teams</Badge>
      </div>
      {rankedTeams.length === 0 ? (
        <p className="text-sm text-slate-400">No doubles team history yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3">Rank</th>
                <th className="pb-3">Team</th>
                <th className="pb-3">Record</th>
                <th className="pb-3">Win %</th>
                <th className="pb-3">Point Diff</th>
              </tr>
            </thead>
            <tbody>
              {rankedTeams.map((team, index) => (
                <tr key={`${team.player_1_id}-${team.player_2_id}`} className="border-t border-white/5">
                  <td className="py-4 text-white">{index + 1}</td>
                  <td className="py-4">
                    <div className="font-medium text-white">
                      {team.player_1_name} / {team.player_2_name}
                    </div>
                    <div className="text-xs text-slate-500">{team.games_played} matches</div>
                  </td>
                  <td className="py-4 text-slate-300">
                    {team.wins}-{team.losses}
                  </td>
                  <td className="py-4 text-slate-300">{formatPercent(team.win_percentage)}</td>
                  <td className={`py-4 ${team.point_differential >= 0 ? "text-lime" : "text-coral"}`}>
                    {formatSigned(team.point_differential)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
