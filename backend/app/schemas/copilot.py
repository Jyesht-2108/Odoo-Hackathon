from pydantic import BaseModel, Field

class CopilotRequest(BaseModel):
    question: str = Field(..., description="The user's question to the HR Copilot")

class CopilotResponse(BaseModel):
    answer: str = Field(..., description="The AI generated answer")
    sources: list[str] = Field(default_factory=list, description="List of policy document filenames used for the answer")
