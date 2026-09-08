# **FoodMaster System Requirement — v1.0**

**Status:** Consolidated Working Baseline  
**Tanggal:** 25 Agustus 2026  
**Owner Dokumen:** CEO  
**Audience:** Operation dan Tech

## **Tujuan Dokumen**

Dokumen ini menjadi pegangan bersama untuk menjelaskan:

1. bagaimana FoodMaster mendefinisikan bisnis dan datanya;  
2. aturan bisnis yang harus dipatuhi sistem; dan  
3. kebutuhan produk teknologi yang akan dibangun.

FSR v1.0 bukan spesifikasi teknis final.

Dokumen ini sengaja dibuat ringkas dan akan berkembang mengikuti bisnis FoodMaster.

---

# **PART A — BUSINESS FOUNDATION**

## **1\. Tujuan Utama Sistem**

FoodMaster membutuhkan satu sistem internal yang menjadi **single source of truth** untuk aktivitas Agency dan Virtual Brand.

Untuk Phase 1, sistem terutama harus mampu:

* mengenali Owner, Outlet, Brand, dan akun/listing OFD dengan benar;  
* mengolah data transaksi Agency dan Virtual Brand;  
* menghitung hak dan kewajiban FoodMaster dan merchant;  
* menghasilkan weekly report;  
* melakukan monitoring settlement dan pembayaran; dan  
* memberikan dashboard operasional yang dapat dipercaya.

### **Target utama Phase 1**

> Setiap minggu FoodMaster dapat mengetahui secara otomatis siapa yang harus membayar siapa, berapa jumlahnya, berasal dari transaksi apa, dan menghasilkan laporan yang siap direview dan dikirim kepada merchant.

---

# **2\. Model Bisnis FoodMaster**

FoodMaster memiliki dua business engine utama.

## **2.1 Agency**

FoodMaster mengelola performa merchant pada:

* GoFood  
* GrabFood  
* ShopeeFood

Akun dan hasil penjualan tetap milik merchant.

Pencairan OFD diterima langsung oleh merchant.

FoodMaster mendapatkan fee berdasarkan:

**Successful Order × Agency Fee Owner**

Agency Fee tidak selalu Rp2.000.

Fee ditentukan pada level **Owner**, sehingga seluruh outlet milik Owner tersebut mengikuti fee Agency yang sama.

---

## **2.2 Virtual Brand**

FoodMaster memiliki brand dan akun OFD Virtual Brand.

Merchant berfungsi sebagai fulfillment partner.

Alur utama:

**Customer → OFD → FoodMaster → Merchant**

FoodMaster menerima settlement dari OFD dan membayarkan hak merchant berdasarkan **COGS/harga offline** yang telah disepakati.

---

## **2.3 Hybrid**

Satu Owner dapat bekerja sama dengan FoodMaster dalam Agency sekaligus Virtual Brand.

Dalam kondisi ini, FoodMaster melakukan **netting** antara:

**Hak Merchant dari VB**

dan

**Tagihan Agency**

Rumus utama:

**Net Settlement \= VB Payable − Agency Receivable ± Adjustment**

Jika:

**Net \> 0**  
FoodMaster membayar Merchant.

**Net \< 0**  
Merchant membayar FoodMaster.

**Net \= 0**  
Tidak ada pembayaran.

---

# **3\. Domain Bisnis Utama**

Struktur utama FoodMaster adalah:

**OWNER**  
↓  
**OUTLET / CABANG FISIK**  
↓  
**BRAND**  
↓  
**PLATFORM LISTING / SID**  
↓  
**TRANSACTION**

---

## **3.1 Owner**

Owner adalah pihak pemilik bisnis yang bekerja sama dengan FoodMaster.

Owner merupakan:

**commercial entity** dan **settlement entity**.

Contoh informasi:

* Nama Owner  
* Nomor WhatsApp  
* Agency Fee  
* Tanggal mulai kerja sama  
* Status kerja sama  
* Informasi pembayaran  
* Jenis hubungan dengan FoodMaster

### **Prinsip**

**1 Owner \= 1 Weekly Settlement / Report**

Walaupun Owner memiliki banyak cabang.

---

