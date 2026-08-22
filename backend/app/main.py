from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.core.auth import CurrentUser, get_current_user
from app.api import employees, attendance, leave, salary, deadlines, copilot, agents

app = FastAPI(
    title="Dayflow API",
    description="Human Resource Management System — backend API",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(leave.router)
app.include_router(salary.router)
app.include_router(deadlines.router)
app.include_router(copilot.router)
app.include_router(agents.router)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}


@app.get("/me", tags=["auth"])
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """Return the authenticated user's identity — role, company_id, employee_id.

    Used by the frontend after login to populate the AuthContext.
    """
    return {
        "user_id": str(current_user.user_id),
        "role": current_user.role,
        "company_id": str(current_user.company_id),
        "employee_id": str(current_user.employee_id) if current_user.employee_id else None,
    }

