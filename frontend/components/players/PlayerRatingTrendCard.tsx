"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PlayerDetailStatsResponse } from "@/lib/types";
import { formatDate, formatRating, formatSigned } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

type ChartRow = {
  label: string;
  sessionLabel: string;
  rating: number;
  ratingChange: number;
};

export function PlayerRatingTrendCard({
  playerName,
  history,
}: {
  playerName: string;
  history: PlayerDetailStatsResponse["rating_history"];
}) {
  const points: ChartRow[] = history.map((point, index) => ({
    label: index === 0 ? "Start" : `Match ${index}`,
    sessionLabel: index === 0 ? "Starting rating" : formatDate(point.date),
    rating: point.rating,
    ratingChange: point.rating_change,
  }));

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Rating Trend</h3>
        <p className="mt-1 text-sm text-slate-400">Match-to-match rating movement for {playerName}.</p>
      </div>
      <div className="h-80">
        {history.length <= 1 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No rating history yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: "#8aa1b4", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8aa1b4", fontSize: 12 }} />
              <Tooltip
                labelFormatter={(_, payload) => String(payload?.[0]?.payload?.sessionLabel ?? "")}
                formatter={(value, name, item) => {
                  if (name === "rating") {
                    return [formatRating(Number(value ?? 0)), "Rating"];
                  }
                  return [formatSigned(Number(item.payload.ratingChange ?? 0)), "Match change"];
                }}
                contentStyle={{ backgroundColor: "#10202d", border: "1px solid #1f3547", borderRadius: 16 }}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#79f2ff"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
