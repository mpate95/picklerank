export type HealthResponse = {
  status: string;
};

export type AuthSessionResponse = {
  is_authenticated: boolean;
  is_admin: boolean;
  username: string | null;
  csrf_token?: string | null;
};

export type AuthLoginInput = {
  username: string;
  password: string;
};

export type AuthLoginResponse = {
  session: AuthSessionResponse;
};

export type PlayerResponse = {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
  rating: number;
};

export type PlayerDetailResponse = PlayerResponse & {
  current_rank: number | null;
};

export type SessionResponse = {
  id: string;
  name: string;
  session_date: string;
  location: string | null;
  notes: string | null;
  is_completed: boolean;
  match_count: number;
};

export type MatchPlayerSummary = {
  id: string;
  display_name: string;
};

export type MatchTeamResponse = {
  players: MatchPlayerSummary[];
  score: number;
  is_winner: boolean;
};

export type MatchRatingEventResponse = {
  player_id: string;
  rating_before: number;
  rating_after: number;
  rating_change: number;
};

export type MatchResponse = {
  id: string;
  session_id: string;
  match_type: string;
  is_ranked: boolean;
  status: string;
  team_1: MatchTeamResponse;
  team_2: MatchTeamResponse;
  rating_events: MatchRatingEventResponse[];
};

export type SessionDetailResponse = SessionResponse & {
  created_at: string;
  updated_at: string;
  matches: MatchResponse[];
};

export type CurrentRankingResponse = {
  rank: number;
  player_id: string;
  display_name: string;
  rating: number;
  rating_change_last_session: number;
  games_played: number;
  wins: number;
  losses: number;
  win_percentage: number;
};

export type RatingHistoryPoint = {
  date: string;
  rating: number;
  rating_change: number;
};

export type PlayerRatingTrendResponse = {
  player_id: string;
  display_name: string;
  points: RatingHistoryPoint[];
};

export type PlayerStatsResponse = {
  player_id: string;
  display_name: string;
  games_played: number;
  wins: number;
  losses: number;
  win_percentage: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  avg_points_for: number;
  avg_points_against: number;
  current_streak: string;
};

export type PlayerMatchHistoryResponse = {
  match_id: string;
  session_id: string;
  session_date: string;
  is_ranked: boolean;
  result: string;
  team_score: number;
  opponent_score: number;
};

export type PlayerDetailStatsResponse = PlayerStatsResponse & {
  recent_form: string[];
  match_history: PlayerMatchHistoryResponse[];
  rating_history: RatingHistoryPoint[];
};

export type TeamStatsResponse = {
  player_1_id: string;
  player_1_name: string;
  player_2_id: string;
  player_2_name: string;
  games_played: number;
  wins: number;
  losses: number;
  win_percentage: number;
  point_differential: number;
};

export type DashboardSummaryResponse = {
  top_player: { player_id: string; display_name: string; rating: number } | null;
  biggest_mover: { player_id: string; display_name: string; rating_change: number } | null;
  best_win_percentage: { player_id: string; display_name: string; win_percentage: number; games_played: number } | null;
  most_games_played: { player_id: string; display_name: string; games_played: number } | null;
  leaderboard: Array<{
    rank: number;
    player_id: string;
    display_name: string;
    rating: number;
    wins: number;
    losses: number;
    win_percentage: number;
  }>;
  recent_matches: Array<{
    match_id: string;
    session_date: string;
    team_1_names: string[];
    team_1_score: number;
    team_2_names: string[];
    team_2_score: number;
    winner_team_number: number;
  }>;
  rating_trends: PlayerRatingTrendResponse[];
};

export type CreatePlayerInput = {
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export type UpdatePlayerInput = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export type CreateSessionInput = {
  name: string;
  session_date: string;
  location?: string | null;
  notes?: string | null;
  is_completed?: boolean;
};

export type CreateMatchInput = {
  session_id: string;
  match_type: "doubles";
  is_ranked: boolean;
  team_1: { player_ids: string[]; score: number };
  team_2: { player_ids: string[]; score: number };
};
