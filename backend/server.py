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
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
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

    log(f"Starting scrape pipeline for platform: {req.platform}")
    try:
        start_norm = normalize_date_string(req.start_date)
        end_norm = normalize_date_string(req.end_date)
        results = {}

        if req.platform in ["grab", "all"]:
            log("Running GrabFood scraping task...")
            grab_outlet = req.grab_outlet or req.outlet
            grab_res = run_grab(start_norm, end_norm, grab_outlet, req.user, req.skip_existing)
            results["grab"] = grab_res

        if req.platform in ["shopee", "all"]:
            log("Running ShopeeFood scraping task...")
            shopee_merchant = req.shopee_merchant or req.outlet
            resolved_shopee = _resolve_shopee_merchant(shopee_merchant) if shopee_merchant else None
            shopee_res = run_shopee(start_norm, end_norm, resolved_shopee, req.skip_existing)
            results["shopee"] = shopee_res

        if req.platform in ["gofood", "all"]:
            log("Running GoFood scraping task...")
            gofood_outlet = req.gofood_outlet or req.outlet
            gofood_res = run_gofood(start_norm, end_norm, gofood_outlet, req.skip_existing)
            results["gofood"] = gofood_res

        if req.auto_db:
            log("Auto-DB ingestion triggered. Ingesting raw JSON data to PostgreSQL...")
            ingest_res = ingest_to_db(req.platform, start_norm, end_norm)
            results["ingestion"] = ingest_res
            log("Triggering Layer 2 Data Normalization & Cleaning...")
            norm_res = run_normalization()
            results["normalization"] = norm_res

        with jobs_lock:
            if job_id in jobs_db:
                jobs_db[job_id]["status"] = "SUCCESS"
                jobs_db[job_id]["finished_at"] = datetime.now().isoformat()
                jobs_db[job_id]["results"] = results
        log("Pipeline execution finished successfully.")

    except Exception as e:
        err_msg = str(e)
        log(f"ERROR executing pipeline: {err_msg}")
        with jobs_lock:
            if job_id in jobs_db:
                jobs_db[job_id]["status"] = "FAILED"
                jobs_db[job_id]["finished_at"] = datetime.now().isoformat()
                jobs_db[job_id]["results"] = {"error": err_msg}

# ── API Routes ──

@app.get("/health", summary="Health Check Endpoint")
def health_check():
    return {"status": "ok", "service": "Agency OFD Backend API", "timestamp": datetime.now().isoformat()}

@app.post("/api/scrape", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED, summary="Trigger Scraping Pipeline")
def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    now_iso = datetime.now().isoformat()

    job_data = {
        "job_id": job_id,
        "platform": req.platform,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "status": "RUNNING",
        "created_at": now_iso,
        "finished_at": None,
        "results": None,
        "logs": [f"[{datetime.now().strftime('%H:%M:%S')}] Job initialized with ID: {job_id}"]
    }

    with jobs_lock:
        jobs_db[job_id] = job_data

    background_tasks.add_task(_execute_scrape_job, job_id, req)
    return job_data

