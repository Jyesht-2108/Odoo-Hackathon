"""
Shared Supabase client initialized with the **service role key**.

All DB access goes through this client.  Because there are no RLS policies,
the service role key is required — and access control is enforced entirely
in FastAPI application code.
"""

from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
