# Data Processing and Normalization Documentation

This document explains the technical details of the data processing, cleaning, and normalization pipeline for the three Online Food Delivery (OFD) platforms: GoFood, ShopeeFood, and GrabFood.

In this architecture, the scraping/downloading phase is decoupled from the data processing and normalization phase. The scraping code operates in a stateless manner to retrieve only raw data (with minor exceptions), while downstream processors and database triggers clean and normalize the datasets.

---

## 1. Pipeline Overview

The data pipeline is divided into three processing levels:

1. **Bronze (Raw Storage - Local Files)**: Scrapers download and store the transaction files locally.
   - **GoFood**: Raw JSON payloads from GoBiz Elasticsearch queries.
   - **ShopeeFood**: Unmodified Excel report files (.xlsx).
   - **GrabFood**: CSV transaction report files (.csv) with the Store ID replaced by the API-fetched Real Store ID (GFID) to ensure consistent downstream join behavior.
2. **Silver (Layer 1 Raw Database Ingestion)**: Ingestion scripts read the local files and insert their columns as completely unmodified raw string values into the PostgreSQL `layer1_raw` schema tables (`raw_go`, `raw_shopee`, and `raw_grab`). All columns in these tables are typed as `TEXT` to prevent format drift from crashing ingestion.
3. **Gold (Normalized Fact Table)**: Database views or SQL functions (e.g. `refresh_fact_transactions()`) process, clean, and cast the raw text values into standardized transaction records in the `public.fact_transactions` table.


---

## 2. Platform-Specific Processing and Formulas

### A. GoFood (GoBiz Portal)

#### Raw Storage (Bronze)
The scraper script (`gofood.py`) performs authentication, queries Grafana/Elasticsearch endpoints, and writes the response payload directly to a JSON file named `<outlet_name>_raw.json` inside the `laporan/gofood/raw/` directory.

#### Parsing & Ingestion (Silver)
The processing script (`process_gofood.py`) extracts data points from the raw JSON responses and builds an aggregated DataFrame:
- **Revenue (Gross Sales)**: Sum of all buckets in `data_revenue`.
- **Completed Orders**: Sum of Elasticsearch doc_counts in `data_orders`.
- **Net Revenue**: Sum of value metrics in `data_net`.
- **Commission Fees (GoBiz)**: Sum of values in `data_komisi`.
- **Marketing & Ads Fees**: Sum of values in `data_iklan` (ad promo burn).
- **Cancelled Orders**: Extracted from index 4 of `data_batal` response hits or distributed evenly across period bounds if buckets are missing.
- **Ojol Commission (Delivery Cut)**: Derived via:
  $$\text{Ojol Commission} = \text{Revenue} - \text{Net Revenue}$$
- **Unique Period ID**: A concatenated string of `YYYYMMDD-store_id` used as a primary key constraint to prevent duplicate records.

The result is saved as a processed Excel sheet and loaded into the `layer1_raw.raw_go` database table.

---

### B. ShopeeFood (Shopee Partner Portal)

#### Raw Storage (Bronze)
The scraper script (`run_omzet.py`) triggers exports and downloads the transaction Excel report directly to `data/reports/merchant/` without modifying columns or altering values.

#### Parsing & Ingestion (Silver)
The ingestion parser processes the Shopee Excel files by loading the raw columns, handling missing values, and appending them directly to the `layer1_raw.raw_shopee` table as text strings.

---

### C. GrabFood (Grab Merchant Portal)

#### Raw Storage (Bronze)
The scraper script (`grab_api_scraper.py`) downloads the transaction CSV report. The only modification kept is replacing the values under the native `Store ID` column with the API-resolved `real_store_id` (GFID) to ensure downstream mapping consistency.

#### Parsing & Ingestion (Silver)
The Grab parser processes the downloaded CSV by selecting the 68 standard columns, converting NaN values to NULLs, and appending them directly to `layer1_raw.raw_grab` as text strings.


---

## 3. Database Normalization (Gold Level)

The database function `refresh_fact_transactions()` standardizes the three platform models into a single unified table (`fact_transactions`):

### GrabFood Processing Rules
- **Refund Adjustments**: Groups `Auto-Chargeback` rows and subtracts them from the matching `Auto-Paid` row's total.
- **Deduplication**: Uses window functions (`ROW_NUMBER()`) partitioning by `long_order_id` to pick only the primary order record.
- **GFID Resolution**: Resolves the merchant info by joining `dim_merchants` using the `store_id` (which now holds the replaced GFID).
- **Net Sales Calculation**:
  $$\text{Net Sales} = \text{Amount} + \text{Discount (Merchant-Funded)} + \text{Delivery Fee Discount (Merchant-Funded)}$$
- **OFD Fees Calculation**:
  $$\text{OFD Fees} = \text{Order Commission} + \text{Marketing Success Fee}$$

### ShopeeFood Processing Rules
- **Deduplication**: Upserts directly using conflict resolution on the `transaction_id` column.
- **Total Discounts**: Sum of item, flash sale, and voucher subsidies.
- **Net Sales Calculation**:
  $$\text{Net Sales} = \text{Food Original Price} - \text{Item Discounts}$$
- **Commission & OFD Fees**: Uses the staging column `commission` or falls back to $25\%$ of the transaction amount:
  $$\text{OFD Fees} = \text{Transaction Amount} \times 0.25$$
- **Revenue Calculation**:
  $$\text{Revenue} = \text{Transaction Amount} - \text{Commission}$$

### GoFood Processing Rules
- **Granularity**: Handles aggregated day-level records instead of order-level records.
- **Period Parsing**: Extracts dates from the unique constraint string (`period_id`).
- **Fees**: Directly maps `total_potongan` as `ofd_fees`, `biaya_komisi` as `commission`, and `pengeluaran_iklan` as `marketing_fee`.
- **Revenue**: Maps `penjualan_bersih` as the payout amount.

---

## 4. Calculated Performance Metrics

Once the transactions are normalized, the database calculates performance ratios for each record:

1. **OFD Commission Ratio**:
   $$\text{Commission \%} = \frac{\text{Commission}}{\text{Net Sales}} \times 100$$
2. **OFD Total Fees Ratio**:
   $$\text{OFD Fees \%} = \frac{\text{OFD Fees}}{\text{Net Sales}} \times 100$$
3. **Net Revenue Ratio**:
   $$\text{Revenue \%} = \frac{\text{Revenue}}{\text{Net Sales}} \times 100$$
