#!/usr/bin/env python3
"""
Elevate OFD H+1 Daily Worker Orchestrator (Server B)
Automates daily scraping for GrabFood, ShopeeFood, and GoFood.
Implements Dual Output Retention (Excel Archive + JSON Payload) and
Dead-Letter Queue (DLQ) failover for resilient Tailscale transmission to Server A.
"""

import argparse
import json
import logging
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Base directories
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data_raw"
ARCHIVE_DIR = DATA_DIR / "archive_ofd"
FAILED_QUEUE_DIR = DATA_DIR / "failed_queue"

# Setup logging
LOG_FORMAT = "[%(asctime)s] [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, datefmt="%Y-%m-%d %H:%M:%S", stream=sys.stdout)
logger = logging.getLogger("elevate_h1_worker")

# Environment configurations
ELEVATE_HOST = os.getenv("ELEVATE_HOST", "http://127.0.0.1:8000").rstrip("/")
ELEVATE_API_KEY = os.getenv("ELEVATE_API_KEY", "elevate_internal_tailscale_secret_key_2026")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
WORKER_ID = os.getenv("WORKER_ID", "server_b_worker_01")


def ensure_directories():
    """Ensure required archive and dead-letter queue directories exist."""
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    FAILED_QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    (FAILED_QUEUE_DIR / "processed").mkdir(parents=True, exist_ok=True)


def send_discord_notification(message: str):
    """Sends status message to Discord webhook if configured."""
    if not DISCORD_WEBHOOK_URL:
        return
    try:
        payload = {"content": message}
        req = urllib.request.Request(
            DISCORD_WEBHOOK_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Elevate-Worker/1.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except Exception as e:
        logger.warning(f"[NOTIFICATION WARNING] Failed to send Discord webhook: {e}")


def save_to_dead_letter_queue(platform: str, batch_date: str, payload: Dict[str, Any], reason: str) -> Path:
    """Saves unsendable batch payload to local dead-letter queue for later retry."""
    ensure_directories()
    timestamp = int(time.time())
    file_name = f"{platform}_{batch_date}_{timestamp}.json"
    target_path = FAILED_QUEUE_DIR / file_name

    envelope = {
        "platform": platform,
        "batch_date": batch_date,
        "created_at": datetime.now().isoformat(),
        "failure_reason": str(reason),
        "attempts": 1,
        "payload": payload
    }

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, indent=2)

    logger.warning(f"[DLQ] Payload saved to dead-letter queue: {target_path}")
    return target_path


def transmit_batch_to_server_a(payload: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
    """
    Transmits JSON transaction batch to Server A via Tailscale network with exponential backoff.
    """
    url = f"{ELEVATE_HOST}/api/v1/ingest/ofd/batch"
    json_bytes = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Elevate-API-Key": ELEVATE_API_KEY,
        "User-Agent": f"Elevate-Worker-Client/{WORKER_ID}",
    }

    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[INGEST] Transmitting to {url} (Attempt {attempt}/{max_retries})...")
            req = urllib.request.Request(url, data=json_bytes, headers=headers, method="POST")
            start_t = time.time()
            with urllib.request.urlopen(req, timeout=120) as resp:
                elapsed = round(time.time() - start_t, 2)
                result = json.loads(resp.read().decode("utf-8"))
                logger.info(f"[INGEST SUCCESS] Server A ingested batch in {elapsed}s: records={result.get('records_ingested')}")
                return result
        except urllib.error.HTTPError as e:
            err_text = e.read().decode("utf-8")
            last_error = f"HTTP {e.code}: {err_text}"
            logger.error(f"[INGEST ERROR] Server responded with error: {last_error}")
            if e.code in (400, 401, 403, 422):
                # Client error, will not succeed on immediate retry
                break
        except Exception as e:
            last_error = str(e)
            logger.warning(f"[INGEST RETRY] Network attempt {attempt} failed: {e}")

        if attempt < max_retries:
            backoff_seconds = attempt * 3
            time.sleep(backoff_seconds)

    raise RuntimeError(f"Ingestion failed after {max_retries} attempts: {last_error}")


