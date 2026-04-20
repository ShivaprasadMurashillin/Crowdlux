import os
from functools import lru_cache

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

bearer_scheme = HTTPBearer(auto_error=False)


def _csv_env(name: str) -> set[str]:
    raw = os.getenv(name, "")
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


@lru_cache(maxsize=1)
def _admin_emails() -> set[str]:
    defaults = {"admin@crowdlux.com", "admin@admin.com"}
    return defaults.union(_csv_env("ADMIN_EMAILS"))


@lru_cache(maxsize=1)
def _staff_emails() -> set[str]:
    defaults = {"staff@admin.com"}
    return defaults.union(_csv_env("STAFF_EMAILS"))


def _decode_bearer_token(credentials: HTTPAuthorizationCredentials | None) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token")

    token = (credentials.credentials or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired authorization token")


def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    return _decode_bearer_token(credentials)


def require_staff_or_admin(user: dict = Depends(get_authenticated_user)) -> dict:
    email = (user.get("email") or "").lower()
    role = (user.get("role") or "").lower()
    is_admin_claim = bool(user.get("admin"))

    if is_admin_claim or role in {"admin", "staff"}:
        return user

    if email in _admin_emails() or email in _staff_emails() or email.startswith("staff"):
        return user

    raise HTTPException(status_code=403, detail="Staff or admin privileges required")


def require_admin(user: dict = Depends(get_authenticated_user)) -> dict:
    email = (user.get("email") or "").lower()
    role = (user.get("role") or "").lower()
    is_admin_claim = bool(user.get("admin"))

    if is_admin_claim or role == "admin" or email in _admin_emails():
        return user

    raise HTTPException(status_code=403, detail="Admin privileges required")