# **3.2 Outlet / Cabang Fisik**

Outlet adalah **satu lokasi fisik operasional merchant**.

Satu Owner dapat memiliki banyak outlet.

Contoh:

Owner: Pak Amir

* Kebab Amir \- Citraland  
* Kebab Amir \- Ngagel  
* Kebab Amir \- Gubeng

FoodMaster memberikan setiap outlet sebuah:

**Internal Outlet ID permanen**

Internal Outlet ID tidak berubah walaupun:

* nama outlet berubah;  
* nama rekomendasi berubah; atau  
* alamat outlet berubah.

Perubahan nama/alamat dicatat sebagai perubahan atribut outlet, bukan membuat histori transaksi lama kehilangan relasinya.

---

# **3.3 Nama Internal Outlet**

Nama internal adalah nama yang digunakan FoodMaster untuk mengenali satu cabang fisik.

Format dasarnya:

**Nama Brand Merchant \+ Patokan Lokasi**

Contoh:

**Kebab Amir \- Citraland**

Nama internal tidak bergantung pada nama yang digunakan GoFood, GrabFood, atau ShopeeFood.

Jika lokasi outlet berubah, nama internal dapat ikut berubah sesuai patokan lokasi baru.

Internal Outlet ID tetap sama.

---

# **3.4 Brand**

Satu outlet fisik dapat menjalankan lebih dari satu Brand.

Brand dibedakan menjadi:

### **Merchant Brand**

Brand asli milik merchant.

Biasanya merupakan objek pengelolaan Agency.

### **Virtual Brand**

Brand milik FoodMaster yang dijalankan oleh merchant.

Satu outlet fisik dapat menjalankan Merchant Brand dan Virtual Brand secara bersamaan.

---

# **3.5 Platform Listing**

Platform Listing adalah representasi suatu Brand/Outlet pada:

* GoFood  
* GrabFood  
* ShopeeFood

Setiap listing mempunyai **Store ID / SID** unik dari platform.

SID:

* ditentukan oleh platform;  
* bersifat unik;  
* tidak dapat diubah;  
* berfungsi sebagai technical identifier.

Namun SID **tidak dengan sendirinya menjelaskan outlet fisik mana yang diwakilinya**.

Karena itu SID harus melalui proses Outlet Grouping.

---

# **3.6 Relasi Outlet dengan SID**

Satu outlet fisik:

* dapat memiliki satu SID pada suatu platform;  
* dapat tidak memiliki SID pada suatu platform; atau  
* dapat memiliki lebih dari satu SID pada platform yang sama.

Contoh:

**Kebab Amir \- Citraland**

GoFood:

* G5  
* G7

GrabFood:

* GR2

ShopeeFood:

* S1

G5 dan G7 dapat sama-sama dianggap valid apabila keduanya memang mewakili outlet Citraland dan digunakan dalam operasional.

Sistem tidak boleh menerapkan aturan:

> satu outlet \= maksimal satu SID per platform.

---

# **4\. Outlet Grouping**

Outlet Grouping adalah proses FoodMaster untuk mengubah data listing mentah dari berbagai OFD menjadi struktur outlet yang dapat dipercaya.

Urutan operasional:

### **1\. Nama Internal**

FoodMaster mengakui terlebih dahulu cabang fisik merchant.

### **2\. Alamat**

Alamat digunakan untuk membantu mengidentifikasi lokasi fisik yang diwakili listing.

### **3\. SID**

Semua SID hasil scraping GoFood, GrabFood, dan ShopeeFood dikumpulkan.

### **4\. Nama Outlet & Rekomendasi**

Nama listing OFD saat ini dibandingkan dengan standar penamaan FoodMaster.

FoodMaster dapat memberikan rekomendasi perbaikan nama kepada merchant.

### **5\. Marking**

Menentukan lifecycle/status merchant/outlet.

### **6\. Labeling**

Menentukan prioritas pelayanan merchant.

### **7\. VB / Agency Mapping**

Menentukan hubungan listing/brand terhadap business model FoodMaster.

---

# **5\. Cara Melakukan Mapping**

Mapping tidak hanya menggunakan kemiripan nama.

