import {
  AuthLoginInput,
  AuthLoginResponse,
  AuthSessionResponse,
  CreateMatchInput,
  CreatePlayerInput,
  CreateSessionInput,
  CurrentRankingResponse,
  DashboardSummaryResponse,
  LeaderboardSettingsResponse,
  MatchResponse,
  PlayerDetailResponse,
  PlayerDetailStatsResponse,
  PlayerResponse,
  PlayerStatsResponse,
  PlayerRatingTrendResponse,
  SessionDetailResponse,
  SessionResponse,
  TeamStatsResponse,
  UpdatePlayerInput,
} from "@/lib/types";

const API_BASE_PATH = "/api";
const CSRF_HEADER_NAME = "X-CSRF-Token";
let csrfToken: string | null = null;

export function setCsrfToken(nextCsrfToken: string | null) {
  csrfToken = nextCsrfToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const method = (init?.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getAuthSession: () => request<AuthSessionResponse>("/auth/session"),
  login: (payload: AuthLoginInput) =>
    request<AuthLoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  getDashboardSummary: () => request<DashboardSummaryResponse>("/dashboard/summary"),
  getPlayers: (activeOnly = false) => request<PlayerResponse[]>(`/players?active_only=${activeOnly ? "true" : "false"}`),
  getPlayer: (playerId: string) => request<PlayerDetailResponse>(`/players/${playerId}`),
  createPlayer: (payload: CreatePlayerInput) =>
    request<PlayerResponse>("/players", { method: "POST", body: JSON.stringify(payload) }),
  updatePlayer: (playerId: string, payload: UpdatePlayerInput) =>
    request<PlayerResponse>(`/players/${playerId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deactivatePlayer: (playerId: string) =>
    request<void>(`/players/${playerId}`, { method: "DELETE" }),
  getSessions: () => request<SessionResponse[]>("/sessions"),
  getSession: (sessionId: string) => request<SessionDetailResponse>(`/sessions/${sessionId}`),
  createSession: (payload: CreateSessionInput) =>
    request<SessionResponse>("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  updateSession: (sessionId: string, payload: Partial<CreateSessionInput>) =>
    request<SessionResponse>(`/sessions/${sessionId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSession: (sessionId: string) =>
    request<void>(`/sessions/${sessionId}`, { method: "DELETE" }),
  getMatches: (params?: { sessionId?: string; playerId?: string; rankedOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.sessionId) {
      searchParams.set("session_id", params.sessionId);
    }
    if (params?.playerId) {
      searchParams.set("player_id", params.playerId);
    }
    if (params?.rankedOnly) {
      searchParams.set("ranked_only", "true");
    }
    const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
    return request<MatchResponse[]>(`/matches${suffix}`);
  },
  createMatch: (payload: CreateMatchInput) =>
    request<MatchResponse>("/matches", { method: "POST", body: JSON.stringify(payload) }),
  voidMatch: (matchId: string) =>
    request<MatchResponse>(`/matches/${matchId}`, { method: "DELETE" }),
  getCurrentRankings: () => request<CurrentRankingResponse[]>("/rankings/current"),
  getLeaderboardSettings: () => request<LeaderboardSettingsResponse>("/settings/leaderboard"),
  updateLeaderboardSettings: (payload: LeaderboardSettingsResponse) =>
    request<LeaderboardSettingsResponse>("/settings/leaderboard", { method: "PATCH", body: JSON.stringify(payload) }),
  getRatingHistory: (playerId: string) => request(`/rankings/history/${playerId}`),
  getAllRatingHistory: () => request<PlayerRatingTrendResponse[]>("/rankings/history"),
  getPlayerStats: () => request<PlayerStatsResponse[]>("/stats/players"),
  getSinglePlayerStats: (playerId: string) => request<PlayerDetailStatsResponse>(`/stats/players/${playerId}`),
  getTeamStats: () => request<TeamStatsResponse[]>("/stats/teams"),
};
