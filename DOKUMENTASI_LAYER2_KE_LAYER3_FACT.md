# DOKUMENTASI STRUKTUR DAN METODOLOGI TRANSFORMASI LAYER 2 (CLEAN STAGING) KE LAYER 3 (FACT TRANSACTIONS)

Dokumen ini menyajikan spesifikasi teknis mengenai struktur skema `layer2_clean`, mekanisme ETL, aturan transformasi finansial, matriks lineage per platform, serta dokumentasi perubahan terkini pada tabel utama **`layer3_dim.fact_transactions`**.

---

## 1. PENDAHULUAN DAN ARSITEKTUR PIPELINE

Proses transformasi dari Layer 2 (`layer2_clean`) ke Layer 3 (`layer3_dim`) bertugas mengubah data transaksi individual yang sudah dibersihkan (*clean staging*) menjadi **Unified Fact Table (`fact_transactions`)** yang siap digunakan untuk analisis statistik, agregasi BI, dan laporan audit keuangan.

```text
========================================================================================
                 FLOW DATA TRANSFORMASI LAYER 2 KE LAYER 3
========================================================================================

  [LAYER 2 CLEAN STAGING]
  ├── stg_shopee_orders (63,327 baris) ──┐
  ├── stg_grab_orders   (38,094 baris) ──┼──> [STORED PROCEDURE: refresh_fact_transactions()]
  └── stg_go_orders     (5,997 baris)  ──┘                   │
                                                             ▼
                                                [dim_merchant_mapping] (Lookup Nama Baku)
                                                             │
                                                             ▼
                                             [LAYER 3 UNIFIED FACT TABLE]
                                             layer3_dim.fact_transactions (91,955 baris)
```

---

## 2. STRUKTUR SKEMA TABEL LAYER 2 CLEAN STAGING

### A. Tabel Staging ShopeeFood (`layer2_clean.stg_shopee_orders`)
Menampung 63,327 baris transaksi ShopeeFood yang telah dibersihkan dari titik pemisah ribuan:
* `month` *(TEXT)*: Bulan transaksi (`YYYY-MM`).
* `store_id` *(TEXT)*: ID Unik Toko Shopee.
* `store_name` *(TEXT)*: Nama Resto Baku / Tarikan.
* `transaction_type` *(TEXT)*: Tipe transaksi.
* `order_id` *(TEXT)*: No Pesanan Shopee.
* `complete_time` *(TEXT)*: Timestamp penyelesaian pesanan (`YYYY-MM-DD at HH:MM`).
* `status` *(TEXT)*: Status mentah pesanan (`completed`, `cancelled`, `processing`).
* `food_original_price` *(NUMERIC)*: Harga kotor makanan sebelum diskon.
* `item_discounts`, `flash_sale_discount`, `surcharge_fee`, `merchant_voucher_deals_subsidy`, `platform_flash_sale_subsidy`, `food_voucher_subsidy`, `food_direct_discount`, `transaction_amount`, `checkout_murah_price` *(NUMERIC)*.
* `net_sales` *(NUMERIC)*: Omzet bersih (`food_original_price - item_discounts - flash_sale_discount`).
* `commission` *(NUMERIC)*: Komisi Shopee 25% (`transaction_amount * 0.25`).
* `revenue` *(NUMERIC)*: Pendapatan bersih (`transaction_amount - commission`).

---

### B. Tabel Staging GrabFood (`layer2_clean.stg_grab_orders`)
Menampung 38,094 baris transaksi GrabFood yang telah di-deduplikasi dari Auto-Chargeback:
* `long_order_id` *(TEXT)*: ID Pesanan Utama GrabFood.
* `short_order_id`, `booking_id`, `order_channel`, `order_type`, `payment_method` *(TEXT)*.
* `created_on`, `updated_on`, `transfer_date` *(TEXT)*: Timestamp transaksi (`YYYY-MM-DD at HH:MM`).
* `status` *(TEXT)*: Status mentah pesanan (`Transferred`, `Completed`, `Cancelled`).
* `amount` *(NUMERIC)*: Harga kotor pesanan.
* `discount_merchant_funded` *(NUMERIC)*: Diskon yang ditanggung toko.
* `delivery_fee_discount_merchant_funded` *(NUMERIC)*: Subsidi ongkir toko.
* `net_sales` *(NUMERIC)*: Omzet bersih Grab (`amount + discount_merchant_funded + delivery_fee_discount_merchant_funded`).
* `order_commission` *(NUMERIC)*: Komisi resmi GrabFood.
* `marketing_success_fee` *(NUMERIC)*: Biaya iklan/promosi platform.
* `total` *(NUMERIC)*: Net Payout setelah penyesuaian chargeback.

---

