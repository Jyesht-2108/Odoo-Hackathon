"""
LangGraph Orchestrator for Agentic Leave Approval (Person 3).

Graph Topology:
        ┌─────────┐
        │  START  │
        └───┬─┬───┘
     ┌──────┘ └──────┐
     ▼               ▼
┌───────────┐  ┌───────────┐
│Agent A    │  │Agent B    │
│Compliance │  │Pattern    │
└─────┬─────┘  └─────┬─────┘
      └──────┬───────┘
             ▼
      ┌─────────────┐
      │ Merge Node  │ (LLM Synthesis)
      └──────┬──────┘
             ▼
        ┌─────────┐
        │   END   │
        └─────────┘
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict, Union
from uuid import UUID

from app.agents.compliance_agent import evaluate_compliance
from app.agents.pattern_agent import evaluate_patterns
from app.agents.llm_client import llm_client
from app.agents.schemas import (
    AIRecommendationType,
    ComplianceVerdict,
    LeaveEvaluationResult,
    PatternVerdict,
)

try:
    from langgraph.graph import END, START, StateGraph
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False
    START = "__start__"
    END = "__end__"


class LeaveEvaluationState(TypedDict, total=False):
    leave_request: Dict[str, Any]
    employee: Optional[Dict[str, Any]]
    company_id: Optional[str]
    supabase_client: Any
    mock_params: Dict[str, Any]
    compliance_verdict: Optional[ComplianceVerdict]
    pattern_verdict: Optional[PatternVerdict]
    recommendation: Optional[AIRecommendationType]
    confidence_score: Optional[float]
    reasoning: Optional[str]
    key_factors: Optional[List[str]]
    error: Optional[str]


# ── Graph Node Implementations ──────────────────────────────────────────────

async def compliance_node(state: LeaveEvaluationState) -> Dict[str, Any]:
    """Node 1: Evaluates leave balance, overlapping team leaves, and project deadlines."""
    mock = state.get("mock_params") or {}
    verdict = await evaluate_compliance(
        leave_request=state["leave_request"],
        employee=state.get("employee"),
        company_id=state.get("company_id"),
        supabase_client=state.get("supabase_client"),
        mock_allocated_days=mock.get("mock_allocated_days"),
        mock_used_days=mock.get("mock_used_days"),
        mock_overlapping_colleagues=mock.get("mock_overlapping_colleagues"),
        mock_deadlines=mock.get("mock_deadlines"),
    )
    return {"compliance_verdict": verdict}


async def pattern_node(state: LeaveEvaluationState) -> Dict[str, Any]:
    """Node 2: Evaluates day-of-week clustering, uncertified sick leave, and velocity."""
    mock = state.get("mock_params") or {}
    verdict = await evaluate_patterns(
        leave_request=state["leave_request"],
        employee=state.get("employee"),
        supabase_client=state.get("supabase_client"),
        mock_past_requests=mock.get("mock_past_requests"),
    )
    return {"pattern_verdict": verdict}


async def merge_node(state: LeaveEvaluationState) -> Dict[str, Any]:
    """Node 3 (Fan-in): Synthesizes compliance + pattern verdicts via LLM into final verdict."""
    compliance = state.get("compliance_verdict")
    pattern = state.get("pattern_verdict")
    
    if not compliance or not pattern:
        return {
            "recommendation": AIRecommendationType.REVIEW,
            "confidence_score": 0.5,
            "reasoning": "Could not complete evaluation nodes.",
            "key_factors": ["Missing agent outputs"],
        }

    synthesis = await llm_client.synthesize_leave_verdict(
        compliance=compliance,
        pattern=pattern,
        leave_request=state["leave_request"],
        employee=state.get("employee"),
    )

    rec_str = synthesis.get("recommendation", "REVIEW").upper()
    try:
        rec_enum = AIRecommendationType(rec_str)
    except ValueError:
        rec_enum = AIRecommendationType.REVIEW

    return {
        "recommendation": rec_enum,
        "confidence_score": float(synthesis.get("confidence_score", 0.9)),
        "reasoning": str(synthesis.get("reasoning", "Evaluation completed.")),
        "key_factors": list(synthesis.get("key_factors", [])),
    }


# ── LangGraph Definition ────────────────────────────────────────────────────

def create_orchestration_graph():
    """Build and compile the LangGraph StateGraph workflow."""
    if not HAS_LANGGRAPH:
        return None

    workflow = StateGraph(LeaveEvaluationState)

    # Add parallel evaluation nodes and merge node
    workflow.add_node("compliance_node", compliance_node)
    workflow.add_node("pattern_node", pattern_node)
    workflow.add_node("merge_node", merge_node)

    # Parallel fan-out from START
    workflow.add_edge(START, "compliance_node")
    workflow.add_edge(START, "pattern_node")

    # Fan-in to merge node
    workflow.add_edge("compliance_node", "merge_node")
    workflow.add_edge("pattern_node", "merge_node")

    # Fan-out to END
    workflow.add_edge("merge_node", END)

    return workflow.compile()


# ── Core Orchestrator Execution ─────────────────────────────────────────────

async def evaluate_leave(
    leave_request: Dict[str, Any],
    employee: Optional[Dict[str, Any]] = None,
    company_id: Optional[str] = None,
    supabase_client: Any = None,
    **mock_kwargs,
) -> LeaveEvaluationResult:
    """Execute the multi-agent leave triage graph.

    Runs Compliance and Pattern agents concurrently, then synthesizes with LLM.
    """
    initial_state: LeaveEvaluationState = {
        "leave_request": leave_request,
        "employee": employee,
        "company_id": company_id,
        "supabase_client": supabase_client,
        "mock_params": mock_kwargs,
    }

    # 1. Execute Agent A and Agent B concurrently
    compliance_res, pattern_res = await asyncio.gather(
        compliance_node(initial_state),
        pattern_node(initial_state),
    )

    merged_state = {
        **initial_state,
        "compliance_verdict": compliance_res["compliance_verdict"],
        "pattern_verdict": pattern_res["pattern_verdict"],
    }

    # 2. Execute Merge Node (LLM synthesis)
    synthesis_res = await merge_node(merged_state)

    rec_enum = synthesis_res["recommendation"]
    confidence = synthesis_res["confidence_score"]
    reasoning = synthesis_res["reasoning"]
    key_factors = synthesis_res["key_factors"]
    
    req_id = str(leave_request.get("id")) if leave_request.get("id") else None

    return LeaveEvaluationResult(
        leave_request_id=req_id,
        recommendation=rec_enum,
        confidence_score=confidence,
        reasoning=reasoning,
        key_factors=key_factors,
        compliance_verdict=merged_state["compliance_verdict"],
        pattern_verdict=merged_state["pattern_verdict"],
        evaluated_at=datetime.utcnow().isoformat(),
    )


async def evaluate_leave_request_by_id(
    leave_request_id: Union[str, UUID],
    update_db: bool = True,
    supabase_client: Any = None,
) -> LeaveEvaluationResult:
    """Load leave request from Supabase DB, run multi-agent triage, and write back verdicts.

    Args:
        leave_request_id: UUID of the leave_requests row.
        update_db: If True, writes ai_recommendation and ai_reasoning to Supabase row.
        supabase_client: Supabase client (defaults to shared service-role client).
    """
    if supabase_client is None:
        from app.core.supabase_client import supabase
        supabase_client = supabase

    req_id_str = str(leave_request_id)
    
    # 1. Fetch leave request
    res = supabase_client.table("leave_requests").select("*").eq("id", req_id_str).execute()
    if not res.data:
        raise ValueError(f"Leave request with ID {req_id_str} not found.")

    leave_row = res.data[0]
    emp_id = leave_row.get("employee_id")

    # 2. Fetch employee profile & company info
    employee = None
    company_id = None
    if emp_id:
        emp_res = supabase_client.table("employees").select("*").eq("id", str(emp_id)).execute()
        if emp_res.data:
            employee = emp_res.data[0]
            user_id = employee.get("user_id")
            if user_id:
                u_res = supabase_client.table("users").select("company_id").eq("id", str(user_id)).execute()
                if u_res.data:
                    company_id = u_res.data[0].get("company_id")

    # 3. Run multi-agent triage
    result = await evaluate_leave(
        leave_request=leave_row,
        employee=employee,
        company_id=company_id,
        supabase_client=supabase_client,
    )

    # 4. Update the DB row with ai_recommendation & ai_reasoning
    if update_db:
        try:
            update_payload = {
                "ai_recommendation": result.recommendation.value,
                "ai_reasoning": result.reasoning,
            }
            supabase_client.table("leave_requests").update(update_payload).eq("id", req_id_str).execute()
        except Exception as e:
            print(f"[Orchestrator] Warning: could not write AI recommendation back to DB: {e}")

    return result
