import os
import sys
import time
from typing import Any, Dict, List, Optional
import pandas as pd
from sqlalchemy import text

# Ensure database module is accessible
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DB_DIR = os.path.join(PROJECT_ROOT, "src", "database")

if DB_DIR not in sys.path:
    sys.path.append(DB_DIR)

from layer1_db_manager import DatabaseManager

db_manager = DatabaseManager()


def _refresh_materialized_views(conn) -> List[str]:
    """
    Safely refreshes available materialized views in layer3_dim.
    """
    refreshed = []
    target_views = [
        "mv_payment_daily",
        "mv_rekap_tagihan_monthly",
        "mv_order_ranking",
        "mv_week_to_week_comparison",
        "mv_baseline_vs_current",
    ]

    for mv in target_views:
        check_query = text(
            "SELECT 1 FROM pg_matviews WHERE schemaname = 'layer3_dim' AND matviewname = :mv"
        )
        exists = conn.execute(check_query, {"mv": mv}).scalar()
        if exists:
            try:
                # Attempt CONCURRENT refresh first (requires unique index)
                conn.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY layer3_dim.{mv}"))
                refreshed.append(f"{mv} (concurrent)")
            except Exception:
                # Fallback to regular refresh
                conn.execute(text(f"REFRESH MATERIALIZED VIEW layer3_dim.{mv}"))
                refreshed.append(mv)

    return refreshed


def execute_pipeline_chain(
    platform: str,
    df: pd.DataFrame,
    items_df: Optional[pd.DataFrame] = None,
    auto_process: bool = True,
) -> Dict[str, Any]:
    """
    Executes the unified 3-layer data ingestion and processing pipeline:
    Layer 1: Ingest raw data to layer1_raw
    Layer 2: Clean and normalize data to layer2_clean
    Layer 3: Match with DBR (dim_merchant_mapping), load fact_transactions, and refresh views
    """
    start_time = time.time()
    platform_key = platform.strip().lower()

    if platform_key not in ("grab", "shopee", "gofood"):
        raise ValueError(f"Platform '{platform}' is not supported. Must be 'grab', 'shopee', or 'gofood'.")

    if df.empty:
        raise ValueError("Transaction records dataframe is empty.")

    # 1. LAYER 1: Raw Ingestion
    records_count = len(df)
    items_count = len(items_df) if items_df is not None and not items_df.empty else 0

    if platform_key == "grab":
        db_manager.ingest_grab(df)
    elif platform_key == "shopee":
        db_manager.ingest_shopee(df)
    elif platform_key == "gofood":
        db_manager.ingest_gofood(df)
        if items_df is not None and not items_df.empty:
            db_manager.ingest_gofood_items(items_df)

    layer1_status = "completed"
    layer2_status = "skipped"
    layer3_status = "skipped"
    refreshed_views: List[str] = []
    unmapped_stores_count = 0

    # 2. LAYER 2 & 3: Normalization, DBR Matching, and Fact Refresh
    if auto_process:
        from layer2_normalize import normalize_all

        # Layer 2: Clean & normalize
        normalize_all()
        layer2_status = "completed"

        # Layer 3: DBR matching & fact transactions update
        with db_manager.engine.begin() as conn:
            # Stored procedure for master facts
            conn.execute(text("SELECT refresh_fact_transactions()"))
            # Agency owner settlement view refresh
            try:
                conn.execute(text("SELECT layer3_dim.refresh_agency_settlements()"))
            except Exception as e:
                # If function is not defined, log and continue
                print(f"[INGEST WARNING] Agency settlement view refresh notice: {e}")

            # Refresh Materialized Views
            refreshed_views = _refresh_materialized_views(conn)

        layer3_status = "completed"

        # Check for unmapped stores
        try:
            from auto_detect_new_stores import auto_detect_new_stores
            unmapped_stores_count = auto_detect_new_stores() or 0
        except Exception as e:
            print(f"[INGEST WARNING] Auto-detect store discovery notice: {e}")

    # Fetch verification counts from PostgreSQL
    row_counts = {}
    with db_manager.engine.connect() as conn:
        row_counts["stg_grab_orders"] = conn.execute(
            text("SELECT COUNT(*) FROM layer2_clean.stg_grab_orders")
        ).scalar()
        row_counts["stg_shopee_orders"] = conn.execute(
            text("SELECT COUNT(*) FROM layer2_clean.stg_shopee_orders")
        ).scalar()
        row_counts["stg_go_orders"] = conn.execute(
            text("SELECT COUNT(*) FROM layer2_clean.stg_go_orders")
        ).scalar()
        row_counts["fact_transactions"] = conn.execute(
            text("SELECT COUNT(*) FROM layer3_dim.fact_transactions")
        ).scalar()

    elapsed = round(time.time() - start_time, 2)

    return {
        "status": "success",
        "platform": platform_key,
        "records_ingested": records_count,
        "items_ingested": items_count,
        "layer1_status": layer1_status,
        "layer2_status": layer2_status,
        "layer3_status": layer3_status,
        "refreshed_views": refreshed_views,
        "unmapped_stores_detected": unmapped_stores_count,
        "row_counts": row_counts,
        "execution_time_seconds": elapsed,
    }