PIC harus mempertimbangkan kombinasi:

* pengakuan cabang dari Owner;  
* lokasi/alamat;  
* nama outlet di platform;  
* SID;  
* keberadaan transaksi;  
* informasi operasional lain yang relevan.

Jika terdapat dua listing dengan nama mirip atau sama:

* listing yang menghasilkan transaksi menjadi evidence penting bahwa listing tersebut digunakan;  
* tetapi lebih dari satu listing dapat tetap dipetakan ke outlet fisik yang sama jika memang keduanya valid.

Listing yang tidak digunakan tidak perlu dihapus dari raw data.

Listing tersebut tetap disimpan sebagai data sumber tetapi diberi status mapping yang sesuai sehingga tidak ikut dalam perhitungan aktif.

---

# **6\. Definition of Done — Outlet Grouping**

Outlet Grouping dianggap selesai jika FoodMaster sudah mengetahui:

1. Owner siapa;  
2. cabang fisik apa saja yang diakui;  
3. nama internal masing-masing cabang;  
4. lokasi/alamat cabang;  
5. SID GoFood apa saja yang berhubungan;  
6. SID GrabFood apa saja yang berhubungan;  
7. SID ShopeeFood apa saja yang berhubungan;  
8. Marking outlet;  
9. Labeling outlet; dan  
10. mapping Agency / VB.

Setelah grouping selesai, transaksi dari berbagai platform dapat dikonsolidasikan ke Outlet ID yang benar.

---

# **7\. Marking**

Marking menunjukkan **status pengelolaan dan lifecycle Outlet / Platform Listing terhadap FoodMaster**.

Status dapat dibedakan antara **Agency Status** dan **VB Status** sesuai konteks bisnis masing-masing.

### **Live**

Skema komersial antara FoodMaster dan outlet sudah berjalan.

Status `Live` menunjukkan bahwa kerja sama komersial sudah aktif dan outlet sudah masuk ke dalam skema pengelolaan FoodMaster.

### **Active**

Status aktif pada Agency.

`Active` menunjukkan bahwa outlet tercatat aktif pada Agency, tetapi skema komersialnya belum berjalan. Dengan demikian, status `Active` tidak otomatis berarti outlet sudah `Live`.

### **Pending**

Outlet masih dalam proses dan belum mencapai status `Live`.

### **Churn**

Outlet sudah tidak lagi aktif dalam kerja sama atau pengelolaan FoodMaster.

### **Inactive**

Outlet atau listing sedang tidak aktif, tetapi masih tercatat di dalam sistem.

### **Unmanaged**

Outlet atau listing **tidak dikelola oleh FoodMaster**, tetapi ditemukan dan tetap tercatat dalam daftar **Platform Listing** milik Owner.

Contoh:

FoodMaster menemukan suatu SID milik Owner saat scraping GoFood, tetapi SID tersebut tidak termasuk outlet atau listing yang dikelola FoodMaster.

Maka:

**Agency Status \= Unmanaged**

---

## **Status yang Digunakan**

| Status | Agency | VB |
| :---- | :---- | :---- |
| Live | ✓ | ✓ |
| Active | ✓ | — |
| Pending | ✓ | ✓ |
| Churn | ✓ | ✓ |
| Inactive | ✓ | ✓ |
| Unmanaged | ✓ | — |

Marking berbeda dari:

* **Mapping Status** → menjawab SID milik outlet fisik mana;  
* **Labeling/Treatment** → VIP / Regular;  
* **Grade** → klasifikasi berdasarkan baseline order;  
* **Performance** → jumlah bulan yang achieve dibanding baseline.

Dengan demikian, suatu Platform Listing dapat **sudah berhasil dimapping ke Outlet Internal**, tetapi tetap memiliki status **Unmanaged** apabila listing tersebut tidak dikelola FoodMaster.

---

# **8\. Labeling / Treatment**

Labeling digunakan untuk menentukan **prioritas penanganan merchant**.

Nilai saat ini:

### **VIP**

Merchant mendapatkan prioritas penanganan lebih tinggi.

### **Regular**

Merchant mendapatkan treatment operasional normal.

Treatment tidak digunakan untuk menghitung performa.

