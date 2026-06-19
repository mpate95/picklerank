def create_player(client, display_name: str) -> dict:
    response = client.post("/players", json={"display_name": display_name})
    assert response.status_code == 201
    return response.json()


def create_session(client) -> dict:
    response = client.post(
        "/sessions",
        json={"name": "Tournament Night", "session_date": "2026-06-19"},
    )
    assert response.status_code == 201
    return response.json()


def tournament_payload(name: str, entries: list[dict], format: str = "single_elimination") -> dict:
    return {
        "name": name,
        "format": format,
        "entries": entries,
    }


def seeded_team(seed: int, player_1_id: str, player_2_id: str) -> dict:
    return {
        "seed": seed,
        "player_1_id": player_1_id,
        "player_2_id": player_2_id,
    }


def get_node(body: dict, bracket: str, round_number: int, slot_number: int) -> dict:
    return next(
        node
        for node in body["nodes"]
        if node["bracket"] == bracket and node["round_number"] == round_number and node["slot_number"] == slot_number
    )


def score_node(client, tournament_id: str, node: dict, team_1_score: int, team_2_score: int) -> dict:
    response = client.patch(
        f"/tournaments/{tournament_id}/nodes/{node['id']}",
        json={"team_1_score": team_1_score, "team_2_score": team_2_score},
    )
    assert response.status_code == 200
    return response.json()


def test_can_create_and_fetch_draft_tournament_for_session(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"]]
    payload = tournament_payload(
        "Summer Ladder Cup",
        [
            seeded_team(1, players[0]["id"], players[1]["id"]),
            seeded_team(2, players[2]["id"], players[3]["id"]),
            seeded_team(3, players[4]["id"], players[5]["id"]),
            seeded_team(4, players[6]["id"], players[7]["id"]),
        ],
        format="double_elimination",
    )

    response = client.post(f"/sessions/{session['id']}/tournaments", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["session_id"] == session["id"]
    assert body["name"] == "Summer Ladder Cup"
    assert body["format"] == "double_elimination"
    assert body["status"] == "draft"
    assert body["bracket_size"] == 4
    assert [entry["seed"] for entry in body["entries"]] == [1, 2, 3, 4]
    assert len(body["nodes"]) == 6

    get_response = client.get(f"/tournaments/{body['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == body["id"]


def test_cannot_create_tournament_with_non_power_of_two_team_count(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]]

    response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Odd Bracket",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
                seeded_team(3, players[4]["id"], players[5]["id"]),
            ],
        ),
    )

    assert response.status_code == 400
    assert "power of two" in response.json()["detail"]


def test_cannot_create_tournament_with_duplicate_player_across_teams(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf"]]

    response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Duplicate Player",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[0]["id"], players[2]["id"]),
                seeded_team(3, players[3]["id"], players[4]["id"]),
                seeded_team(4, players[5]["id"], players[6]["id"]),
            ],
        ),
    )

    assert response.status_code == 400
    assert "only appear on one tournament team" in response.json()["detail"]


def test_cannot_create_tournament_with_inactive_player(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    client.delete(f"/players/{players[3]['id']}")

    response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Inactive Team",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
            ],
        ),
    )

    assert response.status_code == 400
    assert "active" in response.json()["detail"]


def test_session_detail_includes_tournaments_without_affecting_match_count(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]

    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Session Cup",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
            ],
        ),
    )
    assert create_response.status_code == 201

    response = client.get(f"/sessions/{session['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["match_count"] == 0
    assert body["matches"] == []
    assert len(body["tournaments"]) == 1
    assert body["tournaments"][0]["name"] == "Session Cup"


def test_can_delete_draft_tournament(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Delete Me",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
            ],
        ),
    )
    tournament_id = create_response.json()["id"]

    delete_response = client.delete(f"/tournaments/{tournament_id}")

    assert delete_response.status_code == 204
    list_response = client.get(f"/sessions/{session['id']}/tournaments")
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_single_elimination_scores_unlock_next_round_and_clear_stale_final(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Bracket Progression",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
                seeded_team(3, players[4]["id"], players[5]["id"]),
                seeded_team(4, players[6]["id"], players[7]["id"]),
            ],
        ),
    )
    assert create_response.status_code == 201
    body = create_response.json()
    tournament_id = body["id"]

    semifinal_1 = get_node(body, "winners", 1, 1)
    semifinal_2 = get_node(body, "winners", 1, 2)
    final = get_node(body, "winners", 2, 1)
    assert semifinal_1["status"] == "ready"
    assert semifinal_2["status"] == "ready"
    assert final["status"] == "pending"

    response = client.patch(
        f"/tournaments/{tournament_id}/nodes/{semifinal_1['id']}",
        json={"team_1_score": 11, "team_2_score": 7},
    )
    assert response.status_code == 200
    body = response.json()
    final = get_node(body, "winners", 2, 1)
    assert final["status"] == "pending"

    response = client.patch(
        f"/tournaments/{tournament_id}/nodes/{semifinal_2['id']}",
        json={"team_1_score": 9, "team_2_score": 11},
    )
    assert response.status_code == 200
    body = response.json()
    final = get_node(body, "winners", 2, 1)
    assert final["status"] == "ready"
    assert final["team_1"]["seed"] == 1
    assert final["team_2"]["seed"] == 3

    response = client.patch(
        f"/tournaments/{tournament_id}/nodes/{final['id']}",
        json={"team_1_score": 11, "team_2_score": 4},
    )
    assert response.status_code == 200
    body = response.json()
    final = get_node(body, "winners", 2, 1)
    assert final["status"] == "completed"
    assert final["winner_entry_id"] == final["team_1"]["id"]

    response = client.patch(
        f"/tournaments/{tournament_id}/nodes/{semifinal_1['id']}",
        json={"team_1_score": 5, "team_2_score": 11},
    )
    assert response.status_code == 200
    body = response.json()
    final = get_node(body, "winners", 2, 1)
    assert final["status"] == "ready"
    assert final["team_1"]["seed"] == 4
    assert final["team_1_score"] is None
    assert final["team_2_score"] is None
    assert final["winner_entry_id"] is None


