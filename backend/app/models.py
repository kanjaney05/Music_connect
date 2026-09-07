from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class ServiceProfile(Base):
    __tablename__ = "service_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_email: Mapped[str] = mapped_column(String(180), nullable=False, default="")
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    instrument: Mapped[str] = mapped_column(String(80), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    rate: Mapped[str] = mapped_column(String(80), nullable=False, default="Available upon request")
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="Community musician available for local events.")
    phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(180), nullable=False, default="")
    contact: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    preferred_event_type: Mapped[str] = mapped_column(String(120), nullable=False, default="Any event")
    preferred_contact_method: Mapped[str] = mapped_column(String(20), nullable=False, default="email")
    available_weekends: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    travel_buffer_minutes: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SupportIssue(Base):
    __tablename__ = "support_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_email: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    user_role: Mapped[str] = mapped_column(String(40), nullable=False)
    subject: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="Open")
    admin_reply: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


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
    requester_email: Mapped[str] = mapped_column(String(180), nullable=False, default="", index=True)
    musician_id: Mapped[Optional[int]] = mapped_column(ForeignKey("service_profiles.id"), nullable=True)
    preferred_instrument: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    event_datetime: Mapped[str] = mapped_column(String(40), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class ServiceProviderRating(Base):
    __tablename__ = "service_provider_ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("service_profiles.id"), nullable=False, index=True)
    rater_email: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    service_profile_id: Mapped[int] = mapped_column(ForeignKey("service_profiles.id"), nullable=False, index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_reserved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reserved_by_request_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reserved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
