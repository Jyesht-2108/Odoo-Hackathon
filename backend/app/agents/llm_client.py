"""
Swappable LLM client wrapper for Agent Orchestration.

Supports:
- Anthropic Claude (via REST / official endpoint)
- OpenAI GPT (via REST / official endpoint)
- Groq / OpenAI-compatible local endpoints (Ollama, vLLM)
- Intelligent Deterministic Rule Synthesizer (Zero-dependency fallback mode)
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional
import httpx

from app.agents.schemas import (
    AIRecommendationType,
    ComplianceVerdict,
    PatternVerdict,
)


def _deterministic_synthesis(
    compliance: ComplianceVerdict,
    pattern: PatternVerdict,
    leave_request: Dict[str, Any],
    employee: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Reliable fallback synthesizer that mimics LLM output deterministically."""
    key_factors: List[str] = []
    
    # 1. Hard Rejection triggers
    if not compliance.balance_sufficient:
        key_factors.append(
            f"Insufficient leave balance ({compliance.available_balance:.1f} available vs {compliance.requested_days} requested)."
        )
        return {
            "recommendation": AIRecommendationType.REJECT.value,
            "confidence_score": 0.95,
            "reasoning": (
                f"Recommended: Reject — Employee has insufficient {compliance.leave_type.value} leave balance "
                f"({compliance.available_balance:.1f} days remaining for {compliance.requested_days} requested days)."
            ),
            "key_factors": key_factors,
        }

    # 2. Review triggers (Deadlines, heavy overlaps, or high-risk pattern)
    review_reasons: List[str] = []
    
    if compliance.deadline_conflict:
        titles = ", ".join([f"'{d.title}'" for d in compliance.conflicting_deadlines])
        factor = f"Date range overlaps with project milestone(s): {titles}."
        review_reasons.append(factor)
        key_factors.append(factor)

    if compliance.overlap_count > 1:
        factor = f"{compliance.overlap_count} department colleagues already on approved leave during this period."
        review_reasons.append(factor)
        key_factors.append(factor)

    if pattern.pattern_flag:
        for p in pattern.flagged_patterns:
            key_factors.append(p)
        review_reasons.append(pattern.summary)

    if review_reasons:
        reason_text = "; ".join(review_reasons[:2])
        return {
            "recommendation": AIRecommendationType.REVIEW.value,
            "confidence_score": 0.88,
            "reasoning": f"Flag for HR Review — {reason_text}",
            "key_factors": key_factors,
        }

    # 3. Clean Approval
    key_factors.append(f"Leave balance verified ({compliance.available_balance:.1f} days available).")
    key_factors.append("No project milestone conflicts or department overlaps.")
    key_factors.append("Clean historical attendance and leave pattern.")
    
    return {
        "recommendation": AIRecommendationType.APPROVE.value,
        "confidence_score": 0.96,
        "reasoning": "Recommended: Approve — Balance is sufficient, no department overlaps, and no anomalous leave patterns detected.",
        "key_factors": key_factors,
    }


