-- 1. Master Merchant Table (Dimension)
CREATE TABLE IF NOT EXISTS dim_merchants (
    store_id TEXT PRIMARY KEY,
    platform TEXT, -- GrabFood, ShopeeFood, GoFood
    outlet_name TEXT,
    branch_name TEXT,
    group_code TEXT,
    owner_name TEXT,
    merchant_id TEXT,
    merchant_name TEXT,
    username TEXT,
    status TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staging Grab Orders (Raw Data Lake)
CREATE TABLE IF NOT EXISTS layer2_clean.stg_grab_orders (
    id SERIAL PRIMARY KEY,
    month TEXT,
    merchant_name TEXT,
    merchant_id TEXT,
    store_name TEXT,
    store_id TEXT,
    updated_on TEXT,
    created_on TEXT,
    type TEXT,
    category TEXT,
    subcategory TEXT,
    status TEXT,
    transaction_id TEXT,
    linked_transaction_id TEXT,
    partner_transaction_id_1 TEXT,
    partner_transaction_id_2 TEXT,
    long_order_id TEXT,
    short_order_id TEXT,
    booking_id TEXT,
    order_channel TEXT,
    order_type TEXT,
    payment_method TEXT,
    receiving_account_source_of_fund TEXT,
    terminal_id TEXT,
    channel TEXT,
    offer_type TEXT,
    grab_fee_percent NUMERIC(15,2),
    points_multiplier NUMERIC(15,2),
    points_issued NUMERIC(15,2),
    settlement_id TEXT,
    transfer_date TEXT,
    amount NUMERIC(15,2),
    tax_on_order_value NUMERIC(15,2),
    restaurant_packaging_charge NUMERIC(15,2),
    non_member_fee NUMERIC(15,2),
    restaurant_service_charge NUMERIC(15,2),
    offer TEXT,
    discount_merchant_funded NUMERIC(15,2),
    delivery_fee_discount_merchant_funded NUMERIC(15,2),
    delivery_charge_grab_online_store NUMERIC(15,2),
    delivery_charge_merchant_delivery NUMERIC(15,2),
    grabexpress_delivery_service_fee NUMERIC(15,2),
    net_sales NUMERIC(15,2),
    net_mdr NUMERIC(15,2),
    tax_on_mdr NUMERIC(15,2),
    grab_fee NUMERIC(15,2),
    marketing_success_fee NUMERIC(15,2),
    delivery_commission NUMERIC(15,2),
    channel_commission NUMERIC(15,2),
    order_commission NUMERIC(15,2),
    step_up_commission NUMERIC(15,2),
    grabkitchen_commission NUMERIC(15,2),
    grabkitchen_other_commission NUMERIC(15,2),
    withholding_tax NUMERIC(15,2),
    total NUMERIC(15,2),
    tax_on_mdr_percent NUMERIC(15,2),
    delivery_commission_percent NUMERIC(15,2),
    channel_commission_percent NUMERIC(15,2),
    order_commission_percent NUMERIC(15,2),
    tax_on_grabfood_grabmart_commission_adjustments_ads NUMERIC(15,2),
    tax_on_total_grabkitchen_commission NUMERIC(15,2),
    cancellation_reason TEXT,
    cancelled_by TEXT,
    reason_for_refund TEXT,
    description TEXT,
    incident_group TEXT,
    incident_alias TEXT,
    customer_refund_item TEXT,
    appeal_link TEXT,
    appeal_status TEXT,
    package_voucher_used TEXT,
    attributed_service_fee TEXT,
    attributed_promo TEXT,
    raw_metadata JSONB,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Staging Shopee Orders (Raw Data Lake)
CREATE TABLE IF NOT EXISTS layer2_clean.stg_shopee_orders (
    id SERIAL PRIMARY KEY,
    month TEXT,
    store_id TEXT,
    store_name TEXT,
    transaction_type TEXT,
    order_id TEXT UNIQUE,
    complete_time TEXT,
    status TEXT,
    food_original_price NUMERIC(15,2),
    item_discounts NUMERIC(15,2),
    flash_sale_discount NUMERIC(15,2),
    surcharge_fee NUMERIC(15,2),
    merchant_voucher_deals_subsidy NUMERIC(15,2),
    platform_flash_sale_subsidy NUMERIC(15,2),
    food_voucher_subsidy NUMERIC(15,2),
    food_direct_discount NUMERIC(15,2),
    transaction_amount NUMERIC(15,2),
    checkout_murah_price NUMERIC(15,2),
    notes TEXT,
    net_sales NUMERIC(15,2),
    commission NUMERIC(15,2),
    revenue NUMERIC(15,2),
    raw_metadata JSONB,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Staging GoFood Orders (Raw Data Lake - Audit Go AU)
CREATE TABLE IF NOT EXISTS layer2_clean.stg_go_orders (
    id SERIAL PRIMARY KEY,
    period_id TEXT UNIQUE,
    month TEXT,
    date DATE,
    store_name TEXT,
    store_id TEXT,
    gross_sales NUMERIC(15,2),
    commission_fee NUMERIC(15,2),
    marketing_fee_and_discount NUMERIC(15,2),
    total_platform_deduction NUMERIC(15,2),
    net_sales NUMERIC(15,2),
    average_order_customer NUMERIC(15,2),
    completed_order NUMERIC(15,2),
    cancelled_order NUMERIC(15,2),
    total_order NUMERIC(15,2),
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Unified Master Table (Tabel Gajah)
CREATE TABLE IF NOT EXISTS fact_transactions (
    id SERIAL PRIMARY KEY,
    order_id_duplicate INTEGER DEFAULT 1,
    year INTEGER,
    month TEXT,
    week TEXT,
    transaction_date DATE,
    hour INTEGER,
    platform VARCHAR(20) NOT NULL, -- 'GrabFood', 'ShopeeFood', or 'GoFood'
    merchant_id TEXT,              -- Maps to store_id in dim_merchants
    group_code TEXT,
    outlet_name TEXT,
    branch_name TEXT,
    store_name TEXT,
    created_on TIMESTAMP,
    status TEXT,
    is_success INTEGER DEFAULT 0,
    is_cancelled INTEGER DEFAULT 0,
    external_id TEXT NOT NULL,     -- Period ID / Long Order ID / Order ID
    gross_amount NUMERIC(15,2),    
    discounts NUMERIC(15,2),       
    delivery_discount NUMERIC(15,2), 
    net_sales NUMERIC(15,2),
    marketing_fee NUMERIC(15,2),
    commission NUMERIC(15,2),   
    ofd_fees NUMERIC(15,2),
    revenue NUMERIC(15,2),         -- Total Payout (adjusted for refund)
    context TEXT,                  -- E.g. 'Refund Adjusted'
    gmv_vs_ofd_commission TEXT,    
    gmv_vs_ofd_fees TEXT,
    gmv_vs_revenue TEXT,
    raw_record_id INTEGER,         -- Reference to stg table ID
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_date ON fact_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fact_platform ON fact_transactions(platform);
CREATE INDEX IF NOT EXISTS idx_fact_group ON fact_transactions(group_code);

-- Stored Function for ETL Normalization
CREATE OR REPLACE FUNCTION refresh_fact_transactions()
RETURNS void AS $$
BEGIN
    -- 1. PROSES DATA GRABFOOD
    INSERT INTO public.fact_transactions (
        platform, external_id, transaction_date, created_on, year, month, week, hour,
        merchant_id, group_code, outlet_name, branch_name, store_name, status,
        is_success, is_cancelled,
        gross_amount, discounts, delivery_discount, net_sales, 
        marketing_fee, commission, ofd_fees, revenue,
        context, raw_record_id
    )
    WITH grab_ranked AS (
        SELECT 
            stg.*,
            ROW_NUMBER() OVER(
                PARTITION BY stg.long_order_id 
                ORDER BY CASE WHEN stg.order_type = 'Auto-Paid' THEN 1 ELSE 2 END, stg.id DESC
            ) as rn
        FROM layer2_clean.stg_grab_orders stg
        WHERE stg.long_order_id IS NOT NULL 
          AND stg.long_order_id <> ''
    )
    SELECT 
        'GrabFood', 
        stg.long_order_id, 
        TO_DATE(SUBSTRING(stg.created_on FROM 1 FOR 10), 'YYYY-MM-DD'),
        TO_TIMESTAMP(stg.created_on, 'YYYY-MM-DD "at" HH24:MI'),
        EXTRACT(YEAR FROM TO_TIMESTAMP(stg.created_on, 'YYYY-MM-DD "at" HH24:MI'))::INTEGER,
        stg.month,
        TO_CHAR(TO_TIMESTAMP(stg.created_on, 'YYYY-MM-DD "at" HH24:MI'), 'YY-MM-') || 'W' || TO_CHAR(TO_TIMESTAMP(stg.created_on, 'YYYY-MM-DD "at" HH24:MI'), 'W'),
        EXTRACT(HOUR FROM TO_TIMESTAMP(stg.created_on, 'YYYY-MM-DD "at" HH24:MI'))::INTEGER,
        stg.store_id,
        COALESCE(m.group_code, 'UNKNOWN'),
        COALESCE(m.outlet_name, stg.merchant_name),
        COALESCE(m.branch_name, 'UNKNOWN'),
        stg.store_name,
        stg.status,
        CASE WHEN LOWER(stg.status) IN ('transferred', 'ditransfer', 'success', 'sukses') THEN 1 ELSE 0 END,
        CASE WHEN LOWER(stg.status) IN ('cancelled', 'dibatalkan', 'batal') THEN 1 ELSE 0 END,
        stg.amount, 
        stg.discount_merchant_funded, 
        stg.delivery_fee_discount_merchant_funded,
        stg.net_sales,
        stg.marketing_success_fee,
        stg.order_commission,
        ABS(COALESCE(stg.order_commission, 0) + COALESCE(stg.marketing_success_fee, 0)) as ofd_fees,
        stg.total,
        CASE WHEN stg.total <> stg.amount THEN 'Refund Adjusted' ELSE NULL END,
        stg.id
    FROM grab_ranked stg
    LEFT JOIN public.dim_merchants m ON stg.store_id = m.store_id
    WHERE stg.rn = 1
    ON CONFLICT (platform, external_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        is_success = EXCLUDED.is_success,
        is_cancelled = EXCLUDED.is_cancelled,
        revenue = EXCLUDED.revenue,
        context = EXCLUDED.context,
        updated_at = CURRENT_TIMESTAMP;

    -- 2. PROSES DATA SHOPEEFOOD (Transaksi Satuan)
    INSERT INTO public.fact_transactions (
        platform, external_id, transaction_date, created_on, year, month, week, hour,
        merchant_id, group_code, outlet_name, branch_name, store_name, status,
        is_success, is_cancelled,
        gross_amount, discounts, delivery_discount, net_sales, 
        commission, ofd_fees, revenue,
        raw_record_id
    )
    SELECT 
        'ShopeeFood', 
        stg.order_id, 
        TO_DATE(SUBSTRING(stg.complete_time FROM 1 FOR 10), 'YYYY-MM-DD'),
        TO_TIMESTAMP(stg.complete_time, 'YYYY-MM-DD "at" HH24:MI'),
        EXTRACT(YEAR FROM TO_TIMESTAMP(stg.complete_time, 'YYYY-MM-DD "at" HH24:MI'))::INTEGER,
        stg.month,
        TO_CHAR(TO_TIMESTAMP(stg.complete_time, 'YYYY-MM-DD "at" HH24:MI'), 'YY-MM-') || 'W' || TO_CHAR(TO_TIMESTAMP(stg.complete_time, 'YYYY-MM-DD "at" HH24:MI'), 'W'),
        EXTRACT(HOUR FROM TO_TIMESTAMP(stg.complete_time, 'YYYY-MM-DD "at" HH24:MI'))::INTEGER,
        stg.store_id,
        COALESCE(m.group_code, 'UNKNOWN'),
        COALESCE(m.outlet_name, stg.store_name),
        COALESCE(m.branch_name, 'UNKNOWN'),
        stg.store_name,
        stg.status,
        CASE WHEN LOWER(stg.status) IN ('selesai', 'success', 'sukses') THEN 1 ELSE 0 END,
        CASE WHEN LOWER(stg.status) IN ('batal', 'dibatalkan', 'cancelled') THEN 1 ELSE 0 END,
        stg.food_original_price, 
        (COALESCE(stg.item_discounts, 0) + COALESCE(stg.flash_sale_discount, 0) + COALESCE(stg.merchant_voucher_deals_subsidy, 0) + COALESCE(stg.food_voucher_subsidy, 0)) as total_discounts,
        0.00,
        stg.net_sales,
        stg.commission,
        stg.commission,
        stg.revenue,
        stg.id
    FROM layer2_clean.stg_shopee_orders stg
    LEFT JOIN public.dim_merchants m ON stg.store_id = m.store_id
    WHERE stg.order_id IS NOT NULL 
      AND stg.order_id <> ''
    ON CONFLICT (platform, external_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        is_success = EXCLUDED.is_success,
        is_cancelled = EXCLUDED.is_cancelled,
        revenue = EXCLUDED.revenue,
        updated_at = CURRENT_TIMESTAMP;

    -- 3. PROSES DATA GOFOOD (Agregat / Audit Go AU)
    INSERT INTO public.fact_transactions (
        platform, external_id, transaction_date, created_on, year, month, week, hour,
        merchant_id, group_code, outlet_name, branch_name, store_name, status,
        is_success, is_cancelled,
        gross_amount, discounts, delivery_discount, net_sales,
        marketing_fee, commission, ofd_fees, revenue,
        raw_record_id
    )
    SELECT 
        'GoFood', 
        stg.period_id, 
        stg.date,
        stg.date::TIMESTAMP,
        EXTRACT(YEAR FROM stg.date)::INTEGER,
        stg.month,
        TO_CHAR(stg.date, 'YY-MM-"W"W'),
        0::INTEGER,
        stg.store_id,
        COALESCE(m.group_code, 'UNKNOWN'),
        COALESCE(m.outlet_name, stg.store_name),
        COALESCE(m.branch_name, 'UNKNOWN'),
        stg.store_name,
        'Sukses',
        COALESCE(stg.completed_order, 0)::INTEGER,
        COALESCE(stg.cancelled_order, 0)::INTEGER,
        stg.gross_sales,
        0.00,
        0.00,
        stg.net_sales,
        stg.marketing_fee_and_discount,
        stg.commission_fee,
        stg.total_platform_deduction,
        stg.net_sales,
        stg.id
    FROM layer2_clean.stg_go_orders stg
    LEFT JOIN public.dim_merchants m ON stg.store_id = m.store_id
    WHERE stg.period_id IS NOT NULL 
      AND stg.period_id <> ''
    ON CONFLICT (platform, external_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        is_success = EXCLUDED.is_success,
        is_cancelled = EXCLUDED.is_cancelled,
        gross_amount = EXCLUDED.gross_amount,
        net_sales = EXCLUDED.net_sales,
        commission = EXCLUDED.commission,
        ofd_fees = EXCLUDED.ofd_fees,
        revenue = EXCLUDED.revenue,
        updated_at = CURRENT_TIMESTAMP;

    -- 4. HITUNG PERSENTASE GMV
    UPDATE public.fact_transactions
    SET 
        gmv_vs_ofd_commission = CASE WHEN net_sales <> 0 THEN ROUND((commission / net_sales * 100), 2) || '%' ELSE '0%' END,
        gmv_vs_ofd_fees = CASE WHEN net_sales <> 0 THEN ROUND((ofd_fees / net_sales * 100), 2) || '%' ELSE '0%' END,
        gmv_vs_revenue = CASE WHEN net_sales <> 0 THEN ROUND((revenue / net_sales * 100), 2) || '%' ELSE '0%' END
    WHERE updated_at >= (CURRENT_TIMESTAMP - INTERVAL '1 hour');

END;
$$ LANGUAGE plpgsql;
