"""SQLAlchemy models mapped to the existing Neon tables created by Drizzle."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    email_verified = Column(Boolean, nullable=False, server_default="false")
    image = Column(String, nullable=True)
    status_preset = Column(String, nullable=True)
    status_note = Column(String, nullable=True)
    status_updated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    habits = relationship("Habit", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False)


class Session(Base):
    __tablename__ = "session"

    id = Column(String, primary_key=True)
    expires_at = Column(DateTime, nullable=False)
    token = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="sessions")


class Account(Base):
    __tablename__ = "account"

    id = Column(String, primary_key=True)
    account_id = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    id_token = Column(String, nullable=True)
    access_token_expires_at = Column(DateTime, nullable=True)
    refresh_token_expires_at = Column(DateTime, nullable=True)
    scope = Column(String, nullable=True)
    password = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="accounts")


class Verification(Base):
    __tablename__ = "verification"

    id = Column(String, primary_key=True)
    identifier = Column(String, nullable=False)
    value = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, default=datetime.utcnow)


class Habit(Base):
    __tablename__ = "habits"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    frequency = Column(String, nullable=False, server_default="daily")
    times_per_period = Column(Integer, nullable=False, server_default="1")
    custom_every_days = Column(Integer, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="habits")
    completions = relationship("HabitCompletion", back_populates="habit", cascade="all, delete-orphan")


class HabitCompletion(Base):
    __tablename__ = "habit_completions"
    __table_args__ = (
        UniqueConstraint("habit_id", "completed_on", "slot", name="habit_completions_habit_day_slot_idx"),
    )

    id = Column(String, primary_key=True)
    habit_id = Column(String, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    completed_on = Column(Date, nullable=False)
    slot = Column(Integer, nullable=False, server_default="0")

    habit = relationship("Habit", back_populates="completions")


class GardenMember(Base):
    __tablename__ = "garden_members"
    __table_args__ = (
        UniqueConstraint("owner_id", "member_id", name="garden_members_owner_member_idx"),
    )

    id = Column(String, primary_key=True)
    owner_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id])
    member = relationship("User", foreign_keys=[member_id])


class GardenInvitation(Base):
    __tablename__ = "garden_invitations"
    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id", name="garden_invitations_from_to_pending_idx"),
    )

    id = Column(String, primary_key=True)
    from_user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    to_user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False, server_default="pending")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)

    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True)
    reminder_window_start = Column(Integer, nullable=False, server_default="9")
    reminder_window_end = Column(Integer, nullable=False, server_default="0")
    activity_tracking_enabled = Column(Boolean, nullable=False, server_default="false")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="preferences")


class ActivitySegment(Base):
    __tablename__ = "activity_segments"
    __table_args__ = (
        Index("activity_segments_user_started_idx", "user_id", "started_at"),
        Index("activity_segments_user_process_idx", "user_id", "process_name"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=False)
    kind = Column(String, nullable=False)
    process_name = Column(String, nullable=True)
    app_name = Column(String, nullable=True)
    exe_path = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
