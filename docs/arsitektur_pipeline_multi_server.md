# Arsitektur Pipeline Multi-Server & Pemetaan 3 Layer Data OFD

Dokumen ini memuat diagram Mermaid komprehensif yang memetakan topologi multi-server, alur pemrosesan 3 layer data, integrasi Master DBR (Database Record), serta siklus eksekusi cron job harian H+1. Dokumen ini dirancang agar mudah dipahami oleh tim teknis, tim data, maupun pemangku kepentingan (*stakeholders*).

---

## 1. Topologi Jaringan & Pemisahan Server (Tailscale Mesh)

Diagram ini mengilustrasikan pemisahan fisik antara Server Scraper (Server B) dan Server Elevate (Server A) menggunakan jaringan terenkripsi Tailscale Mesh, memastikan port PostgreSQL tidak pernah terekspos ke internet publik.

```mermaid
flowchart TB
    subgraph Server_B["SERVER B: SCRAPER WORKER (Dedicated Server)"]
        CronTrigger["Cron Daemon H+1 (Setiap Pukul 02:00 WIB)"]
        
        subgraph Scraper_Engines["OFD Extraction Engines"]
            GrabEngine["GrabFood Scraper (API / Web Session)"]
            ShopeeEngine["ShopeeFood Scraper (API / Merchant Session)"]
            GoEngine["GoFood Scraper (V2 Analytics / Commerce Items)"]
        end
        
        subgraph Local_Storage["Penyimpanan Lokal (Audit & Traceback)"]
            ExcelArchive["Arsip Laporan Fisik: 0Master.xlsx / CSV"]
            JSONLocal["Cache File JSON Mentah Transaksi"]
        end
        
        ClientSender["HTTP Client Pengirim (Tailscale + X-Elevate-API-Key)"]
        
        CronTrigger --> GrabEngine & ShopeeEngine & GoEngine
        GrabEngine & ShopeeEngine & GoEngine --> ExcelArchive
        GrabEngine & ShopeeEngine & GoEngine --> JSONLocal
        JSONLocal --> ClientSender
    end

    subgraph Tailscale_Network["TAILSCALE ENCRYPTED MESH (100.x.y.z)"]
        SecureTunnel["Jalur WireGuard Terenkripsi (Zero Public Port Ingress)"]
        ClientSender -->|"HTTPS POST /api/v1/ingest/ofd/batch"| SecureTunnel
    end

    subgraph Server_A["SERVER A: ELEVATE PRODUCTION (Docker Compose)"]
        ReverseProxy["Nginx Ingress / Tailscale Endpoint (Port 80/443)"]
        SecureTunnel --> ReverseProxy
        
        subgraph Elevate_Backend["Container: elevate_backend (FastAPI)"]
            AuthGuard["Security Guard: Verifikasi X-Elevate-API-Key"]
            IngestController["Controller: Ingest OFD Batch Endpoint"]
            PipelineRunner["Pipeline Orchestrator (ELT Trigger)"]
            
            ReverseProxy --> AuthGuard
            AuthGuard --> IngestController
            IngestController --> PipelineRunner
        end
        
        subgraph Elevate_DB["Container: elevate_db (PostgreSQL 15)"]
            RawSchema[("Layer 1: layer1_raw")]
            CleanSchema[("Layer 2: layer2_clean")]
            DimSchema[("Layer 3: layer3_dim")]
            MasterDBR[("Master DBR: dim_merchant_mapping")]
            MatViews[("Materialized Views: mv_*")]
            
            PipelineRunner -->|"1. Ingest Mentah"| RawSchema
            RawSchema -->|"2. Transform & Normalisasi"| CleanSchema
            CleanSchema -->|"3. Match DBR & Fact Load"| DimSchema
            MasterDBR -.->|"Lookup Store ID"| DimSchema
            DimSchema -->|"Auto Refresh"| MatViews
        end
        
        subgraph Elevate_Frontend["Container: elevate_frontend (React SPA)"]
            DashboardAPI["Backend REST Endpoints (/api/dashboard-summary)"]
            DashboardUI["Dashboard Eksekutif (DashboardPage.tsx)"]
            MatViews --> DashboardAPI
            DashboardAPI --> DashboardUI
        end
    end

    subgraph Users["PENGGUNA & TIM FINANCE"]
        FinanceUser["Tim Finance / Operasional"]
        FinanceUser -->|"Akses Web Dashboard"| DashboardUI
        FinanceUser -.->|"Traceback jika ada anomali"| ExcelArchive
    end
```

---

