"""DeepScan Backend — FastAPI server for OCR extraction and LLaMA-powered diploma analysis."""

import os
import json
import shutil
import tempfile
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.ocr import process_image
from app.llama import call_ollama, postprocess, get_llm_config, set_llm_config
from app.manual_ocr import extract_region
from app.verify import verify_record, verify_all, FIELDS, FUZZY_THRESHOLD
from app.forensics import run_full_forensics

app = FastAPI(title="DeepScan API", version="2.0.0 - Multi-University")

# Mount static files for profile images
os.makedirs("uploads/profile_images", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://deepscan-iota.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database setup (PostgreSQL via Neon, fallback to SQLite locally) ---
DATABASE_URL = os.environ.get("DATABASE_URL", "")
# Global flag to track which database is active (for dialect-specific SQL)
_db_type = "auto"

def _use_sqlite() -> bool:
    """Check if we should use SQLite (fallback when DATABASE_URL not set or PostgreSQL unavailable)."""
    return not DATABASE_URL or os.environ.get("FORCE_SQLITE", "").lower() in ("1", "true", "yes")

def get_db():
    global _db_type
    if _use_sqlite():
        import sqlite3
        _db_type = "sqlite"
        # Return connection with row factory that returns dict-like rows
        conn = sqlite3.connect("deepscan.db", check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return ConnectionWrapper(conn, sqlite_mode=True)
    else:
        import psycopg
        from psycopg.rows import dict_row
        _db_type = "postgres"
        conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True)
        return ConnectionWrapper(conn, sqlite_mode=False)

def is_sqlite() -> bool:
    """Check if currently using SQLite."""
    return _db_type == "sqlite"


class ConnectionWrapper:
    """Wrapper that auto-converts PostgreSQL %s to SQLite ? placeholders."""
    def __init__(self, conn, sqlite_mode: bool):
        self._conn = conn
        self._sqlite = sqlite_mode

    def execute(self, query, params=None):
        if self._sqlite and params:
            # Convert PostgreSQL %s to SQLite ?
            query = query.replace("%s", "?")
        if params:
            return self._conn.execute(query, params)
        return self._conn.execute(query)

    def close(self):
        if self._sqlite:
            try:
                self._conn.commit()
            except Exception:
                pass
        return self._conn.close()

    def __getattr__(self, name):
        # Delegate all other attributes to the wrapped connection
        return getattr(self._conn, name)


def fetchcount(conn, query, params=None):
    """Helper to fetch COUNT(*) result (works with both PostgreSQL and SQLite)."""
    # Adapt query placeholders for SQLite if needed
    if is_sqlite() and params:
        query = query.replace("%s", "?")
    row = conn.execute(query, params).fetchone() if params else conn.execute(query).fetchone()
    if row is None:
        return 0
    # Handle both PostgreSQL dict_row (dict) and SQLite Row (tuple-like with keys)
    if hasattr(row, "values"):
        return list(row.values())[0]
    return row[0]


def init_db():
    conn = get_db()

    # Universities table FIRST (no dependencies)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS universities (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            country TEXT,
            city TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Users table (depends on universities)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            university_id TEXT NOT NULL,
            full_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id)
        )
    """)

    # Domains table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS domains (
            id TEXT PRIMARY KEY,
            university_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            UNIQUE(university_id, name)
        )
    """)

    # Filieres table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS filieres (
            id TEXT PRIMARY KEY,
            domain_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (domain_id) REFERENCES domains(id),
            UNIQUE(domain_id, name)
        )
    """)

    # Students table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            filiere_id TEXT NOT NULL,
            nom_prenom TEXT NOT NULL,
            email TEXT,
            student_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (filiere_id) REFERENCES filieres(id)
        )
    """)

    # Records table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS records (
            id TEXT PRIMARY KEY,
            university_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            student_id TEXT,
            filiere_id TEXT,
            nom_prenom TEXT,
            date_naissance TEXT,
            lieu_naissance TEXT,
            type_diplome TEXT,
            domaine TEXT,
            filiere TEXT,
            specialite TEXT,
            etablissement TEXT,
            source TEXT DEFAULT 'OCR',
            status TEXT DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            raw_ocr_text TEXT,
            deleted_at TEXT DEFAULT NULL,
            profile_image TEXT,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (filiere_id) REFERENCES filieres(id)
        )
    """)

    # Staging table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS staging (
            id TEXT PRIMARY KEY,
            university_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            filiere_id TEXT,
            student_id TEXT,
            nom_prenom TEXT,
            date_naissance TEXT,
            lieu_naissance TEXT,
            type_diplome TEXT,
            domaine TEXT,
            filiere TEXT,
            specialite TEXT,
            etablissement TEXT,
            source TEXT DEFAULT 'OCR',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            raw_ocr_text TEXT,
            verify_status TEXT,
            verified_at TEXT,
            verify_name_score REAL,
            verify_diff_json TEXT,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (filiere_id) REFERENCES filieres(id)
        )
    """)

    try:
        conn.execute("ALTER TABLE staging ADD COLUMN student_id TEXT")
    except Exception:
        pass

    # History table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            original_id TEXT,
            university_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            nom_prenom TEXT,
            date_naissance TEXT,
            lieu_naissance TEXT,
            type_diplome TEXT,
            domaine TEXT,
            filiere TEXT,
            specialite TEXT,
            etablissement TEXT,
            source TEXT,
            status TEXT,
            created_at TEXT,
            deleted_at TEXT DEFAULT CURRENT_TIMESTAMP,
            origin_table TEXT DEFAULT 'records',
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Forgery Reports table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS forgery_reports (
            id TEXT PRIMARY KEY,
            university_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            verdict TEXT NOT NULL,
            score REAL,
            results_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Audit Sessions table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_sessions (
            id TEXT PRIMARY KEY,
            university_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Audit Results table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_results (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            extracted_json TEXT,
            verify_status TEXT,
            verify_score REAL,
            verify_db_record TEXT,
            forgery_verdict TEXT,
            forgery_score REAL,
            forgery_details_json TEXT,
            FOREIGN KEY (session_id) REFERENCES audit_sessions(id)
        )
    """)

    # Blacklist table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS blacklist (
            id TEXT PRIMARY KEY,
            university_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            nom_prenom TEXT NOT NULL,
            date_naissance TEXT,
            email TEXT,
            student_id TEXT,
            reason TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES universities(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Add profile_image column to records table if it doesn't exist (migration)
    try:
        conn.execute("ALTER TABLE records ADD COLUMN profile_image TEXT")
    except Exception:
        # Column already exists or error adding it
        pass

    # Insert default university if not exists
    try:
        conn.execute("""
            INSERT INTO universities (id, name, country, city)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (name) DO NOTHING
        """, (str(uuid.uuid4()), "University of Algiers 1", "Algeria", "Algiers"))
    except Exception:
        pass

    conn.close()


@app.on_event("startup")
def startup():
    init_db()
    # Only override from env vars if explicitly set (non-empty)
    # Otherwise keep the persisted config from llm_config.json
    groq_key   = os.environ.get("GROQ_API_KEY", "").strip()
    groq_model = os.environ.get("GROQ_MODEL", "").strip()
    provider   = os.environ.get("LLM_PROVIDER", "").strip()
    ollama_url = os.environ.get("OLLAMA_URL", "").strip()
    ollama_model = os.environ.get("OLLAMA_MODEL", "").strip()
    
    # Build config update - only pass values if they exist in env
    updates = {}
    if provider:
        updates["provider"] = provider
    if groq_key:
        updates["groq_api_key"] = groq_key
    if groq_model:
        updates["groq_model"] = groq_model
    if ollama_url:
        updates["ollama_url"] = ollama_url
    if ollama_model:
        updates["ollama_model"] = ollama_model
    
    if updates:
        set_llm_config(**updates)
    
    # Check actual loaded config
    from app.llama import _llm_config
    key_preview = ""
    if _llm_config.get("groq_api_key"):
        key = _llm_config["groq_api_key"]
        key_preview = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
    print(f"🔧 Config: Provider={_llm_config.get('provider', 'not set')}, Groq key={key_preview if key_preview else 'EMPTY'}")
    
    if _llm_config.get("groq_api_key"):
        print(f"✅ Groq API configured")
    elif _llm_config.get("provider") == "ollama":
        print(f"✅ Ollama configured")
    else:
        print("⚠️  No LLM API key configured! Set GROQ_API_KEY or configure in Settings.")


# --- Authentication Helper ---
def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract user_id from Authorization header (simple token format: 'Bearer <user_id>')."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    try:
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0] != "Bearer":
            raise ValueError
        user_id = parts[1]
    except (ValueError, IndexError):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return dict(user)


def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


def _normalize_text(value: Optional[str]) -> str:
    return " ".join((value or "").split()).strip().casefold()


def _resolve_or_create_domain_and_filiere(conn, university_id: str, domain_name: Optional[str], filiere_name: Optional[str]):
    domain_id = None
    filiere_id = None

    normalized_domain = _normalize_text(domain_name)
    if normalized_domain:
        row = conn.execute(
            "SELECT id FROM domains WHERE university_id = %s AND lower(name) = %s",
            (university_id, normalized_domain),
        ).fetchone()
        if row:
            domain_id = row["id"] if hasattr(row, "keys") else row[0]
        else:
            domain_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO domains (id, university_id, name) VALUES (%s, %s, %s)",
                (domain_id, university_id, domain_name),
            )

    normalized_filiere = _normalize_text(filiere_name)
    if normalized_filiere and domain_id:
        row = conn.execute(
            "SELECT id FROM filieres WHERE domain_id = %s AND lower(name) = %s",
            (domain_id, normalized_filiere),
        ).fetchone()
        if row:
            filiere_id = row["id"] if hasattr(row, "keys") else row[0]
        else:
            filiere_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO filieres (id, domain_id, name) VALUES (%s, %s, %s)",
                (filiere_id, domain_id, filiere_name),
            )

    return domain_id, filiere_id


# --- Models ---
class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UniversityCreate(BaseModel):
    name: str
    country: Optional[str] = None
    city: Optional[str] = None


class DomainCreate(BaseModel):
    name: str


class FiliereCreate(BaseModel):
    name: str


class StudentCreate(BaseModel):
    nom_prenom: str
    email: Optional[str] = None
    student_id: Optional[str] = None


class RecordCreate(BaseModel):
    nom_prenom: Optional[str] = None
    date_naissance: Optional[str] = None
    lieu_naissance: Optional[str] = None
    type_diplome: Optional[str] = None
    domaine: Optional[str] = None
    filiere: Optional[str] = None
    specialite: Optional[str] = None
    etablissement: Optional[str] = None
    source: str = "MANUAL"
    status: str = "Pending"
    student_id: Optional[str] = None
    filiere_id: Optional[str] = None


class StagingVerificationSave(BaseModel):
    """Persist outcome of comparing a staged row to the reference database."""
    verify_status: str
    name_score: Optional[float] = None
    diff: Optional[List[str]] = None


class RecordUpdate(BaseModel):
    nom_prenom: Optional[str] = None
    date_naissance: Optional[str] = None
    lieu_naissance: Optional[str] = None
    type_diplome: Optional[str] = None
    domaine: Optional[str] = None
    filiere: Optional[str] = None
    specialite: Optional[str] = None
    etablissement: Optional[str] = None
    status: Optional[str] = None
    student_id: Optional[str] = None
    filiere_id: Optional[str] = None


class ForgeryReportCreate(BaseModel):
    filename: str
    verdict: str
    score: float
    results_json: str  # JSON string of the analysis results


class AuditResultCreate(BaseModel):
    filename: str
    extracted_json: str
    verify_status: Optional[str] = None
    verify_score: Optional[float] = None
    verify_db_record: Optional[str] = None
    forgery_verdict: Optional[str] = None
    forgery_score: Optional[float] = None
    forgery_details_json: Optional[str] = None


class AuditSessionSave(BaseModel):
    name: Optional[str] = None
    results: List[AuditResultCreate]


class BlacklistCreate(BaseModel):
    nom_prenom: str
    date_naissance: Optional[str] = None
    email: Optional[str] = None
    student_id: Optional[str] = None
    reason: str


class BlacklistCheck(BaseModel):
    nom_prenom: Optional[str] = None
    date_naissance: Optional[str] = None
    email: Optional[str] = None
    student_id: Optional[str] = None


# --- Health ---
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# --- Authentication Endpoints ---
@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    """Register a new user - auto assigns to first available university."""
    conn = get_db()
    
    # Check if email already exists
    existing = conn.execute("SELECT id FROM users WHERE email = %s", (user_data.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Auto-assign to first university
    university = conn.execute("SELECT id FROM universities ORDER BY created_at LIMIT 1").fetchone()
    if not university:
        conn.close()
        raise HTTPException(status_code=400, detail="No university configured")
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_data.password)
    
    conn.execute("""
        INSERT INTO users (id, email, password_hash, university_id, full_name)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, user_data.email, hashed_pwd, university["id"], None))
    conn.close()
    
    return {"user_id": user_id, "email": user_data.email}


