-- Live View for BI Tools & Visualizations
DROP VIEW IF EXISTS layer3_dim.v_fact_transactions CASCADE;
CREATE OR REPLACE VIEW layer3_dim.v_fact_transactions AS
SELECT 
    ft.id AS transaction_id,
    ft.external_id AS order_id,
    ft.platform AS platform_name,
    -- Platform Info
    CASE 
        WHEN UPPER(ft.platform) LIKE '%GRAB%' THEN '#00B14F'
        WHEN UPPER(ft.platform) LIKE '%SHOPEE%' THEN '#EE4D2D'
        WHEN UPPER(ft.platform) LIKE '%GO%' THEN '#00AA13'
        ELSE '#888888'
    END AS platform_color,
    ft.transaction_date,
    CAST(TO_CHAR(ft.transaction_date, 'YYYYMMDD') AS INTEGER) AS date_key,
    EXTRACT(YEAR FROM ft.transaction_date)::INTEGER AS year,
    ft.month,
    ft.week,
    
    -- Merchant & Mapping Dimensions
    ft.merchant_id AS store_id,
    m.owner_name,
    COALESCE(m.outlet_name, ft.outlet_name) AS outlet_name,
    m.brand,
    COALESCE(m.nama_resto_final, ft.branch_name, 'PENDING_REVIEW') AS nama_resto_final,
    COALESCE(m.group_code, ft.group_code) AS group_code,
    m.bd_pic,
    COALESCE(m.status, 'Live') AS merchant_status,

    -- Transaction Metrics
    ft.status AS order_status,
    ft.is_success,
    ft.is_cancelled,
    ft.gross_amount,
    ft.discounts,
    ft.delivery_discount,
    ft.net_sales,
    ft.marketing_fee,
    ft.commission,
    ft.ofd_fees,
    ft.revenue AS net_payout,

    ft.context,
    ft.created_on,
    ft.updated_at
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_mapping m ON ft.merchant_id = m.store_id;

-- ============================================================================
-- 2. MATERIALIZED VIEW REKAP TAGIHAN HARIAN PER OWNER & OUTLET
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS layer3_dim.mv_rekap_tagihan_daily CASCADE;

CREATE MATERIALIZED VIEW layer3_dim.mv_rekap_tagihan_daily AS
SELECT 
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN') AS owner_name,
    COALESCE(m.outlet_name, c.merchant_name, ft.outlet_name, 'UNKNOWN') AS outlet_name,
    COALESCE(m.brand, 'UNKNOWN') AS brand,
    COALESCE(m.nama_resto_final, ft.branch_name, 'UNKNOWN') AS nama_resto_final,
    ft.merchant_id AS store_id,
    COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00) AS nominal_bagi_hasil_per_order,
    ft.transaction_date,
    SUM(CASE WHEN ft.is_success = 1 THEN ft.net_sales ELSE 0.00 END) AS pendapatan_kotor,
    SUM(CASE WHEN ft.is_success = 1 THEN ft.ofd_fees ELSE 0.00 END) AS potongan_ojol,
    SUM(CASE WHEN ft.is_success = 1 THEN ft.revenue ELSE 0.00 END) AS pendapatan_bersih,
    COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) AS total_order_sukses,
    COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) * COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00) AS total_bagi_hasil
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_credentials c ON ft.merchant_id = c.store_id
LEFT JOIN layer3_dim.dim_merchant_mapping m ON ft.merchant_id = m.store_id
WHERE UPPER(COALESCE(m.status, 'LIVE')) = 'LIVE'
GROUP BY 
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN'),
    COALESCE(m.outlet_name, c.merchant_name, ft.outlet_name, 'UNKNOWN'),
    COALESCE(m.brand, 'UNKNOWN'),
    COALESCE(m.nama_resto_final, ft.branch_name, 'UNKNOWN'),
    ft.merchant_id,
    COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00),
    ft.transaction_date;

