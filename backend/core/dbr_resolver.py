"""
backend/core/dbr_resolver.py
============================
Centralized resolver and offline cache for Master DBR (Database Record).
Provides standardized access for GrabFood, ShopeeFood, and GoFood scrapers,
as well as CLI and Database Seeding.
"""

import os
import io
import csv
import time
import logging
import urllib.request
import urllib.parse
from pathlib import Path

# Setup local logger
log = logging.getLogger("dbr_resolver")
if not log.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [DBR] %(message)s", datefmt="%H:%M:%S")
    ch.setFormatter(formatter)
    log.addHandler(ch)
    log.setLevel(logging.INFO)

MASTER_DBR_URL = (
    os.getenv("MASTER_DBR_URL")
    or "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsAq8JmDfGI8KY7aSCRpzC2EaQARkK1OvhWrll7g3qlxFMIcwtDpAF-Wxf4aQnGET4eCmncjdEgre5/pub?output=csv"
)

BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_FILE = BASE_DIR / "data" / "cache_master_dbr.csv"
DEFAULT_TTL_SECONDS = 1800  # 30 minutes


def _clean_str(val) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    return "" if s.lower() in ("-", "nan", "none", "null") else s


def load_master_dbr_rows(force_refresh: bool = False, max_age_seconds: int = DEFAULT_TTL_SECONDS) -> tuple[list[str], list[list[str]]]:
    """
    Loads raw CSV rows from Master DBR with offline caching.
    Returns (header_list, data_rows_list).
    """
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    csv_text = None

    if not force_refresh and CACHE_FILE.exists():
        age = time.time() - os.path.getmtime(CACHE_FILE)
        if age < max_age_seconds:
            try:
                csv_text = CACHE_FILE.read_text(encoding="utf-8", errors="replace")
                log.debug(f"Using local DBR cache (age: {age/60:.1f} mins).")
            except Exception as e:
                log.warning(f"Failed reading DBR cache: {e}")

    if not csv_text:
        log.info("Downloading fresh Master DBR from Google Sheets...")
        try:
            cache_buster = f"&t={int(time.time())}" if "?" in MASTER_DBR_URL else f"?t={int(time.time())}"
            req = urllib.request.Request(
                MASTER_DBR_URL + cache_buster,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ElevateDBR/1.0"}
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                csv_text = resp.read().decode("utf-8", errors="replace")
            
            # Save to cache
            CACHE_FILE.write_text(csv_text, encoding="utf-8")
            log.info("Master DBR successfully cached locally.")
        except Exception as fetch_err:
            if CACHE_FILE.exists():
                log.warning(f"Online download failed ({fetch_err}). Falling back to existing cache.")
                csv_text = CACHE_FILE.read_text(encoding="utf-8", errors="replace")
            else:
                log.error(f"Failed to fetch Master DBR and no cache available: {fetch_err}")
                return [], []

    reader = csv.reader(io.StringIO(csv_text))
    all_rows = list(reader)
    if not all_rows:
        return [], []

    header = [h.strip() for h in all_rows[0]]
    return header, all_rows[1:]


def load_master_dbr_dataframe(force_refresh: bool = False):
    """
    Loads Master DBR as a pandas DataFrame with clean headers.
    """
    import pandas as pd
    header, rows = load_master_dbr_rows(force_refresh=force_refresh)
    if not header or not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows, columns=header)


def _get_val_by_col(row: list[str], header: list[str], col_name: str) -> str:
    try:
        idx = header.index(col_name)
        return _clean_str(row[idx]) if idx < len(row) else ""
    except ValueError:
        return ""


def get_grab_accounts(outlet_filter: str = None, branch_filter: str = None, user_filter: str = None, force_refresh: bool = False) -> list[dict]:
    """
    Resolves active GrabFood accounts from Master DBR.
    Filters: Aplikator == 'GrabFood', Status Internal == 'Live', and valid credentials.
    """
    header, rows = load_master_dbr_rows(force_refresh=force_refresh)
    accounts = []

    target_outlets = [o.strip().lower() for o in outlet_filter.split("|") if o.strip()] if outlet_filter else None
    target_branches = [b.strip().lower() for b in branch_filter.split("|") if b.strip()] if branch_filter else None
    target_users = [u.strip().lower() for u in user_filter.split("|") if u.strip()] if user_filter else None

    for r in rows:
        app = _get_val_by_col(r, header, "Aplikator")
        status = _get_val_by_col(r, header, "Status Internal")
        if app.lower() != "grabfood" or status.lower() != "live":
            continue

        user = _get_val_by_col(r, header, "Nama Pengguna")
        pwd = _get_val_by_col(r, header, "Kata Sandi")
        outlet = _get_val_by_col(r, header, "Outlet")
        brand = _get_val_by_col(r, header, "Nama Brand")
        store_id = _get_val_by_col(r, header, "Store ID")
        group_id = _get_val_by_col(r, header, "Group ID")

        if not user or not pwd:
            continue

        if target_outlets and not any(t in outlet.lower() for t in target_outlets):
            continue
        if target_branches and not any(t in brand.lower() for t in target_branches):
            continue
        if target_users and not any(t in user.lower() for t in target_users):
            continue

        accounts.append({
            "outlet": outlet,
            "nama_outlet": outlet,
            "branch": brand,
            "nama_brand": brand,
            "user": user,
            "pwd": pwd,
            "password": pwd,
            "store_id": store_id,
            "group_id": group_id
        })

    return accounts


