"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { LeaderboardSettingsResponse } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TogglePill } from "@/components/ui/TogglePill";

export function LeaderboardSettingsCard({ settings }: { settings: LeaderboardSettingsResponse }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(settings.leaderboard_qualifier_enabled);
  const [minGames, setMinGames] = useState(String(settings.leaderboard_qualifier_min_games));

  useEffect(() => {
    setEnabled(settings.leaderboard_qualifier_enabled);
    setMinGames(String(settings.leaderboard_qualifier_min_games));
  }, [settings.leaderboard_qualifier_enabled, settings.leaderboard_qualifier_min_games]);

  const updateMutation = useMutation({
    mutationFn: api.updateLeaderboardSettings,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings", "leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings", "current"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["player"] }),
      ]);
    },
  });

  const parsedMinGames = Number(minGames);
  const isValidMinGames = Number.isInteger(parsedMinGames) && parsedMinGames >= 0;
  const isDirty =
    enabled !== settings.leaderboard_qualifier_enabled ||
    parsedMinGames !== settings.leaderboard_qualifier_min_games;

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Leaderboard Qualifier</h3>
          <p className="mt-2 text-sm text-slate-300">
            Ratings always update in the backend. This only controls whether players appear on leaderboard views.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TogglePill
            type="button"
            active={enabled}
            disabled={!isAdmin || updateMutation.isPending}
            onClick={() => setEnabled(true)}
          >
            Enabled
          </TogglePill>
          <TogglePill
            type="button"
            active={!enabled}
            disabled={!isAdmin || updateMutation.isPending}
            onClick={() => setEnabled(false)}
          >
            Disabled
          </TogglePill>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full max-w-xs">
          <label htmlFor="leaderboard-min-games" className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
            Minimum Games
          </label>
          <Input
            id="leaderboard-min-games"
            type="number"
            min={0}
            inputMode="numeric"
            value={minGames}
            disabled={!isAdmin || updateMutation.isPending}
            onChange={(event) => setMinGames(event.target.value)}
          />
        </div>
        {isAdmin ? (
          <Button
            type="button"
            disabled={!isValidMinGames || !isDirty || updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({
                leaderboard_qualifier_enabled: enabled,
                leaderboard_qualifier_min_games: parsedMinGames,
              })
            }
          >
            Save settings
          </Button>
        ) : null}
      </div>
      {!enabled ? <p className="mt-3 text-sm text-slate-400">Qualifier is off. All active players can appear in rankings.</p> : null}
      {enabled ? (
        <p className="mt-3 text-sm text-slate-400">
          Players need at least {isValidMinGames ? parsedMinGames : settings.leaderboard_qualifier_min_games} games to appear in rankings.
        </p>
      ) : null}
      {updateMutation.error ? <p className="mt-3 text-sm text-coral">{updateMutation.error.message}</p> : null}
    </Card>
  );
}
