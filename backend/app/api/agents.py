"""
FastAPI Router for the LangGraph Agent Orchestrator (Person 3 Track).

Endpoints:
- POST /agents/evaluate-leave/{request_id}  — Trigger multi-agent triage on an existing leave request in DB.
- POST /agents/simulate                    — Test / simulate multi-agent leave evaluation without modifying DB.
- GET  /agents/status                      — Health and configuration status of the Agentic pipeline.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.agents.orchestrator import evaluate_leave, evaluate_leave_request_by_id
from app.agents.llm_client import llm_client
from app.agents.schemas import LeaveEvaluationResult, SimulateLeaveRequest
from app.core.auth import CurrentUser, get_current_user, require_admin_or_hr
from app.core.supabase_client import supabase

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/status")
async def get_agent_status():
    """Return health & configuration status of the LangGraph multi-agent pipeline."""
    try:
        from app.agents.orchestrator import HAS_LANGGRAPH
    except ImportError:
        HAS_LANGGRAPH = False

    return {
        "status": "online",
        "llm_provider": llm_client.provider,
        "langgraph_available": HAS_LANGGRAPH,
        "agents": {
            "agent_a_compliance": {
                "name": "Compliance Checker",
                "checks": ["leave_balance", "department_colleague_overlaps", "project_deadlines"],
            },
            "agent_b_pattern": {
                "name": "Pattern Recognition",
                "checks": ["weekend_clustering", "uncertified_sick_leave", "velocity_clustering"],
            },
            "orchestrator": {
                "name": "LangGraph Fan-In LLM Synthesizer",
                "verdict_types": ["APPROVE", "REVIEW", "REJECT"],
            },
        },
    }


@router.post("/evaluate-leave/{request_id}", response_model=LeaveEvaluationResult)
async def evaluate_leave_request_endpoint(
    request_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Run Agentic Leave Approval pipeline on a leave request and update DB."""
    req_id_str = str(request_id)
    
    # 1. Fetch leave request from Supabase
    res = supabase.table("leave_requests").select("*").eq("id", req_id_str).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Leave request {request_id} not found.",
        )
    
    leave_row = res.data[0]

    # 2. Authorization check: Employees can only evaluate their own requests
    if current_user.role == "EMPLOYEE":
        if str(current_user.employee_id) != str(leave_row.get("employee_id")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only evaluate your own leave requests.",
            )

    # 3. Execute LangGraph multi-agent evaluation & update row
    try:
        result = await evaluate_leave_request_by_id(
            leave_request_id=request_id,
            update_db=True,
            supabase_client=supabase,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent evaluation failed: {str(e)}",
        )


@router.post("/simulate", response_model=LeaveEvaluationResult)
async def simulate_leave_evaluation(
    payload: SimulateLeaveRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Simulate multi-agent evaluation on hypothetical leave parameters without writing to DB.

    Ideal for interactive testing, frontend sandbox mode, and demo scenarios.
    """
    emp_id = str(payload.employee_id) if payload.employee_id else (
        str(current_user.employee_id) if current_user.employee_id else "00000000-0000-0000-0000-000000000001"
    )

    leave_req_dict: Dict[str, Any] = {
        "employee_id": emp_id,
        "leave_type": payload.leave_type.value,
        "start_date": payload.start_date.isoformat(),
        "end_date": payload.end_date.isoformat(),
        "remarks": payload.remarks,
        "attachment_url": payload.attachment_url,
    }

    emp_dict: Dict[str, Any] = {
        "id": emp_id,
        "first_name": payload.first_name or "Jane",
        "last_name": payload.last_name or "Doe",
        "department": payload.department or "Engineering",
    }

    result = await evaluate_leave(
        leave_request=leave_req_dict,
        employee=emp_dict,
        company_id=str(current_user.company_id),
        supabase_client=supabase,
        mock_allocated_days=payload.mock_allocated_days,
        mock_used_days=payload.mock_used_days,
        mock_overlapping_colleagues=payload.mock_overlapping_colleagues,
        mock_deadlines=payload.mock_deadlines,
        mock_past_requests=payload.mock_past_requests,
    )

    return result
