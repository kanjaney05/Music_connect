from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import CommunityEvent, PerformanceRequest, ServiceProfile
from .schemas import (
    ApiMessage,
    CommunityEventCreate,
    CommunityEventRead,
    DashboardResponse,
    PerformanceRequestCreate,
    PerformanceRequestRead,
    ServiceProfileCreate,
    ServiceProfileRead,
)

app = FastAPI(title="Music Connect API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_service_profile_columns()
    with Session(engine) as session:
        backfill_service_profiles(session)
        service_count = session.scalar(select(func.count()).select_from(ServiceProfile)) or 0
        event_count = session.scalar(select(func.count()).select_from(CommunityEvent)) or 0
        request_count = session.scalar(select(func.count()).select_from(PerformanceRequest)) or 0
        if service_count == 0:
            session.add_all(
                [
                    ServiceProfile(
                        full_name="Ava Morgan",
                        instrument="Piano",
                        city="Brooklyn, NY",
                        state="NY",
                        bio="Classically trained pianist available for community dinners, library evenings, and youth showcases.",
                        rate="$180 per event",
                        phone="(555) 013-2048",
                        email="ava@example.com",
                        contact="(555) 013-2048 | ava@example.com",
                        available_weekends=True,
                    ),
                    ServiceProfile(
                        full_name="Noah Patel",
                        instrument="Violin",
                        city="Jersey City, NJ",
                        state="NJ",
                        bio="Warm solo violin sets for neighborhood markets, nonprofit galas, and outdoor gatherings.",
                        rate="$150 per event",
                        phone="(555) 015-7781",
                        email="noah@example.com",
                        contact="(555) 015-7781 | noah@example.com",
                        available_weekends=True,
                    ),
                ]
            )
        if event_count == 0:
            session.add_all(
                [
                    CommunityEvent(
                        title="Sunset Community Picnic",
                        organizer="Greenfield Block Association",
                        location="Riverside Park",
                        event_date="2026-08-14",
                        requested_instruments="Piano, acoustic guitar",
                        description="We are looking for relaxed live music to open the picnic and close the evening on a calm note.",
                        contact="events@greenfield.org",
                        status="Open",
                    ),
                    CommunityEvent(
                        title="Library Family Night",
                        organizer="Westside Library",
                        location="Westside Library Hall",
                        event_date="2026-08-22",
                        requested_instruments="Piano, strings",
                        description="A welcoming performance slot for families, storytelling, and a short community singalong.",
                        contact="library@westside.org",
                        status="Open",
                    ),
                ]
            )
        if request_count == 0:
            session.add(
                PerformanceRequest(
                    event_type="Community celebration",
                    other_event="",
                    musician_id=1,
                    event_datetime="2026-08-30T18:00",
                    notes="Please bring a light acoustic set for the opening hour.",
                )
            )
        session.commit()


def ensure_service_profile_columns() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("service_profiles"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("service_profiles")}
    with engine.begin() as connection:
        if "state" not in existing_columns:
            connection.execute(text("ALTER TABLE service_profiles ADD COLUMN state VARCHAR(80) NOT NULL DEFAULT ''"))
        if "phone" not in existing_columns:
            connection.execute(text("ALTER TABLE service_profiles ADD COLUMN phone VARCHAR(40) NOT NULL DEFAULT ''"))
        if "email" not in existing_columns:
            connection.execute(text("ALTER TABLE service_profiles ADD COLUMN email VARCHAR(180) NOT NULL DEFAULT ''"))


def backfill_service_profiles(session: Session) -> None:
    profiles = session.scalars(select(ServiceProfile)).all()
    for profile in profiles:
        if not profile.state.strip():
            if "Brooklyn" in profile.city:
                profile.state = "NY"
            elif "Jersey City" in profile.city:
                profile.state = "NJ"
            else:
                profile.state = "NY"

        if not profile.phone.strip() or not profile.email.strip():
            contact_parts = [part.strip() for part in profile.contact.split('|')]
            if len(contact_parts) >= 2:
                if not profile.phone.strip():
                    profile.phone = contact_parts[0]
                if not profile.email.strip():
                    profile.email = contact_parts[-1]
            else:
                if not profile.phone.strip():
                    profile.phone = '(555) 000-0000'
                if not profile.email.strip():
                    profile.email = contact_parts[0] if '@' in contact_parts[0] else 'musician@example.com'


@app.get("/api/health", response_model=ApiMessage)
def health() -> ApiMessage:
    return ApiMessage(message="Music Connect API is running")


@app.get("/api/dashboard", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_db)) -> DashboardResponse:
    musician_count = db.scalar(select(func.count()).select_from(ServiceProfile)) or 0
    event_count = db.scalar(select(func.count()).select_from(CommunityEvent)) or 0
    request_count = db.scalar(select(func.count()).select_from(PerformanceRequest)) or 0
    return DashboardResponse(
        musician_count=musician_count,
        event_count=event_count,
        request_count=request_count,
        community_impact_score=musician_count * 12 + event_count * 8 + request_count * 10,
    )


