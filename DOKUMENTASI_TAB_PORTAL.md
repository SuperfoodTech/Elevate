# Panduan dan Dokumentasi Tab Elevate Merchant Portal

Dokumen ini berisi panduan teknis dan operasional untuk setiap tab, sub-menu, dan modul navigasi pada portal Elevate. Dokumen ini ditujukan bagi pengembang sistem, tim operasional, tim data/analis, dan tim finance.

---

## 1. Arsitektur Hierarki 4-Tier Portal

Elevate menyusun seluruh entitas bisnis kuliner dalam hierarki 4 tingkat (*4-tier hierarchy*):

```text
[Tier 1] Owner (Pemilik Resto / Mitra Utama)
   │
   └──► [Tier 2] Brand (Merek Dagang / Kategori Bisnis)
           │
           └──► [Tier 3] Outlet (Cabang Fisik / Lokasi Dapur)
                   │
                   └──► [Tier 4] Listing (Toko Online per Platform: GoFood, GrabFood, ShopeeFood)
```

1. **Owner (Tier 1)**: Entitas legal/individu pemilik modal atau restoran.
2. **Brand (Tier 2)**: Identitas merek dagang yang dipasarkan ke konsumen.
3. **Outlet (Tier 3)**: Alamat fisik atau unit dapur operasional tempat pesanan diolah.
4. **Listing (Tier 4)**: Toko online yang terdaftar pada platform pesan-antar (Store ID / Group ID unik per aplikator).

---

## 2. Rincian Dokumentasi per Grup Tab

---

### A. Grup HOME

#### Tab Dashboard (`/dashboard`)
- **Berkas Kode**: [DashboardPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/DashboardPage.tsx)
- **Tujuan & Fungsi**:
  - Halaman beranda eksekutif yang menampilkan ringkasan performa bisnis secara menyeluruh dalam 3 detik pertama.
  - Memantau metrik hero: Gross Sales (omzet bruto), Total Orders, Net Sales (pencairan bersih), dan Split-fee Ratio antara Elevate dan mitra.
- **Komponen Utama**:
  - Kartu KPI Utama dengan indikator delta persentase perbandingan minggu lalu.
  - Grafik tren omzet harian dan mingguan.
  - Distribusi pesanan berdasarkan platform aplikator (GoFood, GrabFood, ShopeeFood).
- **Sumber Data**:
  - Layer 3 Unified Views PostgreSQL (`v_finance_reconciliation`, `v_order_overview`) dan REST API backend (`/api/dashboard/*`).

---

### B. Grup MERCHANT

#### 1. Tab Owner (`/owners` & `/owners/:id`)
- **Berkas Kode**:
  - Daftar: [OwnersPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OwnersPage.tsx)
  - Detail: [OwnerDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OwnerDetailPage.tsx)
- **Tujuan & Fungsi**:
  - Mengelola data profil pemilik restoran, nomor kontak WhatsApp, alamat email, serta entitas bisnis di bawah naungannya.
  - Melakukan segmentasi grade mitra (A, B, C, D) berdasarkan volume outlet dan jumlah listing aktif.
  - Mengatur penanda status VIP untuk pemilik dengan performa tinggi atau relasi strategis.
- **Model Bisnis Owner**:
  - Ditentukan dari agregasi seluruh brand di bawah naungan pemilik:
    - `Agency`: jika seluruh brand bertipe Agency.
    - `Virtual Brand`: jika seluruh brand bertipe Virtual Brand (VB).
    - `Hybrid`: jika pemilik memiliki kombinasi brand Agency dan Virtual Brand sekaligus.
- **Sumber Data**:
  - Sinkronisasi DBR Google Sheets (`elevate_dbr_raw_csv`) dan database relasional backend.

#### 2. Tab Brand (`/brands` & `/brands/:id`)
- **Berkas Kode**:
  - Daftar: [BrandsPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/BrandsPage.tsx)
  - Detail: [BrandDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/BrandDetailPage.tsx)
- **Tujuan & Fungsi**:
  - Mengelola katalog merek dagang yang beroperasi.
  - Memantau rata-rata pesanan harian (*Avg Orders / Hari*), total pesanan mingguan, jumlah cabang outlet fisik, dan status operasional brand.
  - Mendeteksi listing yang membutuhkan peninjauan tim operasional (*Need Review*).
- **Penentuan Model Bisnis Brand**:
  - **Menggunakan kolom `Tipe` dari data master DBR**:
    - `Virtual Brand`: baris DBR pada kolom `Tipe` bernilai `VB` atau memuat teks `virtual`.
    - `Agency`: baris DBR pada kolom `Tipe` bernilai `Agency`.
    - `Hybrid`: jika suatu brand memiliki variasi listing yang menggabungkan kedua tipe tersebut.
  - *Catatan Penting*: Kolom `Model` pada spreadsheet DBR mencerminkan status pemilik atau skema umum, sedangkan kolom `Tipe` mencerminkan model operasional spesifik per brand.
- **Sumber Data**:
  - Master DBR Google Sheets dan integrasi live API.

