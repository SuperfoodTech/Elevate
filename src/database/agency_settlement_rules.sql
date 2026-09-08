-- Agency settlement rules (authoritative weekly owner-level report)
-- Period: Monday 00:00 (inclusive) through next Monday 00:00 (exclusive).
-- The source transaction table is layer3_dim.fact_transactions.
-- No fee fallback is allowed. Ambiguous or missing fees are NEED_REVIEW.

CREATE OR REPLACE VIEW layer3_dim.v_agency_owner_fee_rule AS
WITH parsed AS (
    SELECT
        COALESCE(NULLIF(BTRIM(m.owner_name), ''), 'UNKNOWN') AS owner_name,
        NULLIF(REGEXP_REPLACE(m.fee, '[^0-9]', '', 'g'), '')::NUMERIC AS fee_value
    FROM layer3_dim.dim_merchant_mapping m
    WHERE UPPER(COALESCE(m.status, 'LIVE')) = 'LIVE'
      AND COALESCE(NULLIF(BTRIM(m.owner_name), ''), 'UNKNOWN') <> 'UNKNOWN'
), grouped AS (
    SELECT
        owner_name,
        COUNT(*) AS mapped_store_count,
        COUNT(fee_value) AS stores_with_fee,
        COUNT(DISTINCT fee_value) AS distinct_fee_count,
        MIN(fee_value) AS agency_fee
    FROM parsed
    GROUP BY owner_name
)
SELECT
    owner_name,
    mapped_store_count,
    stores_with_fee,
    distinct_fee_count,
    CASE WHEN distinct_fee_count = 1 AND stores_with_fee = mapped_store_count
         THEN agency_fee END AS agency_fee,
    CASE WHEN distinct_fee_count = 1 AND stores_with_fee = mapped_store_count
         THEN 'VALID' ELSE 'NEED_REVIEW' END AS fee_status
FROM grouped;

DROP VIEW IF EXISTS layer3_dim.v_agency_transaction_scope CASCADE;
CREATE VIEW layer3_dim.v_agency_transaction_scope AS
WITH business_scope AS (
    SELECT
        LOWER(BTRIM(COALESCE(owner_name, ''))) AS owner_key,
        LOWER(BTRIM(COALESCE(agency_outlet_name, ''))) AS agency_outlet_key,
        CASE WHEN BOOL_OR(relationship_type = 'HYBRID') THEN 'HYBRID'
             ELSE 'AGENCY_ONLY' END AS business_type
    FROM layer3_dim.v_current_business_grouping
    WHERE relationship_type IN ('AGENCY_ONLY', 'HYBRID')
      AND mapping_status = 'VALID'
      AND agency_outlet_name IS NOT NULL
    GROUP BY LOWER(BTRIM(COALESCE(owner_name, ''))), LOWER(BTRIM(COALESCE(agency_outlet_name, '')))
)
SELECT
    COALESCE(NULLIF(BTRIM(m.owner_name), ''), 'UNKNOWN') AS owner_name,
    DATE_TRUNC('week', ft.transaction_date)::DATE AS period_start,
    (DATE_TRUNC('week', ft.transaction_date)::DATE + 7) AS period_end_exclusive,
    ft.merchant_id AS store_id,
    COALESCE(m.outlet_name, ft.outlet_name, 'UNKNOWN') AS outlet_name,
    COALESCE(m.brand, 'UNKNOWN') AS brand,
    ft.platform,
    ft.external_id AS order_id,
    ft.transaction_date,
    ft.is_success,
    ft.context,
    COALESCE(bs.business_type, 'AGENCY_ONLY') AS business_type,
    r.agency_fee::NUMERIC AS agency_fee,
    COALESCE(r.fee_status, 'NEED_REVIEW') AS fee_status,
    CASE
        WHEN COALESCE(NULLIF(BTRIM(m.owner_name), ''), 'UNKNOWN') = 'UNKNOWN'
          OR COALESCE(r.fee_status, 'NEED_REVIEW') <> 'VALID'
        THEN 'NEED_REVIEW'
        ELSE 'READY'
    END AS settlement_status
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_mapping m ON m.store_id = ft.merchant_id
LEFT JOIN layer3_dim.v_agency_owner_fee_rule r
       ON r.owner_name = COALESCE(NULLIF(BTRIM(m.owner_name), ''), 'UNKNOWN')
