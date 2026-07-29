# DOKUMENTASI LENGKAP DATA WAREHOUSE & ARSITEKTUR LAYER 3 (`db_superfood`)

Dokumen ini merupakan panduan komprehensif mengenai struktur Data Warehouse, skema 3 layer, relasi antar-tabel, rincian seluruh kolom, proses pemetaan (grouping), hingga pelaporan transaksi terpadu 3 platform Online Food Delivery (OFD): **ShopeeFood, GrabFood, dan GoFood**.

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

## 2. DETAIL STRUKTUR TABEL SCHEMA `layer3_dim`

---

### A. Tabel Dimensi Kalender (`layer3_dim.dim_date`)
Tabel dimensi waktu standar (2020 s/d 2030) yang digunakan untuk analisis tren waktu:

* **`date_key`** *(INT, Primary Key)*: Format YYYYMMDD (misal: `20260728`).
* **`full_date`** *(DATE, Unique)*: Tanggal lengkap (misal: `2026-07-28`).
* **`year`** *(INT)*: Tahun (misal: `2026`).
* **`quarter`** *(INT)*: Kuartal ke (1 s/d 4).
* **`quarter_name`** *(TEXT)*: Nama kuartal (`Q1`, `Q2`, `Q3`, `Q4`).
* **`month_number`** *(INT)*: Bulan (1 s/d 12).
* **`month_name_id`** *(TEXT)*: Nama bulan Bahasa Indonesia (`Januari`, `Februari`, dst).
* **`month_name_en`** *(TEXT)*: Nama bulan Bahasa Inggris (`January`, `February`, dst).
* **`week_of_year`** *(INT)*: Minggu ke dalam tahun.
* **`day_of_month`** *(INT)*: Hari dalam bulan (1 s/d 31).
* **`day_of_week`** *(INT)*: Hari dalam minggu (1 = Senin, 7 = Minggu).
* **`day_name_id`** *(TEXT)*: Nama hari (`Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`, `Sabtu`, `Minggu`).
* **`is_weekend`** *(BOOLEAN)*: Status akhir pekan (`TRUE` jika Sabtu/Minggu).
* **`is_holiday`** *(BOOLEAN)*: Status hari libur nasional.

---

### B. Tabel Dimensi Platform (`layer3_dim.dim_platform`)
Tabel dimensi master platform aplikator makanan:

* **`platform_code`** *(TEXT, Primary Key)*: Kode platform (`GRAB`, `SHOPEE`, `GOFOOD`).
* **`platform_name`** *(TEXT)*: Nama resmi platform (`GrabFood`, `ShopeeFood`, `GoFood`).
* **`company_name`** *(TEXT)*: Nama perusahaan (`Grab Holdings`, `Shopee / Sea Group`, `GoTo / Gojek`).
* **`color_hex`** *(TEXT)*: Kode warna identitas UI (`#00B14F` Grab Hijau, `#EE4D2D` Shopee Oranye, `#00AA13` GoFood Hijau).
* **`default_commission_rate`** *(NUMERIC(5,4))*: Tarif komisi bawaan (`0.2000` = 20%, `0.2500` = 25%).
* **`settlement_type`** *(TEXT)*: Periode pencairan dana (`Daily`, `Weekly`).

---

### C. Master Merchant Credentials (`layer3_dim.dim_merchant_credentials`)
Tabel terisolasi tempat menyimpan credential login dan akses 3 aplikator (mengakomodasi 100% kolom Vercel Sheet & Credential Sheet):

* **`store_id`** *(TEXT, Primary Key)*: ID Unik Toko dari Aplikator.
* **`platform`** *(TEXT)*: Aplikator (`GoFood`, `GrabFood`, `ShopeeFood`).
* **`merchant_id`** *(TEXT)*: Merchant ID.
* **`merchant_name`** *(TEXT)*: Identitas switch toko saat 1 akun login memiliki lebih dari 1 merchant.
* **`nama_akses_mitra`** *(TEXT)*: Nama identitas akses milik mitra.
* **`email_mitra`** *(TEXT)*: Email mitra.
* **`email_login_go_1`** *(TEXT)*: Email FoodMaster1 (Login GoFood).
* **`email_login_go_2`** *(TEXT)*: Email FoodMaster2 (Login GoFood).
* **`username_mitra_orig`** *(TEXT)*: Username login awal mitra (GoFood/GrabFood).
* **`password_mitra_orig`** *(TEXT)*: Password login awal mitra.
* **`hp_mitra`** *(TEXT)*: Nomor HP akses mitra.
* **`peran_mitra`** *(TEXT)*: Peran akses mitra (`Owner`/`Staff`).
* **`shopee_username_pemilik`** *(TEXT)*: Username Shopee Pemilik (Digunakan saat akuisisi pertama kali).
* **`shopee_password_pemilik`** *(TEXT)*: Password Shopee Pemilik (Digunakan saat akuisisi pertama kali).
* **`shopee_username_staff`** *(TEXT)*: Username Shopee Staff.
* **`shopee_password_staff`** *(TEXT)*: Password Shopee Staff.
* **`nama_akses_superfood`** *(TEXT)*: Nama akses SuperFood.
* **`username_superfood`** *(TEXT)*: Username SuperFood (`allvbadmin`).
* **`hp_superfood`** *(TEXT)*: Nomor HP `allvbadmin`.
* **`password_superfood`** *(TEXT)*: Password SuperFood.
* **`peran_superfood`** *(TEXT)*: Peran akses SuperFood.