@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    """Login user and return user_id as token."""
    conn = get_db()
    
    user = conn.execute("SELECT * FROM users WHERE email = %s", (credentials.email,)).fetchone()
    conn.close()
    
    if not user or user["password_hash"] != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {"user_id": user["id"], "token": user["id"], "university_id": user["university_id"]}


# --- University Endpoints ---
@app.get("/api/universities")
async def list_universities():
    """List all universities."""
    conn = get_db()
    universities = conn.execute("SELECT id, name, country, city FROM universities ORDER BY name").fetchall()
    conn.close()
    return [dict(row) for row in universities]


@app.post("/api/universities")
async def create_university(data: UniversityCreate):
    """Create a new university."""
    conn = get_db()
    
    # Check if already exists
    existing = conn.execute("SELECT id FROM universities WHERE name = %s", (data.name,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="University name already exists")
    
    univ_id = str(uuid.uuid4())
    conn.execute("""
        INSERT INTO universities (id, name, country, city)
        VALUES (%s, %s, %s, %s)
    """, (univ_id, data.name, data.country, data.city))
    conn.close()
    
    return {"id": univ_id, "name": data.name}


# --- Domains Endpoints (auto-filtered by university) ---
@app.get("/api/domains")
async def list_domains(user: dict = Depends(get_current_user)):
    """List domains for user's university."""
    conn = get_db()
    domains = conn.execute("""
        SELECT id, name
        FROM domains
        WHERE university_id = %s
        ORDER BY name
    """, (user["university_id"],)).fetchall()
    conn.close()
    return [dict(row) for row in domains]


@app.post("/api/domains")
async def create_domain(data: DomainCreate, user: dict = Depends(get_current_user)):
    """Create a new domain for user's university."""
    conn = get_db()
    
    # Check if already exists
    existing = conn.execute("""
        SELECT id FROM domains
        WHERE university_id = %s AND name = %s
    """, (user["university_id"], data.name)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Domain already exists")
    
    domain_id = str(uuid.uuid4())
    conn.execute("""
        INSERT INTO domains (id, university_id, name)
        VALUES (%s, %s, %s)
    """, (domain_id, user["university_id"], data.name))
    conn.close()
    
    return {"id": domain_id, "name": data.name}


# --- Filieres Endpoints (auto-filtered by domain) ---
@app.get("/api/domains/{domain_id}/filieres")
async def list_filieres(domain_id: str, user: dict = Depends(get_current_user)):
    """List filieres for a domain (auto-check user's university)."""
    conn = get_db()
    
    # Verify domain belongs to user's university
    domain = conn.execute("""
        SELECT id FROM domains WHERE id = %s AND university_id = %s
    """, (domain_id, user["university_id"])).fetchone()
    
    if not domain:
        conn.close()
        raise HTTPException(status_code=404, detail="Domain not found")
    
    filieres = conn.execute("""
        SELECT id, name
        FROM filieres
        WHERE domain_id = %s
        ORDER BY name
    """, (domain_id,)).fetchall()
    conn.close()
    
    return [dict(row) for row in filieres]


@app.post("/api/domains/{domain_id}/filieres")
async def create_filiere(domain_id: str, data: FiliereCreate, user: dict = Depends(get_current_user)):
    """Create a new filiere for a domain (auto-check user's university)."""
    conn = get_db()
    
    # Verify domain belongs to user's university
    domain = conn.execute("""
        SELECT id FROM domains WHERE id = %s AND university_id = %s
    """, (domain_id, user["university_id"])).fetchone()
    
    if not domain:
        conn.close()
        raise HTTPException(status_code=404, detail="Domain not found")
    
    # Check if filiere already exists
    existing = conn.execute("""
        SELECT id FROM filieres WHERE domain_id = %s AND name = %s
    """, (domain_id, data.name)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Filiere already exists")
    
    filiere_id = str(uuid.uuid4())
    conn.execute("""
        INSERT INTO filieres (id, domain_id, name)
        VALUES (%s, %s, %s)
    """, (filiere_id, domain_id, data.name))
    conn.close()
    
    return {"id": filiere_id, "name": data.name}


@app.delete("/api/universities/{university_id}")
async def delete_university(university_id: str):
    """Delete a university."""
    conn = get_db()
    conn.execute("DELETE FROM universities WHERE id = %s", (university_id,))
    conn.close()
    return {"message": "University deleted"}


@app.delete("/api/domains/{domain_id}")
async def delete_domain(domain_id: str, user: dict = Depends(get_current_user)):
    """Delete a domain (must belong to user's university)."""
    conn = get_db()
    conn.execute("DELETE FROM domains WHERE id = %s AND university_id = %s", (domain_id, user["university_id"]))
    conn.close()
    return {"message": "Domain deleted"}


@app.delete("/api/domains/{domain_id}/filieres/{filiere_id}")
async def delete_filiere(domain_id: str, filiere_id: str, user: dict = Depends(get_current_user)):
    """Delete a filiere (domain must belong to user's university)."""
    conn = get_db()
    
    # Verify domain belongs to user's university
    domain = conn.execute("""
        SELECT id FROM domains WHERE id = %s AND university_id = %s
    """, (domain_id, user["university_id"])).fetchone()
    
    if not domain:
        conn.close()
        raise HTTPException(status_code=404, detail="Domain not found")
        
    conn.execute("DELETE FROM filieres WHERE id = %s AND domain_id = %s", (filiere_id, domain_id))
    conn.close()
    return {"message": "Filiere deleted"}


# --- Students Endpoints (auto-filtered by filiere & university) ---
@app.get("/api/filieres/{filiere_id}/students")
async def list_students(filiere_id: str, user: dict = Depends(get_current_user)):
    """List students for a filiere (auto-check user's university)."""
    conn = get_db()
    
    # Verify filiere belongs to user's university (through domain)
    filiere = conn.execute("""
        SELECT f.id FROM filieres f
        JOIN domains d ON f.domain_id = d.id
        WHERE f.id = %s AND d.university_id = %s
    """, (filiere_id, user["university_id"])).fetchone()
    
    if not filiere:
        conn.close()
        raise HTTPException(status_code=404, detail="Filiere not found")
    
    students = conn.execute("""
        SELECT id, nom_prenom, email, student_id
        FROM students
        WHERE filiere_id = %s
        ORDER BY nom_prenom
    """, (filiere_id,)).fetchall()
    conn.close()
    
    return [dict(row) for row in students]


@app.post("/api/filieres/{filiere_id}/students")
async def create_student(filiere_id: str, data: StudentCreate, user: dict = Depends(get_current_user)):
    """Create a new student for a filiere (auto-check user's university)."""
    conn = get_db()
    
    # Verify filiere belongs to user's university
    filiere = conn.execute("""
        SELECT f.id FROM filieres f
        JOIN domains d ON f.domain_id = d.id
        WHERE f.id = %s AND d.university_id = %s
    """, (filiere_id, user["university_id"])).fetchone()
    
    if not filiere:
        conn.close()
        raise HTTPException(status_code=404, detail="Filiere not found")
    
    student_id = str(uuid.uuid4())
    conn.execute("""
        INSERT INTO students (id, filiere_id, nom_prenom, email, student_id)
        VALUES (%s, %s, %s, %s, %s)
    """, (student_id, filiere_id, data.nom_prenom, data.email, data.student_id))
    conn.close()
    
    return {"id": student_id, "nom_prenom": data.nom_prenom, "email": data.email}


# --- OCR + LLaMA Extraction ---

def _scan_document_sync(tmp_path: str) -> dict:
    """CPU/network-heavy pipeline; run in a thread so the event loop is not blocked."""
    try:
        ocr_text = process_image(tmp_path)
        if not ocr_text or not ocr_text.strip():
            return {
                "success": False,
                "error": "OCR could not extract text from this image. Try a clearer image.",
                "ocr_text": "",
                "fields": None,
            }

        try:
            raw_fields = call_ollama(ocr_text)
            fields = postprocess(raw_fields, ocr_text)
        except ConnectionError:
            return {
                "success": True,
                "ocr_text": ocr_text,
                "fields": None,
                "warning": "Ollama is not running. OCR text extracted but LLaMA extraction unavailable. Please start Ollama.",
            }
        except Exception as e:
            return {
                "success": True,
                "ocr_text": ocr_text,
                "fields": None,
                "warning": f"LLaMA extraction failed: {str(e)}. OCR text is available for manual review.",
            }

        return {
            "success": True,
            "ocr_text": ocr_text,
            "fields": fields,
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/api/scan")
async def scan_document(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload an image, run OCR, then send to LLaMA for structured extraction."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    result = await run_in_threadpool(_scan_document_sync, tmp_path)
    result["university_id"] = user["university_id"]
    result["user_id"] = user["id"]
    return result


@app.post("/api/ocr-only")
async def ocr_only(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Run OCR only without LLaMA extraction."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        ocr_text = process_image(tmp_path)
        if not ocr_text or not ocr_text.strip():
            return {"success": False, "error": "OCR could not extract text.", "ocr_text": ""}
        return {"success": True, "ocr_text": ocr_text}
    finally:
        os.unlink(tmp_path)


@app.post("/api/extract")
async def extract_fields(ocr_text: str = Form(...), user: dict = Depends(get_current_user)):
    """Send raw OCR text to LLaMA for structured extraction."""
    try:
        raw_fields = call_ollama(ocr_text)
        fields = postprocess(raw_fields, ocr_text)
        return {"success": True, "fields": fields, "university_id": user["university_id"]}
    except ConnectionError:
        raise HTTPException(status_code=503, detail="Ollama is not running. Please start Ollama with: ollama serve")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/forensics/analyze")
async def analyze_forensics(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Run full forensics pipeline (DCT + GHOST) on a document image."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    suffix = os.path.splitext(file.filename)[1].lower()
    if suffix not in ['.jpg', '.jpeg', '.png', '.bmp']:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use JPG, PNG or BMP.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        results = await run_in_threadpool(run_full_forensics, tmp_path)
        return {"success": True, "results": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Forensics analysis failed: {str(e)}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/api/forensics/report")
async def save_forgery_report(report: ForgeryReportCreate, user: dict = Depends(get_current_user)):
    """Save a forgery analysis report to the archive."""
    report_id = f"FRG-{uuid.uuid4().hex[:6].upper()}"
    conn = get_db()
    conn.execute(
        """INSERT INTO forgery_reports (id, university_id, user_id, filename, verdict, score, results_json)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (
            report_id,
            user["university_id"],
            user["id"],
            report.filename,
            report.verdict,
            report.score,
            report.results_json
        )
    )
    conn.close()
    return {"id": report_id, "message": "Forgery report archived successfully"}


@app.get("/api/forensics/reports")
async def list_forgery_reports(user: dict = Depends(get_current_user)):
    """List archived forgery reports for the user's university."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM forgery_reports WHERE university_id = %s ORDER BY created_at DESC",
        (user["university_id"],)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.delete("/api/forensics/reports/{report_id}")
async def delete_forgery_report(report_id: str, user: dict = Depends(get_current_user)):
    """Delete a forgery report."""
    conn = get_db()
    
    # Verify report belongs to user's university
    report = conn.execute(
        "SELECT id FROM forgery_reports WHERE id = %s AND university_id = %s",
        (report_id, user["university_id"])
    ).fetchone()
    
    if not report:
        conn.close()
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete the report
    conn.execute(
        "DELETE FROM forgery_reports WHERE id = %s",
        (report_id,)
    )
    
    # Commit the transaction
    conn.commit()
    conn.close()
    return {"message": "Forgery report deleted successfully"}


# --- Audit Session Endpoints ---
@app.post("/api/audit/session")
async def save_audit_session(data: AuditSessionSave, user: dict = Depends(get_current_user)):
    """Save a unified audit session with multiple document results."""
    session_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO audit_sessions (id, university_id, user_id, name) VALUES (%s, %s, %s, %s)",
            (session_id, user["university_id"], user["id"], data.name)
        )
        for res in data.results:
            res_id = str(uuid.uuid4())
            conn.execute(
                """INSERT INTO audit_results 
                   (id, session_id, filename, extracted_json, verify_status, verify_score, verify_db_record, forgery_verdict, forgery_score, forgery_details_json)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    res_id,
                    session_id,
                    res.filename,
                    res.extracted_json,
                    res.verify_status,
                    res.verify_score,
                    res.verify_db_record,
                    res.forgery_verdict,
                    res.forgery_score,
                    res.forgery_details_json
                )
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    
    return {"id": session_id, "message": "Audit session archived successfully"}


@app.get("/api/audit/sessions")
async def list_audit_sessions(user: dict = Depends(get_current_user)):
    """List archived audit sessions."""
    conn = get_db()
    sessions = conn.execute(
        "SELECT * FROM audit_sessions WHERE university_id = %s ORDER BY created_at DESC",
        (user["university_id"],)
    ).fetchall()
    conn.close()
    return [dict(row) for row in sessions]


@app.get("/api/audit/sessions/{session_id}")
async def get_audit_session(session_id: str, user: dict = Depends(get_current_user)):
    """Get details of a specific audit session."""
    conn = get_db()
    session = conn.execute(
        "SELECT * FROM audit_sessions WHERE id = %s AND university_id = %s",
        (session_id, user["university_id"])
    ).fetchone()
    
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
        
    results = conn.execute(
        "SELECT * FROM audit_results WHERE session_id = %s",
        (session_id,)
    ).fetchall()
    conn.close()
    
    return {
        "session": dict(session),
        "results": [dict(row) for row in results]
    }


@app.delete("/api/audit/sessions/{session_id}")
async def delete_audit_session(session_id: str, user: dict = Depends(get_current_user)):
    """Delete an audit session and all its results."""
    conn = get_db()
    
    # Verify session belongs to user's university
    session = conn.execute(
        "SELECT id FROM audit_sessions WHERE id = %s AND university_id = %s",
        (session_id, user["university_id"])
    ).fetchone()
    
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete audit results first (foreign key dependency)
    conn.execute(
        "DELETE FROM audit_results WHERE session_id = %s",
        (session_id,)
    )
    
    # Delete the session
    conn.execute(
        "DELETE FROM audit_sessions WHERE id = %s",
        (session_id,)
    )
    
    # Commit the transaction
    conn.commit()
    conn.close()
    return {"message": "Audit session deleted successfully"}


# --- Blacklist Endpoints ---
@app.post("/api/blacklist")
async def add_to_blacklist(data: BlacklistCreate, user: dict = Depends(get_current_user)):
    """Add a person to the blacklist."""
    conn = get_db()
    
    # Check if already blacklisted (by name + date of birth if provided)
    check_query = "SELECT id FROM blacklist WHERE university_id = %s AND nom_prenom = %s"
    params = [user["university_id"], data.nom_prenom]
    
    if data.date_naissance:
        check_query += " AND date_naissance = %s"
        params.append(data.date_naissance)
    
    existing = conn.execute(check_query, params).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Person already blacklisted")
    
    blacklist_id = str(uuid.uuid4())
    conn.execute("""
        INSERT INTO blacklist (id, university_id, user_id, nom_prenom, date_naissance, email, student_id, reason)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (blacklist_id, user["university_id"], user["id"], data.nom_prenom, data.date_naissance, data.email, data.student_id, data.reason))
    conn.close()
    
    return {"id": blacklist_id, "message": "Added to blacklist successfully"}


@app.get("/api/blacklist")
async def list_blacklist(
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    user: dict = Depends(get_current_user),
):
    """List blacklisted individuals for the user's university."""
    conn = get_db()
    query = "SELECT * FROM blacklist WHERE university_id = %s"
    params = [user["university_id"]]
    
    if search:
        query += " AND (nom_prenom LIKE %s OR email LIKE %s OR student_id LIKE %s)"
        s = f"%{search}%"
        params.extend([s, s, s])
    
    query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
    params.extend([per_page, (page - 1) * per_page])
    
    entries = conn.execute(query, params).fetchall()
    conn.close()
    
    return [dict(row) for row in entries]


@app.delete("/api/blacklist/{blacklist_id}")
async def remove_from_blacklist(blacklist_id: str, user: dict = Depends(get_current_user)):
    """Remove a person from the blacklist."""
    conn = get_db()
    result = conn.execute(
        "DELETE FROM blacklist WHERE id = %s AND university_id = %s",
        (blacklist_id, user["university_id"])
    )
    conn.close()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")
    
    return {"message": "Removed from blacklist successfully"}


@app.post("/api/blacklist/check")
async def check_blacklist(data: BlacklistCheck, user: dict = Depends(get_current_user)):
    """Check if a person is blacklisted."""
    conn = get_db()
    
    # Build dynamic query based on provided fields
    conditions = ["university_id = %s"]
    params = [user["university_id"]]
    
    if data.nom_prenom:
        conditions.append("nom_prenom = %s")
        params.append(data.nom_prenom)
    
    if data.date_naissance:
        conditions.append("date_naissance = %s")
        params.append(data.date_naissance)
    
    if data.email:
        conditions.append("email = %s")
        params.append(data.email)
    
    if data.student_id:
        conditions.append("student_id = %s")
        params.append(data.student_id)
    
    # At least one field must be provided
    if len(conditions) == 1:
        conn.close()
        raise HTTPException(status_code=400, detail="At least one field must be provided for checking")
    
    query = f"SELECT * FROM blacklist WHERE {' AND '.join(conditions)}"
    entries = conn.execute(query, params).fetchall()
    conn.close()
    
    return {
        "is_blacklisted": len(entries) > 0,
        "matches": [dict(row) for row in entries]
    }


# --- Records CRUD (filtered by user's university) ---
@app.get("/api/records")
async def list_records(
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 10,
    domain_id: Optional[str] = None,
    filiere_id: Optional[str] = None,
    student_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """List records for user's university with optional search and status filter (excludes soft-deleted)."""
    conn = get_db()
    query = "SELECT r.* FROM records r "
    if domain_id:
        query += "LEFT JOIN filieres f ON r.filiere_id = f.id "
    query += "WHERE r.deleted_at IS NULL AND r.university_id = %s "
    params: list = [user["university_id"]]

    if search:
        query += " AND (r.nom_prenom LIKE %s OR r.etablissement LIKE %s OR r.filiere LIKE %s OR r.id LIKE %s) "
        s = f"%{search}%"
        params.extend([s, s, s, s])

    if status and status != "All":
        query += " AND r.status = %s "
        params.append(status)
        
    if student_id:
        query += " AND r.student_id = %s "
        params.append(student_id)
        
    if filiere_id:
        query += " AND r.filiere_id = %s "
        params.append(filiere_id)
        
    if domain_id:
        query += " AND f.domain_id = %s "
        params.append(domain_id)

    count_query = query.replace("SELECT r.*", "SELECT COUNT(r.id)")
    total = fetchcount(conn, count_query, params)

    query += " ORDER BY r.created_at DESC LIMIT %s OFFSET %s"
    params.extend([per_page, (page - 1) * per_page])

    rows = conn.execute(query, params).fetchall()
    records = [dict(row) for row in rows]
    conn.close()

    conn2 = get_db()
    stats = {
        "total": fetchcount(conn2, "SELECT COUNT(*) FROM records WHERE deleted_at IS NULL AND university_id = %s", (user["university_id"],)),
        "ocr_count": fetchcount(conn2, "SELECT COUNT(*) FROM records WHERE source='OCR' AND deleted_at IS NULL AND university_id = %s", (user["university_id"],)),
        "manual_count": fetchcount(conn2, "SELECT COUNT(*) FROM records WHERE source='MANUAL' AND deleted_at IS NULL AND university_id = %s", (user["university_id"],)),
        "institutions": fetchcount(conn2, "SELECT COUNT(DISTINCT etablissement) FROM records WHERE deleted_at IS NULL AND university_id = %s", (user["university_id"],)),
    }
    conn2.close()

    return {
        "records": records,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
        "stats": stats,
    }


@app.post("/api/records")
async def create_record(record: RecordCreate, user: dict = Depends(get_current_user)):
    """Create a new record (from manual entry or OCR extraction)."""
    record_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
    conn = get_db()
    conn.execute(
        """INSERT INTO records (id, university_id, user_id, nom_prenom, date_naissance, lieu_naissance,
           type_diplome, domaine, filiere, specialite, etablissement, source, status, student_id, filiere_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            record_id,
            user["university_id"],
            user["id"],
            record.nom_prenom,
            record.date_naissance,
            record.lieu_naissance,
            record.type_diplome,
            record.domaine,
            record.filiere,
            record.specialite,
            record.etablissement,
            record.source,
            record.status,
            record.student_id,
            record.filiere_id,
        ),
    )
    conn.close()
    return {"id": record_id, "message": "Record created successfully"}


@app.get("/api/records/{record_id}")
async def get_record(record_id: str, user: dict = Depends(get_current_user)):
    """Get a single record by ID (auto-check university)."""
    conn = get_db()
    row = conn.execute("SELECT * FROM records WHERE id = %s AND university_id = %s", (record_id, user["university_id"])).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Record not found")
    return dict(row)


@app.put("/api/records/{record_id}")
async def update_record(record_id: str, record: RecordUpdate, user: dict = Depends(get_current_user)):
    """Update an existing record (auto-check university)."""
    conn = get_db()
    existing = conn.execute("SELECT * FROM records WHERE id = %s AND university_id = %s", (record_id, user["university_id"])).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Record not found")

    updates = {k: v for k, v in record.model_dump().items() if v is not None}
    if updates:
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [record_id]
        conn.execute(f"UPDATE records SET {set_clause} WHERE id = %s", values)
        conn.close()
    return {"message": "Record updated successfully"}


@app.delete("/api/records/{record_id}")
async def delete_record(record_id: str, user: dict = Depends(get_current_user)):
    """Soft-delete a record by moving it to the history table."""
    conn = get_db()
    row = conn.execute("SELECT * FROM records WHERE id = %s AND deleted_at IS NULL AND university_id = %s", (record_id, user["university_id"])).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Record not found")
    rec = dict(row)
    history_id = f"HIST-{uuid.uuid4().hex[:6].upper()}"
    conn.execute(
        """INSERT INTO history (id, original_id, university_id, user_id, nom_prenom, date_naissance, lieu_naissance,
           type_diplome, domaine, filiere, specialite, etablissement, source, status, created_at, origin_table)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (history_id, rec["id"], rec["university_id"], rec["user_id"], rec.get("nom_prenom"), rec.get("date_naissance"),
         rec.get("lieu_naissance"), rec.get("type_diplome"), rec.get("domaine"),
         rec.get("filiere"), rec.get("specialite"), rec.get("etablissement"),
         rec.get("source"), rec.get("status"), rec.get("created_at"), "records"),
    )
    conn.execute("UPDATE records SET deleted_at = CURRENT_TIMESTAMP WHERE id = %s", (record_id,))
    conn.close()
    return {"message": "Record moved to history", "history_id": history_id}


@app.post("/api/records/upload-profile")
async def upload_profile_image(
    file: UploadFile = File(...),
    record_id: str = Form(...),
    user: dict = Depends(get_current_user)
):
    """Upload a profile image for a database record."""
    print(f"Upload profile image called for record {record_id}")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check if record exists
    conn = get_db()
    row = conn.execute("SELECT id FROM records WHERE id = %s", (record_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1].lower()
    unique_filename = f"{record_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    
    # Save file to uploads directory
    upload_dir = "uploads/profile_images"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Update database with image URL
    image_url = f"/uploads/profile_images/{unique_filename}"
    conn.execute(
        "UPDATE records SET profile_image = %s WHERE id = %s",
        (image_url, record_id)
    )
    conn.close()
    
    print(f"Profile image uploaded successfully: {image_url}")
    return {"image_url": image_url, "message": "Profile image uploaded successfully"}


@app.post("/api/records/save-extraction")
async def save_extraction(
    fields: str = Form(...),
    ocr_text: str = Form(""),
    source: str = Form("OCR"),
    user: dict = Depends(get_current_user),
):
    """Save extracted fields as a new record."""
    parsed = json.loads(fields)
    record_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
    conn = get_db()
    conn.execute(
        """INSERT INTO records (id, university_id, user_id, nom_prenom, date_naissance, lieu_naissance,
           type_diplome, domaine, filiere, specialite, etablissement, source, status, raw_ocr_text)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            record_id,
            user["university_id"],
            user["id"],
            parsed.get("nom_prenom"),
            parsed.get("date_naissance"),
            parsed.get("lieu_naissance"),
            parsed.get("type_diplome"),
            parsed.get("domaine"),
            parsed.get("filiere"),
            parsed.get("specialite"),
            parsed.get("etablissement"),
            source,
            "Pending",
            ocr_text,
        ),
    )
    conn.close()
    return {"id": record_id, "message": "Extraction saved to database"}


# --- Manual OCR (region-based extraction) ---
@app.post("/api/manual-ocr")
async def manual_ocr(file: UploadFile = File(...), regions: str = Form(...)):
    """Run OCR on specific regions of an image.

    Accepts an image file and a JSON string of regions mapping field names
    to [x, y, w, h] coordinates. Returns extracted text per field.
    """
    import cv2

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    try:
        region_map = json.loads(regions)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid regions JSON")

    if not region_map:
        raise HTTPException(status_code=400, detail="No regions provided")

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        image_bgr = cv2.imread(tmp_path)
        if image_bgr is None:
            return {"success": False, "error": "Could not read image file."}

        img_h, img_w = image_bgr.shape[:2]
        results = {}
        for field, coords in region_map.items():
            if not isinstance(coords, list) or len(coords) != 4:
                results[field] = None
                continue
            x, y, w, h = [int(c) for c in coords]
            # Clamp to image bounds
            x = max(0, min(x, img_w))
            y = max(0, min(y, img_h))
            w = min(w, img_w - x)
            h = min(h, img_h - y)
            if w <= 0 or h <= 0:
                results[field] = None
                continue
            text = extract_region(image_bgr, (x, y, w, h))
            results[field] = text if text else None

        return {"success": True, "fields": results}
    finally:
        os.unlink(tmp_path)


# --- Verification ---
@app.post("/api/verify")
async def verify_records_endpoint(
    record_id: Optional[str] = Form(None),
):
    """Verify extracted records against the reference database.

    If record_id is provided, verify only that record.
    Otherwise, verify all records in the database.
    Returns verification results with fuzzy name matching and field comparison.
    Also checks if records are on the blacklist.
    """
    conn = get_db()

    # Get all DB records as reference (exclude soft-deleted)
    all_rows = conn.execute("SELECT * FROM records WHERE deleted_at IS NULL").fetchall()
    all_records = [dict(r) for r in all_rows]
    
    # Get all blacklist entries
    blacklist_rows = conn.execute("SELECT * FROM blacklist").fetchall()
    blacklist = [dict(r) for r in blacklist_rows]
    
    conn.close()

    if not all_records:
        return {
            "success": False,
            "error": "The reference database is empty. Add records first.",
            "results": [],
            "stats": {"total": 0, "match": 0, "mismatch": 0, "not_found": 0, "db_count": 0},
        }

    if record_id:
        # Verify a single record against all OTHER records
        target = None
        reference = []
        for r in all_records:
            if r["id"] == record_id:
                target = r
            else:
                reference.append(r)

        if not target:
            raise HTTPException(status_code=404, detail="Record not found")

        if not reference:
            return {
                "success": False,
                "error": "Need at least 2 records to verify (one to check, others as reference).",
                "results": [],
                "stats": {"total": 0, "match": 0, "mismatch": 0, "not_found": 0, "db_count": len(all_records)},
            }

        v = verify_record(target, reference)
        
        # Check if blacklisted
        is_blacklisted = False
        blacklist_entry = None
        for bl in blacklist:
            if bl["nom_prenom"] == target.get("nom_prenom"):
                if not bl["date_naissance"] or bl["date_naissance"] == target.get("date_naissance"):
                    is_blacklisted = True
                    blacklist_entry = bl
                    break
        
        results = [{
            "id": target["id"],
            "extracted": {f: target.get(f) for f in FIELDS},
            "verify": v,
            "is_blacklisted": is_blacklisted,
            "blacklist_entry": blacklist_entry,
        }]
    else:
        # Verify each record against all OTHER records
        results = []
        for i, rec in enumerate(all_records):
            others = all_records[:i] + all_records[i + 1:]
            if not others:
                results.append({
                    "id": rec["id"],
                    "extracted": {f: rec.get(f) for f in FIELDS},
                    "verify": {
                        "status": "not_found",
                        "db_record": None,
                        "name_score": 0,
                        "candidates": 0,
                        "diff": [],
                    },
                })
                continue
            v = verify_record(rec, others)
            
            # Check if blacklisted
            is_blacklisted = False
            blacklist_entry = None
            for bl in blacklist:
                if bl["nom_prenom"] == rec.get("nom_prenom"):
                    if not bl["date_naissance"] or bl["date_naissance"] == rec.get("date_naissance"):
                        is_blacklisted = True
                        blacklist_entry = bl
                        break
            
            results.append({
                "id": rec["id"],
                "extracted": {f: rec.get(f) for f in FIELDS},
                "verify": v,
                "is_blacklisted": is_blacklisted,
                "blacklist_entry": blacklist_entry,
            })

    # Compute stats
    stats = {
        "total": len(results),
        "match": sum(1 for r in results if r["verify"]["status"] == "match"),
        "mismatch": sum(1 for r in results if r["verify"]["status"] == "mismatch"),
        "not_found": sum(1 for r in results if r["verify"]["status"] == "not_found"),
        "db_count": len(all_records),
    }

    # Update record statuses in DB based on verification
    conn = get_db()
    for r in results:
        st = r["verify"]["status"]
        new_status = "Verified" if st == "match" else "Flagged" if st == "mismatch" else "Pending"
        conn.execute("UPDATE records SET status = %s WHERE id = %s", (new_status, r["id"]))
    conn.close()

    return {
        "success": True,
        "results": results,
        "stats": stats,
        "threshold": FUZZY_THRESHOLD,
    }


@app.post("/api/verify/single")
async def verify_single_fields(fields: str = Form(...)):
    """Verify a set of fields (not yet saved) against all DB records.

    Accepts a JSON string of fields to verify.
    """
    try:
        parsed = json.loads(fields)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid fields JSON")

    conn = get_db()
    all_rows = conn.execute("SELECT * FROM records WHERE deleted_at IS NULL").fetchall()
    db_records = [dict(r) for r in all_rows]
    conn.close()

    if not db_records:
        return {
            "success": False,
            "error": "The reference database is empty. Add records first.",
            "result": None,
            "db_count": 0,
        }

    v = verify_record(parsed, db_records)
    return {
        "success": True,
        "result": {
            "extracted": parsed,
            "verify": v,
        },
        "db_count": len(db_records),
        "threshold": FUZZY_THRESHOLD,
    }


# --- Ollama Status ---
@app.get("/api/ollama/status")
async def ollama_status():
    """Check if Ollama is running and accessible."""
    import requests as req
    try:
        resp = req.get("http://localhost:11434/api/tags", timeout=5)
        resp.raise_for_status()
        models = resp.json().get("models", [])
        model_names = [m.get("name", "") for m in models]
        return {"status": "connected", "models": model_names}
    except Exception:
        return {"status": "disconnected", "models": []}


# --- LLM Configuration ---
@app.get("/api/llm/config")
async def get_llm_config_endpoint():
    """Get current LLM provider configuration."""
    config = get_llm_config()
    # Also check Ollama connectivity
    import requests as req
    ollama_connected = False
    ollama_models = []
    try:
        resp = req.get(config.get("ollama_url", "http://localhost:11434/api/generate").replace("/api/generate", "/api/tags"), timeout=5)
        resp.raise_for_status()
        models = resp.json().get("models", [])
        ollama_models = [m.get("name", "") for m in models]
        ollama_connected = True
    except Exception:
        pass
    return {
        **config,
        "ollama_connected": ollama_connected,
        "ollama_models": ollama_models,
        "groq_configured": bool(config.get("groq_api_key") and config["groq_api_key"] != "***"),
    }


@app.post("/api/llm/config")
async def update_llm_config(
    provider: Optional[str] = Form(None),
    ollama_url: Optional[str] = Form(None),
    ollama_model: Optional[str] = Form(None),
    groq_api_key: Optional[str] = Form(None),
    groq_model: Optional[str] = Form(None),
):
    """Update LLM provider configuration."""
    updated = set_llm_config(
        provider=provider,
        ollama_url=ollama_url,
        ollama_model=ollama_model,
        groq_api_key=groq_api_key,
        groq_model=groq_model,
    )
    return {"message": "LLM configuration updated", "config": updated}


# --- Dashboard Stats ---
@app.get("/api/dashboard/stats")
async def dashboard_stats():
    """Get dashboard statistics including trends for charts."""
    conn = get_db()
    total = fetchcount(conn, "SELECT COUNT(*) FROM records WHERE deleted_at IS NULL")
    verified = fetchcount(conn, "SELECT COUNT(*) FROM records WHERE status='Verified' AND deleted_at IS NULL")
    pending = fetchcount(conn, "SELECT COUNT(*) FROM records WHERE status='Pending' AND deleted_at IS NULL")
    flagged = fetchcount(conn, "SELECT COUNT(*) FROM records WHERE status='Flagged' AND deleted_at IS NULL")

    # trend data (last 30 days) - use database-agnostic SQL
    if is_sqlite():
        trend_rows = conn.execute("""
            SELECT DATE(created_at) as day,
                   COUNT(*) as scans,
                   SUM(CASE WHEN status='Verified' THEN 1 ELSE 0 END) as verified,
                   SUM(CASE WHEN status='Flagged' THEN 1 ELSE 0 END) as flagged
            FROM records
            WHERE deleted_at IS NULL
            AND created_at >= datetime('now', '-30 days')
            GROUP BY day
            ORDER BY day ASC
        """).fetchall()
    else:
        trend_rows = conn.execute("""
            SELECT DATE(created_at::timestamp) as day,
                   COUNT(*) as scans,
                   SUM(CASE WHEN status='Verified' THEN 1 ELSE 0 END) as verified,
                   SUM(CASE WHEN status='Flagged' THEN 1 ELSE 0 END) as flagged
            FROM records
            WHERE deleted_at IS NULL
            AND created_at::timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY day
            ORDER BY day ASC
        """).fetchall()

    recent = conn.execute(
        "SELECT * FROM records WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5"
    ).fetchall()
    conn.close()

    return {
        "total_scans": total,
        "verified": verified,
        "pending": pending,
        "flagged": flagged,
        "trend": [dict(r) for r in trend_rows],
        "recent": [dict(r) for r in recent],
    }


# --- Staging (Results Before Verification) ---
@app.get("/api/staging")
async def list_staging(page: int = 1, per_page: int = 50, user: dict = Depends(get_current_user)):
    """List all staged OCR results for user's university (before verification)."""
    conn = get_db()
    total = fetchcount(conn, "SELECT COUNT(*) FROM staging WHERE university_id = %s", (user["university_id"],))
    rows = conn.execute(
        "SELECT * FROM staging WHERE university_id = %s ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (user["university_id"], per_page, (page - 1) * per_page),
    ).fetchall()
    conn.close()
    return {
        "records": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": max(1, (total + per_page - 1) // per_page),
    }


@app.patch("/api/staging/{staging_id}/verification")
async def save_staging_verification(staging_id: str, body: StagingVerificationSave, user: dict = Depends(get_current_user)):
    """Store verification outcome on a staging row (shown on Identity Verification Results)."""
    if body.verify_status not in ("match", "mismatch", "not_found"):
        raise HTTPException(status_code=400, detail="verify_status must be match, mismatch, or not_found")
    conn = get_db()
    row = conn.execute("SELECT id FROM staging WHERE id = %s AND university_id = %s", (staging_id, user["university_id"])).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Staging record not found")
    diff_json = json.dumps(body.diff or [])
    verified_at = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """UPDATE staging SET verify_status = %s, verified_at = %s, verify_name_score = %s, verify_diff_json = %s
           WHERE id = %s""",
        (body.verify_status, verified_at, body.name_score, diff_json, staging_id),
    )
    conn.close()
    return {"success": True, "id": staging_id}


@app.post("/api/staging")
async def save_to_staging(
    fields: str = Form(...),
    ocr_text: str = Form(""),
    source: str = Form("OCR"),
    filiere_id: Optional[str] = Form(None),
    student_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    """Save extraction results to staging (before verification)."""
    parsed = json.loads(fields)
    staging_id = f"STG-{uuid.uuid4().hex[:6].upper()}"
    conn = get_db()
    if not filiere_id:
        _, filiere_id = _resolve_or_create_domain_and_filiere(
            conn,
            user["university_id"],
            parsed.get("domaine"),
            parsed.get("filiere"),
        )
    conn.execute(
        """INSERT INTO staging (id, university_id, user_id, filiere_id, nom_prenom, date_naissance, lieu_naissance,
           student_id, type_diplome, domaine, filiere, specialite, etablissement, source, raw_ocr_text)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            staging_id,
            user["university_id"],
            user["id"],
            filiere_id,
            parsed.get("nom_prenom"),
            parsed.get("date_naissance"),
            parsed.get("lieu_naissance"),
            student_id,
            parsed.get("type_diplome"),
            parsed.get("domaine"),
            parsed.get("filiere"),
            parsed.get("specialite"),
            parsed.get("etablissement"),
            source,
            ocr_text,
        ),
    )
    conn.close()
    return {"id": staging_id, "message": "Saved to staging for verification"}


@app.post("/api/staging/{staging_id}/promote")
async def promote_staging(staging_id: str, user: dict = Depends(get_current_user)):
    """Promote a staged result to the main records database."""
    conn = get_db()
    row = conn.execute("SELECT * FROM staging WHERE id = %s AND university_id = %s", (staging_id, user["university_id"])).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Staging record not found")
    rec = dict(row)
    if not rec.get("filiere_id"):
        _, resolved_filiere_id = _resolve_or_create_domain_and_filiere(
            conn,
            user["university_id"],
            rec.get("domaine"),
            rec.get("filiere"),
        )
        rec["filiere_id"] = resolved_filiere_id
    record_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
    conn.execute(
          """INSERT INTO records (id, university_id, user_id, student_id, filiere_id, nom_prenom, date_naissance, lieu_naissance,
              type_diplome, domaine, filiere, specialite, etablissement, source, status, raw_ocr_text)
              VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            record_id,
            user["university_id"],
            user["id"],
                rec.get("student_id"),
                rec.get("filiere_id"),
            rec.get("nom_prenom"),
            rec.get("date_naissance"),
            rec.get("lieu_naissance"),
            rec.get("type_diplome"),
            rec.get("domaine"),
            rec.get("filiere"),
            rec.get("specialite"),
            rec.get("etablissement"),
            rec.get("source", "OCR"),
            "Pending",
            rec.get("raw_ocr_text"),
        ),
    )
    conn.execute("DELETE FROM staging WHERE id = %s", (staging_id,))
    conn.close()
    return {"id": record_id, "message": "Promoted to records database"}


@app.delete("/api/staging/{staging_id}")
async def delete_staging(staging_id: str, user: dict = Depends(get_current_user)):
    """Delete a staged record (move to history)."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM staging WHERE id = %s AND university_id = %s",
        (staging_id, user["university_id"]),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Staging record not found")
    rec = dict(row)
    history_id = f"HIST-{uuid.uuid4().hex[:6].upper()}"
    conn.execute(
        """INSERT INTO history (id, original_id, university_id, user_id, nom_prenom, date_naissance, lieu_naissance,
           type_diplome, domaine, filiere, specialite, etablissement, source, status, created_at, origin_table)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (history_id, rec["id"], rec["university_id"], rec["user_id"], rec.get("nom_prenom"), rec.get("date_naissance"),
         rec.get("lieu_naissance"), rec.get("type_diplome"), rec.get("domaine"),
         rec.get("filiere"), rec.get("specialite"), rec.get("etablissement"),
         rec.get("source"), "Staged", rec.get("created_at"), "staging"),
    )
    conn.execute("DELETE FROM staging WHERE id = %s", (staging_id,))
    conn.close()
    return {"message": "Staging record moved to history"}


# --- History (Deletion Archive) ---
@app.get("/api/history")
async def list_history(
    status: Optional[str] = None,
    page: int = 1, 
    per_page: int = 50,
    user: dict = Depends(get_current_user)
):
    """List all soft-deleted records in history for user's university."""
    conn = get_db()
    
    query = "SELECT * FROM history WHERE university_id = %s"
    params = [user["university_id"]]
    
    if status and status != "All":
        query += " AND status = %s"
        params.append(status)
        
    count_query = query.replace("SELECT *", "SELECT COUNT(*)")
    total = fetchcount(conn, count_query, params)
    
    query += " ORDER BY deleted_at DESC LIMIT %s OFFSET %s"
    params.extend([per_page, (page - 1) * per_page])
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    return {
        "records": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": max(1, (total + per_page - 1) // per_page),
    }


@app.post("/api/history/{history_id}/restore")
async def restore_from_history(history_id: str):
    """Restore a record from history back to the records table."""
    conn = get_db()
    row = conn.execute("SELECT * FROM history WHERE id = %s", (history_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="History record not found")
    rec = dict(row)
    record_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
    conn.execute(
        """INSERT INTO records (id, nom_prenom, date_naissance, lieu_naissance,
           type_diplome, domaine, filiere, specialite, etablissement, source, status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            record_id,
            rec.get("nom_prenom"),
            rec.get("date_naissance"),
            rec.get("lieu_naissance"),
            rec.get("type_diplome"),
            rec.get("domaine"),
            rec.get("filiere"),
            rec.get("specialite"),
            rec.get("etablissement"),
            rec.get("source", "RESTORED"),
            "Pending",
        ),
    )
    conn.execute("DELETE FROM history WHERE id = %s", (history_id,))
    conn.close()
    return {"id": record_id, "message": "Record restored from history"}


@app.delete("/api/history/{history_id}")
async def permanently_delete_history(history_id: str):
    """Permanently delete a record from history."""
    conn = get_db()
    result = conn.execute("DELETE FROM history WHERE id = %s", (history_id,))
    deleted = result.rowcount
    conn.close()
    if deleted == 0:
        raise HTTPException(status_code=404, detail="History record not found")
    return {"message": "Record permanently deleted"}


# --- Profile Image Upload ---
@app.post("/api/records/upload-profile")
async def upload_profile_image(
    file: UploadFile = File(...),
    record_id: str = Form(...),
    user: dict = Depends(get_current_user)
):
    """Upload a profile image for a database record."""
    print(f"Upload profile image called for record {record_id}")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check if record exists
    conn = get_db()
    row = conn.execute("SELECT id FROM records WHERE id = %s", (record_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1].lower()
    unique_filename = f"{record_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    
    # Save file to uploads directory
    upload_dir = "uploads/profile_images"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Update database with image URL
    image_url = f"/uploads/profile_images/{unique_filename}"
    conn.execute(
        "UPDATE records SET profile_image = %s WHERE id = %s",
        (image_url, record_id)
    )
    conn.close()
    
    print(f"Profile image uploaded successfully: {image_url}")
    return {"image_url": image_url, "message": "Profile image uploaded successfully"}


# --- JSON Import ---
@app.post("/api/records/import-json")
async def import_json(file: UploadFile = File(...)):
    """Import records from a JSON file.
    Accepts a JSON file with an array of record objects.
    Each object should have fields like nom_prenom, date_naissance, etc.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    if isinstance(data, dict):
        # If the JSON has a top-level wrapper, try to find the array
        if "records" in data:
            data = data["records"]
        else:
            data = [data]

    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="JSON must be an array of records or an object with a 'records' key")

    conn = get_db()
    imported = 0
    for item in data:
        if not isinstance(item, dict):
            continue
        record_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
        conn.execute(
            """INSERT INTO records (id, nom_prenom, date_naissance, lieu_naissance,
               type_diplome, domaine, filiere, specialite, etablissement, source, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                record_id,
                item.get("nom_prenom"),
                item.get("date_naissance"),
                item.get("lieu_naissance"),
                item.get("type_diplome"),
                item.get("domaine"),
                item.get("filiere"),
                item.get("specialite"),
                item.get("etablissement"),
                item.get("source", "JSON_IMPORT"),
                item.get("status", "Pending"),
            ),
        )
        imported += 1
    conn.close()
    return {"message": f"Successfully imported {imported} record(s)", "imported": imported}
