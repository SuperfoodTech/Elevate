#!/usr/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════
  AGENCY REPORT — Unified FastAPI Backend Service
  REST API Server for Grab, Shopee, & GoFood Pipeline
═══════════════════════════════════════════════════════════════
"""

import sys
import os
import uuid
import time
import asyncio
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from dotenv import load_dotenv

# Ensure agency directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text

# Import pipeline helpers from cli.py and core modules
from cli import (
    normalize_date_string,
    run_grab,
    run_shopee,
    run_gofood,
    ingest_to_db,
    run_normalization,
    _resolve_shopee_merchant
)

load_dotenv()

app = FastAPI(
    title="Agency OFD Pipeline Backend API",
    description="REST API Service for Online Food Delivery (GrabFood, ShopeeFood, GoFood) Scraping, Ingestion, & Data Cleaning Pipeline.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware for Frontend Dashboard Integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory Job Database & Locks
jobs_db: Dict[str, Dict[str, Any]] = {}
jobs_lock = threading.Lock()

# ── Pydantic Request & Response Models ──

class ScrapeRequest(BaseModel):
    platform: Literal["grab", "shopee", "gofood", "all"] = Field(..., description="Target platform")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD or DD-MM-YYYY)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD or DD-MM-YYYY)")
    outlet: Optional[str] = Field(None, description="Pipe-separated outlet names filter")
    branch: Optional[str] = Field(None, description="Pipe-separated branch names filter")
    grab_outlet: Optional[str] = Field(None, description="Specific Grab outlet names filter")
    shopee_merchant: Optional[str] = Field(None, description="Specific Shopee merchant names filter")
    gofood_outlet: Optional[str] = Field(None, description="Specific GoFood outlet names filter")
    user: Optional[str] = Field(None, description="Filter specific username (Grab only)")
    skip_existing: bool = Field(False, description="Skip already downloaded/processed outlets")
    auto_db: bool = Field(True, description="Automatically ingest and normalize to Database after scraping")

class IngestRequest(BaseModel):
    platform: Literal["grab", "shopee", "gofood", "all"] = Field(..., description="Target platform")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD or DD-MM-YYYY)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD or DD-MM-YYYY)")
    auto_normalize: bool = Field(True, description="Trigger data cleaning & normalization after ingestion")

class JobResponse(BaseModel):
    job_id: str
    platform: str
    start_date: str
    end_date: str
    status: str
    created_at: str
    finished_at: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    logs: List[str] = []

# ── Background Task Worker ──

def _execute_scrape_job(job_id: str, req: ScrapeRequest):
    def log(msg: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted = f"[{timestamp}] {msg}"
        with jobs_lock:
            if job_id in jobs_db:
                jobs_db[job_id]["logs"].append(formatted)

    log(f"Starting pipeline job for platform='{req.platform}' ({req.start_date} to {req.end_date})...")
    
    start_time = datetime.now()
    results = {}

    try:
        s_clean = normalize_date_string(req.start_date)
        e_clean = normalize_date_string(req.end_date)
    except Exception as e:
        log(f"ERROR: Invalid date format: {e}")
        with jobs_lock:
            jobs_db[job_id]["status"] = "failed"
            jobs_db[job_id]["finished_at"] = datetime.now().isoformat()
        return

    # Process Grab
    if req.platform in ("grab", "all"):
        log("Executing Grab scraping...")
        o_str = req.grab_outlet or req.outlet
        b_str = req.branch
        try:
            grab_success = run_grab(s_clean, e_clean, user_filter=req.user, outlet_filter=o_str, branch_filter=b_str, skip_existing=req.skip_existing)
            results["Grab"] = grab_success
            log(f"Grab scraping status: {'SUCCESS' if grab_success else 'FAILED'}")
            
            if grab_success and req.auto_db:
                log("Auto-ingesting Grab data to PostgreSQL (layer1_raw & normalization)...")
                ingest_to_db("grab", s_clean, e_clean, auto_normalize=True)
        except Exception as ge:
            log(f"ERROR: Grab scraping failed: {ge}")
            results["Grab"] = False

    # Process Shopee
    if req.platform in ("shopee", "all"):
        log("Executing Shopee scraping...")
        m_str = req.shopee_merchant or req.outlet
        try:
            shopee_success = run_shopee(s_clean, e_clean, merchant_filter=m_str, skip_existing=req.skip_existing)
            results["Shopee"] = shopee_success
            log(f"Shopee scraping status: {'SUCCESS' if shopee_success else 'FAILED'}")
            
            if shopee_success and req.auto_db:
                log("Auto-ingesting Shopee data to PostgreSQL (layer1_raw & normalization)...")
                ingest_to_db("shopee", s_clean, e_clean, auto_normalize=True)
        except Exception as se:
            log(f"ERROR: Shopee scraping failed: {se}")
            results["Shopee"] = False

    # Process GoFood
    if req.platform in ("gofood", "all"):
        log("Executing GoFood scraping...")
        go_str = req.gofood_outlet or req.outlet
        b_str = req.branch
        try:
            gofood_success = run_gofood(s_clean, e_clean, outlet_filter=go_str, branch_filter=b_str, task_choice="2")
            results["GoFood"] = gofood_success
            log(f"GoFood scraping status: {'SUCCESS' if gofood_success else 'FAILED'}")
            
            if gofood_success and req.auto_db:
                log("Auto-ingesting GoFood data to PostgreSQL (layer1_raw & normalization)...")
                ingest_to_db("gofood", s_clean, e_clean, auto_normalize=True)
        except Exception as goe:
            log(f"ERROR: GoFood scraping failed: {goe}")
            results["GoFood"] = False

    elapsed = datetime.now() - start_time
    log(f"Pipeline job completed in {int(elapsed.total_seconds() // 60)}m {int(elapsed.total_seconds() % 60)}s.")

    with jobs_lock:
        jobs_db[job_id]["status"] = "completed"
        jobs_db[job_id]["finished_at"] = datetime.now().isoformat()
        jobs_db[job_id]["results"] = results


# ── REST API Endpoints ──

@app.get("/", include_in_schema=False)
def root():
    return {
        "service": "Agency OFD Pipeline API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", summary="Service Health Check")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "active_jobs_count": sum(1 for j in jobs_db.values() if j["status"] == "running")
    }

@app.post("/api/pipeline/scrape", response_model=JobResponse, summary="Trigger Scraping Pipeline (Async Background Task)")
def trigger_scrape_pipeline(req: ScrapeRequest, background_tasks: BackgroundTasks):
    try:
        s_clean = normalize_date_string(req.start_date)
        e_clean = normalize_date_string(req.end_date)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    job_id = f"job-{uuid.uuid4().hex[:8]}"
    created_at = datetime.now().isoformat()

    job_record = {
        "job_id": job_id,
        "platform": req.platform,
        "start_date": s_clean,
        "end_date": e_clean,
        "status": "running",
        "created_at": created_at,
        "finished_at": None,
        "results": None,
        "logs": []
    }

    with jobs_lock:
        jobs_db[job_id] = job_record

    background_tasks.add_task(_execute_scrape_job, job_id, req)
    return job_record

@app.post("/api/pipeline/ingest", summary="Manually Trigger Raw DB Ingestion")
def trigger_db_ingest(req: IngestRequest):
    try:
        s_clean = normalize_date_string(req.start_date)
        e_clean = normalize_date_string(req.end_date)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    platforms = [req.platform] if req.platform != "all" else ["grab", "shopee", "gofood"]
    results = {}

    for p in platforms:
        success = ingest_to_db(p, s_clean, e_clean, auto_normalize=req.auto_normalize)
        results[p] = success

    return {
        "status": "success",
        "start_date": s_clean,
        "end_date": e_clean,
        "ingest_results": results
    }

@app.post("/api/pipeline/normalize", summary="Trigger Database Cleaning & Normalization (Layer 2 & Master Table)")
def trigger_db_normalization():
    success = run_normalization()
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to run database normalization")

    # Fetch verification counts from PostgreSQL
    counts = {}
    try:
        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from db_manager import DatabaseManager
        db = DatabaseManager()
        with db.engine.connect() as conn:
            counts["stg_grab_orders"] = conn.execute(text("SELECT COUNT(*) FROM layer2_clean.stg_grab_orders")).scalar()
            counts["stg_go_orders"] = conn.execute(text("SELECT COUNT(*) FROM layer2_clean.stg_go_orders")).scalar()
            counts["stg_shopee_orders"] = conn.execute(text("SELECT COUNT(*) FROM layer2_clean.stg_shopee_orders")).scalar()
            counts["fact_transactions"] = conn.execute(text("SELECT COUNT(*) FROM public.fact_transactions")).scalar()
    except Exception as e:
        counts["error"] = str(e)

    return {
        "status": "success",
        "message": "Database normalization & master refresh complete.",
        "row_counts": counts
    }

@app.get("/api/jobs", summary="List All Background Jobs")
def list_jobs(limit: int = Query(50, ge=1, le=200)):
    with jobs_lock:
        all_jobs = list(jobs_db.values())
    all_jobs.sort(key=lambda j: j["created_at"], reverse=True)
    return {"total": len(all_jobs), "jobs": all_jobs[:limit]}

@app.get("/api/jobs/{job_id}", response_model=JobResponse, summary="Get Status & Logs of Specific Job")
def get_job_status(job_id: str):
    with jobs_lock:
        job = jobs_db.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job ID '{job_id}' not found.")
    return job

@app.get("/api/transactions", summary="Query Master Cleaned Transactions (public.fact_transactions)")
def get_transactions(
    platform: Optional[str] = Query(None, description="Filter by platform: GrabFood, ShopeeFood, GoFood"),
    start_date: Optional[str] = Query(None, description="Filter start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Filter end date YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    try:
        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from db_manager import DatabaseManager
        db = DatabaseManager()

        where_clauses = ["1=1"]
        params = {}

        if platform:
            where_clauses.append("platform = :platform")
            params["platform"] = platform
        if start_date:
            where_clauses.append("transaction_date >= :start_date")
            params["start_date"] = start_date
        if end_date:
            where_clauses.append("transaction_date <= :end_date")
            params["end_date"] = end_date

        where_sql = " AND ".join(where_clauses)
        query_sql = f"""
            SELECT id, platform, external_id, transaction_date, outlet_name, branch_name, store_name,
                   is_success, gross_amount, discounts, net_sales, commission, ofd_fees, revenue
            FROM public.fact_transactions
            WHERE {where_sql}
            ORDER BY transaction_date DESC, id DESC
            LIMIT {limit} OFFSET {offset}
        """

        count_sql = f"SELECT COUNT(*) FROM public.fact_transactions WHERE {where_sql}"

        with db.engine.connect() as conn:
            total_count = conn.execute(text(count_sql), params).scalar()
            rows = conn.execute(text(query_sql), params).mappings().all()

        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "data": [dict(r) for r in rows]
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
