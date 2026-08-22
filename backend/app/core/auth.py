"""
Authentication & authorization dependencies for FastAPI.

Auth flow:
1. Frontend sends Supabase session JWT as ``Authorization: Bearer <token>``.
2. ``get_current_user()`` validates the JWT using SUPABASE_JWT_SECRET.
3. The ``sub`` claim (= ``auth.users.id``) is used to look up the ``users``
   row via the service-role client, yielding role + company_id.
4. If the role is EMPLOYEE, the corresponding ``employees.id`` is also
   fetched and attached to the context object.

Access-control helpers
- ``require_admin_or_hr()`` — raises 403 when the caller is an EMPLOYEE.
- ``scope_to_self()``       — forces any employee_id filter to the caller's
                              own employee_id when role == EMPLOYEE.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import SUPABASE_JWT_SECRET
from app.core.supabase_client import supabase

_bearer_scheme = HTTPBearer()


# ── Authenticated user context ──────────────────────────────────────────────

@dataclass
class CurrentUser:
    """Lightweight object attached to every authenticated request."""

    user_id: UUID          # auth.users.id == users.id
    role: str              # "ADMIN" | "HR" | "EMPLOYEE"
    company_id: UUID
    employee_id: Optional[UUID] = None  # set only when role == EMPLOYEE


# ── Core dependency ─────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> CurrentUser:
    """Validate the Supabase JWT and return a ``CurrentUser`` context."""

    token = credentials.credentials

    # 1. Decode & validate JWT ------------------------------------------------
    try:
        auth_response = supabase.auth.get_user(token)
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    if not auth_response or not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    user_id = auth_response.user.id
    if not user_id:
        print("Auth error: Token missing 'sub' claim.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim.",
        )

    # 2. Look up the users row ------------------------------------------------
    result = (
        supabase.table("users")
        .select("id, role, company_id")
        .eq("id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found. Contact your administrator.",
        )

    user_row = result.data[0]

    current = CurrentUser(
        user_id=UUID(user_row["id"]),
        role=user_row["role"],
        company_id=UUID(user_row["company_id"]),
    )

    # 3. If EMPLOYEE, resolve their employees.id ----------------------------
    if current.role == "EMPLOYEE":
        emp_result = (
            supabase.table("employees")
            .select("id")
            .eq("user_id", str(current.user_id))
            .execute()
        )
        if emp_result.data:
            current.employee_id = UUID(emp_result.data[0]["id"])

    return current


# ── Authorization helpers ────────────────────────────────────────────────────

def require_admin_or_hr(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency that raises 403 if the caller is not ADMIN or HR."""
    if current_user.role not in ("ADMIN", "HR"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires ADMIN or HR privileges.",
        )
    return current_user


def scope_to_self(
    employee_id: Optional[str],
    current_user: CurrentUser,
) -> str:
    """Return the employee_id that downstream queries MUST use.

    - ADMIN / HR  → uses the *requested* employee_id (pass-through).
    - EMPLOYEE    → **always** returns their own ``employee_id``,
                    regardless of what was passed in.

    Raises 400 if an ADMIN/HR call omits ``employee_id`` and there is no
    sensible default.
    """
    if current_user.role == "EMPLOYEE":
        if current_user.employee_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee profile not linked. Contact your administrator.",
            )
        return str(current_user.employee_id)

    # ADMIN / HR — use the requested ID
    if employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="employee_id query parameter is required for ADMIN/HR.",
        )
    return employee_id