---

### D. Master Merchant Mapping & Metadata (`layer3_dim.dim_merchant_mapping`)
Tabel master pemetaan nama cabang baku, grup resto, dan status pengakuan agency:

* **`store_id`** *(TEXT, Primary Key)*: ID Unik Toko dari Aplikator.
* **`platform`** *(TEXT)*: Aplikator (`GoFood`, `GrabFood`, `ShopeeFood`).
* **`owner_name`** *(TEXT)*: Nama pemilik grup usaha.
* **`outlet_name`** *(TEXT)*: Nama outlet induk registrasi.
* **`brand`** *(TEXT)*: Nama brand usaha.
* **`nama_tarikan`** *(TEXT)*: Nama toko mentah hasil scrape.
* **`nama_resto_final`** *(TEXT)*: **Nama Resto Final (Cabang Baku)** hasil grouping.
* **`rekomendasi_nama_resto`** *(TEXT)*: Saran nama resto dari sistem.
* **`group_code`** *(TEXT)*: Kode grup resto.
* **`bd_pic`** *(TEXT)*: **PIC Business Development** (Digunakan untuk routing Chrome Profile per BD di server scraper).
* **`status`** *(TEXT)*: Status pengakuan agency:
  * **`Live`**: Toko resmi diakui dan dikelola agency SuperFood.
  * **`Never`**: Toko pribadi mitra yang **tidak diikutsertakan** (100% ter-filter out dari laporan).
  * **`Churn`**: Toko yang sudah berhenti berlangganan.
* **`mapping_status`** *(TEXT)*: Status peninjauan internal (`MAPPED` atau `PENDING_REVIEW`).
* **`mapped_by`** *(TEXT)*: Penanda siapa yang melakukan mapping (`DRAG_DROP_CANVAS`, `GSHEET_SEED`, `AUTO_DETECT`).
* **`live_date`**, **`churn_date`**, **`billing_cycle`**, **`fee`**, **`notes`**: Metadata operasional.

---

### E. Tabel Referensi Statis Portal Scraper (`layer3_dim.dim_portal_credentials`)
Tabel referensi statis untuk konfigurasi login scraper dan penerimaan kode OTP:

* **`portal_id`** *(INT, Primary Key)*: Auto-increment ID.
* **`portal_code`** *(TEXT)*: Kode Portal Agency / Virtual Brand (`F`, `W`, `L`, `D`, `All`, `Grab 1-6`).
* **`role`** *(TEXT)*: Peran akun (`Owner`, `Staff`).
* **`phone_number`** *(TEXT)*: **Nomor HP Rute Penerima Kode OTP (WA / SMS)**.
* **`username`** *(TEXT)*: Username login portal scraper (`superfoodapp`, `wonderfoodapp`, `allvbadmin`).
* **`password`** *(TEXT)*: Password login portal scraper.
* **`otp_method`** *(TEXT)*: Metode verifikasi OTP (`WA` atau `SMS`).
* **`notes`** *(TEXT)*: Catatan cakupan agency (`VB + Agency All`, `VB + Agency Specific`).
* **`bd_pic`** *(TEXT)*: Routing PIC BD.

---

### F. Unified Fact Table Transaksi (`layer3_dim.fact_transactions`)
Tabel fakta utama yang menyatukan transaksi detail 3 aplikator (91,955 baris):

* **`id`** *(BIGINT, Primary Key)*: Auto-increment ID transaksi.
* **`platform`** *(TEXT)*: Aplikator (`GrabFood`, `ShopeeFood`, `GoFood`).
* **`external_id`** *(TEXT)*: ID transaksi resmi dari aplikator (Unique constraint per platform).
* **`transaction_date`** *(DATE)*: Tanggal transaksi.
* **`created_on`** *(TIMESTAMP)*: Waktu transaksi detail.
* **`year`**, **`month`**, **`week`**, **`hour`**: Elemen dimensi waktu.
* **`merchant_id`** *(TEXT)*: Foreign Key ke `dim_merchant_mapping(store_id)`.
* **`group_code`** *(TEXT)*: Kode grup resto.
* **`outlet_name`** *(TEXT)*: Nama outlet registrasi.
* **`branch_name`** *(TEXT)*: **Nama Resto Final (Cabang Baku)**.
* **`store_name`** *(TEXT)*: Nama toko mentah scraper.
* **`status`** *(TEXT)*: Status mentah dari aplikator (`completed`, `Transferred`, `Completed`, `Sukses`, `cancelled`).
* **`is_success`** *(INTEGER)*: **`1` jika transaksi sukses/selesai**, `0` jika batal/lainnya.
* **`is_cancelled`** *(INTEGER)*: **`1` jika transaksi dibatalkan**, `0` jika sukses.
* **`gross_amount`** *(NUMERIC(15,2))*: Harga kotor makanan sebelum diskon.
* **`discounts`** *(NUMERIC(15,2))*: Total diskon yang ditanggung toko.
* **`net_sales`** *(NUMERIC(15,2))*: **Omzet bersih toko** (`gross_amount` - `discounts`).
* **`commission`** *(NUMERIC(15,2))*: Potongan komisi resmi aplikator.
* **`ofd_fees`** *(NUMERIC(15,2))*: Total potongan platform (Komisi + Biaya Iklan/Promosi).
* **`revenue`** *(NUMERIC(15,2))*: **Net Payout** (Dana bersih yang ditransfer ke rekening).
* **`gmv_vs_ofd_commission`**, **`gmv_vs_ofd_fees`**, **`gmv_vs_revenue`**: Persentase rasio terhadap GMV.