class LLMClient:
    """Wrapper that communicates with configured LLM providers or falls back safely."""

    def __init__(self):
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        self.openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
        self.openai_base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.provider = os.environ.get("LLM_PROVIDER", "").lower().strip()

        if not self.provider:
            if self.anthropic_api_key:
                self.provider = "anthropic"
            elif self.openai_api_key:
                self.provider = "openai"
            elif self.groq_api_key:
                self.provider = "groq"
            else:
                self.provider = "fallback"

    async def synthesize_leave_verdict(
        self,
        compliance: ComplianceVerdict,
        pattern: PatternVerdict,
        leave_request: Dict[str, Any],
        employee: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Synthesize Agent A and Agent B verdicts into a final recommendation."""
        emp_name = "Employee"
        dept = "General"
        if employee:
            emp_name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip() or "Employee"
            dept = employee.get("department", "General")

        prompt_payload = {
            "employee_name": emp_name,
            "department": dept,
            "leave_type": compliance.leave_type.value,
            "requested_days": compliance.requested_days,
            "start_date": str(leave_request.get("start_date")),
            "end_date": str(leave_request.get("end_date")),
            "remarks": leave_request.get("remarks"),
            "agent_a_compliance": {
                "balance_sufficient": compliance.balance_sufficient,
                "available_balance": compliance.available_balance,
                "remaining_after_request": compliance.remaining_after_request,
                "overlap_count": compliance.overlap_count,
                "overlapping_colleagues": [c.model_dump() for c in compliance.overlapping_colleagues],
                "deadline_conflict": compliance.deadline_conflict,
                "conflicting_deadlines": [d.model_dump() for d in compliance.conflicting_deadlines],
                "flags": compliance.flags,
            },
            "agent_b_pattern": {
                "pattern_flag": pattern.pattern_flag,
                "risk_level": pattern.risk_level,
                "friday_monday_cluster_count": pattern.friday_monday_cluster_count,
                "friday_monday_ratio": pattern.friday_monday_ratio,
                "sick_without_cert_count": pattern.sick_without_cert_count,
                "total_requests_last_90d": pattern.total_requests_last_90d,
                "flagged_patterns": pattern.flagged_patterns,
            },
        }

        system_instruction = (
            "You are the Senior AI Leave Triage & Compliance Specialist for Dayflow HRMS.\n"
            "You receive evaluations from Agent A (Compliance Checker) and Agent B (Pattern Recognition).\n"
            "Synthesize these findings into a fair, actionable recommendation for HR.\n"
            "Output MUST be valid JSON with this exact schema:\n"
            "{\n"
            '  "recommendation": "APPROVE" | "REVIEW" | "REJECT",\n'
            '  "confidence_score": 0.0 to 1.0,\n'
            '  "reasoning": "Clear, professional 1-3 sentence explanation summarizing why this recommendation was given",\n'
            '  "key_factors": ["string 1", "string 2"]\n'
            "}\n"
            "Rules:\n"
            "- REJECT: Only if hard policy violation (e.g. balance insufficient or critical milestone block).\n"
            "- REVIEW: If multiple colleagues overlap, active deadline conflict, or suspicious pattern flags.\n"
            "- APPROVE: If balance is sufficient, clean pattern, and no significant blocker.\n"
            "Return ONLY the JSON object, with no markdown backticks or extra text."
        )

        # 1. Try Anthropic if configured
        if self.provider == "anthropic" and self.anthropic_api_key:
            try:
                res = await self._call_anthropic(system_instruction, json.dumps(prompt_payload, indent=2))
                if res:
                    return res
            except Exception as e:
                print(f"[LLMClient] Anthropic call failed, falling back: {e}")

        # 2. Try OpenAI if configured
        if self.provider == "openai" and self.openai_api_key:
            try:
                res = await self._call_openai(system_instruction, json.dumps(prompt_payload, indent=2))
                if res:
                    return res
            except Exception as e:
                print(f"[LLMClient] OpenAI call failed, falling back: {e}")

        # 3. Try Groq if configured
        if self.provider == "groq" and self.groq_api_key:
            try:
                res = await self._call_groq(system_instruction, json.dumps(prompt_payload, indent=2))
                if res:
                    return res
            except Exception as e:
                print(f"[LLMClient] Groq call failed, falling back: {e}")

        # 4. Fallback to deterministic synthesis
        return _deterministic_synthesis(compliance, pattern, leave_request, employee)

    async def _call_anthropic(self, system: str, user_content: str) -> Optional[Dict[str, Any]]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 512,
            "temperature": 0.1,
            "system": system,
            "messages": [{"role": "user", "content": user_content}],
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            text = data["content"][0]["text"]
            return self._parse_json(text)

    async def _call_openai(self, system: str, user_content: str) -> Optional[Dict[str, Any]]:
        url = f"{self.openai_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "gpt-4o-mini",
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return self._parse_json(text)

    async def _call_groq(self, system: str, user_content: str) -> Optional[Dict[str, Any]]:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return self._parse_json(text)

    def _parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        try:
            cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            parsed = json.loads(cleaned)
            rec = parsed.get("recommendation", "REVIEW").upper()
            if rec not in ("APPROVE", "REVIEW", "REJECT"):
                rec = "REVIEW"
            parsed["recommendation"] = rec
            return parsed
        except Exception:
            return None


llm_client = LLMClient()
