# Lineage Tab `Order` ke `layer3_dim.fact_transactions`

Dokumen ini menjadi spesifikasi penyesuaian tabel fact agar mengikuti tab `Order` pada workbook OFD. Sumber GoFood yang digunakan adalah tab **`Go` pada level transaksi**, bukan tab `Go AU`.

Tanggal audit: 29 Juli 2026. Audit dilakukan terhadap workbook publik dan metadata PostgreSQL server `db_superfood` secara read-only.

## 1. Kesimpulan arsitektur

Tab `Order` tidak menghitung semua nilai dari nol dan tidak menyalin seluruh baris ketiga tab secara langsung. Prosesnya terdiri dari empat jenis lineage:

1. **Kolom langsung aplikator**: nilai diambil dari tab `Go`, `Grab`, atau `Shopee` berdasarkan ID transaksi.
2. **Kolom hasil hitung tab sumber**: nilai diambil dari kolom yang sebelumnya telah dihitung di tab aplikator, terutama `Shopee!T:V` dan `Go!B:C`.
3. **Kolom hasil hitung tab `Order`**: dimensi waktu, flag sukses/batal, total OFD fee, dan rasio.
4. **Kolom dimension lookup**: nama outlet dan cabang berasal dari master outlet, bukan dari perhitungan finansial aplikator.

Di PostgreSQL, penggabungan tidak perlu menebak platform dari pola ID seperti formula spreadsheet. Setiap cabang `INSERT ... SELECT` sudah menetapkan nilai `platform`, kemudian disatukan ke `layer3_dim.fact_transactions` dengan natural key `(platform, external_id)`.

**Kontrak implementasi dokumen ini adalah `layer2_clean.stg_*` ke `layer3_dim.fact_transactions`.** Nama tab dan huruf kolom spreadsheet hanya dipakai untuk audit asal-usul nilai. SQL produksi tidak boleh bergantung pada nama tab, nomor kolom, `XLOOKUP`, atau pola ID dari Google Sheet.

## 2. Kondisi aktual PostgreSQL server

| Objek | Kondisi saat audit |
|---|---|
| `layer1_raw.raw_go` | 6.620 baris, 22 kolom mentah sesuai tab `Go` |
| `layer2_clean.stg_go_orders` | 5.997 baris |
| `layer3_dim.fact_transactions` | 91.955 baris |
| Fact GoFood | 5.997 baris; seluruh ID dimulai `F-`; tidak ada ID berbentuk `tanggal \| store` |
| Fact GrabFood | 22.631 baris |
| Fact ShopeeFood | 63.327 baris |

Walaupun data aktual berasal dari tab `Go`, struktur staging masih memakai nama warisan agregat Go AU seperti `period_id`, `date`, `gross_sales`, dan `average_order_customer`. Nama tersebut tidak menggambarkan grain aktual. `period_id` saat ini sebenarnya berisi `Order ID` GoFood.

Seluruh 5.997 baris GoFood di fact memiliki `created_on` pukul `00:00` dan `hour = 0`. Penyebabnya adalah `Transaction Time` dipotong menjadi `DATE` di Layer 2.

## 3. Master lineage seluruh kolom tab `Order`

Keterangan jenis:

- **Direct**: langsung dari kolom aplikator.
- **Source calc**: hasil formula di tab aplikator.
- **Order calc**: dihitung di tab `Order`/Layer 3.
- **Dimension**: lookup master merchant/outlet.
- **Operational**: tidak perlu menjadi metrik fact.

