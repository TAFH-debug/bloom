"""In-process registry of open WebSockets keyed by user id."""

from __future__ import annotations

import json
from typing import Any

from fastapi import WebSocket


class RealtimeHub:
    def __init__(self) -> None:
        self._by_user: dict[str, set[WebSocket]] = {}

    def register(self, user_id: str, ws: WebSocket) -> None:
        self._by_user.setdefault(user_id, set()).add(ws)

    def unregister(self, user_id: str, ws: WebSocket) -> None:
        s = self._by_user.get(user_id)
        if not s:
            return
        s.discard(ws)
        if not s:
            del self._by_user[user_id]

    async def send(self, ws: WebSocket, msg: dict[str, Any]) -> None:
        try:
            await ws.send_text(json.dumps(msg))
        except Exception:
            pass

    async def publish(self, user_id: str, msg: dict[str, Any]) -> None:
        sockets = self._by_user.get(user_id)
        if not sockets:
            return
        raw = json.dumps(msg)
        for ws in list(sockets):
            try:
                await ws.send_text(raw)
            except Exception:
                pass

    async def publish_all(self, user_ids: list[str], msg: dict[str, Any]) -> None:
        seen: set[str] = set()
        for uid in user_ids:
            if uid in seen:
                continue
            seen.add(uid)
            await self.publish(uid, msg)


hub = RealtimeHub()
