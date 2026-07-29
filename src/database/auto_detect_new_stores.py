import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

db_dir = os.path.dirname(os.path.abspath(__file__))
elevate_dir = os.path.dirname(db_dir)

if elevate_dir not in sys.path:
    sys.path.insert(0, elevate_dir)

from config import get_db_url

def auto_detect_new_stores():
    print("\n🔍 [AUTO-DETECT] Checking for unmapped new stores in Layer 1 Raw...")
    engine = create_engine(get_db_url())

    sql_find_new = text("""
        WITH raw_stores AS (
            SELECT DISTINCT 
                TRIM("Store ID") AS store_id, 
                'GrabFood' AS platform, 
                TRIM("Store Name") AS raw_store_name
            FROM layer1_raw.raw_grab
            WHERE "Store ID" IS NOT NULL AND TRIM("Store ID") <> ''

            UNION

            SELECT DISTINCT 
                TRIM("Store ID") AS store_id, 
                'ShopeeFood' AS platform, 
                TRIM("Store name") AS raw_store_name
            FROM layer1_raw.raw_shopee
            WHERE "Store ID" IS NOT NULL AND TRIM("Store ID") <> ''

            UNION

            SELECT DISTINCT 
                TRIM("Merchant ID") AS store_id, 
                'GoFood' AS platform, 
                TRIM("Outlet Name") AS raw_store_name
            FROM layer1_raw.raw_go
            WHERE "Merchant ID" IS NOT NULL AND TRIM("Merchant ID") <> ''
        )
        SELECT r.store_id, r.platform, r.raw_store_name, v."Owner", v."Nama Outlet"
        FROM raw_stores r
        LEFT JOIN layer3_dim.dim_merchant_mapping m ON r.store_id = m.store_id
        LEFT JOIN layer1_raw.vercel_sheet v ON TRIM(r.raw_store_name) = TRIM(v."Nama Outlet")
        WHERE m.store_id IS NULL;
    """)

    with engine.begin() as conn:
        new_stores = conn.execute(sql_find_new).fetchall()

        if not new_stores:
            print("  ✅ [AUTO-DETECT] No unmapped stores found. All active stores are registered in layer3_dim.")
            return 0

        print(f"  ⚠️ [AUTO-DETECT] Found {len(new_stores)} new store(s) requiring internal review!")

        insert_sql = text("""
            INSERT INTO layer3_dim.dim_merchant_mapping (
                store_id, platform, nama_tarikan, owner_name, outlet_name, mapping_status, mapped_by, created_at, updated_at
            )
            VALUES (:store_id, :platform, :raw_store_name, :owner_name, :outlet_name, 'PENDING_REVIEW', 'AUTO_DETECT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (store_id) DO NOTHING;
        """)

        for row in new_stores:
            conn.execute(insert_sql, {
                "store_id": row[0],
                "platform": row[1],
                "raw_store_name": row[2],
                "owner_name": row[3],
                "outlet_name": row[4] or row[2] # Fallback to raw store name
            })
            print(f"     • Inserted Pending Queue: [{row[1]}] ID: {row[0]} | Name: {row[2]}")

        return len(new_stores)

if __name__ == "__main__":
    auto_detect_new_stores()
