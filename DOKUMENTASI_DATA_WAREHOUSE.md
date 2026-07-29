# DOKUMENTASI LENGKAP ARSITEKTUR DATA WAREHOUSE (LAYER 1 - LAYER 3)

Dokumen ini menyajikan panduan arsitektur data pipeline, skema data warehouse, proses pemetaan (mapping & grouping), hingga pelaporan data transaksi terpadu dari 3 platform Online Food Delivery (OFD): **ShopeeFood, GrabFood, dan GoFood**.

---

## 1. PENDAHULUAN DAN TUJUAN SISTEM

Sistem Data Warehouse SuperFood dirancang untuk menyelesaikan 3 tantangan utama bisnis OFD:
1. **Heterogenitas Data Mentah**: Setiap aplikator (GrabFood, ShopeeFood, GoFood) memiliki struktur kolom, penamaan status, dan istilah keuangan yang berbeda-beda.
2. **Standardisasi Nama Resto (Grouping)**: Menggabungkan berbagai variasi penamaan outlet mentah hasil scrape ke dalam **Nama Resto Final (Cabang Baku)**.
3. **Pengelolaan Hak Agency vs Non-Agency**: Memilah toko yang diakui sebagai agency SuperFood (`Live`) dengan toko pribadi mitra yang tidak diikutsertakan (`Never`).

---

## 2. ARSITEKTUR END-TO-END DATA PIPELINE

Sistem mengadopsi arsitektur Data Warehouse 3 Layer berbasis PostgreSQL:

```text
========================================================================================
                               ARSITEKTUR DATA PIPELINE
========================================================================================

  [1. SCRAPER ENGINE] (GrabFood, ShopeeFood, GoFood)
           │
           ▼
  [2. LAYER 1: RAW DATA LAKE] (schema: layer1_raw)
      ├── raw_shopee (63,327 baris)
      ├── raw_grab   (38,128 baris)
      └── raw_go     (6,620 baris)
           │
           ▼
  [3. LAYER 2: CLEAN STAGING] (schema: layer2_clean)
      ├── stg_shopee_orders (Deduplikasi & Pembersihan Tipe Data)
      ├── stg_grab_orders   (Normalisasi Kolom & Tanggal)
      └── stg_go_orders     (Normalisasi Audit Periodik)
           │
           ├───> [AUTO-DISCOVERY ENGINE] ───> Mendaftarkan Store Baru (PENDING_REVIEW)
           │                                                │
           │                                                ▼
           │                               [WEB ADMIN DRAG & DROP BOARD]
           │                               (http://localhost:8005/admin)
           │                                                │
           ▼                                                ▼
  [4. LAYER 3: STAR SCHEMA & GROUPING] (schema: layer3_dim)
      ├── dim_merchant_credentials   (Master Credentials Login)
      ├── dim_merchant_mapping       (Master Pemetaan Cabang Baku & Status Live/Never)
      ├── dim_portal_credentials     (Acuan Statis Portal & Rute OTP WA/SMS)
      ├── dim_platform & dim_date    (Dimensi Platform & Kalender)
      ├── fact_transactions          (Fakta Transaksi Detail: 91,955 baris)
      ├── fact_daily_merchant_performance (Agregat Harian: 14,101 baris)
      └── v_fact_transactions        (Live SQL View Pelaporan BI)
```

---

## 3. RINCIAN LAYER DATA

### A. Layer 1: Raw Data Lake (`layer1_raw`)
Layer 1 berfungsi sebagai tempat penampungan mentah (*landing zone*) dari file CSV/Excel hasil penarikan scraper tanpa mengubah isi data aslinya.
* **`layer1_raw.raw_shopee`**: Menampung 63,327 baris transaksi mentah ShopeeFood.
* **`layer1_raw.raw_grab`**: Menampung 38,128 baris transaksi mentah GrabFood.
* **`layer1_raw.raw_go`**: Menampung 6,620 baris transaksi mentah GoFood.

---

### B. Layer 2: Clean Staging (`layer2_clean`)
Layer 2 melakukan proses *Extract-Transform-Load (ETL)* awal untuk menyamakan tipe data, menghapus duplikasi transaksi, serta menghitung saldo bersih.
* **`layer2_clean.stg_shopee_orders`**: Membersihkan tanggal `complete_time`, mengubah nilai harga makanan, komisi, dan omzet bersih menjadi tipe angka `NUMERIC`.
* **`layer2_clean.stg_grab_orders`**: Melakukan deduplikasi berdasarkan `long_order_id`, mengurai format tanggal Grab (`YYYY-MM-DD at HH24:MI`), serta mengkalkulasi total potongan OFD.
* **`layer2_clean.stg_go_orders`**: Menyusun agregat periode transaksi GoFood per store ID.

