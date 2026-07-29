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
    ft.transaction_date,
    SUM(CASE WHEN ft.is_success = 1 THEN ft.net_sales ELSE 0.00 END) AS pendapatan_kotor,
    SUM(CASE WHEN ft.is_success = 1 THEN ft.ofd_fees ELSE 0.00 END) AS potongan_ojol,
    SUM(CASE WHEN ft.is_success = 1 THEN ft.revenue ELSE 0.00 END) AS pendapatan_bersih,
    COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) AS total_order_sukses,
    COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) * 1000.00 AS default_total_bagi_hasil
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_credentials c ON ft.merchant_id = c.store_id
LEFT JOIN layer3_dim.dim_merchant_mapping m ON ft.merchant_id = m.store_id
GROUP BY 
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN'),
    COALESCE(m.outlet_name, c.merchant_name, ft.outlet_name, 'UNKNOWN'),
    COALESCE(m.brand, 'UNKNOWN'),
    COALESCE(m.nama_resto_final, ft.branch_name, 'UNKNOWN'),
    ft.merchant_id,
    ft.transaction_date;

-- Indeks Unik Pendukung Refresh Concurrent & Query Cepat
CREATE UNIQUE INDEX idx_mv_rekap_tagihan_daily ON layer3_dim.mv_rekap_tagihan_daily (owner_name, store_id, transaction_date);
CREATE INDEX idx_mv_rekap_tagihan_owner ON layer3_dim.mv_rekap_tagihan_daily (owner_name);
CREATE INDEX idx_mv_rekap_tagihan_date ON layer3_dim.mv_rekap_tagihan_daily (transaction_date);

-- ============================================================================
-- 3. SQL STORED FUNCTION DYNAMIC REKAP TAGIHAN PER OWNER
-- ============================================================================
CREATE OR REPLACE FUNCTION layer3_dim.get_rekap_tagihan(
    p_owner TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT '2026-01-01',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_nominal_bagi_hasil NUMERIC DEFAULT 1000
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
            SUM(mv.total_order_sukses) * p_nominal_bagi_hasil AS bh
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
