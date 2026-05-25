"use client";

import { PlayerResponse } from "@/lib/types";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type Props = {
  title: string;
  players: PlayerResponse[];
  selectedIds: string[];
  onToggle: (playerId: string) => void;
  score: number;
  onScoreChange: (value: number) => void;
};

export function TeamSelector({ title, players, selectedIds, onToggle, score, onScoreChange }: Props) {
  return (
    <div className="rounded-3xl border border-line bg-slate-950/35 p-4">
      <h4 className="text-lg font-semibold text-white">{title}</h4>
      <div className="mt-4 grid gap-2">
        {players.map((player) => {
          const selected = selectedIds.includes(player.id);
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onToggle(player.id)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                selected
                  ? "border-lime bg-lime/10 text-lime"
                  : "border-white/10 bg-white/[0.02] text-slate-200 hover:border-cyan/50"
              }`}
            >
              {player.display_name}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <Label htmlFor={`${title}-score`}>Score</Label>
        <Input
          id={`${title}-score`}
          type="number"
          min={0}
          inputMode="numeric"
          value={score}
          onChange={(event) => onScoreChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
