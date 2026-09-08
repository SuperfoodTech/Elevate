# Database Handover — 8 September 2026

## Snapshot database

Dump database tersedia di:

```text
database_dumps/elevate_db_2026-09-08.dump
```

Format dump adalah PostgreSQL custom (`pg_dump -Fc`) dan sudah dibuat tanpa ownership/ACL server asal, sehingga dapat direstore ke database lokal dengan role berbeda.

Informasi dump:

- Database sumber: `db_superfood`
- Schema: `public`, `layer1_raw`, `layer2_clean`, `layer3_dim`
- Ukuran dump: sekitar 7,7 MB terkompresi
- SHA-256: `b8aee971b669ee289979163784a9c91cd2db82b4f8777de1827dbc83480662dd`
- Dibuat pada: 8 September 2026

Dump ini berisi data transaksi dan credential/configuration database. Jangan mengunggahnya ke repository publik atau membagikannya melalui kanal yang tidak aman.

## Cara restore lokal — Docker Compose

Dari root repository:

```bash
docker compose up -d elevate_postgres
```

Pastikan container siap:

```bash
docker exec elevate_postgres pg_isready -U elevate_admin -d elevate_db
```

Restore ke database lokal:

```bash
docker exec -i elevate_postgres pg_restore \
  -U elevate_admin \
  -d elevate_db \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  < database_dumps/elevate_db_2026-09-08.dump
```

Perintah `--clean` menghapus object yang sama di database target sebelum restore. Gunakan hanya pada database lokal/target handover, bukan database produksi.

Jika database lokal belum pernah dipakai dan restore mengalami error karena object lama, reset volume lokal terlebih dahulu hanya setelah memastikan tidak ada data lokal yang perlu dipertahankan:

```bash
docker compose down
docker compose up -d elevate_postgres
```

## Konfigurasi koneksi aplikasi lokal

Dengan `docker-compose.yml` saat ini, aplikasi di host menggunakan:

```env
DB_HOST=127.0.0.1
DB_PORT=5435
DB_NAME=elevate_db
DB_USERNAME=elevate_admin
DB_PASSWORD=<nilai POSTGRES_PASSWORD dari docker-compose.yml>
SSL_MODE=disable
```

Jangan memakai port PostgreSQL remote `5432` untuk koneksi lokal Docker; port host lokalnya adalah `5435`.

## Verifikasi setelah restore

```bash
docker exec -it elevate_postgres psql \
  -U elevate_admin -d elevate_db \
  -c "SELECT schemaname, count(*) FROM pg_tables WHERE schemaname IN ('public','layer1_raw','layer2_clean','layer3_dim') GROUP BY schemaname ORDER BY schemaname;"
```

Verifikasi transaksi Layer 3:

```bash
docker exec -it elevate_postgres psql \
  -U elevate_admin -d elevate_db \
  -c "SELECT platform, COUNT(*) AS rows, MIN(transaction_date) AS first_date, MAX(transaction_date) AS last_date FROM layer3_dim.fact_transactions GROUP BY platform ORDER BY platform;"
```

Snapshot sumber sebelum dump menghasilkan kondisi berikut:

| Platform | Layer 3 rows | Periode terakhir |
|---|---:|---|
| GoFood | 8.747 | 1 Maret–7 September 2026 |
| GrabFood | 32.368 | 28 Februari–7 September 2026 |
| ShopeeFood | 103.419 | 1 Maret–6 September 2026 |

## Seeder atau refresh setelah restore

Untuk sekadar memakai snapshot, tidak perlu menjalankan seeder ulang. Layer 1, Layer 2, Layer 3, materialized view, fungsi, index, dan data sudah termasuk dalam dump.

Jika ada data baru setelah tanggal snapshot:

1. Ingest file baru ke `layer1_raw` menggunakan pipeline.
2. Jalankan normalisasi:

   ```bash
   uv run python backend/cli.py --clean
   ```

3. Refresh tabel fakta:

   ```bash
   uv run python - <<'PY'
   from src.database.layer1_db_manager import DatabaseManager
   from sqlalchemy import text

   with DatabaseManager().engine.begin() as conn:
       conn.execute(text("SELECT refresh_fact_transactions()"))

   print("FACT REFRESH SUCCESS")
   PY
   ```

## Catatan handover

- `fact_transactions` menggunakan unique key `(platform, external_id)` untuk mencegah duplikasi transaksi.
- Data raw dapat lebih banyak daripada Layer 2/Layer 3 karena normalisasi melakukan deduplikasi dan pemilihan record transaksi utama.
- Sebagian outlet baru mungkin berada di pending mapping; transaksi tetap masuk, tetapi owner/outlet dapat memakai fallback sampai mapping diselesaikan.
- Setelah restore, cek bahwa `DB_HOST`, `DB_PORT`, dan `DB_NAME` aplikasi menunjuk ke database lokal sebelum menjalankan pipeline ingest.
