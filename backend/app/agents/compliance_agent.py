"""
Agent A: Compliance Checker.

Evaluates a leave request against:
1. Available leave balance for the requested year and leave category.
2. Overlapping approved leave requests by colleagues in the same department.
3. Proximity / overlap with company and department project deadlines.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.agents.schemas import (
    ColleagueOverlap,
    ComplianceVerdict,
    DeadlineConflict,
    LeaveCategory,
)


def _parse_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        try:
            return date.fromisoformat(val.split("T")[0])
        except Exception:
            return None
    return None


async def evaluate_compliance(
    leave_request: Dict[str, Any],
    employee: Optional[Dict[str, Any]] = None,
    company_id: Optional[str] = None,
    supabase_client: Any = None,
    # Optional mock parameters for standalone execution/testing:
    mock_allocated_days: Optional[float] = None,
    mock_used_days: Optional[float] = None,
    mock_overlapping_colleagues: Optional[List[ColleagueOverlap]] = None,
    mock_deadlines: Optional[List[DeadlineConflict]] = None,
) -> ComplianceVerdict:
    """Run Compliance Agent evaluation on a leave request.

    Args:
        leave_request: Dict containing start_date, end_date, leave_type, employee_id, etc.
        employee: Optional employee profile dict (first_name, last_name, department, user_id).
        company_id: Optional company UUID string.
        supabase_client: Supabase client instance (defaults to app.core.supabase_client.supabase if available).
        mock_*: Optional mocks for testing without a live database.
    """
    if supabase_client is None:
        try:
            from app.core.supabase_client import supabase
            supabase_client = supabase
        except Exception:
            supabase_client = None

    # 1. Parse dates & requested days
    start_dt = _parse_date(leave_request.get("start_date"))
    end_dt = _parse_date(leave_request.get("end_date"))
    leave_type_raw = leave_request.get("leave_type", "PAID")
    
    if isinstance(leave_type_raw, LeaveCategory):
        leave_type_str = leave_type_raw.value
    else:
        leave_type_str = str(leave_type_raw).upper()

    try:
        leave_type_enum = LeaveCategory(leave_type_str)
    except ValueError:
        leave_type_enum = LeaveCategory.PAID

    if not start_dt or not end_dt or end_dt < start_dt:
        requested_days = 1
        year = datetime.utcnow().year
    else:
        requested_days = (end_dt - start_dt).days + 1
        year = start_dt.year

    emp_id = str(leave_request.get("employee_id") or "")
    flags: List[str] = []

    # 2. Fetch Employee & Company context if not provided
    emp_department = None
    if employee:
        emp_department = employee.get("department")
        emp_user_id = employee.get("user_id")
    elif supabase_client and emp_id:
        try:
            emp_res = supabase_client.table("employees").select("*").eq("id", emp_id).execute()
            if emp_res.data:
                employee = emp_res.data[0]
                emp_department = employee.get("department")
                emp_user_id = employee.get("user_id")
                if not company_id and emp_user_id:
                    user_res = supabase_client.table("users").select("company_id").eq("id", str(emp_user_id)).execute()
                    if user_res.data:
                        company_id = user_res.data[0].get("company_id")
        except Exception as e:
            flags.append(f"DB lookup notice: employee info could not be refreshed ({str(e)})")

    # 3. Check Leave Balance
    if mock_allocated_days is not None:
        allocated = float(mock_allocated_days)
        used = float(mock_used_days or 0.0)
        available = allocated - used
    elif leave_type_enum == LeaveCategory.UNPAID:
        allocated = 999.0
        used = 0.0
        available = 999.0
    elif supabase_client and emp_id:
        try:
            alloc_res = (
                supabase_client.table("leave_allocations")
                .select("*")
                .eq("employee_id", emp_id)
                .eq("leave_type", leave_type_enum.value)
                .eq("year", year)
                .execute()
            )
            if alloc_res.data:
                alloc_row = alloc_res.data[0]
                allocated = float(alloc_row.get("allocated_days") or 0.0)
                used = float(alloc_row.get("used_days") or 0.0)
                available = allocated - used
            else:
                allocated = 0.0
                used = 0.0
                available = 0.0
                flags.append(f"No {leave_type_enum.value} leave allocation configured for year {year}.")
        except Exception as e:
            allocated = 0.0
            used = 0.0
            available = 0.0
            flags.append(f"Could not query leave allocations: {str(e)}")
    else:
        # Default fallback for standalone mock
        allocated = 20.0
        used = 5.0
        available = 15.0

    if leave_type_enum == LeaveCategory.UNPAID:
        balance_sufficient = True
        remaining_after = available
    else:
        balance_sufficient = available >= requested_days
        remaining_after = available - requested_days
        if not balance_sufficient:
            flags.append(
                f"Insufficient {leave_type_enum.value} leave balance: "
                f"requested {requested_days} day(s), but only {available:.1f} day(s) remaining."
            )

    # 4. Check Overlapping Department Leaves
    overlapping_colleagues: List[ColleagueOverlap] = []
    if mock_overlapping_colleagues is not None:
        overlapping_colleagues = mock_overlapping_colleagues
    elif supabase_client and emp_department and start_dt and end_dt:
        try:
            # Find department peers
            peer_query = (
                supabase_client.table("employees")
                .select("id, first_name, last_name, department")
                .eq("department", emp_department)
            )
            if emp_id:
                peer_query = peer_query.neq("id", emp_id)
            peer_res = peer_query.execute()

            peer_map = {p["id"]: p for p in (peer_res.data or [])}
            peer_ids = list(peer_map.keys())

            if peer_ids:
                # Query approved leaves for peers
                leaves_res = (
                    supabase_client.table("leave_requests")
                    .select("*")
                    .in_("employee_id", peer_ids)
                    .eq("status", "APPROVED")
                    .execute()
                )
                
                req_start_iso = start_dt.isoformat()
                req_end_iso = end_dt.isoformat()

                for row in (leaves_res.data or []):
                    r_start = str(row.get("start_date", ""))
                    r_end = str(row.get("end_date", ""))
                    # Overlap check: req_start <= r_end AND req_end >= r_start
                    if r_start and r_end and req_start_iso <= r_end and req_end_iso >= r_start:
                        peer_info = peer_map.get(row["employee_id"], {})
                        peer_name = f"{peer_info.get('first_name', '')} {peer_info.get('last_name', '')}".strip() or "Colleague"
                        overlapping_colleagues.append(
                            ColleagueOverlap(
                                employee_id=str(row["employee_id"]),
                                employee_name=peer_name,
                                department=emp_department,
                                start_date=r_start,
                                end_date=r_end,
                                leave_type=str(row.get("leave_type", "")),
                            )
                        )
        except Exception as e:
            flags.append(f"Could not check department peer leaves: {str(e)}")

    if overlapping_colleagues:
        overlap_names = ", ".join([f"{c.employee_name} ({c.start_date} to {c.end_date})" for c in overlapping_colleagues])
        flags.append(
            f"{len(overlapping_colleagues)} colleague(s) in {emp_department or 'the department'} "
            f"already on approved leave: {overlap_names}"
        )

    # 5. Check Project Deadlines
    conflicting_deadlines: List[DeadlineConflict] = []
    if mock_deadlines is not None:
        conflicting_deadlines = mock_deadlines
    elif supabase_client and start_dt and end_dt:
        try:
            d_query = supabase_client.table("deadlines").select("*")
            if company_id:
                d_query = d_query.eq("company_id", str(company_id))
            deadlines_res = d_query.execute()

            req_start_iso = start_dt.isoformat()
            req_end_iso = end_dt.isoformat()

            for d in (deadlines_res.data or []):
                d_dept = d.get("department")
                # Deadline applies if department is null (company-wide) or matches employee department
                if not d_dept or not emp_department or d_dept.lower() == emp_department.lower():
                    d_start = str(d.get("date_range_start") or "")
                    d_end = str(d.get("date_range_end") or "")
                    
                    # If both start & end exist, check date overlap
                    is_conflict = False
                    if d_start and d_end:
                        if req_start_iso <= d_end and req_end_iso >= d_start:
                            is_conflict = True
                    elif d_start:
                        if req_start_iso <= d_start <= req_end_iso:
                            is_conflict = True
                    elif d_end:
                        if req_start_iso <= d_end <= req_end_iso:
                            is_conflict = True

                    if is_conflict:
                        conflicting_deadlines.append(
                            DeadlineConflict(
                                deadline_id=str(d.get("id")) if d.get("id") else None,
                                title=d.get("title", "Project Milestone"),
                                department=d_dept,
                                date_range_start=d_start or None,
                                date_range_end=d_end or None,
                            )
                        )
        except Exception as e:
            flags.append(f"Could not check deadlines: {str(e)}")

    if conflicting_deadlines:
        d_titles = ", ".join([f"'{cd.title}'" for cd in conflicting_deadlines])
        flags.append(f"Conflicts with critical project deadline(s): {d_titles}")

    # 6. Synthesize Compliance Verdict
    deadline_conflict = len(conflicting_deadlines) > 0
    overlap_count = len(overlapping_colleagues)
    
    # Compliance passes if balance is sufficient, no deadline conflicts, and department overlap is 0 or 1
    passed = balance_sufficient and not deadline_conflict and overlap_count <= 1

    summary_parts = []
    if balance_sufficient:
        summary_parts.append(f"Balance verified ({available:.1f} days remaining for {requested_days} requested).")
    else:
        summary_parts.append(f"Balance insufficient ({available:.1f} available vs {requested_days} requested).")

    if overlap_count == 0:
        summary_parts.append("No department colleague overlaps.")
    else:
        summary_parts.append(f"{overlap_count} department overlap(s) detected.")

    if deadline_conflict:
        summary_parts.append(f"Deadline conflict with {len(conflicting_deadlines)} project milestone(s).")
    else:
        summary_parts.append("No active deadline conflicts.")

    summary = " ".join(summary_parts)

    return ComplianceVerdict(
        passed=passed,
        balance_sufficient=balance_sufficient,
        requested_days=requested_days,
        allocated_days=allocated,
        used_days=used,
        available_balance=available,
        remaining_after_request=remaining_after,
        leave_type=leave_type_enum,
        overlap_count=overlap_count,
        overlapping_colleagues=overlapping_colleagues,
        deadline_conflict=deadline_conflict,
        conflicting_deadlines=conflicting_deadlines,
        flags=flags,
        summary=summary,
    )