## 2. Alur Pemrosesan Data 3 Layer & Pencocokan Master DBR

Diagram alur berikut menjelaskan transformasi dari payload mentah aplikator hingga menjadi data analitik siap saji di dashboard:

```mermaid
flowchart LR
    subgraph L1["LAYER 1: RAW INGESTION (layer1_raw)"]
        direction TB
        RawPayload["Payload JSON Mentah Aplikator"]
        T_RawGrab[("raw_grab")]
        T_RawShopee[("raw_shopee")]
        T_RawGo[("raw_go & raw_go_items")]
        
        RawPayload --> T_RawGrab
        RawPayload --> T_RawShopee
        RawPayload --> T_RawGo
    end

    subgraph L2["LAYER 2: CLEANING & NORMALIZATION (layer2_clean)"]
        direction TB
        NormLogic["Pembersihan & Standardisasi:<br/>- Parsing Timestamp ke ISO-8601<br/>- Status Baku: COMPLETED / CANCELLED<br/>- Konversi Angka Sen ke Rupiah<br/>- Deduplikasi (Order ID, Line No)"]
        
        T_StgGrab[("stg_grab_orders")]
        T_StgShopee[("stg_shopee_orders")]
        T_StgGo[("stg_go_orders")]
        
        T_RawGrab --> NormLogic --> T_StgGrab
        T_RawShopee --> NormLogic --> T_StgShopee
        T_RawGo --> NormLogic --> T_StgGo
    end

    subgraph DBR_Master["MASTER DBR (Database Record)"]
        direction TB
        T_DBR[("dim_merchant_mapping & business_grouping")]
        DBR_Fields["Atribut DBR:<br/>- Store ID / Merchant ID<br/>- Outlet Name Resmi<br/>- Owner Name & PIC<br/>- Brand / Virtual Brand<br/>- Group Code (Agency vs VB)<br/>- Skema Revenue Share"]
        T_DBR --- DBR_Fields
    end

    subgraph L3["LAYER 3: FACT TRANSACTIONS & ANALYTICS (layer3_dim)"]
        direction TB
        SP_Fact["Stored Procedure: refresh_fact_transactions()<br/>- LEFT JOIN Staging ke Master DBR<br/>- Identifikasi Toko Baru (auto_detect)<br/>- Kalkulasi Net Sales, Komisi & Margin"]
        
        T_Fact[("fact_transactions")]
        
        MVs["Materialized Views:<br/>- mv_order_ranking<br/>- mv_payment_daily<br/>- mv_rekap_tagihan_monthly"]
        
        T_StgGrab & T_StgShopee & T_StgGo --> SP_Fact
        T_DBR --> SP_Fact
        SP_Fact --> T_Fact
        T_Fact --> MVs
    end

    subgraph Presentation["LAYER 4: PRESENTASI DASHBOARD"]
        direction TB
        KPICards["5 KPI Cards (GMV, Net, Orders, Fees, Brand Velocity)"]
        Charts["Grafik Tren Harian & Distribusi Platform"]
        TopBrands["Tabel Peringkat Brand & Arus Kas Settlement"]
        
        MVs --> KPICards & Charts & TopBrands
    end
```

---

## 3. Matriks Pemetaan Kolom (*Column Lineage Mapping*)

Tabel dan diagram di bawah ini merinci pemetaan atribut dari data mentah ketiga aplikator, transformasi pembersihannya, hingga kolom pada tabel fakta utama `layer3_dim.fact_transactions`:

```mermaid
classDiagram
    class RawSource {
        +Grab: Long Order ID, Amount, Net Sales, Order Commission, Store ID
        +Shopee: Order ID, Food original price, Complete Time, Store ID
        +GoFood: Order ID, Amount, Net Amount, Total Fee, Merchant ID
    }

    class Layer2Clean {
        +Standardized Status: COMPLETED / CANCELLED
        +Standardized Date: YYYY-MM-DD
        +Standardized Timestamp: created_on (Timestamp with TZ)
        +Standardized Currency: numeric(15,2)
    }

    class MasterDBR {
        +store_id: string [PK]
        +outlet_name: string
        +branch_name: string
        +owner_name: string
        +brand_name: string
        +group_code: Agency / Virtual Brand
        +revenue_share_pct: numeric(5,2)
    }

    class FactTransactions {
        +id: bigint [PK]
        +platform: GrabFood / ShopeeFood / GoFood
        +external_id: string
        +transaction_date: date
        +created_on: timestamp
        +merchant_id: string
        +group_code: string (from DBR)
        +outlet_name: string (from DBR)
        +branch_name: string (from DBR)
        +owner_name: string (from DBR)
        +status: COMPLETED / CANCELLED
        +gross_amount: numeric(15,2)
        +discounts: numeric(15,2)
        +net_sales: numeric(15,2)
        +ofd_fees: numeric(15,2)
        +commission: numeric(15,2)
        +revenue: numeric(15,2)
        +is_success: smallint
        +is_cancelled: smallint
    }

    RawSource --> Layer2Clean : "Normalisasi Tipe Data & Format"
    Layer2Clean --> FactTransactions : "Kalkulasi Metrik Finansial"
    MasterDBR --> FactTransactions : "Enrichment Identitas Bisnis"
```

