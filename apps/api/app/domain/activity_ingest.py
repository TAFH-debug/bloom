"""Coalesce and persist activity segments, ported from src/lib/activity-ingest.ts."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import desc
from sqlalchemy.orm import Session as DbSession

from app.models import ActivitySegment


def _as_kind(v: str) -> str:
    return "idle" if v == "idle" else "app"


def _as_utc_naive(dt: datetime) -> datetime:
    """DB columns are naive UTC; strip tzinfo after converting to UTC."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _parse_iso(v: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(v.replace("Z", "+00:00"))
        return _as_utc_naive(parsed)
    except (ValueError, AttributeError):
        return None


def _db_utc_naive(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return _as_utc_naive(dt)


def _seg_key(kind: str, process_name: str | None, exe_path: str | None) -> str:
    if kind == "idle":
        return "idle"
    return f"{exe_path or ''}|{process_name or ''}"


def coalesce(segments: list[dict]) -> list[dict]:
    raw = sorted(segments, key=lambda s: s.get("startedAt", ""))
    merged: list[dict] = []
    for seg in raw:
        started = _parse_iso(seg.get("startedAt", ""))
        ended = _parse_iso(seg.get("endedAt", ""))
        if not started or not ended or ended <= started:
            continue
        kind = _as_kind(seg.get("kind", "app"))
        entry = {
            "id": (seg.get("id") or "").strip() or uuid4().hex,
            "startedAt": started,
            "endedAt": ended,
            "kind": kind,
            "processName": seg.get("processName") if kind == "app" else None,
            "appName": seg.get("appName") if kind == "app" else None,
            "exePath": seg.get("exePath") if kind == "app" else None,
        }
        prev = merged[-1] if merged else None
        if (
            prev
            and _seg_key(prev["kind"], prev.get("processName"), prev.get("exePath"))
            == _seg_key(kind, entry.get("processName"), entry.get("exePath"))
            and (entry["startedAt"] - prev["endedAt"]).total_seconds() <= 5
        ):
            if entry["endedAt"] > prev["endedAt"]:
                prev["endedAt"] = entry["endedAt"]
            if not prev.get("appName") and entry.get("appName"):
                prev["appName"] = entry["appName"]
            continue
        merged.append(entry)
    return merged


def ingest_for_user(db: DbSession, user_id: str, segments: list[dict]) -> dict:
    if not segments:
        return {"inserted": 0, "updated": 0}

    coalesced = coalesce(segments[:200])
    if not coalesced:
        return {"inserted": 0, "updated": 0}

    latest = (
        db.query(ActivitySegment)
        .filter(ActivitySegment.user_id == user_id)
        .order_by(desc(ActivitySegment.ended_at))
        .first()
    )

    rows: list[dict] = []
    updated = 0
    cursor = latest

    for seg in coalesced:
        started_at = seg["startedAt"]
        ended_at = seg["endedAt"]
        kind = seg["kind"]
        seg_id = seg["id"]
        cursor_ended = _db_utc_naive(cursor.ended_at) if cursor else None

        if cursor and cursor.id == seg_id:
            if cursor_ended is not None and ended_at > cursor_ended:
                cursor.ended_at = ended_at
                if kind == "app" and seg.get("appName"):
                    cursor.app_name = seg["appName"]
                updated += 1
            continue

        if (
            cursor
            and cursor_ended is not None
            and _seg_key(cursor.kind, cursor.process_name, cursor.exe_path)
            == _seg_key(kind, seg.get("processName"), seg.get("exePath"))
            and (started_at - cursor_ended).total_seconds() <= 5
        ):
            if ended_at > cursor_ended:
                cursor.ended_at = ended_at
                if kind == "app" and seg.get("appName"):
                    cursor.app_name = seg["appName"]
                updated += 1
            continue

        row = ActivitySegment(
            id=seg_id,
            user_id=user_id,
            started_at=started_at,
            ended_at=ended_at,
            kind=kind,
            process_name=(seg.get("processName") or "")[:256] or None if kind == "app" else None,
            app_name=(seg.get("appName") or "")[:512] or None if kind == "app" else None,
            exe_path=(seg.get("exePath") or "")[:1024] or None if kind == "app" else None,
        )
        db.merge(row)
        rows.append(row)
        cursor = row

    return {"inserted": len(rows), "updated": updated}