| Tab Order | Target fact | Jenis | GrabFood | ShopeeFood | GoFood (`Go`, bukan `Go AU`) |
|---|---|---|---|---|---|
| A `Flag` | Tidak dimuat | Operational | Penanda proses manual | Penanda proses manual | Penanda proses manual |
| B `Order ID Duplicate` | `order_id_duplicate` | Order calc | `COUNT(*) OVER (PARTITION BY external_id)` sebelum deduplikasi | Sama | Sama |
| C `Year` | `year` | Order calc | Tahun dari `created_on` | Tahun dari `created_on` | Tahun dari `Go!K` |
| D `Month` | `month` | Order calc | `YYYY-MM` dari waktu transaksi | Sama | Sama; `Go!B` juga menghitung nilai ini dari `Go!K` |
| E `Week` | `week` | Order calc | Label minggu berbasis Senin dari waktu transaksi | Sama | Sama |
| F `Date` | `transaction_date` | Order calc | Tanggal dari waktu transaksi | Sama | Tanggal dari `Go!K` |
| G `Hour` | `hour` | Order calc | Jam dari waktu transaksi | Sama | Jam dari `Go!K` |
| H `Channel` | `platform` | Warehouse constant | `'GrabFood'` | `'ShopeeFood'` | `'GoFood'` |
| I `Merchant ID` | `merchant_id` | Direct | `Grab!D` / `Merchant ID` | `Shopee!C` / `Store ID` | `Go!E` / `Merchant ID` |
| J `Outlet` | `outlet_name` | Dimension | Lookup nama toko ke master outlet | Sama | Sama |
| K `Cabang` | `branch_name` | Dimension | Lookup nama toko ke master cabang | Sama | Sama |
| L `Store Name` | `store_name` | Direct | `Grab!E` / `Store Name` | `Shopee!D` / `Store name` | `Go!D` / `Outlet name` |
| M `Created On` | `created_on` | Direct/parse | Formula sheet memakai `Grab!G` (`Updated On`); target DB disarankan memakai `Created On` | `Shopee!G` / `Complete Time` | `Go!K` / `Transaction time`, termasuk jam |
| N `Status` | `status` | Direct/source calc | `Grab!L` / `Status` | `Shopee!H` / `Status` | `Go!C`; di tab `Go` dihitung `'Sukses'` jika outlet terisi |
| O `Order Sukses` | `is_success` | Order calc | 0 jika `Cancelled`, selain itu 1, kecuali advertisement | 0 jika `Dibatalkan`, selain itu 1 | 1 untuk transaksi settlement Go yang valid |
| P `Order Batal` | `is_cancelled` | Order calc | 1 jika `Cancelled` | 1 jika `Dibatalkan` | 0 pada sumber `Go` saat ini |
| Q `Long Order ID` | `external_id` | Direct/key | `Grab!Q` / `Long Order ID` | `Shopee!F` / `Order ID` | `Go!G` / `Order ID`; fallback `Transaction ID` hanya jika Order ID kosong |
| R `Context` | `context` | Order calc | `Advertisement` jika ID hanya alfanumerik | Kosong | Kosong |
| S `Amount` | `gross_amount` | Direct | `Grab!AF` / `Amount` | `Shopee!I` / `Food original price` | `Go!I` / `Amount` |
| T `Discount (Merchant-Funded)` | `discounts` | Direct | `Grab!AL` | Kosong pada tab `Order` | Kosong pada tab `Order` |
| U `Delivery Fee Discount (Merchant-Funded)` | `delivery_discount` | Direct | `Grab!AM` | Kosong | Kosong |
| V `Net Sales` | `net_sales` | Direct/source calc | `Grab!AQ` / `Net Sales` | `Shopee!T = I - J - K` | `Go!I` / `Amount`, bukan `Go!J` |
| W `Marketing Success Fee` | `marketing_fee` | Direct/order calc | `Grab!AU` | `Shopee!O` / `Food Voucher Subsidy` | `Go!R + Go!S` = `GoFood Discount + Voucher Commission` |
| X `Order Commission` | `commission` | Direct/source calc | `Grab!AX` | `Shopee!U = 25% * Shopee!Q` | `Go!T` / `Total Fee` |
| Y `OFD Fees` | `ofd_fees` | Order calc | `net_sales - revenue` | Sama | `Go!I - Go!J` / `Amount - Net Amount` |
| Z `Total` | `revenue` | Direct/source calc | `Grab!BC` / `Total` | `Shopee!V = Q - U` | `Go!J` / `Net Amount` |
| AA `GMV vs OFD Commission` | `gmv_vs_ofd_commission` | Order calc | `commission / net_sales` | `commission / (net_sales - marketing_fee)` | `(commission - 1000) / net_sales` sesuai formula sheet |
| AB `GMV vs OFD Fees` | `gmv_vs_ofd_fees` | Order calc | `ofd_fees / net_sales` | Sama | Sama |
| AC `GMV vs Revenue` | `gmv_vs_revenue` | Order calc | `revenue / net_sales` | Sama | Sama |
| AD `Move to OE/OP` | Tidak dimuat | Operational | Penanda workflow spreadsheet | Sama | Sama |

Kolom warehouse tambahan yang tidak ada di tab `Order` tetap dipertahankan: `id`, `group_code`, `raw_record_id`, dan `updated_at`.

