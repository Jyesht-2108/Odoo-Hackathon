"""
Leave API router — allocations + requests.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import CurrentUser, get_current_user, require_admin_or_hr, scope_to_self
from app.core.supabase_client import supabase
from app.schemas import (
    LeaveAllocationCreate,
    LeaveAllocationOut,
    LeaveAllocationUpdate,
    LeaveRequestCreate,
    LeaveRequestDecision,
    LeaveRequestOut,
)

router = APIRouter(tags=["leave"])


# ── Leave Allocations ────────────────────────────────────────────────────────

@router.post("/leave-allocations", response_model=LeaveAllocationOut, status_code=201)
async def create_leave_allocation(
    payload: LeaveAllocationCreate,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    data = {
        "employee_id": str(payload.employee_id),
        "leave_type": payload.leave_type.value,
        "allocated_days": str(payload.allocated_days),
        "year": payload.year,
    }
    result = supabase.table("leave_allocations").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create leave allocation.")
    return LeaveAllocationOut(**result.data[0])


@router.get("/leave-allocations", response_model=list[LeaveAllocationOut])
async def list_leave_allocations(
    employee_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
):
    effective_id = scope_to_self(employee_id, current_user)
    query = supabase.table("leave_allocations").select("*").eq("employee_id", effective_id)
    if year:
        query = query.eq("year", year)
    result = query.execute()
    return [LeaveAllocationOut(**row) for row in (result.data or [])]


@router.patch("/leave-allocations/{allocation_id}", response_model=LeaveAllocationOut)
async def update_leave_allocation(
    allocation_id: UUID,
    payload: LeaveAllocationUpdate,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")
    for k, v in update_data.items():
        if hasattr(v, "as_tuple"):
            update_data[k] = str(v)
    result = (
        supabase.table("leave_allocations")
        .update(update_data)
        .eq("id", str(allocation_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Leave allocation not found.")
    return LeaveAllocationOut(**result.data[0])


@router.delete("/leave-allocations/{allocation_id}", status_code=204)
async def delete_leave_allocation(
    allocation_id: UUID,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    supabase.table("leave_allocations").delete().eq("id", str(allocation_id)).execute()
    return None


# ── Leave Requests ────────────────────────────────────────────────────────────

@router.post("/leave-requests", response_model=LeaveRequestOut, status_code=201)
async def create_leave_request(
    payload: LeaveRequestCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Submit a new leave request. Inserts with ai_recommendation = NULL."""
    if current_user.role == "EMPLOYEE":
        emp_id = str(current_user.employee_id)
    else:
        raise HTTPException(status_code=400, detail="Use the employee flow for leave requests.")

    data = {
        "employee_id": emp_id,
        "leave_type": payload.leave_type.value,
        "start_date": payload.start_date.isoformat(),
        "end_date": payload.end_date.isoformat(),
        "remarks": payload.remarks,
        "attachment_url": payload.attachment_url,
        "status": "PENDING",
    }
    result = supabase.table("leave_requests").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create leave request.")

    leave_request_row = result.data[0]

    # TODO(agents): call orchestrator here
    # The agent orchestrator (teammate 3) should be invoked at this point
    # to evaluate the leave request and populate ai_recommendation +
    # ai_reasoning on the row.  Example:
    #
    #   from app.agents.orchestrator import evaluate_leave_request
    #   await evaluate_leave_request(leave_request_row["id"])

    return LeaveRequestOut(**leave_request_row)


@router.get("/leave-requests", response_model=list[LeaveRequestOut])
async def list_leave_requests(
    employee_id: Optional[str] = Query(None),
    request_status: Optional[str] = Query(None, alias="status"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List leave requests (role-scoped)."""
    if current_user.role == "EMPLOYEE":
        effective_id = str(current_user.employee_id)
        query = supabase.table("leave_requests").select("*").eq("employee_id", effective_id)
    else:
        users_r = supabase.table("users").select("id").eq("company_id", str(current_user.company_id)).execute()
        user_ids = [u["id"] for u in (users_r.data or [])]
        if not user_ids:
            return []
        emps_r = supabase.table("employees").select("id").in_("user_id", user_ids).execute()
        emp_ids = [e["id"] for e in (emps_r.data or [])]
        if not emp_ids:
            return []
        query = supabase.table("leave_requests").select("*").in_("employee_id", emp_ids)
        if employee_id:
            query = query.eq("employee_id", employee_id)

    if request_status:
        query = query.eq("status", request_status)

    query = query.order("created_at", desc=True)
    result = query.execute()
    return [LeaveRequestOut(**row) for row in (result.data or [])]


@router.patch("/leave-requests/{request_id}/decision", response_model=LeaveRequestOut)
async def decide_leave_request(
    request_id: UUID,
    payload: LeaveRequestDecision,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    """Approve or reject a leave request (Admin/HR only)."""
    if payload.status not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Decision must be APPROVED or REJECTED.")
    now = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("leave_requests")
        .update({"status": payload.status.value, "reviewed_by": str(current_user.user_id), "reviewed_at": now})
        .eq("id", str(request_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    return LeaveRequestOut(**result.data[0])
