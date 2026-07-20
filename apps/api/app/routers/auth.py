from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response
from sqlalchemy.orm import Session as DbSession

from app import auth as auth_svc
from app import schemas as S
from app.deps import get_current_user, get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=auth_svc.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=auth_svc.COOKIE_MAX_AGE,
        path="/",
    )


@router.post("/signup", response_model=S.AuthResult)
def signup(body: S.SignupRequest, response: Response, db: DbSession = Depends(get_db)):
    try:
        user, sess = auth_svc.signup(
            db, name=body.name, email=body.email, password=body.password
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    _set_cookie(response, sess.token)
    return S.AuthResult(
        user=S.UserOut(
            id=user.id, name=user.name, email=user.email, image=user.image
        ),
        token=sess.token,
    )


@router.post("/login", response_model=S.AuthResult)
def login(body: S.LoginRequest, response: Response, db: DbSession = Depends(get_db)):
    try:
        user, sess = auth_svc.login(db, email=body.email, password=body.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    _set_cookie(response, sess.token)
    return S.AuthResult(
        user=S.UserOut(
            id=user.id, name=user.name, email=user.email, image=user.image
        ),
        token=sess.token,
    )


@router.post("/logout", response_model=S.MsgOut)
def logout(
    response: Response,
    db: DbSession = Depends(get_db),
    bloom_session: str | None = Cookie(None, alias=auth_svc.COOKIE_NAME),
    authorization: str | None = Header(None),
):
    token = bloom_session
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if token:
        auth_svc.delete_session(db, token)
    response.delete_cookie(auth_svc.COOKIE_NAME, path="/")
    return S.MsgOut()


@router.get("/me", response_model=S.UserOut)
def me(user: User = Depends(get_current_user)):
    return S.UserOut(id=user.id, name=user.name, email=user.email, image=user.image)
