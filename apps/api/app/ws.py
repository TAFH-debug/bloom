"""WebSocket endpoint: authenticates via bloom_session cookie, sends hello +
preferences on connect, handles activity-ingest upstream messages."""

import anyio
from fastapi import WebSocket, WebSocketDisconnect

from app.auth import COOKIE_NAME, resolve_session
from app.db import SessionLocal
from app.domain.activity_ingest import ingest_for_user
from app.models import UserPreferences
from app.realtime.hub import hub
from app.realtime.protocol import decode_client_message


def _ingest_sync(user_id: str, segments: list) -> dict:
    db = SessionLocal()
    try:
        result = ingest_for_user(db, user_id, segments)
        db.commit()
        return result
    except Exception:
        db.rollback()
        return {"inserted": 0, "updated": 0}
    finally:
        db.close()


async def websocket_endpoint(ws: WebSocket) -> None:
    token = ws.cookies.get(COOKIE_NAME) or ws.query_params.get("token")
    if not token:
        await ws.close(code=4001, reason="Missing session")
        return

    db = SessionLocal()
    try:
        sess = resolve_session(db, token)
        if not sess:
            await ws.close(code=4001, reason="Invalid or expired session")
            return
        user_id = sess.user_id

        prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
        tracking = prefs.activity_tracking_enabled if prefs else False
    finally:
        db.close()

    await ws.accept()
    hub.register(user_id, ws)

    try:
        await hub.send(ws, {"type": "hello", "data": {"userId": user_id}})
        await hub.send(ws, {
            "type": "preferences",
            "data": {"activityTrackingEnabled": tracking},
        })

        while True:
            raw = await ws.receive_text()
            msg = decode_client_message(raw)
            if not msg:
                continue

            if msg["type"] == "activity-ingest":
                result = await anyio.to_thread.run_sync(
                    _ingest_sync, user_id, msg["segments"],
                )
                await hub.send(ws, {
                    "type": "activity-ingested",
                    "data": {
                        "inserted": result.get("inserted", 0),
                        "updated": result.get("updated", 0),
                    },
                })
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        hub.unregister(user_id, ws)