## 4. Lineage khusus GoFood yang harus diterapkan

### Layer 1: sumber mentah

`layer1_raw.raw_go` sudah sesuai tab `Go` dan harus menjadi satu-satunya sumber GoFood untuk fact ini.

| Target staging yang disarankan | Kolom `raw_go` |
|---|---|
| `order_id` | `COALESCE(NULLIF("Order ID", ''), NULLIF("Transaction ID", ''))` |
| `order_status` | `"Order Status"` |
| `store_name` | `"Outlet Name"` |
| `merchant_id` | `"Merchant ID"` |
| `feature` | `"Feature"` |
| `transaction_id` | `"Transaction ID"` |
| `amount` | `"Amount"` |
| `net_amount` | `"Net Amount"` |
| `transaction_time` | `"Transaction Time"` sebagai `TIMESTAMPTZ` atau `TIMESTAMP`, jangan dipotong menjadi `DATE` |
| `gofood_discount` | `"GoFood Discount"` |
| `voucher_commission` | `"Voucher Commission"` |
| `total_fee` | `"Total Fee"` |

Filter sumber saat ini hanya memasukkan `Feature = 'GO_FOOD'` dan `Order Status = 'SETTLEMENT'`. Nilai feature lain (`STATIC_QR`, `QRIS`, `GO_FOOD_AFFORDABLE`, dan `GO_FOOD_PICK_UP`) tidak masuk ke fact. Keputusan ini harus dipertahankan atau diubah secara eksplisit; jangan berubah sebagai efek samping refactor.

### Layer 2: struktur target yang disarankan

Nama `period_id` sebaiknya diganti menjadi `order_id`, sedangkan `date` diganti/ditambah `transaction_time`. Kolom agregat AU seperti `average_order_customer`, `completed_order`, `cancelled_order`, dan `total_order` tidak diperlukan untuk grain satu transaksi.

Grain:

```text
1 baris = 1 transaksi GoFood unik berdasarkan order_id
```

Deduplication:

```sql
ROW_NUMBER() OVER (
  PARTITION BY order_id
  ORDER BY transaction_time DESC, raw_record_id DESC
) = 1
```

### Layer 3: formula finansial GoFood

```sql
gross_amount  = amount
discounts     = 0
delivery_discount = 0
net_sales     = amount
marketing_fee = gofood_discount + voucher_commission
commission    = total_fee
ofd_fees      = amount - net_amount
revenue       = net_amount
```

Pada data raw yang diaudit, 2.894 baris `GO_FOOD` memiliki `GoFood Discount` bukan nol, sedangkan `Merchant Promo Contribution` dan `Voucher Commission` semuanya nol. Karena itu pemetaan server saat ini ke `Merchant Promo Contribution` membuat `marketing_fee` GoFood selalu nol dan tidak sesuai tab `Order`.

Validasi agregat menunjukkan pada 5.995 dari 6.001 baris raw `GO_FOOD`:

```text
Amount - Net Amount = Total Fee + GoFood Discount + Voucher Commission
```

Enam baris sisanya perlu toleransi pembulatan atau audit komponen potongan lain; `Amount - Net Amount` tetap menjadi sumber paling aman untuk total `ofd_fees` karena identik dengan formula tab `Order`.

## 5. Kontrak canonical Layer 2 ke Layer 3

Tabel berikut adalah acuan utama implementasi SQL. Bila berbeda dengan tabel lineage spreadsheet pada bagian sebelumnya, lakukan koreksi di Layer 2 terlebih dahulu sehingga Layer 3 hanya membaca nama kolom staging yang stabil.

