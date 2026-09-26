import os
import secrets
from typing import Optional
from fastapi import Header, HTTPException, Query, status
from dotenv import load_dotenv

load_dotenv()

# Internal API Key for worker scrapers (Tailscale mesh communication)
DEFAULT_INGEST_KEY = "elevate_internal_tailscale_secret_key_2026"
CONFIGURED_INGEST_KEY = os.getenv("ELEVATE_INGEST_API_KEY", DEFAULT_INGEST_KEY).strip()


def verify_ingest_api_key(
    x_elevate_api_key: Optional[str] = Header(None, alias="X-Elevate-API-Key"),
    api_key: Optional[str] = Query(None, alias="api_key"),
) -> str:
    """
    Verifies that incoming ingestion requests carry a valid internal API Key.
    Supports either 'X-Elevate-API-Key' header (recommended) or '?api_key=' query parameter.
    Uses constant-time comparison to prevent timing attack vulnerabilities.
    """
    token = x_elevate_api_key or api_key
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials. Header 'X-Elevate-API-Key' is required.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Constant-time comparison
    if not secrets.compare_digest(token.strip(), CONFIGURED_INGEST_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key. Access denied to ingestion endpoint.",
        )

    return token
