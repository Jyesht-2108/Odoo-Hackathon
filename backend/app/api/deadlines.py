"""
Deadlines API router — CRUD (Admin/HR only).

This table feeds teammate 3's Compliance Agent; we only provide CRUD here.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import CurrentUser, require_admin_or_hr
from app.core.supabase_client import supabase
from app.schemas import DeadlineCreate, DeadlineOut, DeadlineUpdate

router = APIRouter(prefix="/deadlines", tags=["deadlines"])


@router.post("", response_model=DeadlineOut, status_code=201)
async def create_deadline(
    payload: DeadlineCreate,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    data = {
        "company_id": str(current_user.company_id),
        "title": payload.title,
    }
    if payload.department is not None:
        data["department"] = payload.department
    if payload.date_range_start is not None:
        data["date_range_start"] = payload.date_range_start.isoformat()
    if payload.date_range_end is not None:
        data["date_range_end"] = payload.date_range_end.isoformat()

    result = supabase.table("deadlines").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create deadline.")
    return DeadlineOut(**result.data[0])


@router.get("", response_model=list[DeadlineOut])
async def list_deadlines(
    department: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    query = (
        supabase.table("deadlines")
        .select("*")
        .eq("company_id", str(current_user.company_id))
    )
    if department:
        query = query.eq("department", department)

    query = query.order("date_range_start", desc=False)
    result = query.execute()
    return [DeadlineOut(**row) for row in (result.data or [])]


@router.get("/{deadline_id}", response_model=DeadlineOut)
async def get_deadline(
    deadline_id: UUID,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    result = (
        supabase.table("deadlines")
        .select("*")
        .eq("id", str(deadline_id))
        .eq("company_id", str(current_user.company_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Deadline not found.")
    return DeadlineOut(**result.data[0])


@router.patch("/{deadline_id}", response_model=DeadlineOut)
async def update_deadline(
    deadline_id: UUID,
    payload: DeadlineUpdate,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")
    for k, v in update_data.items():
        if hasattr(v, "isoformat"):
            update_data[k] = v.isoformat()

    result = (
        supabase.table("deadlines")
        .update(update_data)
        .eq("id", str(deadline_id))
        .eq("company_id", str(current_user.company_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Deadline not found.")
    return DeadlineOut(**result.data[0])


@router.delete("/{deadline_id}", status_code=204)
async def delete_deadline(
    deadline_id: UUID,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    supabase.table("deadlines").delete().eq("id", str(deadline_id)).eq("company_id", str(current_user.company_id)).execute()
    return None
