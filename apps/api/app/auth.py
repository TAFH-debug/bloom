"""Password hashing, session creation / lookup, cookie helpers.

Existing Bloom users were created with Better Auth, which stores:
- account.provider_id = "credential"
- account.account_id = user.id (NOT email)
- account.password = "{salt_hex}:{key_hex}" via scrypt (N=16384, r=16, p=1, dkLen=64)
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import unicodedata
from datetime import datetime, timedelta
from uuid import uuid4

from passlib.context import CryptContext
from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.models import Account, Session, User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

COOKIE_NAME = "bloom_session"
COOKIE_MAX_AGE = settings.session_max_age_days * 86400

# Better Auth / @better-auth/utils/password defaults
_SCRYPT_N = 16384
_SCRYPT_R = 16
_SCRYPT_P = 1
_SCRYPT_DKLEN = 64
_SCRYPT_MAXMEM = 128 * _SCRYPT_N * _SCRYPT_R * 2


def _normalize(plain: str) -> bytes:
    return unicodedata.normalize("NFKC", plain).encode("utf-8")


def _hash_better_auth(plain: str) -> str:
    salt = secrets.token_bytes(16).hex()
    key = hashlib.scrypt(
        _normalize(plain),
        salt=salt.encode("utf-8"),
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
        maxmem=_SCRYPT_MAXMEM,
    )
    return f"{salt}:{key.hex()}"


def _verify_better_auth(plain: str, stored: str) -> bool:
    try:
        salt, key_hex = stored.split(":", 1)
    except ValueError:
        return False
    if not salt or not key_hex:
        return False
    try:
        target = bytes.fromhex(key_hex)
    except ValueError:
        return False
    derived = hashlib.scrypt(
        _normalize(plain),
        salt=salt.encode("utf-8"),
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
        maxmem=_SCRYPT_MAXMEM,
    )
    if len(derived) != len(target):
        return False
    return hmac.compare_digest(derived, target)


def hash_password(plain: str) -> str:
    """Hash new passwords in Better Auth–compatible scrypt form."""
    return _hash_better_auth(plain)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    # bcrypt (any FastAPI-era hashes)
    if hashed.startswith("$2a$") or hashed.startswith("$2b$") or hashed.startswith("$2y$"):
        try:
            return pwd.verify(plain, hashed)
        except Exception:
            return False
    # Better Auth scrypt: salt_hex:key_hex
    if ":" in hashed:
        try:
            return _verify_better_auth(plain, hashed)
        except Exception:
            return False
    return False


def signup(db: DbSession, *, name: str, email: str, password: str) -> tuple[User, Session]:
    email_lower = email.strip().lower()

    existing = db.query(User).filter(User.email == email_lower).first()
    if existing:
        raise ValueError("Email already registered")

    now = datetime.utcnow()
    user_id = uuid4().hex
    user = User(
        id=user_id,
        name=name.strip(),
        email=email_lower,
        created_at=now,
        updated_at=now,
    )
    db.add(user)

    # Mirror Better Auth: account_id == user.id for credential provider
    acct = Account(
        id=uuid4().hex,
        account_id=user_id,
        provider_id="credential",
        user_id=user_id,
        password=hash_password(password),
        created_at=now,
        updated_at=now,
    )
    db.add(acct)
    db.flush()

    sess = _create_session(db, user.id)
    return user, sess


def login(db: DbSession, *, email: str, password: str) -> tuple[User, Session]:
    email_lower = email.strip().lower()
    user = db.query(User).filter(User.email == email_lower).first()
    if not user:
        raise ValueError("Invalid email or password")

    acct = (
        db.query(Account)
        .filter(Account.provider_id == "credential", Account.user_id == user.id)
        .first()
    )
    if not acct or not acct.password:
        raise ValueError("Invalid email or password")
    if not verify_password(password, acct.password):
        raise ValueError("Invalid email or password")

    sess = _create_session(db, user.id)
    return user, sess


def _create_session(db: DbSession, user_id: str) -> Session:
    now = datetime.utcnow()
    sess = Session(
        id=uuid4().hex,
        token=uuid4().hex,
        user_id=user_id,
        expires_at=now + timedelta(days=settings.session_max_age_days),
        created_at=now,
        updated_at=now,
    )
    db.add(sess)
    db.flush()
    return sess


def resolve_session(db: DbSession, token: str) -> Session | None:
    sess = db.query(Session).filter(Session.token == token).first()
    if not sess:
        return None
    if sess.expires_at < datetime.utcnow():
        db.delete(sess)
        db.flush()
        return None
    return sess


def delete_session(db: DbSession, token: str) -> None:
    db.query(Session).filter(Session.token == token).delete()
    db.flush()
