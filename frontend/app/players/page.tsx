"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/lib/api";
import { PlayerResponse } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminNotice } from "@/components/auth/AdminNotice";
import { ExportCard } from "@/components/players/ExportCard";
import { PlayerForm } from "@/components/players/PlayerForm";
import { PlayerTable } from "@/components/players/PlayerTable";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function PlayersPage() {
  const { isAdmin } = useAuth();
  const [editingPlayer, setEditingPlayer] = useState<PlayerResponse | null>(null);
  const { data: players = [], isLoading, error } = useQuery({
    queryKey: ["players"],
    queryFn: () => api.getPlayers(false),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <SectionHeading title="Players" description="Manage your league roster and current starting ratings." />
        {isLoading ? <p className="text-sm text-slate-400">Loading players...</p> : null}
        {error ? <p className="text-sm text-coral">{error instanceof Error ? error.message : "Failed to load players."}</p> : null}
        {!isLoading && !error ? <PlayerTable players={players} onEdit={setEditingPlayer} /> : null}
      </div>
      <div className="space-y-6 xl:pt-14">
        {isAdmin ? (
          <>
            <PlayerForm player={editingPlayer} onCancel={() => setEditingPlayer(null)} />
            <ExportCard />
          </>
        ) : (
          <AdminNotice title="Roster changes are admin only" />
        )}
      </div>
    </div>
  );
}
