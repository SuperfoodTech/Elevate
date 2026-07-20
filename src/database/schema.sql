-- Superfood Reporting System (SRS) Schema

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
