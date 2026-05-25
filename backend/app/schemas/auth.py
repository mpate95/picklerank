from pydantic import BaseModel


class AuthSessionResponse(BaseModel):
    is_authenticated: bool
    is_admin: bool
    username: str | None


class AuthLoginRequest(BaseModel):
    username: str
    password: str


class AuthLoginResponse(BaseModel):
    session: AuthSessionResponse
