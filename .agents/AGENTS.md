# Rules for AI Coding Agent

## Prinsip Utama

Setiap kode yang dihasilkan harus mengutamakan **efisiensi**, **kecepatan eksekusi**, dan **skalabilitas**. Prioritas ini berlaku di atas gaya penulisan yang "terlihat rapi" tapi tidak fungsional.

## 1. Efisiensi Kode

- Hindari komputasi berulang yang tidak perlu (avoid redundant loops/recalculation).
- Gunakan struktur data yang sesuai dengan kasus penggunaan (misal: `Set`/`Map` untuk lookup cepat, bukan `Array.includes` pada data besar).
- Hindari operasi O(n^2) atau lebih buruk jika ada solusi O(n log n) atau O(n) yang wajar.
- Jangan import/load library besar hanya untuk fungsi kecil yang bisa ditulis manual dalam beberapa baris.
- Hindari deep copy atau clone objek yang tidak perlu.
- Gunakan lazy loading / lazy evaluation ketika data tidak selalu dibutuhkan.

## 2. Kecepatan (Performance)

- Query database harus efisien: gunakan index, hindari `SELECT *`, hindari N+1 query.
- Gunakan caching (in-memory, Redis, dll) untuk data yang sering diakses tapi jarang berubah.
- Untuk operasi I/O (network, file, database), gunakan pendekatan asynchronous/non-blocking jika bahasa/framework mendukung.
- Batasi payload API — kirim hanya data yang diperlukan oleh client.
- Minimalkan render ulang yang tidak perlu (khusus frontend: hindari re-render komponen besar tanpa alasan).
- Profiling/benchmark harus dipertimbangkan untuk kode yang berjalan di hot path.

## 3. Skalabilitas

- Desain kode agar mudah menangani pertumbuhan data dan traffic (horizontal scaling ready).
- Hindari state yang tersimpan secara lokal di satu instance server jika sistem butuh scale ke banyak instance (stateless service lebih disukai, atau gunakan shared state store).
- Pisahkan logic menjadi modul/service yang loosely coupled agar mudah di-maintain dan di-scale secara independen.
- Gunakan pagination untuk data list yang berpotensi besar, jangan return semua data sekaligus.
- Desain schema database yang mempertimbangkan pertumbuhan data jangka panjang (indexing, normalisasi yang wajar, partitioning jika relevan).
- Hindari hardcoded limits yang tidak fleksibel terhadap pertumbuhan sistem.

## 4. Larangan Emoji

- **Jangan gunakan emoji apapun** di dalam kode, komentar kode, commit message, dokumentasi teknis, log, maupun output CLI — kecuali diminta secara eksplisit oleh user.
- Tidak ada pengecualian untuk emoji "dekoratif" pada README, docstring, atau pesan error.

## 5. Gaya Kode Umum

- Kode harus bersih dan mudah dibaca, tapi tidak pada mengorbankan performa.
- Tulis komentar hanya untuk logic yang kompleks/tidak jelas — jangan komentari hal yang sudah jelas dari kode itu sendiri.
- Gunakan penamaan variabel/fungsi yang jelas dan konsisten.
- Hindari over-engineering: jangan tambahkan abstraksi/pattern yang tidak dibutuhkan saat ini hanya karena "mungkin akan berguna nanti".
- Tangani error secara eksplisit, jangan silent fail.

## 6. Sebelum Selesai

- Jika ada trade-off antara "kode lebih pendek/elegan" vs "kode lebih cepat/scalable", pilih yang lebih cepat dan scalable, lalu jelaskan alasannya secara singkat.
- Jika memungkinkan, sebutkan kompleksitas waktu/ruang (Big-O) dari solusi yang dipilih, terutama untuk fungsi yang bekerja dengan data besa

1. Do not use emojis in responses or artifacts.
2. Maintain undo/reset features for mapping operations.
