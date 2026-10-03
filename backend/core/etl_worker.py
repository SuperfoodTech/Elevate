#!/usr/bin/env python3
"""
backend/core/etl_worker.py
==========================
Asynchronous ETL Worker Daemon Service for Elevate.
Consumes store-level transaction events from RabbitMQ (or fallback DB queue),
executes Layer 1 raw deduplication, Layer 2 normalization, Layer 3 DBR matching,
and refreshes materialized views asynchronously without blocking Ingestion.
"""

import os
import sys
import time
import logging
import threading
from typing import Dict, Any

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DB_DIR = os.path.join(PROJECT_ROOT, "src", "database")

for p in [PROJECT_ROOT, BACKEND_DIR, DB_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

import pandas as pd
from sqlalchemy import text
from layer1_db_manager import DatabaseManager

try:
    from backend.core.queue_client import start_event_consumer
    from backend.core.batch_ingest import execute_pipeline_chain
except ImportError:
    from core.queue_client import start_event_consumer
    from core.batch_ingest import execute_pipeline_chain

log = logging.getLogger("etl_worker")
if not log.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [ETL-WORKER] %(message)s", datefmt="%H:%M:%S")
    ch.setFormatter(formatter)
    log.addHandler(ch)
    log.setLevel(logging.INFO)

db_manager = DatabaseManager()


def process_single_outlet_event(event_data: Dict[str, Any]) -> bool:
    """
    Callback executed when an outlet transaction event is popped from RabbitMQ.
    Runs 3-layer ETL and updates raw_stream_payloads table status.
    """
    payload_id = event_data.get("payload_id")
    platform = event_data.get("platform")
    store_id = event_data.get("store_id")
    records = event_data.get("records", [])
    items = event_data.get("items", [])

    log.info(f"Processing ETL task for store '{store_id}' ({platform}) with {len(records)} records...")
    t0 = time.time()

    if not records:
        log.warning(f"Empty records payload for store {store_id}. Marking processed.")
        if payload_id:
            _update_payload_status(payload_id, "PROCESSED", "Empty records")
        return True

    try:
        df = pd.DataFrame(records)
        items_df = pd.DataFrame(items) if items else None

        # Execute 3-layer pipeline chain
        result = execute_pipeline_chain(
            platform=platform,
            df=df,
            items_df=items_df,
            auto_process=True
        )

        elapsed = time.time() - t0
        log.info(
            f"ETL completed for store '{store_id}' in {elapsed:.2f}s: "
            f"L1 raw={result.get('layer1_raw_rows', 0)}, "
            f"L2 clean={result.get('layer2_clean_orders', 0)}, "
            f"L3 facts={result.get('layer3_fact_rows', 0)}"
        )

        if payload_id:
            _update_payload_status(payload_id, "PROCESSED")

        return True

    except Exception as e:
        log.error(f"ETL processing error for store '{store_id}' (payload_id={payload_id}): {e}")
        if payload_id:
            _update_payload_status(payload_id, "FAILED", str(e))
        return False


def _update_payload_status(payload_id: int, status_str: str, error_msg: str = None):
    try:
        with db_manager.engine.begin() as conn:
            conn.execute(
                text("""
                    UPDATE layer1_raw.raw_stream_payloads
                    SET status = :st,
                        error_message = :err,
                        processed_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """),
                {"st": status_str, "err": error_msg, "id": payload_id}
            )
    except Exception as err:
        log.error(f"Failed to update payload status for ID {payload_id}: {err}")


def sweep_pending_db_payloads():
    """
    Background fallback sweeper:
    Periodically checks PostgreSQL layer1_raw.raw_stream_payloads for any payloads
    that remained in 'RECEIVED' status (e.g. if RabbitMQ broker was temporarily down).
    """
    log.info("Starting background DB queue fallback sweeper thread...")
    while True:
        try:
            with db_manager.engine.begin() as conn:
                pending_rows = conn.execute(text("""
                    SELECT id, idempotency_key, platform, store_id, outlet_name,
                           branch_name, start_date, end_date, record_count, raw_payload
                    FROM layer1_raw.raw_stream_payloads
                    WHERE status = 'RECEIVED'
                    ORDER BY id ASC
                    LIMIT 10
                    FOR UPDATE SKIP LOCKED;
                """)).mappings().fetchall()

            if pending_rows:
                log.info(f"Sweeper found {len(pending_rows)} unprocessed DB payloads. Processing...")
                for row in pending_rows:
                    raw_dict = row["raw_payload"]
                    event_data = {
                        "payload_id": row["id"],
                        "idempotency_key": row["idempotency_key"],
                        "platform": row["platform"],
                        "store_id": row["store_id"],
                        "outlet_name": row["outlet_name"],
                        "branch_name": row["branch_name"],
                        "start_date": str(row["start_date"]),
                        "end_date": str(row["end_date"]),
                        "record_count": row["record_count"],
                        "records": raw_dict.get("records", []),
                        "items": raw_dict.get("items", [])
                    }
                    process_single_outlet_event(event_data)

        except Exception as e:
            log.warning(f"Error in DB queue fallback sweeper: {e}")

        time.sleep(30)


def main():
    log.info("Starting Elevate Asynchronous ETL Worker Daemon...")

    # Start fallback sweeper in background thread
    sweeper_thread = threading.Thread(target=sweep_pending_db_payloads, daemon=True)
    sweeper_thread.start()

    # Start main RabbitMQ consumer loop
    start_event_consumer(process_single_outlet_event, prefetch_count=1)


if __name__ == "__main__":
    main()
