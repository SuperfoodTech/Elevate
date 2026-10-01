#!/usr/bin/env python3
"""
backend/core/stream_sender.py
=============================
Client module for Server B (Scraping Layer).
Implements local staging (/data/staging), SHA256 idempotency key generation,
exponential backoff retry, and fast HTTP POST streaming to Server A via Tailscale.
"""

import os
import sys
import json
import time
import hashlib
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

try:
    import requests
except ImportError:
    requests = None

log = logging.getLogger("stream_sender")
if not log.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [STREAM-SENDER] %(message)s", datefmt="%H:%M:%S")
    ch.setFormatter(formatter)
    log.addHandler(ch)
    log.setLevel(logging.INFO)

# Default Server A Ingestion Configuration (Tailscale Mesh or Direct)
DEFAULT_SERVER_A_URL = os.getenv("ELEVATE_SERVER_A_URL", "http://127.0.0.1:8000")
DEFAULT_API_KEY = os.getenv("ELEVATE_INGEST_API_KEY", "elevate_internal_tailscale_secret_key_2026")
DEFAULT_STAGING_DIR = os.getenv("ELEVATE_STAGING_DIR") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "staging"
)


def compute_idempotency_key(platform: str, store_id: str, start_date: str, end_date: str, record_count: int) -> str:
    """
    Generates deterministic SHA-256 idempotency key based on store parameters.
    """
    raw_str = f"{platform.lower()}:{store_id.strip()}:{start_date}:{end_date}:{record_count}"
    return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()


def send_outlet_stream_payload(
    platform: str,
    store_id: str,
    start_date: str,
    end_date: str,
    records: List[Dict[str, Any]],
    items: Optional[List[Dict[str, Any]]] = None,
    outlet_name: Optional[str] = None,
    branch_name: Optional[str] = None,
    server_a_url: Optional[str] = None,
    api_key: Optional[str] = None,
    staging_dir: Optional[str] = None,
    max_retries: int = 3,
    timeout: int = 15
) -> Dict[str, Any]:
    """
    Streams scraped transactions for a single store to Server A Ingestion Service.
    1. Saves copy to local staging directory (/data/staging).
    2. Sends HTTP POST with idempotency key, timeout, and exponential retry.
    3. Handles offline fallback if Server A is unreachable.
    """
    if requests is None:
        raise RuntimeError("The 'requests' library is required to stream payloads to Server A.")

    server_url = (server_a_url or DEFAULT_SERVER_A_URL).rstrip("/")
    target_endpoint = f"{server_url}/api/v1/ingest/ofd/outlet"
    key = api_key or DEFAULT_API_KEY
    stg_base = staging_dir or DEFAULT_STAGING_DIR

    date_folder = f"{start_date}_to_{end_date}"
    platform_clean = platform.lower().strip()
    idempotency_key = compute_idempotency_key(platform_clean, store_id, start_date, end_date, len(records))

    payload = {
        "platform": platform_clean,
        "store_id": store_id,
        "outlet_name": outlet_name,
        "branch_name": branch_name,
        "start_date": start_date,
        "end_date": end_date,
        "records": records,
        "items": items or [],
        "idempotency_key": idempotency_key,
        "worker_id": os.getenv("WORKER_ID", "server_b")
    }

    # 1. Local Staging (Outbox Pattern)
    target_stg_dir = Path(stg_base) / platform_clean / date_folder
    target_stg_dir.mkdir(parents=True, exist_ok=True)
    staging_file = target_stg_dir / f"{store_id}.json"

    meta_payload = {
        "staged_at": time.time(),
        "status": "PENDING",
        "payload": payload
    }
    try:
        staging_file.write_text(json.dumps(meta_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info(f"Local staging saved: {staging_file} ({len(records)} records)")
    except Exception as e:
        log.warning(f"Failed writing local staging file {staging_file}: {e}")

    # 2. HTTP POST with Exponential Backoff Retry
    headers = {
        "X-Elevate-API-Key": key,
        "Content-Type": "application/json"
    }

    last_error = None
    delay = 1.0

    for attempt in range(1, max_retries + 1):
        try:
            log.info(f"Sending stream HTTP POST to Server A (Attempt {attempt}/{max_retries}) for store '{store_id}'...")
            resp = requests.post(target_endpoint, json=payload, headers=headers, timeout=timeout)

            if resp.status_code in (200, 202):
                res_data = resp.json()
                log.info(f"Fast ACK received from Server A (HTTP {resp.status_code}): {res_data.get('status')}")

                # Update staging file status to SENT
                meta_payload["status"] = "SENT"
                meta_payload["sent_at"] = time.time()
                meta_payload["server_response"] = res_data
                try:
                    staging_file.write_text(json.dumps(meta_payload, ensure_ascii=False, indent=2), encoding="utf-8")
                except Exception:
                    pass

                return {
                    "success": True,
                    "status_code": resp.status_code,
                    "idempotency_key": idempotency_key,
                    "staged_file": str(staging_file),
                    "response": res_data
                }
            else:
                last_error = f"Server returned HTTP {resp.status_code}: {resp.text[:200]}"
                log.warning(f"Attempt {attempt} failed: {last_error}")

        except Exception as ex:
            last_error = str(ex)
            log.warning(f"Network error on attempt {attempt}: {last_error}")

        if attempt < max_retries:
            time.sleep(delay)
            delay *= 2.0

    # 3. Offline / Staged Fallback
    log.error(
        f"All {max_retries} attempts to send store '{store_id}' failed. "
        f"Payload remains securely in local staging: {staging_file}"
    )

    meta_payload["status"] = "PENDING_RETRY"
    meta_payload["last_error"] = last_error
    try:
        staging_file.write_text(json.dumps(meta_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

    return {
        "success": False,
        "status_code": None,
        "idempotency_key": idempotency_key,
        "error": last_error,
        "staged_file": str(staging_file),
        "message": "Payload preserved in local staging for offline retry."
    }


def retry_failed_staging_payloads(
    staging_dir: Optional[str] = None,
    server_a_url: Optional[str] = None,
    api_key: Optional[str] = None,
    max_retries: int = 3
) -> int:
    """
    Scans local staging directory and retries any payloads marked as 'PENDING' or 'PENDING_RETRY'.
    Returns count of successfully flushed payloads.
    """
    stg_base = Path(staging_dir or DEFAULT_STAGING_DIR)
    if not stg_base.exists():
        return 0

    success_count = 0
    pending_files = list(stg_base.glob("*/*/*.json"))
    log.info(f"Scanning {len(pending_files)} staging files for retry...")

    for f in pending_files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            if data.get("status") in ("PENDING", "PENDING_RETRY"):
                payload = data.get("payload", {})
                res = send_outlet_stream_payload(
                    platform=payload.get("platform"),
                    store_id=payload.get("store_id"),
                    start_date=payload.get("start_date"),
                    end_date=payload.get("end_date"),
                    records=payload.get("records", []),
                    items=payload.get("items"),
                    outlet_name=payload.get("outlet_name"),
                    branch_name=payload.get("branch_name"),
                    server_a_url=server_a_url,
                    api_key=api_key,
                    staging_dir=staging_dir,
                    max_retries=max_retries
                )
                if res.get("success"):
                    success_count += 1
        except Exception as e:
            log.warning(f"Error checking staging file {f}: {e}")

    log.info(f"Retry worker finished. Successfully flushed {success_count} payloads.")
    return success_count


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--retry":
        retry_failed_staging_payloads()
    else:
        print("Stream Sender Module - Usage:")
        print("  python stream_sender.py --retry   (Flush pending staging files to Server A)")
