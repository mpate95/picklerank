"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useMemo } from "react";

import { api, setCsrfToken } from "@/lib/api";
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
  csrf_token: null,
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
    await loginMutation.mutateAsync(payload);
    const session = await api.getAuthSession();
    if (!session.is_admin) {
      throw new Error("Login succeeded, but the admin session was not established. Verify the local or deployed API proxy is configured correctly.");
    }
    setCsrfToken(session.csrf_token ?? null);
    queryClient.setQueryData(["auth", "session"], session);
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setCsrfToken(null);
    queryClient.setQueryData(["auth", "session"], anonymousSession);
  }

  const value = useMemo<AuthContextValue>(
    () => {
      const session = sessionQuery.data ?? anonymousSession;
      setCsrfToken(session.csrf_token ?? null);
      return {
        session,
        isAdmin: Boolean(session.is_admin),
        isLoading: sessionQuery.isLoading || loginMutation.isPending,
        login,
        logout,
      };
    },
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
