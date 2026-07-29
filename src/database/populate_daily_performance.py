import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

db_dir = os.path.dirname(os.path.abspath(__file__))
elevate_dir = os.path.dirname(db_dir)

if elevate_dir not in sys.path:
    sys.path.insert(0, elevate_dir)

from config import get_db_url

def refresh_daily_merchant_performance():
    print("⚡ [DAILY_PERFORMANCE] Aggregating daily performance to layer3_dim.fact_daily_merchant_performance...")
    engine = create_engine(get_db_url())

    sql_aggregate = text("""
        INSERT INTO layer3_dim.fact_daily_merchant_performance (
            date_key, transaction_date, store_id, platform,
            total_orders, completed_orders, cancelled_orders,
            total_gross_sales, total_discounts, total_net_sales,
            total_commission, total_ofd_fees, total_net_payout,
            aov, updated_at
        )
        SELECT 
            CAST(TO_CHAR(ft.transaction_date, 'YYYYMMDD') AS INTEGER) AS date_key,
            ft.transaction_date,
            ft.merchant_id AS store_id,
            ft.platform,
            COUNT(*) AS total_orders,
            SUM(COALESCE(ft.is_success, 0)) AS completed_orders,
            SUM(COALESCE(ft.is_cancelled, 0)) AS cancelled_orders,
            SUM(COALESCE(ft.gross_amount, 0)) AS total_gross_sales,
            SUM(COALESCE(ft.discounts, 0)) AS total_discounts,
            SUM(COALESCE(ft.net_sales, 0)) AS total_net_sales,
            SUM(COALESCE(ft.commission, 0)) AS total_commission,
            SUM(COALESCE(ft.ofd_fees, 0)) AS total_ofd_fees,
            SUM(COALESCE(ft.revenue, 0)) AS total_net_payout,
            ROUND(SUM(COALESCE(ft.gross_amount, 0)) / NULLIF(SUM(COALESCE(ft.is_success, 0)), 0), 2) AS aov,
            CURRENT_TIMESTAMP
        FROM layer3_dim.fact_transactions ft
        WHERE ft.transaction_date IS NOT NULL 
          AND ft.merchant_id IS NOT NULL AND ft.merchant_id <> ''
        GROUP BY ft.transaction_date, ft.merchant_id, ft.platform
        ON CONFLICT (transaction_date, store_id, platform) DO UPDATE SET
            date_key = EXCLUDED.date_key,
            total_orders = EXCLUDED.total_orders,
            completed_orders = EXCLUDED.completed_orders,
            cancelled_orders = EXCLUDED.cancelled_orders,
            total_gross_sales = EXCLUDED.total_gross_sales,
            total_discounts = EXCLUDED.total_discounts,
            total_net_sales = EXCLUDED.total_net_sales,
            total_commission = EXCLUDED.total_commission,
            total_ofd_fees = EXCLUDED.total_ofd_fees,
            total_net_payout = EXCLUDED.total_net_payout,
            aov = EXCLUDED.aov,
            updated_at = CURRENT_TIMESTAMP;
    """)

    with engine.begin() as conn:
        conn.execute(sql_aggregate)
        count = conn.execute(text("SELECT COUNT(*) FROM layer3_dim.fact_daily_merchant_performance")).scalar()

    print(f"  ✅ [DAILY_PERFORMANCE] Aggregated {count:,} daily performance summary rows!")
    return count

if __name__ == "__main__":
    refresh_daily_merchant_performance()