@app.post("/api/ingest", summary="Ingest Raw JSON Data into PostgreSQL")
def trigger_ingest(req: IngestRequest):
    try:
        start_norm = normalize_date_string(req.start_date)
        end_norm = normalize_date_string(req.end_date)

        ingest_res = ingest_to_db(req.platform, start_norm, end_norm)
        norm_res = None
        if req.auto_normalize:
            norm_res = run_normalization()

        return {
            "status": "success",
            "ingestion": ingest_res,
            "normalization": norm_res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.post("/api/normalize", summary="Trigger Layer 2 Data Normalization & Cleaning")
def trigger_normalization():
    try:
        res = run_normalization()
        return {"status": "success", "results": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Normalization failed: {str(e)}")

@app.get("/api/jobs/{job_id}", response_model=JobResponse, summary="Get Job Status & Logs")
def get_job_status(job_id: str):
    with jobs_lock:
        if job_id not in jobs_db:
            raise HTTPException(status_code=404, detail=f"Job ID '{job_id}' not found.")
        return jobs_db[job_id]

@app.get("/api/jobs", summary="List Recent Pipeline Jobs")
def list_jobs(limit: int = Query(20, ge=1, le=100)):
    with jobs_lock:
        sorted_jobs = sorted(jobs_db.values(), key=lambda x: x["created_at"], reverse=True)
        return sorted_jobs[:limit]

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

@app.get("/baseline-growth", response_class=FileResponse, summary="Serve Baseline Growth Web Dashboard UI")
def serve_baseline_growth_ui():
    html_file = os.path.join(STATIC_DIR, "baseline_growth.html")
    if not os.path.exists(html_file):
        raise HTTPException(status_code=404, detail="Baseline Growth UI file not found.")
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

# ── Baseline Growth Endpoints ──

@app.get("/api/baseline-growth/outlets", summary="Get Active Outlets List for Dropdown Filter")
def get_baseline_outlets(owner: Optional[str] = Query(None, description="Owner name filter")):
    try:
        if hasattr(owner, 'default'): owner = None

        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        query_sql = """
            SELECT DISTINCT outlet_name 
            FROM layer3_dim.mv_outlet_daily_performance 
            WHERE outlet_name IS NOT NULL 
              AND outlet_name <> 'UNKNOWN' 
              AND TRIM(outlet_name) <> ''
              AND (:p_owner IS NULL OR :p_owner = '' OR LOWER(owner_name) = LOWER(:p_owner))
            ORDER BY outlet_name ASC;
        """
        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql), {"p_owner": owner if owner else None}).fetchall()

        outlets = [r[0] for r in rows]
        return {"total": len(outlets), "outlets": outlets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching outlets: {e}")

@app.get("/api/baseline-growth", summary="Query Baseline Growth per Outlet")
def get_baseline_growth_data(
    owner: Optional[str] = Query(None, description="Owner name filter"),
    outlet: Optional[str] = Query(None, description="Outlet name filter"),
    start_date: Optional[str] = Query("2026-07-01", description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    growth_target_pct: Optional[float] = Query(0.0, description="Growth target percentage e.g. 10 for 10%")
):
    try:
        if hasattr(owner, 'default'): owner = None
        if hasattr(outlet, 'default'): outlet = None
        if hasattr(start_date, 'default'): start_date = '2026-07-01'
        if hasattr(end_date, 'default'): end_date = None
        if hasattr(growth_target_pct, 'default'): growth_target_pct = 0.0

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
            "p_outlet": outlet if outlet else None,
            "p_start_date": start_date,
            "p_end_date": end_date,
            "p_growth_target_pct": growth_target_pct if growth_target_pct is not None else 0.0
        }

        query_sql = """
            SELECT 
                outlet_name,
                owner_name,
                live_date,
                selected_days,
                growth_target_pct,
                days_to_eom,
                baseline_gmv,
                baseline_order,
                target_gmv,
                target_order,
                current_gmv,
                current_daily_gmv_growth,
                current_order,
                current_daily_order_growth,
                eom_gmv,
                eom_gmv_growth,
                eom_order,
                eom_order_growth,
                remaining_gmv,
                required_daily_gmv,
                remaining_order,
                required_daily_order
            FROM layer3_dim.get_baseline_growth(
                :p_owner,
                :p_outlet,
                CAST(:p_start_date AS DATE),
                CAST(:p_end_date AS DATE),
                :p_growth_target_pct
            );
        """

        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql), sql_params).mappings().all()

        data_list = [dict(r) for r in rows]

        # Calculate Overall Summary Across Outlets
        total_baseline_gmv = sum(float(r['baseline_gmv'] or 0) for r in data_list)
        total_baseline_order = sum(int(r['baseline_order'] or 0) for r in data_list)
        total_target_gmv = sum(float(r['target_gmv'] or 0) for r in data_list)
        total_target_order = sum(float(r['target_order'] or 0) for r in data_list)
        total_current_gmv = sum(float(r['current_gmv'] or 0) for r in data_list)
        total_current_order = sum(int(r['current_order'] or 0) for r in data_list)
        total_eom_gmv = sum(float(r['eom_gmv'] or 0) for r in data_list)
        total_eom_order = sum(float(r['eom_order'] or 0) for r in data_list)
        total_remaining_gmv = sum(float(r['remaining_gmv'] or 0) for r in data_list)
        total_required_daily_gmv = sum(float(r['required_daily_gmv'] or 0) for r in data_list)

        summary = {
            "total_outlets": len(data_list),
            "total_baseline_gmv": total_baseline_gmv,
            "total_baseline_order": total_baseline_order,
            "total_target_gmv": total_target_gmv,
            "total_target_order": total_target_order,
            "total_current_gmv": total_current_gmv,
            "total_current_order": total_current_order,
            "total_eom_gmv": total_eom_gmv,
            "total_eom_order": total_eom_order,
            "total_remaining_gmv": total_remaining_gmv,
            "total_required_daily_gmv": total_required_daily_gmv
        }

        return {
            "owner": owner,
            "outlet_filter": outlet,
            "start_date": start_date,
            "end_date": end_date,
            "growth_target_pct": growth_target_pct,
            "summary": summary,
            "data": data_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing get_baseline_growth: {e}")

# ── Week to Week Comparison Endpoints ──

@app.get("/weektoweekcomparison", response_class=FileResponse, summary="Serve Week to Week Comparison Dashboard Page")
def serve_week_to_week_ui():
    html_file = os.path.join(STATIC_DIR, "week_to_week_comparison.html")
    if not os.path.exists(html_file):
        raise HTTPException(status_code=404, detail="Week to Week Comparison UI file not found.")
    return FileResponse(html_file)

@app.get("/api/week-to-week/pics", summary="Get Active PICs List for Dropdown Filter")
def get_week_to_week_pics():
    try:
        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        query_sql = """
            SELECT DISTINCT COALESCE(NULLIF(TRIM(pic), ''), NULLIF(TRIM(bd_pic), '')) AS pic_name 
            FROM layer3_dim.dim_merchant_mapping 
            WHERE COALESCE(NULLIF(TRIM(pic), ''), NULLIF(TRIM(bd_pic), '')) IS NOT NULL 
              AND COALESCE(NULLIF(TRIM(pic), ''), NULLIF(TRIM(bd_pic), '')) <> 'UNKNOWN' 
            ORDER BY pic_name ASC;
        """
        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql)).fetchall()

        pics = [r[0] for r in rows if r[0]]
        return {"total": len(pics), "pics": pics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching PICs: {e}")

@app.get("/api/week-to-week/owners", summary="Get Active Owners List for Dropdown Filter (Filtered by PIC)")
def get_week_to_week_owners(pic: Optional[str] = Query(None, description="PIC name filter")):
    try:
        if hasattr(pic, 'default'): pic = None
        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        query_sql = """
            SELECT DISTINCT COALESCE(c.owner_name, m.owner_name) AS owner_name 
            FROM layer3_dim.dim_merchant_mapping m
            LEFT JOIN layer3_dim.dim_merchant_credentials c ON m.store_id = c.store_id
            WHERE COALESCE(c.owner_name, m.owner_name) IS NOT NULL 
              AND COALESCE(c.owner_name, m.owner_name) <> 'UNKNOWN' 
              AND TRIM(COALESCE(c.owner_name, m.owner_name)) <> ''
              AND (:p_pic IS NULL OR :p_pic = '' OR LOWER(COALESCE(m.pic, m.bd_pic, '')) = LOWER(:p_pic))
            ORDER BY owner_name ASC;
        """
        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql), {"p_pic": pic if pic else None}).fetchall()

        owners = [r[0] for r in rows]
        return {"total": len(owners), "owners": owners}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching owners: {e}")

