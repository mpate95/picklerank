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


def match_payload(session_id: str, team_1_player_ids: list[str], team_2_player_ids: list[str], *, is_ranked: bool = True) -> dict:
    return {
        "session_id": session_id,
        "match_type": "doubles",
        "is_ranked": is_ranked,
        "team_1": {"player_ids": team_1_player_ids, "score": 11},
        "team_2": {"player_ids": team_2_player_ids, "score": 8},
    }


def test_cannot_create_match_with_missing_session(client) -> None:
    player_ids = [create_player(client, name)["id"] for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    response = client.post("/matches", json=match_payload("c5aa6bb6-b171-45a3-96f5-36c20b4b3dcc", player_ids[:2], player_ids[2:]))

    assert response.status_code == 404


def test_cannot_create_match_with_inactive_player(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    client.delete(f"/players/{players[3]['id']}")

    response = client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]]),
    )

    assert response.status_code == 400
    assert "active" in response.json()["detail"]


def test_cannot_create_doubles_match_with_fewer_than_four_players(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie"]]

    response = client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"]]),
    )

    assert response.status_code == 400
    assert "exactly two players" in response.json()["detail"]


def test_cannot_create_match_with_duplicate_player(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    response = client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[1]["id"], players[2]["id"]]),
    )

    assert response.status_code == 400
    assert "four unique players" in response.json()["detail"]


def test_cannot_create_match_with_tied_score(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    payload = match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]])
    payload["team_2"]["score"] = 11

    response = client.post("/matches", json=payload)

    assert response.status_code == 400
    assert "cannot be equal" in response.json()["detail"]


def test_cannot_create_match_with_negative_score(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    payload = match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]])
    payload["team_2"]["score"] = -1

    response = client.post("/matches", json=payload)

    assert response.status_code == 422


def test_winner_is_inferred_correctly(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    response = client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]], is_ranked=False),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["team_1"]["is_winner"] is True
    assert body["team_2"]["is_winner"] is False


def test_ranked_match_updates_player_ratings_and_creates_rating_events(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    response = client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]]),
    )

    assert response.status_code == 201
    body = response.json()
    assert len(body["rating_events"]) == 4

    updated_players = {player["display_name"]: player for player in client.get("/players", params={"active_only": "false"}).json()}
    assert updated_players["Alpha"]["rating"] == 1016.0
    assert updated_players["Bravo"]["rating"] == 1016.0
    assert updated_players["Charlie"]["rating"] == 984.0
    assert updated_players["Delta"]["rating"] == 984.0


def test_unranked_match_does_not_update_player_ratings_or_create_rating_events(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    response = client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]], is_ranked=False),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["rating_events"] == []

    updated_players = {player["display_name"]: player for player in client.get("/players", params={"active_only": "false"}).json()}
    assert all(player["rating"] == 1000.0 for player in updated_players.values())


def test_underdog_win_gives_larger_rating_gain_than_favorite_win(client) -> None:
    session = create_session(client)
    alpha = create_player(client, "Alpha")
    bravo = create_player(client, "Bravo")
    charlie = create_player(client, "Charlie")
    delta = create_player(client, "Delta")
    echo = create_player(client, "Echo")
    foxtrot = create_player(client, "Foxtrot")

    first_ranked = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    )
    assert first_ranked.status_code == 201

    second_ranked = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [echo["id"], foxtrot["id"]]),
    )
    assert second_ranked.status_code == 201

    favorite_gain = next(
        event["rating_change"]
        for event in second_ranked.json()["rating_events"]
        if event["player_id"] == alpha["id"]
    )

    upset = client.post(
        "/matches",
        json=match_payload(session["id"], [echo["id"], foxtrot["id"]], [alpha["id"], bravo["id"]]),
    )
    assert upset.status_code == 201
    underdog_gain = next(
        event["rating_change"]
        for event in upset.json()["rating_events"]
        if event["player_id"] == echo["id"]
    )

    assert underdog_gain > favorite_gain


def test_list_matches_can_filter_by_session_player_and_ranked_only(client) -> None:
    first_session = create_session(client)
    second_session = client.post(
        "/sessions",
        json={"name": "Wednesday Night Pickleball", "session_date": "2026-06-03"},
    ).json()
    alpha, bravo, charlie, delta, echo, foxtrot = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]]

    client.post(
        "/matches",
        json=match_payload(first_session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]], is_ranked=False),
    )
    client.post(
        "/matches",
        json=match_payload(second_session["id"], [alpha["id"], echo["id"]], [charlie["id"], foxtrot["id"]]),
    )

    by_session = client.get("/matches", params={"session_id": second_session["id"]})
    by_player = client.get("/matches", params={"player_id": echo["id"]})
    ranked_only = client.get("/matches", params={"ranked_only": "true"})

    assert len(by_session.json()) == 1
    assert by_session.json()[0]["session_id"] == second_session["id"]
    assert len(by_player.json()) == 1
    assert {player["id"] for player in by_player.json()[0]["team_1"]["players"]} == {alpha["id"], echo["id"]}
    assert len(ranked_only.json()) == 1
    assert ranked_only.json()[0]["is_ranked"] is True


def test_session_detail_and_list_include_match_count(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]], is_ranked=False),
    )

    session_list = client.get("/sessions")
    session_detail = client.get(f"/sessions/{session['id']}")

    assert session_list.json()[0]["match_count"] == 1
    assert len(session_detail.json()["matches"]) == 1


def test_voiding_most_recent_ranked_match_reverses_ratings(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    create_response = client.post(
        "/matches",
        json=match_payload(session["id"], [players[0]["id"], players[1]["id"]], [players[2]["id"], players[3]["id"]]),
    )
    match_id = create_response.json()["id"]

    void_response = client.delete(f"/matches/{match_id}")

    assert void_response.status_code == 200
    assert void_response.json()["status"] == "voided"
    updated_players = {player["display_name"]: player for player in client.get("/players", params={"active_only": "false"}).json()}
    assert all(player["rating"] == 1000.0 for player in updated_players.values())


def test_cannot_void_older_ranked_match(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta, echo, foxtrot = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]]
    first = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [charlie["id"], delta["id"]]),
    ).json()
    second = client.post(
        "/matches",
        json=match_payload(session["id"], [alpha["id"], bravo["id"]], [echo["id"], foxtrot["id"]]),
    ).json()

    response = client.delete(f"/matches/{first['id']}")

    assert second["id"] != first["id"]
    assert response.status_code == 400
