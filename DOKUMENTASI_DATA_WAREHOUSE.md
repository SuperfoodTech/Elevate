# DOKUMENTASI LENGKAP DATA WAREHOUSE & ARSITEKTUR LAYER 3 (`db_superfood`)

Dokumen ini merupakan panduan komprehensif mengenai struktur Data Warehouse, skema 3 layer, relasi antar-tabel, rincian seluruh kolom, spesifikasi pengisian tabel unified `fact_transactions`, hingga pelaporan transaksi terpadu 3 platform Online Food Delivery (OFD): **ShopeeFood, GrabFood, dan GoFood**.

---

## 1. INVENTARIS LENGKAP SCHEMAS & TABEL DATABASE (`165.232.165.241`)

Database **`db_superfood`** terdiri dari 3 layer utama dan 16 tabel/view:

| Schema | Nama Tabel / View | Tipe | Jumlah Baris Data | Deskripsi & Peran |
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
| **`layer3_dim`** | **`dim_platform`** | BASE TABLE | **3 baris** | **Dimensi Platform** (Grab, Shopee, GoFood) |
| **`layer3_dim`** | **`dim_merchant_credentials`** | BASE TABLE | **267 baris** | **Master Credential Login Mitra & SuperFood** |
| **`layer3_dim`** | **`dim_merchant_mapping`** | BASE TABLE | **367 baris** | **Master Pemetaan Resto Baku & Status Live/Never** |
| **`layer3_dim`** | **`dim_portal_credentials`** | BASE TABLE | **20 baris** | **Referensi Statis Portal, OTP WA/SMS & BD Profile** |
| **`layer3_dim`** | **`fact_transactions`** | BASE TABLE | **91,955 baris** | **Unified Fact Table** Transaksi Detail 3 Platform |
| **`layer3_dim`** | **`fact_daily_merchant_performance`** | BASE TABLE | **14,101 baris** | **Agregat Fakta Harian** Performa Toko (BI Ready) |
| **`layer3_dim`** | **`v_fact_transactions`** | VIEW | **91,955 baris** | **Live SQL View** Pelaporan BI Tools |

---

## 2. SPESIFIKASI DOKUMENTASI PENGISIAN TABEL UNIFIED (`layer3_dim.fact_transactions`)

Tabel unified **`fact_transactions`** menyatukan data transaksi dari 3 aplikator. Berikut adalah matriks spesifikasi lengkap asal kolom mentah (*Source Field*) dan aturan transformasi (*Transformation Rule*) untuk setiap kolom di tabel unified:

### 📋 Matriks Pemetaan Kolom Unified Fact Table