---

### C. Layer 3: Star Schema & Dimension Tables (`layer3_dim`)
Layer 3 merupakan pusat kebenaran data bisnis (*single source of truth*) yang siap dikonsumsi oleh BI tools dan laporan manajemen.

#### 1. Master Merchant Credentials (`layer3_dim.dim_merchant_credentials`)
Menyimpan data login dan akun akses secara terisolasi dan aman:
* `store_id` (Primary Key)
* `platform`: Aplikator (GoFood / GrabFood / ShopeeFood)
* `merchant_name`: Identitas switch toko jika 1 akun login memiliki banyak toko.
* `email_login_go_1` & `email_login_go_2`: Email login GoFood.
* `username_mitra_orig` & `password_mitra_orig`: Credential login awal mitra.
* `shopee_username_pemilik` & `shopee_password_pemilik`: Credential Shopee Pemilik (digunakan saat akuisisi pertama).
* `shopee_username_staff` & `shopee_password_staff`: Credential Shopee Staff.
* `username_superfood` & `password_superfood`: Credential SuperFood (`allvbadmin`).

#### 2. Master Merchant Mapping (`layer3_dim.dim_merchant_mapping`)
Menyimpan hasil grouping dan status pengakuan toko:
* `store_id` (Primary Key)
* `platform`: Aplikator.
* `owner_name`: Nama pemilik grup resto.
* `outlet_name`: Nama outlet induk registrasi.
* `nama_tarikan`: Nama toko mentah hasil scrape.
* `nama_resto_final`: Nama Resto Final (Cabang Baku) hasil grouping.
* `status`: Status resto (`Live` = diakui agency, `Never` = pribadi/non-agency, `Churn`).
* `group_code`: Kode grup resto.
* `bd_pic`: PIC Business Development (untuk alokasi Chrome Profile server).
* `mapping_status`: Status peninjauan internal (`MAPPED` atau `PENDING_REVIEW`).

#### 3. Referensi Portal & OTP (`layer3_dim.dim_portal_credentials`)
Tabel referensi statis untuk konfigurasi login scraper:
* `portal_code`: Kode portal (`F`, `W`, `L`, `D`, `All`, `Grab 1-6`).
* `role`: Peran akun (`Owner`, `Staff`).
* `phone_number`: Nomor HP rute penerima kode OTP.
* `otp_method`: Metode pengiriman verifikasi OTP (`WA` atau `SMS`).
* `username` & `password`: Login portal scraper.

---

## 4. PROSES GROUPING, AUTO-DISCOVERY, DAN HAK STATUS NEVER

```text
========================================================================================
                   ALUR AUTO-DISCOVERY DAN MAPPING TOKO
========================================================================================

 Scraper Menarik Data ──> Ingest Layer 1 & 2 ──> Auto-Discovery Script Running
                                                          │
                                                          ▼
  [Web Admin Board (Drag & Drop UI)] <── Store Terdaftar sebagai PENDING_REVIEW
  (http://localhost:8005/admin)
           │
           ├─── (Option A: Drag & Drop ke Box Cabang Target) ──> status = 'Live', nama_resto_final = Baku
           │                                                     (Transaksi Masuk Laporan Agency)
           │
           └─── (Option B: Drag & Drop ke Box NEVER) ──────────> status = 'Never'
                                                                 (Transaksi 100% Ter-filter Out)
```

### A. Otomasi Penemuan Toko Baru (Auto-Discovery)
Setiap kali script `layer2_normalize.py` selesai dieksekusi, sistem secara otomatis menjalankan `auto_detect_new_stores.py`. Script ini membandingkan seluruh Store ID pada data transaksi Layer 1 dengan tabel `dim_merchant_mapping`. Toko baru yang belum terdaftar langsung di-insert dengan status **`PENDING_REVIEW`**.

### B. Web Admin Board Drag & Drop (`http://localhost:8005/admin`)
Tim internal mengelola antrean toko baru melalui Web Admin Board:
* **Drag & Drop ke Cabang Target**: Kartu toko dari panel `Unmapped Store Queue` ditarik dan dilepas ke dalam kotak cabang target (misal: Kotak `Citraland`). Status otomatis berubah menjadi `Live` dan `nama_resto_final` ter-update.
* **Drag & Drop ke Box NEVER**: Toko yang tidak didaftarkan mitra ke agency dilepas ke dalam **Kotak Merah `NEVER`**.
* **Edit Nama Cluster**: Pengguna dapat mengubah nama cluster cabang target kapan saja.
* **Fitur Batal / Reset**: Mengklik tombol `x` pada chip toko yang sudah ter-mapping akan mengembalikan toko tersebut ke antrean `PENDING_REVIEW`.

