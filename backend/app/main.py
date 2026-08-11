import os
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Optional

import jwt
from passlib.context import CryptContext
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import AvailabilitySlot, CommunityEvent, PerformanceRequest, ServiceProfile, User
from .schemas import (
    AvailabilityCalendarRead,
    AvailabilityDayRead,
    AvailabilitySlotCreate,
    AvailabilitySlotUpdate,
    AvailabilitySlotRead,
    ApiMessage,
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthTokenResponse,
    AuthUserRead,
    AuthResetPasswordRequest,
    CommunityEventCreate,
    CommunityEventRead,
    DashboardResponse,
    PerformanceRequestCreate,
    PerformanceRequestRead,
    ServiceProfileCreate,
    ServiceProfileRead,
    ServiceProfileUpsert,
)

app = FastAPI(title="Music Connect API", version="1.0.0")

ADMIN_EMAIL = "kanjaney05@gmail.com"
ADMIN_INITIAL_PASSWORD = os.environ.get("MUSIC_CONNECT_ADMIN_PASSWORD", "MusicConnectAdmin@2026")
ALLOWED_ROLES = {"ADMIN", "SERV-PROVIDER", "CONSUMER"}
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 24 * 60
AVAILABILITY_WINDOW_DAYS = 30
PASSWORD_CONTEXT = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
FRONTEND_DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def load_environment_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_environment_file()
JWT_SECRET = os.environ.get("MUSIC_CONNECT_JWT_SECRET", "music-connect-dev-secret")


def get_allowed_origins() -> list[str]:
    origins = os.environ.get("MUSIC_CONNECT_CORS_ORIGINS")
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]

    return ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_user_columns()
    ensure_service_profile_columns()
    ensure_availability_slot_columns()
    with Session(engine) as session:
        ensure_admin_user(session)
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
                        preferred_event_type="Community celebration",
                        preferred_contact_method="email",
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
                        preferred_event_type="Wedding",
                        preferred_contact_method="phone",
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


def ensure_admin_user(session: Session) -> None:
    admin = session.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if admin is None:
        session.add(
            User(
                email=ADMIN_EMAIL,
                role="ADMIN",
                password_hash=hash_password(ADMIN_INITIAL_PASSWORD),
            )
        )
        session.commit()
        return

    if admin.role != "ADMIN":
        admin.role = "ADMIN"

    if not admin.password_hash.strip():
        admin.password_hash = hash_password(ADMIN_INITIAL_PASSWORD)

    session.commit()


def ensure_user_columns() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        if "password_hash" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''"))


def hash_password(password: str) -> str:
    return PASSWORD_CONTEXT.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    if not password_hash.strip():
        return False

    return PASSWORD_CONTEXT.verify(plain_password, password_hash)


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
        if "preferred_event_type" not in existing_columns:
            connection.execute(text("ALTER TABLE service_profiles ADD COLUMN preferred_event_type VARCHAR(120) NOT NULL DEFAULT 'Any event'"))
        if "preferred_contact_method" not in existing_columns:
            connection.execute(text("ALTER TABLE service_profiles ADD COLUMN preferred_contact_method VARCHAR(20) NOT NULL DEFAULT 'email'"))
        if "travel_buffer_minutes" not in existing_columns:
            connection.execute(text("ALTER TABLE service_profiles ADD COLUMN travel_buffer_minutes INTEGER NOT NULL DEFAULT 120"))


def ensure_availability_slot_columns() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("availability_slots"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("availability_slots")}
    with engine.begin() as connection:
        if "is_reserved" not in existing_columns:
            connection.execute(text("ALTER TABLE availability_slots ADD COLUMN is_reserved BOOLEAN NOT NULL DEFAULT 0"))
        if "reserved_by_request_id" not in existing_columns:
            connection.execute(text("ALTER TABLE availability_slots ADD COLUMN reserved_by_request_id INTEGER"))
        if "reserved_at" not in existing_columns:
            connection.execute(text("ALTER TABLE availability_slots ADD COLUMN reserved_at DATETIME"))


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

        if not profile.preferred_event_type.strip():
            profile.preferred_event_type = 'Any event'

        if profile.preferred_contact_method.strip().lower() not in {'email', 'phone'}:
            profile.preferred_contact_method = 'email'


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_timezone_label() -> str:
    tz_name = datetime.now().astimezone().tzname()
    return tz_name or "Local time"