LEFT JOIN business_scope bs
       ON bs.owner_key = LOWER(BTRIM(COALESCE(m.owner_name, '')))
      AND bs.agency_outlet_key = LOWER(BTRIM(COALESCE(m.outlet_name, '')))
WHERE ft.transaction_date IS NOT NULL
  AND UPPER(COALESCE(m.status, 'LIVE')) = 'LIVE'
  AND NOT EXISTS (
      SELECT 1
      FROM layer3_dim.v_current_business_grouping vb
      WHERE vb.relationship_type = 'VB_ONLY'
        AND LOWER(BTRIM(COALESCE(vb.owner_name, ''))) = LOWER(BTRIM(COALESCE(m.owner_name, '')))
        AND (
            LOWER(BTRIM(COALESCE(vb.vb_brand_name, ''))) = LOWER(BTRIM(COALESCE(m.outlet_name, '')))
            OR LOWER(BTRIM(COALESCE(vb.vb_brand_name, ''))) = LOWER(BTRIM(COALESCE(m.brand, '')))
        )
  );

DROP MATERIALIZED VIEW IF EXISTS layer3_dim.mv_agency_settlement_detail CASCADE;
CREATE MATERIALIZED VIEW layer3_dim.mv_agency_settlement_detail AS
SELECT
    owner_name,
    period_start,
    period_end_exclusive,
    store_id,
    outlet_name,
    brand,
    platform,
    COUNT(*) FILTER (WHERE is_success = 1 AND COALESCE(context, '') <> 'Advertisement')::BIGINT AS total_order_sukses,
    MAX(agency_fee) AS agency_fee,
    MAX(fee_status) AS fee_status,
    MAX(settlement_status) AS settlement_status,
    CASE WHEN MAX(settlement_status) = 'READY'
         THEN COUNT(*) FILTER (WHERE is_success = 1) * MAX(agency_fee)
    END AS subtotal_tagihan
FROM layer3_dim.v_agency_transaction_scope
GROUP BY owner_name, period_start, period_end_exclusive, store_id, outlet_name, brand, platform;

CREATE INDEX idx_mv_agency_settlement_detail_period
    ON layer3_dim.mv_agency_settlement_detail (period_start, owner_name);

DROP MATERIALIZED VIEW IF EXISTS layer3_dim.mv_agency_settlement_owner CASCADE;
CREATE MATERIALIZED VIEW layer3_dim.mv_agency_settlement_owner AS
SELECT
    owner_name,
    period_start,
    period_end_exclusive,
    MIN(period_start + 7) AS settlement_due_date,
    SUM(total_order_sukses)::BIGINT AS total_order_sukses,
    MIN(agency_fee) FILTER (WHERE fee_status = 'VALID') AS agency_fee,
    SUM(subtotal_tagihan) AS subtotal_tagihan,
    CASE WHEN BOOL_AND(settlement_status = 'READY') THEN 'READY'
         ELSE 'NEED_REVIEW' END AS settlement_status,
    COUNT(DISTINCT store_id)::BIGINT AS total_outlet,
    COUNT(DISTINCT platform)::BIGINT AS total_platform
FROM layer3_dim.mv_agency_settlement_detail
GROUP BY owner_name, period_start, period_end_exclusive;

CREATE UNIQUE INDEX idx_mv_agency_settlement_owner
    ON layer3_dim.mv_agency_settlement_owner (owner_name, period_start);

CREATE TABLE IF NOT EXISTS layer3_dim.agency_settlement_payments (
    id BIGSERIAL PRIMARY KEY,
    owner_name TEXT NOT NULL,
    period_start DATE NOT NULL,
    penyesuaian NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transfer_id TEXT,
    tanggal_pembayaran DATE,
    link_bukti TEXT,
    status_pembayaran TEXT NOT NULL DEFAULT 'BELUM DIBAYAR',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_agency_settlement_payment UNIQUE (owner_name, period_start)
);