### C. Tabel Staging GoFood (`layer2_clean.stg_go_orders`)
Menampung 5,997 baris transaksi individual GoFood dari tab `Go`:
* `period_id` *(TEXT)*: No Pesanan GoFood (`Order ID` `F-xxx`).
* `month` *(TEXT)*: Bulan transaksi (`YYYY-MM`).
* `date` *(DATE)*: Tanggal transaksi (`YYYY-MM-DD`).
* `transaction_time` *(TIMESTAMP)*: **Timestamp lengkap waktu transaksi (Termasuk Jam & Menit)**.
* `store_id` *(TEXT)*: Merchant ID GoFood.
* `store_name` *(TEXT)*: Nama Resto Baku / Tarikan.
* `gross_sales` *(NUMERIC)*: Nilai transaksi kotor (`Amount`).
* `commission_fee` *(NUMERIC)*: Komisi resmi GoFood (`Total Fee`).
* `marketing_fee_and_discount` *(NUMERIC)*: Diskon & Promosi (`GoFood Discount + Voucher Commission`).
* `total_platform_deduction` *(NUMERIC)*: Total Potongan Platform (`Amount - Net Amount`).
* `net_sales` *(NUMERIC)*: Pendapatan bersih (`Net Amount`).

---

## 3. MATRIKS PEMETAAN TRANSFORMASI LAYER 2 KE LAYER 3 FACT TRANSACTIONS

| Kolom Target `fact_transactions` | Tipe Data | Sumber GrabFood (`stg_grab_orders`) | Sumber ShopeeFood (`stg_shopee_orders`) | Sumber GoFood (`stg_go_orders`) | Aturan Transformasi & Logika Bisnis |
|---|---|---|---|---|---|
| **`platform`** | TEXT | `'GrabFood'` | `'ShopeeFood'` | `'GoFood'` | Penanda platform aplikator. |
| **`external_id`** | TEXT | `long_order_id` | `order_id` | `period_id` (Order ID `F-xxx`) | Natural Primary Key transaksi. |
| **`transaction_date`** | DATE | Parsed `created_on` | Parsed `complete_time` | `date` | Tanggal resmi transaksi (`YYYY-MM-DD`). |
| **`created_on`** | TIMESTAMP | `TO_TIMESTAMP(created_on)` | `TO_TIMESTAMP(complete_time)` | `transaction_time` | Timestamp lengkap transaksi (Termasuk Jam). |
| **`year`** | INTEGER | `EXTRACT(YEAR FROM created_on)` | `EXTRACT(YEAR FROM complete_time)` | `EXTRACT(YEAR FROM transaction_time)` | Tahun transaksi. |
| **`month`** | TEXT | `month` (`YYYY-MM`) | `month` (`YYYY-MM`) | `month` (`YYYY-MM`) | Bulan transaksi. |
| **`week`** | TEXT | Format `YY-MM-W` || `week` | Format `YY-MM-W` || `week` | Format `YY-MM-W` || `week` | Kode minggu transaksi. |
| **`hour`** | INTEGER | `EXTRACT(HOUR FROM created_on)` | `EXTRACT(HOUR FROM complete_time)` | `EXTRACT(HOUR FROM transaction_time)` | **Jam transaksi nyata (0 s/d 23)**. |
| **`merchant_id`** | TEXT | `store_id` | `store_id` | `store_id` | Foreign Key ke `dim_merchant_mapping(store_id)`. |
| **`group_code`** | TEXT | `m.group_code` | `m.group_code` | `m.group_code` | Kode grup resto dari mapping. |
| **`outlet_name`** | TEXT | `COALESCE(m.outlet_name, merchant_name)` | `COALESCE(m.outlet_name, store_name)` | `COALESCE(m.outlet_name, store_name)` | Nama outlet registrasi. |
| **`branch_name`** | TEXT | `COALESCE(m.nama_resto_final, nama_tarikan)` | `COALESCE(m.nama_resto_final, nama_tarikan)` | `COALESCE(m.nama_resto_final, nama_tarikan)` | **Nama Resto Final (Cabang Baku)**. |
| **`store_name`** | TEXT | `store_name` | `store_name` | `store_name` | Nama toko mentah scraper. |
| **`status`** | TEXT | `status` | `status` | `'Sukses'` | Teks status mentah dari aplikator. |
| **`is_success`** | INTEGER | `1` jika `status` Transferred/Completed | `1` jika `status` completed | `1` jika pesanan valid | **Flag `1` jika transaksi sukses**. |
| **`is_cancelled`** | INTEGER | `1` jika `status` Cancelled | `1` jika `status` cancelled | `0` | **Flag `1` jika transaksi batal**. |
| **`gross_amount`** | NUMERIC | `amount` | `food_original_price` | `gross_sales` (`Amount`) | Harga kotor pesanan sebelum diskon. |
| **`discounts`** | NUMERIC | `discount_merchant_funded` | `item_discounts + flash_sale + subsidies` | `0.00` | Diskon yang ditanggung toko. |
| **`delivery_discount`** | NUMERIC | `delivery_fee_discount_merchant_funded` | `0.00` | `0.00` | Subsidi ongkir merchant. |
| **`net_sales`** | NUMERIC | `net_sales` | `net_sales` | `gross_sales` (`Amount`) | **Omzet bersih toko** (`net_sales = Amount`). |
| **`marketing_fee`** | NUMERIC | `marketing_success_fee` | `food_voucher_subsidy` | `marketing_fee_and_discount` | **Promosi (`GoFood Discount + Voucher Comm`)**. |
| **`commission`** | NUMERIC | `order_commission` | `commission` (25%) | `commission_fee` (`Total Fee`) | Komisi resmi aplikator. |
| **`ofd_fees`** | NUMERIC | `order_commission + marketing_success_fee` | `commission` | `total_platform_deduction` | **Potongan Platform (`Amount - Net Amount`)**. |
| **`revenue`** | NUMERIC | `total` | `revenue` | `net_sales` (`Net Amount`) | **Net Payout (Dana Bersih Ditransfer)**. |
| **`raw_record_id`** | BIGINT | `id` | `id` | `id` | Foreign Key audit ke baris Layer 2. |

