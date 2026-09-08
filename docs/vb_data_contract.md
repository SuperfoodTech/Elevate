# Virtual Brand Data Contract

**Status:** Agreed working contract  
**Scope:** Virtual Brand (VB) only  
**Last updated:** 7 September 2026

## Purpose

Dokumen ini menjadi kontrak knowledge untuk konsumsi data VB di Elevate. Elevate hanya mengonsumsi hasil proses dari spreadsheet dan tidak melakukan mapping ulang, kalkulasi ulang COGS, atau pembahasan Agency/Hybrid.

## Source

Sumber utama adalah published CSV dari spreadsheet VB:

<https://docs.google.com/spreadsheets/d/e/2PACX-1vSg_QZ5ad7X0xNXc9PDSxvSHfJ8XM0Z_qFz1VISdJkvkGHfoHWizYhg6MyMQLcgzPzASa8Mf1z_ORNs/pub?gid=0&single=true&output=csv>

Karakteristik sumber:

- CSV bersifat append-only.
- Baris lama dianggap data mati dan tidak berubah.
- Data baru ditambahkan setiap minggu, umumnya hari Senin.
- Elevate melakukan konsumsi mingguan.
- Elevate juga menyediakan tombol manual untuk menjalankan sinkronisasi baru.

## Business Meaning

- Kolom `Outlet` adalah nama brand VB.
- Satu brand VB mewakili satu mitra pembayaran.
- `Merchant ID` adalah ID portal merchant pada platform GoFood, GrabFood, atau ShopeeFood.
- `COGS` adalah dasar pembayaran mitra.
- `Transfer ID = 0` berarti tidak ada transaksi valid untuk dihitung; COGS-nya dianggap nol dan tidak masuk recap pembayaran.
- Status kosong dari sumber, khususnya GoFood, dianggap valid sebagai kondisi sumber dan tidak menjadi filter tambahan.
- `Order ID Duplicate = 1` berarti order unik.

## Payment Detail Contract

Detail pembayaran untuk mitra VB menggunakan struktur pivot berikut.

### Rows

Urutan dimensi:

1. Kolom F — `Date`
2. Kolom H — `Channel / Application`
3. Kolom P — `Long Order ID` / Order ID bisnis
4. Kolom Q — `Transfer ID` tanpa label khusus

### Values

- Kolom AB — `COGS`
- Agregasi: `SUM`

### Filters

- Kolom F — tanggal antara tanggal mulai dan tanggal akhir.
- Kolom I — `Outlet`/brand VB yang dipilih melalui dropdown.
- Kolom R — hanya nilai kosong atau `Partial Refund`.
- `Transfer ID = 0` tidak dihitung sebagai transaksi pembayaran valid.

Tidak ada filter tambahan berdasarkan kolom `Status`.

## Import Strategy

Import menggunakan pola append-only:

```text
Scheduled sync setiap Senin
atau
Manual Sync New Rows
        ↓
Fetch CSV terbaru
        ↓
Parse dan validasi
        ↓
Insert hanya baris baru
        ↓
Refresh recap view/materialized view
```

Initial seed dilakukan satu kali. Sync berikutnya tidak melakukan seed ulang dan tidak mengubah transaksi lama.

Karena published CSV tidak menyediakan cursor incremental yang dapat diandalkan, sistem boleh membaca seluruh CSV setiap sync. Idempotency dilakukan di database, bukan dengan mengandalkan nomor baris spreadsheet.

## Idempotency

Import harus aman jika dijalankan berulang kali.

Unique key minimum yang digunakan untuk mengenali transaksi:

```text
Application + Long Order ID + Transfer ID
```

Jika key sudah ada:

- jangan insert ulang;
- tandai sebagai skipped/duplicate pada import log.

Jika key belum ada:

- insert sebagai baris baru.

Database wajib memiliki unique constraint atau mekanisme `insert-if-not-exists` untuk mencegah duplikasi saat tombol sync ditekan lebih dari satu kali atau dijalankan bersamaan.

## Recommended Persistence

### Import Batch

Simpan metadata setiap proses sync:

- `import_id`
- trigger: `scheduled` atau `manual`
- source URL
- waktu mulai dan selesai
- jumlah row terbaca
- jumlah row baru
- jumlah row dilewati
- status proses
- pesan error jika ada

### Raw Transaction

Simpan data sumber yang diterima untuk audit, termasuk:

- `import_id`
- nomor baris sumber
- seluruh kolom CSV
- waktu import

### Normalized VB Transaction

Minimal menyimpan:

- tanggal
- aplikasi/channel
- outlet/brand VB
- Long Order ID
- Transfer ID
- Context
- COGS
- valid payment flag
- alasan pengecualian jika tidak valid

Data dengan `Transfer ID = 0` tetap boleh disimpan sebagai histori sumber, tetapi `valid payment flag` harus bernilai false.

## Recap View

Recap dapat dibuat sebagai normal view terlebih dahulu. Materialized view dapat digunakan jika query recap menjadi berat atau hasil mingguan perlu dibekukan.

Logika dasarnya:

```sql
SELECT
  transaction_date,
  application,
  order_id,
  transfer_id,
  SUM(cogs) AS total_cogs
FROM vb_transactions
WHERE transaction_date BETWEEN :from_date AND :to_date
  AND outlet = :outlet
  AND (context IS NULL OR context = 'Partial Refund')
  AND transfer_id <> '0'
GROUP BY
  transaction_date,
  application,
  order_id,
  transfer_id;
```

## Out of Scope

Dokumen ini tidak mencakup:

- Agency calculation;
- Hybrid netting;
- Owner hierarchy;
- Agency fee;
- COGS recalculation;
- Outlet grouping atau mapping ulang;
- perubahan data lama dari spreadsheet.

