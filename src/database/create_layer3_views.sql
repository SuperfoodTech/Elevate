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
-- 4. TABEL ADMINISTRATIVE REKONSILIASI PEMBAYARAN TAGIHAN BULANAN
-- ============================================================================
CREATE TABLE IF NOT EXISTS layer3_dim.billing_payments (
    id SERIAL PRIMARY KEY,
    store_id TEXT NOT NULL,
    periode TEXT NOT NULL,
    penyesuaian NUMERIC(15,2) DEFAULT 0.00,
    tanggal_tagihan DATE,
    transfer_id TEXT,
    tanggal_pembayaran DATE,
    link_bukti TEXT,
    status_pembayaran TEXT DEFAULT 'BELUM DIBAYAR',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_billing_payments UNIQUE (store_id, periode)
);

-- ============================================================================
-- 5. MATERIALIZED VIEW TAGIHAN BULANAN (MONTHLY BILLING CYCLE & LIVE OUTLETS)
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS layer3_dim.mv_rekap_tagihan_monthly CASCADE;

CREATE MATERIALIZED VIEW layer3_dim.mv_rekap_tagihan_monthly AS
SELECT 
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN') AS owner_name,
    COALESCE(m.outlet_name, c.merchant_name, ft.outlet_name, 'UNKNOWN') AS outlet_name,
    COALESCE(m.brand, 'UNKNOWN') AS brand,
    COALESCE(m.nama_resto_final, ft.branch_name, 'UNKNOWN') AS nama_resto_final,
    ft.merchant_id AS store_id,
    TO_CHAR(ft.transaction_date, 'YYYY-MM') AS periode,
    COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END)::BIGINT AS jumlah_order_sukses,
    COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00) AS biaya,
    COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) * COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00) AS subtotal_tagihan,
    COALESCE(p.penyesuaian, 0.00) AS penyesuaian,
    (COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) * COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00)) + COALESCE(p.penyesuaian, 0.00) AS total_tagihan,
    p.tanggal_tagihan,
    p.transfer_id,
    p.tanggal_pembayaran,
    p.link_bukti,
    COALESCE(p.status_pembayaran, 'BELUM DIBAYAR') AS status_pembayaran
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_credentials c ON ft.merchant_id = c.store_id
LEFT JOIN layer3_dim.dim_merchant_mapping m ON ft.merchant_id = m.store_id
LEFT JOIN layer3_dim.billing_payments p ON ft.merchant_id = p.store_id AND TO_CHAR(ft.transaction_date, 'YYYY-MM') = p.periode
WHERE UPPER(COALESCE(m.status, 'LIVE')) = 'LIVE'
  AND UPPER(COALESCE(m.billing_cycle, '')) = 'MONTHLY'
GROUP BY 
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN'),
    COALESCE(m.outlet_name, c.merchant_name, ft.outlet_name, 'UNKNOWN'),
    COALESCE(m.brand, 'UNKNOWN'),
    COALESCE(m.nama_resto_final, ft.branch_name, 'UNKNOWN'),
    ft.merchant_id,
    TO_CHAR(ft.transaction_date, 'YYYY-MM'),
    COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00),
    p.penyesuaian,
    p.tanggal_tagihan,
    p.transfer_id,
    p.tanggal_pembayaran,
    p.link_bukti,
    p.status_pembayaran;

-- Indeks Unik Pendukung Refresh Concurrent & Query Cepat
CREATE UNIQUE INDEX idx_mv_rekap_tagihan_monthly ON layer3_dim.mv_rekap_tagihan_monthly (store_id, periode);
CREATE INDEX idx_mv_rekap_tagihan_monthly_owner ON layer3_dim.mv_rekap_tagihan_monthly (owner_name);
CREATE INDEX idx_mv_rekap_tagihan_monthly_periode ON layer3_dim.mv_rekap_tagihan_monthly (periode);

-- ============================================================================
-- 5B. MATERIALIZED VIEW ALL REKAP TAGIHAN & RIWAYAT PEMBAYARAN (ALL CYCLES)
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS layer3_dim.mv_rekap_tagihan_billing_history CASCADE;

CREATE MATERIALIZED VIEW layer3_dim.mv_rekap_tagihan_billing_history AS
SELECT 
    COALESCE(c.owner_name, m.owner_name, 'UNKNOWN') AS owner_name,
    COALESCE(m.outlet_name, c.merchant_name, 'UNKNOWN') AS outlet_name,
    COALESCE(m.brand, 'UNKNOWN') AS brand,
    COALESCE(m.nama_resto_final, 'UNKNOWN') AS nama_resto_final,
    p.store_id,
    p.periode,
    COALESCE(p.penyesuaian, 0.00) AS penyesuaian,
    p.tanggal_tagihan,
    p.transfer_id,
    p.tanggal_pembayaran,
    p.link_bukti,
    COALESCE(p.status_pembayaran, 'BELUM DIBAYAR') AS status_pembayaran,
    p.notes,
    p.updated_at
