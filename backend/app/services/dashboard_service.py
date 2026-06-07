from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories.match_repository import MatchRepository
from app.schemas.dashboard import (
    DashboardBestWinPercentageResponse,
    DashboardLeaderboardEntry,
    DashboardLastSessionMvpResponse,
    DashboardMostGamesPlayedResponse,
    DashboardRatingTrendResponse,
    DashboardRecentMatchResponse,
    DashboardSummaryResponse,
    DashboardTopPlayerResponse,
)
from app.services.ranking_service import RankingService
from app.services.stats_service import StatsService


class DashboardService:
    def __init__(
        self,
        ranking_service: RankingService | None = None,
        stats_service: StatsService | None = None,
        match_repository: MatchRepository | None = None,
    ) -> None:
        self.ranking_service = ranking_service or RankingService()
        self.stats_service = stats_service or StatsService(ranking_service=self.ranking_service)
        self.match_repository = match_repository or MatchRepository()

    def get_summary(self, db: Session) -> DashboardSummaryResponse:
        rankings = self.ranking_service.get_current_rankings(db)
        player_stats = self.stats_service.get_player_stats(db)
        all_matches = self.match_repository.list_matches(db, include_voided=False)
        recent_matches = all_matches[:10]
        rating_trends = self.ranking_service.get_all_rating_history(db)

        top_player = None
        if rankings:
            first = rankings[0]
            top_player = DashboardTopPlayerResponse(
                player_id=first.player_id,
                display_name=first.display_name,
                rating=first.rating,
            )

        last_session_mvp = self._last_session_mvp(all_matches)

        best_win_percentage = None
        eligible_stats = [row for row in player_stats if row.games_played > 0]
        if eligible_stats:
            best = max(eligible_stats, key=lambda row: (row.win_percentage, row.games_played, row.display_name.lower()))
            best_win_percentage = DashboardBestWinPercentageResponse(
                player_id=best.player_id,
                display_name=best.display_name,
                win_percentage=best.win_percentage,
                games_played=best.games_played,
            )

        most_games_played = None
        if eligible_stats:
            most = max(eligible_stats, key=lambda row: (row.games_played, row.wins, row.display_name.lower()))
            most_games_played = DashboardMostGamesPlayedResponse(
                player_id=most.player_id,
                display_name=most.display_name,
                games_played=most.games_played,
            )

        return DashboardSummaryResponse(
            top_player=top_player,
            last_session_mvp=last_session_mvp,
            best_win_percentage=best_win_percentage,
            most_games_played=most_games_played,
            leaderboard=[
                DashboardLeaderboardEntry(
                    rank=row.rank,
                    player_id=row.player_id,
                    display_name=row.display_name,
                    rating=row.rating,
                    wins=row.wins,
                    losses=row.losses,
                    win_percentage=row.win_percentage,
                )
                for row in rankings
            ],
            recent_matches=[self._to_recent_match_response(match) for match in recent_matches],
            rating_trends=[
                DashboardRatingTrendResponse(
                    player_id=trend.player_id,
                    display_name=trend.display_name,
                    points=trend.points,
                )
                for trend in rating_trends
            ],
        )

    @staticmethod
    def _last_session_mvp(matches):
        if not matches:
            return None

        latest_session_date = max(match.session.session_date for match in matches)
        latest_session_matches = [match for match in matches if match.session.session_date == latest_session_date]
        stats_by_player: dict = {}

        for match in latest_session_matches:
            teams_by_number = {team.team_number: team for team in match.teams}
            for team in match.teams:
                opponent_team = teams_by_number[1 if team.team_number == 2 else 2]
                for team_player in team.team_players:
                    entry = stats_by_player.setdefault(
                        team_player.player_id,
                        {
                            "display_name": team_player.player.display_name,
                            "wins": 0,
                            "losses": 0,
                            "point_differential": 0,
                        },
                    )
                    entry["point_differential"] += team.score - opponent_team.score
                    if team.is_winner:
                        entry["wins"] += 1
                    else:
                        entry["losses"] += 1

        if not stats_by_player:
            return None

        player_id, stats = max(
            stats_by_player.items(),
            key=lambda item: (
                item[1]["wins"] - item[1]["losses"],
                item[1]["wins"],
                item[1]["point_differential"],
                item[1]["display_name"].lower(),
            ),
        )
        return DashboardLastSessionMvpResponse(
            player_id=player_id,
            display_name=stats["display_name"],
            wins=stats["wins"],
            losses=stats["losses"],
            point_differential=stats["point_differential"],
        )

    @staticmethod
    def _to_recent_match_response(match) -> DashboardRecentMatchResponse:
        teams_by_number = {team.team_number: team for team in match.teams}
        team_1 = teams_by_number[1]
        team_2 = teams_by_number[2]
        winner_team_number = 1 if team_1.is_winner else 2
        return DashboardRecentMatchResponse(
            match_id=match.id,
            session_date=match.session.session_date,
            team_1_names=[team_player.player.display_name for team_player in team_1.team_players],
            team_1_score=team_1.score,
            team_2_names=[team_player.player.display_name for team_player in team_2.team_players],
            team_2_score=team_2.score,
            winner_team_number=winner_team_number,
        )