def archive_local_excel_file(source_file: Path, platform: str, target_date_str: str) -> Path:
    """
    Copies scraped master Excel file to structured local archive directory:
    /data_raw/archive_ofd/{platform}/{YYYY}/{MM}/{platform}_master_{YYYY-MM-DD}.xlsx
    """
    dt = datetime.strptime(target_date_str, "%Y-%m-%d")
    year_str = dt.strftime("%Y")
    month_str = dt.strftime("%m")
    archive_folder = ARCHIVE_DIR / platform.lower() / year_str / month_str
    archive_folder.mkdir(parents=True, exist_ok=True)

    extension = source_file.suffix or ".xlsx"
    target_filename = f"{platform.lower()}_master_{target_date_str}{extension}"
    dest_path = archive_folder / target_filename

    shutil.copy2(source_file, dest_path)
    logger.info(f"[ARCHIVE] Saved local audit master file to: {dest_path}")
    return dest_path


def parse_file_to_json_records(file_path: Path, platform: str) -> Dict[str, Any]:
    """
    Parses a scraped file (CSV or Excel) into structured records and line items.
    """
    try:
        import pandas as pd
    except ImportError:
        logger.error("[DEPENDENCY ERROR] pandas is required to parse Excel/CSV files.")
        raise

    platform_key = platform.strip().lower()
    records: List[Dict[str, Any]] = []
    items: List[Dict[str, Any]] = []

    if file_path.suffix.lower() == ".csv":
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    # Convert DataFrame rows to records matching schema
    for _, row in df.iterrows():
        # Sanitize NaN values to None
        clean_row = {k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
        records.append(clean_row)

    logger.info(f"[PARSER] Extracted {len(records)} transaction records from {file_path.name} ({platform_key})")
    return {"records": records, "items": items}


def execute_mock_scraper(platform: str, target_date_str: str, output_dir: Path) -> Path:
    """
    Generates mock transactions for verification / dry-run testing.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    mock_file = output_dir / f"{platform.lower()}_sample_{target_date_str}.json"

    mock_records = [
        {
            "order_id": f"{platform.upper()}-{target_date_str.replace('-', '')}-001",
            "merchant_id": "STORE_SAMPLE_01",
            "outlet_name": "Sample Kitchen Sudirman",
            "transaction_time": f"{target_date_str} 11:30:00",
            "amount": 75000.0,
            "net_amount": 60000.0,
            "commission": 15000.0,
            "order_status": "COMPLETED"
        },
        {
            "order_id": f"{platform.upper()}-{target_date_str.replace('-', '')}-002",
            "merchant_id": "STORE_SAMPLE_02",
            "outlet_name": "Sample Kitchen Thamrin",
            "transaction_time": f"{target_date_str} 12:45:00",
            "amount": 120000.0,
            "net_amount": 96000.0,
            "commission": 24000.0,
            "order_status": "COMPLETED"
        }
    ]

    with open(mock_file, "w", encoding="utf-8") as f:
        json.dump(mock_records, f, indent=2)

    return mock_file


def run_platform_worker(
    platform: str,
    target_date_str: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Executes scraping, dual output handling, and ingestion for a single OFD platform.
    """
    start_time = time.time()
    platform_key = platform.strip().lower()
    logger.info(f"=== Starting H+1 Worker for {platform_key.upper()} (Target Date: {target_date_str}) ===")

    records: List[Dict[str, Any]] = []
    items: List[Dict[str, Any]] = []
    excel_path: Optional[Path] = None

    if dry_run:
        logger.info(f"[DRY RUN] Simulating scraping for {platform_key}...")
        tmp_dir = DATA_DIR / "tmp_test"
        sample_json_path = execute_mock_scraper(platform_key, target_date_str, tmp_dir)
        with open(sample_json_path, "r", encoding="utf-8") as f:
            records = json.load(f)
    else:
        # Resolve CLI scraping scripts in backend/
        cli_py = PROJECT_ROOT / "backend" / "cli.py"
        if not cli_py.exists():
            raise FileNotFoundError(f"CLI script not found: {cli_py}")

        cmd = [
            sys.executable,
            str(cli_py),
            "--platform", platform_key,
            "--start-date", target_date_str,
            "--end-date", target_date_str
        ]
        logger.info(f"[RUNNER] Executing scraper CLI: {' '.join(cmd)}")
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        if proc.returncode != 0:
            logger.error(f"[SCRAPER FAILED] Scraper exited with code {proc.returncode}:\n{proc.stderr}")
            raise RuntimeError(f"Scraper execution failed for {platform_key}: {proc.stderr[:200]}")

        # Locate generated raw file in data_raw/{platform_key}/{target_date_str}_to_{target_date_str}/
        expected_dir = PROJECT_ROOT / "backend" / "data_raw" / platform_key / f"{target_date_str}_to_{target_date_str}"
        files = list(expected_dir.glob("*.xlsx")) + list(expected_dir.glob("*.csv"))
        if not files:
            raise FileNotFoundError(f"No exported Excel/CSV found in {expected_dir}")

        source_file = files[0]
        # Dual Output A: Save local archive for finance audit
        excel_path = archive_local_excel_file(source_file, platform_key, target_date_str)
        # Dual Output B: Extract JSON records
        parsed = parse_file_to_json_records(source_file, platform_key)
        records = parsed["records"]
        items = parsed["items"]

    # Construct ingestion batch payload
    payload = {
        "platform": platform_key,
        "start_date": target_date_str,
        "end_date": target_date_str,
        "worker_id": WORKER_ID,
        "auto_process": True,
        "records": records,
        "items": items
    }

    # Transmit to Server A via Tailscale
    ingest_result = None
    try:
        ingest_result = transmit_batch_to_server_a(payload)
        status_flag = "success"
    except Exception as e:
        logger.error(f"[TRANSMISSION ERROR] Failed to send {platform_key} to Server A: {e}")
        # Save to Dead-Letter Queue
        dlq_file = save_to_dead_letter_queue(platform_key, target_date_str, payload, str(e))
        status_flag = "queued_to_dlq"
        ingest_result = {"status": "queued_to_dlq", "dlq_path": str(dlq_file), "error": str(e)}

    duration = round(time.time() - start_time, 2)
    return {
        "platform": platform_key,
        "target_date": target_date_str,
        "status": status_flag,
        "records_count": len(records),
        "archive_path": str(excel_path) if excel_path else None,
        "duration_seconds": duration,
        "details": ingest_result
    }


def main():
    parser = argparse.ArgumentParser(description="Elevate OFD H+1 Daily Worker (Server B)")
    parser.add_argument("--date", help="Target H-1 date (YYYY-MM-DD). Defaults to yesterday.")
    parser.add_argument(
        "--platform",
        choices=["all", "grab", "shopee", "gofood"],
        default="all",
        help="Target platform to scrape (default: all)"
    )
    parser.add_argument("--dry-run", action="store_true", help="Simulate worker execution without launching browser scrapers")
    args = parser.parse_args()

    ensure_directories()

    # Calculate target H-1 date
    if args.date:
        target_date_str = args.date.strip()
    else:
        yesterday = date.today() - timedelta(days=1)
        target_date_str = yesterday.strftime("%Y-%m-%d")

    logger.info(f"Starting Elevate H+1 Scraper Worker for target date: {target_date_str}")

    platforms = ["grab", "shopee", "gofood"] if args.platform == "all" else [args.platform]
    overall_results = []
    total_records = 0
    failures = 0

    worker_start = time.time()

    for p in platforms:
        try:
            res = run_platform_worker(p, target_date_str, dry_run=args.dry_run)
            overall_results.append(res)
            total_records += res.get("records_count", 0)
            if res.get("status") != "success":
                failures += 1
        except Exception as e:
            logger.error(f"[PLATFORM ERROR] Fatal failure during {p} processing: {e}")
            failures += 1
            overall_results.append({
                "platform": p,
                "target_date": target_date_str,
                "status": "fatal_error",
                "error": str(e)
            })

    total_duration = round(time.time() - worker_start, 2)
    summary_msg = (
        f"Elevate H+1 Worker Completed for {target_date_str}\n"
        f"Total Records: {total_records}\n"
        f"Platforms Processed: {len(platforms)} (Failures/Queued: {failures})\n"
        f"Duration: {total_duration}s\n"
        f"Results: {json.dumps(overall_results, indent=2)}"
    )

    logger.info(summary_msg)
    send_discord_notification(summary_msg)

    if failures > 0:
        logger.warning(f"[WORKER COMPLETED WITH ISSUES] {failures} platform(s) encountered errors or were queued to DLQ.")
        sys.exit(1)
    else:
        logger.info("[WORKER SUCCESS] All platforms scraped, archived, and transmitted successfully.")
        sys.exit(0)


if __name__ == "__main__":
    main()
