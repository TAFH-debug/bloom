"""Google OAuth for the desktop app.

Flow: the desktop calls /auth/google/start, opens the returned URL in the
system browser, Google redirects to /auth/google/callback (registered in the
Google console), the API exchanges the code, then the desktop polls
/auth/google/result to pick up the session token.
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import threading
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.models import Account, User, Verification

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"

PENDING_TTL_SECONDS = 600

STATE_IDENTIFIER = "google"


class OAuthError(Exception):
    """Raised for any recoverable Google OAuth failure."""


def google_configured() -> bool:
    return bool(settings.google_client_id and _client_secret())


def _client_secret() -> str:
    """The secret may be a plain string or Google's downloaded JSON blob."""
    raw = (settings.google_client_secret or "").strip()
    if not raw:
        return ""
    if raw.startswith("{"):
        try:
            data = json.loads(raw)
            web = data.get("web") or data.get("installed") or {}
            return web.get("client_secret", "")
        except (ValueError, AttributeError):
            return ""
    return raw


def _pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


class PendingFlows:
    """Pending OAuth attempts keyed by `state`, stored in Postgres.

    Survives API restarts and works across multiple workers, unlike a
    per-process dict. Each row lives in the `verification` table and is
    dropped once the client picks up the result (or after it expires).
    """

    def __init__(self, ttl_seconds: int = PENDING_TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def _load(self, db: DbSession, state: str) -> Optional[Verification]:
        row = (
            db.query(Verification)
            .filter(Verification.id == state, Verification.identifier == STATE_IDENTIFIER)
            .first()
        )
        if row is None:
            return None
        if row.expires_at and datetime.utcnow() > row.expires_at:
            db.delete(row)
            return None
        return row

    def create(self, db: DbSession, state: str, code_verifier: str) -> None:
        with self._lock:
            value = json.dumps({"code_verifier": code_verifier, "result": None})
            db.merge(
                Verification(
                    id=state,
                    identifier=STATE_IDENTIFIER,
                    value=value,
                    expires_at=datetime.utcnow() + timedelta(seconds=self._ttl),
                )
            )

    def get(self, db: DbSession, state: str) -> Optional[dict]:
        with self._lock:
            row = self._load(db, state)
            if row is None:
                return None
            return json.loads(row.value)

    def complete(self, db: DbSession, state: str, payload: dict) -> None:
        with self._lock:
            row = self._load(db, state)
            if row is None:
                return
            data = json.loads(row.value)
            data["result"] = payload
            row.value = json.dumps(data)

    def take_result(self, db: DbSession, state: str) -> Optional[dict]:
        """Return the finished result once, then drop the flow."""
        with self._lock:
            row = self._load(db, state)
            if row is None:
                return None
            result = json.loads(row.value).get("result")
            db.delete(row)
            return result


flows = PendingFlows()


def build_authorization_url(db: DbSession) -> tuple[str, str]:
    """Create a pending flow and return (state, authorization_url)."""
    if not google_configured():
        raise OAuthError("Google sign-in is not configured on the server")
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(48)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": _pkce_challenge(verifier),
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    flows.create(db, state, verifier)
    return state, f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str, code_verifier: str) -> dict:
    """Trade the authorization code for tokens."""
    payload = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": _client_secret(),
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": code_verifier,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
    except httpx.HTTPError as exc:
        raise OAuthError("Could not reach Google to finish sign-in") from exc
    if resp.status_code != 200:
        raise OAuthError("Google rejected the sign-in request")
    return resp.json()


async def verify_id_token(id_token: str) -> dict:
    """Validate the id_token and return the profile claims."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                GOOGLE_TOKENINFO_URL, params={"id_token": id_token}
            )
    except httpx.HTTPError as exc:
        raise OAuthError("Could not verify Google sign-in") from exc
    if resp.status_code != 200:
        raise OAuthError("Google sign-in could not be verified")
    claims = resp.json()
    if claims.get("aud") != settings.google_client_id:
        raise OAuthError("Google sign-in did not match this app")
    if not claims.get("email"):
        raise OAuthError("Google did not return an email address")
    verified = claims.get("email_verified")
    if isinstance(verified, str):
        verified = verified.lower() == "true"
    if not verified:
        raise OAuthError(
            "Google could not verify this email address. "
            "Please verify it in your Google account and try again."
        )
    return claims


def upsert_google_user(db: DbSession, claims: dict, tokens: dict | None = None) -> User:
    """Find or create a user and link the Google account."""
    sub = str(claims["sub"])
    email = claims["email"].strip().lower()
    now = datetime.utcnow()

    account = (
        db.query(Account)
        .filter(Account.provider_id == "google", Account.account_id == sub)
        .first()
    )
    if account:
        user = db.query(User).filter(User.id == account.user_id).first()
        if user is None:
            raise OAuthError("Linked account is missing its user")
        return user

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        name = (claims.get("name") or email.split("@")[0]).strip() or "Gardener"
        user = User(
            id=uuid4().hex,
            name=name,
            email=email,
            email_verified=True,
            image=claims.get("picture"),
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.flush()
    else:
        # Link to the existing account (credential or another provider).
        if not user.email_verified:
            user.email_verified = True
        if not user.image:
            user.image = claims.get("picture")
        user.updated_at = now

    tokens = tokens or {}
    db.add(
        Account(
            id=uuid4().hex,
            account_id=sub,
            provider_id="google",
            user_id=user.id,
            access_token=tokens.get("access_token"),
            id_token=tokens.get("id_token"),
            refresh_token=tokens.get("refresh_token"),
            scope="openid email profile",
            created_at=now,
            updated_at=now,
        )
    )
    db.flush()
    return user
