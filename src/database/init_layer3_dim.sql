-- Create dedicated schema for Layer 3 Dimensions
CREATE SCHEMA IF NOT EXISTS layer3_dim;

-- 1. Merchant Credentials & Access Table (Accommodates Vercel Sheet + Credential Sheet 100%)
CREATE TABLE IF NOT EXISTS layer3_dim.dim_merchant_credentials (
    store_id TEXT PRIMARY KEY,
    platform TEXT,                         -- Aplikasi (GoFood / GrabFood / ShopeeFood)
    owner_name TEXT,                       -- Nama Pemilik / Owner
    merchant_id TEXT,
    merchant_name TEXT,                    -- Merchant Name (Identitas switch merchant jika multi-store)
    
    -- Mitra & GoFood / Grab Access (Vercel Sheet D-H)
    nama_akses_mitra TEXT,                 -- Nama Akses
    email_mitra TEXT,                      -- Email Mitra
    email_login_go_1 TEXT,                 -- Email FoodMaster1 (GoFood)
    email_login_go_2 TEXT,                 -- Email FoodMaster2 (GoFood)
    username_mitra_orig TEXT,              -- Nama Pengguna (GoFood/Grab)
    password_mitra_orig TEXT,              -- Kata Sandi (GoFood/Grab)
    hp_mitra TEXT,                         -- S Nomor HP Akses Pemilik
    peran_mitra TEXT,

    -- Shopee Access Credentials (Vercel Sheet J-N)
    shopee_username_pemilik TEXT,          -- S Username Akses Pemilik (Akuisisi Pertama Kali)
    shopee_password_pemilik TEXT,          -- S Kata Sandi Akses Pemilik (Akuisisi Pertama Kali)
    shopee_username_staff TEXT,            -- S Username Akses Staff
    shopee_password_staff TEXT,            -- S Kata Sandi Akses Staff

    -- SuperFood Access Credentials (Credential Sheet AA-AD)
    nama_akses_superfood TEXT,
    username_superfood TEXT,               -- Nama Pengguna SuperFood
    hp_superfood TEXT,                     -- Nomor HP allvbadmin
    password_superfood TEXT,               -- Kata Sandi SuperFood
    peran_superfood TEXT,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Merchant Mapping & Operational Metadata Table
CREATE TABLE IF NOT EXISTS layer3_dim.dim_merchant_mapping (
    store_id TEXT PRIMARY KEY,
    platform TEXT,                         -- Aplikasi
    owner_name TEXT,                       -- Owner
    outlet_name TEXT,                      -- Nama Outlet
    brand TEXT,                            -- Brand
    nama_resto_final TEXT,                 -- Nama Resto Final (Baku OFD)
    rekomendasi_nama_resto TEXT,           -- Rekomendasi Nama Resto
    nama_tarikan TEXT,                     -- Nama Tarikan (Scrape Mentah)
    nama_resto_sebelumnya TEXT,
    shopee_short_name_final TEXT,
    shopee_short_name_sebelumnya TEXT,
    portal TEXT,                           -- Portal (Portal Shopee/Go/Grab)
    s_short_name TEXT,
    gr_name TEXT,
    group_code TEXT,                       -- Group Code
    bd_pic TEXT,                           -- BD PIC (Routing Chrome Profile di Server Per BD)
    live_date TEXT,
    status TEXT,                           -- Status ('Live' / 'Never' / 'Churn')
    churn_date TEXT,
    billing_cycle TEXT,
    pic TEXT,
    fee TEXT,
    wag TEXT,
    grade TEXT,
    priority TEXT,
    notes TEXT,
    last_update TEXT,
    mapping_status TEXT DEFAULT 'PENDING_REVIEW', -- 'MAPPED' or 'PENDING_REVIEW'
    mapped_by TEXT DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Portal & Virtual Brand Access Reference Table (Reference Sheet: Portal, OTP, Role, BD Routing)
CREATE TABLE IF NOT EXISTS layer3_dim.dim_portal_credentials (
    portal_id SERIAL PRIMARY KEY,
    portal_code TEXT NOT NULL,             -- Portal ('F', 'W', 'L', 'D', 'All', 'Grab 1', etc.)
    role TEXT,                             -- Role ('Owner', 'Staff')
    phone_number TEXT,                     -- Phone for OTP WA/SMS ('6285183151531')
    username TEXT NOT NULL,                -- Username login ('superfoodapp')
    password TEXT NOT NULL,                -- Password login ('Master@00@')
    notes TEXT,                            -- Notes ('VB + Agency All')
    otp_method TEXT,                       -- OTP Method ('WA', 'SMS')
    bd_pic TEXT,                           -- BD PIC
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Platform / Application Dimension Table
CREATE TABLE IF NOT EXISTS layer3_dim.dim_platform (
    platform_code TEXT PRIMARY KEY,   -- 'GRAB', 'SHOPEE', 'GOFOOD'
    platform_name TEXT NOT NULL,       -- 'GrabFood', 'ShopeeFood', 'GoFood'
    company_name TEXT,                 -- 'Grab Holdings', 'Shopee / Sea', 'GoTo'
    color_hex TEXT NOT NULL,           -- '#00B14F', '#EE4D2D', '#00AA13'
    default_commission_rate NUMERIC(5,4), -- 0.2000, 0.2500, 0.2000
    settlement_type TEXT DEFAULT 'Daily'
);

-- Seed dim_platform
INSERT INTO layer3_dim.dim_platform (platform_code, platform_name, company_name, color_hex, default_commission_rate, settlement_type)
VALUES 
    ('GRAB', 'GrabFood', 'Grab Holdings Ltd', '#00B14F', 0.2000, 'Daily'),
    ('SHOPEE', 'ShopeeFood', 'Shopee / Sea Group', '#EE4D2D', 0.2500, 'Daily'),
    ('GOFOOD', 'GoFood', 'GoTo / Gojek', '#00AA13', 0.2000, 'Weekly')
ON CONFLICT (platform_code) DO UPDATE SET
    platform_name = EXCLUDED.platform_name,
    color_hex = EXCLUDED.color_hex,
    default_commission_rate = EXCLUDED.default_commission_rate;

-- 5. Date Dimension Table
CREATE TABLE IF NOT EXISTS layer3_dim.dim_date (
    date_key INTEGER PRIMARY KEY,      -- e.g. 20260728
    full_date DATE UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    quarter_name TEXT NOT NULL,        -- 'Q1', 'Q2', etc.
    month_number INTEGER NOT NULL,
    month_name_id TEXT NOT NULL,       -- 'Januari', 'Februari', etc.
    month_name_en TEXT NOT NULL,       -- 'January', 'February', etc.
    week_of_year INTEGER NOT NULL,
    day_of_month INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,      -- 1=Senin, 7=Minggu
    day_name_id TEXT NOT NULL,         -- 'Senin', 'Selasa', etc.
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN DEFAULT FALSE
);

-- 6. Daily Merchant Performance Aggregate Fact Table
CREATE TABLE IF NOT EXISTS layer3_dim.fact_daily_merchant_performance (
    performance_id SERIAL PRIMARY KEY,
    date_key INTEGER REFERENCES layer3_dim.dim_date(date_key),
    transaction_date DATE NOT NULL,
    store_id TEXT REFERENCES layer3_dim.dim_merchant_mapping(store_id),
    platform TEXT NOT NULL,
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    total_gross_sales NUMERIC(15,2) DEFAULT 0.00,
    total_discounts NUMERIC(15,2) DEFAULT 0.00,
    total_net_sales NUMERIC(15,2) DEFAULT 0.00,
    total_commission NUMERIC(15,2) DEFAULT 0.00,
    total_ofd_fees NUMERIC(15,2) DEFAULT 0.00,
    total_net_payout NUMERIC(15,2) DEFAULT 0.00,
    aov NUMERIC(15,2) DEFAULT 0.00,    -- Average Order Value
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_date, store_id, platform)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mapping_platform ON layer3_dim.dim_merchant_mapping(platform);
CREATE INDEX IF NOT EXISTS idx_mapping_status ON layer3_dim.dim_merchant_mapping(mapping_status);
CREATE INDEX IF NOT EXISTS idx_mapping_group ON layer3_dim.dim_merchant_mapping(group_code);
CREATE INDEX IF NOT EXISTS idx_daily_perf_date ON layer3_dim.fact_daily_merchant_performance(transaction_date);
CREATE INDEX IF NOT EXISTS idx_daily_perf_store ON layer3_dim.fact_daily_merchant_performance(store_id);
