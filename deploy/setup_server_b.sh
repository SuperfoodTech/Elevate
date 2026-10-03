#!/usr/bin/env bash
# ==============================================================================
# deploy/setup_server_b.sh
# Automated Setup Script for Server B (Scraping Layer) - Elevate OFD Pipeline
# ==============================================================================

set -euo pipefail

# Text formatters
BOLD="\033[1m"
RESET="\033[0m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
BLUE="\033[34m"

log_info() {
    echo -e "${BLUE}[INFO]${RESET} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${RESET} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${RESET} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${RESET} $1" >&2
}

# Resolve script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BOLD}================================================================${RESET}"
echo -e "${BOLD} Elevate OFD Pipeline - Automated Setup for Server B (Scraper)  ${RESET}"
echo -e "${BOLD}================================================================${RESET}"
echo -e "Project Root: ${PROJECT_ROOT}"
echo ""

# Configuration parameters with interactive / argument fallback
TARGET_SERVER_A_URL="${1:-${ELEVATE_SERVER_A_URL:-}}"
if [ -z "${TARGET_SERVER_A_URL}" ]; then
    read -rp "Masukkan URL Ingestion Server A (contoh: http://10.0.0.1:8000 atau http://127.0.0.1:8000): " TARGET_SERVER_A_URL
fi

API_KEY="${ELEVATE_INGEST_API_KEY:-elevate_internal_tailscale_secret_key_2026}"
WORKER_ID="${WORKER_ID:-server_b_worker_01}"
STAGING_DIR="${ELEVATE_STAGING_DIR:-/data/staging}"

# 1. Update system & install required OS packages
log_info "1/8 Memperbarui paket sistem operasi dan dependensi browser headless..."
sudo apt-get update -y
sudo apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    gnupg2 \
    ca-certificates \
    cron \
    python3 \
    python3-venv \
    python3-pip \
    xvfb \
    libxi6 \
    libgconf-2-4 \
    libxss1 \
    libnss3 \
    libasound2t64 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 || sudo apt-get install -y libasound2 libatk1.0-0 libcups2 libnss3

log_success "Paket sistem berhasil dipasang."

# 2. Install UV (Fast Python Package Installer)
log_info "2/8 Memeriksa dan memasang UV package manager..."
if ! command -v uv &> /dev/null; then
    log_info "Mengunduh dan memasang UV..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="${HOME}/.local/bin:${PATH}"
    if [ -f "${HOME}/.cargo/env" ]; then
        source "${HOME}/.cargo/env" || true
    fi
fi

if command -v uv &> /dev/null; then
    log_success "UV terpasang: $(uv --version)"
else
    log_warn "UV tidak ditemukan di PATH, fallback menggunakan python3-venv standard."
fi

# 3. Install Google Chrome Stable (untuk Selenium / Undetected Chromedriver)
log_info "3/8 Memeriksa Google Chrome Stable..."
if ! command -v google-chrome &> /dev/null && ! command -v google-chrome-stable &> /dev/null; then
    log_info "Memasang Google Chrome Stable resmi..."
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg --yes
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt-get update -y
    sudo apt-get install -y google-chrome-stable || log_warn "Gagal memasang google-chrome-stable, Playwright Chromium akan digunakan sebagai mesin utama."
else
    log_success "Google Chrome sudah terpasang."
fi

# 4. Setup Python Virtual Environment & Dependencies
log_info "4/8 Membuat virtual environment dan menginstal dependensi Python..."
cd "${PROJECT_ROOT}"

if command -v uv &> /dev/null; then
    if [ ! -d ".venv" ]; then
        uv venv
    fi
    source .venv/bin/activate
    uv pip install -r requirements.txt
    uv pip install -e backend/
else
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install -e backend/
fi

log_success "Dependensi Python berhasil dipasang di .venv."

# 5. Setup Playwright Chromium
log_info "5/8 Memasang browser engine Playwright Chromium..."
if [ -f ".venv/bin/playwright" ]; then
    .venv/bin/playwright install --with-deps chromium || .venv/bin/playwright install chromium
    log_success "Playwright Chromium berhasil diinstal."
else
    log_warn "Binary playwright tidak ditemukan di .venv."
fi

# 6. Setup Direktori Staging & Cache
log_info "6/8 Mempersiapkan direktori staging lokal dan cache..."
if sudo mkdir -p "${STAGING_DIR}" 2>/dev/null; then
    sudo chown -R "${USER}:${USER}" "${STAGING_DIR}"
    sudo chmod -R 775 "${STAGING_DIR}"
    log_success "Direktori staging lokal dibuat di ${STAGING_DIR}"
else
    LOCAL_STG="${PROJECT_ROOT}/data/staging"
    mkdir -p "${LOCAL_STG}"
    STAGING_DIR="${LOCAL_STG}"
    log_warn "Tidak dapat membuat /data/staging dengan sudo. Menggunakan fallback lokal: ${STAGING_DIR}"
fi

mkdir -p "${PROJECT_ROOT}/backend/gofood/sessions"
mkdir -p "${PROJECT_ROOT}/backend/data"
mkdir -p "${PROJECT_ROOT}/data_raw"
mkdir -p "${PROJECT_ROOT}/logs"
log_success "Direktori sesi dan log berhasil disiapkan."

# 7. Konfigurasi backend/.env
log_info "7/8 Membuat atau memperbarui konfigurasi backend/.env..."
ENV_FILE="${PROJECT_ROOT}/backend/.env"

