import asyncio
from app.core.supabase_client import supabase

async def bootstrap():
    # 1. Create company
    company_res = supabase.table("companies").insert({"name": "Dayflow HQ"}).execute()
    company_id = company_res.data[0]["id"]
    
    # 2. Create Auth User
    email = "admin3@dayflow.com"
    password = "AdminPassword123!"
    auth_res = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True
    })
    user_id = auth_res.user.id
    
    # 3. Create User record
    supabase.table("users").insert({
        "id": user_id,
        "company_id": company_id,
        "email": email,
        "role": "ADMIN",
        "login_id": "EMP0001"
    }).execute()
    
    # 4. Create Employee record
    supabase.table("employees").insert({
        "user_id": user_id,
        "first_name": "System",
        "last_name": "Admin",
        "department": "Management",
        "designation": "CEO"
    }).execute()
    
    print(f"Bootstrap complete. Admin user: {email} / {password}")

if __name__ == "__main__":
    asyncio.run(bootstrap())
