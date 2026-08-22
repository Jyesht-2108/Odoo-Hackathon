"""
Agent B: Pattern Recognition Agent.

Evaluates an employee's historical leave requests (last ~90 days) to identify:
1. Day-of-week clustering (e.g. frequent Friday / Monday weekend extensions).
2. Sick leave compliance (e.g. repeated sick leaves without medical certificates).
3. Leave velocity / clustering (e.g. frequent consecutive leaves in short windows).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app.agents.schemas import LeaveCategory, PatternVerdict


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


def _is_weekend_extension(start_dt: date, end_dt: date) -> bool:
    """Check if a leave date range connects with a weekend (Friday=4 or Monday=0)."""
    cur = start_dt
    while cur <= end_dt:
        if cur.weekday() in (0, 4):  # Monday or Friday
            return True
        cur += timedelta(days=1)
    return False


async def evaluate_patterns(
    leave_request: Dict[str, Any],
    employee: Optional[Dict[str, Any]] = None,
    supabase_client: Any = None,
    mock_past_requests: Optional[List[Dict[str, Any]]] = None,
) -> PatternVerdict:
    """Run Pattern Recognition Agent on a leave request and historical records.

    Args:
        leave_request: Current leave request dict.
        employee: Optional employee profile dict.
        supabase_client: Supabase client instance.
        mock_past_requests: Optional list of past leave request dicts for testing.
    """
    if supabase_client is None:
        try:
            from app.core.supabase_client import supabase
            supabase_client = supabase
        except Exception:
            supabase_client = None

    start_dt = _parse_date(leave_request.get("start_date"))
    end_dt = _parse_date(leave_request.get("end_date"))
    current_leave_type = str(leave_request.get("leave_type") or "PAID").upper()
    has_attachment = bool(leave_request.get("attachment_url"))
    emp_id = str(leave_request.get("employee_id") or "")

    current_is_weekend_ext = _is_weekend_extension(start_dt, end_dt) if (start_dt and end_dt) else False

    # 1. Gather historical leave records for the employee (last 90 days)
    now_date = start_dt if start_dt else datetime.utcnow().date()
    cutoff_90d = now_date - timedelta(days=90)
    cutoff_30d = now_date - timedelta(days=30)

    past_records: List[Dict[str, Any]] = []

    if mock_past_requests is not None:
        past_records = mock_past_requests
    elif supabase_client and emp_id:
        try:
            res = (
                supabase_client.table("leave_requests")
                .select("*")
                .eq("employee_id", emp_id)
                .order("start_date", desc=True)
                .execute()
            )
            raw_data = res.data or []
            cur_req_id = str(leave_request.get("id") or "")
            for r in raw_data:
                if cur_req_id and str(r.get("id")) == cur_req_id:
                    continue
                past_records.append(r)
        except Exception:
            pass

    # Filter to last 90 days
    recent_90d: List[Dict[str, Any]] = []
    for r in past_records:
        r_start = _parse_date(r.get("start_date"))
        if r_start and r_start >= cutoff_90d:
            recent_90d.append(r)

    total_requests_90d = len(recent_90d) + 1  # Include current request
    flagged_patterns: List[str] = []

    # 2. Rule: Weekend Extension (Friday / Monday Clustering)
    friday_monday_count = 1 if current_is_weekend_ext else 0
    for r in recent_90d:
        r_s = _parse_date(r.get("start_date"))
        r_e = _parse_date(r.get("end_date")) or r_s
        if r_s and r_e and _is_weekend_extension(r_s, r_e):
            friday_monday_count += 1

    friday_monday_ratio = (friday_monday_count / total_requests_90d) if total_requests_90d > 0 else 0.0

    if friday_monday_count >= 3 and (friday_monday_ratio >= 0.5 or friday_monday_count >= 4):
        flagged_patterns.append(
            f"Weekend-extension pattern detected: {friday_monday_count} of {total_requests_90d} "
            f"recent requests cluster on a Friday or Monday ({friday_monday_ratio:.0%})."
        )

    # 3. Rule: Uncertified Sick Leave Pattern
    sick_without_cert_count = 0
    if current_leave_type in ("SICK", LeaveCategory.SICK.value) and not has_attachment:
        sick_without_cert_count += 1

    for r in recent_90d:
        r_type = str(r.get("leave_type") or "").upper()
        r_att = bool(r.get("attachment_url"))
        if r_type in ("SICK", LeaveCategory.SICK.value) and not r_att:
            sick_without_cert_count += 1

    if current_leave_type in ("SICK", LeaveCategory.SICK.value) and not has_attachment:
        if sick_without_cert_count >= 2:
            flagged_patterns.append(
                f"Recurring sick leave without medical certificate: {sick_without_cert_count} "
                f"uncertified sick leaves requested in the last 90 days."
            )
        else:
            flagged_patterns.append("Sick leave submitted without an attached medical certificate.")

    # 4. Rule: High Frequency / Velocity in 30 Days
    recent_30d_count = 1
    for r in recent_90d:
        r_s = _parse_date(r.get("start_date"))
        if r_s and r_s >= cutoff_30d:
            recent_30d_count += 1

    if recent_30d_count >= 3:
        flagged_patterns.append(
            f"High leave frequency: {recent_30d_count} leave requests submitted in the last 30 days."
        )

    # 5. Rule: Back-to-Back Leave Proximity
    if start_dt:
        for r in recent_90d:
            r_e = _parse_date(r.get("end_date"))
            if r_e and timedelta(days=0) <= (start_dt - r_e) <= timedelta(days=3):
                flagged_patterns.append(
                    f"Back-to-back leave: Another leave period concluded recently on {r_e.isoformat()}."
                )
                break

    # 6. Risk level determination
    pattern_flag = len(flagged_patterns) > 0
    if len(flagged_patterns) >= 2 or sick_without_cert_count >= 3:
        risk_level = "HIGH"
    elif len(flagged_patterns) == 1:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Human-readable summary
    if not pattern_flag:
        summary = "No anomalous or recurring leave patterns detected in the last 90 days."
    else:
        summary = f"{len(flagged_patterns)} pattern signal(s) flagged: " + " ".join(flagged_patterns)

    return PatternVerdict(
        pattern_flag=pattern_flag,
        risk_level=risk_level,
        friday_monday_cluster_count=friday_monday_count,
        friday_monday_ratio=round(friday_monday_ratio, 2),
        sick_without_cert_count=sick_without_cert_count,
        total_requests_last_90d=total_requests_90d,
        flagged_patterns=flagged_patterns,
        summary=summary,
    )
