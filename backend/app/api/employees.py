"""
Employees API router.

Handles:
- POST   /employees          — create a new employee (Admin/HR only).
                               Also creates the Supabase auth user and
                               the ``users`` + ``employees`` rows.
- GET    /employees          — list employees (role-scoped).
- GET    /employees/{id}     — get single employee.
- PATCH  /employees/{id}     — update employee profile.
"""

from __future__ import annotations

import secrets
import string
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import CurrentUser, get_current_user, require_admin_or_hr
from app.core.supabase_client import supabase
from app.schemas import (
    EmployeeCreate,
    EmployeeCreateResponse,
    EmployeeOut,
    EmployeeUpdate,
    UserOut,
)

router = APIRouter(prefix="/employees", tags=["employees"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generate_password(length: int = 12) -> str:
    """Generate a random first-time password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _generate_login_id(
    first_name: str,
    last_name: str,
    joining_year: int,
    company_id: str,
) -> str:
    """
    Format: CO{First2FirstName}{First2LastName}{JoiningYear}{4-digit serial}
    Serial is per company+year, starting at 0001.
    """
    prefix = f"CO{first_name[:2].upper()}{last_name[:2].upper()}{joining_year}"

    # Find the current max serial for this company + year
    existing = (
        supabase.table("users")
        .select("login_id")
        .eq("company_id", company_id)
        .like("login_id", f"CO%{joining_year}%")
        .execute()
    )

    max_serial = 0
    for row in existing.data or []:
        lid: str = row["login_id"]
        # The serial is the last 4+ characters after the year portion
        try:
            # login_id format: CO<2><2><4-digit year><serial>
            serial_part = lid[len(f"CO{first_name[:2].upper()}{last_name[:2].upper()}{joining_year}"):]
            if not serial_part:
                # Different name prefix — try extracting the trailing digits
                serial_part = lid[-4:]
            serial_num = int(serial_part)
            if serial_num > max_serial:
                max_serial = serial_num
        except (ValueError, IndexError):
            continue

    # If we couldn't find a reliable serial from same-prefix IDs, query all
    # serials for this company+year more broadly
    if max_serial == 0 and existing.data:
        for row in existing.data:
            lid = row["login_id"]
            # Extract the last digits as serial
            trailing = ""
            for ch in reversed(lid):
                if ch.isdigit():
                    trailing = ch + trailing
                else:
                    break
            if trailing and len(trailing) >= 3:
                try:
                    serial_num = int(trailing)
                    if serial_num > max_serial:
                        max_serial = serial_num
                except ValueError:
                    continue

    next_serial = max_serial + 1
    return f"{prefix}{next_serial:04d}"


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=EmployeeCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    payload: EmployeeCreate,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    """Create a new employee (Admin/HR only).

    This endpoint:
    1. Creates a Supabase auth user via ``admin.create_user()``.
    2. Inserts a ``users`` row linked to the auth user.
    3. Inserts an ``employees`` row linked to the ``users`` row.
    4. Returns the employee, user, and the generated first-time password.
    """
    company_id = str(current_user.company_id)
    joining_year = (
        payload.date_of_joining.year if payload.date_of_joining else date.today().year
    )

    # Generate credentials
    login_id = _generate_login_id(
        payload.first_name, payload.last_name, joining_year, company_id
    )
    password = _generate_password()

    # 1. Create Supabase auth user
    try:
        auth_response = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": password,
                "email_confirm": True,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create auth user: {e}",
        )

    auth_user_id = auth_response.user.id

    # 2. Insert users row
    user_data = {
        "id": str(auth_user_id),
        "company_id": company_id,
        "login_id": login_id,
        "email": payload.email,
        "role": payload.role.value,
        "must_reset_password": True,
    }
    user_result = supabase.table("users").insert(user_data).execute()
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to insert user row.",
        )
    user_row = user_result.data[0]

    # 3. Insert employees row
    emp_data: dict = {
        "user_id": str(auth_user_id),
        "first_name": payload.first_name,
        "last_name": payload.last_name,
    }
    # Optional fields
    for field in (
        "department", "designation", "photo_url", "dob", "address",
        "phone", "marital_status", "blood_group", "nationality",
        "date_of_joining", "about", "skills", "interests", "certifications",
    ):
        value = getattr(payload, field, None)
        if value is not None:
            emp_data[field] = value.isoformat() if isinstance(value, date) else value

    emp_result = supabase.table("employees").insert(emp_data).execute()
    if not emp_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to insert employee row.",
        )
    emp_row = emp_result.data[0]

    return EmployeeCreateResponse(
        employee=EmployeeOut(**emp_row),
        user=UserOut(**user_row),
        generated_password=password,
    )


@router.get("", response_model=list[EmployeeOut])
async def list_employees(
    current_user: CurrentUser = Depends(get_current_user),
):
    """List employees.

    - ADMIN/HR see all employees in their company.
    - EMPLOYEE sees only themselves.
    """
    if current_user.role == "EMPLOYEE":
        if current_user.employee_id is None:
            return []
        result = (
            supabase.table("employees")
            .select("*")
            .eq("id", str(current_user.employee_id))
            .execute()
        )
    else:
        # Admin/HR — get all employees belonging to the same company
        # Join through users table to filter by company
        users_result = (
            supabase.table("users")
            .select("id")
            .eq("company_id", str(current_user.company_id))
            .execute()
        )
        user_ids = [u["id"] for u in (users_result.data or [])]
        if not user_ids:
            return []
        result = (
            supabase.table("employees")
            .select("*")
            .in_("user_id", user_ids)
            .execute()
        )

    return [EmployeeOut(**row) for row in (result.data or [])]


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single employee.

    EMPLOYEE can only fetch their own profile.
    """
    if current_user.role == "EMPLOYEE":
        if current_user.employee_id is None or current_user.employee_id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own profile.",
            )

    result = (
        supabase.table("employees")
        .select("*")
        .eq("id", str(employee_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found."
        )

    return EmployeeOut(**result.data[0])


@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update an employee's profile.

    - EMPLOYEE can only update their own limited fields (address, phone, photo_url).
    - ADMIN/HR can update all fields for any employee in the company.
    """
    if current_user.role == "EMPLOYEE":
        if current_user.employee_id is None or current_user.employee_id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own profile.",
            )

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    # EMPLOYEE can only modify limited fields
    if current_user.role == "EMPLOYEE":
        allowed = {"address", "phone", "photo_url"}
        disallowed = set(update_data.keys()) - allowed
        if disallowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Employees cannot modify: {', '.join(disallowed)}",
            )

    # Serialize date fields
    for key, value in update_data.items():
        if isinstance(value, date):
            update_data[key] = value.isoformat()

    result = (
        supabase.table("employees")
        .update(update_data)
        .eq("id", str(employee_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found."
        )

    return EmployeeOut(**result.data[0])
