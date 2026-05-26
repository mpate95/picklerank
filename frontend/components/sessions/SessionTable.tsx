"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { SessionResponse } from "@/lib/types";

import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TogglePill } from "@/components/ui/TogglePill";

export function SessionTable({ sessions }: { sessions: SessionResponse[] }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ sessionId, isCompleted }: { sessionId: string; isCompleted: boolean }) =>
      api.updateSession(sessionId, { is_completed: isCompleted }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });

  return (
    <Card>
      <div className="space-y-3 md:hidden">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/sessions/${session.id}`} className="text-base font-medium text-white hover:text-cyan">
                  {session.name}
                </Link>
                <p className="mt-1 text-sm text-slate-400">{formatDate(session.session_date)}</p>
              </div>
              <Badge className={session.is_completed ? "text-coral" : "text-lime"}>
                {session.is_completed ? "Completed" : "Open"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Location</p>
                <p className="mt-1 text-slate-200">{session.location ?? "TBD"}</p>
              </div>
              <div>
                <p className="text-slate-500">Matches</p>
                <p className="mt-1 text-slate-200">{session.match_count}</p>
              </div>
            </div>
            {isAdmin ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <TogglePill
                  active={session.is_completed}
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ sessionId: session.id, isCompleted: !session.is_completed })
                  }
                >
                  {session.is_completed ? "Reopen" : "Complete"}
                </TogglePill>
                <Button
                  variant="ghost"
                  className="px-0 text-coral hover:bg-transparent hover:text-white"
                  disabled={session.match_count > 0 || deleteMutation.isPending}
                  onClick={() => {
                    if (!window.confirm(`Delete ${session.name}? This only works while the session has no matches.`)) {
                      return;
                    }
                    deleteMutation.mutate(session.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-3">Session</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Location</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Matches</th>
              {isAdmin ? <th className="pb-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-t border-white/5">
                <td className="py-3 font-medium text-white">
                  <Link href={`/sessions/${session.id}`} className="hover:text-cyan">
                    {session.name}
                  </Link>
                </td>
                <td className="py-3 text-slate-300">{formatDate(session.session_date)}</td>
                <td className="py-3 text-slate-300">{session.location ?? "TBD"}</td>
                <td className="py-3">
                  <Badge className={session.is_completed ? "text-coral" : "text-lime"}>
                    {session.is_completed ? "Completed" : "Open"}
                  </Badge>
                </td>
                <td className="py-3 text-slate-300">{session.match_count}</td>
                {isAdmin ? (
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <TogglePill
                        active={session.is_completed}
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({ sessionId: session.id, isCompleted: !session.is_completed })
                        }
                      >
                        {session.is_completed ? "Reopen" : "Complete"}
                      </TogglePill>
                      <Button
                        variant="ghost"
                        className="px-0 text-coral hover:bg-transparent hover:text-white"
                        disabled={session.match_count > 0 || deleteMutation.isPending}
                        onClick={() => {
                          if (!window.confirm(`Delete ${session.name}? This only works while the session has no matches.`)) {
                            return;
                          }
                          deleteMutation.mutate(session.id);
                        }}
                      >
                        Delete
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
