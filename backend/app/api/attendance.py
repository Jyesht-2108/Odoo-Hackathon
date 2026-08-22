"""
Attendance API router.

Handles:
- POST  /attendance/check-in   — record check-in for the current user.
- POST  /attendance/check-out  — record check-out, compute work/extra hours.
- GET   /attendance            — list attendance records (role-scoped).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import CurrentUser, get_current_user, scope_to_self
from app.core.supabase_client import supabase
from app.schemas import AttendanceOut

router = APIRouter(prefix="/attendance", tags=["attendance"])

STANDARD_WORK_HOURS = Decimal("8.00")


@router.post("/check-in", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def check_in(current_user: CurrentUser = Depends(get_current_user)):
    """Record today's check-in for the authenticated employee."""
    employee_id = scope_to_self(None, current_user) if current_user.role == "EMPLOYEE" else None

    if current_user.role == "EMPLOYEE":
        emp_id = str(current_user.employee_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin/HR must use the employee-specific check-in flow.",
        )

    today = date.today().isoformat()
    now = datetime.now(timezone.utc).isoformat()

    # Check if already checked in today
    existing = (
        supabase.table("attendance")
        .select("*")
        .eq("employee_id", emp_id)
        .eq("date", today)
        .execute()
    )

    if existing.data:
        if existing.data[0].get("check_in"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already checked in today.",
            )
        # Update existing row (shouldn't normally happen)
        result = (
            supabase.table("attendance")
            .update({"check_in": now, "status": "PRESENT"})
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = (
            supabase.table("attendance")
            .insert({
                "employee_id": emp_id,
                "date": today,
                "check_in": now,
                "status": "PRESENT",
            })
            .execute()
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record check-in.",
        )

    return AttendanceOut(**result.data[0])


@router.post("/check-out", response_model=AttendanceOut)
async def check_out(current_user: CurrentUser = Depends(get_current_user)):
    """Record today's check-out for the authenticated employee.

    Computes ``work_hours`` and ``extra_hours`` based on the check-in time.
    """
    if current_user.role != "EMPLOYEE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin/HR must use the employee-specific check-out flow.",
        )

    emp_id = str(current_user.employee_id)
    today = date.today().isoformat()
    now = datetime.now(timezone.utc)

    existing = (
        supabase.table("attendance")
        .select("*")
        .eq("employee_id", emp_id)
        .eq("date", today)
        .execute()
    )

    if not existing.data or not existing.data[0].get("check_in"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No check-in found for today. Please check in first.",
        )

    row = existing.data[0]
    if row.get("check_out"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already checked out today.",
        )

    check_in_time = datetime.fromisoformat(row["check_in"])
    diff_hours = Decimal(str(round((now - check_in_time).total_seconds() / 3600, 2)))
    extra = max(diff_hours - STANDARD_WORK_HOURS, Decimal("0"))

    result = (
        supabase.table("attendance")
        .update({
            "check_out": now.isoformat(),
            "work_hours": str(diff_hours),
            "extra_hours": str(extra),
        })
        .eq("id", row["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record check-out.",
        )

    return AttendanceOut(**result.data[0])


@router.get("", response_model=list[AttendanceOut])
async def list_attendance(
    employee_id: Optional[str] = Query(None),
    date_filter: Optional[str] = Query(None, alias="date"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List attendance records.

    - EMPLOYEE: always scoped to self, regardless of ``employee_id`` param.
    - ADMIN/HR: can query by employee_id, or omit to get all in company.
    """
    if current_user.role == "EMPLOYEE":
        effective_id = scope_to_self(employee_id, current_user)
        query = (
            supabase.table("attendance")
            .select("*")
            .eq("employee_id", effective_id)
        )
    elif employee_id:
        query = (
            supabase.table("attendance")
            .select("*")
            .eq("employee_id", employee_id)
        )
    else:
        # ADMIN/HR with no employee_id → all attendance in company
        users_result = (
            supabase.table("users")
            .select("id")
            .eq("company_id", str(current_user.company_id))
            .execute()
        )
        user_ids = [u["id"] for u in (users_result.data or [])]
        if not user_ids:
            return []
        emps_result = (
            supabase.table("employees")
            .select("id")
            .in_("user_id", user_ids)
            .execute()
        )
        emp_ids = [e["id"] for e in (emps_result.data or [])]
        if not emp_ids:
            return []
        query = (
            supabase.table("attendance")
            .select("*")
            .in_("employee_id", emp_ids)
        )

    if date_filter:
        query = query.eq("date", date_filter)

    query = query.order("date", desc=True)
    result = query.execute()

    return [AttendanceOut(**row) for row in (result.data or [])]