CREATE OR REPLACE VIEW layer3_dim.v_agency_settlement_report AS
SELECT
    s.owner_name,
    'ALL OWNER OUTLETS'::TEXT AS outlet_name,
    'AGENCY'::TEXT AS brand,
    'AGENCY OWNER SETTLEMENT'::TEXT AS nama_resto_final,
    s.owner_name AS store_id,
    TO_CHAR(s.period_start, 'YYYY-MM-DD') AS periode,
    s.period_start,
    s.period_end_exclusive,
    s.total_order_sukses AS jumlah_order_sukses,
    s.agency_fee AS biaya,
    s.subtotal_tagihan,
    COALESCE(p.penyesuaian, 0.00) AS penyesuaian,
    CASE WHEN s.settlement_status = 'READY'
         THEN s.subtotal_tagihan + COALESCE(p.penyesuaian, 0.00) END AS total_tagihan,
    s.settlement_due_date AS tanggal_tagihan,
    p.transfer_id,
    p.tanggal_pembayaran,
    p.link_bukti,
    CASE
        WHEN s.settlement_status = 'NEED_REVIEW' THEN 'NEED_REVIEW'
        WHEN UPPER(COALESCE(p.status_pembayaran, 'BELUM DIBAYAR')) IN ('PAID', 'LUNAS', 'SUDAH DIBAYAR') THEN 'LUNAS'
        WHEN UPPER(COALESCE(p.status_pembayaran, 'BELUM DIBAYAR')) = 'PENDING' THEN 'PENDING'
        ELSE 'BELUM DIBAYAR'
    END AS status_pembayaran,
    s.settlement_status,
    s.total_outlet,
    s.total_platform
FROM layer3_dim.mv_agency_settlement_owner s
LEFT JOIN layer3_dim.agency_settlement_payments p
       ON p.owner_name = s.owner_name AND p.period_start = s.period_start;

CREATE OR REPLACE FUNCTION layer3_dim.refresh_agency_settlements()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW layer3_dim.mv_agency_settlement_detail;
    REFRESH MATERIALIZED VIEW layer3_dim.mv_agency_settlement_owner;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION layer3_dim.get_agency_daily_recap(
    p_owner TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT DATE '1900-01-01',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    tanggal TEXT,
    pendapatan_kotor NUMERIC(15,2),
    potongan_ojol NUMERIC(15,2),
    pendapatan_bersih NUMERIC(15,2),
    total_order_sukses BIGINT,
    total_bagi_hasil NUMERIC(15,2),
    settlement_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(s.transaction_date, 'YYYY-MM-DD') AS tanggal,
        SUM(CASE WHEN s.is_success = 1 THEN ft.net_sales ELSE 0 END)::NUMERIC(15,2),
        SUM(CASE WHEN s.is_success = 1 THEN ft.ofd_fees ELSE 0 END)::NUMERIC(15,2),
        SUM(CASE WHEN s.is_success = 1 THEN ft.revenue ELSE 0 END)::NUMERIC(15,2),
        COUNT(*) FILTER (WHERE s.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement')::BIGINT,
        CASE WHEN BOOL_AND(s.settlement_status = 'READY')
             THEN (COUNT(*) FILTER (WHERE s.is_success = 1 AND COALESCE(ft.context, '') <> 'Advertisement') * MAX(s.agency_fee))::NUMERIC(15,2)
        END,
        CASE WHEN BOOL_AND(s.settlement_status = 'READY') THEN 'READY' ELSE 'NEED_REVIEW' END
    FROM layer3_dim.v_agency_transaction_scope s
    JOIN layer3_dim.fact_transactions ft ON ft.id = (
        SELECT ft2.id FROM layer3_dim.fact_transactions ft2
        WHERE ft2.external_id = s.order_id
          AND ft2.merchant_id = s.store_id
          AND ft2.transaction_date = s.transaction_date
        ORDER BY ft2.id LIMIT 1
    )
    WHERE (p_owner IS NULL OR p_owner = '' OR LOWER(s.owner_name) = LOWER(p_owner))
      AND s.transaction_date BETWEEN p_start_date AND p_end_date
    GROUP BY s.transaction_date
    ORDER BY s.transaction_date;
END;
$$ LANGUAGE plpgsql;
