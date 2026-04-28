from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response, UploadFile, File
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

# Local file storage
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "heic": "image/heic",
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "txt": "text/plain"
}

ALLOWED_EXTENSIONS = set(MIME_TYPES.keys())
MAX_FILE_SIZE = 10 * 1024 * 1024

def put_object(path: str, data: bytes, content_type: str) -> dict:
    file_path = UPLOAD_DIR / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    return {"path": path, "size": len(data)}

def get_object(path: str) -> tuple:
    file_path = UPLOAD_DIR / path
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    ext = path.split(".")[-1].lower()
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    return file_path.read_bytes(), content_type

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

class LoginLogResponse(BaseModel):
    id: str
    user_name: str
    user_code: str
    timestamp: str
    ip_address: Optional[str] = None

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
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "Admin"), "role": "admin"}

@api_router.post("/auth/user/login")
async def user_login(response: Response, request: Request, login_data: UserCodeLogin):
    code = login_data.code.strip().upper()
    access_code = await db.access_codes.find_one({"code": code, "is_active": True})
    if not access_code:
        raise HTTPException(status_code=401, detail="Invalid or inactive access code")
    await db.access_codes.update_one({"id": access_code["id"]}, {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}})
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    login_log = {
        "id": str(uuid.uuid4()),
        "user_id": access_code["id"],
        "user_name": access_code.get("name", ""),
        "user_code": access_code["code"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": client_ip
    }
    await db.login_logs.insert_one(login_log)
    access_token = create_access_token(access_code["id"], "", "user")
    refresh_token = create_refresh_token(access_code["id"])
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": access_code["id"], "name": access_code.get("name", ""), "role": "user"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}

# ============ FILE UPLOAD ENDPOINTS ============

@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    await require_admin(request)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB")
    file_id = str(uuid.uuid4())
    path = f"{file_id}.{ext}"
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    try:
        result = put_object(path, content, content_type)
        file_record = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(content)),
            "extension": ext,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_record)
        return {"id": file_id, "filename": file.filename, "content_type": content_type, "size": file_record["size"], "url": f"/api/files/{file_id}"}
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

@api_router.get("/files/{file_id}")
async def get_file(file_id: str, request: Request):
    await get_current_user(request)
    file_record = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content, content_type = get_object(file_record["storage_path"])
        return Response(
            content=content,
            media_type=file_record.get("content_type", content_type),
            headers={"Content-Disposition": f'inline; filename="{file_record.get("original_filename", "file")}"'}
        )
    except Exception as e:
        logger.error(f"File download failed: {e}")
        raise HTTPException(status_code=500, detail="File download failed")

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, request: Request):
    await require_admin(request)
    result = await db.files.update_one({"id": file_id, "is_deleted": False}, {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted successfully"}

# ============ ACCESS CODES ENDPOINTS ============

@api_router.get("/access-codes", response_model=List[AccessCodeResponse])
async def get_access_codes(request: Request):
    await require_admin(request)
    codes = await db.access_codes.find({}, {"_id": 0}).to_list(1000)
    return codes

@api_router.post("/access-codes", response_model=AccessCodeResponse)
async def create_access_code(request: Request, code_data: AccessCodeCreate):
    await require_admin(request)
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
    result = await db.access_codes.update_one({"id": code_id}, {"$set": update_data})
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

# ============ LOGIN LOGS ENDPOINTS ============

@api_router.get("/login-logs", response_model=List[LoginLogResponse])
async def get_login_logs(request: Request, limit: int = 100):
    await require_admin(request)
    logs = await db.login_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# ============ SETTINGS ENDPOINTS ============

@api_router.get("/settings", response_model=SettingsResponse)
async def get_settings(request: Request):
    await get_current_user(request)
    settings = await db.settings.find_one({"type": "main"}, {"_id": 0})
    if not settings:
        return {
            "shared_code": "1234",
            "shared_code_description": "Kod till nyckelskåpet vid entrén",
            "instructions_text": "Instruktioner för att växla vattenkälla.",
            "instructions_steps": []
        }
    return settings

@api_router.put("/settings", response_model=SettingsResponse)
async def update_settings(request: Request, settings_data: SettingsUpdate):
    await require_admin(request)
    update_data = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    await db.settings.update_one({"type": "main"}, {"$set": update_data}, upsert=True)
    settings = await db.settings.find_one({"type": "main"}, {"_id": 0})
    defaults = {"shared_code": "1234", "shared_code_description": "", "instructions_text": "", "instructions_steps": []}
    for key, default_value in defaults.items():
        if key not in settings:
            settings[key] = default_value
    return settings

# ============ STARTUP & SHUTDOWN ============

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.access_codes.create_index("code", unique=True)
    await db.access_codes.create_index("id", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Admin password updated: {admin_email}")

    existing_settings = await db.settings.find_one({"type": "main"})
    if not existing_settings:
        await db.settings.insert_one({
            "type": "main",
            "shared_code": "1234",
            "shared_code_description": "Kod till nyckelskåpet vid entrén",
            "instructions_text": "Instruktioner för att växla vattenkälla i fastigheten.",
            "instructions_steps": []
        })
        logger.info("Default settings initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

cors_origins = os.environ.get("CORS_ORIGINS", "*")
allow_origins = ["*"] if cors_origins == "*" else [o.strip() for o in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
