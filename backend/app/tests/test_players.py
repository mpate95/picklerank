import uuid

from app.models.rating import PlayerRating


def test_create_player_also_creates_rating(client, db_session) -> None:
    response = client.post(
        "/players",
        json={
            "display_name": "Mike",
            "first_name": "Michael",
            "last_name": "Patel",
            "email": None,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["display_name"] == "Mike"
    assert body["is_active"] is True
    assert body["rating"] == 1000.0

    rating = db_session.query(PlayerRating).filter(PlayerRating.player_id == uuid.UUID(body["id"])).one()
    assert float(rating.rating) == 1000.0


def test_list_players_defaults_to_active_only(client) -> None:
    first_response = client.post("/players", json={"display_name": "Alpha"})
    second_response = client.post("/players", json={"display_name": "Bravo"})
    player_id = second_response.json()["id"]

    client.delete(f"/players/{player_id}")

    response = client.get("/players")

    assert response.status_code == 200
    assert [player["display_name"] for player in response.json()] == ["Alpha"]
    assert first_response.status_code == 201


def test_list_players_can_include_inactive(client) -> None:
    first_response = client.post("/players", json={"display_name": "Alpha"})
    second_response = client.post("/players", json={"display_name": "Bravo"})
    player_id = second_response.json()["id"]

    client.delete(f"/players/{player_id}")
    response = client.get("/players", params={"active_only": "false"})

    assert response.status_code == 200
    assert [player["display_name"] for player in response.json()] == ["Alpha", "Bravo"]
    assert first_response.status_code == 201


def test_get_player_returns_current_rank(client) -> None:
    lower_player = client.post("/players", json={"display_name": "Alpha"}).json()
    higher_player = client.post("/players", json={"display_name": "Bravo"}).json()

    response = client.get(f"/players/{higher_player['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == higher_player["id"]
    assert body["current_rank"] == 2
    assert body["rating"] == 1000.0
    assert lower_player["id"] != higher_player["id"]


def test_update_player_changes_provided_fields_only(client) -> None:
    created_player = client.post(
        "/players",
        json={
            "display_name": "Mike",
            "first_name": "Michael",
            "last_name": "Patel",
            "email": "mike@example.com",
        },
    ).json()

    response = client.patch(
        f"/players/{created_player['id']}",
        json={"display_name": "Mike P"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Mike P"
    assert body["first_name"] == "Michael"
    assert body["email"] == "mike@example.com"


def test_delete_player_soft_deactivates_player(client) -> None:
    created_player = client.post("/players", json={"display_name": "Mike"}).json()

    delete_response = client.delete(f"/players/{created_player['id']}")
    get_response = client.get(f"/players/{created_player['id']}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 200
    assert get_response.json()["is_active"] is False
    assert get_response.json()["current_rank"] is None