| Target `fact_transactions` | `stg_grab_orders` | `stg_shopee_orders` | `stg_go_orders` target | Transformasi Layer 3 |
|---|---|---|---|---|
| `platform` | Konstanta | Konstanta | Konstanta | `'GrabFood'`, `'ShopeeFood'`, atau `'GoFood'` |
| `external_id` | `long_order_id` | `order_id` | `order_id` | Natural key bersama `platform` |
| `created_on` | `created_on` | `complete_time` | `transaction_time` | Cast menjadi timestamp |
| `transaction_date` | `created_on` | `complete_time` | `transaction_time` | Cast menjadi date |
| `year` | `created_on` | `complete_time` | `transaction_time` | `EXTRACT(YEAR ...)` |
| `month` | `created_on` | `complete_time` | `transaction_time` | Format `YYYY-MM` |
| `week` | `created_on` | `complete_time` | `transaction_time` | Formula kalender minggu yang telah disepakati |
| `hour` | `created_on` | `complete_time` | `transaction_time` | `EXTRACT(HOUR ...)` |
| `merchant_id` | Lihat catatan identitas di bawah | `store_id` | `merchant_id` | Jangan mencampur merchant account ID dengan store dimension key |
| `group_code` | `store_id` | `store_id` | `merchant_id`/store key | Lookup `dim_merchant_mapping` |
| `outlet_name` | `store_id` | `store_id` | `merchant_id`/store key | Lookup dimension; fallback nama sumber |
| `branch_name` | `store_id` | `store_id` | `merchant_id`/store key | Lookup `nama_resto_final`, lalu `nama_tarikan` |
| `store_name` | `store_name` | `store_name` | `store_name` | Direct |
| `status` | `status` | `status` | `status` | Normalisasi label dilakukan terpisah dari nilai mentah |
| `is_success` | `status`, `long_order_id` | `status` | `status` | `CASE` canonical status; advertisement tidak dihitung order |
| `is_cancelled` | `status`, `long_order_id` | `status` | `status` | `CASE` canonical status |
| `gross_amount` | `amount` | `food_original_price` | `amount` | Direct |
| `discounts` | `discount_merchant_funded` | `0`/`NULL` untuk parity tab Order | `0`/`NULL` | Direct/default |
| `delivery_discount` | `delivery_fee_discount_merchant_funded` | `0`/`NULL` | `0`/`NULL` | Direct/default |
| `net_sales` | `net_sales` | `net_sales` | `amount` | Canonical net sales sesuai laporan Order |
| `marketing_fee` | `marketing_success_fee` | `food_voucher_subsidy` | `gofood_discount + voucher_commission` | Direct/penjumlahan komponen staging |
| `commission` | `order_commission` | `commission` | `total_fee` | Direct |
| `ofd_fees` | `net_sales - total` | `net_sales - revenue` | `amount - net_amount` | Dihitung di Layer 3 |
| `revenue` | `total` | `revenue` | `net_amount` | Direct |
| `context` | ID/status transaksi | `NULL` | `NULL` | `Advertisement` untuk record Grab yang memenuhi aturan bisnis |
| `gmv_vs_ofd_commission` | Kolom fact | Kolom fact | Kolom fact | Dihitung setelah nilai finansial terisi |
| `gmv_vs_ofd_fees` | Kolom fact | Kolom fact | Kolom fact | `ofd_fees / net_sales` |
| `gmv_vs_revenue` | Kolom fact | Kolom fact | Kolom fact | `revenue / net_sales` |
| `raw_record_id` | `id` | `id` | `id` | Referensi audit ke staging |

### Catatan canonical identitas merchant dan store

Struktur sekarang memakai nama `fact_transactions.merchant_id`, tetapi isinya pada SQL server adalah `stg.store_id` dan dipakai untuk join ke `dim_merchant_mapping.store_id`. Sementara itu, tab `Order` mengambil `Grab!Merchant ID`, yang berbeda dari `Grab!Store ID`.

Target yang disarankan:

```text
store_id    = key outlet/platform untuk join dimension
merchant_id = ID akun merchant dari aplikator, bila tersedia
```

Pilihan migrasi:

1. Tambahkan `store_id` pada fact, pindahkan dimension key ke kolom tersebut, dan pertahankan `merchant_id` sesuai arti bisnisnya; atau
2. Jika belum dapat mengubah skema, dokumentasikan `merchant_id` sebagai legacy alias dari `store_id` dan jangan menganggapnya sama dengan kolom `Merchant ID` spreadsheet.

Pilihan pertama lebih aman dan menghilangkan ambiguitas pada GrabFood.

### Kontrak nama staging GoFood

Nama target di tabel canonical mengasumsikan staging GoFood telah diperbaiki. Selama migrasi, mapping sementara berikut dapat digunakan:

