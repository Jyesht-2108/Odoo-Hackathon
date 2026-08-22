"""
Pydantic schemas for the Agentic Leave Approval pipeline (Person 3).
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Core Enums (Mirroring SQL Schema) ────────────────────────────────────────

class AIRecommendationType(str, Enum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


class LeaveCategory(str, Enum):
    PAID = "PAID"
    SICK = "SICK"
    UNPAID = "UNPAID"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ── Agent A: Compliance Checker Schemas ──────────────────────────────────────

class ColleagueOverlap(BaseModel):
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    start_date: str
    end_date: str
    leave_type: str


class DeadlineConflict(BaseModel):
    deadline_id: Optional[str] = None
    title: str
    department: Optional[str] = None
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None


class ComplianceVerdict(BaseModel):
    passed: bool = Field(
        ...,
        description="True if no hard compliance blockers (balance sufficient, no major blocker)",
    )
    balance_sufficient: bool = Field(
        ...,
        description="Whether the employee has enough allocated leave balance",
    )
    requested_days: int = Field(
        ...,
        description="Total calendar days requested",
    )
    allocated_days: float = Field(
        default=0.0,
        description="Total allocated leave days for the year",
    )
    used_days: float = Field(
        default=0.0,
        description="Total leave days already used this year",
    )
    available_balance: float = Field(
        default=0.0,
        description="Available balance prior to this request",
    )
    remaining_after_request: float = Field(
        default=0.0,
        description="Projected balance after approving this request",
    )
    leave_type: LeaveCategory
    overlap_count: int = Field(
        default=0,
        description="Number of department colleagues on approved leave during this period",
    )
    overlapping_colleagues: List[ColleagueOverlap] = Field(
        default_factory=list,
        description="List of overlapping approved leave records in the same department",
    )
    deadline_conflict: bool = Field(
        default=False,
        description="True if dates overlap with an active project deadline",
    )
    conflicting_deadlines: List[DeadlineConflict] = Field(
        default_factory=list,
        description="List of conflicting deadlines",
    )
    flags: List[str] = Field(
        default_factory=list,
        description="List of compliance warnings or notes",
    )
    summary: str = Field(
        default="",
        description="Human-readable compliance summary",
    )


# ── Agent B: Pattern Recognition Schemas ────────────────────────────────────

class PatternVerdict(BaseModel):
    pattern_flag: bool = Field(
        ...,
        description="True if unusual or repeating leave patterns are detected",
    )
    risk_level: str = Field(
        default="LOW",
        description="Risk level assessment: LOW | MEDIUM | HIGH",
    )
    friday_monday_cluster_count: int = Field(
        default=0,
        description="Number of recent leave requests extending weekends (Friday/Monday)",
    )
    friday_monday_ratio: float = Field(
        default=0.0,
        description="Percentage of recent requests clustering on Friday/Monday",
    )
    sick_without_cert_count: int = Field(
        default=0,
        description="Number of sick leaves without medical certificate attached",
    )
    total_requests_last_90d: int = Field(
        default=0,
        description="Total leave requests submitted in the last 90 days",
    )
    flagged_patterns: List[str] = Field(
        default_factory=list,
        description="Detailed list of flagged patterns",
    )
    summary: str = Field(
        default="",
        description="Human-readable pattern analysis summary",
    )


# ── Merged / Orchestrator Schemas ───────────────────────────────────────────

class LeaveEvaluationResult(BaseModel):
    leave_request_id: Optional[str] = None
    recommendation: AIRecommendationType = Field(
        ...,
        description="Final synthesized recommendation: APPROVE | REVIEW | REJECT",
    )
    confidence_score: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Confidence score in the recommendation between 0.0 and 1.0",
    )
    reasoning: str = Field(
        ...,
        description="Clear, concise justification rendered to the HR Admin",
    )
    key_factors: List[str] = Field(
        default_factory=list,
        description="Bullet points highlighting key drivers for the verdict",
    )
    compliance_verdict: ComplianceVerdict
    pattern_verdict: PatternVerdict
    evaluated_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="ISO timestamp of when the evaluation was performed",
    )


# ── Simulation & Testing Payloads ────────────────────────────────────────────

class SimulateLeaveRequest(BaseModel):
    employee_id: Optional[UUID] = None
    first_name: Optional[str] = "Jane"
    last_name: Optional[str] = "Doe"
    department: Optional[str] = "Engineering"
    leave_type: LeaveCategory = LeaveCategory.PAID
    start_date: date
    end_date: date
    remarks: Optional[str] = None
    attachment_url: Optional[str] = None
    
    # Optional mock overrides for standalone testing
    mock_allocated_days: Optional[float] = None
    mock_used_days: Optional[float] = None
    mock_overlapping_colleagues: Optional[List[ColleagueOverlap]] = None
    mock_deadlines: Optional[List[DeadlineConflict]] = None
    mock_past_requests: Optional[List[Dict[str, Any]]] = None
