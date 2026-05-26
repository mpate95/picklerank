"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { formatRating } from "@/lib/formatters";
import { PlayerResponse } from "@/lib/types";

import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function PlayerTable({
  players,
  onEdit,
}: {
  players: PlayerResponse[];
  onEdit?: (player: PlayerResponse) => void;
}) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const deactivateMutation = useMutation({
    mutationFn: api.deactivatePlayer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      void queryClient.invalidateQueries({ queryKey: ["rankings", "current"] });
      void queryClient.invalidateQueries({ queryKey: ["player"] });
    },
  });

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3">Player</th>
              <th className="pb-3">Rating</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Profile</th>
              {isAdmin ? <th className="pb-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-white/5">
                <td className="py-3 font-medium text-white">{player.display_name}</td>
                <td className="py-3 text-slate-200">{formatRating(player.rating)}</td>
                <td className="py-3">
                  <Badge className={player.is_active ? "text-lime" : "text-coral"}>{player.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="py-3">
                  <Link href={`/players/${player.id}`} className="text-cyan hover:text-white">
                    View
                  </Link>
                </td>
                {isAdmin ? (
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" className="px-0 hover:bg-transparent hover:text-white" onClick={() => onEdit?.(player)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-0 text-coral hover:bg-transparent hover:text-white"
                        disabled={!player.is_active || deactivateMutation.isPending}
                        onClick={() => {
                          if (!window.confirm(`Deactivate ${player.display_name}? They will remain in historical results.`)) {
                            return;
                          }
                          deactivateMutation.mutate(player.id);
                        }}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
