#!/usr/bin/env python3
"""
Elevate OFD Pipeline Ingestion Client for Remote Worker (Server B)
Transmits scraped transaction data to Elevate Server (Server A) over Tailscale Mesh.
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error
import urllib.parse

DEFAULT_HOST = os.getenv("ELEVATE_HOST", "http://127.0.0.1:8000").rstrip("/")
DEFAULT_API_KEY = os.getenv("ELEVATE_API_KEY", "elevate_internal_tailscale_secret_key_2026")


def check_pipeline_status(host: str = DEFAULT_HOST, api_key: str = DEFAULT_API_KEY) -> Dict[str, Any]:
    """
    Checks the connectivity and status of the Elevate ingestion pipeline.
    """
    url = f"{host}/api/v1/ingest/status"
    req = urllib.request.Request(url, headers={"X-Elevate-API-Key": api_key})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
            print(f"[STATUS] Connected to Elevate Ingestion API at {host}")
            print(json.dumps(data, indent=2))
            return data
    except urllib.error.HTTPError as e:
        print(f"[ERROR] HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Connection failed to {host}: {e}")
        sys.exit(1)


def send_batch_json(
    platform: str,
    records: List[Dict[str, Any]],
    items: Optional[List[Dict[str, Any]]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    host: str = DEFAULT_HOST,
    api_key: str = DEFAULT_API_KEY,
    worker_id: str = "server_b",
    auto_process: bool = True,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Sends batch transaction records as JSON payload over Tailscale with exponential backoff retry.
    """
    url = f"{host}/api/v1/ingest/ofd/batch"
    payload = {
        "platform": platform.lower(),
        "start_date": start_date,
        "end_date": end_date,
        "worker_id": worker_id,
        "auto_process": auto_process,
        "records": records,
        "items": items or [],
    }

    json_bytes = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Elevate-API-Key": api_key,
        "User-Agent": "Elevate-Worker-Client/1.0",
    }

    for attempt in range(1, max_retries + 1):
        try:
            print(f"[INGEST] Sending {len(records)} records ({platform}) to {url} (Attempt {attempt}/{max_retries})...")
            req = urllib.request.Request(url, data=json_bytes, headers=headers, method="POST")
            start_time = time.time()
            with urllib.request.urlopen(req, timeout=120) as resp:
                elapsed = round(time.time() - start_time, 2)
                result = json.loads(resp.read().decode("utf-8"))
                print(f"[SUCCESS] Ingest completed in {elapsed}s: {json.dumps(result, indent=2)}")
                return result
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"[ERROR] Server responded with HTTP {e.code}: {err_body}")
            if e.code in (400, 401, 403, 422):
                # Non-retryable client error
                sys.exit(1)
        except Exception as e:
            print(f"[WARNING] Network attempt {attempt} failed: {e}")

        if attempt < max_retries:
            backoff = attempt * 3
            print(f"[INFO] Retrying in {backoff} seconds...")
            time.sleep(backoff)

    print("[FATAL] All ingestion retry attempts failed.")
    sys.exit(1)


def upload_report_file(
    platform: str,
    file_path: str,
    host: str = DEFAULT_HOST,
    api_key: str = DEFAULT_API_KEY,
    worker_id: str = "server_b",
    auto_process: bool = True,
) -> Dict[str, Any]:
    """
    Uploads an Excel (.xlsx) or CSV file as multipart/form-data for archiving and ingestion.
    """
    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        sys.exit(1)

    url = f"{host}/api/v1/ingest/ofd/upload"
    boundary = "----WebKitFormBoundary" + os.urandom(16).hex()
    filename = os.path.basename(file_path)

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    # Build multipart body
    body_parts = []
    
    # Form fields
    for field_name, field_value in [
        ("platform", platform.lower()),
        ("worker_id", worker_id),
        ("auto_process", "true" if auto_process else "false"),
    ]:
        body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
        body_parts.append(f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'.encode("utf-8"))
        body_parts.append(f"{field_value}\r\n".encode("utf-8"))

    # File field
    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if filename.endswith(".xlsx") else "text/csv"
    body_parts.append(f"--{boundary}\r\n".encode("utf-8"))
    body_parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body_parts.append(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
    body_parts.append(file_bytes)
    body_parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))

    payload = b"".join(body_parts)

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "X-Elevate-API-Key": api_key,
        "User-Agent": "Elevate-Worker-Client/1.0",
    }

    try:
        print(f"[UPLOAD] Uploading '{filename}' ({len(file_bytes)} bytes) to {url}...")
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=180) as resp:
            elapsed = round(time.time() - start_time, 2)
            result = json.loads(resp.read().decode("utf-8"))
            print(f"[SUCCESS] Upload & ingest completed in {elapsed}s: {json.dumps(result, indent=2)}")
            return result
    except urllib.error.HTTPError as e:
        print(f"[ERROR] HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Upload failed: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Elevate OFD Pipeline Ingestion Client (Server B)")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Elevate Server URL / Tailscale IP (e.g. http://100.x.y.z:8000)")
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="X-Elevate-API-Key for authentication")
    parser.add_argument("--platform", choices=["grab", "shopee", "gofood"], help="Target OFD platform")
    parser.add_argument("--file", help="Path to local Excel or CSV file to upload")
    parser.add_argument("--json", help="Path to local JSON file containing transaction array")
    parser.add_argument("--items-json", help="Optional path to GoFood line-items JSON file")
    parser.add_argument("--start-date", help="Optional report start date YYYY-MM-DD")
    parser.add_argument("--end-date", help="Optional report end date YYYY-MM-DD")
    parser.add_argument("--worker-id", default="server_b", help="Worker identifier")
    parser.add_argument("--status", action="store_true", help="Check pipeline health and exit")

    args = parser.parse_args()

    if args.status:
        check_pipeline_status(host=args.host, api_key=args.api_key)
        return

    if not args.platform:
        print("[ERROR] Argument --platform (grab, shopee, or gofood) is required.")
        sys.exit(1)

    if args.file:
        upload_report_file(
            platform=args.platform,
            file_path=args.file,
            host=args.host,
            api_key=args.api_key,
            worker_id=args.worker_id,
        )
    elif args.json:
        with open(args.json, "r", encoding="utf-8") as f:
            records = json.load(f)
        items = None
        if args.items_json and os.path.exists(args.items_json):
            with open(args.items_json, "r", encoding="utf-8") as f:
                items = json.load(f)

        send_batch_json(
            platform=args.platform,
            records=records,
            items=items,
            start_date=args.start_date,
            end_date=args.end_date,
            host=args.host,
            api_key=args.api_key,
            worker_id=args.worker_id,
        )
    else:
        print("[ERROR] Please provide either --file (for Excel/CSV) or --json (for JSON transaction records).")
        sys.exit(1)


if __name__ == "__main__":
    main()
