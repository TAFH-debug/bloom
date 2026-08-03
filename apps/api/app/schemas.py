from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    image: Optional[str] = None

class AuthResult(BaseModel):
    user: UserOut
    token: str

class GoogleStartOut(BaseModel):
    state: str
    authorizationUrl: str

class GoogleResult(BaseModel):
    status: str
    user: Optional[UserOut] = None
    token: Optional[str] = None
    message: Optional[str] = None


# ── Habits ────────────────────────────────────────────────────────────

class HabitCreate(BaseModel):
    name: str
    frequency: str = "daily"
    timesPerPeriod: int = 1
    customEveryDays: Optional[int] = None

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    timesPerPeriod: Optional[int] = None
    customEveryDays: Optional[int] = None

class ToggleRequest(BaseModel):
    completedOn: Optional[str] = None
    slot: int = 0

class HabitSlotView(BaseModel):
    id: str
    name: str
    frequency: str
    timesPerPeriod: int
    customEveryDays: Optional[int] = None
    periodKey: str
    slots: list[bool]
    completedSlots: int
    week: list[bool]

class HabitsDashboard(BaseModel):
    habits: list[HabitSlotView]
    weekKeys: list[str]
    consistency: float
    streak: int
    today: str


# ── Garden ────────────────────────────────────────────────────────────

class DayScore(BaseModel):
    date: str
    score: Optional[float] = None

class GardenHabitStat(BaseModel):
    id: str
    name: str
    completedToday: bool
    completedSlots: int
    timesPerPeriod: int
    weekDone: int
    windowRate: float

class FocusTopApp(BaseModel):
    label: str
    durationMs: int

class GardenPerson(BaseModel):
    id: str
    memberId: str
    name: str
    email: str
    image: Optional[str] = None
    isSelf: bool
    habitCount: int
    completedToday: int
    consistency: float
    streak: int
    days: list[DayScore]
    habits: list[GardenHabitStat]
    focusActiveMs: int = 0
    focusIdleMs: int = 0
    focusTopApps: list[FocusTopApp] = []
    statusPreset: Optional[str] = None
    statusNote: Optional[str] = None
    statusUpdatedAt: Optional[str] = None

class GardenInvitationView(BaseModel):
    id: str
    fromUserId: str
    toUserId: str
    fromName: str
    fromEmail: str
    toName: str
    toEmail: str
    createdAt: str
    direction: str

class GardenDashboard(BaseModel):
    people: list[GardenPerson]
    guestCount: int
    maxGuests: int
    capacity: int
    incomingInvites: list[GardenInvitationView]
    outgoingInvites: list[GardenInvitationView]

class InviteRequest(BaseModel):
    email: EmailStr


# ── Status ────────────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    preset: Optional[str] = None
    note: Optional[str] = None

class StatusOut(BaseModel):
    statusPreset: Optional[str] = None
    statusNote: Optional[str] = None
    statusUpdatedAt: Optional[str] = None


# ── Preferences ───────────────────────────────────────────────────────

class PreferencesOut(BaseModel):
    reminderWindowStart: int
    reminderWindowEnd: int
    intervalHours: int
    activityTrackingEnabled: bool

class ReminderWindowUpdate(BaseModel):
    start: int
    end: int

class ActivityTrackingUpdate(BaseModel):
    enabled: bool


# ── Activity ──────────────────────────────────────────────────────────

class SegmentInput(BaseModel):
    id: str
    startedAt: str
    endedAt: str
    kind: str
    processName: Optional[str] = None
    appName: Optional[str] = None
    exePath: Optional[str] = None

class IngestRequest(BaseModel):
    segments: list[SegmentInput]

class AppBreakdownRow(BaseModel):
    key: str
    processName: Optional[str] = None
    appName: Optional[str] = None
    exePath: Optional[str] = None
    durationMs: int

class TimelineBlock(BaseModel):
    id: str
    kind: str
    startedAt: str
    endedAt: str
    durationMs: int
    processName: Optional[str] = None
    appName: Optional[str] = None

class ActivityDashboard(BaseModel):
    day: str
    activeMs: int
    idleMs: int
    apps: list[AppBreakdownRow]
    timeline: list[TimelineBlock]
    trackingEnabled: bool


# ── Calendar ──────────────────────────────────────────────────────────

class CalendarHabitDay(BaseModel):
    id: str
    name: str
    frequency: str
    timesPerPeriod: int
    due: bool
    periodKey: str
    slots: list[bool]
    completedSlots: int

class CalendarDayDigest(BaseModel):
    day: str
    habitScore: Optional[float] = None
    habits: list[CalendarHabitDay]
    days: list[DayScore]
    focus: ActivityDashboard


# ── Generic ───────────────────────────────────────────────────────────

class MsgOut(BaseModel):
    success: bool = True
    error: Optional[str] = None