#### 3. Tab Outlet (`/outlets` & `/outlets/:id`)
- **Berkas Kode**:
  - Daftar: [OutletsPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OutletsPage.tsx)
  - Detail: [OutletDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OutletDetailPage.tsx)
- **Tujuan & Fungsi**:
  - Mengelola titik lokasi fisik dapur/restoran, alamat operasional lengkap, nomor telepon operasional dapur, dan jam operasional.
  - Memetakan berapa banyak listing online yang beroperasi di dapur tersebut (cloud kitchen multi-brand).
- **Sumber Data**:
  - Master DBR Google Sheets.

#### 4. Tab Listing (`/listings` & `/listings/:id`)
- **Berkas Kode**:
  - Daftar: [ListingsPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/ListingsPage.tsx)
  - Detail: [ListingDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/ListingDetailPage.tsx)
- **Tujuan & Fungsi**:
  - Menginventarisasi seluruh etalase digital toko online di GoFood, GrabFood, dan ShopeeFood.
  - Memvalidasi Store ID, Group ID, link publik ke halaman restoran, status listing (Active, Inactive, Unregistered, Review), serta data rekening bank pencairan.
  - Memfasilitasi direct link bagi tim operasional untuk membuka aplikasi consumer side aplikator.
- **Sumber Data**:
  - Master DBR Google Sheets.

---

### C. Grup OPERATIONS

#### 1. Tab Transaction (`/transactions`)
- **Berkas Kode**:
  - Eksplorer: [TransactionExplorerPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/TransactionExplorerPage.tsx)
  - Detail Transaksi Umum: [TransactionDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/TransactionDetailPage.tsx)
  - Detail Transaksi Virtual Brand: [VBTransactionDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/VBTransactionDetailPage.tsx)
- **Sub-Menu Tab**:
  1. **Sub-Menu Agency (`/transactions?tab=agency`)**:
     - Mengaudit transaksi dari restoran mitra reguler (agensi).
     - Menampilkan nomor order, waktu pesanan, nominal kotor, potongan komisi aplikator, dan pencairan bersih.
  2. **Sub-Menu Virtual Brand (`/transactions?tab=vb`)**:
     - Mengaudit transaksi khusus dapur virtual brand.
     - Menyertakan rincian pembagian hasil (split revenue share antara Elevate dan mitra dapur/pemilik).
- **Fitur Khusus**:
  - Filter rentang tanggal, status pesanan (Completed, Cancelled), filter aplikator, dan pencarian nomor order/transaksi.

#### 2. Tab Settlement (`/settlement`)
- **Berkas Kode**: [PerformaComparisonPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/PerformaComparisonPage.tsx)
- **Tujuan & Fungsi**:
  - Membandingkan antara estimasi pendapatan transaksi di aplikasi dengan transfer riil yang masuk ke rekening bank mitra.
  - Membantu rekonsiliasi selisih dana (dispute, potongan penalti, atau penyesuaian promo aplikator).

---

### D. Grup FINANCE

#### 1. Tab Billing (`/payments`, `/rekap-tagihan-billing`)
- **Berkas Kode**: [RekapBillingPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/RekapBillingPage.tsx)
- **Tujuan & Fungsi**:
  - Mengelola siklus penagihan biaya manajemen Elevate kepada pemilik restoran.
- **Mode Tampilan**:
  1. **Rekap Tagihan (Summary)**:
     - Tabel rekapitulasi per outlet/owner berdasarkan siklus mingguan (*Weekly*) atau bulanan (*Monthly*).
     - Kolom: Jumlah Order Sukses, Biaya per Order, Subtotal Tagihan, Penyesuaian, Total Tagihan, Status Pembayaran (Lunas, Pending, Belum Bayar), Tanggal Transfer, dan Link Bukti Transfer.
  2. **Kalkulator Rincian Harian (Daily Calculator)**:
     - Alat simulasi audit harian per owner untuk rentang tanggal tertentu.
     - Menghitung jumlah pesanan per hari, tarif dasar, biaya penyesuaian agensi, dan biaya Klikit.
- **Sumber Data**:
  - Endpoint API `/api/rekap-tagihan-billing` dan `/api/rekap-tagihan/owners`.

#### 2. Modul Finance Lainnya (Staging / Roadmap)
- **Disbursement (`/finance/disbursement`)**: Jadwal dan eksekusi pencairan dana hasil penjualan ke pemilik rekening mitra.
- **Reconciliation (`/finance/reconciliation`)**: Pencocokan otomatis mutasi bank (BCA, Mandiri, BRI, Superbank) dengan data laporan settlement aplikator.
- **Account Receivable (`/finance/account-receivable`)**: Pemantauan piutang tagihan jasa yang belum dilunasi oleh mitra.

---

### E. Grup REPORT & ANALYTICS

#### 1. Tab Weekly Report & Laporan Performa (`/reports`, `/laporan-performa`)
- **Berkas Kode**: [LaporanPerformaPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/LaporanPerformaPage.tsx)
- **Tujuan & Fungsi**:
  - Analisis mendalam kinerja penjualan per periode (Bulanan, Mingguan, Harian).
  - Dilengkapi selektor periode dinamis:
    - **Aturan Periode Mingguan**: Minggu pertama pada suatu bulan dihitung mulai hari **Senin pertama** bulan tersebut.
    - **Urutan Kronologis**: Periode diurutkan secara runut dari bulan/tahun terlama ke terbaru.