@app.get("/api/musicians", response_model=list[ServiceProfileRead])
def list_musicians(db: Session = Depends(get_db)) -> list[ServiceProfile]:
    statement = select(ServiceProfile).order_by(ServiceProfile.created_at.desc())
    return list(db.scalars(statement))


@app.get("/api/services", response_model=list[ServiceProfileRead])
def list_services(db: Session = Depends(get_db)) -> list[ServiceProfile]:
    return list_musicians(db)


@app.post("/api/musicians", response_model=ServiceProfileRead, status_code=201)
def create_musician(payload: ServiceProfileCreate, db: Session = Depends(get_db)) -> ServiceProfile:
    data = payload.model_dump()
    musician = ServiceProfile(
        full_name=data["full_name"],
        instrument=data["instrument"],
        city=data["city"],
        state=data["state"],
        bio=data.get("bio") or "Community musician available for local events.",
        rate=data.get("rate") or "Available upon request",
        phone=data["phone"],
        email=data["email"],
        contact=f"{data['phone']} | {data['email']}",
        available_weekends=data.get("available_weekends", True),
    )
    db.add(musician)
    db.commit()
    db.refresh(musician)
    return musician


@app.post("/api/services", response_model=ServiceProfileRead, status_code=201)
def create_service(payload: ServiceProfileCreate, db: Session = Depends(get_db)) -> ServiceProfile:
    return create_musician(payload, db)


@app.get("/api/events", response_model=list[CommunityEventRead])
def list_events(db: Session = Depends(get_db)) -> list[CommunityEvent]:
    statement = select(CommunityEvent).order_by(CommunityEvent.created_at.desc())
    return list(db.scalars(statement))


@app.post("/api/events", response_model=CommunityEventRead, status_code=201)
def create_event(payload: CommunityEventCreate, db: Session = Depends(get_db)) -> CommunityEvent:
    event = CommunityEvent(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@app.get("/api/performance-requests", response_model=list[PerformanceRequestRead])
def list_performance_requests(db: Session = Depends(get_db)) -> list[PerformanceRequest]:
    statement = select(PerformanceRequest).order_by(PerformanceRequest.created_at.desc())
    return list(db.scalars(statement))


@app.post("/api/performance-requests", response_model=PerformanceRequestRead, status_code=201)
def create_performance_request(
    payload: PerformanceRequestCreate, db: Session = Depends(get_db)
) -> PerformanceRequest:
    musician = db.get(ServiceProfile, payload.musician_id)
    if musician is None:
        raise HTTPException(status_code=404, detail="Musician not found")

    performance_request = PerformanceRequest(**payload.model_dump())
    db.add(performance_request)
    db.commit()
    db.refresh(performance_request)
    return performance_request


@app.get("/api/services/{service_id}", response_model=ServiceProfileRead)
def get_service(service_id: int, db: Session = Depends(get_db)) -> ServiceProfile:
    service = db.get(ServiceProfile, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service profile not found")
    return service


@app.get("/api/events/{event_id}", response_model=CommunityEventRead)
def get_event(event_id: int, db: Session = Depends(get_db)) -> CommunityEvent:
    event = db.get(CommunityEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Community event not found")
    return event
