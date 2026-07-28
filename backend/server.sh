#!/bin/bash
set -e

# Change directory to backend folder
cd "$(dirname "$0")"

echo "=================================================="
echo "[BACKEND] Starting REST API Server..."
echo "=================================================="

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "[INFO] 'uv' tidak ditemukan. Menggunakan standalone installer..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "[INFO] Syncing dependencies with uv sync..."
uv sync

echo "[INFO] Starting Uvicorn ASGI Server on http://0.0.0.0:8000..."
echo "[INFO] Interactive Swagger Docs available at http://localhost:8000/docs"
echo "=================================================="

uv run uvicorn server:app --host 0.0.0.0 --port 8000 --reload
