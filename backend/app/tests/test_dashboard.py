def create_player(client, display_name: str) -> dict:
    response = client.post("/players", json={"display_name": display_name})
    assert response.status_code == 201
    return response.json()


def create_session(client, session_date: str = "2026-05-30", name: str = "Saturday Pickleball - May 30, 2026") -> dict:
    response = client.post(
        "/sessions",
        json={"name": name, "session_date": session_date},
    )
    assert response.status_code == 201
    return response.json()


def match_payload(
    session_id: str,
    team_1_player_ids: list[str],
    team_2_player_ids: list[str],
    *,
    team_1_score: int = 11,
    team_2_score: int = 8,
    is_ranked: bool = True,
) -> dict:
    return {
        "session_id": session_id,
        "match_type": "doubles",
        "is_ranked": is_ranked,
        "team_1": {"player_ids": team_1_player_ids, "score": team_1_score},
        "team_2": {"player_ids": team_2_player_ids, "score": team_2_score},
    }


def test_dashboard_summary_returns_composed_view(client) -> None:
    first_session = create_session(client, "2026-05-30", "Saturday Pickleball - May 30, 2026")
    second_session = create_session(client, "2026-06-06", "Saturday Pickleball - June 6, 2026")
    alpha, bravo, charlie, delta, echo, foxtrot = [
        create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]
    ]

    client.post(
        "/matches",
        json=match_payload(first_session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    client.post(
        "/matches",
        json=match_payload(second_session["id"], [echo["id"], foxtrot["id"]], [alpha["id"], bravo["id"]], team_1_score=11, team_2_score=9),
    )

    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["top_player"]["display_name"] == "Echo"
    assert body["biggest_mover"]["display_name"] in {"Echo", "Foxtrot"}
    assert body["best_win_percentage"]["games_played"] >= 1
    assert body["most_games_played"]["display_name"] in {"Alpha", "Bravo"}
    assert len(body["leaderboard"]) == 6
    assert len(body["recent_matches"]) == 2
    assert body["recent_matches"][0]["session_date"] == "2026-06-06"
    assert body["recent_matches"][0]["winner_team_number"] == 1
    assert len(body["rating_trends"]) == 6


def test_dashboard_summary_handles_empty_state(client) -> None:
    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["top_player"] is None
    assert body["biggest_mover"] is None
    assert body["best_win_percentage"] is None
    assert body["most_games_played"] is None
    assert body["leaderboard"] == []
    assert body["recent_matches"] == []
    assert body["rating_trends"] == []
