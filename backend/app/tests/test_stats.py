def create_player(client, display_name: str) -> dict:
    response = client.post("/players", json={"display_name": display_name})
    assert response.status_code == 201
    return response.json()


def create_session(client) -> dict:
    response = client.post(
        "/sessions",
        json={"name": "Saturday Pickleball - May 30, 2026", "session_date": "2026-05-30"},
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


def test_player_stats_calculate_totals_and_streak(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]], team_1_score=11, team_2_score=8),
    )
    client.post(
        "/matches",
        json=match_payload(session["id"], [charlie["id"], delta["id"]], [alpha["id"], bravo["id"]], team_1_score=11, team_2_score=9),
    )

    response = client.get("/stats/players")

    assert response.status_code == 200
    alpha_row = next(row for row in response.json() if row["display_name"] == "Alpha")
    assert alpha_row["games_played"] == 2
    assert alpha_row["wins"] == 1
    assert alpha_row["losses"] == 1
    assert alpha_row["win_percentage"] == 0.5
    assert alpha_row["points_for"] == 20
    assert alpha_row["points_against"] == 19
    assert alpha_row["point_differential"] == 1
    assert alpha_row["avg_points_for"] == 10.0
    assert alpha_row["avg_points_against"] == 9.5
    assert alpha_row["current_streak"] == "L1"


def test_single_player_stats_include_recent_form_match_history_and_rating_history(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]], is_ranked=False),
    )
    client.post(
        "/matches",
        json=match_payload(session["id"], [charlie["id"], delta["id"]], [alpha["id"], bravo["id"]], team_1_score=11, team_2_score=7),
    )

    response = client.get(f"/stats/players/{alpha['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Alpha"
    assert body["recent_form"] == ["L", "W"]
    assert len(body["match_history"]) == 2
    assert body["match_history"][0]["result"] == "L"
    assert body["match_history"][1]["result"] == "W"
    assert len(body["rating_history"]) == 2
    assert body["rating_history"][0]["rating"] == 1000.0


def test_team_stats_aggregate_pairings(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]], team_1_score=11, team_2_score=8),
    )
    client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]], team_1_score=11, team_2_score=7),
    )

    response = client.get("/stats/teams")

    assert response.status_code == 200
    body = response.json()
    alpha_bravo = next(
        row
        for row in body
        if {row["player_1_name"], row["player_2_name"]} == {"Alpha", "Bravo"}
    )
    assert alpha_bravo["games_played"] == 2
    assert alpha_bravo["wins"] == 2
    assert alpha_bravo["losses"] == 0
    assert alpha_bravo["win_percentage"] == 1.0
    assert alpha_bravo["point_differential"] == 7


def test_voided_matches_do_not_count_toward_stats(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    created_match = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    ).json()
    client.delete(f"/matches/{created_match['id']}")

    response = client.get("/stats/players")

    assert response.status_code == 200
    alpha_row = next(row for row in response.json() if row["display_name"] == "Alpha")
    assert alpha_row["games_played"] == 0
    assert alpha_row["current_streak"] == "-"