def test_double_elimination_progression_unlocks_losers_bracket(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Double Elim",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
                seeded_team(3, players[4]["id"], players[5]["id"]),
                seeded_team(4, players[6]["id"], players[7]["id"]),
            ],
            format="double_elimination",
        ),
    )
    assert create_response.status_code == 201
    body = create_response.json()
    tournament_id = body["id"]

    w1 = get_node(body, "winners", 1, 1)
    w2 = get_node(body, "winners", 1, 2)
    l1 = get_node(body, "losers", 1, 1)
    winners_final = get_node(body, "winners", 2, 1)
    assert l1["status"] == "pending"

    response = client.patch(f"/tournaments/{tournament_id}/nodes/{w1['id']}", json={"team_1_score": 11, "team_2_score": 8})
    assert response.status_code == 200
    response = client.patch(f"/tournaments/{tournament_id}/nodes/{w2['id']}", json={"team_1_score": 4, "team_2_score": 11})
    assert response.status_code == 200

    body = response.json()
    l1 = get_node(body, "losers", 1, 1)
    winners_final = get_node(body, "winners", 2, 1)
    assert l1["status"] == "ready"
    assert winners_final["status"] == "ready"
    assert l1["team_1"]["seed"] == 4
    assert l1["team_2"]["seed"] == 2


def test_can_clear_a_draft_game_result(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Clear Result",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
            ],
        ),
    )
    tournament_id = create_response.json()["id"]
    final = get_node(create_response.json(), "winners", 1, 1)

    response = client.patch(f"/tournaments/{tournament_id}/nodes/{final['id']}", json={"team_1_score": 11, "team_2_score": 6})
    assert response.status_code == 200
    response = client.patch(f"/tournaments/{tournament_id}/nodes/{final['id']}", json={"team_1_score": None, "team_2_score": None})
    assert response.status_code == 200
    final = get_node(response.json(), "winners", 1, 1)
    assert final["status"] == "ready"
    assert final["team_1_score"] is None
    assert final["team_2_score"] is None
    assert final["winner_entry_id"] is None


def test_finalize_materializes_matches_and_updates_rankings(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Finalize Me",
            [
                seeded_team(1, alpha["id"], bravo["id"]),
                seeded_team(2, charlie["id"], delta["id"]),
            ],
        ),
    )
    assert create_response.status_code == 201
    tournament = create_response.json()
    final = get_node(tournament, "winners", 1, 1)
    tournament = score_node(client, tournament["id"], final, 11, 4)

    finalize_response = client.post(f"/tournaments/{tournament['id']}/finalize")

    assert finalize_response.status_code == 200
    finalized = finalize_response.json()
    assert finalized["status"] == "finalized"
    assert finalized["can_finalize"] is False
    assert finalized["can_revoke"] is True
    assert finalized["materialized_match_count"] == 1

    session_detail = client.get(f"/sessions/{session['id']}").json()
    assert session_detail["match_count"] == 1
    assert len(session_detail["matches"]) == 1
    assert session_detail["matches"][0]["tournament"]["name"] == "Finalize Me"
    assert session_detail["matches"][0]["tournament"]["bracket"] == "winners"

    rankings = client.get("/rankings/current").json()
    alpha_row = next(row for row in rankings if row["display_name"] == "Alpha")
    charlie_row = next(row for row in rankings if row["display_name"] == "Charlie")
    assert alpha_row["rating"] == 1016.0
    assert charlie_row["rating"] == 984.0