def get_calendar_window(days: int = AVAILABILITY_WINDOW_DAYS) -> tuple[date, date]:
    safe_days = max(1, min(days, AVAILABILITY_WINDOW_DAYS))
    start_date = datetime.now().date()
    end_date = start_date + timedelta(days=safe_days - 1)
    return start_date, end_date


def normalize_slot_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None, second=0, microsecond=0)

    return value.replace(second=0, microsecond=0)


def find_conflicting_slot(
    db: Session,
    provider_id: int,
    starts_at: datetime,
    ends_at: datetime,
    travel_buffer_minutes: int,
    ignore_slot_id: Optional[int] = None,
) -> Optional[AvailabilitySlot]:
    existing_slots = db.scalars(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.service_profile_id == provider_id)
        .order_by(AvailabilitySlot.starts_at.asc())
    ).all()
    buffer_delta = timedelta(minutes=max(travel_buffer_minutes, 0))

    for slot in existing_slots:
        if ignore_slot_id is not None and slot.id == ignore_slot_id:
            continue

        if starts_at < slot.ends_at + buffer_delta and ends_at > slot.starts_at - buffer_delta:
            return slot

    return None


def build_availability_calendar(
    db: Session,
    provider_id: int,
    travel_buffer_minutes: int,
    days: int = AVAILABILITY_WINDOW_DAYS,
    include_reserved: bool = True,
) -> AvailabilityCalendarRead:
    start_date, end_date = get_calendar_window(days)
    window_start = datetime.combine(start_date, time.min)
    window_end = datetime.combine(end_date + timedelta(days=1), time.min)

    statement = (
        select(AvailabilitySlot)
        .where(AvailabilitySlot.service_profile_id == provider_id)
        .where(AvailabilitySlot.starts_at >= window_start)
        .where(AvailabilitySlot.starts_at < window_end)
        .order_by(AvailabilitySlot.starts_at.asc())
    )
    if not include_reserved:
        statement = statement.where(AvailabilitySlot.is_reserved.is_(False))

    slots = list(db.scalars(statement))

    slots_by_day: dict[str, list[AvailabilitySlotRead]] = {}
    for slot in slots:
        day_key = slot.starts_at.date().isoformat()
        slots_by_day.setdefault(day_key, []).append(AvailabilitySlotRead.model_validate(slot))

    days_payload: list[AvailabilityDayRead] = []
    for offset in range((end_date - start_date).days + 1):
        day = start_date + timedelta(days=offset)
        day_key = day.isoformat()
        days_payload.append(AvailabilityDayRead(date=day_key, slots=slots_by_day.get(day_key, [])))

    return AvailabilityCalendarRead(
        provider_id=provider_id,
        travel_buffer_minutes=travel_buffer_minutes,
        timezone_label=get_timezone_label(),
        from_date=start_date.isoformat(),
        to_date=end_date.isoformat(),
        days=days_payload,
    )


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    payload = {
        "sub": user.email,
        "role": user.role,
        "uid": user.id,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def serialize_user(user: User) -> AuthUserRead:
    return AuthUserRead.model_validate(user)


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.scalar(select(User).where(User.email == normalize_email(email)))


def get_service_profile_by_email(session: Session, email: str) -> Optional[ServiceProfile]:
    return session.scalar(select(ServiceProfile).where(ServiceProfile.email == normalize_email(email)))


def get_current_user(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> User:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token_prefix = "Bearer "
    if not authorization.startswith(token_prefix):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization scheme")

    token = authorization[len(token_prefix) :].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")

    return user


def require_roles(*allowed_roles: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role == "ADMIN":
            return user

        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this resource")

        return user

    return dependency


@app.get("/api/health", response_model=ApiMessage)
def health() -> ApiMessage:
    return ApiMessage(message="Music Connect API is running")


@app.post("/api/auth/register", response_model=AuthTokenResponse, status_code=201)
def register_user(payload: AuthRegisterRequest, db: Session = Depends(get_db)) -> AuthTokenResponse:
    normalized_email = normalize_email(payload.email)
    requested_role = payload.role.upper()
    password_hash = hash_password(payload.password)

    if requested_role not in ALLOWED_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported role")

    if normalized_email == ADMIN_EMAIL:
        role = "ADMIN"
    elif requested_role == "ADMIN":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only the admin email can register as ADMIN")
    else:
        role = requested_role

    user = get_user_by_email(db, normalized_email)
    if user is None:
        user = User(email=normalized_email, role=role, password_hash=password_hash)
        db.add(user)
    else:
        user.role = role
        user.password_hash = password_hash

    db.commit()
    db.refresh(user)
    token = create_access_token(user)
    user_data = serialize_user(user)
    return AuthTokenResponse(**user_data.model_dump(), access_token=token)


@app.post("/api/auth/login", response_model=AuthTokenResponse)
def login_user(payload: AuthLoginRequest, db: Session = Depends(get_db)) -> AuthTokenResponse:
    normalized_email = normalize_email(payload.email)
    user = get_user_by_email(db, normalized_email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")

    if normalized_email == ADMIN_EMAIL:
        user.role = "ADMIN"
        db.commit()
        db.refresh(user)

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user)
    user_data = serialize_user(user)
    return AuthTokenResponse(**user_data.model_dump(), access_token=token)


@app.post("/api/auth/reset-password", response_model=ApiMessage)
def reset_password(payload: AuthResetPasswordRequest, db: Session = Depends(get_db)) -> ApiMessage:
    normalized_email = normalize_email(payload.email)
    user = get_user_by_email(db, normalized_email)

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown user")

    user.password_hash = hash_password(payload.password)
    db.commit()

    return ApiMessage(message="Password updated. You can sign in with your new password.")


@app.get("/api/auth/me", response_model=AuthUserRead)
def read_current_user(user: User = Depends(get_current_user)) -> User:
    return user


@app.get("/api/dashboard", response_model=DashboardResponse)
def dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardResponse:
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
def list_musicians(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("CONSUMER")),
) -> list[ServiceProfile]:
    statement = select(ServiceProfile).order_by(ServiceProfile.created_at.desc())
    return list(db.scalars(statement))


@app.get("/api/services", response_model=list[ServiceProfileRead])
def list_services(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("CONSUMER")),
) -> list[ServiceProfile]:
    statement = select(ServiceProfile).order_by(ServiceProfile.created_at.desc())
    return list(db.scalars(statement))


@app.post("/api/musicians", response_model=ServiceProfileRead, status_code=201)
def create_musician(
    payload: ServiceProfileCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> ServiceProfile:
    musician = build_musician(payload)
    db.add(musician)
    db.commit()
    db.refresh(musician)
    return musician


@app.post("/api/services", response_model=ServiceProfileRead, status_code=201)
def create_service(
    payload: ServiceProfileCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> ServiceProfile:
    musician = build_musician(payload)
    db.add(musician)
    db.commit()
    db.refresh(musician)
    return musician


@app.get("/api/service-profile/me", response_model=ServiceProfileRead)
def read_own_service_profile(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> ServiceProfile:
    profile = get_service_profile_by_email(db, user.email)
    if profile is None:
        raise HTTPException(status_code=404, detail="Service profile not found")

    return profile


@app.put("/api/service-profile/me", response_model=ServiceProfileRead)
def upsert_own_service_profile(
    payload: ServiceProfileUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> ServiceProfile:
    profile = get_service_profile_by_email(db, user.email)
    data = payload.model_dump()

    if profile is None:
        profile = ServiceProfile(email=normalize_email(user.email), contact=f"{data['phone']} | {user.email}")
        db.add(profile)

    profile.full_name = data["full_name"]
    profile.instrument = data["instrument"]
    profile.city = data["city"]
    profile.state = data["state"]
    profile.phone = data["phone"]
    profile.email = normalize_email(user.email)
    profile.contact = f"{data['phone']} | {user.email}"
    profile.bio = data.get("bio") or "Community musician available for local events."
    profile.rate = data.get("rate") or "Available upon request"
    profile.preferred_event_type = data.get("preferred_event_type", "Any event")
    profile.preferred_contact_method = data.get("preferred_contact_method", "email")
    profile.available_weekends = data.get("available_weekends", True)
    profile.travel_buffer_minutes = data.get("travel_buffer_minutes", 120)

    db.commit()
    db.refresh(profile)
    return profile


@app.get("/api/service-profile/me/availability-calendar", response_model=AvailabilityCalendarRead)
def read_own_availability_calendar(
    days: int = AVAILABILITY_WINDOW_DAYS,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> AvailabilityCalendarRead:
    profile = get_service_profile_by_email(db, user.email)
    if profile is None:
        raise HTTPException(status_code=404, detail="Service profile not found")

    return build_availability_calendar(db, profile.id, profile.travel_buffer_minutes, days=days)


@app.post("/api/service-profile/me/availability", response_model=AvailabilitySlotRead, status_code=201)
def create_own_availability_slot(
    payload: AvailabilitySlotCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> AvailabilitySlot:
    profile = get_service_profile_by_email(db, user.email)
    if profile is None:
        raise HTTPException(status_code=404, detail="Create your service profile before adding availability")

    starts_at = normalize_slot_datetime(payload.starts_at)
    ends_at = normalize_slot_datetime(payload.ends_at)
    if ends_at <= starts_at:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    if starts_at.date() < datetime.now().date():
        raise HTTPException(status_code=400, detail="Availability slots cannot be created in the past")

    conflicting_slot = find_conflicting_slot(db, profile.id, starts_at, ends_at, profile.travel_buffer_minutes)
    if conflicting_slot is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                "This slot conflicts with existing availability. "
                f"Keep at least {profile.travel_buffer_minutes} minutes between performances."
            ),
        )

    slot = AvailabilitySlot(
        service_profile_id=profile.id,
        starts_at=starts_at,
        ends_at=ends_at,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@app.put("/api/service-profile/me/availability/{slot_id}", response_model=AvailabilitySlotRead)
def update_own_availability_slot(
    slot_id: int,
    payload: AvailabilitySlotUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> AvailabilitySlot:
    profile = get_service_profile_by_email(db, user.email)
    if profile is None:
        raise HTTPException(status_code=404, detail="Service profile not found")

    slot = db.get(AvailabilitySlot, slot_id)
    if slot is None or slot.service_profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Availability slot not found")

    if slot.is_reserved:
        raise HTTPException(status_code=400, detail="Reserved slots cannot be edited")

    starts_at = normalize_slot_datetime(payload.starts_at)
    ends_at = normalize_slot_datetime(payload.ends_at)
    if ends_at <= starts_at:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    if starts_at.date() < datetime.now().date():
        raise HTTPException(status_code=400, detail="Availability slots cannot be moved to the past")

    conflicting_slot = find_conflicting_slot(
        db,
        profile.id,
        starts_at,
        ends_at,
        profile.travel_buffer_minutes,
        ignore_slot_id=slot.id,
    )
    if conflicting_slot is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                "This slot conflicts with existing availability. "
                f"Keep at least {profile.travel_buffer_minutes} minutes between performances."
            ),
        )

    slot.starts_at = starts_at
    slot.ends_at = ends_at
    db.commit()
    db.refresh(slot)
    return slot


@app.delete("/api/service-profile/me/availability/{slot_id}", response_model=ApiMessage)
def delete_own_availability_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SERV-PROVIDER")),
) -> ApiMessage:
    profile = get_service_profile_by_email(db, user.email)
    if profile is None:
        raise HTTPException(status_code=404, detail="Service profile not found")

    slot = db.get(AvailabilitySlot, slot_id)
    if slot is None or slot.service_profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Availability slot not found")

    if slot.is_reserved:
        raise HTTPException(status_code=400, detail="Reserved slots cannot be removed")

    db.delete(slot)
    db.commit()
    return ApiMessage(message="Availability slot removed")


def build_musician(payload: ServiceProfileCreate) -> ServiceProfile:
    data = payload.model_dump()
    return ServiceProfile(
        full_name=data["full_name"],
        instrument=data["instrument"],
        city=data["city"],
        state=data["state"],
        bio=data.get("bio") or "Community musician available for local events.",
        rate=data.get("rate") or "Available upon request",
        phone=data["phone"],
        email=data["email"],
        contact=f"{data['phone']} | {data['email']}",
        preferred_event_type=data.get("preferred_event_type") or "Any event",
        preferred_contact_method=data.get("preferred_contact_method") or "email",
        available_weekends=data.get("available_weekends", True),
        travel_buffer_minutes=data.get("travel_buffer_minutes", 120),
    )


@app.get("/api/events", response_model=list[CommunityEventRead])
def list_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CommunityEvent]:
    statement = select(CommunityEvent).order_by(CommunityEvent.created_at.desc())
    return list(db.scalars(statement))


@app.get("/api/public/service-providers", response_model=list[ServiceProfileRead])
def public_service_providers(db: Session = Depends(get_db)) -> list[ServiceProfile]:
    statement = select(ServiceProfile).order_by(ServiceProfile.created_at.desc())
    return list(db.scalars(statement))


@app.get("/api/public/event-requests", response_model=list[CommunityEventRead])
def public_event_requests(db: Session = Depends(get_db)) -> list[CommunityEvent]:
    statement = select(CommunityEvent).order_by(CommunityEvent.created_at.desc())
    return list(db.scalars(statement))


@app.post("/api/events", response_model=CommunityEventRead, status_code=201)
def create_event(
    payload: CommunityEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN")),
) -> CommunityEvent:
    event = CommunityEvent(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@app.get("/api/performance-requests", response_model=list[PerformanceRequestRead])
def list_performance_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PerformanceRequest]:
    statement = select(PerformanceRequest).order_by(PerformanceRequest.created_at.desc())
    return list(db.scalars(statement))


@app.post("/api/performance-requests", response_model=PerformanceRequestRead, status_code=201)
def create_performance_request(
    payload: PerformanceRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("CONSUMER")),
) -> PerformanceRequest:
    musician = db.get(ServiceProfile, payload.musician_id)
    if musician is None:
        raise HTTPException(status_code=404, detail="Musician not found")

    try:
        requested_start = normalize_slot_datetime(datetime.fromisoformat(payload.event_datetime))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Event date and time must be in ISO format") from exc

    slot_count = db.scalar(
        select(func.count())
        .select_from(AvailabilitySlot)
        .where(AvailabilitySlot.service_profile_id == musician.id)
    ) or 0
    selected_slot: Optional[AvailabilitySlot] = None
    if slot_count > 0:
        selected_slot = db.scalar(
            select(AvailabilitySlot)
            .where(AvailabilitySlot.service_profile_id == musician.id)
            .where(AvailabilitySlot.starts_at == requested_start)
        )
        if selected_slot is None:
            raise HTTPException(status_code=400, detail="Choose a published availability slot from the calendar")
        if selected_slot.is_reserved:
            raise HTTPException(status_code=409, detail="This slot was just booked. Please choose another time slot.")

    performance_request = PerformanceRequest(**payload.model_dump())
    db.add(performance_request)
    db.flush()

    if selected_slot is not None:
        selected_slot.is_reserved = True
        selected_slot.reserved_by_request_id = performance_request.id
        selected_slot.reserved_at = datetime.utcnow()

    db.commit()
    db.refresh(performance_request)
    return performance_request


@app.get("/api/service-providers/{provider_id}/availability-calendar", response_model=AvailabilityCalendarRead)
def read_provider_availability_calendar(
    provider_id: int,
    days: int = AVAILABILITY_WINDOW_DAYS,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("CONSUMER")),
) -> AvailabilityCalendarRead:
    provider = db.get(ServiceProfile, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Service profile not found")

    return build_availability_calendar(
        db,
        provider.id,
        provider.travel_buffer_minutes,
        days=days,
        include_reserved=False,
    )


@app.get("/api/services/{service_id}", response_model=ServiceProfileRead)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ServiceProfile:
    service = db.get(ServiceProfile, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service profile not found")

    if user.role == "SERV-PROVIDER" and service.email != normalize_email(user.email):
        raise HTTPException(status_code=403, detail="You can only view your own service profile")

    return service


@app.get("/api/events/{event_id}", response_model=CommunityEventRead)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommunityEvent:
    event = db.get(CommunityEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Community event not found")
    return event


if FRONTEND_DIST_DIR.exists():
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    requested_file = FRONTEND_DIST_DIR / full_path
    if requested_file.is_file():
        return FileResponse(requested_file)

    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frontend build not found")
