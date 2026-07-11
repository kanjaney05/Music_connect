from pydantic import BaseModel, ConfigDict, Field


class ServiceProfileBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    instrument: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=40)
    email: str = Field(min_length=5, max_length=180)
    bio: str = Field(default="Community musician available for local events.", max_length=1000)
    rate: str = Field(default="Available upon request", max_length=80)
    available_weekends: bool = True


class ServiceProfileCreate(ServiceProfileBase):
    pass


class ServiceProfileRead(ServiceProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

    full_name: str
    instrument: str
    city: str
    state: str
    phone: str
    email: str
    bio: str
    rate: str
    available_weekends: bool


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