---

# **9\. Outlet Grade**

Outlet Grade menggambarkan ukuran performa outlet pada saat sebelum FoodMaster melakukan pengelolaan.

Grade dihitung berdasarkan:

**Average Daily Successful Order dari baseline 3 bulan penuh terakhir sebelum bulan dimulainya kerja sama dengan FoodMaster.**

Klasifikasi:

| Avg Daily Order Baseline | Grade |
| :---- | :---- |
| ≥ 50 | A |
| 40–49 | B |
| 30–39 | C |
| 20–29 | D |
| 10–19 | E |
| \< 10 | Tidak Eligible |

Outlet dengan baseline:

**\<10 order per hari**

tidak memenuhi kriteria akuisisi Agency FoodMaster.

Grade dihitung oleh sistem berdasarkan baseline, bukan ditentukan manual oleh PIC.

---

# **10\. Performance Tracking**

Agency mempunyai masa uji coba:

**6 bulan**

Target dianggap tercapai apabila dalam masa tersebut terdapat minimal:

**3 bulan kalender bebas/tidak harus berturut-turut**

yang mencapai sekurang-kurangnya:

**\+20% terhadap baseline.**

Status Performance ditampilkan sebagai:

Less than a month

* 0x  
* 1x  
* 2x  
* 3x  
* 4x  
* 5x  
* 6x  
* dan seterusnya sesuai jumlah bulan yang mencapai minimal \+20% dari baseline

Contoh:

**2x**

berarti sudah terdapat dua bulan yang memenuhi kriteria target.

Target masa uji coba tercapai ketika mencapai minimal:

**3x**

Masa uji coba 6 bulan kemudian dapat dilanjutkan sesuai ketentuan kerja sama FoodMaster.

---

# **PART B — BUSINESS RULES**

# **11\. Agency Fee**

Agency Fee ditentukan pada:

**Owner Level**

bukan Outlet Level.

Contoh:

Owner Pak Budi \= Rp1.500 / successful order.

Seluruh outlet Agency Pak Budi menggunakan fee tersebut.

Agency Fee tidak boleh di-hardcode oleh sistem.

---

# **12\. Agency Calculation**

Perhitungan dasar:

**Successful Order × Agency Fee Owner**

Contoh:

450 Successful Orders  
Agency Fee \= Rp1.500

Agency Receivable:

**450 × Rp1.500 \= Rp675.000**

---

# **13\. Virtual Brand Calculation**

Hak merchant dihitung berdasarkan COGS/harga offline yang telah dikunci.

Merchant dapat mengajukan perubahan COGS.

Perubahan memerlukan approval FoodMaster.

Perubahan hanya berlaku sesuai tanggal efektifnya.

Data periode sebelumnya tidak dihitung ulang.

---

# **14\. Cancel dan Refund**

### **Cancelled Transaction**

Merchant tidak mendapatkan COGS.

FoodMaster juga tidak mengakui transaksi tersebut sebagai transaksi yang dibayarkan.

### **Refund**

Jika terjadi refund:

FoodMaster dapat menerima pemotongan berdasarkan harga jual kepada customer.

Pemotongan terhadap merchant dilakukan berdasarkan hak/COGS merchant yang terkait dengan transaksi tersebut.

FoodMaster menanggung perbedaan antara refund customer dan nilai COGS apabila terdapat selisih.

---

# **15\. Periode Weekly Settlement**

Periode settlement:

**Senin – Minggu**

Contoh:

Periode transaksi:

17–23 Agustus

Report dibuat:

24 Agustus

---

# **16\. Weekly Reporting**

Prinsip:

**1 Owner \= 1 Weekly Report**

Report tidak dipecah menjadi file terpisah per cabang.

Namun dalam satu report terdapat dua level utama.

### **Owner Aggregate**

Menggabungkan seluruh cabang dan platform milik Owner.

### **Outlet Breakdown**

Menampilkan detail setiap cabang.

Jika dibutuhkan untuk audit, data dapat ditelusuri lebih lanjut hingga:

**Outlet → Brand → Platform Listing → Transaction**

---

# **17\. Reporting Agency Only**

Untuk Agency Only:

