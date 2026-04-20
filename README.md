# Crowdlux

Crowdlux is a real-time crowd intelligence platform for stadium operations.

It combines live venue telemetry, AI-powered guidance, and role-based tooling for attendees, staff, and admins.

## Why Crowdlux

- Improve fan movement with live wayfinding and zone-aware routing
- Give operations teams instant alerting and control tools
- Keep seat assignment reliable with backend transactional locking
- Deliver a modern, production-minded stack built on Google and Firebase

## Antigravity + Google Stack

- Product and UX direction by Antigravity
- Gemini for crowd-aware AI responses
- Firebase Authentication for identity and access
- Firestore for real-time event and zone data
- Google Maps for in-venue navigation
- Firebase Hosting and Cloud-friendly backend deployment

## Feature Highlights

### Attendee Experience

- Live venue map and route guidance
- AI assistant for crowd-aware navigation help
- Ticket and seat selection flow
- Real-time event alerts

### Staff Operations

- Zone status updates
- Alert broadcasting tools
- Gate and crowd response support workflows

### Admin Controls

- Multi-stadium, multi-event management
- Global broadcast controls
- Reseed/admin utilities for controlled environments

## Architecture

### Frontend

- React 19 + Vite
- Firestore real-time listeners in app context
- Google Maps rendering and marker logic
- Framer Motion transitions

### Backend

- FastAPI + Uvicorn
- Firebase Admin SDK for trusted writes and transactions
- Gemini integration for AI endpoints
- Modular routers for zones, alerts, tickets, admin, and AI

### Data Model (High-Level)

- `stadiums/{stadiumId}`
- `stadiums/{stadiumId}/events/{eventId}`
- `stadiums/{stadiumId}/events/{eventId}/zones/{zoneId}`
- `stadiums/{stadiumId}/events/{eventId}/alerts/{alertId}`
- `stadiums/{stadiumId}/events/{eventId}/seats/{seatKey}` (server-managed)
- `users/{uid}` (owner-scoped)
- `user_roles/{uid}` (owner-readable role mapping)

## Repository Structure

```text
.
|- backend/      # FastAPI services and trusted business logic
|- frontend/     # React + Vite client app
|- functions/    # Firebase Functions (if enabled)
|- firestore.rules
|- firestore.indexes.json
|- firebase.json
```

## Security

- Firestore rules follow least-privilege with default deny behavior
- Sensitive mutations are server-managed
- Protected backend routes validate Firebase ID tokens
- Role-gated operations for staff/admin workflows
- Secrets are expected via environment variables, not committed files

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Firebase project (for Auth/Firestore)
- Google Maps API key
- Gemini API key

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd Crowdlux
```

Frontend dependencies:

```bash
cd frontend
npm install
```

Backend dependencies:

```bash
cd ../backend
python -m venv ../.venv
../.venv/Scripts/python.exe -m pip install -r requirements.txt
```

### 2. Configure Environment Variables

Backend (`backend/.env`):

```env
FIREBASE_CREDENTIALS=serviceAccountKey.json
GEMINI_API_KEY=your_gemini_key
BACKEND_ALLOWED_ORIGINS=http://localhost:5173
ADMIN_EMAILS=admin@example.com
STAFF_EMAILS=staff@example.com
ENVIRONMENT=development
```

Frontend (`frontend/.env`):

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_MAPS_KEY=your_google_maps_key
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Run Locally

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
../.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000
```

## Useful Commands

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run test
```

Backend:

```bash
cd backend
../.venv/Scripts/python.exe -m py_compile main.py ticket_service.py admin_service.py alert_service.py zone_service.py
../.venv/Scripts/python.exe -m pytest -q
```

Firebase CLI checks:

```bash
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest use
npx -y firebase-tools@latest deploy --only firestore:rules --dry-run
```

## Deployment

### Frontend (Firebase Hosting)

Build and deploy frontend:

```bash
cd frontend
npm run build
cd ..
npx -y firebase-tools@latest deploy --only hosting
```

### Backend (Google Cloud Run)

1. Enable required services:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

2. Create Artifact Registry repository (one-time):

```bash
gcloud artifacts repositories create crowdlux \
	--repository-format=docker \
	--location=asia-south1
```

3. Deploy backend with Cloud Build from the `backend` directory:

```bash
cd backend
gcloud builds submit --config cloudbuild.yaml
```

4. Set runtime environment variables on Cloud Run service:

```bash
gcloud run services update crowdlux-backend \
	--region asia-south1 \
	--set-env-vars BACKEND_ALLOWED_ORIGINS=https://<your-frontend-domain>,ENVIRONMENT=production,ADMIN_EMAILS=<admin-email>,STAFF_EMAILS=<staff-email>
```

5. Configure secrets (recommended) using Secret Manager:

```bash
gcloud run services update crowdlux-backend \
	--region asia-south1 \
	--set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

For Firebase Admin credentials on Cloud Run, prefer Workload Identity (default service account permissions) over JSON key files.

## Notes

- A frontend chunk-size warning may appear on production build; this is non-blocking and can be improved with code splitting.
- Gemini integration tests are optional and auto-skip without a Gemini key.

## Project Goals

- Accurate and trustworthy crowd/seat state
- Security-first defaults
- Fast real-time updates for operations
- Maintainable architecture for production incidents and rapid iteration
