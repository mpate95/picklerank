"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { PlayerResponse } from "@/lib/types";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type PlayerFormProps = {
  player?: PlayerResponse | null;
  onCancel?: () => void;
};

const emptyForm = {
  display_name: "",
  first_name: "",
  last_name: "",
  email: "",
};

export function PlayerForm({ player, onCancel }: PlayerFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(
      player
        ? {
            display_name: player.display_name,
            first_name: player.first_name ?? "",
            last_name: player.last_name ?? "",
            email: player.email ?? "",
          }
        : emptyForm,
    );
  }, [player]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        display_name: form.display_name,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
      };
      if (player) {
        return api.updatePlayer(player.id, payload);
      }
      return api.createPlayer(payload);
    },
    onSuccess: () => {
      setForm(emptyForm);
      onCancel?.();
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      if (player) {
        void queryClient.invalidateQueries({ queryKey: ["player", player.id] });
      }
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      void queryClient.invalidateQueries({ queryKey: ["rankings", "current"] });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{player ? "Edit Player" : "Add Player"}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {player ? "Update roster details without changing historical match data." : "Add a new player with a 1000 starting rating."}
          </p>
        </div>
        {player && onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
      <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            value={form.display_name}
            onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </div>
        {mutation.error ? <p className="text-sm text-coral">{mutation.error.message}</p> : null}
        {mutation.isSuccess ? <p className="text-sm text-lime">{player ? "Player updated." : "Player added."}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : player ? "Save changes" : "Create player"}
          </Button>
          {player && onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Keep original
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