Merchant menerima settlement OFD secara langsung.

FoodMaster menghitung Agency Fee.

Output:

**Merchant → FoodMaster**

---

# **18\. Reporting VB Only**

Untuk VB Only:

FoodMaster menerima uang dari OFD.

FoodMaster menghitung hak merchant berdasarkan COGS.

Output:

**FoodMaster → Merchant**

---

# **19\. Reporting Hybrid**

Untuk Hybrid:

**Net Settlement \= VB Payable − Agency Receivable ± Adjustment**

Hasil akhirnya menentukan arah pembayaran.

---

# **20\. Rule Versioning**

Aturan bisnis tidak berlaku surut.

Jika suatu aturan berubah:

* histori menggunakan aturan yang berlaku pada saat transaksi terjadi;  
* aturan baru mempunyai **Effective Date**;  
* transaksi mulai tanggal tersebut menggunakan aturan baru.

Contoh:

Agency Fee berubah dari Rp2.000 menjadi Rp1.500 pada 1 Oktober.

Transaksi sebelum 1 Oktober tetap menggunakan Rp2.000.

Transaksi mulai 1 Oktober menggunakan Rp1.500.

Prinsip ini juga berlaku pada perubahan:

* COGS;  
* Grade rule;  
* calculation rule;  
* settlement rule; dan  
* aturan bisnis lain yang bersifat historis.

---

# **PART C — PRODUCT / SYSTEM SPECIFICATION**

# **21\. Phase 1 Scope**

Phase 1 fokus kepada:

1. Master Owner  
2. Master Outlet  
3. Outlet Grouping  
4. Platform Listing / SID Mapping  
5. Agency Transaction  
6. VB Transaction  
7. Settlement  
8. Weekly Reporting  
9. Payment Reconciliation  
10. Dashboard Monitoring

---

# **22\. Master Data**

Sistem minimal memiliki:

## **Owner Master**

* Owner Name  
* Contact  
* Agency Fee  
* KKS Start Date  
* Partnership Type  
* Payment information

## **Outlet Master**

* Permanent Internal Outlet ID  
* Internal Outlet Name  
* Owner  
* Address  
* Marking  
* Labeling/Treatment  
* Grade  
* Baseline  
* Partnership status

## **Brand Master**

* Brand Name  
* Brand Type  
  * Merchant Brand  
  * Virtual Brand  
* Outlet association

## **Platform Listing**

* Platform  
* SID  
* Listing Name  
* Address from source  
* Brand  
* Outlet ID  
* Mapping Status  
* Active/Unused status

---

# **23\. Outlet Grouping Workspace**

Sistem perlu menyediakan workspace untuk PIC melakukan mapping.

Ideal flow:

**Raw Platform Listing**

↓

**System Recommendation**

↓

**PIC Review**

↓

**Verified Mapping**

↓

**Outlet Master**

Sistem boleh memberikan rekomendasi berdasarkan:

* nama;  
* alamat;  
* transaksi;  
* mapping historis; dan  
* informasi lain yang tersedia.

Namun keputusan akhir mapping pada fase awal tetap melalui PIC.

---

# **24\. Data Sources**

## **Agency**

Data berasal dari scraping:

* GoFood  
* GrabFood  
* ShopeeFood

Frekuensi:

**H-1**

## **Virtual Brand**

Sumber utama:

**Trx / Order Log**

Frekuensi utama saat ini:

**Mingguan**

---

# **25\. Data Normalization**

Data mentah setiap platform tidak digunakan langsung untuk perhitungan settlement.

Data harus dinormalisasi terlebih dahulu.

Minimal transaksi dapat dikenali berdasarkan:

* Owner  
* Internal Outlet ID  
* Brand  
* Platform  
* SID  
* Order ID  
* Transaction Date  
* Transaction Status  
* Gross Sales  
* Successful Order  
* Business Type  
* COGS jika VB

Field final mengikuti hasil data mapping masing-masing sumber.

---

# **26\. Data Flow**

Alur utama:

**Raw OFD / VB Data**

↓

**Ingestion**

↓

**Normalization**

↓

**SID / Outlet Mapping**

↓

**Owner & Brand Mapping**

