from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AuthUserBase(BaseModel):
    email: str = Field(min_length=5, max_length=180)
    password: str = Field(min_length=8, max_length=128)


class AuthUserPublic(BaseModel):
    email: str = Field(min_length=5, max_length=180)
    role: str = Field(min_length=4, max_length=40)


class AuthRegisterRequest(AuthUserBase):
    role: str = Field(min_length=4, max_length=40)


class AuthLoginRequest(AuthUserBase):
    pass


class AuthResetPasswordRequest(AuthUserBase):
    pass


class AuthUserRead(AuthUserPublic):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str


class AuthTokenResponse(AuthUserRead):
    access_token: str
    token_type: str = "bearer"


class ServiceProfileBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    instrument: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=40)
    email: str = Field(min_length=5, max_length=180)
    bio: str = Field(default="Community musician available for local events.", max_length=1000)
    rate: str = Field(default="Available upon request", max_length=80)
    preferred_event_type: str = Field(default="Any event", max_length=120)
    preferred_contact_method: str = Field(default="email", max_length=20)
    available_weekends: bool = True
    travel_buffer_minutes: int = Field(default=120, ge=0, le=720)


class ServiceProfileCreate(ServiceProfileBase):
    pass


class ServiceProfileUpsert(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    instrument: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=40)
    bio: str = Field(default="Community musician available for local events.", max_length=1000)
    rate: str = Field(default="Available upon request", max_length=80)
    preferred_event_type: str = Field(default="Any event", max_length=120)
    preferred_contact_method: str = Field(default="email", max_length=20)
    available_weekends: bool = True
    travel_buffer_minutes: int = Field(default=120, ge=0, le=720)


class ServiceProfileRead(ServiceProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_email: str

    full_name: str
    instrument: str
    city: str
    state: str
    phone: str
    email: str
    bio: str
    rate: str
    preferred_event_type: str
    preferred_contact_method: str
    available_weekends: bool
    travel_buffer_minutes: int


class AvailabilitySlotCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime


class AvailabilitySlotUpdate(BaseModel):
    starts_at: datetime
    ends_at: datetime


class AvailabilitySlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_profile_id: int
    starts_at: datetime
    ends_at: datetime
    is_reserved: bool
    reserved_by_request_id: Optional[int] = None


class AvailabilityDayRead(BaseModel):
    date: str
    slots: list[AvailabilitySlotRead]


class AvailabilityCalendarRead(BaseModel):
    provider_id: int
    travel_buffer_minutes: int
    timezone_label: str
    from_date: str
    to_date: str
    days: list[AvailabilityDayRead]


class CommunityEventBase(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    organizer: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=160)
    event_date: str = Field(min_length=4, max_length=40)
    requested_instruments: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=20, max_length=1000)
    contact: str = Field(min_length=3, max_length=180)
    status: str = Field(default="Open", max_length=40)


class CommunityEventCreate(CommunityEventBase):
    pass


class CommunityEventRead(CommunityEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class PerformanceRequestBase(BaseModel):
    event_type: str = Field(min_length=2, max_length=120)
    other_event: str = Field(default="", max_length=120)
    musician_id: int
    event_datetime: str = Field(min_length=5, max_length=40)
    notes: str = Field(default="", max_length=1000)


class PerformanceRequestCreate(PerformanceRequestBase):
    pass


class PerformanceRequestRead(PerformanceRequestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class DashboardResponse(BaseModel):
    musician_count: int
    event_count: int
    request_count: int
    community_impact_score: int


class ApiMessage(BaseModel):
    message: str
