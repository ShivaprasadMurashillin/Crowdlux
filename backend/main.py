from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import firebase_admin
from firebase_admin import credentials
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase via serviceAccountKey
cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # GCP Cloud Run injects default credentials natively
        firebase_admin.initialize_app()
except ValueError:
    pass # Already initialized
except Exception as e:
    print(f"Error initializing Firebase: {e}")

# IMPORTANT: Import routers AFTER initializing Firebase!
from zone_service import router as zone_router
from alert_service import router as alert_router
from gemini_service import router as gemini_router
from admin_service import router as admin_router
from ticket_service import router as ticket_router

app = FastAPI(
    title="Crowdlux API",
    description="Real-time crowd intelligence backend",
    version="1.0.0"
)


def _load_allowed_origins() -> list[str]:
    raw = os.getenv("BACKEND_ALLOWED_ORIGINS", "")
    if raw.strip():
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]


allowed_origins = _load_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(zone_router, prefix="/zones", tags=["Zones"])
app.include_router(alert_router, prefix="/alerts", tags=["Alerts"])
app.include_router(gemini_router, prefix="/ai", tags=["AI"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(ticket_router, prefix="/tickets", tags=["Tickets"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "crowdlux-api-live"}

# Serve React App
# Mount static assets first (CSS, JS, images)
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_path, "assets")), name="assets")

    # Catch-all for React Router frontend
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Prevent mapping standard files blindly if not handled, but strictly return index.html for React Routes
        index_path = os.path.join(static_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend not generated"}
