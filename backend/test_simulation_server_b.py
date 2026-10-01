#!/usr/bin/env python3
"""
backend/test_simulation_server_b.py
===================================
End-to-end integration and resilience test simulating Server B (Scraper Layer)
communicating with Server A (Core API & Processing Pipeline at 38.103.170.205).

Test Scenarios:
1. Live Stream Ingestion (Fast ACK HTTP 202 & Local Staging Outbox)
2. Asynchronous ETL Worker Processing & Multi-Layer DB Lineage (L1 -> L2 -> L3)
3. Idempotency Protection (Duplicate Payload Handling)
4. Offline Staging & Resilient Outbox Retry
"""

import os
import sys
import time
import json
import paramiko
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    env_file = Path(__file__).resolve().parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core.stream_sender import send_outlet_stream_payload, retry_failed_staging_payloads

SERVER_A_URL = os.getenv("ELEVATE_SERVER_A_URL", "https://elevate.byfoodmaster.com")
API_KEY = os.getenv("ELEVATE_INGEST_API_KEY", "elevate_internal_tailscale_secret_key_2026")
STAGING_DIR = BASE_DIR / "data" / "staging"

SERVER_IP = "38.103.170.205"
SERVER_USER = "root"
SERVER_PASS = "superF777"


def query_server_db(sql_code: str) -> str:
    """Executes a python snippet on Server 1 inside elevate_backend container."""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(3):
        try:
            ssh.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASS, timeout=15)
            break
        except Exception:
            time.sleep(2)

    runner_script = f"""
import sys
sys.path.append('/app/src/database')
from layer1_db_manager import DatabaseManager
from sqlalchemy import text
db = DatabaseManager()
with db.engine.connect() as conn:
{sql_code}
"""
    stdin, stdout, stderr = ssh.exec_command("docker exec -i elevate_backend uv run python -")
    stdin.write(runner_script)
    stdin.channel.shutdown_write()
    output = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    ssh.close()
    if err and "warning" not in err.lower() and not output:
        raise RuntimeError(f"Server DB Query Error: {err}")
    return output


