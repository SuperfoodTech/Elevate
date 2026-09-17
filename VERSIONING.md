# Panduan Semantic Versioning (SemVer) Proyek Elevate

Dokumen ini merupakan panduan standar penomoran versi (versioning) untuk seluruh repositori Elevate (Frontend, Backend, dan Skema Data). Standar ini mengadopsi spesifikasi Semantic Versioning 2.0.0 (SemVer).

---

## 1. Struktur Format Versi

Format standar penomoran versi terdiri dari tiga angka utama:

```text
MAJOR.MINOR.PATCH
Contoh: 1.3.0
```

Untuk fase pengembangan atau sebelum rilis resmi ke tahap produksi (unreleased), tambahkan identifier pra-rilis:

```text
MAJOR.MINOR.PATCH-[tag].[iterasi]
Contoh: 1.3.0-rc.1 atau 1.3.0-beta.2
```

---

## 2. Kriteria Kenaikan Versi

### A. MAJOR (X.0.0) - Perubahan Tidak Kompatibel (Breaking Changes)
Versi MAJOR dinaikkan jika ada perubahan besar yang mengubah kontrak sistem secara menyeluruh dan tidak mendukung kompatibilitas mundur (breaking changes).

**Kapan menggunakan MAJOR:**
- Perombakan total skema database (misal: perubahan tipe primary key relasional yang mengharuskan migrasi data ulang).
- Perubahan kontrak payload API publik/internal yang mematahkan integrasi klien yang sudah berjalan.
- Restrukturisasi arsitektur menyeluruh (misal: penggantian framework inti atau protokol komunikasi).
- Penghentian (deprecation) fitur-fitur sentral yang telah digantikan alur baru.

**Contoh Kasus di Elevate:**
- `1.0.0` -> `2.0.0`: Perubahan total pipeline rekonsiliasi keuangan dari multi-sheet ke format baru yang mengubah struktur tabel staging database `layer1_raw`.

---

### B. MINOR (0.X.0) - Penambahan Fitur Kompatibel (Features)
Versi MINOR dinaikkan jika ada penambahan fungsionalitas baru yang tetap kompatibel dengan versi sebelumnya (backwards-compatible).

**Kapan menggunakan MINOR:**
- Penambahan halaman modul baru pada frontend (misal: Halaman Listings, Halaman Brands).
- Penambahan endpoint API baru atau parameter opsional baru.
- Penambahan kategori navigasi baru pada sidebar sistem.
- Penambahan widget chart analitik baru tanpa merusak data lama.

**Contoh Kasus di Elevate:**
- `1.2.0` -> `1.3.0`: Penambahan sub-menu transaksi terpisah (Agency dan Virtual Brand), integrasi modul Listing Details dengan metrik penjualan, serta penambahan halaman master Brands.

---

### C. PATCH / FIX (0.0.X) - Perbaikan Bug & Optimasi (Fixes)
Versi PATCH dinaikkan jika terjadi perbaikan bug, perbaikan logika, atau optimasi internal tanpa menambah fitur besar baru dan tetap kompatibel penuh.

**Kapan menggunakan PATCH:**
- Perbaikan bug fungsionalitas (misal: koreksi perhitungan hari Senin pertama pada filter periode).
- Optimasi performa (misal: debounce search bar agar input tidak lagging).
- Perbaikan visual, kontras warna, typo copy, atau layout responsif.
- Pembaruan dependensi kecil untuk keamanan tanpa perubahan kode publik.

**Contoh Kasus di Elevate:**
- `1.3.0` -> `1.3.1`: Perbaikan urutan opsi periode dropdown dan eliminasi duplikasi sub-tab transaksi.

---

## 3. Tahapan Pra-Rilis (Unreleased / Pre-release)

Ketika fitur sedang dikerjakan dan belum dirilis resmi ke branch `main` atau environment production, gunakan penandaan pra-rilis:

| Identifier | Keterangan | Contoh |
|---|---|---|
| `alpha` | Fitur baru masih dalam tahap eksperimental dan uji fungsi awal. | `1.3.0-alpha.1` |
| `beta` | Fitur sudah lengkap, sedang dalam tahap integrasi dan audit kualitas. | `1.3.0-beta.1` |
| `rc` (Release Candidate) | Kode sudah stabil, siap ditinjau melalui Pull Request sebelum merger ke `main`. | `1.3.0-rc.1` |

---

## 4. Konvensi Penamaan Branch, Commit, dan Pull Request

### A. Penamaan Branch
Format nama branch menyertakan target versi minor atau patch:
- Fitur baru: `feature/v[MAJOR].[MINOR].0-[deskripsi-singkat]`
  Contoh: `feature/v1.3.0-sidebar-and-gofood-schema`
- Perbaikan bug: `fix/v[MAJOR].[MINOR].[PATCH]-[deskripsi-singkat]`
  Contoh: `fix/v1.3.1-period-dropdown-sorting`

### B. Format Pesan Commit (Conventional Commits)
Gunakan format standar berikut tanpa emoji:
```text
<type>(<scope>): <versi> - <ringkasan imperatif singkat>

- Poin detail perubahan 1
- Poin detail perubahan 2
```

Contoh:
```text
feat(dashboard): v1.3.0-rc.1 - implement dynamic month and week split selector

- Add periodHelper utility with first Monday calculation
- Replace monolithic period select with Month-Year and Week dropdowns
```

### C. Judul Pull Request (PR)
Gunakan format yang menyertakan nomor versi dan ringkasan cakupan:
```text
v1.3.0-rc.1: [Modul Utama] - [Deskripsi Singkat Perubahan]
```
Contoh:
`v1.3.0-rc.1: Optimasi Pencarian, Pemisahan Sub-Menu Transaksi, Modul Brand/Listing, dan Filter Periode Dinamis`

---

## 5. Sinkronisasi Berkas Konfigurasi

Sebelum merilis resmi, pastikan nomor versi disinkronkan di:
1. `frontend/package.json` -> `"version": "1.3.0"`
2. `src/pyproject.toml` -> `version = "1.3.0"`
3. Git Tag saat merger ke `main`:
   ```bash
   git tag -a v1.3.0 -m "Release v1.3.0: Navigasi Baru, GoFood Schema, dan Filter Dinamis"
   git push origin v1.3.0
   ```
