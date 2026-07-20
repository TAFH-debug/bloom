"""FastAPI dependencies: DB session and current-user resolution."""

from typing import Generator

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.auth import COOKIE_NAME, resolve_session
from app.db import SessionLocal
from app.models import User


def get_db() -> Generator[DbSession, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_current_user(
    db: DbSession = Depends(get_db),
    bloom_session: str | None = Cookie(None, alias=COOKIE_NAME),
    authorization: str | None = Header(None),
) -> User:
    token = bloom_session
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    sess = resolve_session(db, token)
    if not sess:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        )
    user = db.query(User).filter(User.id == sess.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user
