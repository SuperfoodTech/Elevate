# Panduan Deployment Server: Docker Compose & Tailscale dengan Custom Domain (elevate.byfoodmaster.com)

Dokumen ini berisi panduan lengkap untuk melakukan deployment portal **Elevate** ke server Linux (Ubuntu/Debian) menggunakan **Docker Compose**, serta menghubungkannya secara privat dan aman menggunakan jaringan **Tailscale** dengan domain kustom **`elevate.byfoodmaster.com`**.

---

## 1. Arsitektur Keamanan (Zero-Trust Private Access)

- **Port Aplikasi Tidak Dibuka ke Publik**: Nginx di dalam Docker hanya mendengarkan pada alamat loopback server lokal (`127.0.0.1:8080`).
- **Jaringan Terisolasi Tailscale**: Hanya perangkat yang terhubung ke jaringan Tailnet tim Anda yang dapat mengakses server. Akses dari internet publik tertutup total.
- **Resolusi DNS Kustom**: Domain `elevate.byfoodmaster.com` diarahkan ke IP privat Tailscale server (`100.x.y.z`), sehingga nama domain resmi dapat digunakan oleh seluruh tim.

---

## 2. Persiapan Server Host

### Langkah 2.1: Instalasi Docker & Docker Compose
Jalankan perintah berikut di server Linux (Ubuntu/Debian):

```bash
# Update sistem
sudo apt-get update && sudo apt-get upgrade -y

# Instalasi prasyarat
sudo apt-get install -y ca-certificates curl gnupg

# Menambahkan GPG key resmi Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Menambahkan repositori Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Aktifkan service Docker
sudo systemctl enable --now docker
```

---

### Langkah 2.2: Instalasi & Aktivasi Tailscale pada Server

1. **Install Tailscale**:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. **Hubungkan Server ke Akun Tailscale Anda**:
   ```bash
   sudo tailscale up --hostname=elevate-portal --ssh
   ```
   *(Opsional: Flag `--ssh` memungkinkan Anda melakukan remote SSH aman ke server melalui Tailscale tanpa perlu membuka port 22 ke publik).*

3. **Catat IP Tailscale Server**:
   ```bash
   tailscale ip -4
   ```
   Contoh output: `100.85.12.34` *(Simpan IP ini untuk konfigurasi DNS)*.

---

## 3. Konfigurasi DNS untuk Custom Domain (`elevate.byfoodmaster.com`)

Buka dashboard penyedia DNS domain Anda (Cloudflare, Niagahoster, cPanel, atau lainnya) untuk domain `byfoodmaster.com`:

1. **Tambahkan A-Record Baru**:
   - **Tipe**: `A`
   - **Nama / Host**: `elevate` (atau `elevate.byfoodmaster.com`)
   - **Target / Nilai IPv4**: Masukkan IP Tailscale server Anda (contoh: `100.85.12.34`)
   - **TTL**: `Auto` atau `300 detik`
   - **Proxy Status (khusus Cloudflare)**: Pilih **DNS Only** (Awan Abu-abu / Gray Cloud). Jangan gunakan CDN Proxy Oranye karena IP `100.x.y.z` adalah IP privat CGNAT Tailscale.

2. **Verifikasi DNS**:
   Pada laptop tim yang sudah terhubung ke Tailscale, lakukan ping atau tes DNS:
   ```bash
   ping elevate.byfoodmaster.com
   # Harus me-resolve ke 100.85.12.34
   ```

---

## 4. Menjalankan Aplikasi dengan Docker Compose

1. **Clone Repositori ke Server**:
   ```bash
   git clone https://github.com/SuperfoodTech/Elevate.git /opt/elevate
   cd /opt/elevate
   ```

2. **Bangun Image & Jalankan Seluruh Kontainer**:
   ```bash
   sudo docker compose up -d --build
   ```

3. **Verifikasi Kontainer yang Sedang Berjalan**:
   ```bash
   sudo docker compose ps
   ```
   Seluruh kontainer harus berstatus `healthy` / `running`:
   - `elevate_db` (PostgreSQL 15)
   - `elevate_backend` (FastAPI API Service)
   - `elevate_frontend` (Nginx Web Server pada `127.0.0.1:8080`)

4. **Uji Coba Respon Lokal**:
   ```bash
   curl -I http://127.0.0.1:8080/healthz
   # Output: HTTP/1.1 200 OK
   ```

---

## 5. Mengaktifkan Akses Port 80 / SSL Otomatis

Pilih salah satu dari dua metode di bawah ini:

### Metode A: Menggunakan Reverse Proxy Nginx Host (Direkomendasikan untuk Custom Domain Penuh)
Jika Anda ingin `elevate.byfoodmaster.com` dapat langsung diakses via port 80/443:

1. Install Nginx di OS host server:
   ```bash
   sudo apt-get install -y nginx
   ```
2. Buat file konfigurasi `/etc/nginx/sites-available/elevate`:
   ```nginx
   server {
       listen 80;
       server_name elevate.byfoodmaster.com;

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Aktifkan situs:
   ```bash
   sudo ln -s /etc/nginx/sites-available/elevate /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

### Metode B: Menggunakan Tailscale Serve (HTTPS Otomatis Bawaan Tailscale)
Jika Anda ingin memanfaatkan sertifikat SSL otomatis dari Tailscale:
```bash
sudo tailscale serve --bg 8080
```
Sistem akan otomatis menyediakan HTTPS pada nama MagicDNS Tailnet Anda (`https://elevate-portal.<tailnet-name>.ts.net`).

---

## 6. Prosedur Pembaruan Kode (Deploy Update Loop)

Jika terdapat commit atau fitur baru yang ingin di-deploy ke server di masa mendatang:

```bash
cd /opt/elevate
git pull origin main
sudo docker compose up -d --build
```
Proses ini secara otomatis mengompilasi ulang frontend dan restart backend dengan downtime seminimal mungkin.

---

## 7. Kredensial Akses Awal
- **URL Akses**: `http://elevate.byfoodmaster.com` (atau via IP Tailscale `http://100.x.y.z:8080`)
- **Super Admin**: `admin@byfoodmaster.com` / `elevate2026`
- **Tim Finance**: `finance@byfoodmaster.com` / `elevate2026`
