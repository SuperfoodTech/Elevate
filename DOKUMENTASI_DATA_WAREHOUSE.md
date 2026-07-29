# DOKUMENTASI LENGKAP DATA WAREHOUSE & ARSITEKTUR LAYER 3 (`db_superfood`)

Dokumen ini merupakan panduan komprehensif mengenai struktur Data Warehouse, skema 3 layer, relasi antar-tabel, rincian seluruh kolom, rasionasi pembuatan tabel dimensi (`dim_*`), spesifikasi pengisian tabel unified `fact_transactions`, hingga pelaporan transaksi terpadu 3 platform Online Food Delivery (OFD): **ShopeeFood, GrabFood, dan GoFood**.

---

## 1. RASIONASI ARSITEKTUR TABEL DIMENSI (`dim_*`) DI LAYER 3

Dalam arsitektur Data Warehouse berbasis **Kimball Star Schema**, data dipisahkan menjadi dua jenis tabel:
1. **Fact Tables (`fact_*`)**: Menyimpan data kejadian transaksi berukuran besar yang berisi angka-angka numerik (Omzet, Diskon, Komisi, Net Payout) yang bertambah terus-menerus.
2. **Dimension Tables (`dim_*`)**: Menyimpan konteks bisnis, acuan identitas, serta metadata operasional.

```text
========================================================================================
                      DESAIN STAR SCHEMA LAYER 3 (layer3_dim)
========================================================================================

    [dim_merchant_credentials]         [dim_portal_credentials]
    (Master Login & HP)                (Ref Portal Scraper & OTP)
            │                                     │
            ▼                                     ▼
    [dim_merchant_mapping] ────────────> [fact_transactions] (91,955 baris)
    (Resto Final & Status)              [fact_daily_merchant_performance] (14,101 baris)
                                                  ▲
                                                  │
                                            [dim_date]
                                            (Dimensi Kalender 2020-2030)
```

---

## 2. INVENTARIS LENGKAP SCHEMAS & TABEL DATABASE (`165.232.165.241`)

Database **`db_superfood`** terdiri dari 3 layer utama dan 14 base tables:

| Schema | Nama Tabel | Tipe | Jumlah Baris Data | Deskripsi & Peran |
|---|---|---|---|---|
| **`layer1_raw`** | `raw_shopee` | BASE TABLE | **63,327 baris** | Transaksi mentah ShopeeFood |
| **`layer1_raw`** | `raw_grab` | BASE TABLE | **38,128 baris** | Transaksi mentah GrabFood |
| **`layer1_raw`** | `raw_go` | BASE TABLE | **6,620 baris** | Transaksi mentah GoFood |
| **`layer1_raw`** | `vercel_sheet` | BASE TABLE | 8 baris *(Legacy)* | Staging gsheet vercel *(Unused)* |
| **`layer1_raw`** | `credential` | BASE TABLE | 0 baris *(Legacy)* | Staging gsheet credential *(Unused)* |
| **`layer2_clean`** | `stg_shopee_orders` | BASE TABLE | **63,327 baris** | Cleaned staging ShopeeFood |
| **`layer2_clean`** | `stg_grab_orders` | BASE TABLE | **38,094 baris** | Cleaned staging GrabFood (deduplicated) |
| **`layer2_clean`** | `stg_go_orders` | BASE TABLE | **5,997 baris** | Cleaned staging GoFood |
| **`layer3_dim`** | **`dim_date`** | BASE TABLE | **4,018 baris** | **Dimensi Kalender** (2020 - 2030) |
| **`layer3_dim`** | **`dim_merchant_credentials`** | BASE TABLE | **267 baris** | **Master Credential Login Mitra & SuperFood** |
| **`layer3_dim`** | **`dim_merchant_mapping`** | BASE TABLE | **367 baris** | **Master Pemetaan Resto Baku & Status Live/Never** |
| **`layer3_dim`** | **`dim_portal_credentials`** | BASE TABLE | **20 baris** | **Referensi Statis Portal, OTP WA/SMS & BD Profile** |
| **`layer3_dim`** | **`fact_transactions`** | BASE TABLE | **91,955 baris** | **Unified Fact Table** Transaksi Detail 3 Platform |
| **`layer3_dim`** | **`fact_daily_merchant_performance`** | BASE TABLE | **14,101 baris** | **Agregat Fakta Harian** Performa Toko (BI Ready) |

