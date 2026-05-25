def test_create_session(client) -> None:
    response = client.post(
        "/sessions",
        json={
            "name": "Saturday Pickleball - May 30, 2026",
            "session_date": "2026-05-30",
            "location": "Local Courts",
            "notes": "Weekly games",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Saturday Pickleball - May 30, 2026"
    assert body["session_date"] == "2026-05-30"
    assert body["location"] == "Local Courts"
    assert body["notes"] == "Weekly games"
    assert body["match_count"] == 0
    assert body["is_completed"] is False


def test_list_sessions_orders_most_recent_first(client) -> None:
    client.post(
        "/sessions",
        json={"name": "Wednesday Night Pickleball", "session_date": "2026-05-27"},
    )
    client.post(
        "/sessions",
        json={"name": "Saturday Pickleball - May 30, 2026", "session_date": "2026-05-30"},
    )

    response = client.get("/sessions")

    assert response.status_code == 200
    assert [session["session_date"] for session in response.json()] == ["2026-05-30", "2026-05-27"]


def test_get_session_returns_detail_shape(client) -> None:
    created_session = client.post(
        "/sessions",
        json={
            "name": "Saturday Pickleball - May 30, 2026",
            "session_date": "2026-05-30",
            "location": "Local Courts",
        },
    ).json()

    response = client.get(f"/sessions/{created_session['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created_session["id"]
    assert body["match_count"] == 0
    assert body["matches"] == []
    assert body["created_at"] is not None
    assert body["updated_at"] is not None


def test_update_session_changes_selected_fields_only(client) -> None:
    created_session = client.post(
        "/sessions",
        json={
            "name": "Saturday Pickleball - May 30, 2026",
            "session_date": "2026-05-30",
            "location": "Local Courts",
            "notes": "Weekly games",
        },
    ).json()

    response = client.patch(
        f"/sessions/{created_session['id']}",
        json={"location": "Indoor Courts"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["location"] == "Indoor Courts"
    assert body["name"] == "Saturday Pickleball - May 30, 2026"
    assert body["notes"] == "Weekly games"


def test_can_mark_session_completed(client) -> None:
    created_session = client.post(
        "/sessions",
        json={"name": "Saturday Pickleball - May 30, 2026", "session_date": "2026-05-30"},
    ).json()

    response = client.patch(
        f"/sessions/{created_session['id']}",
        json={"is_completed": True},
    )

    assert response.status_code == 200
    assert response.json()["is_completed"] is True


def test_delete_session_hard_deletes_when_no_matches_exist(client) -> None:
    created_session = client.post(
        "/sessions",
        json={"name": "Saturday Pickleball - May 30, 2026", "session_date": "2026-05-30"},
    ).json()

    delete_response = client.delete(f"/sessions/{created_session['id']}")
    get_response = client.get(f"/sessions/{created_session['id']}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404
