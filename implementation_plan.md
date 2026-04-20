# Crowdlux Build Plan

This document outlines the architecture, tech stack, and step-by-step implementation plan for **Crowdlux** ("Illuminating crowd flow in real time") — a full-stack, real-time crowd experience web application based on the provided specifications. We will build an AI-powered crowd navigation assistant with live updates syncing via Firebase Firestore to a React frontend and Python backend.

## Architecture

- **Frontend**: React 18, Vite 5, Tailwind CSS 3, React Router v6, Framer Motion, Recharts.
- **Backend**: Python 3.11, FastAPI (to be deployed on Google Cloud Run).
- **Database & Sync**: Firebase Firestore (Real-time NoSQL).
- **AI**: Google Gemini 1.5 Flash API.
- **Maps**: Google Maps JavaScript API.

## User Action Required Outside Coding Environment

> [!IMPORTANT]
> To fully test and deploy this application, you will need to perform several steps in the **Google Cloud Console** and **Firebase Console**. I will mock functionalities where possible for local testing to give you a feel for it, but for a true live setup, you must prepare the following:

1.  **Google Cloud Console**:
    - Create a Google Cloud Project (e.g., `crowdlux-app`).
    - Enable the **Gemini API** and generate an API Key.
    - Enable the **Google Maps JavaScript API** and generate an API Key.
    - (Deployment Phase) Enable **Cloud Run** and **Cloud Build** APIs.
2.  **Firebase Console**:
    - Create a Firebase project (you can link this to the Google Cloud Project you created).
    - Enable **Firestore Database** in test mode (or setup basic read/write rules).
    - Enable **Firebase Authentication** (Anonymous or Email/Password is sufficient).
    - Go to Project Settings -> Service Accounts, and generate a **new private key** (JSON file). This will be required by our Python FastAPI Backend to securely update Firestore.
    - Go to Project Settings -> General -> Your Apps, and add a **Web App** to get your Firebase config (`VITE_FIREBASE_API_KEY`, etc.).

## Proposed Implementation Plan

### Phase 1: Foundation & Setup

We will set up the foundational structures for both the frontend and backend.

- Initialize Vite + React frontend in `c:\Coding\Crowdlux\frontend`.
- Install frontend dependencies (`tailwindcss`, `firebase`, `framer-motion`, `recharts`, `react-router-dom`, etc.).
- Initialize Python FastAPI backend in `c:\Coding\Crowdlux\backend`.
- Establish backend requirements (`fastapi`, `firebase-admin`, `google-generativeai`).

### Phase 2: Design Language & Themes

- Configure Tailwind CSS with Google Material You (Material Design 3) logic.
- Define brand colors for **Crowdlux** (integrating Google Blue/Green/Yellow/Red for occupancy scales).
- Set up Global Contexts and custom React hooks (`useZoneData.js`, `useAlerts.js`) to establish real-time connectivity with Firestore.

### Phase 3: Backend Services build

- `zone_service.py`: APIs to get, update, and simulate zones.
- `alert_service.py`: APIs to create warning/danger alerts.
- `gemini_service.py`: APIs taking zone JSON data + user query -> calling Gemini 1.5 -> returning JSON recommendations.
- _Note: Before using live endpoints, we can mock responses or use your API keys to call them directly._

### Phase 4: Frontend Development

- **App Shell**: Routing logic (`Landing.jsx`, `Attendee.jsx`, `Staff.jsx`, `Admin.jsx`).
- **Attendee Portal**:
  - Bottom App Bar.
  - Google Maps Custom Component with simulated Heatmap Overlay.
  - AI Guide Chat integrated with our Backend Gemini endpoints.
  - Ticket QR and dynamic alerts.
- **Staff Portal**:
  - Dashboard for KPI tracking.
  - Zone Control Table to manually increase counts (with instant simulation loops!).
- **Admin Dashboard**:
  - Recharts for `Attendee Flow Over Time` and `Zone Occupancy Breakdown`.
  - KPI cards.

### Phase 5: Demo Loop & Simulated Simulation

- Create a robust offline simulation script (or use frontend/backend hooks) that changes crowd capacities continuously every few seconds, demonstrating real-time websocket/snapshots.

### Phase 6: Testing, Accessibility & Production Polish

- **Testing**: Add `pytest` for basic backend API tests and `vitest` or `jest` for frontend component tests (Crucial for the AI evaluation).
- **Accessibility**: Ensure semantic HTML, `aria-labels` on buttons, proper color contrast (using our Material Design colors), and keyboard navigation.
- **Security & Efficiency**: Use `.env` files for secrets, setup CORS securely on the backend, and use React `Suspense` / lazy loading for optimal performance.
- **Narrative (LinkedIn Post)**: Generate a compelling LinkedIn post to summarize the build, tags, and technologies used (Google products prominently featured) for your final submission.

## Open Questions

> [!WARNING]
> Please review these questions before I start generating the codebase:

1.  **API Keys for Local Dev:** I can generate a `.env.example` file, but would you like me to build mocked data structures so you can UI-test the app immediately _without_ entering valid API keys right away, or do you want to provide keys so the app functions 100% locally on the first run?
2.  **Deployment Scripts:** Do you want me to write the `cloudbuild.yaml` and `Dockerfile` right now, or should we focus exclusively on local execution and codebase delivery first?
3.  **UI Brand Name:** I will replace mentions of Gathrix/ArenaFlux with **Crowdlux**.
4.  **GitHub Repo:** Once we finish building, you will need to push the code in `c:\Coding\Crowdlux` to a public GitHub repository to submit the link. I will add a `.gitignore` and `README.md` formatted beautifully for the judges.

Once approved, I will begin initializing the repositories.
