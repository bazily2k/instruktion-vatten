from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class AdminLogin(BaseModel):
    email: str
    password: str

class UserCodeLogin(BaseModel):
    code: str

class AccessCodeCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = ""

class AccessCodeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class AccessCodeResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str
    is_active: bool
    created_at: str
    last_used: Optional[str] = None

class SettingsUpdate(BaseModel):
    shared_code: Optional[str] = None
    shared_code_description: Optional[str] = None
    instructions_text: Optional[str] = None
    instructions_steps: Optional[List[dict]] = None

class SettingsResponse(BaseModel):
    shared_code: str
    shared_code_description: str
    instructions_text: str
    instructions_steps: List[dict]

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

# ============ PASSWORD HELPERS ============

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ============ JWT HELPERS ============

def create_access_token(user_id: str, email: str = "", role: str = "user") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        role = payload.get("role", "user")
        
        if role == "admin":
            user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return {
                "id": str(user["_id"]),
                "email": user.get("email", ""),
                "name": user.get("name", ""),
                "role": "admin"
            }
        else:
            # User logged in with access code
            access_code = await db.access_codes.find_one({"id": payload["sub"]})
            if not access_code:
                raise HTTPException(status_code=401, detail="Access code not found")
            return {
                "id": access_code["id"],
                "name": access_code.get("name", ""),
                "role": "user"
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/admin/login")
async def admin_login(response: Response, login_data: AdminLogin):
    email = login_data.email.lower()
    user = await db.users.find_one({"email": email})
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(str(user["_id"]), email, "admin")
    refresh_token = create_refresh_token(str(user["_id"]))
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", "Admin"),
        "role": "admin"
    }

@api_router.post("/auth/user/login")
async def user_login(response: Response, login_data: UserCodeLogin):
    code = login_data.code.strip().upper()
    access_code = await db.access_codes.find_one({"code": code, "is_active": True})
    
    if not access_code:
        raise HTTPException(status_code=401, detail="Invalid or inactive access code")
    
    # Update last_used
    await db.access_codes.update_one(
        {"id": access_code["id"]},
        {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
    )
    
    access_token = create_access_token(access_code["id"], "", "user")
    refresh_token = create_refresh_token(access_code["id"])
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": access_code["id"],
        "name": access_code.get("name", ""),
        "role": "user"
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}

# ============ ACCESS CODES ENDPOINTS (Admin only) ============

@api_router.get("/access-codes", response_model=List[AccessCodeResponse])
async def get_access_codes(request: Request):
    await require_admin(request)
    codes = await db.access_codes.find({}, {"_id": 0}).to_list(1000)
    return codes

