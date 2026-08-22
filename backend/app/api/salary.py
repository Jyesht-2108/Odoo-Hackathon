"""
Salary API router.

- GET   /salary/{employee_id}   — get salary (self or Admin/HR).
- PATCH /salary/{employee_id}   — update salary (Admin/HR only).
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user, require_admin_or_hr
from app.core.supabase_client import supabase
from app.schemas import SalaryComponentOut, SalaryComponentUpdate

router = APIRouter(prefix="/salary", tags=["salary"])


@router.get("/{employee_id}", response_model=SalaryComponentOut)
async def get_salary(
    employee_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get salary components for an employee.

    EMPLOYEE can only view their own salary.
    """
    if current_user.role == "EMPLOYEE":
        if current_user.employee_id is None or current_user.employee_id != employee_id:
            raise HTTPException(status_code=403, detail="You can only view your own salary.")

    result = (
        supabase.table("salary_components")
        .select("*")
        .eq("employee_id", str(employee_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Salary record not found.")
    return SalaryComponentOut(**result.data[0])


@router.patch("/{employee_id}", response_model=SalaryComponentOut)
async def update_salary(
    employee_id: UUID,
    payload: SalaryComponentUpdate,
    current_user: CurrentUser = Depends(require_admin_or_hr),
):
    """Update salary components for an employee (Admin/HR only)."""
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    # Convert Decimals to str for JSON serialization
    for k, v in update_data.items():
        if hasattr(v, "as_tuple"):
            update_data[k] = str(v)

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Upsert: if no row exists, create one
    existing = (
        supabase.table("salary_components")
        .select("id")
        .eq("employee_id", str(employee_id))
        .execute()
    )

    if existing.data:
        result = (
            supabase.table("salary_components")
            .update(update_data)
            .eq("employee_id", str(employee_id))
            .execute()
        )
    else:
        update_data["employee_id"] = str(employee_id)
        result = supabase.table("salary_components").insert(update_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update salary.")
    return SalaryComponentOut(**result.data[0])
