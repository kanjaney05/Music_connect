from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class ServiceProfile(Base):
    __tablename__ = "service_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    instrument: Mapped[str] = mapped_column(String(80), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    rate: Mapped[str] = mapped_column(String(80), nullable=False, default="Available upon request")
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="Community musician available for local events.")
    phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(180), nullable=False, default="")
    contact: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    available_weekends: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class CommunityEvent(Base):
    __tablename__ = "community_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    organizer: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str] = mapped_column(String(160), nullable=False)
    event_date: Mapped[str] = mapped_column(String(40), nullable=False)
    requested_instruments: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    contact: Mapped[str] = mapped_column(String(180), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="Open", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class PerformanceRequest(Base):
    __tablename__ = "performance_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    other_event: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    musician_id: Mapped[int] = mapped_column(ForeignKey("service_profiles.id"), nullable=False)
    event_datetime: Mapped[str] = mapped_column(String(40), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
