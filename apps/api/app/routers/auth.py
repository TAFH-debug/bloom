from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app import auth as auth_svc
from app import oauth as oauth_svc
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


# ── Google OAuth ────────────────────────────────────────────────────────

@router.post("/google/start", response_model=S.GoogleStartOut)
def google_start(db: DbSession = Depends(get_db)):
    """Begin a Google sign-in: returns the URL to open in a browser."""
    try:
        state, url = oauth_svc.build_authorization_url(db)
    except oauth_svc.OAuthError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return S.GoogleStartOut(state=state, authorizationUrl=url)


@router.get("/google/callback", response_class=HTMLResponse)
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: DbSession = Depends(get_db),
):
    """Google redirects the system browser here after consent."""
    entry = oauth_svc.flows.get(db, state) if state is not None else None
    if entry is None:
        return _callback_page(
            "This sign-in link is invalid or has expired.",
            "Close this window and try signing in again from Bloom.",
        )

    if error is not None:
        oauth_svc.flows.complete(
            db, state, {"status": "error", "message": "Google sign-in was cancelled."}
        )
        return _callback_page(
            "Sign-in cancelled.", "You can close this window and return to Bloom."
        )

    if not code:
        oauth_svc.flows.complete(
            db, state, {"status": "error", "message": "Google did not return a code."}
        )
        return _callback_page(
            "Something went wrong.", "Close this window and try again from Bloom."
        )

    try:
        tokens = await oauth_svc.exchange_code(code, entry["code_verifier"])
        claims = await oauth_svc.verify_id_token(tokens["id_token"])
        user = oauth_svc.upsert_google_user(db, claims, tokens)
        sess = auth_svc._create_session(db, user.id)
    except oauth_svc.OAuthError as exc:
        db.rollback()
        oauth_svc.flows.complete(db, state, {"status": "error", "message": str(exc)})
        return _callback_page(
            "Sign-in failed.", "Close this window and try again from Bloom."
        )
    except IntegrityError as exc:
        db.rollback()
        oauth_svc.flows.complete(
            db, state, {"status": "error", "message": "Could not create your account."}
        )
        return _callback_page(
            "Sign-in failed.", "Close this window and try again from Bloom."
        )

    oauth_svc.flows.complete(
        db,
        state,
        {
            "status": "done",
            "user": S.UserOut(id=user.id, name=user.name, email=user.email, image=user.image).model_dump(),
            "token": sess.token,
        },
    )
    return _callback_page(
        "You're signed in!", "You can close this window and return to Bloom."
    )


@router.get("/google/result", response_model=S.GoogleResult)
def google_result(state: str, db: DbSession = Depends(get_db)):
    """Polled by the app to pick up the finished sign-in."""
    if oauth_svc.flows.get(db, state) is not None:
        result = oauth_svc.flows.take_result(db, state)
        if result is None:
            return S.GoogleResult(status="pending")
        return S.GoogleResult(**result)
    raise HTTPException(
        status_code=410, detail="This sign-in request expired. Please try again."
    )


def _callback_page(title: str, sub: str) -> str:
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bloom</title>
    <style>
      :root {{ color-scheme: light; }}
      body {{
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: radial-gradient(1200px 600px at 50% -10%, #ffe4ec, transparent),
                    radial-gradient(900px 500px at 100% 100%, #ffd0de, transparent),
                    #f8f1ea;
        color: #44403c;
      }}
      .card {{
        max-width: 380px;
        text-align: center;
        padding: 40px 48px;
        border-radius: 24px;
        border: 1px solid rgba(244, 168, 190, 0.4);
        background: rgba(255, 255, 255, 0.7);
        box-shadow: 0 20px 50px -30px rgba(80, 40, 40, 0.45);
      }}
      .mark {{
        width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #f4a8be, #f7c4d4); color: #fff;
        font-size: 24px; font-weight: 700;
      }}
      h1 {{ margin: 0 0 8px; font-size: 20px; color: #292524; }}
      p {{ margin: 0; font-size: 14px; line-height: 1.5; color: #78716c; }}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="mark">&#10003;</div>
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
    <script>
      try {{ window.close(); }} catch (_) {{}}
    </script>
  </body>
</html>"""