| Kolom Unified `fact_transactions` | Tipe Data | Sumber GrabFood (`stg_grab_orders`) | Sumber ShopeeFood (`stg_shopee_orders`) | Sumber GoFood (`stg_go_orders`) | Logika Transformasi & Formula |
|---|---|---|---|---|---|
| **`platform`** | TEXT | Hardcoded `'GrabFood'` | Hardcoded `'ShopeeFood'` | Hardcoded `'GoFood'` | Penanda nama platform aplikator. |
| **`external_id`** | TEXT | `stg.long_order_id` | `stg.order_id` | `stg.period_id` | Unique ID transaksi dari aplikator (dikombinasikan dengan platform). |
| **`transaction_date`** | DATE | Parsed dari `stg.created_on` (10 karakter awal) | Parsed dari `stg.complete_time` (10 karakter awal) | `stg.date` | Tanggal transaksi resmi (`YYYY-MM-DD`). |
| **`created_on`** | TIMESTAMP | `TO_TIMESTAMP(stg.created_on, 'YYYY-MM-DD at HH24:MI')` | `TO_TIMESTAMP(stg.complete_time, 'YYYY-MM-DD at HH24:MI')` | `stg.date::TIMESTAMP` | Timestamp lengkap waktu transaksi. |
| **`year`** | INTEGER | `EXTRACT(YEAR FROM created_on)` | `EXTRACT(YEAR FROM complete_time)` | `EXTRACT(YEAR FROM date)` | Tahun transaksi. |
| **`month`** | TEXT | `stg.month` | `stg.month` | `stg.month` | Bulan transaksi (`03 March`, dst). |
| **`week`** | TEXT | `YY-MM-W` || `week_number` | `YY-MM-W` || `week_number` | `TO_CHAR(date, 'YY-MM-W"W"')` | Kode minggu transaksi. |
| **`hour`** | INTEGER | `EXTRACT(HOUR FROM created_on)` | `EXTRACT(HOUR FROM complete_time)` | `0` | Jam transaksi (0 s/d 23). |
| **`merchant_id`** | TEXT | `stg.store_id` | `stg.store_id` | `stg.store_id` | **Foreign Key** ke `dim_merchant_mapping(store_id)`. |
| **`group_code`** | TEXT | `COALESCE(m.group_code, 'UNKNOWN')` | `COALESCE(m.group_code, 'UNKNOWN')` | `COALESCE(m.group_code, 'UNKNOWN')` | Kode grup resto dari `dim_merchant_mapping`. |
| **`outlet_name`** | TEXT | `COALESCE(m.outlet_name, stg.merchant_name)` | `COALESCE(m.outlet_name, stg.store_name)` | `COALESCE(m.outlet_name, stg.store_name)` | Nama outlet registrasi dari mapping. |
| **`branch_name`** | TEXT | `COALESCE(m.nama_resto_final, m.nama_tarikan, 'UNKNOWN')` | `COALESCE(m.nama_resto_final, m.nama_tarikan, 'UNKNOWN')` | `COALESCE(m.nama_resto_final, m.nama_tarikan, 'UNKNOWN')` | **Nama Resto Final (Cabang Baku)**. |
| **`store_name`** | TEXT | `stg.store_name` | `stg.store_name` | `stg.store_name` | Nama toko mentah scraper. |
| **`status`** | TEXT | `stg.status` | `stg.status` | `'Sukses'` | Teks status mentah dari aplikator. |
| **`is_success`** | INTEGER | `CASE WHEN status IN ('transferred','completed','ditransfer','success','sukses') THEN 1 ELSE 0 END` | `CASE WHEN status IN ('completed','selesai','success','sukses') THEN 1 ELSE 0 END` | `1` | **Flag `1` jika pesanan sukses/selesai**. |
| **`is_cancelled`** | INTEGER | `CASE WHEN status IN ('cancelled','dibatalkan','batal') THEN 1 ELSE 0 END` | `CASE WHEN status IN ('cancelled','batal','dibatalkan') THEN 1 ELSE 0 END` | `0` | **Flag `1` jika pesanan dibatalkan**. |
| **`gross_amount`** | NUMERIC | `stg.amount` | `stg.food_original_price` | `stg.gross_sales` | Harga kotor pesanan sebelum diskon. |
| **`discounts`** | NUMERIC | `stg.discount_merchant_funded` | `item_discounts + flash_sale_discount + merchant_voucher + food_voucher` | `0.00` | Total diskon yang ditanggung toko. |
| **`delivery_discount`** | NUMERIC | `stg.delivery_fee_discount_merchant_funded` | `0.00` | `0.00` | Subsidi ongkir merchant. |
| **`net_sales`** | NUMERIC | `stg.net_sales` | `stg.net_sales` | `stg.net_sales` | **Omzet bersih toko** (`gross_amount` - `discounts`). |
| **`marketing_fee`** | NUMERIC | `stg.marketing_success_fee` | `0.00` | `stg.marketing_fee_and_discount` | Biaya promosi/iklan platform. |
| **`commission`** | NUMERIC | `stg.order_commission` | `stg.commission` | `stg.commission_fee` | Komisi resmi aplikator. |
| **`ofd_fees`** | NUMERIC | `ABS(order_commission + marketing_success_fee)` | `stg.commission` | `stg.total_platform_deduction` | Total potongan platform. |
| **`revenue`** | NUMERIC | `stg.total` | `stg.revenue` | `stg.net_sales` | **Net Payout** (Dana bersih ditransfer ke rekening). |
| **`gmv_vs_ofd_commission`** | TEXT | `ROUND((commission / net_sales * 100), 2) || '%'` | `ROUND((commission / net_sales * 100), 2) || '%'` | `ROUND((commission / net_sales * 100), 2) || '%'` | Persentase komisi terhadap net sales. |
| **`gmv_vs_ofd_fees`** | TEXT | `ROUND((ofd_fees / net_sales * 100), 2) || '%'` | `ROUND((ofd_fees / net_sales * 100), 2) || '%'` | `ROUND((ofd_fees / net_sales * 100), 2) || '%'` | Persentase total potongan terhadap net sales. |
| **`gmv_vs_revenue`** | TEXT | `ROUND((revenue / net_sales * 100), 2) || '%'` | `ROUND((revenue / net_sales * 100), 2) || '%'` | `ROUND((revenue / net_sales * 100), 2) || '%'` | Persentase net payout terhadap net sales. |
| **`context`** | TEXT | `CASE WHEN total <> amount THEN 'Refund Adjusted' ELSE NULL END` | `NULL` | `NULL` | Catatan penyesuaian khusus. |
| **`raw_record_id`** | BIGINT | `stg.id` | `stg.id` | `stg.id` | Reference Key ke ID baris `layer2_clean`. |

---

## 3. DETAIL STRUKTUR TABEL DIMENSI SCHEMA `layer3_dim`

