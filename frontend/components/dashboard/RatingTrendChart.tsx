"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardSummaryResponse } from "@/lib/types";
import { formatRating } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

export function RatingTrendChart({ trends }: { trends: DashboardSummaryResponse["rating_trends"] }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const { points, sortedTrends, labelByPlayerId } = useMemo(() => {
    const sortedTrends = [...trends].sort((left, right) => {
      const leftLatest = left.points[left.points.length - 1]?.rating ?? 0;
      const rightLatest = right.points[right.points.length - 1]?.rating ?? 0;
      return rightLatest - leftLatest;
    });

    const labelMap = Object.fromEntries(sortedTrends.map((trend) => [trend.player_id, trend.display_name]));
    const timeline = Array.from(new Set(sortedTrends.flatMap((trend) => trend.points.map((point) => point.date))))
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    const rows = timeline.map((date, index) => {
      const row: Record<string, number | string> = {
        date,
        label: index === 0 ? "Start" : `Match ${index}`,
      };

      for (const trend of sortedTrends) {
        const currentPoint = trend.points.find((point) => point.date === date);
        if (currentPoint) {
          row[trend.player_id] = currentPoint.rating;
          continue;
        }

        const previousPoint = [...trend.points]
          .reverse()
          .find((point) => new Date(point.date).getTime() <= new Date(date).getTime());

        if (previousPoint) {
          row[trend.player_id] = previousPoint.rating;
        }
      }

      return row;
    });

    return {
      points: rows,
      sortedTrends,
      labelByPlayerId: labelMap,
    };
  }, [trends]);

  const palette = ["#d6ff6b", "#79f2ff", "#ff8a5b", "#f97316", "#f472b6", "#60a5fa", "#34d399", "#facc15"];
  const activePlayerIds = selectedPlayerIds.length > 0 ? selectedPlayerIds : sortedTrends.map((trend) => trend.player_id);
  const visibleTrends = sortedTrends.filter((trend) => activePlayerIds.includes(trend.player_id));

  function toggleTrend(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Rating Trends</h3>
        <p className="mt-1 text-sm text-slate-400">Rating movement by match, with all active players shown.</p>
      </div>
      {visibleTrends.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {sortedTrends.map((trend, index) => {
            const isActive = activePlayerIds.includes(trend.player_id);
            return (
              <button
              key={trend.player_id}
              type="button"
              onClick={() => toggleTrend(trend.player_id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                isActive
                  ? "border-white/12 bg-slate-950/45 text-slate-100"
                  : "border-white/6 bg-slate-950/15 text-slate-500"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette[index % palette.length] }}
              />
              <span>{trend.display_name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="h-80">
        {trends.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No rating events yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: "#8aa1b4", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8aa1b4", fontSize: 12 }} />
              <Tooltip
                labelFormatter={(value) => String(value)}
                formatter={(value, name) => [
                  formatRating(Number(value ?? 0)),
                  labelByPlayerId[String(name)] ?? String(name),
                ]}
                contentStyle={{ backgroundColor: "#10202d", border: "1px solid #1f3547", borderRadius: 16 }}
              />
              {visibleTrends.map((trend, index) => (
                <Line
                  key={trend.player_id}
                  type="monotone"
                  dataKey={trend.player_id}
                  name={trend.display_name}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