- **Metrik yang Dianalisis**:
  - Omzet Kotor, Omzet Bersih, Total Pesanan, Rata-rata Keranjang Belanja (*Basket Size*), dan Performa per Brand.

#### 2. Tab Rangkuman (`/rangkuman`)
- **Berkas Kode**: [RangkumanPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/RangkumanPage.tsx)
- **Tujuan & Fungsi**:
  - Ikhtisar ringkas multi-dimensi performa restoran untuk konsumsi laporan pimpinan/stakeholder.

#### 3. Tab Laporan Jam Ramai (`/laporan-jam-ramai`)
- **Berkas Kode**: [LaporanJamRamaiPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/LaporanJamRamaiPage.tsx)
- **Tujuan & Fungsi**:
  - Matriks visual (heatmap) intensitas pesanan per jam operasional (00.00 - 23.00) dan per hari (Senin - Minggu).
  - Mengidentifikasi jam sibuk (*peak hours*) untuk optimasi jadwal kerja staf dapur dan penyusunan promo waktu tertentu.

#### 4. Tab Order Status (`/order-sukses-vs-batal`)
- **Berkas Kode**: [OrderStatusPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OrderStatusPage.tsx)
- **Tujuan & Fungsi**:
  - Analisis tingkat keberhasilan pesanan (*Success Rate*) versus tingkat pembatalan (*Cancellation Rate*).
  - Mengelompokkan alasan pembatalan (stok habis, resto tutup, kendala driver) untuk audit operasional outlet.

---

### F. Grup TOOLS, DOCUMENTS & SYSTEM

- **Bot (`https://bot.byfoodmaster.com`)**: Tautan eksternal ke tools otomasi operasional dan bot notifikasi WhatsApp/Telegram.
- **Menu (`https://menu.byfoodmaster.com`)**: Tautan eksternal ke aplikasi manajemen katalog menu dan resep.
- **Promo (`/operations/promo`)**: Pengelolaan kalender promo dan co-funding diskon aplikator.
- **KKS (`/operations/kks`)**: Manajemen dokumen Kesepakatan Kerjasama Operasional.
- **Proposal (`/operations/esign-proposal`)**: Penandatanganan digital dokumen proposal kerjasama dengan mitra baru.
- **Settings & System Health (`/system/settings`, `/system/system-health`)**: Pengaturan profil portal dan pemantauan konektivitas basis data/API backend.

---

## 3. Matriks Referensi Berkas dan URL Rute

| Nama Tab / Modul | Rute URL Portal | Berkas Komponen Utama | Sumber Data Utama |
|---|---|---|---|
| Dashboard | `/dashboard` | [DashboardPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/DashboardPage.tsx) | API Layer 3 PostgreSQL |
| Owner | `/owners` | [OwnersPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OwnersPage.tsx) | DBR Google Sheets & API |
| Owner Detail | `/owners/:id` | [OwnerDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OwnerDetailPage.tsx) | DBR Google Sheets & API |
| Brand | `/brands` | [BrandsPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/BrandsPage.tsx) | DBR (Kolom Tipe) |
| Brand Detail | `/brands/:id` | [BrandDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/BrandDetailPage.tsx) | DBR (Kolom Tipe) |
| Outlet | `/outlets` | [OutletsPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OutletsPage.tsx) | DBR Google Sheets |
| Outlet Detail | `/outlets/:id` | [OutletDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OutletDetailPage.tsx) | DBR Google Sheets |
| Listing | `/listings` | [ListingsPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/ListingsPage.tsx) | DBR Google Sheets |
| Listing Detail | `/listings/:id` | [ListingDetailPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/ListingDetailPage.tsx) | DBR Google Sheets |
| Transaction (Agency) | `/transactions?tab=agency` | [TransactionExplorerPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/TransactionExplorerPage.tsx) | Layer 3 Transactions API |
| Transaction (VB) | `/transactions?tab=vb` | [TransactionExplorerPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/TransactionExplorerPage.tsx) | Layer 3 VB Fact API |
| Settlement | `/settlement` | [PerformaComparisonPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/PerformaComparisonPage.tsx) | Fact Transactions API |
| Billing (Summary) | `/payments` | [RekapBillingPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/RekapBillingPage.tsx) | API `/api/rekap-tagihan-billing` |
| Weekly Report | `/reports` | [LaporanPerformaPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/LaporanPerformaPage.tsx) | API Layer 3 Analytics |
| Laporan Jam Ramai | `/laporan-jam-ramai` | [LaporanJamRamaiPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/LaporanJamRamaiPage.tsx) | API Hourly Sales Fact |
| Order Status | `/order-sukses-vs-batal` | [OrderStatusPage.tsx](file:///mnt/DATA/Proyek/elevate%20project/frontend/src/pages/OrderStatusPage.tsx) | API Order Cancellation Fact |