### C. Isolasi Toko Berstatus `Never`
Toko yang diberi status `Never` secara otomatis diisolasi. Seluruh transaksi dari toko berstatus `Never` **100% ter-filter out** dan tidak dihitung pada view pelaporan `v_fact_transactions`.

---

## 5. TABEL FAKTA DAN STANDARDISASI STATUS

### A. Standardisasi Status 3 Aplikator
Aplikator memiliki istilah status yang berbeda-beda. Stored procedure `refresh_fact_transactions()` menyelaraskan status tersebut ke dalam 2 flag biner baku:

| Platform | Teks Status Mentah Scraper | Status Baku Standardized | Flag `is_success` | Flag `is_cancelled` |
|---|---|---|---|---|
| **GoFood** | `"Sukses"` | **COMPLETED** | **`1`** | **`0`** |
| **GrabFood** | `"Transferred"` | **COMPLETED** | **`1`** | **`0`** |
| **GrabFood** | `"Completed"` | **COMPLETED** | **`1`** | **`0`** |
| **GrabFood** | `"Cancelled"` | **CANCELLED** | **`0`** | **`1`** |
| **GrabFood** | `"Unknown"` | **OTHER** | **`0`** | **`0`** |
| **ShopeeFood** | `"completed"` | **COMPLETED** | **`1`** | **`0`** |
| **ShopeeFood** | `"cancelled"` | **CANCELLED** | **`0`** | **`1`** |
| **ShopeeFood** | `"processing"` | **PROCESSING** | **`0`** | **`0`** |

### B. Definisi Istilah Keuangan Terpadu
1. `gross_amount`: Harga kotor makanan sebelum diskon.
2. `discounts`: Total potongan harga yang ditanggung toko (*merchant funded discount*).
3. `net_sales`: Omzet bersih penjualan (`gross_amount` minus `discounts`).
4. `commission`: Komisi resmi aplikator.
5. `ofd_fees`: Total potongan platform (Komisi + Biaya Pemasaran / Promosi).
6. `revenue`: Net payout (dana bersih yang ditransfer oleh aplikator).

### C. Ringkasan Fakta Data Terintegrasi Saat Ini
* **`layer3_dim.fact_transactions`**: Menampung **91,955 baris transaksi detail** dari ketiga platform.
* **`layer3_dim.fact_daily_merchant_performance`**: Menampung **14,101 baris ringkasan harian** per toko dan platform untuk performa dashboard sub-second.
* **`layer3_dim.v_fact_transactions`**: View SQL live pelaporan BI dengan Total Net Sales terhitung sebesar **Rp 1,824,029,712.93**.

---

## 6. PANDUAN QUERY UTAMA UNTUK DAKSHBOARD & BI TOOLS

### Query 1: Laporan Omzet & Komisi Per Nama Resto Final (Cabang Baku)
```sql
SELECT 
    branch_name AS nama_resto_final,
    platform,
    COUNT(*) AS total_transaksi,
    SUM(gross_amount) AS total_gross_sales,
    SUM(net_sales) AS total_net_sales,
    SUM(commission) AS total_komisi_ofd,
    SUM(revenue) AS total_net_payout
FROM layer3_dim.v_fact_transactions
WHERE merchant_status = 'Live'
GROUP BY branch_name, platform
ORDER BY total_net_sales DESC;
```

### Query 2: Ringkasan Performa Harian Per Platform
```sql
SELECT 
    transaction_date,
    platform,
    SUM(completed_orders) AS total_order_sukses,
    SUM(total_net_sales) AS total_omzet_harian,
    SUM(total_commission) AS total_komisi_harian
FROM layer3_dim.fact_daily_merchant_performance
GROUP BY transaction_date, platform
ORDER BY transaction_date DESC, platform;
```

### Query 3: Cek Toko Yang Masih Butuh Review Mapping
```sql
SELECT 
    store_id,
    platform,
    nama_tarikan,
    created_at
FROM layer3_dim.dim_merchant_mapping
WHERE mapping_status = 'PENDING_REVIEW'
ORDER BY created_at DESC;
```
