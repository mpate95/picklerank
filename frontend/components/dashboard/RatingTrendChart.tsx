"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardSummaryResponse } from "@/lib/types";
import { formatDate, formatRating } from "@/lib/formatters";

import { Card } from "@/components/ui/Card";

export function RatingTrendChart({ trends }: { trends: DashboardSummaryResponse["rating_trends"] }) {
  const points = useMemo(() => {
    const dates = Array.from(
      new Set(
        trends.flatMap((trend) => trend.points.map((point) => point.date)),
      ),
    ).sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    return dates.map((date) => {
      const row: Record<string, number | string> = {
        date,
        label: date.slice(0, 10),
      };

      for (const trend of trends) {
        const currentPoint = trend.points.find((point) => point.date === date);
        if (currentPoint) {
          row[trend.display_name] = currentPoint.rating;
          continue;
        }

        const previousPoints = trend.points.filter(
          (point) => new Date(point.date).getTime() <= new Date(date).getTime(),
        );
        if (previousPoints.length > 0) {
          row[trend.display_name] = previousPoints[previousPoints.length - 1].rating;
        }
      }

      return row;
    });
  }, [trends]);

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Rating Trends</h3>
        <p className="mt-1 text-sm text-slate-400">Historical rating movement across active players.</p>
      </div>
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
                labelFormatter={(value) => formatDate(String(value))}
                formatter={(value, name) => [formatRating(Number(value ?? 0)), String(name)]}
                contentStyle={{ backgroundColor: "#10202d", border: "1px solid #1f3547", borderRadius: 16 }}
              />
              {trends.slice(0, 4).map((trend, index) => (
                <Line
                  key={trend.player_id}
                  type="monotone"
                  dataKey={trend.display_name}
                  stroke={["#d6ff6b", "#79f2ff", "#ff8a5b", "#f97316"][index % 4]}
                  strokeWidth={2.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