---

## 4. DOKUMENTASI PERUBAHAN & PENYESUAIAN LINEAGE TERKINI

Berdasarkan audit rujukan `docs/data_processing_and_normalization.md` dan `docs/layer3_fact_order_lineage.md`, beberapa penyesuaian utama telah diterapkan pada stored procedure `refresh_fact_transactions()` dan script normalisasi `layer2_normalize.py`:

### A. Perbaikan Timestamp & Jam GoFood (`created_on` & `hour`)
* **Masalah Sebelum Perubahan**: Waktu transaksi GoFood dipotong menjadi `DATE`, menyebabkan seluruh timestamp bertuliskan `00:00:00` dan `hour = 0`.
* **Solusi & Perubahan**: Mengurai string ISO-8601 `raw_go."Transaction Time"` (`2026-07-22T18:11:49+07:00`) secara utuh menggunakan `TIMESTAMPTZ::TIMESTAMP`.
* **Hasil**: **5,902 dari 5,997 transaksi GoFood** memiliki jam transaksi nyata (`hour` berkisar 1 s/d 23).

### B. Perbaikan Formula Finansial GoFood (Sesuai Lineage Tab `Order`)
1. **`net_sales`**: Diubah dari `Net Amount` menjadi `Amount` (`gross_sales`), menyesuaikan dengan standar laporan Tab `Order`.
2. **`marketing_fee`**: Diubah dari `Merchant Promo Contribution` (yang selalu 0) menjadi `GoFood Discount + Voucher Commission` (2,894 baris memiliki nilai promosi riil).
3. **`ofd_fees`**: Dihitung dari `Amount - Net Amount` sebagai total potongan platform resmi.
4. **`revenue`**: Diambil dari `Net Amount` (payout dana bersih ke rekening).

### C. Mekanisme Upsert Integrity (`ON CONFLICT DO UPDATE`)
Perintah `ON CONFLICT (platform, external_id)` pada stored procedure `refresh_fact_transactions()` kini memperbarui **seluruh kolom finansial dan dimensi** (`gross_amount`, `net_sales`, `marketing_fee`, `commission`, `ofd_fees`, `revenue`, `created_on`, `hour`, `status`, `is_success`, `is_cancelled`), sehingga jika terjadi koreksi data di Layer 1/2, data lama di Layer 3 otomatis ter-update.

---

## 5. PEMBUKTIAN EMPIRIS HASIL AUDIT DATABASE

Eksekusi script verifikasi pada server PostgreSQL (`165.232.165.241`) membuktikan bahwa seluruh kriteria penerimaan lineage telah terpenuhi 100%:

```text
===================================================================
🔍 [AUDIT ACCEPTANCE CRITERIA LAYER 3 FACT TRANSACTIONS]:
===================================================================
 1. Bad GoFood ID (date|store) Count : 0 (Kriteria: 0)
 2. GoFood Rows with Real Hours (hour != 0) : 5,902 / 5,997
 3. Sample Verification GoFood:
    • Order ID : F-3145535106 | Created On: 2026-03-01 19:01:02 (Hour: 19)
      - Gross Amount = 102,000.00 | Net Sales = 102,000.00 (Equal: True)
      - Marketing Fee= 20,400.00 (GoFood Discount + Voucher Commission)
      - Commission   = 17,320.00 (Total Fee)
      - OFD Fees     = 37,720.00 (Amount - Net Amount = 102000 - 64280)
      - Revenue      = 64,280.00 (Net Amount)

 4. Total Fact Transactions Row Count : 91,955
===================================================================
```
