import os
import psycopg2
import google.generativeai as genai
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel

from app.core.auth import CurrentUser, get_current_user
from app.schemas.copilot import CopilotRequest, CopilotResponse

router = APIRouter(prefix="/copilot", tags=["copilot"])

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

DB_URL = os.getenv("DATABASE_URL")

@router.post("/ask", response_model=CopilotResponse)
def ask_copilot(
    payload: CopilotRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Ask the RAG HR Policy Copilot a question."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not configured."
        )

    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # 1. Embed the question
        emb_result = genai.embed_content(
            model="models/text-embedding-004",
            content=question,
            task_type="retrieval_query"
        )
        query_embedding = emb_result["embedding"]
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        # 2. Retrieve top chunks from Supabase using psycopg2
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # Calculate cosine similarity using <=>
        cur.execute(
            """
            SELECT source_doc, chunk_text, 1 - (embedding <=> %s::vector) as similarity
            FROM policy_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT 4;
            """,
            (embedding_str, embedding_str)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            return CopilotResponse(
                answer="I couldn't find any policy documents to answer your question.",
                sources=[]
            )

        context_blocks = []
        sources = set()
        for doc, text, sim in rows:
            context_blocks.append(f"--- Document: {doc} ---\n{text}")
            sources.add(doc)

        context_text = "\n\n".join(context_blocks)

        # 3. Generate Answer
        system_prompt = (
            "You are the Dayflow HR Policy Copilot. "
            "Answer the user's question accurately using ONLY the provided policy context below. "
            "If the answer is not contained in the context, politely state that you do not know based on the current policies. "
            f"You are speaking to an employee with the role: {current_user.role}.\n\n"
            f"CONTEXT:\n{context_text}"
        )

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([
            {"role": "user", "parts": [system_prompt]},
            {"role": "user", "parts": [f"Question: {question}"]}
        ])

        return CopilotResponse(
            answer=response.text.strip(),
            sources=list(sources)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Copilot error: {str(e)}"
        )