---

## 3. SPESIFIKASI DOKUMENTASI PENGISIAN TABEL UNIFIED (`layer3_dim.fact_transactions`)

Tabel unified **`fact_transactions`** menyatukan data transaksi dari 3 aplikator:

| Kolom Unified `fact_transactions` | Tipe Data | Sumber GrabFood (`stg_grab_orders`) | Sumber ShopeeFood (`stg_shopee_orders`) | Sumber GoFood (`stg_go_orders`) | Logika Transformasi & Formula |
|---|---|---|---|---|---|
| **`platform`** | TEXT | `'GrabFood'` | `'ShopeeFood'` | `'GoFood'` | Penanda nama platform aplikator. |
| **`external_id`** | TEXT | `stg.long_order_id` | `stg.order_id` | `stg.period_id` | Unique ID transaksi dari aplikator. |
| **`transaction_date`** | DATE | Parsed dari `stg.created_on` | Parsed dari `stg.complete_time` | `stg.date` | Tanggal transaksi resmi (`YYYY-MM-DD`). |
| **`created_on`** | TIMESTAMP | `TO_TIMESTAMP(stg.created_on)` | `TO_TIMESTAMP(stg.complete_time)` | `stg.date::TIMESTAMP` | Timestamp lengkap waktu transaksi. |
| **`year`**, **`month`**, **`week`**, **`hour`** | INT/TEXT | Parsed dari `created_on` | Parsed dari `complete_time` | Parsed dari `date` | Dimensi waktu terpisah. |
| **`merchant_id`** | TEXT | `stg.store_id` | `stg.store_id` | `stg.store_id` | Foreign Key ke `dim_merchant_mapping`. |
| **`group_code`** | TEXT | `COALESCE(m.group_code, 'UNKNOWN')` | `COALESCE(m.group_code, 'UNKNOWN')` | `COALESCE(m.group_code, 'UNKNOWN')` | Kode grup resto dari `dim_merchant_mapping`. |
| **`outlet_name`** | TEXT | `COALESCE(m.outlet_name, stg.merchant_name)` | `COALESCE(m.outlet_name, stg.store_name)` | `COALESCE(m.outlet_name, stg.store_name)` | Nama outlet registrasi dari mapping. |
| **`branch_name`** | TEXT | `COALESCE(m.nama_resto_final, m.nama_tarikan)` | `COALESCE(m.nama_resto_final, m.nama_tarikan)` | `COALESCE(m.nama_resto_final, m.nama_tarikan)` | **Nama Resto Final (Cabang Baku)**. |
| **`store_name`** | TEXT | `stg.store_name` | `stg.store_name` | `stg.store_name` | Nama toko mentah scraper. |
| **`status`** | TEXT | `stg.status` | `stg.status` | `'Sukses'` | Teks status mentah dari aplikator. |
| **`is_success`** | INTEGER | `1` jika `status` Transferred/Completed | `1` jika `status` completed | `1` jika `Sukses` | **Flag `1` jika pesanan sukses/selesai**. |
| **`is_cancelled`** | INTEGER | `1` jika `status` Cancelled | `1` jika `status` cancelled | `0` | **Flag `1` jika pesanan dibatalkan**. |
| **`gross_amount`** | NUMERIC | `stg.amount` | `stg.food_original_price` | `stg.gross_sales` | Harga kotor pesanan sebelum diskon. |
| **`discounts`** | NUMERIC | `stg.discount_merchant_funded` | `item_discounts + flash_sale_discount + subsidies` | `0.00` | Total diskon yang ditanggung toko. |
| **`net_sales`** | NUMERIC | `stg.net_sales` | `stg.net_sales` | `stg.net_sales` | **Omzet bersih toko** (`gross_amount` - `discounts`). |
| **`commission`** | NUMERIC | `stg.order_commission` | `stg.commission` | `stg.commission_fee` | Komisi resmi aplikator. |
| **`revenue`** | NUMERIC | `stg.total` | `stg.revenue` | `stg.net_sales` | **Net Payout** (Dana bersih ditransfer ke rekening). |