@api_router.post("/access-codes", response_model=AccessCodeResponse)
async def create_access_code(request: Request, code_data: AccessCodeCreate):
    await require_admin(request)
    
    # Check if code already exists
    existing = await db.access_codes.find_one({"code": code_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Access code already exists")
    
    new_code = {
        "id": str(uuid.uuid4()),
        "name": code_data.name,
        "code": code_data.code.upper(),
        "description": code_data.description or "",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used": None
    }
    
    await db.access_codes.insert_one(new_code)
    del new_code["_id"]
    return new_code

@api_router.put("/access-codes/{code_id}", response_model=AccessCodeResponse)
async def update_access_code(request: Request, code_id: str, code_data: AccessCodeUpdate):
    await require_admin(request)
    
    update_data = {k: v for k, v in code_data.model_dump().items() if v is not None}
    if "code" in update_data:
        update_data["code"] = update_data["code"].upper()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.access_codes.update_one(
        {"id": code_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Access code not found")
    
    updated_code = await db.access_codes.find_one({"id": code_id}, {"_id": 0})
    return updated_code

@api_router.delete("/access-codes/{code_id}")
async def delete_access_code(request: Request, code_id: str):
    await require_admin(request)
    
    result = await db.access_codes.delete_one({"id": code_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Access code not found")
    
    return {"message": "Access code deleted successfully"}

# ============ SETTINGS ENDPOINTS ============

@api_router.get("/settings", response_model=SettingsResponse)
async def get_settings(request: Request):
    await get_current_user(request)  # Any authenticated user can view settings
    
    settings = await db.settings.find_one({"type": "main"}, {"_id": 0})
    if not settings:
        # Return default settings
        return {
            "shared_code": "1234",
            "shared_code_description": "Kod till nyckelskåpet i entrén",
            "instructions_text": "Instruktioner för att koppla om vattensystemet",
            "instructions_steps": [
                {
                    "step": 1,
                    "title": "Hämta nyckeln",
                    "description": "Använd koden ovan för att öppna nyckelskåpet och hämta källarnyckeln.",
                    "image_url": "https://images.pexels.com/photos/2985875/pexels-photo-2985875.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                },
                {
                    "step": 2,
                    "title": "Gå till källaren",
                    "description": "Använd nyckeln för att låsa upp källardörren och gå in till vattensystemet.",
                    "image_url": "https://images.pexels.com/photos/17182110/pexels-photo-17182110.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                },
                {
                    "step": 3,
                    "title": "Koppla om ventilerna",
                    "description": "Identifiera de två vattenpumparna. Stäng ventilen till den trasiga pumpen och öppna ventilen till reservpumpen.",
                    "image_url": "https://images.unsplash.com/photo-1774019883037-91f5d43e2890?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHx3YXRlciUyMHB1bXAlMjBpbmR1c3RyaWFsfGVufDB8fHx8MTc3NDczNzUyNXww&ixlib=rb-4.1.0&q=85"
                }
            ]
        }
    return settings

@api_router.put("/settings", response_model=SettingsResponse)
async def update_settings(request: Request, settings_data: SettingsUpdate):
    await require_admin(request)
    
    update_data = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.settings.update_one(
        {"type": "main"},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.settings.find_one({"type": "main"}, {"_id": 0})
    
    # Fill in defaults for missing fields
    defaults = {
        "shared_code": "1234",
        "shared_code_description": "Kod till nyckelskåpet i entrén",
        "instructions_text": "Instruktioner för att koppla om vattensystemet",
        "instructions_steps": []
    }
    
    for key, default_value in defaults.items():
        if key not in settings:
            settings[key] = default_value
    
    return settings

# ============ STARTUP & SHUTDOWN ============

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.access_codes.create_index("code", unique=True)
    await db.access_codes.create_index("id", unique=True)
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    # Initialize default settings if not exists
    existing_settings = await db.settings.find_one({"type": "main"})
    if not existing_settings:
        await db.settings.insert_one({
            "type": "main",
            "shared_code": "1234",
            "shared_code_description": "Kod till nyckelskåpet i entrén",
            "instructions_text": "Instruktioner för att koppla om vattensystemet i fastigheten. Följ stegen nedan noggrant.",
            "instructions_steps": [
                {
                    "step": 1,
                    "title": "Hämta nyckeln",
                    "description": "Använd koden ovan för att öppna nyckelskåpet och hämta källarnyckeln.",
                    "image_url": "https://images.pexels.com/photos/2985875/pexels-photo-2985875.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                },
                {
                    "step": 2,
                    "title": "Gå till källaren",
                    "description": "Använd nyckeln för att låsa upp källardörren och gå in till vattensystemet.",
                    "image_url": "https://images.pexels.com/photos/17182110/pexels-photo-17182110.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                },
                {
                    "step": 3,
                    "title": "Koppla om ventilerna",
                    "description": "Identifiera de två vattenpumparna. Stäng ventilen till den trasiga pumpen och öppna ventilen till reservpumpen.",
                    "image_url": "https://images.unsplash.com/photo-1774019883037-91f5d43e2890?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHx3YXRlciUyMHB1bXAlMjBpbmR1c3RyaWFsfGVufDB8fHx8MTc3NDczNzUyNXww&ixlib=rb-4.1.0&q=85"
                }
            ]
        })
        logger.info("Default settings initialized")
    
    # Write test credentials
    try:
        os.makedirs("/app/memory", exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write("# Test Credentials\n\n")
            f.write("## Admin Account\n")
            f.write(f"- Email: {admin_email}\n")
            f.write(f"- Password: {admin_password}\n")
            f.write("- Role: admin\n\n")
            f.write("## Auth Endpoints\n")
            f.write("- POST /api/auth/admin/login - Admin login\n")
            f.write("- POST /api/auth/user/login - User login with code\n")
            f.write("- GET /api/auth/me - Get current user\n")
            f.write("- POST /api/auth/logout - Logout\n")
    except Exception as e:
        logger.error(f"Failed to write test credentials: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include the router in the main app
app.include_router(api_router)

cors_origins = os.environ.get("CORS_ORIGINS", "*")
if cors_origins == "*":
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