-- Indeks Unik Pendukung Refresh Concurrent & Query Cepat
CREATE UNIQUE INDEX idx_mv_rekap_tagihan_daily ON layer3_dim.mv_rekap_tagihan_daily (owner_name, store_id, transaction_date);
CREATE INDEX idx_mv_rekap_tagihan_owner ON layer3_dim.mv_rekap_tagihan_daily (owner_name);
CREATE INDEX idx_mv_rekap_tagihan_date ON layer3_dim.mv_rekap_tagihan_daily (transaction_date);

-- ============================================================================
-- 3. SQL STORED FUNCTION DYNAMIC REKAP TAGIHAN PER OWNER
-- ============================================================================
DROP FUNCTION IF EXISTS layer3_dim.get_rekap_tagihan(text,date,date,numeric) CASCADE;

CREATE OR REPLACE FUNCTION layer3_dim.get_rekap_tagihan(
    p_owner TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT '2026-01-01',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_override_nominal_bagi_hasil NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    tanggal TEXT,
    pendapatan_kotor NUMERIC(15,2),
    potongan_ojol NUMERIC(15,2),
    pendapatan_bersih NUMERIC(15,2),
    total_order_sukses BIGINT,
    total_bagi_hasil NUMERIC(15,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_agg AS (
        SELECT 
            TO_CHAR(mv.transaction_date, 'YYYY-MM-DD') AS tgl_str,
            mv.transaction_date AS tgl_date,
            SUM(mv.pendapatan_kotor) AS pk,
            SUM(mv.potongan_ojol) AS po,
            SUM(mv.pendapatan_bersih) AS pb,
            SUM(mv.total_order_sukses)::BIGINT AS os,
            SUM(
                CASE 
                    WHEN p_override_nominal_bagi_hasil IS NOT NULL THEN mv.total_order_sukses * p_override_nominal_bagi_hasil
                    ELSE mv.total_bagi_hasil
                END
            ) AS bh
        FROM layer3_dim.mv_rekap_tagihan_daily mv
        WHERE (p_owner IS NULL OR p_owner = '' OR LOWER(mv.owner_name) = LOWER(p_owner))
          AND mv.transaction_date >= p_start_date
          AND mv.transaction_date <= p_end_date
        GROUP BY mv.transaction_date
    ),
    combined AS (
        SELECT 
            d.tgl_str AS t_date,
            d.tgl_date AS sort_date,
            d.pk AS pk_val,
            d.po AS po_val,
            d.pb AS pb_val,
            d.os AS os_val,
            d.bh AS bh_val,
            1 AS sort_grp
        FROM daily_agg d
        
        UNION ALL
        
        SELECT 
            'Grand Total' AS t_date,
            '2099-12-31'::DATE AS sort_date,
            COALESCE(SUM(d.pk), 0.00) AS pk_val,
            COALESCE(SUM(d.po), 0.00) AS po_val,
            COALESCE(SUM(d.pb), 0.00) AS pb_val,
            COALESCE(SUM(d.os), 0)::BIGINT AS os_val,
            COALESCE(SUM(d.bh), 0.00) AS bh_val,
            2 AS sort_grp
        FROM daily_agg d
    )
    SELECT 
        c.t_date AS tanggal,
        c.pk_val AS pendapatan_kotor,
        c.po_val AS potongan_ojol,
        c.pb_val AS pendapatan_bersih,
        c.os_val AS total_order_sukses,
        c.bh_val AS total_bagi_hasil
    FROM combined c
    ORDER BY c.sort_grp ASC, c.sort_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. MATERIALIZED VIEW OUTLET DAILY PERFORMANCE (FOR BASELINE GROWTH ANALYSIS)
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS layer3_dim.mv_outlet_daily_performance CASCADE;

CREATE MATERIALIZED VIEW layer3_dim.mv_outlet_daily_performance AS
SELECT 
    ft.transaction_date,
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN') AS owner_name,
    COALESCE(m.outlet_name, c.merchant_name, ft.outlet_name, 'UNKNOWN') AS outlet_name,
    ft.merchant_id AS store_id,
    m.live_date,
    SUM(CASE WHEN ft.is_success = 1 THEN ft.net_sales ELSE 0.00 END) AS gmv,
    COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) AS total_orders
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_credentials c ON ft.merchant_id = c.store_id
LEFT JOIN layer3_dim.dim_merchant_mapping m ON ft.merchant_id = m.store_id
WHERE UPPER(COALESCE(m.status, 'LIVE')) = 'LIVE'
GROUP BY 
    ft.transaction_date,
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN'),
    COALESCE(m.outlet_name, c.merchant_name, ft.outlet_name, 'UNKNOWN'),
    ft.merchant_id,
    m.live_date;

CREATE UNIQUE INDEX idx_mv_outlet_daily_perf ON layer3_dim.mv_outlet_daily_performance (store_id, transaction_date);
CREATE INDEX idx_mv_outlet_daily_outlet ON layer3_dim.mv_outlet_daily_performance (outlet_name);
CREATE INDEX idx_mv_outlet_daily_date ON layer3_dim.mv_outlet_daily_performance (transaction_date);

-- ============================================================================
-- 5. SQL STORED FUNCTION DYNAMIC BASELINE GROWTH PER OUTLET
-- ============================================================================
DROP FUNCTION IF EXISTS layer3_dim.get_baseline_growth(text,text,date,date,numeric) CASCADE;
DROP FUNCTION IF EXISTS layer3_dim.get_baseline_growth(text,date,date,numeric) CASCADE;

CREATE OR REPLACE FUNCTION layer3_dim.get_baseline_growth(
    p_owner TEXT DEFAULT NULL,
    p_outlet TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT '2026-07-01',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_growth_target_pct NUMERIC DEFAULT 0
)
RETURNS TABLE (
    outlet_name TEXT,
    owner_name TEXT,
    live_date TEXT,
    selected_days INT,
    growth_target_pct NUMERIC,
    days_to_eom INT,
    baseline_gmv NUMERIC(15,2),
    baseline_order BIGINT,
    target_gmv NUMERIC(15,2),
    target_order NUMERIC(15,2),
    current_gmv NUMERIC(15,2),
    current_daily_gmv_growth NUMERIC(15,4),
    current_order BIGINT,
    current_daily_order_growth NUMERIC(15,4),
    eom_gmv NUMERIC(15,2),
    eom_gmv_growth NUMERIC(15,4),
    eom_order NUMERIC(15,2),
    eom_order_growth NUMERIC(15,4),
    remaining_gmv NUMERIC(15,2),
    required_daily_gmv NUMERIC(15,2),
    remaining_order NUMERIC(15,2),
    required_daily_order NUMERIC(15,2)
) AS $$
DECLARE
    v_selected_days INT;
    v_days_in_month INT;
    v_eom_date DATE;
    v_days_to_eom INT;
    v_baseline_start DATE;
    v_baseline_end DATE;
BEGIN
    -- 1. Calculations for date intervals
    v_selected_days := (p_end_date - p_start_date) + 1;
    v_eom_date := (DATE_TRUNC('month', p_end_date) + INTERVAL '1 month - 1 day')::DATE;
    v_days_in_month := EXTRACT(DAY FROM v_eom_date);
    v_days_to_eom := GREATEST(0, (v_eom_date - p_end_date));
    
    -- Baseline range: 30 days prior to p_start_date
    v_baseline_end := p_start_date - INTERVAL '1 day';
    v_baseline_start := v_baseline_end - INTERVAL '29 days';

    RETURN QUERY
    WITH base_agg AS (
        SELECT 
            mv.outlet_name,
            MAX(mv.owner_name) AS owner_name,
            MAX(mv.live_date) AS live_date,
            COALESCE(SUM(CASE WHEN mv.transaction_date BETWEEN v_baseline_start AND v_baseline_end THEN mv.gmv ELSE 0 END), 0.00) AS b_gmv,
            COALESCE(SUM(CASE WHEN mv.transaction_date BETWEEN v_baseline_start AND v_baseline_end THEN mv.total_orders ELSE 0 END), 0)::BIGINT AS b_ord,
            COALESCE(SUM(CASE WHEN mv.transaction_date BETWEEN p_start_date AND p_end_date THEN mv.gmv ELSE 0 END), 0.00) AS c_gmv,
            COALESCE(SUM(CASE WHEN mv.transaction_date BETWEEN p_start_date AND p_end_date THEN mv.total_orders ELSE 0 END), 0)::BIGINT AS c_ord
        FROM layer3_dim.mv_outlet_daily_performance mv
        WHERE (p_owner IS NULL OR p_owner = '' OR LOWER(mv.owner_name) = LOWER(p_owner))
          AND (p_outlet IS NULL OR p_outlet = '' OR LOWER(mv.outlet_name) = LOWER(p_outlet))
        GROUP BY mv.outlet_name
    ),
    calc AS (
        SELECT
            b.outlet_name,
            COALESCE(b.owner_name, 'UNKNOWN') AS owner_name,
            COALESCE(b.live_date, '-') AS live_date,
            v_selected_days AS sel_days,
            p_growth_target_pct AS g_target,
            v_days_to_eom AS d_eom,
            b.b_gmv,
            b.b_ord,
            ROUND(b.b_gmv * (1.00 + (p_growth_target_pct / 100.00)), 2) AS t_gmv,
            ROUND(b.b_ord * (1.00 + (p_growth_target_pct / 100.00)), 2) AS t_ord,
            b.c_gmv,
            b.c_ord,
            CASE WHEN (b.b_gmv / 30.00) > 0 THEN ROUND(((b.c_gmv / GREATEST(1, v_selected_days)) / (b.b_gmv / 30.00)), 4) ELSE 0.0000 END AS c_daily_gmv_growth,
            CASE WHEN (b.b_ord / 30.00) > 0 THEN ROUND(((b.c_ord::NUMERIC / GREATEST(1, v_selected_days)) / (b.b_ord::NUMERIC / 30.00)), 4) ELSE 0.0000 END AS c_daily_ord_growth,
            ROUND((b.c_gmv / GREATEST(1, v_selected_days)) * v_days_in_month, 2) AS e_gmv,
            ROUND((b.c_ord::NUMERIC / GREATEST(1, v_selected_days)) * v_days_in_month, 2) AS e_ord
        FROM base_agg b
    )
    SELECT 
        c.outlet_name,
        c.owner_name,
        c.live_date,
        c.sel_days,
        c.g_target,
        c.d_eom,
        c.b_gmv AS baseline_gmv,
        c.b_ord AS baseline_order,
        c.t_gmv AS target_gmv,
        c.t_ord AS target_order,
        c.c_gmv AS current_gmv,
        c.c_daily_gmv_growth,
        c.c_ord AS current_order,
        c.c_daily_ord_growth,
        c.e_gmv AS eom_gmv,
        CASE WHEN c.b_gmv > 0 THEN ROUND((c.e_gmv / c.b_gmv) - 1.00, 4) ELSE 0.0000 END AS eom_gmv_growth,
        c.e_ord AS eom_order,
        CASE WHEN c.b_ord > 0 THEN ROUND((c.e_ord / c.b_ord) - 1.00, 4) ELSE 0.0000 END AS eom_order_growth,
        ROUND(c.t_gmv - c.c_gmv, 2) AS remaining_gmv,
        CASE WHEN c.d_eom > 0 THEN ROUND((c.t_gmv - c.c_gmv) / c.d_eom, 2) ELSE 0.00 END AS required_daily_gmv,
        ROUND(c.t_ord - c.c_ord, 2) AS remaining_order,
        CASE WHEN c.d_eom > 0 THEN ROUND((c.t_ord - c.c_ord) / c.d_eom, 2) ELSE 0.00 END AS required_daily_order
    FROM calc c
    ORDER BY c.outlet_name ASC;
END;
$$ LANGUAGE plpgsql;

