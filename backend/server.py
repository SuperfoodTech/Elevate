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
from decimal import Decimal
from typing import Optional, List, Dict, Any, Literal
from dotenv import load_dotenv

# Ensure agency directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DB_DIR = os.path.join(PROJECT_ROOT, "src", "database")
if BASE_DIR in sys.path:
    sys.path.remove(BASE_DIR)
sys.path.insert(0, BASE_DIR)
if DB_DIR not in sys.path:
    sys.path.append(DB_DIR)

from layer1_db_manager import DatabaseManager
db_manager = DatabaseManager()

from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, status
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text

# Import pipeline helpers from backend/cli.py and core modules
from backend.cli import (
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

# ── Rekap Tagihan Web Dashboard & REST API Endpoints ──

# Mount static folder
STATIC_DIR = os.path.join(BASE_DIR, "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/rekap-tagihan", response_class=FileResponse, summary="Serve Rekap Tagihan Web Dashboard UI")
def serve_rekap_tagihan_ui():
    html_file = os.path.join(STATIC_DIR, "rekap_tagihan.html")
    if not os.path.exists(html_file):
        raise HTTPException(status_code=404, detail="Dashboard UI file not found.")
    return FileResponse(html_file)

@app.get("/api/rekap-tagihan/owners", summary="Get Active Owners List for Dropdown")
def get_rekap_owners():
    try:
        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        query_sql = """
            SELECT DISTINCT owner_name 
            FROM layer3_dim.mv_rekap_tagihan_daily 
            WHERE owner_name IS NOT NULL 
              AND owner_name <> 'UNKNOWN' 
              AND TRIM(owner_name) <> ''
            ORDER BY owner_name ASC;
        """
        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql)).fetchall()

        owners = [r[0] for r in rows]
        return {"total": len(owners), "owners": owners}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching owners: {e}")

@app.get("/api/rekap-tagihan", summary="Query Rekap Tagihan per Owner & Date Range")
def get_rekap_tagihan_data(
    owner: Optional[str] = Query(None, description="Owner name filter (e.g. 'Mustika', 'Vindus')"),
    start_date: Optional[str] = Query("2026-01-01", description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    nominal_bagi_hasil: Optional[float] = Query(None, description="Optional override bagi hasil per order (e.g. 1000, 2000)")
):
    try:
        # Unwrap Query default objects if called directly in Python
        if hasattr(owner, 'default'): owner = None
        if hasattr(start_date, 'default'): start_date = '2026-01-01'
        if hasattr(end_date, 'default'): end_date = None
        if hasattr(nominal_bagi_hasil, 'default'): nominal_bagi_hasil = None

        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")

        sql_params = {
            "p_owner": owner if owner else None,
            "p_start_date": start_date,
            "p_end_date": end_date,
            "p_override_nominal_bagi_hasil": nominal_bagi_hasil
        }

        query_sql = """
            SELECT tanggal, pendapatan_kotor, potongan_ojol, pendapatan_bersih, total_order_sukses, total_bagi_hasil
            FROM layer3_dim.get_rekap_tagihan(
                :p_owner,
                CAST(:p_start_date AS DATE),
                CAST(:p_end_date AS DATE),
                :p_override_nominal_bagi_hasil
            );
        """

        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql), sql_params).mappings().all()

        return {
            "owner": owner,
            "start_date": start_date,
            "end_date": end_date,
            "nominal_override": nominal_bagi_hasil,
            "data": [dict(r) for r in rows]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing get_rekap_tagihan: {e}")

# ── Tagihan Bulanan (Monthly Billing) Endpoints ──

class MonthlyPaymentUpdateRequest(BaseModel):
    store_id: str = Field(..., description="Store/Merchant ID")
    periode: str = Field(..., description="Periode YYYY-MM")
    penyesuaian: Optional[float] = Field(0.00, description="Manual fee adjustment amount")
    tanggal_tagihan: Optional[str] = Field(None, description="Billing date YYYY-MM-DD")
    transfer_id: Optional[str] = Field(None, description="Transfer transaction ID")
    tanggal_pembayaran: Optional[str] = Field(None, description="Payment date YYYY-MM-DD")
    link_bukti: Optional[str] = Field(None, description="Proof URL link")
    status_pembayaran: Optional[str] = Field("Unpaid", description="Payment status: Unpaid, Paid, Pending")
    notes: Optional[str] = Field(None, description="Internal notes")

@app.get("/rekap-tagihan-billing", response_class=FileResponse, summary="Serve Unified Rekap Tagihan Billing Dashboard Page")
@app.get("/rekap-tagihan-monthly", response_class=FileResponse, summary="Serve Unified Rekap Tagihan Billing Dashboard Page (Alias)")
def serve_rekap_tagihan_billing_page():
    file_path = os.path.join(STATIC_DIR, "rekap_tagihan_billing.html")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="rekap_tagihan_billing.html not found.")
    return FileResponse(file_path)