### A. Tabel Dimensi Kalender (`layer3_dim.dim_date`)
Tabel dimensi waktu standar (2020 s/d 2030) yang digunakan untuk analisis tren waktu:
* `date_key` *(INT, Primary Key)*: Format YYYYMMDD (misal: `20260728`).
* `full_date` *(DATE, Unique)*: Tanggal lengkap (misal: `2026-07-28`).
* `year` *(INT)*: Tahun (misal: `2026`).
* `quarter` *(INT)*: Kuartal ke (1 s/d 4).
* `quarter_name` *(TEXT)*: Nama kuartal (`Q1`, `Q2`, `Q3`, `Q4`).
* `month_number` *(INT)*: Bulan (1 s/d 12).
* `month_name_id` *(TEXT)*: Nama bulan Bahasa Indonesia (`Januari`, `Februari`, dst).
* `month_name_en` *(TEXT)*: Nama bulan Bahasa Inggris (`January`, `February`, dst).
* `week_of_year` *(INT)*: Minggu ke dalam tahun.
* `day_of_month` *(INT)*: Hari dalam bulan (1 s/d 31).
* `day_of_week` *(INT)*: Hari dalam minggu (1 = Senin, 7 = Minggu).
* `day_name_id` *(TEXT)*: Nama hari (`Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`, `Sabtu`, `Minggu`).
* `is_weekend` *(BOOLEAN)*: Status akhir pekan (`TRUE` jika Sabtu/Minggu).
* `is_holiday` *(BOOLEAN)*: Status hari libur nasional.

### B. Tabel Dimensi Platform (`layer3_dim.dim_platform`)
Tabel dimensi master platform aplikator makanan:
* `platform_code` *(TEXT, Primary Key)*: Kode platform (`GRAB`, `SHOPEE`, `GOFOOD`).
* `platform_name` *(TEXT)*: Nama resmi platform (`GrabFood`, `ShopeeFood`, `GoFood`).
* `company_name` *(TEXT)*: Nama perusahaan (`Grab Holdings`, `Shopee / Sea Group`, `GoTo / Gojek`).
* `color_hex` *(TEXT)*: Kode warna identitas UI (`#00B14F` Grab Hijau, `#EE4D2D` Shopee Oranye, `#00AA13` GoFood Hijau).
* `default_commission_rate` *(NUMERIC(5,4))*: Tarif komisi bawaan (`0.2000` = 20%, `0.2500` = 25%).
* `settlement_type` *(TEXT)*: Periode pencairan dana (`Daily`, `Weekly`).

### C. Master Merchant Credentials (`layer3_dim.dim_merchant_credentials`)
Tabel terisolasi tempat menyimpan credential login dan akses 3 aplikator:
* `store_id` *(TEXT, Primary Key)*: ID Unik Toko dari Aplikator.
* `platform` *(TEXT)*: Aplikator (`GoFood`, `GrabFood`, `ShopeeFood`).
* `merchant_id` *(TEXT)*: Merchant ID.
* `merchant_name` *(TEXT)*: Identitas switch toko saat 1 akun login memiliki lebih dari 1 merchant.
* `nama_akses_mitra` *(TEXT)*: Nama identitas akses milik mitra.
* `email_mitra` *(TEXT)*: Email mitra.
* `email_login_go_1` & `email_login_go_2`: Email login GoFood.
* `username_mitra_orig` & `password_mitra_orig`: Credential login awal mitra.
* `shopee_username_pemilik` & `shopee_password_pemilik`: Credential Shopee Pemilik (Digunakan saat akuisisi pertama kali).
* `shopee_username_staff` & `shopee_password_staff`: Credential Shopee Staff.
* `username_superfood` & `password_superfood`: Credential SuperFood (`allvbadmin`).

### D. Master Merchant Mapping & Metadata (`layer3_dim.dim_merchant_mapping`)
Tabel master pemetaan nama cabang baku, grup resto, dan status pengakuan agency:
* `store_id` *(TEXT, Primary Key)*: ID Unik Toko dari Aplikator.
* `platform` *(TEXT)*: Aplikator (`GoFood`, `GrabFood`, `ShopeeFood`).
* `owner_name` *(TEXT)*: Nama pemilik grup usaha.
* `outlet_name` *(TEXT)*: Nama outlet induk registrasi.
* `brand` *(TEXT)*: Nama brand usaha.
* `nama_tarikan` *(TEXT)*: Nama toko mentah hasil scrape.
* `nama_resto_final` *(TEXT)*: **Nama Resto Final (Cabang Baku)** hasil grouping.
* `rekomendasi_nama_resto` *(TEXT)*: Saran nama resto dari sistem.
* `group_code` *(TEXT)*: Kode grup resto.
* `bd_pic` *(TEXT)*: **PIC Business Development** (Digunakan untuk routing Chrome Profile per BD di server scraper).
* `status` *(TEXT)*: Status pengakuan agency (`Live` = diakui agency, `Never` = pribadi/non-agency, `Churn`).
* `mapping_status` *(TEXT)*: Status peninjauan internal (`MAPPED` atau `PENDING_REVIEW`).
* `mapped_by` *(TEXT)*: Penanda siapa yang melakukan mapping (`DRAG_DROP_CANVAS`, `GSHEET_SEED`, `AUTO_DETECT`).