def get_shopee_merchants(merchant_filter: str = None, force_refresh: bool = False) -> list[str]:
    """
    Resolves unique active ShopeeFood 'Nama Portal' list from Master DBR.
    Filters: Aplikator == 'ShopeeFood' and Status Internal == 'Live'.
    """
    header, rows = load_master_dbr_rows(force_refresh=force_refresh)
    portals = []
    seen = set()

    target_merchants = [m.strip().lower().rstrip("_") for m in merchant_filter.split("|") if m.strip()] if merchant_filter else None

    for r in rows:
        app = _get_val_by_col(r, header, "Aplikator")
        status = _get_val_by_col(r, header, "Status Internal")
        if app.lower() != "shopeefood" or status.lower() != "live":
            continue

        portal = _get_val_by_col(r, header, "Nama Portal")
        if not portal:
            continue

        clean_portal = portal.rstrip("_").strip()
        if target_merchants:
            portal_low = clean_portal.lower()
            if not any(t in portal_low or portal_low in t for t in target_merchants):
                continue

        if clean_portal not in seen:
            seen.add(clean_portal)
            portals.append(clean_portal)

    return portals


def get_shopee_staff_credentials(force_refresh: bool = False) -> tuple[str, str]:
    """
    Resolves central 'allvbadmin' staff username and password from Master DBR.
    """
    header, rows = load_master_dbr_rows(force_refresh=force_refresh)
    for r in rows:
        app = _get_val_by_col(r, header, "Aplikator")
        if app.lower() == "shopeefood":
            user = _get_val_by_col(r, header, "S Allvbadmin Username Akses Staff")
            pwd = _get_val_by_col(r, header, "S Allvbadmin Kata Sandi Akses Staff")
            if user and pwd:
                return user, pwd
    return "", ""


def get_gofood_accounts(outlet_filter: str = None, branch_filter: str = None, task: str = "2", force_refresh: bool = False) -> list[dict]:
    """
    Resolves active GoFood accounts from Master DBR.
    Filters: Aplikator == 'GoFood' and Status Internal == 'Live'.
    """
    header, rows = load_master_dbr_rows(force_refresh=force_refresh)
    accounts = []

    target_outlets = [o.strip().lower() for o in outlet_filter.split("|") if o.strip()] if outlet_filter else None
    target_branches = [b.strip().lower() for b in branch_filter.split("|") if b.strip()] if branch_filter else None

    for r in rows:
        app = _get_val_by_col(r, header, "Aplikator")
        status = _get_val_by_col(r, header, "Status Internal")
        if app.lower() != "gofood" or status.lower() != "live":
            continue

        outlet = _get_val_by_col(r, header, "Outlet")
        brand = _get_val_by_col(r, header, "Nama Brand")
        store_id = _get_val_by_col(r, header, "Store ID")
        phone = _get_val_by_col(r, header, "Nomor HP")
        em1 = _get_val_by_col(r, header, "Email FoodMaster1")
        em2 = _get_val_by_col(r, header, "Email FoodMaster2")

        emails = []
        if em1 and "@" in em1:
            emails.append(em1)
        if em2 and "@" in em2 and em2 not in emails:
            emails.append(em2)

        primary_email = emails[0] if emails else ""
        if not phone and not primary_email:
            continue

        if target_outlets and not any(t in outlet.lower() for t in target_outlets):
            continue
        if target_branches and not any(t in brand.lower() for t in target_branches):
            continue

        accounts.append({
            "phone": phone,
            "email": primary_email,
            "emails": emails,
            "nama_outlet": outlet,
            "cabang": brand or "Tanpa Cabang",
            "store_id": store_id,
        })

    return accounts