@app.get("/api/rekap-tagihan-billing", summary="Get Unified Rekap Tagihan Data (Monthly & Weekly)")
@app.get("/api/rekap-tagihan-monthly", summary="Get Unified Rekap Tagihan Data (Alias)")
def get_rekap_tagihan_billing_data(
    billing_cycle: Optional[str] = Query(default="Weekly", description="Billing cycle: 'Monthly' or 'Weekly'"),
    owner: Optional[str] = Query(default=None, description="Filter by Owner Name"),
    periode: Optional[str] = Query(default=None, description="Filter by Periode (e.g. '2026-06' or '2026-06-W1')"),
    status_pembayaran: Optional[str] = Query(default=None, description="Filter by Payment Status ('LUNAS', 'BELUM DIBAYAR', 'PENDING')")
):
    try:
        if hasattr(billing_cycle, 'default'): billing_cycle = "Monthly"
        if hasattr(owner, 'default'): owner = None
        if hasattr(periode, 'default'): periode = None
        if hasattr(status_pembayaran, 'default'): status_pembayaran = None

        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        sql_params = {
            "p_billing_cycle": billing_cycle,
            "p_owner": owner if owner else None,
            "p_periode": periode if periode else None,
            "p_status_pembayaran": status_pembayaran if status_pembayaran else None
        }

        query_sql = """
            SELECT owner_name, outlet_name, brand, nama_resto_final, store_id, periode,
                   jumlah_order_sukses, biaya, subtotal_tagihan, penyesuaian, total_tagihan,
                   TO_CHAR(tanggal_tagihan, 'YYYY-MM-DD') AS tanggal_tagihan,
                   transfer_id,
                   TO_CHAR(tanggal_pembayaran, 'YYYY-MM-DD') AS tanggal_pembayaran,
                   link_bukti, status_pembayaran
            FROM layer3_dim.get_rekap_tagihan_billing(
                :p_billing_cycle,
                :p_owner,
                :p_periode,
                :p_status_pembayaran
            );
        """

        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql), sql_params).mappings().all()

        return {
            "billing_cycle": billing_cycle,
            "owner": owner,
            "periode": periode,
            "status_pembayaran": status_pembayaran,
            "data": [dict(r) for r in rows]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing get_rekap_tagihan_billing: {e}")

@app.post("/api/rekap-tagihan-billing/update-payment", summary="Update or Save Administrative Payment Details")
@app.post("/api/rekap-tagihan-monthly/update-payment", summary="Update or Save Administrative Payment Details (Alias)")
def update_billing_payment_record(req: MonthlyPaymentUpdateRequest):
    try:
        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        tgl_tagihan = req.tanggal_tagihan if req.tanggal_tagihan and req.tanggal_tagihan.strip() else None
        tgl_bayar = req.tanggal_pembayaran if req.tanggal_pembayaran and req.tanggal_pembayaran.strip() else None

        upsert_sql = """
            INSERT INTO layer3_dim.billing_payments (
                store_id, periode, penyesuaian, tanggal_tagihan, transfer_id,
                tanggal_pembayaran, link_bukti, status_pembayaran, notes, updated_at
            ) VALUES (
                :store_id, :periode, :penyesuaian, CAST(:tanggal_tagihan AS DATE), :transfer_id,
                CAST(:tanggal_pembayaran AS DATE), :link_bukti, :status_pembayaran, :notes, CURRENT_TIMESTAMP
            )
            ON CONFLICT (store_id, periode) DO UPDATE SET
                penyesuaian = EXCLUDED.penyesuaian,
                tanggal_tagihan = EXCLUDED.tanggal_tagihan,
                transfer_id = EXCLUDED.transfer_id,
                tanggal_pembayaran = EXCLUDED.tanggal_pembayaran,
                link_bukti = EXCLUDED.link_bukti,
                status_pembayaran = EXCLUDED.status_pembayaran,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP;
        """

        st_input = (req.status_pembayaran or 'BELUM DIBAYAR').strip()
        if st_input.upper() in ('PAID', 'SUDAH DIBAYAR', 'LUNAS'):
            st_input = 'LUNAS'
        elif st_input.upper() in ('UNPAID', 'BELUM DIBAYAR'):
            st_input = 'BELUM DIBAYAR'

        params = {
            "store_id": req.store_id,
            "periode": req.periode,
            "penyesuaian": req.penyesuaian or 0.00,
            "tanggal_tagihan": tgl_tagihan,
            "transfer_id": req.transfer_id,
            "tanggal_pembayaran": tgl_bayar,
            "link_bukti": req.link_bukti,
            "status_pembayaran": st_input,
            "notes": req.notes
        }

        with db.engine.begin() as conn:
            conn.execute(text(upsert_sql), params)
            # Refresh Materialized Views to reflect payment updates
            conn.execute(text("REFRESH MATERIALIZED VIEW layer3_dim.mv_billing_history;"))
            conn.execute(text("REFRESH MATERIALIZED VIEW layer3_dim.mv_rekap_tagihan;"))

        return {
            "status": "success",
            "message": f"Payment record for store_id '{req.store_id}' ({req.periode}) successfully updated.",
            "data": params
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating payment record: {e}")

@app.post("/api/rekap-tagihan-billing/sync-history", summary="Trigger Sync Payment History from Google Sheets CSV")
def sync_payment_history_from_sheets():
    try:
        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        import seed_payment_history
        seed_payment_history.run_seed_payment_history()

        return {
            "status": "success",
            "message": "Berhasil meng-import dan menyinkronkan riwayat pembayaran dari Google Sheets ke PostgreSQL Database."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyinkronkan riwayat pembayaran: {e}")

# ============================================================================
# LAPORAN APLIKASI OJOL (GOFOOD, GRABFOOD, SHOPEEFOOD) ROUTES
# ============================================================================

@app.get("/laporan-aplikasi-ojol", response_class=FileResponse, summary="Serve Laporan Aplikasi Ojol Web Dashboard Page")
def serve_laporan_aplikasi_ojol_ui():
    file_path = os.path.join(STATIC_DIR, "laporan_aplikasi_ojol.html")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="laporan_aplikasi_ojol.html not found.")
    return FileResponse(file_path)

@app.get("/api/laporan-aplikasi-ojol/filters", summary="Get Filter Options for Laporan Aplikasi Ojol")
def get_laporan_ojol_filter_options():
    try:
        with db_manager.engine.connect() as conn:
            owners = [row[0] for row in conn.execute(text("SELECT DISTINCT owner_name FROM layer3_dim.mv_laporan_ojol WHERE owner_name IS NOT NULL ORDER BY owner_name;")).fetchall()]
            outlets = [row[0] for row in conn.execute(text("SELECT DISTINCT outlet_name FROM layer3_dim.mv_laporan_ojol WHERE outlet_name IS NOT NULL ORDER BY outlet_name;")).fetchall()]
            brands = [row[0] for row in conn.execute(text("SELECT DISTINCT brand FROM layer3_dim.mv_laporan_ojol WHERE brand IS NOT NULL ORDER BY brand;")).fetchall()]
            
            # Get date range min/max
            date_range = conn.execute(text("SELECT MIN(transaction_date), MAX(transaction_date) FROM layer3_dim.mv_laporan_ojol;")).fetchone()
            
            return {
                "status": "success",
                "owners": owners,
                "outlets": outlets,
                "brands": brands,
                "min_date": str(date_range[0]) if date_range and date_range[0] else "2026-01-01",
                "max_date": str(date_range[1]) if date_range and date_range[1] else "2026-06-30"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching filters: {e}")

@app.get("/api/laporan-aplikasi-ojol/summary", summary="Get Aggregated Ojol Performance per Channel (Top Table)")
def get_laporan_ojol_summary(
    owner: Optional[str] = Query(default=None),
    outlet: Optional[str] = Query(default=None),
    brand: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default="2026-04-01"),
    end_date: Optional[str] = Query(default="2026-06-30")
):
    try:
        sql = text("""
            SELECT channel, pendapatan_kotor, potongan_ojol, pendapatan_bersih,
                   rata_rata_order_per_customer, total_order, order_sukses, order_batal
            FROM layer3_dim.get_laporan_aplikasi_ojol(:owner, :outlet, :brand, CAST(:start_date AS DATE), CAST(:end_date AS DATE));
        """)
        params = {
            "owner": owner,
            "outlet": outlet,
            "brand": brand,
            "start_date": start_date or "2026-01-01",
            "end_date": end_date or "2026-12-31"
        }
        with db_manager.engine.connect() as conn:
            rows = conn.execute(sql, params).mappings().fetchall()
            clean_data = []
            for r in rows:
                row_dict = dict(r)
                for k, v in row_dict.items():
                    if isinstance(v, Decimal):
                        row_dict[k] = float(v)
                clean_data.append(row_dict)
            return {
                "status": "success",
                "data": clean_data
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Ojol summary: {e}")

@app.get("/api/laporan-aplikasi-ojol/monthly", summary="Get Monthly Ojol Performance Breakdown (Bottom Table)")
def get_laporan_ojol_monthly(
    owner: Optional[str] = Query(default=None),
    outlet: Optional[str] = Query(default=None),
    brand: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default="2026-04-01"),
    end_date: Optional[str] = Query(default="2026-06-30")
):
    try:
        sql = text("""
            SELECT bulan, channel, pendapatan_kotor, potongan_ojol, pendapatan_bersih,
                   rata_rata_order_per_customer, total_order, order_sukses, order_batal
            FROM layer3_dim.get_laporan_bulanan_ojol(:owner, :outlet, :brand, CAST(:start_date AS DATE), CAST(:end_date AS DATE));
        """)
        params = {
            "owner": owner,
            "outlet": outlet,
            "brand": brand,
            "start_date": start_date or "2026-01-01",
            "end_date": end_date or "2026-12-31"
        }
        with db_manager.engine.connect() as conn:
            rows = conn.execute(sql, params).mappings().fetchall()
            clean_data = []
            for r in rows:
                row_dict = dict(r)
                for k, v in row_dict.items():
                    if isinstance(v, Decimal):
                        row_dict[k] = float(v)
                clean_data.append(row_dict)
            return {
                "status": "success",
                "data": clean_data
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Ojol monthly breakdown: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
