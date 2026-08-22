"""
AI Agents Module (Person 3 Track).

Contains:
- Agent A: Compliance Checker (balance, department overlaps, deadlines)
- Agent B: Pattern Recognition (weekend clustering, uncertified sick leave, velocity)
- LangGraph Orchestrator: Parallel node execution & LLM recommendation synthesis
- Swappable LLM client: Anthropic, OpenAI, Groq, local models, and rule synthesizer fallback
"""

from app.agents.compliance_agent import evaluate_compliance
from app.agents.llm_client import llm_client
from app.agents.orchestrator import (
    create_orchestration_graph,
    evaluate_leave,
    evaluate_leave_request_by_id,
)
from app.agents.pattern_agent import evaluate_patterns
from app.agents.schemas import (
    ColleagueOverlap,
    ComplianceVerdict,
    DeadlineConflict,
    LeaveEvaluationResult,
    PatternVerdict,
    SimulateLeaveRequest,
)

__all__ = [
    "evaluate_compliance",
    "evaluate_patterns",
    "evaluate_leave",
    "evaluate_leave_request_by_id",
    "create_orchestration_graph",
    "llm_client",
    "ComplianceVerdict",
    "PatternVerdict",
    "LeaveEvaluationResult",
    "ColleagueOverlap",
    "DeadlineConflict",
    "SimulateLeaveRequest",
]
