"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { api } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SessionForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    session_date: today(),
    location: "",
    notes: "",
    is_completed: false,
  });

  const mutation = useMutation({
    mutationFn: api.createSession,
    onSuccess: () => {
      setForm({ name: "", session_date: today(), location: "", notes: "", is_completed: false });
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      ...form,
      location: form.location || null,
      notes: form.notes || null,
    });
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Create Session</h3>
      <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="session_name">Session name</Label>
          <Input
            id="session_name"
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="session_date">Date</Label>
            <Input
              id="session_date"
              type="date"
              required
              value={form.session_date}
              onChange={(event) => setForm((current) => ({ ...current, session_date: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-line bg-slate-950/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Create as completed</p>
            <p className="text-xs text-slate-400">Completed sessions stay out of the match selector.</p>
          </div>
          <input
            type="checkbox"
            checked={form.is_completed}
            onChange={(event) => setForm((current) => ({ ...current, is_completed: event.target.checked }))}
          />
        </div>
        {mutation.error ? <p className="text-sm text-coral">{mutation.error.message}</p> : null}
        {mutation.isSuccess ? <p className="text-sm text-lime">Session created.</p> : null}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Create session"}
        </Button>
      </form>
    </Card>
  );
}
