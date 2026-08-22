"""
Standalone Test Runner for Person 3 Track (Agentic Leave Approval).

Run with:
    python -m app.agents.test_agents
or:
    python app/agents/test_agents.py
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
import sys
import os

# Add backend directory to sys.path if running as script
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.agents.compliance_agent import evaluate_compliance
from app.agents.pattern_agent import evaluate_patterns
from app.agents.orchestrator import evaluate_leave
from app.agents.schemas import (
    AIRecommendationType,
    ColleagueOverlap,
    DeadlineConflict,
    LeaveCategory,
)


async def run_all_tests():
    print("=" * 70)
    print("🚀 DAYFLOW AGENTIC LEAVE TRIAGE TEST SUITE (PERSON 3)")
    print("=" * 70)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 1: Clean Leave Request (Should APPROVE)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[Test 1] Standard Request — Sufficient Balance & Clean History")
    req1 = {
        "employee_id": "00000000-0000-0000-0000-000000000001",
        "leave_type": "PAID",
        "start_date": "2026-09-08",  # Tuesday
        "end_date": "2026-09-10",    # Thursday
        "remarks": "Family vacation",
    }
    emp1 = {
        "id": "00000000-0000-0000-0000-000000000001",
        "first_name": "Alice",
        "last_name": "Smith",
        "department": "Engineering",
    }
    res1 = await evaluate_leave(
        leave_request=req1,
        employee=emp1,
        mock_allocated_days=20.0,
        mock_used_days=4.0,
        mock_overlapping_colleagues=[],
        mock_deadlines=[],
        mock_past_requests=[],
    )

    print(f"  • Verdict: {res1.recommendation.value}")
    print(f"  • Confidence: {res1.confidence_score:.2f}")
    print(f"  • Reasoning: {res1.reasoning}")
    print(f"  • Compliance: {res1.compliance_verdict.summary}")
    print(f"  • Pattern: {res1.pattern_verdict.summary}")
    assert res1.recommendation == AIRecommendationType.APPROVE, f"Expected APPROVE, got {res1.recommendation}"
    print("  ✅ Test 1 PASSED: Clean leave request successfully approved.")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 2: Insufficient Leave Balance (Should REJECT)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[Test 2] Policy Violation — Insufficient Paid Leave Balance")
    req2 = {
        "employee_id": "00000000-0000-0000-0000-000000000002",
        "leave_type": "PAID",
        "start_date": "2026-09-01",
        "end_date": "2026-09-10",  # 10 days requested
        "remarks": "Extended trip",
    }
    emp2 = {
        "id": "00000000-0000-0000-0000-000000000002",
        "first_name": "Bob",
        "last_name": "Jones",
        "department": "Product",
    }
    res2 = await evaluate_leave(
        leave_request=req2,
        employee=emp2,
        mock_allocated_days=10.0,
        mock_used_days=8.0,  # Only 2 days available
        mock_overlapping_colleagues=[],
        mock_deadlines=[],
        mock_past_requests=[],
    )

    print(f"  • Verdict: {res2.recommendation.value}")
    print(f"  • Confidence: {res2.confidence_score:.2f}")
    print(f"  • Reasoning: {res2.reasoning}")
    print(f"  • Balance sufficient: {res2.compliance_verdict.balance_sufficient}")
    assert res2.recommendation == AIRecommendationType.REJECT, f"Expected REJECT, got {res2.recommendation}"
    print("  ✅ Test 2 PASSED: Insufficient balance flagged for rejection.")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 3: Team Overlap & Deadline Conflict (Should REVIEW)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[Test 3] Operational Risk — Department Overlap & Project Deadline")
    req3 = {
        "employee_id": "00000000-0000-0000-0000-000000000003",
        "leave_type": "PAID",
        "start_date": "2026-10-12",
        "end_date": "2026-10-16",
        "remarks": "Personal time off",
    }
    emp3 = {
        "id": "00000000-0000-0000-0000-000000000003",
        "first_name": "Charlie",
        "last_name": "Brown",
        "department": "Engineering",
    }
    overlaps3 = [
        ColleagueOverlap(
            employee_id="00000000-0000-0000-0000-000000000004",
            employee_name="David Miller",
            department="Engineering",
            start_date="2026-10-10",
            end_date="2026-10-15",
            leave_type="PAID",
        ),
        ColleagueOverlap(
            employee_id="00000000-0000-0000-0000-000000000005",
            employee_name="Emma Davis",
            department="Engineering",
            start_date="2026-10-13",
            end_date="2026-10-17",
            leave_type="PAID",
        ),
    ]
    deadlines3 = [
        DeadlineConflict(
            title="Q4 Major Release Deploy",
            department="Engineering",
            date_range_start="2026-10-14",
            date_range_end="2026-10-16",
        )
    ]
    res3 = await evaluate_leave(
        leave_request=req3,
        employee=emp3,
        mock_allocated_days=25.0,
        mock_used_days=5.0,
        mock_overlapping_colleagues=overlaps3,
        mock_deadlines=deadlines3,
        mock_past_requests=[],
    )

    print(f"  • Verdict: {res3.recommendation.value}")
    print(f"  • Confidence: {res3.confidence_score:.2f}")
    print(f"  • Reasoning: {res3.reasoning}")
    print(f"  • Key Factors: {res3.key_factors}")
    assert res3.recommendation == AIRecommendationType.REVIEW, f"Expected REVIEW, got {res3.recommendation}"
    assert res3.compliance_verdict.deadline_conflict is True
    assert res3.compliance_verdict.overlap_count == 2
    print("  ✅ Test 3 PASSED: Multiple overlaps + deadline conflict flagged for HR Review.")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 4: Pattern Recognition — Weekend Clustering & Uncertified Sick Leave
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[Test 4] Pattern Flagging — Recurring Friday Absences & Sick Leave without Cert")
    # Friday leave
    req4 = {
        "employee_id": "00000000-0000-0000-0000-000000000006",
        "leave_type": "SICK",
        "start_date": "2026-08-28",  # Friday
        "end_date": "2026-08-28",    # Friday
        "remarks": "Feeling unwell",
        "attachment_url": None,     # No certificate attached!
    }
    emp4 = {
        "id": "00000000-0000-0000-0000-000000000006",
        "first_name": "Daniel",
        "last_name": "Wilson",
        "department": "Design",
    }
    past4 = [
        {"start_date": "2026-08-14", "end_date": "2026-08-14", "leave_type": "SICK", "attachment_url": None},  # Friday
        {"start_date": "2026-07-31", "end_date": "2026-07-31", "leave_type": "PAID", "attachment_url": None},  # Friday
        {"start_date": "2026-07-17", "end_date": "2026-07-17", "leave_type": "PAID", "attachment_url": None},  # Friday
        {"start_date": "2026-07-06", "end_date": "2026-07-06", "leave_type": "PAID", "attachment_url": None},  # Monday
    ]
    res4 = await evaluate_leave(
        leave_request=req4,
        employee=emp4,
        mock_allocated_days=15.0,
        mock_used_days=3.0,
        mock_overlapping_colleagues=[],
        mock_deadlines=[],
        mock_past_requests=past4,
    )

    print(f"  • Verdict: {res4.recommendation.value}")
    print(f"  • Confidence: {res4.confidence_score:.2f}")
    print(f"  • Reasoning: {res4.reasoning}")
    print(f"  • Pattern Flag: {res4.pattern_verdict.pattern_flag}")
    print(f"  • Flagged Patterns: {res4.pattern_verdict.flagged_patterns}")
    assert res4.recommendation == AIRecommendationType.REVIEW, f"Expected REVIEW, got {res4.recommendation}"
    assert res4.pattern_verdict.pattern_flag is True
    assert res4.pattern_verdict.friday_monday_cluster_count >= 4
    assert res4.pattern_verdict.sick_without_cert_count >= 2
    print("  ✅ Test 4 PASSED: Weekend clustering and uncertified sick leave flagged accurately.")

    print("\n" + "=" * 70)
    print("🎉 ALL 4 AGENT TRIAGE TESTS PASSED FLAWLESSLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
