"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { formatPercent, formatRating, formatSigned } from "@/lib/formatters";
import { CurrentRankingResponse, PlayerStatsResponse } from "@/lib/types";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { LeaderboardPreview } from "@/components/dashboard/LeaderboardPreview";
import { RatingTrendChart } from "@/components/dashboard/RatingTrendChart";
import { RecentMatches } from "@/components/dashboard/RecentMatches";
import { SectionHeading } from "@/components/ui/SectionHeading";

function joinNames(rows: Array<{ display_name: string }>) {
  return rows.map((row) => row.display_name).join(", ");
}

function topRatedRows(rows: CurrentRankingResponse[]) {
  if (rows.length === 0) {
    return [];
  }
  const topRating = rows[0].rating;
  return rows.filter((row) => row.rating === topRating);
}

function biggestMoverRows(rows: CurrentRankingResponse[]) {
  const maxDelta = Math.max(...rows.map((row) => Math.abs(row.rating_change_last_session)), 0);
  if (maxDelta === 0) {
    return [];
  }
  return rows.filter((row) => Math.abs(row.rating_change_last_session) === maxDelta);
}

function bestWinRateRows(rows: CurrentRankingResponse[]) {
  const eligible = rows.filter((row) => row.games_played > 0);
  if (eligible.length === 0) {
    return [];
  }
  const bestRate = Math.max(...eligible.map((row) => row.win_percentage));
  return eligible.filter((row) => row.win_percentage === bestRate);
}

function mostGamesRows(rows: CurrentRankingResponse[]) {
  const eligible = rows.filter((row) => row.games_played > 0);
  if (eligible.length === 0) {
    return [];
  }
  const maxGames = Math.max(...eligible.map((row) => row.games_played));
  return eligible.filter((row) => row.games_played === maxGames);
}

function parseStreak(streak: string) {
  if (streak === "-") {
    return { kind: "-", count: 0 };
  }

  return {
    kind: streak[0] ?? "-",
    count: Number(streak.slice(1)) || 0,
  };
}

function hottestStreakRows(rows: PlayerStatsResponse[]) {
  const eligible = rows.filter((row) => parseStreak(row.current_streak).kind === "W");
  if (eligible.length === 0) {
    return [];
  }

  const maxStreak = Math.max(...eligible.map((row) => parseStreak(row.current_streak).count));
  return eligible.filter((row) => parseStreak(row.current_streak).count === maxStreak);
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: api.getDashboardSummary,
  });
  const rankingsQuery = useQuery({
    queryKey: ["rankings", "current"],
    queryFn: api.getCurrentRankings,
  });
  const statsQuery = useQuery({
    queryKey: ["stats", "players"],
    queryFn: api.getPlayerStats,
  });

  if (isLoading || rankingsQuery.isLoading || statsQuery.isLoading) {
    return <div className="text-sm text-slate-400">Loading dashboard...</div>;
  }

  if (error || rankingsQuery.error || statsQuery.error || !data || !rankingsQuery.data || !statsQuery.data) {
    return <div className="text-sm text-coral">{error instanceof Error ? error.message : "Failed to load dashboard."}</div>;
  }

  const rankings = rankingsQuery.data;
  const stats = statsQuery.data;
  const kings = topRatedRows(rankings);
  const movers = biggestMoverRows(rankings);
  const bestWinRates = bestWinRateRows(rankings);
  const hottestStreaks = hottestStreakRows(stats);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Dashboard"
        description="Track who is climbing, who is holding court, and what just happened."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          eyebrow={kings.length > 1 ? "Kings of the court" : "King of the court"}
          title={kings.length > 0 ? joinNames(kings) : "No leader yet"}
          detail={kings.length > 1 ? "Tied at the top of the ladder." : undefined}
          value={kings.length > 0 ? formatRating(kings[0].rating) : "—"}
          accent="bg-lime"
        />
        <DashboardStatCard
          eyebrow={movers.length > 1 ? "Biggest movers" : "Biggest mover"}
          title={movers.length > 0 ? joinNames(movers) : "No movement yet"}
          detail={movers.length > 1 ? "Multiple players moved the same amount." : undefined}
          value={movers.length > 0 ? formatSigned(movers[0].rating_change_last_session) : "—"}
          accent="bg-cyan"
        />
        <DashboardStatCard
          eyebrow={bestWinRates.length > 1 ? "Best win rates" : "Best win rate"}
          title={bestWinRates.length > 0 ? joinNames(bestWinRates) : "No games yet"}
          detail={bestWinRates.length > 1 ? "Players currently tied on win percentage." : undefined}
          value={bestWinRates.length > 0 ? formatPercent(bestWinRates[0].win_percentage) : "—"}
          accent="bg-coral"
        />
        <DashboardStatCard
          eyebrow={hottestStreaks.length > 1 ? "Hottest streaks" : "Hottest streak"}
          title={hottestStreaks.length > 0 ? joinNames(hottestStreaks) : "No streak yet"}
          detail={hottestStreaks.length > 1 ? "Multiple players are riding the same win streak." : undefined}
          value={hottestStreaks.length > 0 ? hottestStreaks[0].current_streak : "—"}
          accent="bg-white"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <LeaderboardPreview rows={data.leaderboard.slice(0, 8)} />
        <RecentMatches matches={data.recent_matches} />
      </div>
      <RatingTrendChart trends={data.rating_trends} />
    </div>
  );
}
