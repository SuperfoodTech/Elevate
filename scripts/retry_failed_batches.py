#!/usr/bin/env python3
"""
Elevate Dead-Letter Queue (DLQ) Retry Worker
Runs hourly via cron to replay unsendable transaction batches from Server B to Server A.
Moves successfully ingested batches to processed/ directory.
"""

import argparse
import json
import logging
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

# Base directories
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
FAILED_QUEUE_DIR = PROJECT_ROOT / "data_raw" / "failed_queue"
PROCESSED_DIR = FAILED_QUEUE_DIR / "processed"

# Setup logging
LOG_FORMAT = "[%(asctime)s] [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, datefmt="%Y-%m-%d %H:%M:%S", stream=sys.stdout)
logger = logging.getLogger("elevate_dlq_retry")

# Environment configurations
ELEVATE_HOST = os.getenv("ELEVATE_HOST", "http://127.0.0.1:8000").rstrip("/")
ELEVATE_API_KEY = os.getenv("ELEVATE_API_KEY", "elevate_internal_tailscale_secret_key_2026")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")


def send_discord_notification(message: str):
    """Sends status message to Discord webhook if configured."""
    if not DISCORD_WEBHOOK_URL:
        return
    try:
        payload = {"content": message}
        req = urllib.request.Request(
            DISCORD_WEBHOOK_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Elevate-DLQ-Retry/1.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except Exception as e:
        logger.warning(f"[NOTIFICATION WARNING] Failed to send Discord webhook: {e}")


def transmit_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Transmits JSON payload to Elevate Server A."""
    url = f"{ELEVATE_HOST}/api/v1/ingest/ofd/batch"
    json_bytes = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Elevate-API-Key": ELEVATE_API_KEY,
        "User-Agent": "Elevate-DLQ-Retry-Client/1.0",
    }

    req = urllib.request.Request(url, data=json_bytes, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def process_queue(dry_run: bool = False):
    """Scans and replays failed queue batch files."""
    if not FAILED_QUEUE_DIR.exists():
        logger.info(f"Dead-letter queue directory does not exist: {FAILED_QUEUE_DIR}. Nothing to retry.")
        return

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    batch_files = [f for f in FAILED_QUEUE_DIR.glob("*.json") if f.is_file()]

    if not batch_files:
        logger.info("[DLQ EMPTY] No pending failed batches found in queue.")
        return

    logger.info(f"Found {len(batch_files)} pending batch(es) in dead-letter queue. Commencing replay...")

    successful_replays = 0
    failed_replays = 0

    for bf in sorted(batch_files):
        try:
            with open(bf, "r", encoding="utf-8") as f:
                envelope = json.load(f)

            platform = envelope.get("platform", "unknown")
            batch_date = envelope.get("batch_date", "unknown")
            attempts = envelope.get("attempts", 1)
            payload = envelope.get("payload")

            if not payload:
                logger.error(f"[INVALID FILE] Skipping malformed queue file without payload: {bf.name}")
                continue

            records_count = len(payload.get("records", []))
            logger.info(f"[RETRYING] File: {bf.name} ({platform}, date={batch_date}, records={records_count}, previous attempts={attempts})")

            if dry_run:
                logger.info(f"[DRY RUN] Would transmit {records_count} records from {bf.name} to {ELEVATE_HOST}")
                successful_replays += 1
                continue

            result = transmit_payload(payload)
            logger.info(f"[REPLAY SUCCESS] {bf.name} ingested successfully: {result.get('status')}")

            # Move to processed folder
            target_dest = PROCESSED_DIR / bf.name
            shutil.move(bf, target_dest)
            successful_replays += 1

        except urllib.error.HTTPError as e:
            failed_replays += 1
            err_msg = e.read().decode("utf-8")
            logger.error(f"[REPLAY FAILED] HTTP {e.code} for {bf.name}: {err_msg}")
            # Update envelope attempts
            try:
                envelope["attempts"] = attempts + 1
                envelope["last_retry_at"] = datetime.now().isoformat()
                envelope["last_error"] = f"HTTP {e.code}: {err_msg}"
                with open(bf, "w", encoding="utf-8") as f:
                    json.dump(envelope, f, indent=2)
            except Exception:
                pass
        except Exception as e:
            failed_replays += 1
            logger.error(f"[REPLAY FAILED] Network/system exception for {bf.name}: {e}")
            try:
                envelope["attempts"] = attempts + 1
                envelope["last_retry_at"] = datetime.now().isoformat()
                envelope["last_error"] = str(e)
                with open(bf, "w", encoding="utf-8") as f:
                    json.dump(envelope, f, indent=2)
            except Exception:
                pass

    summary = (
        f"[DLQ Replay Report]\n"
        f"Total Batches Processed: {len(batch_files)}\n"
        f"Successfully Replayed: {successful_replays}\n"
        f"Still Failed: {failed_replays}"
    )
    logger.info(summary)

    if successful_replays > 0 and failed_replays == 0:
        send_discord_notification(f"Elevate DLQ: All {successful_replays} pending batches recovered successfully.")
    elif failed_replays > 0:
        send_discord_notification(f"Elevate DLQ Warning: {failed_replays} batches failed recovery attempt.")


def main():
    parser = argparse.ArgumentParser(description="Elevate Dead-Letter Queue (DLQ) Retry Worker")
    parser.add_argument("--dry-run", action="store_true", help="Simulate replay without sending HTTP requests")
    args = parser.parse_args()

    process_queue(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