if [ ! -f "${ENV_FILE}" ]; then
    cat <<EOF > "${ENV_FILE}"
# Elevate Server B Configuration
ELEVATE_SERVER_A_URL=${TARGET_SERVER_A_URL}
ELEVATE_INGEST_API_KEY=${API_KEY}
WORKER_ID=${WORKER_ID}
ELEVATE_STAGING_DIR=${STAGING_DIR}

# Google Sheet Master DBR
MASTER_DBR_SHEET_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4jL7n8l39qj0wG6-g5jF0P6h7jG/pub?output=csv
EOF
    log_success "Berkas ${ENV_FILE} baru berhasil dibuat."
else
    log_info "Berkas ${ENV_FILE} sudah ada. Memperbarui target URL..."
    sed -i "s|^ELEVATE_SERVER_A_URL=.*|ELEVATE_SERVER_A_URL=${TARGET_SERVER_A_URL}|" "${ENV_FILE}" || echo "ELEVATE_SERVER_A_URL=${TARGET_SERVER_A_URL}" >> "${ENV_FILE}"
    sed -i "s|^ELEVATE_STAGING_DIR=.*|ELEVATE_STAGING_DIR=${STAGING_DIR}|" "${ENV_FILE}" || echo "ELEVATE_STAGING_DIR=${STAGING_DIR}" >> "${ENV_FILE}"
    log_success "Berkas ${ENV_FILE} berhasil diperbarui."
fi

# 8. Konfigurasi Crontab Scheduler
log_info "8/8 Memeriksa dan mengatur crontab OS untuk Server B..."
CRON_DAILY_CMD="0 2 * * * cd ${PROJECT_ROOT} && ${PROJECT_ROOT}/.venv/bin/python scripts/run_daily_h1_worker.py >> ${PROJECT_ROOT}/logs/cron_daily.log 2>&1"
CRON_RETRY_CMD="0 * * * * cd ${PROJECT_ROOT}/backend && ${PROJECT_ROOT}/.venv/bin/python -m core.stream_sender --retry >> ${PROJECT_ROOT}/logs/cron_retry.log 2>&1"

CURRENT_CRON=$(crontab -l 2>/dev/null || true)
NEW_CRON="${CURRENT_CRON}"

if ! echo "${CURRENT_CRON}" | grep -Fq "run_daily_h1_worker.py"; then
    NEW_CRON="${NEW_CRON}
# Elevate OFD Daily Scraping H+1 (Setiap Pukul 02:00 WIB)
${CRON_DAILY_CMD}"
fi

if ! echo "${CURRENT_CRON}" | grep -Fq "core.stream_sender --retry"; then
    NEW_CRON="${NEW_CRON}
# Elevate Outbox Staging Retry (Setiap 1 Jam)
${CRON_RETRY_CMD}"
fi

echo "${NEW_CRON}" | crontab -
log_success "Crontab berhasil didaftarkan:"
crontab -l | grep -E "run_daily_h1_worker|stream_sender" || true

# Verifikasi Akhir
echo ""
echo -e "${BOLD}================================================================${RESET}"
echo -e "${BOLD}                    Verifikasi Akhir Server B                   ${RESET}"
echo -e "${BOLD}================================================================${RESET}"

# Test import modul
log_info "Menguji modul core stream_sender..."
if "${PROJECT_ROOT}/.venv/bin/python" -c "
from backend.core.stream_sender import compute_idempotency_key
k = compute_idempotency_key('gofood', 'TEST', '2026-09-01', '2026-09-07', 1)
print('Stream sender OK, sample key:', k[:16])
" 2>/dev/null; then
    log_success "Uji import Python: LULUS."
else
    log_warn "Uji import Python mengalami kendala, periksa dependensi."
fi

# Test konektivitas ke Server A
log_info "Menguji konektivitas HTTP ke Server A (${TARGET_SERVER_A_URL})..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${TARGET_SERVER_A_URL}/docs" || true)
if [ "${HTTP_STATUS}" = "200" ]; then
    log_success "Konektivitas ke Server A terverifikasi: HTTP 200 OK."
elif [ -n "${HTTP_STATUS}" ] && [ "${HTTP_STATUS}" != "000" ]; then
    log_info "Server A merespons dengan HTTP status: ${HTTP_STATUS}."
else
    log_warn "Server A belum dapat dijangkau pada ${TARGET_SERVER_A_URL}. Pastikan firewall/UFW di Server A mengizinkan IP Server B."
fi

echo ""
echo -e "${BOLD}================================================================${RESET}"
echo -e "${GREEN}${BOLD} INSTALASI SERVER B SELESAI DENGAN SUKSES! ${RESET}"
echo -e "${BOLD}================================================================${RESET}"
echo -e "Catatan operasional:"
echo -e "1. Direktori Staging : ${STAGING_DIR}"
echo -e "2. Target Server A   : ${TARGET_SERVER_A_URL}"
echo -e "3. Log harian        : ${PROJECT_ROOT}/logs/cron_daily.log"
echo -e "4. Salin session GoFood ke : ${PROJECT_ROOT}/backend/gofood/sessions/"
echo -e "5. Untuk uji streaming manual:"
echo -e "   cd ${PROJECT_ROOT}/backend && ../.venv/bin/python -m core.stream_sender --retry"
echo -e "${BOLD}================================================================${RESET}"
