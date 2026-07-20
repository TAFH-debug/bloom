"""Server / client message shapes matching src/lib/realtime/protocol.ts."""

from __future__ import annotations

import json
from typing import Any


def decode_client_message(raw: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(parsed, dict) or parsed.get("type") != "activity-ingest":
        return None
    data = parsed.get("data")
    if not isinstance(data, dict):
        return None
    segments = data.get("segments")
    if not isinstance(segments, list):
        return None
    return {"type": "activity-ingest", "segments": segments}