---

## 4. Diagram Urutan Eksekusi Cron Job H+1 (*Chronological Sequence*)

Diagram interaksi urutan proses dari mulai cron job aktif di Server B hingga dashboard terbarui di Server A:

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Cron Job Server B
    participant Scraper as Scraper Worker (B)
    participant LocalDisk as Local Disk Server B
    participant IngestAPI as FastAPI Ingest (A)
    participant DB as PostgreSQL 15 (A)
    participant DBR as Master DBR (A)
    participant UI as Elevate Frontend

    Note over Cron, Scraper: Pukul 02:00 WIB (H+1 Selesai Settlement)
    Cron->>Scraper: Trigger proses penarikan data H-1
    
    par Ekstraksi Aplikator
        Scraper->>Scraper: Ekstraksi GrabFood (Orders & Financials)
        Scraper->>Scraper: Ekstraksi ShopeeFood (Orders & Items)
        Scraper->>Scraper: Ekstraksi GoFood (Orders & Items)
    end

    Note over Scraper, LocalDisk: Retensi Traceback & Audit
    Scraper->>LocalDisk: Tulis laporan lokal (0Master.xlsx, raw JSON)
    
    Note over Scraper, IngestAPI: Transport via Tailscale Private Mesh
    Scraper->>IngestAPI: POST /api/v1/ingest/ofd/batch (JSON + API Key)
    
    IngestAPI->>IngestAPI: Verifikasi X-Elevate-API-Key
    
    Note over IngestAPI, DB: Eksekusi Pipeline 3 Layer
    IngestAPI->>DB: 1. INSERT INTO layer1_raw (raw_grab, raw_shopee, raw_go)
    IngestAPI->>DB: 2. CALL normalize_all() -> populate layer2_clean
    IngestAPI->>DBR: 3. JOIN layer3_dim.dim_merchant_mapping
    DBR-->>DB: Enrich owner, outlet, brand, group_code
    IngestAPI->>DB: 4. UPSERT INTO layer3_dim.fact_transactions
    IngestAPI->>DB: 5. REFRESH MATERIALIZED VIEW (mv_order_ranking, mv_payment_daily)
    
    DB-->>IngestAPI: Konfirmasi: Ingest Selesai (350 baris, 0 error)
    IngestAPI-->>Scraper: HTTP 200 OK (Status Berhasil)
    
    Note over UI, DB: Pengguna Membuka Elevate (08:00 WIB)
    UI->>IngestAPI: GET /api/dashboard-summary
    IngestAPI->>DB: Query data dari Materialized Views
    DB-->>IngestAPI: Data agregat performa riil
    IngestAPI-->>UI: Response JSON Data Terkini
    UI->>UI: Render grafik & metrik performa tanpa data dummy
```

---

## 5. Ringkasan Manfaat Arsitektur Ini untuk Presentasi

1. **Keamanan Maksimal**:
   - Port database 5432 tidak dibuka ke internet, hanya diakses oleh aplikasi lokal dan jaringan privat Tailscale.
   - Endpoint dilindungi token rahasia berkekuatan tinggi (`X-Elevate-API-Key`).
2. **Ketahanan Sistem (*High Availability*)**:
   - Jika proses scraping mengalami lonjakan beban atau memori, server aplikasi dan database Elevate tetap beroperasi normal tanpa gangguan.
3. **Traceback Finansial Ganda**:
   - Format JSON digunakan untuk kecepatan pemrosesan otomatis ke database dan visualisasi dashboard.
   - Format Excel/CSV tetap disimpan di server scraper sebagai arsip bukti audit manual jika tim finance membutuhkan rekonsiliasi per transaksi.
4. **Otomatisasi Penuh**:
   - Seluruh rantai dari Layer 1 (Raw) hingga pembaruan Materialized View berjalan otomatis dalam satu alur terkoordinasi setelah data diunggah oleh cron job.
