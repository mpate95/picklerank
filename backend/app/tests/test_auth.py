from app.core.config import get_settings


def test_public_session_reports_anonymous(public_client) -> None:
    response = public_client.get("/auth/session")

    assert response.status_code == 200
    assert response.json() == {
        "is_authenticated": False,
        "is_admin": False,
        "username": None,
    }


def test_admin_login_returns_bearer_token(public_client) -> None:
    settings = get_settings()
    response = public_client.post(
        "/auth/login",
        json={"username": settings.admin_username, "password": settings.admin_password},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session"] == {
        "is_authenticated": True,
        "is_admin": True,
        "username": settings.admin_username,
    }
    set_cookie = response.headers.get("set-cookie", "")
    assert f"{settings.auth_cookie_name}=" in set_cookie


def test_public_reads_stay_available_without_login(public_client) -> None:
    response = public_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_public_write_is_blocked_without_login(public_client) -> None:
    response = public_client.post("/players", json={"display_name": "Blocked"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Admin authentication is required."


def test_write_requires_csrf_even_with_auth_cookie(public_client) -> None:
    settings = get_settings()
    login_response = public_client.post(
        "/auth/login",
        json={"username": settings.admin_username, "password": settings.admin_password},
    )

    assert login_response.status_code == 200

    response = public_client.post("/players", json={"display_name": "Blocked"})

    assert response.status_code == 403
    assert response.json()["detail"] == "CSRF validation failed."


def test_login_rate_limit_blocks_repeated_attempts(public_client) -> None:
    settings = get_settings()

    for _ in range(settings.login_rate_limit_attempts):
        response = public_client.post(
            "/auth/login",
            json={"username": settings.admin_username, "password": "wrong-password"},
        )
        assert response.status_code == 401

    limited_response = public_client.post(
        "/auth/login",
        json={"username": settings.admin_username, "password": "wrong-password"},
    )

    assert limited_response.status_code == 429
    assert limited_response.json()["detail"] == "Too many login attempts. Try again later."