---

### G. Tabel Fakta Agregat Harian (`layer3_dim.fact_daily_merchant_performance`)
Tabel fakta agregat harian yang menghitung performa per toko & platform secara instant (14,101 baris):

* **`performance_id`** *(INT, Primary Key)*: Auto-increment ID.
* **`date_key`** *(INT)*: Foreign Key ke `dim_date(date_key)`.
* **`transaction_date`** *(DATE)*: Tanggal transaksi.
* **`store_id`** *(TEXT)*: Foreign Key ke `dim_merchant_mapping(store_id)`.
* **`platform`** *(TEXT)*: Aplikator (`GrabFood`, `ShopeeFood`, `GoFood`).
* **`total_orders`** *(INT)*: Total pesanan masuk.
* **`completed_orders`** *(INT)*: Total pesanan sukses.
* **`cancelled_orders`** *(INT)*: Total pesanan batal.
* **`total_gross_sales`** *(NUMERIC(15,2))*: Akumulasi harga kotor.
* **`total_discounts`** *(NUMERIC(15,2))*: Akumulasi diskon.
* **`total_net_sales`** *(NUMERIC(15,2))*: Akumulasi omzet bersih.
* **`total_commission`** *(NUMERIC(15,2))*: Akumulasi komisi aplikator.
* **`total_ofd_fees`** *(NUMERIC(15,2))*: Akumulasi potongan platform.
* **`total_net_payout`** *(NUMERIC(15,2))*: Akumulasi net payout.
* **`aov`** *(NUMERIC(15,2))*: **Average Order Value** (Rata-rata nilai transaksi per pesanan sukses).

---

### H. Live SQL View Pelaporan BI (`layer3_dim.v_fact_transactions`)
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

---

## 3. MEKANISME GROUPING & UNIFIED STATUS 3 APLIKATOR

### A. Matriks Penyelarasan Status Aplikator
Stored procedure `refresh_fact_transactions()` menyamakan seluruh istilah status mentah ke dalam flag biner:

```text
  ShopeeFood: "completed"  ──┐
  GrabFood  : "Transferred" ┼──> is_success = 1, is_cancelled = 0 (COMPLETED)
  GrabFood  : "Completed"   │
  GoFood    : "Sukses"     ──┘

  ShopeeFood: "cancelled"  ──┐
  GrabFood  : "Cancelled"  ──┴──> is_success = 0, is_cancelled = 1 (CANCELLED)
```

### B. Hasil Penyelarasan Status Live di Server Database:
* **84,920 transaksi sukses** (Shopee 62,652; Grab 19,530 + 2,741; GoFood 5,997) ➡️ `is_success = 1`.
* **985 transaksi batal** (Shopee 673; Grab 312) ➡️ `is_cancelled = 1`.
* **50 transaksi proses/lainnya** (Shopee 2; Grab 48) ➡️ `is_success = 0`, `is_cancelled = 0`.

---

## 4. ALUR OPERASIONAL DRAG & DROP MAPPING WEB ADMIN (`http://localhost:8005/admin`)

1. **Auto-Discovery Toko Baru**:
   * Scraper menarik data mentah ➡️ `layer2_normalize.py` berjalan ➡️ `auto_detect_new_stores.py` mendaftarkan toko baru ke `dim_merchant_mapping` dengan status `PENDING_REVIEW`.
2. **Review & Mapping di Browser**:
   * Buka Web Admin Board Miro Canvas di **`http://localhost:8005/admin`**.
   * **Toko Agency (`Live`)**: Drag kartu toko dari antrean kiri ➡️ Drop ke dalam Box Cabang Target di kanan. Status berubah menjadi `MAPPED` & `Live`.
   * **Toko Non-Agency (`Never`)**: Drag kartu toko ➡️ Drop ke dalam **Kotak Merah `NEVER / NON-AGENCY`**. Transaksi toko ini **100% terisolasi** dari view laporan BI.
   * **Edit Nama Cluster**: Klik tombol `Edit Nama` pada bingkai cluster untuk mengubah nama cabang baku secara kolektif.
   * **Reset / Batal**: Klik tombol `x` pada chip toko untuk membatalkan mapping dan mengembalikan toko ke antrean `PENDING_REVIEW`.
