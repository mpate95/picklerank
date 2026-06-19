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


def create_named_session(client, session_date: str, name: str) -> dict:
    response = client.post(
        "/sessions",
        json={"name": name, "session_date": session_date},
    )
    assert response.status_code == 201
    return response.json()


def match_payload(session_id: str, team_1_player_ids: list[str], team_2_player_ids: list[str], *, is_ranked: bool = True) -> dict:
    return {
        "session_id": session_id,
        "match_type": "doubles",
        "is_ranked": is_ranked,
        "team_1": {"player_ids": team_1_player_ids, "score": 11},
        "team_2": {"player_ids": team_2_player_ids, "score": 8},
    }


def test_current_rankings_orders_by_rating_with_stats(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    create_match = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    assert create_match.status_code == 201

    response = client.get("/rankings/current")

    assert response.status_code == 200
    body = response.json()
    assert body[0]["display_name"] == "Alpha"
    assert body[0]["rank"] == 1
    assert body[0]["rating"] == 1016.0
    assert body[0]["rating_change_last_session"] == 16.0
    assert body[0]["games_played"] == 1
    assert body[0]["wins"] == 1
    assert body[0]["losses"] == 0
    assert body[0]["win_percentage"] == 1.0
    assert body[-1]["rating"] == 984.0


def test_unranked_matches_contribute_to_stats_but_not_rating(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    create_match = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]], is_ranked=False),
    )
    assert create_match.status_code == 201

    response = client.get("/rankings/current")

    assert response.status_code == 200
    alpha_row = next(row for row in response.json() if row["display_name"] == "Alpha")
    assert alpha_row["rating"] == 1000.0
    assert alpha_row["games_played"] == 1
    assert alpha_row["wins"] == 1
    assert alpha_row["rating_change_last_session"] == 0.0


def test_current_rankings_hide_players_below_qualifier_threshold(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    settings_response = client.patch(
        "/settings/leaderboard",
        json={
            "leaderboard_qualifier_enabled": True,
            "leaderboard_qualifier_min_games": 2,
        },
    )
    assert settings_response.status_code == 200

    create_match = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    assert create_match.status_code == 201

    response = client.get("/rankings/current")

    assert response.status_code == 200
    assert response.json() == []


def test_player_rating_history_includes_initial_point_and_events(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )

    response = client.get(f"/rankings/history/{alpha['id']}")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["rating"] == 1000.0
    assert body[0]["rating_change"] == 0.0
    assert body[1]["rating"] == 1016.0
    assert body[1]["rating_change"] == 16.0


def test_all_rating_history_can_filter_players(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta, echo, foxtrot = [
        create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]
    ]
    client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    client.post(
        "/matches",
        json=match_payload(session["id"], [echo["id"], foxtrot["id"]], [charlie["id"], delta["id"]]),
    )

    response = client.get("/rankings/history", params={"player_ids": f"{alpha['id']},{echo['id']}"})

    assert response.status_code == 200
    body = response.json()
    assert [trend["display_name"] for trend in body] == ["Alpha", "Echo"]
    assert all(len(trend["points"]) >= 2 for trend in body)


def test_rating_history_aggregates_multiple_ranked_matches_within_a_session(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    first = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    assert first.status_code == 201
    second = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    assert second.status_code == 201

    history_response = client.get(f"/rankings/history/{alpha['id']}")
    rankings_response = client.get("/rankings/current")

    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) == 2
    assert history[1]["date"] == "2026-05-30"
    assert history[1]["rating"] == 1030.53
    assert history[1]["rating_change"] == 30.53

    assert rankings_response.status_code == 200
    alpha_row = next(row for row in rankings_response.json() if row["display_name"] == "Alpha")
    assert alpha_row["rating_change_last_session"] == 30.53


def test_rating_history_only_adds_points_for_sessions_a_player_participated_in(client) -> None:
    first_session = create_named_session(client, "2026-05-30", "Saturday Pickleball - May 30, 2026")
    second_session = create_named_session(client, "2026-06-06", "Saturday Pickleball - June 6, 2026")
    alpha, bravo, charlie, delta, echo, foxtrot = [
        create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]
    ]

    first = client.post(
        "/matches",
        json=match_payload(first_session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    assert first.status_code == 201
    second = client.post(
        "/matches",
        json=match_payload(second_session["id"], [echo["id"], foxtrot["id"]], [charlie["id"], delta["id"]]),
    )
    assert second.status_code == 201

    response = client.get(f"/rankings/history/{alpha['id']}")

    assert response.status_code == 200
    history = response.json()
    assert len(history) == 2
    assert history[1]["date"] == "2026-05-30"


def test_ranking_history_excludes_voided_ranked_matches(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    created_match = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    ).json()
    client.delete(f"/matches/{created_match['id']}")

    response = client.get(f"/rankings/history/{alpha['id']}")

    assert response.status_code == 200
    history = response.json()
    assert len(history) == 1
    assert history[0]["rating"] == 1000.0
