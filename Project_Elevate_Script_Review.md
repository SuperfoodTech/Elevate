**Data ingestion and data transformation**

### QA-1: Standardize scraper naming / entry points

Platform folders/entry files are named by feature/history, not by platform — hard to discover and easy to call the wrong path.

| Platform | Actual path | Smell |
| :---- | :---- | :---- |
| Grab | src/grab-reportperformance/grab\_api\_scraper.py | folder \= report, not Grab |
| GoFood | src/goscrapperv2/ | v2 leftover; refs still say goscrapper |
| Shopee | src/shopee-omzet-automation/run\_omzet.py | “omzet”, not Shopee |

Example: run\_pipeline.py points at src/goscrapper/gofood.py, but code lives in src/goscrapperv2/gofood.py.  
Fix: One contract per platform (rename or registry), e.g. platforms/{grab,gofood,shopee}/scrape.py, or a single path map in run\_pipeline.py.

### 

### QA-2: Database scripts not named by layer

src/database/ names don’t match layer1\_raw / layer2\_clean / fact. One script spans two layers.

| File | Layer | Problem |
| :---- | :---- | :---- |
| recreate\_raw\_tables.py | L1 | OK-ish |
| recreate\_clean\_tables.py | L2 | “clean” ≠ layer2 |
| normalize\_layer2.py | L2 \+ L3 | also calls refresh\_fact\_transactions() |
| db\_manager.py | L1 | name hides layer |
| functions.sql | L3 | no layer prefix |

Fix: Align names to layers, e.g. layer1\_ingest.py, layer1\_xx.py, layer2\_normalize.py, layer3\_refresh\_fact.sql. Split L2 transform from L3 refresh so each stage is re-runnable and assertable.

### QA-3: Config / secrets in code

Paths, URLs, and DB settings are hardcoded in multiple places. src/config.json only covers headless flags. Fine to keep values in-repo for now, but they should live in one config — not duplicated across scrapers and DB modules.

Example:

db\_manager.py      → DB host / user / password / SSL defaults  
sync\_merchants.py  → same DB defaults again  
grab main.py       → Google Sheet URL  
gofood.py          → same / similar Sheet URL \+ output paths  
run\_omzet.py       → data/reports/merchant  
Desired: single source, e.g. src/config.json (or one settings.py):

{  
  "db": { "host": "...", "port": 5432, "name": "...", "user": "...", "password": "...", "sslmode": "..." },  
  "paths": { "gofood\_raw": "laporan/gofood", "shopee\_raw": "data/reports/merchant" },  
  "sheets": { "merchant\_master\_csv": "https://docs.google.com/..." }  
}  
All scrapers \+ db\_manager read from that file only — no copy-paste of the same host/URL/path in N files.

Fix: Centralize config; remove duplicated literals from individual scripts.

### QA-4: Inconsistent \--db gate

Orchestrator implies “ingest only with \--db”, but Grab always tries DB write. Shopee/GoFood follow the flag.  
Example:  
python run\_pipeline.py \--grab              → still ingest\_grab() if DB reachable  
python run\_pipeline.py \--shopee            → no DB write  
python run\_pipeline.py \--shopee \--db       → ingest\_shopee()

* Shopee: if ingest\_db: ... ingest\_shopee()  
* GoFood: if args.db or INGEST\_DB: ... ingest\_gofood()  
* Grab (result.py): always db.ingest\_grab(df) — no gate

Fix: Gate Grab the same way (--db / INGEST\_DB) before ingest.

### QA-5: Append-only ingest (no idempotency)

L1 writes only append. Re-running the same period duplicates rows. Seems no existence check;  
Current:  
df\_stg.to\_sql('raw\_grab', conn, schema='layer1\_raw', if\_exists='append', index=False)  
\# same for raw\_shopee, raw\_go  
Desired:  
INSERT INTO layer1\_raw.raw\_grab ("Long Order ID", ...)  
VALUES ('GF-123', ...)  
ON CONFLICT ("Long Order ID") DO NOTHING;  
\-- or: DELETE WHERE date\_range \= :period; then INSERT  
Fix: Upsert / ON CONFLICT, or delete-by-period then insert. Add UNIQUE (or batch run\_id) so re-runs are safe.

### QA-6: Once above is updated, pls revise data\_processing\_and\_normalization.md

