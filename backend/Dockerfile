FROM python:3.12-slim

WORKDIR /app

# Install essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager for fast, deterministic builds
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Copy source directories
COPY backend /app/backend
COPY src /app/src

WORKDIR /app/backend

# Sync and install Python dependencies
RUN uv sync

EXPOSE 8000

# Start FastAPI application
CMD ["uv", "run", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