↓

**Transaction Database**

↓

**Business Rule Engine**

↓

**Weekly Settlement**

↓

**Report**

↓

**Payment Reconciliation**

↓

**Dashboard**

---

# **27\. Settlement Status**

Minimal status settlement:

### **Draft**

Perhitungan sedang dibuat.

### **Need Review**

Terdapat data atau mapping yang belum valid.

### **Approved**

Sudah disetujui internal.

### **Sent**

Laporan sudah dikirim.

### **Waiting Payment**

Merchant harus membayar FoodMaster.

### **Waiting Disbursement**

FoodMaster harus membayar merchant.

### **Paid**

Pembayaran selesai.

### **Overdue**

Merchant melewati batas waktu pembayaran.

---

# **28\. Human Control**

Pada Phase 1:

**Generate → Review → Approve → Send**

Tidak semua proses langsung dibuat fully automatic.

Tujuannya adalah memastikan sistem stabil terlebih dahulu.

Automation dapat ditingkatkan setelah accuracy sistem terbukti.

---

# **29\. Payment ReconciliationTidak semua proses langsung dibuat fully automatic.**

# 

# **Tujuannya adalah memastikan sistem stabil terlebih dahulu.**

# 

# **Automation dapat ditingkatkan setelah accuracy sistem terbukti.**

Jika:

**Merchant → FoodMaster**

sistem membantu:

* monitoring due date;  
* payment matching;  
* outstanding;  
* overdue;  
* confirmation;  
* payment evidence.

Jika:

**FoodMaster → Merchant**

sistem mencatat:

* nominal;  
* tanggal transfer;  
* status;  
* bukti transfer.

---

# **30\. Dashboard Minimum**

Dashboard awal harus dapat menunjukkan:

## **Owner**

* Total Owner  
* Agency Only  
* VB Only  
* Hybrid

## **Outlet**

* Total Outlet  
* Live  
* Active  
* Pending  
* Churn  
* Inactive  
* Unmanaged  
* Grade  
* VIP / Regular

## **Agency Performance**

* Baseline  
* Current Performance  
* Less than a month / 0x / 1x / 2x / 3x / 4x / 5x / dan seterusnya

## **Transaction**

* Successful Agency Order  
* VB Transaction

## **Finance**

* Agency Receivable  
* VB Payable  
* Net Settlement  
* Outstanding  
* Paid  
* Overdue

## **Reporting**

* Draft  
* Need Review  
* Ready  
* Approved  
* Sent  
* Waiting Payment  
* Waiting Disbursement  
* Completed

---

# **31\. Exception Handling**

Sistem harus mendeteksi kondisi seperti:

* scraping gagal;  
* data platform belum tersedia;  
* transaction duplicate;  
* SID baru;  
* SID belum ter-mapping;  
* listing tidak dapat dikenali;  
* Owner tidak ditemukan;  
* Outlet ID tidak ditemukan;  
* Agency Fee belum tersedia;  
* COGS belum tersedia;  
* refund;  
* cancelled transaction;  
* platform terlambat memberikan data;  
* mapping berubah;  
* perhitungan settlement berubah setelah report dibuat.

Exception tidak boleh diam-diam diteruskan ke settlement final.

Status diarahkan menjadi:

**Need Review**

---

# **32\. Role Pengguna Awal**

### **CEO**

Melihat keseluruhan operasi dan performa.

### **Business Manager**

Monitoring Owner, Outlet, Performance dan aktivitas tim.

### **Outlet PIC**

Melakukan outlet grouping, SID mapping, marking, dan data outlet.

### **Finance & Accounting**

Settlement, reporting, payment dan reconciliation.

### **Support**

Informasi Owner/Outlet dan status layanan.

### **BD**

Akuisisi dan status onboarding.

### **Tech**

Data pipeline, scraping, mapping infrastructure, system health, dan debugging.

Permission detail akan dikembangkan pada tahap berikutnya.

---

# **33\. Di Luar Scope Phase 1**

Belum menjadi prioritas utama FSR v1.0:

* Menu Management  
* Promo Management  
* Design Management  
* Full AI Assistant

Fitur tersebut dapat dikembangkan pada fase berikutnya.

