# DOKUMENTASI LENGKAP DATA WAREHOUSE & ARSITEKTUR LAYER 3 (`db_superfood`)

Dokumen ini merupakan panduan komprehensif mengenai struktur Data Warehouse, skema 3 layer, relasi antar-tabel, rincian seluruh kolom, rasionasi pembuatan tabel dimensi (`dim_*`), spesifikasi pengisian tabel unified `fact_transactions`, hingga pelaporan transaksi terpadu 3 platform Online Food Delivery (OFD): **ShopeeFood, GrabFood, dan GoFood**.

---

## 1. RASIONASI DAN ALASAN KEBERADAAN TABEL DIMENSI (`dim_*`) DI LAYER 3

Dalam arsitektur Data Warehouse berbasis **Kimball Star Schema**, data dipisahkan menjadi dua jenis tabel:
1. **Fact Tables (`fact_*`)**: Menyimpan data kejadian transaksi berukuran besar yang berisi angka-angka numerik (Omzet, Diskon, Komisi, Net Payout) yang bertambah terus-menerus.
2. **Dimension Tables (`dim_*`)**: Menyimpan konteks bisnis, acuan identitas, atribut kategoris, serta metadata operasional.

```text
========================================================================================
                      DESAIN STAR SCHEMA LAYER 3 (layer3_dim)
========================================================================================

    [dim_merchant_credentials]         [dim_portal_credentials]
    (Master Login & HP)                (Ref Portal Scraper & OTP)
            │                                     │
            ▼                                     ▼
    [dim_merchant_mapping] <───┐        [dim_platform]
    (Resto Final & Status)    │        (Hex Colors & Rates)
            │                  │                 │
            └──────────────┐   │   ┌─────────────┘
                           ▼   ▼   ▼
               [fact_transactions] (91,955 baris)
               [fact_daily_merchant_performance] (14,101 baris)
                           ▲
                           │
                     [dim_date]
                     (Dimensi Kalender 2020-2030)
```

Berikut adalah alasan teknis dan rasionasi bisnis mengapa masing-masing tabel dimensi dibuat di Layer 3:

---

### A. Alasan Keberadaan `dim_merchant_mapping`
* **Masalah Tanpa Tabel Ini**: Scraper dari GrabFood, ShopeeFood, dan GoFood menghasilkan puluhan variasi penamaan mentah untuk 1 resto yang sama (misal: `"Ayam Bakar Ori, Sawahan"`, `"Ayam Bakar Ori - Petemon"`, `"Ori - Ayam Bakar"`). Tanpa tabel ini, laporan keuangan agency tidak dapat menggabungkan omzet 1 resto dari 3 aplikator.
* **Alasan & Manfaat Utama**:
  1. **Standardisasi Nama Baku**: Menyediakan **Nama Resto Final (Cabang Baku)** yang menyatukan 3 aplikator.
  2. **Isolasi Status Pengakuan Agency**: Memisahkan resto yang diakui agency (`Live`) dengan resto pribadi mitra yang tidak diikutsertakan (`Never`).
  3. **Efisiensi Update**: Jika nama resto atau grup berubah, cukup meng-edit 1 baris di `dim_merchant_mapping` tanpa perlu mengubah puluhan ribu baris data transaksi di fact table.
  4. **Routing Operasional**: Menyimpan metadata `Group Code`, `BD PIC` (routing Chrome Profile server), `Billing Cycle`, dan `Fee`.

---

### B. Alasan Keberadaan `dim_merchant_credentials`
* **Masalah Tanpa Tabel Ini**: Jika data sensitif seperti Password, Username, Email, dan Nomor HP Mitra/SuperFood dicampur ke dalam tabel transaksi atau view pelaporan BI, data tersebut rentan bocor atau terekspos ke pengguna yang tidak berhak.
* **Alasan & Manfaat Utama**:
  1. **Keamanan & Isolasi Data Sensitive (Security Isolation)**: Mengisolasi credential login sehingga tidak pernah terekspos di dashboard visualisasi BI pelaporan omzet.
  2. **Single Source of Truth Scraper**: Menjadi sumber acuan tunggal bagi Scraper CLI untuk mengambil akses login Grab, Shopee, dan GoFood secara otomatis.
  3. **Cakupan Akses Kompleks**: Menampung 44 kolom credential termasuk akses Shopee Pemilik (akuisisi awal), Shopee Staff, dan `allvbadmin`.

---

### C. Alasan Keberadaan `dim_portal_credentials`
* **Masalah Tanpa Tabel Ini**: Sistem scraper memerlukan acuan konfigurasi statis untuk login portal Virtual Brand, penerimaan kode OTP, dan alokasi akun. Jika disimpan hardcoded di script, sistem akan sulit di-maintenance saat ada pergantian nomor HP atau akun.
* **Alasan & Manfaat Utama**:
  1. **Management Konfigurasi Scraper**: Menyimpan 20 akun acuan portal (Portal `F`, `W`, `L`, `D`, `All`, `Grab 1-6`) dan peran akun (`Owner`/`Staff`).
  2. **Rute Otomasi OTP**: Menyimpan nomor HP dan metode verifikasi OTP (`WA` atau `SMS`) untuk automasi scraper.
  3. **Fleksibilitas Operasional**: Jika ada perubahan nomor HP OTP atau penambahan BD, cukup di-update di tabel ini tanpa mengganggu data transaksi.

---

### D. Alasan Keberadaan `dim_date`
* **Masalah Tanpa Tabel Ini**: Tanggal transaksi mentah di aplikator memiliki format acak-acakan (misal: `"28 Jul 2026 11:06 PM"`, `"2026-07-28"`, `"2026-07-28 at 23:06"`). Melakukan pengelompokan tanggal dengan fungsi string parsing di SQL transaksi akan sangat lambat.
* **Alasan & Manfaat Utama**:
  1. **Dimensi Waktu Lengkap**: Menyediakan atribut kalender serba lengkap: Nama Bulan ID/EN (`Januari`/`January`), Kuartal (`Q1`-`Q4`), Nama Hari (`Senin`-`Minggu`), Penanda Akhir Pekan (`is_weekend`), dan Hari Libur (`is_holiday`).
  2. **Performance Query Sub-second**: Memungkinkan BI Tools (Metabase/Looker/PowerBI) membuat analisis tren per kuartal, per bulan, dan perbandingan hari libur vs hari kerja secara instant melalui join angka integer `date_key`.

---

### E. Alasan Keberadaan `dim_platform`
* **Masalah Tanpa Tabel Ini**: Dashboard visualisasi BI membutuhkan standar identitas warna dan tarif komisi acuan untuk setiap aplikator.
* **Alasan & Manfaat Utama**:
  1. **Standardisasi Visual UI**: Menyimpan kode warna hex resmi (`#00B14F` Grab Hijau, `#EE4D2D` Shopee Oranye, `#00AA13` GoFood Hijau) untuk konsistensi grafik di BI tools.
  2. **Acuan Tarif Komisi Default**: Menyimpan tarif komisi default (`0.2000` = 20%, `0.2500` = 25%) dan jenis settlement (`Daily`/`Weekly`).

---

## 2. INVENTARIS LENGKAP SCHEMAS & TABEL DATABASE (`165.232.165.241`)

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