| Nama canonical | Nama server saat ini | Catatan |
|---|---|---|
| `order_id` | `period_id` | Isinya sudah Order ID `F-...`, hanya namanya yang salah |
| `transaction_time` | Belum ada; server hanya memiliki `date` | Harus ditambahkan dari `raw_go."Transaction Time"` |
| `merchant_id` | `store_id` | Bersumber dari `raw_go."Merchant ID"` |
| `amount` | `gross_sales` | Bersumber dari `raw_go."Amount"` |
| `net_amount` | `net_sales` | Bersumber dari `raw_go."Net Amount"`; jangan dipakai sebagai canonical `fact.net_sales` |
| `gofood_discount` | Belum ada | Tambahkan dari `raw_go."GoFood Discount"` |
| `voucher_commission` | Belum ada | Tambahkan dari `raw_go."Voucher Commission"` |
| `total_fee` | `commission_fee` | Bersumber dari `raw_go."Total Fee"` |
| `status` | Belum ada | Normalisasi settlement menjadi status bisnis `Sukses` |

## 6. Gap implementasi server terhadap tab `Order`

| Prioritas | Gap | Kondisi aktual | Target |
|---|---|---|---|
| P0 | Waktu GoFood hilang | Semua GoFood `created_on` pukul 00:00 dan `hour = 0` | Parse penuh `Transaction Time` |
| P0 | `net_sales` GoFood | Server memakai `Net Amount` | Tab `Order` memakai `Amount` |
| P0 | `marketing_fee` GoFood | Server memakai `Merchant Promo Contribution`; hasil selalu 0 | `GoFood Discount + Voucher Commission` |
| P0 | `ofd_fees` GoFood | `Total Fee + Merchant Promo Contribution` | `Amount - Net Amount` |
| P1 | Nama staging GoFood | Masih bernama seperti agregat Go AU | Gunakan nama transaksi: `order_id`, `transaction_time`, `amount`, `net_amount` |
| P1 | Formula week | SQL menggunakan format week-of-month PostgreSQL yang tidak selalu sama dengan formula Senin pada sheet | Buat satu definisi kalender dan uji silang tanggal batas bulan |
| P1 | `context` Grab | Server mengisi `Refund Adjusted`; sheet memakai `Advertisement` | Pisahkan `context` transaksi dari `adjustment_context`, atau tetapkan precedence |
| P1 | Upsert parsial | `ON CONFLICT` hanya memperbarui sebagian kolom | Perbarui seluruh kolom hasil transformasi agar koreksi lineage masuk ke record lama |
| P2 | Rasio GMV | Disimpan sebagai `TEXT` seperti `20%` | Disarankan `NUMERIC`, misalnya `0.20`; formatting persen dilakukan di BI |
| P2 | Duplicate flag | Selalu 1 setelah deduplikasi dan unique constraint | Hitung sebelum deduplikasi untuk QA, atau keluarkan dari fact utama |

## 7. Aturan penyatuan tiga aplikator di Layer 3

Gunakan tiga cabang eksplisit, bukan deteksi regex ID:

```sql
INSERT INTO layer3_dim.fact_transactions (...)
SELECT 'GrabFood',  ... FROM layer2_clean.stg_grab_orders
UNION ALL
SELECT 'ShopeeFood', ... FROM layer2_clean.stg_shopee_orders
UNION ALL
SELECT 'GoFood', ... FROM layer2_clean.stg_go_orders;
```

Implementasi dapat tetap berupa tiga `INSERT ... ON CONFLICT`, seperti fungsi saat ini. Yang wajib konsisten adalah:

- natural key `(platform, external_id)`;
- satu grain transaksi per baris;
- tipe dan tanda nilai finansial terdokumentasi;
- sumber GoFood hanya `raw_go`/tab `Go`;
- lookup merchant menggunakan `dim_merchant_mapping`;
- kolom hasil hitung dihitung di Layer 3 dengan formula yang sama untuk seluruh refresh.

## 8. Acceptance criteria penyesuaian

1. Tidak ada ID GoFood berbentuk `tanggal | store_id` di fact.
2. `external_id` GoFood berasal dari `Order ID`, dengan fallback `Transaction ID` bila kosong.
3. Jam pada `created_on` GoFood sama dengan `Transaction Time`; tidak seluruhnya 00:00.
4. Untuk sampel GoFood: `net_sales = Amount`, `revenue = Net Amount`, dan `ofd_fees = Amount - Net Amount`.
5. `marketing_fee = GoFood Discount + Voucher Commission`.
6. Rekonsiliasi per platform dan per bulan antara fact dan tab sumber lulus untuk jumlah order, gross amount, net sales, OFD fees, dan revenue.
7. Refresh kedua menghasilkan jumlah baris dan nilai yang sama—tidak membuat duplikat.
8. Seluruh field transformasi ikut diperbarui ketika terjadi `ON CONFLICT`.