---

# **34\. Success Criteria Phase 1**

Phase 1 dianggap berhasil ketika:

### **Data**

Seluruh transaksi dapat ditelusuri ke:

**Owner → Outlet ID → Brand → Platform Listing/SID → Transaction**

### **Outlet**

PIC dapat melakukan Outlet Grouping tanpa mengandalkan spreadsheet terpisah sebagai sumber kebenaran.

### **Finance**

Weekly settlement dapat dihitung tanpa menggabungkan data secara manual dari banyak spreadsheet.

### **Reporting**

Weekly report dapat dibuat berdasarkan data yang sudah tervalidasi.

### **Hybrid**

Sistem otomatis mengetahui arah net settlement.

### **Payment**

Finance mengetahui:

**siapa membayar siapa, berapa, kapan jatuh tempo, dan apakah sudah dibayar.**

### **Management**

CEO dan Operation Team dapat melihat kondisi seluruh Owner dan Outlet melalui dashboard yang sama.

---

# **35\. Product Development Principle**

Urutan pengembangan:

**Correct Identity**

↓

**Reliable Data**

↓

**Correct Business Rules**

↓

**Reliable Settlement**

↓

**Automatic Reporting**

↓

**Payment Reconciliation**

↓

**Operational Dashboard**

↓

**Broader Automation**

↓

**AI**

FoodMaster tidak perlu memulai dari AI.

Fondasi pertama adalah:

> **Identitas yang benar, data yang benar, dan aturan bisnis yang benar.**

---

# **36\. Requirement Governance**

FSR v1.0 menjadi baseline pertama yang resmi.

Setelah versi ini:

### **Minor Adjustment**

Dicatat dalam Change Log selama belum memerlukan perubahan struktur besar.

### **Fundamental Change**

Menghasilkan versi baru, misalnya:

**FSR v1.1 / v1.2 / v2.0**

Setiap perubahan harus menyebutkan:

* apa yang berubah;  
* alasan perubahan;  
* tanggal efektif;  
* bagian sistem yang terdampak.

Tidak perlu menghapus versi sebelumnya.

FSR lama tetap disimpan untuk histori keputusan.

---

# **37\. Open Items**

Beberapa hal belum perlu dikunci sekarang:

1. canonical field final GoFood;  
2. canonical field final GrabFood;  
3. canonical field final ShopeeFood;  
4. canonical field final VB Order Log;  
5. mekanisme recommendation Outlet Grouping;  
6. exact payment matching mechanism;  
7. WhatsApp automation;  
8. permission matrix;  
9. adjustment workflow;  
10. format final dashboard;  
11. format final multi-outlet weekly report;  
12. kebutuhan internal ID tambahan untuk Owner, Brand, dan Platform Listing.

Open Items diselesaikan secara bertahap saat development masuk ke area tersebut.

---

# **Guiding Principle**

> **Teknologi FoodMaster harus mengikuti cara bisnis FoodMaster bekerja, bukan memaksa bisnis mengikuti struktur spreadsheet atau keterbatasan tools yang digunakan hari ini.**

Spreadsheet, Monday, scraping tools, OE Analytics, WhatsApp, dan workflow manual saat ini adalah sumber informasi untuk memahami bisnis.

Target akhirnya adalah:

> **FoodMaster System menjadi single source of truth untuk Owner, Outlet, Brand, Platform Listing, Transaction, Settlement, dan Reporting.**

---

## **Version Log**

### **v1.0 — Consolidated Business & System Baseline**

Menggantikan:

**FoodMaster System Requirement v0.1 / FSR Aug 25th Working Draft**

Perubahan utama:

* struktur domain diperbaiki;  
* Internal Outlet ID permanen ditambahkan;  
* Brand dan Platform Listing dipisahkan;  
* Outlet Grouping didefinisikan;  
* multi-SID per outlet diperbolehkan;  
* Marking dan Labeling dipisahkan;  
* Grade ditambahkan;  
* Performance Tracking ditambahkan;  
* Rule Versioning ditambahkan;  
* Business Foundation dan Product Specification dipisahkan.

**Status: ACTIVE WORKING BASELINE**

