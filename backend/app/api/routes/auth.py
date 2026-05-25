import hmac

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.auth import AuthIdentity, create_access_token, create_csrf_token, get_current_identity, require_csrf
from app.core.config import get_settings
from app.core.rate_limit import login_rate_limiter
from app.schemas.auth import AuthLoginRequest, AuthLoginResponse, AuthSessionResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def require_admin(identity: AuthIdentity | None = Depends(get_current_identity)) -> AuthIdentity:
    if identity is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication is required.",
        )
    if not identity.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required.",
        )
    return identity


@router.get("/session", response_model=AuthSessionResponse)
def get_auth_session(identity: AuthIdentity | None = Depends(get_current_identity)) -> AuthSessionResponse:
    if identity is None:
        return AuthSessionResponse(is_authenticated=False, is_admin=False, username=None)
    return AuthSessionResponse(
        is_authenticated=True,
        is_admin=identity.is_admin,
        username=identity.username,
    )


@router.post("/login", response_model=AuthLoginResponse)
def login(payload: AuthLoginRequest, request: Request, response: Response) -> AuthLoginResponse:
    settings = get_settings()
    client_host = request.client.host if request.client else "unknown"
    login_rate_limiter.check(client_host)
    username_matches = hmac.compare_digest(payload.username, settings.admin_username)
    password_matches = hmac.compare_digest(payload.password, settings.admin_password)
    if not username_matches or not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    token = create_access_token(username=settings.admin_username, role="admin")
    csrf_token = create_csrf_token()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.resolved_auth_cookie_secure,
        samesite=settings.resolved_auth_cookie_samesite,
        domain=settings.auth_cookie_domain,
        max_age=settings.auth_token_ttl_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        secure=settings.resolved_auth_cookie_secure,
        samesite=settings.resolved_auth_cookie_samesite,
        domain=settings.auth_cookie_domain,
        max_age=settings.auth_token_ttl_minutes * 60,
        path="/",
    )
    return AuthLoginResponse(
        session=AuthSessionResponse(
            is_authenticated=True,
            is_admin=True,
            username=settings.admin_username,
        ),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(_: None = Depends(require_csrf)) -> Response:
    settings = get_settings()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        key=settings.auth_cookie_name,
        domain=settings.auth_cookie_domain,
        path="/",
        secure=settings.resolved_auth_cookie_secure,
        samesite=settings.resolved_auth_cookie_samesite,
    )
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        domain=settings.auth_cookie_domain,
        path="/",
        secure=settings.resolved_auth_cookie_secure,
        samesite=settings.resolved_auth_cookie_samesite,
    )
    return response


def require_admin_write(
    _: AuthIdentity = Depends(require_admin),
    __: None = Depends(require_csrf),
) -> None:
    return None
