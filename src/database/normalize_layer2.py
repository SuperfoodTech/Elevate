# database/normalize_layer2.py
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from db_manager import DatabaseManager

def normalize_all():
    db = DatabaseManager()
    
    print("=" * 60)
    print("   LAYER 2 CLEANING & NORMALIZATION RUNNER")
    print("=" * 60)
    
    # 1. GrabFood Normalization Query
    grab_query = """
    TRUNCATE TABLE layer2_clean.stg_grab_orders;

    WITH grab_chargebacks AS (
        SELECT 
            "Long Order ID" AS long_order_id,
            SUM(CAST(COALESCE(NULLIF(TRIM("Total"), ''), '0') AS NUMERIC(15,2))) AS total_chargeback
        FROM layer1_raw.raw_grab
        WHERE "Order Type" = 'Auto-Chargeback'
          AND "Long Order ID" IS NOT NULL AND "Long Order ID" <> ''
        GROUP BY "Long Order ID"
    )
    INSERT INTO layer2_clean.stg_grab_orders (
        month, merchant_name, merchant_id, store_name, store_id,
        updated_on, created_on, type, category, subcategory, status,
        transaction_id, linked_transaction_id, partner_transaction_id_1, partner_transaction_id_2,
        long_order_id, short_order_id, booking_id, order_channel, order_type,
        payment_method, receiving_account_source_of_fund, terminal_id, channel, offer_type,
        grab_fee_percent, points_multiplier, points_issued, settlement_id, transfer_date,
        amount, tax_on_order_value, restaurant_packaging_charge, non_member_fee, restaurant_service_charge,
        offer, discount_merchant_funded, delivery_fee_discount_merchant_funded,
        delivery_charge_grab_online_store, delivery_charge_merchant_delivery, grabexpress_delivery_service_fee,
        net_sales, net_mdr, tax_on_mdr, grab_fee, marketing_success_fee,
        delivery_commission, channel_commission, order_commission, step_up_commission,
        grabkitchen_commission, grabkitchen_other_commission, withholding_tax, total,
        tax_on_mdr_percent, delivery_commission_percent, channel_commission_percent, order_commission_percent,
        tax_on_grabfood_grabmart_commission_adjustments_ads, tax_on_total_grabkitchen_commission,
        cancellation_reason, cancelled_by, reason_for_refund, description,
        incident_group, incident_alias, customer_refund_item, appeal_link, appeal_status,
        package_voucher_used, attributed_service_fee, attributed_promo, raw_metadata
    )
    SELECT
        CASE 
            WHEN raw."Created On" IS NOT NULL AND raw."Created On" <> ''
            THEN TO_CHAR(TO_TIMESTAMP(TRIM(raw."Created On"), 'DD Mon YYYY HH12:MI PM'), 'YYYY-MM')
            ELSE NULL 
        END AS month,
        TRIM(raw."Merchant Name"),
        TRIM(raw."Merchant ID"),
        COALESCE(m.branch_name, TRIM(raw."Store Name")),
        TRIM(raw."Store ID"),
        CASE 
            WHEN raw."Updated On" IS NOT NULL AND raw."Updated On" <> ''
            THEN TO_CHAR(TO_TIMESTAMP(TRIM(raw."Updated On"), 'DD Mon YYYY HH12:MI PM'), 'YYYY-MM-DD "at" HH24:MI')
            ELSE NULL 
        END AS updated_on,
        CASE 
            WHEN raw."Created On" IS NOT NULL AND raw."Created On" <> ''
            THEN TO_CHAR(TO_TIMESTAMP(TRIM(raw."Created On"), 'DD Mon YYYY HH12:MI PM'), 'YYYY-MM-DD "at" HH24:MI')
            ELSE NULL 
        END AS created_on,
        TRIM(raw."Type"),
        TRIM(raw."Category"),
        TRIM(raw."Subcategory"),
        TRIM(raw."Status"),
        TRIM(raw."Transaction ID"),
        TRIM(raw."Linked Transaction ID"),
        TRIM(raw."Partner transaction ID 1"),
        TRIM(raw."Partner transaction ID 2"),
        TRIM(raw."Long Order ID"),
        TRIM(raw."Short Order ID"),
        TRIM(raw."Booking ID"),
        TRIM(raw."Order Channel"),
        TRIM(raw."Order Type"),
        TRIM(raw."Payment Method"),
        TRIM(raw."Receiving account / Source of fund"),
        TRIM(raw."Terminal ID"),
        TRIM(raw."Channel"),
        TRIM(raw."Offer Type"),
        CAST(NULLIF(TRIM(raw."Grab Fee (%)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Points Multiplier"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Points Issued"), '') AS NUMERIC(15,2)),
        TRIM(raw."Settlement ID"),
        CASE 
            WHEN raw."Transfer Date" IS NOT NULL AND raw."Transfer Date" <> ''
            THEN TO_CHAR(TO_TIMESTAMP(TRIM(raw."Transfer Date"), 'DD Mon YYYY HH12:MI PM'), 'YYYY-MM-DD "at" HH24:MI')
            ELSE NULL 
        END AS transfer_date,
        CAST(NULLIF(TRIM(raw."Amount"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Tax on Order Value"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Restaurant Packaging Charge"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Non-Member Fee"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Restaurant Service Charge"), '') AS NUMERIC(15,2)),
        TRIM(raw."Offer"),
        CAST(NULLIF(TRIM(raw."Discount (Merchant-Funded)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Delivery Fee Discount (Merchant-Funded)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Delivery Charge (Grab Online Store)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Delivery Charge (Merchant Delivery)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."GrabExpress Delivery Service Fee"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Net Sales"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Net MDR"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Tax on MDR"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Grab Fee"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Marketing success fee"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Delivery Commission"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Channel Commission"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Order commission"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Step-up commission"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."GrabKitchen Commission"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."GrabKitchen Other Commission"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Withholding Tax"), '') AS NUMERIC(15,2)),
        (CAST(COALESCE(NULLIF(TRIM(raw."Total"), ''), '0') AS NUMERIC(15,2)) + COALESCE(cb.total_chargeback, 0)) AS total,
        CAST(NULLIF(TRIM(raw."Tax on MDR (%)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Delivery Commission (%)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Channel Commission (%)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Order Commission (%)"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Tax on GrabFood/GrabMart commission, adjustments, ads"), '') AS NUMERIC(15,2)),
        CAST(NULLIF(TRIM(raw."Tax on Total GrabKitchen Commission"), '') AS NUMERIC(15,2)),
        TRIM(raw."Cancellation Reason"),
        TRIM(raw."Cancelled by"),
        TRIM(raw."Reason for Refund"),
        TRIM(raw."Description"),
        TRIM(raw."Incident group"),
        TRIM(raw."Incident alias"),
        TRIM(raw."Customer refund Item"),
        TRIM(raw."Appeal link"),
        TRIM(raw."Appeal status"),
        NULL::TEXT AS package_voucher_used,
        NULL::TEXT AS attributed_service_fee,
        NULL::TEXT AS attributed_promo,
        to_jsonb(raw) AS raw_metadata
    FROM layer1_raw.raw_grab raw
    LEFT JOIN public.dim_merchants m ON TRIM(raw."Store ID") = m.store_id
    LEFT JOIN grab_chargebacks cb ON raw."Long Order ID" = cb.long_order_id
    WHERE (raw."Order Type" <> 'Auto-Chargeback' OR raw."Order Type" IS NULL)
      AND raw."Created On" IS NOT NULL AND raw."Created On" <> '';
    """
    
    # 2. GoFood Normalization Query
    gofood_query = """
    INSERT INTO layer2_clean.stg_go_orders (
        period_id,
        month,
        date,
        store_name,
        store_id,
        gross_sales,
        commission_fee,
        marketing_fee_and_discount,
        total_platform_deduction,
        net_sales,
        average_order_customer,
        completed_order,
        cancelled_order,
        total_order
    )
    SELECT
        TRIM(raw."Tanggal") || ':' || TRIM(raw."Store ID") AS period_id,
        TO_CHAR(CAST(TRIM(raw."Tanggal") AS DATE), 'YYYY-MM') AS month,
        CAST(TRIM(raw."Tanggal") AS DATE) AS date,
        COALESCE(m.branch_name, TRIM(raw."Store Name")) AS store_name,
        TRIM(raw."Store ID") AS store_id,
        CAST(COALESCE(NULLIF(TRIM(raw."Penjualan Kotor"), ''), '0') AS NUMERIC(15,2)) AS gross_sales,
        CAST(COALESCE(NULLIF(TRIM(raw."Biaya Komisi"), ''), '0') AS NUMERIC(15,2)) AS commission_fee,
        CAST(COALESCE(NULLIF(TRIM(raw."Pengeluaran Iklan & Diskon"), ''), '0') AS NUMERIC(15,2)) AS marketing_fee_and_discount,
        (CAST(COALESCE(NULLIF(TRIM(raw."Biaya Komisi"), ''), '0') AS NUMERIC(15,2)) + 
         CAST(COALESCE(NULLIF(TRIM(raw."Pengeluaran Iklan & Diskon"), ''), '0') AS NUMERIC(15,2))) AS total_platform_deduction,
        (CAST(COALESCE(NULLIF(TRIM(raw."Penjualan Kotor"), ''), '0') AS NUMERIC(15,2)) - 
         (CAST(COALESCE(NULLIF(TRIM(raw."Biaya Komisi"), ''), '0') AS NUMERIC(15,2)) + 
          CAST(COALESCE(NULLIF(TRIM(raw."Pengeluaran Iklan & Diskon"), ''), '0') AS NUMERIC(15,2)))) AS net_sales,
        CASE 
            WHEN CAST(COALESCE(NULLIF(TRIM(raw."Order Sukses"), ''), '0') AS NUMERIC(15,2)) > 0 
            THEN CAST(COALESCE(NULLIF(TRIM(raw."Penjualan Kotor"), ''), '0') AS NUMERIC(15,2)) / CAST(COALESCE(NULLIF(TRIM(raw."Order Sukses"), ''), '0') AS NUMERIC(15,2))
            ELSE 0.00
        END AS average_order_customer,
        CAST(COALESCE(NULLIF(TRIM(raw."Order Sukses"), ''), '0') AS NUMERIC(15,2)) AS completed_order,
        CAST(COALESCE(NULLIF(TRIM(raw."Order Batal"), ''), '0') AS NUMERIC(15,2)) AS cancelled_order,
        (CAST(COALESCE(NULLIF(TRIM(raw."Order Sukses"), ''), '0') AS NUMERIC(15,2)) + 
         CAST(COALESCE(NULLIF(TRIM(raw."Order Batal"), ''), '0') AS NUMERIC(15,2))) AS total_order
    FROM layer1_raw.raw_go raw
    LEFT JOIN public.dim_merchants m ON TRIM(raw."Store ID") = m.store_id
    WHERE raw."Tanggal" IS NOT NULL AND raw."Tanggal" <> ''
    ON CONFLICT (period_id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        gross_sales = EXCLUDED.gross_sales,
        commission_fee = EXCLUDED.commission_fee,
        marketing_fee_and_discount = EXCLUDED.marketing_fee_and_discount,
        total_platform_deduction = EXCLUDED.total_platform_deduction,
        net_sales = EXCLUDED.net_sales,
        average_order_customer = EXCLUDED.average_order_customer,
        completed_order = EXCLUDED.completed_order,
        cancelled_order = EXCLUDED.cancelled_order,
        total_order = EXCLUDED.total_order,
        date = EXCLUDED.date,
        ingested_at = CURRENT_TIMESTAMP;
    """
    
    # 3. ShopeeFood Normalization Query
    shopee_query = """
    TRUNCATE TABLE layer2_clean.stg_shopee_orders;

    INSERT INTO layer2_clean.stg_shopee_orders (
        month,
        store_id,
        store_name,
        transaction_type,
        order_id,
        complete_time,
        status,
        food_original_price,
        item_discounts,
        flash_sale_discount,
        surcharge_fee,
        merchant_voucher_deals_subsidy,
        platform_flash_sale_subsidy,
        food_voucher_subsidy,
        food_direct_discount,
        transaction_amount,
        checkout_murah_price,
        notes,
        net_sales,
        commission,
        revenue,
        raw_metadata
    )
    SELECT
        CASE 
            WHEN raw."Complete Time" IS NOT NULL AND raw."Complete Time" <> ''
            THEN TO_CHAR(TO_TIMESTAMP(TRIM(raw."Complete Time"), 'DD Mon YYYY HH24:MI'), 'YYYY-MM')
            ELSE NULL 
        END AS month,
        TRIM(raw."Store ID") AS store_id,
        COALESCE(m.branch_name, TRIM(raw."Store name")) AS store_name,
        TRIM(raw."Transaction type") AS transaction_type,
        TRIM(raw."Transaction ID (Order ID)") AS order_id,
        CASE 
            WHEN raw."Complete Time" IS NOT NULL AND raw."Complete Time" <> ''
            THEN TO_CHAR(TO_TIMESTAMP(TRIM(raw."Complete Time"), 'DD Mon YYYY HH24:MI'), 'YYYY-MM-DD "at" HH24:MI')
            ELSE NULL 
        END AS complete_time,
        TRIM(raw."Status") AS status,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Food original price"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS food_original_price,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Item discounts"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS item_discounts,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Flash sale discount"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS flash_sale_discount,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Surcharge fee"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS surcharge_fee,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Merchant Voucher Deals Subsidy"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS merchant_voucher_deals_subsidy,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Platform Flash Sale Subsidy"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS platform_flash_sale_subsidy,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Food Voucher Subsidy"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS food_voucher_subsidy,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Food Direct Discount"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS food_direct_discount,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Transaction amount"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS transaction_amount,
        CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Checkout Murah Price"), '.', ''), ''), '0') AS NUMERIC(15,2)) AS checkout_murah_price,
        TRIM(raw."Notes") AS notes,
        (CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Food original price"), '.', ''), ''), '0') AS NUMERIC(15,2)) - 
         CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Item discounts"), '.', ''), ''), '0') AS NUMERIC(15,2)) -
         CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Flash sale discount"), '.', ''), ''), '0') AS NUMERIC(15,2))) AS net_sales,
        (CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Transaction amount"), '.', ''), ''), '0') AS NUMERIC(15,2)) * 0.25) AS commission,
        (CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Transaction amount"), '.', ''), ''), '0') AS NUMERIC(15,2)) - 
         (CAST(COALESCE(NULLIF(REPLACE(TRIM(raw."Transaction amount"), '.', ''), ''), '0') AS NUMERIC(15,2)) * 0.25)) AS revenue,
        to_jsonb(raw) AS raw_metadata
    FROM layer1_raw.raw_shopee raw
    LEFT JOIN public.dim_merchants m ON TRIM(raw."Store ID") = m.store_id
    WHERE raw."Complete Time" IS NOT NULL AND raw."Complete Time" <> '' AND raw."Transaction ID (Order ID)" IS NOT NULL AND raw."Transaction ID (Order ID)" <> '';
    """
    
    with db.engine.begin() as conn:
        print("[DB] Normalizing GrabFood data to layer2_clean.stg_grab_orders...")
        conn.execute(text(grab_query))
        
        print("[DB] Normalizing GoFood data to layer2_clean.stg_go_orders...")
        conn.execute(text("TRUNCATE TABLE layer2_clean.stg_go_orders;"))  # Truncate first to be clean
        conn.execute(text(gofood_query))
        
        print("[DB] Normalizing ShopeeFood data to layer2_clean.stg_shopee_orders...")
        conn.execute(text(shopee_query))
        
        print("[DB] Refreshing public.fact_transactions (Unified Master Table)...")
        conn.execute(text("SELECT refresh_fact_transactions();"))
        
    print("\n[DB] Querying verification counts...")
    with db.engine.connect() as conn:
        grab_cnt = conn.execute(text("SELECT COUNT(*) FROM layer2_clean.stg_grab_orders")).scalar()
        go_cnt = conn.execute(text("SELECT COUNT(*) FROM layer2_clean.stg_go_orders")).scalar()
        shopee_cnt = conn.execute(text("SELECT COUNT(*) FROM layer2_clean.stg_shopee_orders")).scalar()
        fact_cnt = conn.execute(text("SELECT COUNT(*) FROM public.fact_transactions")).scalar()
        print(f"  [VERIFY] stg_grab_orders row count: {grab_cnt}")
        print(f"  [VERIFY] stg_go_orders row count: {go_cnt}")
        print(f"  [VERIFY] stg_shopee_orders row count: {shopee_cnt}")
        print(f"  [VERIFY] public.fact_transactions row count: {fact_cnt}")
        
    print("=" * 60)
    print("   NORMALIZATION & MASTER REFRESH COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    normalize_all()
