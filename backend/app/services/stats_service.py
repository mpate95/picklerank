from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.match import Match, MatchTeam
from app.repositories.match_repository import MatchRepository
from app.repositories.player_repository import PlayerRepository
from app.schemas.stats import (
    PlayerDetailStatsResponse,
    PlayerMatchHistoryResponse,
    PlayerStatsResponse,
    TeamStatsResponse,
)
from app.services.ranking_service import RankingService


@dataclass
class AggregatedPlayerStats:
    display_name: str
    games_played: int = 0
    wins: int = 0
    losses: int = 0
    points_for: int = 0
    points_against: int = 0
    results_desc: list[str] | None = None

    def __post_init__(self) -> None:
        if self.results_desc is None:
            self.results_desc = []


@dataclass
class AggregatedTeamStats:
    player_1_id: uuid.UUID
    player_1_name: str
    player_2_id: uuid.UUID
    player_2_name: str
    games_played: int = 0
    wins: int = 0
    losses: int = 0
    point_differential: int = 0


class StatsService:
    def __init__(
        self,
        player_repository: PlayerRepository | None = None,
        match_repository: MatchRepository | None = None,
        ranking_service: RankingService | None = None,
    ) -> None:
        self.player_repository = player_repository or PlayerRepository()
        self.match_repository = match_repository or MatchRepository()
        self.ranking_service = ranking_service or RankingService(match_repository=self.match_repository)

    def get_player_stats(self, db: Session) -> list[PlayerStatsResponse]:
        players = self.player_repository.list_players(db, active_only=False)
        matches = self.match_repository.list_matches(db, include_voided=False)
        stats_by_player = self._aggregate_player_stats(matches)
        return [
            self._to_player_stats_response(
                player.id,
                stats_by_player.get(player.id, AggregatedPlayerStats(display_name=player.display_name)),
            )
            for player in sorted(players, key=lambda player: player.display_name.lower())
        ]

    def get_single_player_stats(self, db: Session, player_id: uuid.UUID) -> PlayerDetailStatsResponse:
        player = self.player_repository.get_player(db, player_id)
        if player is None:
            raise NotFoundError("Player", str(player_id))

        player_matches = self.match_repository.list_matches(db, player_id=player_id, include_voided=False)
        stats = self._aggregate_player_stats(player_matches).get(
            player_id,
            AggregatedPlayerStats(display_name=player.display_name),
        )

        return PlayerDetailStatsResponse(
            **self._to_player_stats_response(player.id, stats).model_dump(),
            recent_form=stats.results_desc[:5],
            match_history=[self._to_match_history_response(player_id, match) for match in player_matches],
            rating_history=self.ranking_service.get_player_match_rating_history(db, player_id),
        )

    def get_team_stats(self, db: Session) -> list[TeamStatsResponse]:
        matches = self.match_repository.list_matches(db, include_voided=False)
        stats_by_team = self._aggregate_team_stats(matches)
        return [
            TeamStatsResponse(
                player_1_id=stats.player_1_id,
                player_1_name=stats.player_1_name,
                player_2_id=stats.player_2_id,
                player_2_name=stats.player_2_name,
                games_played=stats.games_played,
                wins=stats.wins,
                losses=stats.losses,
                win_percentage=self._win_percentage(stats.wins, stats.games_played),
                point_differential=stats.point_differential,
            )
            for stats in sorted(
                stats_by_team.values(),
                key=lambda item: (-item.wins, -item.games_played, item.player_1_name.lower(), item.player_2_name.lower()),
            )
        ]

    @staticmethod
    def _aggregate_player_stats(matches: list[Match]) -> dict[uuid.UUID, AggregatedPlayerStats]:
        stats_by_player: dict[uuid.UUID, AggregatedPlayerStats] = {}
        for match in matches:
            for team in match.teams:
                opponent_team = next(candidate for candidate in match.teams if candidate.team_number != team.team_number)
                result = "W" if team.is_winner else "L"
                for team_player in team.team_players:
                    player_stats = stats_by_player.setdefault(
                        team_player.player_id,
                        AggregatedPlayerStats(display_name=team_player.player.display_name),
                    )
                    player_stats.games_played += 1
                    player_stats.points_for += team.score
                    player_stats.points_against += opponent_team.score
                    player_stats.results_desc.append(result)
                    if team.is_winner:
                        player_stats.wins += 1
                    else:
                        player_stats.losses += 1
        return stats_by_player

    @staticmethod
    def _aggregate_team_stats(matches: list[Match]) -> dict[tuple[uuid.UUID, uuid.UUID], AggregatedTeamStats]:
        stats_by_team: dict[tuple[uuid.UUID, uuid.UUID], AggregatedTeamStats] = {}
        for match in matches:
            for team in match.teams:
                if len(team.team_players) != 2:
                    continue
                opponent_team = next(candidate for candidate in match.teams if candidate.team_number != team.team_number)
                sorted_players = sorted(team.team_players, key=lambda team_player: team_player.player.display_name.lower())
                key = tuple(team_player.player_id for team_player in sorted_players)
                team_stats = stats_by_team.setdefault(
                    key,
                    AggregatedTeamStats(
                        player_1_id=sorted_players[0].player_id,
                        player_1_name=sorted_players[0].player.display_name,
                        player_2_id=sorted_players[1].player_id,
                        player_2_name=sorted_players[1].player.display_name,
                    ),
                )
                team_stats.games_played += 1
                team_stats.point_differential += team.score - opponent_team.score
                if team.is_winner:
                    team_stats.wins += 1
                else:
                    team_stats.losses += 1
        return stats_by_team

    def _to_player_stats_response(
        self,
        player_id: uuid.UUID,
        stats: AggregatedPlayerStats,
    ) -> PlayerStatsResponse:
        point_differential = stats.points_for - stats.points_against
        return PlayerStatsResponse(
            player_id=player_id,
            display_name=stats.display_name,
            games_played=stats.games_played,
            wins=stats.wins,
            losses=stats.losses,
            win_percentage=self._win_percentage(stats.wins, stats.games_played),
            points_for=stats.points_for,
            points_against=stats.points_against,
            point_differential=point_differential,
            avg_points_for=self._average(stats.points_for, stats.games_played),
            avg_points_against=self._average(stats.points_against, stats.games_played),
            current_streak=self._current_streak(stats.results_desc),
        )

    @staticmethod
    def _to_match_history_response(player_id: uuid.UUID, match: Match) -> PlayerMatchHistoryResponse:
        matching_team = next(team for team in match.teams if any(team_player.player_id == player_id for team_player in team.team_players))
        opponent_team = next(team for team in match.teams if team.team_number != matching_team.team_number)
        return PlayerMatchHistoryResponse(
            match_id=match.id,
            session_id=match.session_id,
            session_date=match.session.session_date,
            is_ranked=match.is_ranked,
            result="W" if matching_team.is_winner else "L",
            team_score=matching_team.score,
            opponent_score=opponent_team.score,
        )

    @staticmethod
    def _win_percentage(wins: int, games_played: int) -> float:
        if games_played == 0:
            return 0.0
        return round(wins / games_played, 3)

    @staticmethod
    def _average(total: int, games_played: int) -> float:
        if games_played == 0:
            return 0.0
        return round(total / games_played, 2)

    @staticmethod
    def _current_streak(results_desc: list[str]) -> str:
        if not results_desc:
            return "-"
        streak_result = results_desc[0]
        streak_count = 0
        for result in results_desc:
            if result != streak_result:
                break
            streak_count += 1
        return f"{streak_result}{streak_count}"