@app.get("/api/week-to-week/outlets", summary="Get Active Outlets List for Dropdown Filter (Filtered by PIC & Owner)")
def get_week_to_week_outlets(
    pic: Optional[str] = Query(None, description="PIC filter"),
    owner: Optional[str] = Query(None, description="Owner filter")
):
    try:
        if hasattr(pic, 'default'): pic = None
        if hasattr(owner, 'default'): owner = None

        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        query_sql = """
            SELECT DISTINCT COALESCE(m.outlet_name, c.merchant_name) AS outlet_name 
            FROM layer3_dim.dim_merchant_mapping m
            LEFT JOIN layer3_dim.dim_merchant_credentials c ON m.store_id = c.store_id
            WHERE COALESCE(m.outlet_name, c.merchant_name) IS NOT NULL 
              AND COALESCE(m.outlet_name, c.merchant_name) <> 'UNKNOWN' 
              AND TRIM(COALESCE(m.outlet_name, c.merchant_name)) <> ''
              AND (:p_pic IS NULL OR :p_pic = '' OR LOWER(COALESCE(m.pic, m.bd_pic, '')) = LOWER(:p_pic))
              AND (:p_owner IS NULL OR :p_owner = '' OR LOWER(COALESCE(c.owner_name, m.owner_name)) = LOWER(:p_owner))
            ORDER BY outlet_name ASC;
        """
        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql), {"p_pic": pic if pic else None, "p_owner": owner if owner else None}).fetchall()

        outlets = [r[0] for r in rows]
        return {"total": len(outlets), "outlets": outlets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching outlets: {e}")

@app.get("/api/week-to-week", summary="Query Week to Week Comparison Data")
def get_week_to_week_comparison_data(
    pic: Optional[str] = Query(None, description="BD PIC filter"),
    owner: Optional[str] = Query(None, description="Owner filter"),
    outlet: Optional[str] = Query(None, description="Outlet filter"),
    start_date_a: str = Query("2026-07-13", description="Start date Period A YYYY-MM-DD"),
    end_date_a: str = Query("2026-07-19", description="End date Period A YYYY-MM-DD"),
    start_date_b: str = Query("2026-07-20", description="Start date Period B YYYY-MM-DD"),
    end_date_b: str = Query("2026-07-26", description="End date Period B YYYY-MM-DD"),
    target_growth_pct: Optional[float] = Query(10.0, description="Target growth % e.g. 10.0"),
    status_filter: Optional[str] = Query(None, description="Performance status filter")
):
    try:
        if hasattr(pic, 'default'): pic = None
        if hasattr(owner, 'default'): owner = None
        if hasattr(outlet, 'default'): outlet = None
        if hasattr(target_growth_pct, 'default'): target_growth_pct = 10.0
        if hasattr(status_filter, 'default'): status_filter = None

        project_root = os.path.abspath(os.path.join(BASE_DIR, ".."))
        db_dir = os.path.join(project_root, "src", "database")
        if db_dir not in sys.path:
            sys.path.insert(0, db_dir)
        from layer1_db_manager import DatabaseManager
        db = DatabaseManager()

        sql_params = {
            "p_pic": pic if pic else None,
            "p_owner": owner if owner else None,
            "p_outlet": outlet if outlet else None,
            "p_start_date_a": start_date_a,
            "p_end_date_a": end_date_a,
            "p_start_date_b": start_date_b,
            "p_end_date_b": end_date_b,
            "p_target_growth_pct": target_growth_pct if target_growth_pct is not None else 10.0
        }

        query_sql = """
            SELECT 
                pic,
                owner_name,
                outlet_name,
                live_date,
                age,
                selected_days,
                gmv_a,
                gmv_b,
                daily_gmv_a,
                daily_gmv_b,
                daily_gmv_growth,
                order_a,
                order_b,
                daily_order_a,
                daily_order_b,
                daily_order_growth,
                status
            FROM layer3_dim.get_week_to_week_comparison(
                :p_pic,
                :p_owner,
                :p_outlet,
                CAST(:p_start_date_a AS DATE),
                CAST(:p_end_date_a AS DATE),
                CAST(:p_start_date_b AS DATE),
                CAST(:p_end_date_b AS DATE),
                :p_target_growth_pct
            );
        """

        with db.engine.connect() as conn:
            rows = conn.execute(text(query_sql), sql_params).mappings().all()

        data_list = [dict(r) for r in rows]

        if status_filter and status_filter.strip() and status_filter.lower() != 'all':
            sf = status_filter.strip().lower()
            data_list = [r for r in data_list if r['status'].lower() == sf]

        valid_gmv_growths = [float(r['daily_gmv_growth']) for r in data_list if r['daily_gmv_growth'] is not None]
        valid_order_growths = [float(r['daily_order_growth']) for r in data_list if r['daily_order_growth'] is not None]

        avg_gmv_growth = (sum(valid_gmv_growths) / len(valid_gmv_growths)) if valid_gmv_growths else 0.0
        avg_order_growth = (sum(valid_order_growths) / len(valid_order_growths)) if valid_order_growths else 0.0

        total_outlet = len(data_list)
        growing_outlet = sum(1 for r in data_list if r['status'] == 'Achieved')

        summary = {
            "avg_gmv_growth": avg_gmv_growth,
            "avg_order_growth": avg_order_growth,
            "total_outlet": total_outlet,
            "growing_outlet": growing_outlet,
            "achieved_count": growing_outlet,
            "gmv_below_count": sum(1 for r in data_list if r['status'] == 'GMV Below Target'),
            "order_below_count": sum(1 for r in data_list if r['status'] == 'Order Below Target'),
            "not_achieved_count": sum(1 for r in data_list if r['status'] == 'Not Achieved')
        }

        return {
            "pic": pic,
            "owner": owner,
            "outlet": outlet,
            "start_date_a": start_date_a,
            "end_date_a": end_date_a,
            "start_date_b": start_date_b,
            "end_date_b": end_date_b,
            "target_growth_pct": target_growth_pct,
            "status_filter": status_filter,
            "summary": summary,
            "data": data_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing get_week_to_week_comparison: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