def run_test_suite():
    print("=" * 70)
    print("ELEVATE MULTI-SERVER ARCHITECTURE SIMULATION TEST")
    print(f"Server B (Client): Local Workstation (Worker: laptop_simulasi_server2)")
    print(f"Server A (Core):   {SERVER_A_URL} ({SERVER_IP})")
    print("=" * 70)

    test_date_start = "2026-10-01"
    test_date_end = "2026-10-01"
    store_id = "G247396917"
    outlet_name = "Ayam Geprek Suroboyo Ampel"
    unique_run_id = int(time.time())

    order_id_1 = f"GF-SIM-{unique_run_id}-001"
    order_id_2 = f"GF-SIM-{unique_run_id}-002"

    sim_records = [
        {
            "Order Status": "Sukses",
            "Outlet Name": outlet_name,
            "Merchant ID": store_id,
            "Feature": "GO_FOOD",
            "Order ID": order_id_1,
            "Transaction ID": f"TRX-{unique_run_id}-001",
            "Amount": "75000",
            "Net Amount": "60000",
            "Transaction Time": "2026-10-01 12:30:00",
            "Payment Type": "GOPAY",
            "GoPay Promo": "0",
            "Promo Type": "",
            "Promo Name": "",
            "Merchant Promo Contribution": "0",
            "Voucher Description": "",
            "GoFood Discount": "0",
            "Voucher Commission": "0",
            "Total Fee": "15000",
            "Value Added Tax": "0.11",
            "Restaurant Tax": "0",
            "Service": "GO_FOOD",
            "Withholding Tax": "0",
            "Settlement Time": "2026-10-01 13:00:00",
            "Batch ID": "",
            "Refund Amount": "0",
            "Refund Reason": "",
            "Promo Code": "",
            "Promo Original Amount": "0"
        },
        {
            "Order Status": "Sukses",
            "Outlet Name": outlet_name,
            "Merchant ID": store_id,
            "Feature": "GO_FOOD",
            "Order ID": order_id_2,
            "Transaction ID": f"TRX-{unique_run_id}-002",
            "Amount": "50000",
            "Net Amount": "40000",
            "Transaction Time": "2026-10-01 13:15:00",
            "Payment Type": "GOPAY",
            "GoPay Promo": "0",
            "Promo Type": "",
            "Promo Name": "",
            "Merchant Promo Contribution": "0",
            "Voucher Description": "",
            "GoFood Discount": "0",
            "Voucher Commission": "0",
            "Total Fee": "10000",
            "Value Added Tax": "0.11",
            "Restaurant Tax": "0",
            "Service": "GO_FOOD",
            "Withholding Tax": "0",
            "Settlement Time": "2026-10-01 13:45:00",
            "Batch ID": "",
            "Refund Amount": "0",
            "Refund Reason": "",
            "Promo Code": "",
            "Promo Original Amount": "0"
        }
    ]

    sim_items = [
        {
            "Order ID": order_id_1,
            "Merchant ID": store_id,
            "Item Name": "Paket Ayam Geprek Sambal Bawang",
            "Quantity": "2",
            "Price Per Item": "30000",
            "Total Item": "60000",
            "Transaction Time": "2026-10-01 12:30:00"
        },
        {
            "Order ID": order_id_1,
            "Merchant ID": store_id,
            "Item Name": "Es Teh Manis",
            "Quantity": "3",
            "Price Per Item": "5000",
            "Total Item": "15000",
            "Transaction Time": "2026-10-01 12:30:00"
        },
        {
            "Order ID": order_id_2,
            "Merchant ID": store_id,
            "Item Name": "Paket Ayam Geprek Keju Mozzarella",
            "Quantity": "1",
            "Price Per Item": "38000",
            "Total Item": "38000",
            "Transaction Time": "2026-10-01 13:15:00"
        },
        {
            "Order ID": order_id_2,
            "Merchant ID": store_id,
            "Item Name": "Air Mineral",
            "Quantity": "2",
            "Price Per Item": "6000",
            "Total Item": "12000",
            "Transaction Time": "2026-10-01 13:15:00"
        }
    ]

    # =========================================================================
    # TEST 1: Live Stream Ingestion (Fast ACK HTTP 202)
    # =========================================================================
    print("\n--- TEST 1: Live Stream Ingestion (Fast ACK HTTP 202) ---")
    start_time = time.time()
    res1 = send_outlet_stream_payload(
        platform="gofood",
        store_id=store_id,
        start_date=test_date_start,
        end_date=test_date_end,
        records=sim_records,
        items=sim_items,
        outlet_name=outlet_name,
        server_a_url=SERVER_A_URL,
        api_key=API_KEY,
        staging_dir=str(STAGING_DIR),
        max_retries=2,
        timeout=15
    )
    duration = time.time() - start_time

    assert res1["success"] is True, f"Stream ingestion failed: {res1}"
    assert res1["status_code"] == 202, f"Expected HTTP 202, got {res1['status_code']}"
    assert Path(res1["staged_file"]).exists(), f"Staging file not found: {res1['staged_file']}"

    stg_content = json.loads(Path(res1["staged_file"]).read_text(encoding="utf-8"))
    assert stg_content["status"] == "SENT", f"Expected staging status 'SENT', got {stg_content['status']}"

    print(f"Status: SUCCESS")
    print(f"HTTP Response Code: {res1['status_code']}")
    print(f"Fast ACK Latency:   {duration:.2f}s")
    print(f"Idempotency Key:    {res1['idempotency_key']}")
    print(f"Local Staging:      {res1['staged_file']}")
    print(f"Server A Status:    {res1['response'].get('status')}")

    # =========================================================================
    # TEST 2: Asynchronous ETL Worker Processing & DB Lineage
    # =========================================================================
    print("\n--- TEST 2: Asynchronous ETL Worker Verification (Server 1) ---")
    print("Polling RabbitMQ consumer & ETL worker for L1 -> L2 -> L3 completion...")

    check_sql = f"""
    raw_status = conn.execute(text(\"SELECT status, error_message FROM layer1_raw.raw_stream_payloads WHERE idempotency_key = '{res1['idempotency_key']}'\")).fetchone()
    print('RAW_PAYLOAD_STATUS:', raw_status[0] if raw_status else 'NOT_FOUND')
    if raw_status and raw_status[1]:
        print('RAW_PAYLOAD_ERROR:', raw_status[1])

    l1_rows = conn.execute(text(\"SELECT COUNT(*) FROM layer1_raw.raw_go WHERE \\\"Order ID\\\" IN ('{order_id_1}', '{order_id_2}')\")).scalar()
    print('L1_RAW_GO_COUNT:', l1_rows)

    l1_items = conn.execute(text(\"SELECT COUNT(*) FROM layer1_raw.raw_go_items WHERE \\\"Order ID\\\" IN ('{order_id_1}', '{order_id_2}')\")).scalar()
    print('L1_RAW_ITEMS_COUNT:', l1_items)

    l2_rows = conn.execute(text(\"SELECT COUNT(*) FROM layer2_clean.stg_go_orders WHERE order_id IN ('{order_id_1}', '{order_id_2}')\")).scalar()
    print('L2_STG_ORDERS_COUNT:', l2_rows)

    l3_row = conn.execute(text(\"SELECT external_id, outlet_name, owner_name, net_sales, revenue FROM layer3_dim.fact_transactions WHERE external_id = '{order_id_1}'\")).fetchone()
    if l3_row:
        print('L3_FACT_RECORD:', l3_row)
    else:
        print('L3_FACT_RECORD: NOT_FOUND')
    """

    db_verification = ""
    for wait_round in range(1, 9):
        time.sleep(2)
        db_verification = query_server_db(check_sql)
        if (
            "RAW_PAYLOAD_STATUS: PROCESSED" in db_verification
            and "L3_FACT_RECORD:" in db_verification
            and "NOT_FOUND" not in db_verification
        ):
            print(f"ETL completed successfully in round {wait_round} (~{wait_round * 2}s)")
            break

    print("Remote Database Verification Results:")
    for line in db_verification.splitlines():
        print(f"  {line}")

    assert "RAW_PAYLOAD_STATUS: PROCESSED" in db_verification, "Payload was not marked PROCESSED"
    assert "L1_RAW_GO_COUNT: 2" in db_verification, "Layer 1 raw_go record count mismatch"
    assert "L1_RAW_ITEMS_COUNT: 4" in db_verification, "Layer 1 raw_go_items count mismatch"
    assert "L2_STG_ORDERS_COUNT: 2" in db_verification, "Layer 2 stg_go_orders count mismatch"
    assert "L3_FACT_RECORD:" in db_verification and "NOT_FOUND" not in db_verification, "Layer 3 fact record not found"
    print("Status: SUCCESS - End-to-end pipeline (L1 -> L2 -> L3) verified.")

    # =========================================================================
    # TEST 3: Idempotency Protection (Duplicate Prevention)
    # =========================================================================
    print("\n--- TEST 3: Idempotency Protection (Duplicate Prevention) ---")
    start_dup_time = time.time()
    res_dup = send_outlet_stream_payload(
        platform="gofood",
        store_id=store_id,
        start_date=test_date_start,
        end_date=test_date_end,
        records=sim_records,
        items=sim_items,
        outlet_name=outlet_name,
        server_a_url=SERVER_A_URL,
        api_key=API_KEY,
        staging_dir=str(STAGING_DIR),
        max_retries=1,
        timeout=15
    )
    dup_duration = time.time() - start_dup_time

    assert res_dup["success"] is True, f"Duplicate request failed: {res_dup}"
    assert res_dup["status_code"] == 200, f"Expected HTTP 200 for duplicate, got {res_dup['status_code']}"
    assert res_dup["response"].get("status") == "already_received", f"Expected already_received, got {res_dup['response']}"

    print(f"Status: SUCCESS")
    print(f"HTTP Response Code: {res_dup['status_code']}")
    print(f"Duplicate ACK Time: {dup_duration:.2f}s")
    print(f"Server Response:    {res_dup['response'].get('message')}")

    # =========================================================================
    # TEST 4: Offline Staging & Resilient Outbox Retry
    # =========================================================================
    print("\n--- TEST 4: Offline Fallback & Staged Outbox Retry ---")
    offline_store_id = f"OFFLINE_TEST_{unique_run_id}"
    offline_order_id = f"GF-OFFLINE-{unique_run_id}"
    offline_records = [
        {
            "Order Status": "Sukses",
            "Outlet Name": "Offline Fallback Store",
            "Merchant ID": offline_store_id,
            "Feature": "GO_FOOD",
            "Order ID": offline_order_id,
            "Transaction ID": f"TRX-OFFLINE-{unique_run_id}",
            "Amount": "25000",
            "Net Amount": "20000",
            "Transaction Time": "2026-10-01 14:00:00",
            "Payment Type": "GOPAY",
            "Total Fee": "5000"
        }
    ]

    # Attempt to stream to an unreachable port (simulate network outage)
    res_offline = send_outlet_stream_payload(
        platform="gofood",
        store_id=offline_store_id,
        start_date=test_date_start,
        end_date=test_date_end,
        records=offline_records,
        server_a_url="http://127.0.0.1:9999",  # Non-existent endpoint
        api_key=API_KEY,
        staging_dir=str(STAGING_DIR),
        max_retries=2,
        timeout=2
    )

    assert res_offline["success"] is False, "Expected offline call to fail"
    offline_stg_path = Path(res_offline["staged_file"])
    assert offline_stg_path.exists(), "Offline payload was not saved to staging"

    offline_meta = json.loads(offline_stg_path.read_text(encoding="utf-8"))
    assert offline_meta["status"] == "PENDING_RETRY", f"Expected PENDING_RETRY, got {offline_meta['status']}"
    print(f"Offline Simulation: PASS (Payload safely held in staging as PENDING_RETRY)")

    # Now flush and retry to real Server A
    flushed_count = retry_failed_staging_payloads(
        staging_dir=str(STAGING_DIR),
        server_a_url=SERVER_A_URL,
        api_key=API_KEY,
        max_retries=2
    )
    print(f"Retry Worker Flushed Payloads: {flushed_count}")
    assert flushed_count >= 1, "Retry failed to flush pending payload"

    # Verify staging status changed to SENT
    recovered_meta = json.loads(offline_stg_path.read_text(encoding="utf-8"))
    assert recovered_meta["status"] == "SENT", f"Expected SENT after retry, got {recovered_meta['status']}"
    print(f"Staged Outbox Recovery: PASS (Status updated to SENT)")

    print("\n" + "=" * 70)
    print("ALL 4 INTEGRATION & RESILIENCE TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_test_suite()
