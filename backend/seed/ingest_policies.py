import os
import glob
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is missing. Please add it to your .env file.")
genai.configure(api_key=GEMINI_API_KEY)

# Get DB Connection
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise ValueError("DATABASE_URL environment variable is missing. Please add it to your .env file.")

def get_db_connection():
    return psycopg2.connect(DB_URL)

def get_embedding(text: str) -> list[float]:
    """Get embedding from Gemini using text-embedding-004 (768 dimensions)."""
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

def chunk_text(text: str) -> list[str]:
    """Simple paragraph-level chunking by splitting on double newlines."""
    chunks = [c.strip() for c in text.split('\n\n') if c.strip()]
    return chunks

def ingest_policies():
    print("Starting policy ingestion with Gemini (768 dimensions)...")
    
    # Connect to Supabase DB
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Optional: Clear existing policy chunks if you want this script to be idempotent
    cursor.execute("DELETE FROM policy_chunks")
    conn.commit()
    
    policy_dir = Path(__file__).parent / "policy_docs"
    markdown_files = glob.glob(str(policy_dir / "*.md"))
    
    if not markdown_files:
        print(f"No markdown files found in {policy_dir}")
        return
    
    records_to_insert = []
    
    for file_path in markdown_files:
        filename = os.path.basename(file_path)
        print(f"Processing {filename}...")
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        chunks = chunk_text(content)
        
        for chunk in chunks:
            # Generate embedding
            embedding = get_embedding(chunk)
            
            # Format vector as string for pgvector insertion: '[0.1, 0.2, ...]'
            embedding_str = f"[{','.join(map(str, embedding))}]"
            
            records_to_insert.append((filename, chunk, embedding_str))
    
    if records_to_insert:
        print(f"Inserting {len(records_to_insert)} chunks into Supabase...")
        insert_query = """
            INSERT INTO policy_chunks (source_doc, chunk_text, embedding)
            VALUES %s
        """
        execute_values(cursor, insert_query, records_to_insert)
        conn.commit()
        print("Ingestion complete!")
    else:
        print("No chunks to insert.")
        
    cursor.close()
    conn.close()

if __name__ == "__main__":
    ingest_policies()
