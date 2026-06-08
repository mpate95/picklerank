"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminNotice } from "@/components/auth/AdminNotice";
import { ExportCard } from "@/components/players/ExportCard";
import { PlayerForm } from "@/components/players/PlayerForm";
import { PlayerTable } from "@/components/players/PlayerTable";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function PlayersPage() {
  const { isAdmin } = useAuth();
  const { data: players = [], isLoading, error } = useQuery({
    queryKey: ["players"],
    queryFn: () => api.getPlayers(false),
  });
  const statsQuery = useQuery({
    queryKey: ["stats", "players"],
    queryFn: api.getPlayerStats,
  });
  const statsByPlayerId = useMemo(
    () => Object.fromEntries((statsQuery.data ?? []).map((row) => [row.player_id, row])),
    [statsQuery.data],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <SectionHeading title="Players" description="Manage your league roster and current starting ratings." />
        {isLoading || statsQuery.isLoading ? <p className="text-sm text-slate-400">Loading players...</p> : null}
        {error || statsQuery.error ? <p className="text-sm text-coral">{error instanceof Error ? error.message : "Failed to load players."}</p> : null}
        {!isLoading && !error && !statsQuery.isLoading && !statsQuery.error ? (
          <PlayerTable players={players} statsByPlayerId={statsByPlayerId} />
        ) : null}
      </div>
      <div className="space-y-6 xl:pt-14">
        {isAdmin ? (
          <>
            <PlayerForm />
            <ExportCard />
          </>
        ) : (
          <AdminNotice title="Roster changes are admin only" />
        )}
      </div>
    </div>
  );
}