FROM layer3_dim.billing_payments p
LEFT JOIN layer3_dim.dim_merchant_mapping m ON p.store_id = m.store_id
LEFT JOIN layer3_dim.dim_merchant_credentials c ON p.store_id = c.store_id;

CREATE UNIQUE INDEX idx_mv_rekap_tagihan_billing_history ON layer3_dim.mv_rekap_tagihan_billing_history (store_id, periode);
CREATE INDEX idx_mv_rekap_tagihan_billing_history_owner ON layer3_dim.mv_rekap_tagihan_billing_history (owner_name);
CREATE INDEX idx_mv_rekap_tagihan_billing_history_periode ON layer3_dim.mv_rekap_tagihan_billing_history (periode);

-- ============================================================================
-- 6. SQL STORED FUNCTION UNIFIED DYNAMIC REKAP TAGIHAN (MONTHLY & WEEKLY)
-- ============================================================================
DROP FUNCTION IF EXISTS layer3_dim.get_rekap_tagihan_monthly(text,text,text) CASCADE;
DROP FUNCTION IF EXISTS layer3_dim.get_rekap_tagihan_billing(text,text,text,text) CASCADE;

CREATE OR REPLACE FUNCTION layer3_dim.get_rekap_tagihan_billing(
    p_billing_cycle TEXT DEFAULT 'Monthly', -- 'Monthly' or 'Weekly'
    p_owner TEXT DEFAULT NULL,
    p_periode TEXT DEFAULT NULL,           -- 'YYYY-MM' for Monthly, or 'YYYY-MM-W1'..'W5' / 'YYYY-MM W1' for Weekly
    p_status_pembayaran TEXT DEFAULT NULL
)
RETURNS TABLE (
    owner_name TEXT,
    outlet_name TEXT,
    brand TEXT,
    nama_resto_final TEXT,
    store_id TEXT,
    periode TEXT,
    jumlah_order_sukses BIGINT,
    biaya NUMERIC(15,2),
    subtotal_tagihan NUMERIC(15,2),
    penyesuaian NUMERIC(15,2),
    total_tagihan NUMERIC(15,2),
    tanggal_tagihan DATE,
    transfer_id TEXT,
    tanggal_pembayaran DATE,
    link_bukti TEXT,
    status_pembayaran TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH target_cycle AS (
        SELECT CASE 
            WHEN LOWER(COALESCE(p_billing_cycle, 'monthly')) LIKE 'week%' THEN 'WEEKLY'
            ELSE 'MONTHLY'
        END AS cycle_code
    ),
    clean_params AS (
        SELECT REPLACE(REPLACE(p_periode, ' ', '-'), 'W', 'W') AS norm_periode
    ),
    live_outlets AS (
        SELECT 
            COALESCE(c.owner_name, m.owner_name, 'UNKNOWN') AS o_name,
            COALESCE(m.outlet_name, c.merchant_name, 'UNKNOWN') AS ot_name,
            COALESCE(m.brand, 'UNKNOWN') AS b_name,
            COALESCE(m.nama_resto_final, 'UNKNOWN') AS r_name,
            m.store_id AS s_id,
            COALESCE(NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC, 1000.00) AS fee_val
        FROM layer3_dim.dim_merchant_mapping m
        LEFT JOIN layer3_dim.dim_merchant_credentials c ON m.store_id = c.store_id
        CROSS JOIN target_cycle tc
        WHERE UPPER(COALESCE(m.status, 'LIVE')) = 'LIVE'
          AND UPPER(COALESCE(m.billing_cycle, '')) = tc.cycle_code
    ),
    target_periodes AS (
        SELECT DISTINCT p.p_code
        FROM (
            SELECT 
                CASE 
                    WHEN (SELECT cycle_code FROM target_cycle) = 'WEEKLY' 
                        THEN TO_CHAR(transaction_date, 'YYYY-MM') || '-W' || TO_CHAR(transaction_date, 'W')
                    ELSE TO_CHAR(transaction_date, 'YYYY-MM')
                END AS p_code 
            FROM layer3_dim.fact_transactions 
            WHERE transaction_date IS NOT NULL
            
            UNION
            
            SELECT COALESCE(NULLIF((SELECT norm_periode FROM clean_params), ''), 
                CASE 
                    WHEN (SELECT cycle_code FROM target_cycle) = 'WEEKLY' 
                        THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM') || '-W1'
                    ELSE TO_CHAR(CURRENT_DATE, 'YYYY-MM')
                END
            ) AS p_code
        ) p
        CROSS JOIN clean_params cp
        WHERE (cp.norm_periode IS NULL OR cp.norm_periode = '' 
               OR REPLACE(p.p_code, ' ', '-') = cp.norm_periode
               OR p.p_code LIKE cp.norm_periode || '%')
    ),
    grid AS (
        SELECT o.*, p.p_code
        FROM live_outlets o
        CROSS JOIN target_periodes p
    ),
    raw_agg AS (
        SELECT 
            g.o_name,
            g.ot_name,
            g.b_name,
            g.r_name,
            g.s_id,
            g.p_code,
            COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END)::BIGINT AS os_cnt,
            g.fee_val,
            COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) * g.fee_val AS sub_val,
            COALESCE(pm.penyesuaian, 0.00) AS adj_val,
            (COUNT(CASE WHEN ft.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement' THEN 1 END) * g.fee_val) + COALESCE(pm.penyesuaian, 0.00) AS tot_val,
            pm.tanggal_tagihan AS tgl_tagihan,
            pm.transfer_id AS trf_id,
            pm.tanggal_pembayaran AS tgl_bayar,
            pm.link_bukti AS link_bkt,
            CASE 
                WHEN UPPER(COALESCE(pm.status_pembayaran, 'BELUM DIBAYAR')) IN ('PAID', 'LUNAS', 'SUDAH DIBAYAR') THEN 'LUNAS'
                WHEN UPPER(COALESCE(pm.status_pembayaran, 'BELUM DIBAYAR')) = 'PENDING' THEN 'PENDING'
                ELSE 'BELUM DIBAYAR'
            END AS st_bayar
        FROM grid g
        CROSS JOIN target_cycle tc
        LEFT JOIN layer3_dim.fact_transactions ft 
            ON g.s_id = ft.merchant_id 
           AND (
               CASE 
                   WHEN tc.cycle_code = 'WEEKLY' 
                       THEN (TO_CHAR(ft.transaction_date, 'YYYY-MM') || '-W' || TO_CHAR(ft.transaction_date, 'W'))
                   ELSE TO_CHAR(ft.transaction_date, 'YYYY-MM')
               END
           ) = g.p_code
        LEFT JOIN layer3_dim.billing_payments pm 
            ON g.s_id = pm.store_id 
           AND (pm.periode = g.p_code OR REPLACE(pm.periode, ' ', '-') = g.p_code)
        WHERE (p_owner IS NULL OR p_owner = '' OR LOWER(g.o_name) = LOWER(p_owner))
          AND (
              p_status_pembayaran IS NULL OR p_status_pembayaran = '' OR 
              LOWER(COALESCE(pm.status_pembayaran, 'BELUM DIBAYAR')) = LOWER(p_status_pembayaran) OR
              (LOWER(p_status_pembayaran) IN ('lunas', 'paid', 'sudah dibayar') AND UPPER(COALESCE(pm.status_pembayaran, 'BELUM DIBAYAR')) IN ('PAID', 'LUNAS', 'SUDAH DIBAYAR')) OR
              (LOWER(p_status_pembayaran) IN ('belum dibayar', 'unpaid') AND UPPER(COALESCE(pm.status_pembayaran, 'BELUM DIBAYAR')) IN ('UNPAID', 'BELUM DIBAYAR'))
          )
        GROUP BY 
            g.o_name, g.ot_name, g.b_name, g.r_name, g.s_id, g.p_code, g.fee_val,
            pm.penyesuaian, pm.tanggal_tagihan, pm.transfer_id, pm.tanggal_pembayaran, pm.link_bukti, pm.status_pembayaran
    ),
    combined AS (
        SELECT 
            r.o_name, r.ot_name, r.b_name, r.r_name, r.s_id, r.p_code,
            r.os_cnt, r.fee_val, r.sub_val, r.adj_val, r.tot_val,
            r.tgl_tagihan, r.trf_id, r.tgl_bayar, r.link_bkt, r.st_bayar,
            1 AS s_grp
        FROM raw_agg r

        UNION ALL

        SELECT 
            'Grand Total' AS o_name, '-' AS ot_name, '-' AS b_name, '-' AS r_name, '-' AS s_id, '-' AS p_code,
            COALESCE(SUM(r.os_cnt), 0)::BIGINT AS os_cnt, 0.00 AS fee_val,
            COALESCE(SUM(r.sub_val), 0.00) AS sub_val, COALESCE(SUM(r.adj_val), 0.00) AS adj_val, COALESCE(SUM(r.tot_val), 0.00) AS tot_val,
            NULL::DATE AS tgl_tagihan, '-' AS trf_id, NULL::DATE AS tgl_bayar, '-' AS link_bkt, '-' AS st_bayar,
            2 AS s_grp
        FROM raw_agg r
    )
    SELECT 
        c.o_name AS owner_name, c.ot_name AS outlet_name, c.b_name AS brand, c.r_name AS nama_resto_final,
        c.s_id AS store_id, c.p_code AS periode, c.os_cnt AS jumlah_order_sukses, c.fee_val AS biaya,
        c.sub_val AS subtotal_tagihan, c.adj_val AS penyesuaian, c.tot_val AS total_tagihan,
        c.tgl_tagihan AS tanggal_tagihan, c.trf_id AS transfer_id, c.tgl_bayar AS tanggal_pembayaran,
        c.link_bkt AS link_bukti, c.st_bayar AS status_pembayaran
    FROM combined c
    ORDER BY c.s_grp ASC, c.o_name ASC, c.r_name ASC;
END;
$$ LANGUAGE plpgsql;
