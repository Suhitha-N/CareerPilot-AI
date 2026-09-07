from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.users import router as users_router
from backend.app.api.routes.resumes import router as resume_router
from backend.app.api.job_descriptions import router as job_descriptions_router
from backend.app.api.interviews import router as interviews_router
from backend.app.api.coding import router as coding_router
from backend.app.api.placement_readiness import router as placement_readiness_router
from backend.app.api.career_roadmap import router as career_roadmap_router
from backend.app.api.routes.assistant import router as assistant_router
from backend.app.api.routes.daily_plan import router as daily_plan_router
from backend.app.core.database import engine


app = FastAPI(
    title="AI Placement Intelligence Platform",
    description="AI-powered interview and placement preparation platform",
    version="1.0.0",
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(resume_router)
app.include_router(job_descriptions_router)
app.include_router(interviews_router)
app.include_router(coding_router)
app.include_router(placement_readiness_router)
app.include_router(career_roadmap_router)
app.include_router(assistant_router)
app.include_router(daily_plan_router)

@app.get("/")
def root():
    return {
        "message": "AI Placement Intelligence Platform API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    try:
        with engine.connect():
            return {
                "status": "healthy",
                "database": "connected",
            }
    except Exception as exc:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(exc),
        }