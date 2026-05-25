"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useMemo } from "react";

import { api } from "@/lib/api";
import { AuthLoginInput, AuthSessionResponse } from "@/lib/types";

type AuthContextValue = {
  session: AuthSessionResponse;
  isAdmin: boolean;
  isLoading: boolean;
  login: (payload: AuthLoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const anonymousSession: AuthSessionResponse = {
  is_authenticated: false,
  is_admin: false,
  username: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth", "session"],
    queryFn: api.getAuthSession,
  });

  const loginMutation = useMutation({
    mutationFn: api.login,
  });

  async function login(payload: AuthLoginInput) {
    const result = await loginMutation.mutateAsync(payload);
    queryClient.setQueryData(["auth", "session"], result.session);
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    queryClient.setQueryData(["auth", "session"], anonymousSession);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session: sessionQuery.data ?? anonymousSession,
      isAdmin: Boolean(sessionQuery.data?.is_admin),
      isLoading: sessionQuery.isLoading || loginMutation.isPending,
      login,
      logout,
    }),
    [loginMutation.isPending, sessionQuery.data, sessionQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