def test_revoke_voids_materialized_matches_and_restores_draft_state(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Revoke Me",
            [
                seeded_team(1, alpha["id"], bravo["id"]),
                seeded_team(2, charlie["id"], delta["id"]),
            ],
        ),
    )
    tournament = create_response.json()
    final = get_node(tournament, "winners", 1, 1)
    tournament = score_node(client, tournament["id"], final, 11, 5)
    client.post(f"/tournaments/{tournament['id']}/finalize")

    revoke_response = client.post(f"/tournaments/{tournament['id']}/revoke")

    assert revoke_response.status_code == 200
    revoked = revoke_response.json()
    assert revoked["status"] == "draft"
    assert revoked["can_finalize"] is True
    assert revoked["materialized_match_count"] == 0

    session_detail = client.get(f"/sessions/{session['id']}").json()
    assert session_detail["match_count"] == 0
    assert session_detail["matches"] == []

    players = {player["display_name"]: player for player in client.get("/players", params={"active_only": "false"}).json()}
    assert players["Alpha"]["rating"] == 1000.0
    assert players["Charlie"]["rating"] == 1000.0


def test_revoke_works_for_multi_match_tournament(client) -> None:
    session = create_session(client)
    players = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Three Match Revoke",
            [
                seeded_team(1, players[0]["id"], players[1]["id"]),
                seeded_team(2, players[2]["id"], players[3]["id"]),
                seeded_team(3, players[4]["id"], players[5]["id"]),
                seeded_team(4, players[6]["id"], players[7]["id"]),
            ],
        ),
    )
    assert create_response.status_code == 201
    tournament = create_response.json()

    semifinal_1 = get_node(tournament, "winners", 1, 1)
    semifinal_2 = get_node(tournament, "winners", 1, 2)
    tournament = score_node(client, tournament["id"], semifinal_1, 11, 7)
    tournament = score_node(client, tournament["id"], semifinal_2, 6, 11)
    final = get_node(tournament, "winners", 2, 1)
    tournament = score_node(client, tournament["id"], final, 11, 8)

    finalize_response = client.post(f"/tournaments/{tournament['id']}/finalize")
    assert finalize_response.status_code == 200
    assert finalize_response.json()["materialized_match_count"] == 3

    revoke_response = client.post(f"/tournaments/{tournament['id']}/revoke")

    assert revoke_response.status_code == 200
    revoked = revoke_response.json()
    assert revoked["status"] == "draft"
    assert revoked["materialized_match_count"] == 0

    session_detail = client.get(f"/sessions/{session['id']}").json()
    assert session_detail["match_count"] == 0
    assert session_detail["matches"] == []


def test_cannot_revoke_tournament_after_newer_ranked_match_exists(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta, echo, foxtrot = [
        create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]
    ]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Guardrail",
            [
                seeded_team(1, alpha["id"], bravo["id"]),
                seeded_team(2, charlie["id"], delta["id"]),
            ],
        ),
    )
    tournament = create_response.json()
    final = get_node(tournament, "winners", 1, 1)
    tournament = score_node(client, tournament["id"], final, 11, 7)
    client.post(f"/tournaments/{tournament['id']}/finalize")

    ranked_match_response = client.post(
        "/matches",
        json={
            "session_id": session["id"],
            "match_type": "doubles",
            "is_ranked": True,
            "team_1": {"player_ids": [alpha["id"], echo["id"]], "score": 11},
            "team_2": {"player_ids": [charlie["id"], foxtrot["id"]], "score": 6},
        },
    )
    assert ranked_match_response.status_code == 201

    revoke_response = client.post(f"/tournaments/{tournament['id']}/revoke")

    assert revoke_response.status_code == 400
    assert "most recent ranked block" in revoke_response.json()["detail"]


def test_cannot_edit_finalized_tournament_nodes_without_revoke(client) -> None:
    session = create_session(client)
    alpha, bravo, charlie, delta = [create_player(client, name) for name in ["Alpha", "Bravo", "Charlie", "Delta"]]
    create_response = client.post(
        f"/sessions/{session['id']}/tournaments",
        json=tournament_payload(
            "Locked",
            [
                seeded_team(1, alpha["id"], bravo["id"]),
                seeded_team(2, charlie["id"], delta["id"]),
            ],
        ),
    )
    tournament = create_response.json()
    final = get_node(tournament, "winners", 1, 1)
    tournament = score_node(client, tournament["id"], final, 11, 3)
    client.post(f"/tournaments/{tournament['id']}/finalize")

    response = client.patch(
        f"/tournaments/{tournament['id']}/nodes/{final['id']}",
        json={"team_1_score": 11, "team_2_score": 9},
    )

    assert response.status_code == 400
    assert "draft tournaments can be edited" in response.json()["detail"]
