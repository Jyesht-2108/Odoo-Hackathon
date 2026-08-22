"""
Pydantic schemas mirroring the ground-truth SQL enums and tables.

All field names match the Postgres column names exactly.
Used purely for request/response validation — there is no ORM layer.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Enums (match SQL ENUM types exactly) ─────────────────────────────────────

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    HR = "HR"
    EMPLOYEE = "EMPLOYEE"


class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    HALF_DAY = "HALF_DAY"
    LEAVE = "LEAVE"


class LeaveCategory(str, Enum):
    PAID = "PAID"
    SICK = "SICK"
    UNPAID = "UNPAID"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AIRecommendationType(str, Enum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


# ── Company ──────────────────────────────────────────────────────────────────

class CompanyBase(BaseModel):
    name: str
    logo_url: Optional[str] = None


class CompanyOut(CompanyBase):
    id: UUID
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── User ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: UUID
    company_id: Optional[UUID] = None
    login_id: str
    email: str
    role: UserRole
    must_reset_password: bool = True
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Employee ─────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    """Payload sent by Admin/HR to create a new employee + auth user."""

    first_name: str
    last_name: str
    email: EmailStr
    department: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None
    dob: Optional[date] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    date_of_joining: Optional[date] = None
    about: Optional[str] = None
    skills: Optional[Any] = None
    interests: Optional[Any] = None
    certifications: Optional[Any] = None
    role: UserRole = UserRole.EMPLOYEE


class EmployeeUpdate(BaseModel):
    """Fields that can be patched on an employee profile."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None
    dob: Optional[date] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    date_of_joining: Optional[date] = None
    about: Optional[str] = None
    skills: Optional[Any] = None
    interests: Optional[Any] = None
    certifications: Optional[Any] = None


class EmployeeOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    first_name: str
    last_name: str
    department: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None
    dob: Optional[date] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    date_of_joining: Optional[date] = None
    about: Optional[str] = None
    skills: Optional[Any] = None
    interests: Optional[Any] = None
    certifications: Optional[Any] = None

    model_config = {"from_attributes": True}


# ── Salary Components ────────────────────────────────────────────────────────

class SalaryComponentUpdate(BaseModel):
    monthly_wage: Optional[Decimal] = None
    working_days_per_week: Optional[int] = None
    basic_pct: Optional[Decimal] = None
    hra_pct: Optional[Decimal] = None
    standard_allowance: Optional[Decimal] = None
    leave_travel_allowance: Optional[Decimal] = None
    fixed_allowance: Optional[Decimal] = None
    pf_pct: Optional[Decimal] = None
    professional_tax: Optional[Decimal] = None


class SalaryComponentOut(BaseModel):
    id: UUID
    employee_id: UUID
    monthly_wage: Optional[Decimal] = None
    working_days_per_week: Optional[int] = None
    basic_pct: Optional[Decimal] = None
    hra_pct: Optional[Decimal] = None
    standard_allowance: Optional[Decimal] = None
    leave_travel_allowance: Optional[Decimal] = None
    fixed_allowance: Optional[Decimal] = None
    pf_pct: Optional[Decimal] = None
    professional_tax: Optional[Decimal] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Attendance ───────────────────────────────────────────────────────────────

class AttendanceOut(BaseModel):
    id: UUID
    employee_id: UUID
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[AttendanceStatus] = None
    work_hours: Optional[Decimal] = None
    extra_hours: Optional[Decimal] = None

    model_config = {"from_attributes": True}


# ── Leave Allocations ────────────────────────────────────────────────────────

class LeaveAllocationCreate(BaseModel):
    employee_id: UUID
    leave_type: LeaveCategory
    allocated_days: Decimal
    year: int


class LeaveAllocationUpdate(BaseModel):
    allocated_days: Optional[Decimal] = None
    used_days: Optional[Decimal] = None


class LeaveAllocationOut(BaseModel):
    id: UUID
    employee_id: UUID
    leave_type: LeaveCategory
    allocated_days: Decimal
    used_days: Decimal = Decimal("0")
    year: int

    model_config = {"from_attributes": True}


# ── Leave Requests ───────────────────────────────────────────────────────────

class LeaveRequestCreate(BaseModel):
    leave_type: LeaveCategory
    start_date: date
    end_date: date
    remarks: Optional[str] = None
    attachment_url: Optional[str] = None


class LeaveRequestDecision(BaseModel):
    status: LeaveStatus = Field(..., description="APPROVED or REJECTED")


class LeaveRequestOut(BaseModel):
    id: UUID
    employee_id: UUID
    leave_type: LeaveCategory
    start_date: date
    end_date: date
    remarks: Optional[str] = None
    attachment_url: Optional[str] = None
    status: LeaveStatus = LeaveStatus.PENDING
    ai_recommendation: Optional[AIRecommendationType] = None
    ai_reasoning: Optional[str] = None
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Deadlines ────────────────────────────────────────────────────────────────

class DeadlineCreate(BaseModel):
    department: Optional[str] = None
    title: str
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None


class DeadlineUpdate(BaseModel):
    department: Optional[str] = None
    title: Optional[str] = None
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None


class DeadlineOut(BaseModel):
    id: UUID
    company_id: UUID
    department: Optional[str] = None
    title: str
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None

    model_config = {"from_attributes": True}


# ── Convenience response wrappers ────────────────────────────────────────────

class EmployeeCreateResponse(BaseModel):
    """Returned after Admin/HR creates a new employee."""

    employee: EmployeeOut
    user: UserOut
    generated_password: str
