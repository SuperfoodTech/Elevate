-- Live View for BI Tools & Visualizations
CREATE OR REPLACE VIEW layer3_dim.v_fact_transactions AS
SELECT 
    ft.id AS transaction_id,
    ft.external_id AS order_id,
    ft.platform AS platform_name,
    p.platform_code,
    p.color_hex AS platform_color,
    ft.transaction_date,
    CAST(TO_CHAR(ft.transaction_date, 'YYYYMMDD') AS INTEGER) AS date_key,
    d.year,
    d.quarter_name,
    d.month_number,
    d.month_name_id AS nama_bulan,
    d.week_of_year,
    d.day_name_id AS nama_hari,
    d.is_weekend,
    
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

    -- Clean Numeric Rates (Numeric 0.25 = 25%)
    CASE WHEN ft.net_sales > 0 THEN ROUND(ft.commission / ft.net_sales, 4) ELSE 0.0000 END AS commission_rate,
    CASE WHEN ft.net_sales > 0 THEN ROUND(ft.ofd_fees / ft.net_sales, 4) ELSE 0.0000 END AS ofd_fee_rate,
    CASE WHEN ft.net_sales > 0 THEN ROUND(ft.revenue / ft.net_sales, 4) ELSE 0.0000 END AS payout_rate,

    ft.context,
    ft.created_on,
    ft.updated_at
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_mapping m ON ft.merchant_id = m.store_id
LEFT JOIN layer3_dim.dim_platform p ON UPPER(ft.platform) = p.platform_code OR ft.platform = p.platform_name
LEFT JOIN layer3_dim.dim_date d ON ft.transaction_date = d.full_date;
