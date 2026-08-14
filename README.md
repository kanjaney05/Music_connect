# Music Connect

Music Connect is a community marketplace for musicians who want to offer live performances for local events. The project is split into a React frontend and a Python/FastAPI backend with SQLite persistence.

## Structure

- `frontend/` - React UI built with Vite
- `backend/` - FastAPI app with SQLite and SQLAlchemy

## Local development

1. Start the backend from `backend/`:

```bash
python3 -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

2. Start the frontend from `frontend/`:

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to the backend on `http://localhost:8000`.

ADMIN Username: kanjaney05@gmail.com
ADMIN Password: MusicAdmin

SERVICE PROVIDER Username: kumar.anjaney22@gmail.com
SERVICE PROVIDER Password: Password1

CONSUMER Username: anikasupriya947@gmail.com
CONSUMER Password: RubberDuck