"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { use } from "react";

import { api } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { useAuth } from "@/components/auth/AuthProvider";
import { SessionMatchList } from "@/components/sessions/SessionMatchList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionId = use(params).id;
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId),
  });
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (isCompleted: boolean) => api.updateSession(sessionId, { is_completed: isCompleted }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteSession(sessionId),
    onSuccess: () => {
      window.location.href = "/sessions";
    },
  });

  if (isLoading) {
    return <div className="text-sm text-slate-400">Loading session...</div>;
  }

  if (error || !data) {
    return <div className="text-sm text-coral">{error instanceof Error ? error.message : "Failed to load session."}</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan/70">Session detail</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{data.name}</h2>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-300">
          <span>{formatDate(data.session_date)}</span>
          <span>{data.location ?? "Location TBD"}</span>
          <span>{data.match_count} matches</span>
          <Badge className={data.is_completed ? "text-coral" : "text-lime"}>
            {data.is_completed ? "Completed" : "Open"}
          </Badge>
        </div>
        {data.notes ? <p className="mt-4 text-sm text-slate-300">{data.notes}</p> : null}
        {isAdmin ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(!data.is_completed)}
            >
              {data.is_completed ? "Reopen session" : "Mark completed"}
            </Button>
            <Button
              variant="ghost"
              className="text-coral hover:bg-transparent hover:text-white"
              disabled={data.match_count > 0 || deleteMutation.isPending}
              onClick={() => {
                if (!window.confirm(`Delete ${data.name}? This only works while the session has no matches.`)) {
                  return;
                }
                deleteMutation.mutate();
              }}
            >
              Delete session
            </Button>
          </div>
        ) : null}
      </Card>
      <SessionMatchList matches={data.matches} sessionId={sessionId} />
    </div>
  );
}