### E. Tabel Referensi Statis Portal Scraper (`layer3_dim.dim_portal_credentials`)
Tabel referensi statis untuk konfigurasi login scraper dan penerimaan kode OTP:
* `portal_id` *(INT, Primary Key)*: Auto-increment ID.
* `portal_code` *(TEXT)*: Kode Portal Agency / Virtual Brand (`F`, `W`, `L`, `D`, `All`, `Grab 1-6`).
* `role` *(TEXT)*: Peran akun (`Owner`, `Staff`).
* `phone_number` *(TEXT)*: **Nomor HP Rute Penerima Kode OTP (WA / SMS)**.
* `username` & `password`: Login portal scraper.
* `otp_method` *(TEXT)*: Metode verifikasi OTP (`WA` atau `SMS`).
* `notes` *(TEXT)*: Catatan cakupan agency (`VB + Agency All`, `VB + Agency Specific`).
* `bd_pic` *(TEXT)*: Routing PIC BD.

---

## 4. PROSES AUTO-DISCOVERY, GROUPING, DAN ISOLASI HAK STATUS NEVER

1. **Auto-Discovery Toko Baru**:
   * Scraper menarik data mentah ➡️ `layer2_normalize.py` berjalan ➡️ `auto_detect_new_stores.py` mendaftarkan toko baru ke `dim_merchant_mapping` dengan status `PENDING_REVIEW`.
2. **Review & Mapping di Browser**:
   * Buka Web Admin Board Miro Canvas di **`http://localhost:8005/admin`**.
   * **Toko Agency (`Live`)**: Drag kartu toko dari antrean kiri ➡️ Drop ke dalam Box Cabang Target di kanan. Status berubah menjadi `MAPPED` & `Live`.
   * **Toko Non-Agency (`Never`)**: Drag kartu toko ➡️ Drop ke dalam **Kotak Merah `NEVER / NON-AGENCY`**. Transaksi toko ini **100% terisolasi** dari view laporan BI.
3. **Isolasi Toko Berstatus `Never`**:
   * Toko yang diberi status `Never` secara otomatis diisolasi. Seluruh transaksi dari toko berstatus `Never` **100% ter-filter out** dan tidak dihitung pada view pelaporan `v_fact_transactions`.

---

## 5. LIVE SQL VIEW PELAPORAN BI (`layer3_dim.v_fact_transactions`)

SQL View live yang menyambungkan `fact_transactions` dengan seluruh dimensi dan menyajikan angka rasio komisi numerik presisi:

```sql
CREATE OR REPLACE VIEW layer3_dim.v_fact_transactions AS
SELECT 
    ft.id AS transaction_id,
    ft.external_id,
    ft.platform AS platform_name,
    dp.color_hex AS platform_color,
    ft.transaction_date,
    dd.year,
    dd.month_name_id AS bulan,
    dd.day_name_id AS hari,
    dd.is_weekend,
    ft.merchant_id AS store_id,
    COALESCE(m.nama_resto_final, ft.branch_name) AS nama_resto_final,
    m.owner_name,
    m.outlet_name,
    m.brand,
    m.group_code,
    m.bd_pic,
    m.status AS merchant_status,
    ft.status AS raw_status,
    ft.is_success,
    ft.is_cancelled,
    ft.gross_amount,
    ft.discounts,
    ft.net_sales,
    ft.commission,
    ft.ofd_fees,
    ft.revenue AS net_payout,
    -- Calculation Numeric Rates for BI Tools
    CASE WHEN ft.net_sales <> 0 THEN ROUND((ft.commission / ft.net_sales), 4) ELSE 0 END AS commission_rate,
    CASE WHEN ft.net_sales <> 0 THEN ROUND((ft.ofd_fees / ft.net_sales), 4) ELSE 0 END AS ofd_fee_rate,
    CASE WHEN ft.net_sales <> 0 THEN ROUND((ft.revenue / ft.net_sales), 4) ELSE 0 END AS payout_rate
FROM layer3_dim.fact_transactions ft
LEFT JOIN layer3_dim.dim_merchant_mapping m ON ft.merchant_id = m.store_id
LEFT JOIN layer3_dim.dim_platform dp ON UPPER(ft.platform) = dp.platform_code OR ft.platform = dp.platform_name
LEFT JOIN layer3_dim.dim_date dd ON ft.transaction_date = dd.full_date
WHERE COALESCE(m.status, 'Live') != 'Never';
```
