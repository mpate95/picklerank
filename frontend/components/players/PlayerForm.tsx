"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function PlayerForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    display_name: "",
    first_name: "",
    last_name: "",
    email: "",
  });

  const mutation = useMutation({
    mutationFn: api.createPlayer,
    onSuccess: () => {
      setForm({ display_name: "", first_name: "", last_name: "", email: "" });
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      void queryClient.invalidateQueries({ queryKey: ["rankings", "current"] });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      display_name: form.display_name,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
    });
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Add Player</h3>
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
        {mutation.isSuccess ? <p className="text-sm text-lime">Player added.</p> : null}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Create player"}
        </Button>
      </form>
    </Card>
  );
}
