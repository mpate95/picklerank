def test_leaderboard_settings_default_to_disabled(client) -> None:
    response = client.get("/settings/leaderboard")

    assert response.status_code == 200
    assert response.json() == {
        "leaderboard_qualifier_enabled": False,
        "leaderboard_qualifier_min_games": 0,
    }


def test_admin_can_update_leaderboard_settings(client) -> None:
    response = client.patch(
        "/settings/leaderboard",
        json={
            "leaderboard_qualifier_enabled": True,
            "leaderboard_qualifier_min_games": 5,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "leaderboard_qualifier_enabled": True,
        "leaderboard_qualifier_min_games": 5,
    }


def test_public_cannot_update_leaderboard_settings(public_client) -> None:
    response = public_client.patch(
        "/settings/leaderboard",
        json={
            "leaderboard_qualifier_enabled": True,
            "leaderboard_qualifier_min_games": 5,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Admin authentication is required."
