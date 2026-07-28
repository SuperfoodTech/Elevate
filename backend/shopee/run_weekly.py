import os
import time
import json
import threading
import pandas as pd
import sys
# Add parent directory (weekly/) to sys.path so core/ imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import requests

from core.browser import get_session, return_to_selector, refresh_tokens, auto_switch_merchant
from core.client import ShopeeClient
from core.logger import get_logger
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

# Load environment variables
load_dotenv()
log = get_logger("omzet_pipeline")

# --- Toggle Konfigurasi Global ---
ENABLE_GSHEETS_PUSH = False   # Set ke True untuk mengizinkan unggah ke Google Sheets
ENABLE_POSTGRES_PUSH = True  # Set ke True untuk mengizinkan unggah ke PostgreSQL (Tabel Gajah)

def subtract_months(dt, months):
    """Helper to subtract calendar months."""
    for _ in range(months):
        dt = (dt - timedelta(days=1)).replace(day=1)
    return dt

def get_live_merchants(app_name="ShopeeFood", max_age_hours=0.01, merchant_filter=None):
    """
    Fetches live merchants from Google Sheets and caches them locally.
    Uses cached data if it's less than max_age_hours old.
    """
    import os
    import time
    from datetime import datetime
    
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3tLKBNXDqRgBw0mNhKZFxgvKx-JoiTDzm_s5Ix1cm7O6HCv4IvExOLR2HSRVaXSsx82V348mcr9X4/pub?output=csv"
    cache_path = "data/master_merchants_cache.csv"
    os.makedirs("data", exist_ok=True)
    
    # Cek cache
    if os.path.exists(cache_path):
        mtime = os.path.getmtime(cache_path)
        age_hours = (time.time() - mtime) / 3600
        if age_hours < max_age_hours:
            log.info(f"🔄 [DATA] Using cached merchant list (Age: {age_hours:.1f}h)")
            df = pd.read_csv(cache_path)
            sf_df = df[(df['Aplikasi'] == app_name) & (df['Status'] == 'Live')]
            
            if merchant_filter:
                if "|" in merchant_filter:
                    filter_vals = [m.strip().lower().rstrip('_') for m in merchant_filter.split("|")]
                    sf_df = sf_df[sf_df['Merchant Name'].str.strip().str.lower().str.rstrip('_').isin(filter_vals)]
                else:
                    filter_val = merchant_filter.strip().lower().rstrip('_')
                    sf_df = sf_df[sf_df['Merchant Name'].str.strip().str.lower().str.rstrip('_') == filter_val]
                
            sf_df = sf_df[(sf_df['Merchant Name'] != '-') & (sf_df['Merchant Name'].notna())]
            sf_df = sf_df.drop_duplicates(subset=['Merchant Name'])
            return sf_df['Merchant Name'].tolist()
            
    # Jika tidak ada cache atau sudah usang, download ulang
    log.info("🌐 [DATA] Downloading fresh merchant list from Google Sheets...")
    try:
        cache_buster = f"&t={int(time.time())}" if "?" in url else f"?t={int(time.time())}"
        df = pd.read_csv(url + cache_buster)
        df.to_csv(cache_path, index=False)
        
        sf_df = df[(df['Aplikasi'] == app_name) & (df['Status'] == 'Live')]
        
        if merchant_filter:
            if "|" in merchant_filter:
                filter_vals = [m.strip().lower().rstrip('_') for m in merchant_filter.split("|")]
                sf_df = sf_df[sf_df['Merchant Name'].str.strip().str.lower().str.rstrip('_').isin(filter_vals)]
            else:
                filter_val = merchant_filter.strip().lower().rstrip('_')
                sf_df = sf_df[sf_df['Merchant Name'].str.strip().str.lower().str.rstrip('_') == filter_val]
            
        sf_df = sf_df[(sf_df['Merchant Name'] != '-') & (sf_df['Merchant Name'].notna())]
        sf_df = sf_df.drop_duplicates(subset=['Merchant Name'])
        
        return sf_df['Merchant Name'].tolist()
    except Exception as e:
        log.error(f"⚠️ Failed to fetch/parse merchants: {e}")
        return []

def download_file(url, filename, cookies=None, max_retries=3):
    """Downloads a file from a URL with optional cookies and retries."""
    import requests
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, stream=True, cookies=cookies, headers=headers, timeout=30)
            response.raise_for_status()
            with open(filename, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                log.warning(f"⚠️ Download attempt {attempt+1} failed for {filename}: {e}. Retrying in 5s...")
                time.sleep(5)
            else:
                log.error(f"❌ Failed to download {filename} after {max_retries} attempts: {e}")
    return False


# ── Parallel Polling Helper ───────────────────────────────────────────────────

_download_lock = threading.Lock()  # Ensure thread-safe file path deduplication

def _poll_and_download_merchant(m_name, ctx, report_dir, global_ranges, poll_timeout=1800):
    """
    Polls and downloads exported reports for a single merchant.
    Designed to be run concurrently inside a ThreadPoolExecutor.

    Returns:
        (m_name: str, downloaded: list[tuple[path, label]], error: bool)
    """
    from core.client import ShopeeClient
    from core.logger import get_logger
    log = get_logger("omzet_pipeline")

    client = ShopeeClient(
        tob_token=ctx["tob_token"],
        entity_id=ctx["entity_id"],
        extra_cookies=ctx["cookies"]
    )
    downloaded = []
    start_poll = time.time()
    consecutive_errors = 0
    poll_round = 0

    while len(downloaded) < len(global_ranges) and (time.time() - start_poll) < poll_timeout:
        poll_round += 1
        reports = client.get_report_list()

        if reports is None:  # Network error
            consecutive_errors += 1
            wait = min(10 * (2 ** (consecutive_errors - 1)), 60)
            log.warning(f"  🌐 [THREAD] {m_name}: network error, retrying in {wait}s...")
            time.sleep(wait)
            continue

        consecutive_errors = 0
        found_new = False

        for rep in reports:
            if rep.get("status") not in [2, 3] or not rep.get("download_url"):
                continue
            if not rep.get("create_time", 0) or rep["create_time"] < ctx["start_trigger_time"]:
                continue

            report_name = rep.get("name", f"report_{rep.get('id')}.xlsx")
            base_path = os.path.join(report_dir, f"{m_name.replace(' ', '_')}_{report_name}")

            # Thread-safe path deduplication
            with _download_lock:
                target_path = base_path
                version = 1
                while os.path.exists(target_path):
                    version += 1
                    name_part, ext_part = os.path.splitext(base_path)
                    target_path = f"{name_part}-{version:02d}{ext_part}"
                # Create a placeholder so other threads don't pick the same path
                open(target_path, 'wb').close()

            already = [d[0] for d in downloaded]
            if target_path in already:
                try: os.unlink(target_path)
                except: pass
                continue

            if download_file(rep.get("download_url"), target_path):
                log.info(f"  ✅ [DOWNLOAD] {m_name} → {report_name}")
                downloaded.append((target_path, report_name))
                found_new = True
            else:
                # Remove placeholder on failed download
                try: os.unlink(target_path)
                except: pass

        if not found_new and poll_round % 6 == 0:  # log every ~30s
            elapsed = int(time.time() - start_poll)
            log.info(f"  ⏳ [THREAD] {m_name}: waiting... ({len(downloaded)}/{len(global_ranges)} ready, {elapsed}s elapsed)")

        if len(downloaded) < len(global_ranges):
            time.sleep(5)  # Per-merchant poll interval: 5s (vs old 10s shared across all)

    if len(downloaded) < len(global_ranges):
        log.warning(f"  ⏰ [THREAD] {m_name}: timeout — {len(downloaded)}/{len(global_ranges)} files downloaded.")

    return m_name, downloaded


def run_pipeline():
    import argparse
    parser = argparse.ArgumentParser(description="Shopee Omzet Weekly Pipeline")
    parser.add_argument("--start", type=str, help="Start date (YYYY-MM-DD)", default=None)
    parser.add_argument("--end", type=str, help="End date (YYYY-MM-DD)", default=None)
    parser.add_argument("--output-dir", type=str, help="Override output directory for reports", default=None)
    parser.add_argument("--skip-download", action="store_true", help="Skip browser automation and only process/merge raw files in output directory")
    parser.add_argument("--skip-existing", action="store_true", help="Skip already processed merchants")
    parser.add_argument("--merchant", type=str, help="Filter specific merchant name to run", default=None)
    args = parser.parse_args()

    # Determine output directory
    report_dir = args.output_dir or "data/reports/weekly"
    os.makedirs(report_dir, exist_ok=True)

    # Pre-run cleanup of old Excel files in custom or download runs to ensure clean master aggregation
    import glob
    if not args.skip_download and os.path.exists(report_dir):
        if args.merchant:
            merchants_to_clean = [m.strip().replace(' ', '_') for m in args.merchant.split('|')]
            old_excels = []
            for m_clean in merchants_to_clean:
                # Find files starting with this merchant name
                old_excels.extend(glob.glob(os.path.join(report_dir, f"{m_clean}_*.xlsx")))
                # Find CUSTOM_ files containing this merchant name
                old_excels.extend(glob.glob(os.path.join(report_dir, f"CUSTOM_*{m_clean}*.xlsx")))
            # Find and clean up 0Master*.xlsx
            old_excels.extend(glob.glob(os.path.join(report_dir, "0Master*.xlsx")))
        else:
            old_excels = glob.glob(os.path.join(report_dir, "*.xlsx"))
            
        # Exclude Master_Weekly_Report_ShopeeFood from being deleted
        old_excels = [f for f in old_excels if not os.path.basename(f).startswith("Master_Weekly_Report_ShopeeFood")]
        
        # If full run, also exclude 0Master from being deleted (user wants to keep master reports in full runs)
        if not args.merchant:
            old_excels = [f for f in old_excels if not os.path.basename(f).startswith("0Master")]
            
        if old_excels:
            # Remove duplicates if any
            old_excels = list(set(old_excels))
            log.info(f"🧹 Clearing {len(old_excels)} old Excel files in {report_dir} to prepare for fresh run...")
            for f in old_excels:
                try: os.unlink(f)
                except Exception as e: log.debug(f"Failed to delete {f}: {e}")

    # Determine date range
    now = datetime.now()
    if args.start and args.end:
        start_dt = datetime.strptime(args.start, "%Y-%m-%d")
        end_dt = datetime.strptime(args.end, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        label = f"{start_dt.strftime('%d %b %Y')} - {end_dt.strftime('%d %b %Y')}"
    else:
        # Default to last 7 days (including today)
        end_dt = now.replace(hour=23, minute=59, second=59)
        start_dt = (end_dt - timedelta(days=6)).replace(hour=0, minute=0, second=0)
        label = f"{start_dt.strftime('%d %b %Y')} - {end_dt.strftime('%d %b %Y')} (Last 7 Days)"
        
    global_ranges = [{"start": int(start_dt.timestamp()), "end": int(end_dt.timestamp()), "label": label}]
    
    print("\n" + "=" * 60)
    print(f"  Shopee Omzet - WEEKLY Report Pipeline")
    print(f"  Range: {label}")
    print("=" * 60)

    phone    = os.getenv("SHOPEE_PHONE", "").strip()
    username = os.getenv("SHOPEE_USERNAME", "").strip()
    password = os.getenv("SHOPEE_PASSWORD", "").strip()

    # Fallback: Load Shopee credentials from credentials.json in parent directories if not in env
    if not username or not password:
        try:
            from pathlib import Path
            import json
            for parent in Path(__file__).resolve().parents:
                cred_file = parent / "credentials.json"
                if cred_file.exists():
                    with open(cred_file, "r") as f:
                        creds = json.load(f)
                        if not username:
                            username = creds.get("shopee_username", "").strip()
                        if not password:
                            password = creds.get("shopee_password", "").strip()
                        if not phone:
                            phone = creds.get("shopee_phone", "").strip()
                    break
        except Exception:
            pass

    # Hardcoded/CSV fallback if still not found
    if not username or not password or not phone:
        try:
            log.info("🔍 [DATA] Fetching credentials from new Google Sheets (Row 7, Col T & U)...")
            url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYSUnKOqk29LCktTxdb0wPLbWMbRaWRP3eC_UA4AwYod1FW6zDMhtLMC5ghIvot2B8upCDfBsn-TCP/pub?gid=0&single=true&output=csv"
            cache_buster = f"&t={int(time.time())}" if "?" in url else f"?t={int(time.time())}"
            df = pd.read_csv(url + cache_buster)
            
            # Row 7 corresponds to index 5 in pandas DataFrame (since row 1 is header).
            # Column T is index 19, Column U is index 20.
            username = str(df.iloc[5, 19]).strip()
            password = str(df.iloc[5, 20]).strip()
            phone = ""
            
            log.info(f"✅ [DATA] Successfully loaded credentials for '{username}' from Sheets.")
        except Exception as e:
            log.warning(f"⚠️ Failed to fetch credentials from Sheets: {e}")
            
    # Ultimate fallback if it completely fails
    if not username: username = "allvbadmin"
    if not password: password = "Shopee@321"
    # Load headless setting from config.json walk-up
    headless = True
    try:
        from pathlib import Path
        import json
        for parent in Path(__file__).resolve().parents:
            config_file = parent / "config.json"
            if config_file.exists():
                with open(config_file, "r") as f:
                    headless = json.load(f).get("headless_shopee", True)
                break
    except Exception:
        pass

    if os.environ.get("HEADLESS") == "true":
        headless = True


    # ── 1. Determine Merchants to Process (Data-Driven via G-Sheets) ────
    target_merchants = get_live_merchants(app_name="ShopeeFood", max_age_hours=24, merchant_filter=args.merchant)
    
    # Filter out completed merchants if --skip-existing is set
    if args.skip_existing:
        active_merchants = []
        for m in target_merchants:
            safe_merchant = m.replace(" ", "_")
            import glob
            pattern = os.path.join(report_dir, f"{safe_merchant}_*.xlsx")
            matching_files = glob.glob(pattern)
            matching_files = [f for f in matching_files if not os.path.basename(f).startswith("Master_") and not os.path.basename(f).startswith("0Master")]
            if matching_files:
                log.info(f"⏭️ [SKIP] Merchant '{m}' is already completed (Excel file exists).")
            else:
                active_merchants.append(m)
        target_merchants = active_merchants
        if not target_merchants:
            log.info("⏭️ [SKIP] All merchants are already completed. Bypassing browser download phase.")
            args.skip_download = True

    log.info(f"📋 [PROGRESS] Found {len(target_merchants)} live merchants ready to process.")

    if not target_merchants:
        log.error("❌ No merchants to process. Aborting.")
        return

    driver = None
    if args.skip_download:
        log.info("⏭️ [SKIP] Bypassing browser download phase (Phases 1 & 2) as --skip-download is enabled.")
    else:
        try:
            # ── 2. Phase 1: Rapid Trigger (Trigger exports for all) ────────────
            log.info(f"🚀 [PROGRESS] PHASE 1: Triggering Exports for {len(target_merchants)} merchants...")
        
            # Initialize session
            session_data = get_session(username=username or None, password=password or None, phone=phone or None, 
                                       headless=headless, close_browser=False, target_name=target_merchants[0])
            if not session_data: return
            driver = session_data.get("driver")

            merchants_context = {} # Store tokens/ids for each merchant
            failed_merchants = []
            start_time_all = int(time.time())

            for i, merchant_name in enumerate(target_merchants):
                log.info(f"  [{i+1}/{len(target_merchants)}] Processing: {merchant_name}")
            
                # Switch if not already there
                if i > 0:
                    switch_success = False
                    for retry in range(2):
                        if auto_switch_merchant(driver, merchant_name):
                            switch_success = True
                            break
                        else:
                            log.warning(f"  ⚠️ Retrying switch for {merchant_name} (Attempt {retry+2}/2)...")
                            time.sleep(3)
                
                    if not switch_success:
                        log.warning(f"  ❌ Skipping {merchant_name} after 2 failed switch attempts.")
                        if merchant_name not in failed_merchants: failed_merchants.append(merchant_name)
                        continue
                    time.sleep(3) # Wait for cookies to sync
            
                # Get tokens and VERIFY ID
                session = refresh_tokens(driver)
                if not session or "shopee_tob_token" not in session:
                    log.warning(f"  ❌ Failed to get auth data for {merchant_name}. Skipping.")
                    if merchant_name not in failed_merchants: failed_merchants.append(merchant_name)
                    continue
                active_id = str(session.get("shopee_tob_entity_id") or "")
            
                # Double check if the ID actually changed from previous
                if i > 0 and active_id == merchants_context.get(target_merchants[i-1], {}).get("entity_id"):
                     log.warning("  ⚠️ ID hasn't changed yet. Retrying token refresh...")
                     time.sleep(3)
                     session = refresh_tokens(driver)
                     active_id = str(session.get("shopee_tob_entity_id") or "")

                log.debug(f"  📍 Confirmed ID for {merchant_name}: {active_id}")
            
                # Store context for polling
                ctx = {
                    "entity_id": active_id,
                    "tob_token": session["shopee_tob_token"],
                    "cookies": session.get("extra_cookies", {}),
                    "start_trigger_time": int(time.time()),
                    "ranges": global_ranges,
                    "downloaded": []
                }
                merchants_context[merchant_name] = ctx

                # Initialize client and trigger
                client = ShopeeClient(tob_token=session["shopee_tob_token"], entity_id=active_id, extra_cookies=session.get("extra_cookies", {}))
            
                # Assign ranges based on CLI arguments
                ranges = global_ranges
            
                # Trigger with retry on network error
                trigger_success = True
                for r in ranges:
                    success = False
                    for trigger_retry in range(3):
                        res = client.export_transaction_report(merchant_ids=[active_id], start_time=r["start"], end_time=r["end"])
                        if res is True:
                            success = True
                            break
                        elif res is None: # Network Error
                            log.warning(f"  ⚠️ Network error during trigger for {merchant_name}. Retrying in 10s... ({trigger_retry+1}/3)")
                            time.sleep(10)
                        else: # API Error (res is False)
                            break
                
                    if not success:
                        log.error(f"  ❌ Failed to trigger export for {merchant_name} range {r.get('label')}")
                        trigger_success = False
                    time.sleep(1)

                if trigger_success:
                    # Immediately poll and download for this merchant
                    log.info(f"  ⏳ Polling and downloading report for {merchant_name}...")
                    _, downloaded_files = _poll_and_download_merchant(
                        merchant_name, ctx, report_dir, global_ranges
                    )
                    ctx["downloaded"] = downloaded_files
                else:
                    ctx["downloaded"] = []

                # Batching delay: 10 merchants per batch, with 15 seconds sleep between batches
                if (i + 1) % 10 == 0 and (i + 1) < len(target_merchants):
                    log.info(f"⏳ [BATCH] Batch limit reached ({i + 1} merchants processed). Delaying for 15 seconds before processing the next batch...")
                    time.sleep(15)

            # ── Summary ──────────────────────────────────────────────────────────
            log.info("📋 [PROGRESS] Download Phase Complete. Summary:")
            for m_name, ctx in merchants_context.items():
                if len(ctx["downloaded"]) < len(global_ranges):
                    if m_name not in failed_merchants:
                        failed_merchants.append(m_name)
                log.info(f"  🏪 {m_name}: {len(ctx['downloaded'])}/{len(global_ranges)} files")
                for fpath, label in ctx["downloaded"]:
                    log.info(f"     📄 {fpath}")

            # ── Sequential Retry ────────────────────────────────────────────────
            if failed_merchants:
                log.info("\n" + "="*60)
                log.info(f"  [RETRY] Attempting to re-run {len(failed_merchants)} failed merchants sequentially...")
                log.info("="*60)
                
                for f_idx, m_name in enumerate(failed_merchants):
                    log.info(f"\n  [RETRY {f_idx+1}/{len(failed_merchants)}] Re-running sequentially for: {m_name}")
                    
                    # 1. Switch
                    switch_success = False
                    for retry in range(2):
                        if auto_switch_merchant(driver, m_name):
                            switch_success = True
                            break
                        else:
                            time.sleep(3)
                    
                    if not switch_success:
                        log.error(f"  ❌ [RETRY] Failed to switch to {m_name}.")
                        continue
                    time.sleep(3)
                    
                    # 2. Auth
                    session = refresh_tokens(driver)
                    if not session or "shopee_tob_token" not in session:
                        log.error(f"  ❌ [RETRY] Failed to get auth for {m_name}.")
                        continue
                    
                    active_id = str(session.get("shopee_tob_entity_id") or "")
                    client = ShopeeClient(tob_token=session["shopee_tob_token"], entity_id=active_id, extra_cookies=session.get("extra_cookies", {}))
                    
                    # 3. Trigger & Poll Sequentially
                    for r in global_ranges:
                        # Trigger
                        trigger_success = False
                        for trigger_retry in range(3):
                            res = client.export_transaction_report(merchant_ids=[active_id], start_time=r["start"], end_time=r["end"])
                            if res is True:
                                trigger_success = True
                                break
                            elif res is None:
                                time.sleep(10)
                            else:
                                break
                        
                        if not trigger_success:
                            log.error(f"  ❌ [RETRY] Failed to trigger export for {m_name}.")
                            continue
                            
                        # Poll just this merchant
                        start_trigger_time = int(time.time())
                        poll_timeout = 1800
                        start_poll = time.time()
                        downloaded = False
                        
                        while not downloaded and (time.time() - start_poll) < poll_timeout:
                            reports = client.get_report_list()
                            if reports is None:
                                time.sleep(10)
                                continue
                                
                            for rep in reports:
                                if rep.get("status") in [2, 3] and rep.get("download_url"):
                                    if rep.get("create_time", 0) and rep["create_time"] >= start_trigger_time:
                                        report_name = rep.get("name", f"report_{rep.get('id')}.xlsx")
                                        base_target_path = os.path.join(report_dir, f"{m_name.replace(' ', '_')}_{report_name}")
                                        target_path = base_target_path
                                        version = 1
                                        while os.path.exists(target_path):
                                            version += 1
                                            name_part, ext_part = os.path.splitext(base_target_path)
                                            target_path = f"{name_part}-{version:02d}{ext_part}"
                                            
                                        if download_file(rep.get("download_url"), target_path):
                                            log.info(f"  ✅ [RETRY DOWNLOAD] SUCCESS: {m_name} -> {report_name}")
                                            downloaded = True
                                            merchants_context[m_name]["downloaded"].append((target_path, report_name))
                                            break
                            if not downloaded:
                                time.sleep(5)
                        
                        if not downloaded:
                            log.error(f"  ❌ [RETRY] Timeout waiting for download: {m_name}")

            # --- Print final processing summary ---
            final_failures = []
            for m_name, ctx in merchants_context.items():
                if len(ctx.get("downloaded", [])) < len(global_ranges):
                    final_failures.append(m_name)
            
            log.info("\n" + "="*60)
            log.info("  ALL MERCHANTS FINISHED PROCESSING")
            if final_failures:
                log.info("-" * 60)
                log.info(f"  FAILED MERCHANTS ({len(final_failures)}):")
                for fm in final_failures:
                    log.info(f"  - {fm}")
            else:
                log.info("  ✓ ALL MERCHANTS PROCESSED SUCCESSFULLY")
            log.info("="*60 + "\n")

        finally:
            if driver is not None:
                try:
                    driver.quit()
                except Exception as e:
                    log.debug(f"Failed to quit driver: {e}")
    # ── 4. Phase 3: Scanning and Validating ALL Raw Files in report folder ──
    log.info("📊 [PROGRESS] PHASE 3: Scanning and Validating ALL Raw Files in report folder...")
    all_analyzed_data = []
    
    # Get all xlsx files in report_dir
    import glob
    xlsx_files = glob.glob(os.path.join(report_dir, "*.xlsx"))
    
    # Sort files to ensure deterministic merging order
    xlsx_files.sort()
    
    for fpath in xlsx_files:
        filename = os.path.basename(fpath)
        
        # Skip Master and other compiled/analyzed reports
        if filename.startswith("Master_") or filename.startswith("0Master") or filename.startswith("CUSTOM_") or filename.startswith("Merged_") or filename.endswith("_Analyzed.xlsx"):
            continue
            
        # Determine Merchant Name from filename
        matched_merchant = None
        for m in target_merchants:
            m_underscored = m.replace(' ', '_')
            # Check if filename starts with underscored merchant name followed by underscore
            if filename.startswith(m_underscored + "_"):
                matched_merchant = m
                break
                
        if not matched_merchant:
            # Skip files that do not match the current target merchants to prevent merging them!
            log.info(f"  ⏭️ [SKIP] Raw file '{filename}' does not belong to target merchants. Skipping.")
            continue
                
        try:
            # Pengecekan apakah file memiliki data (tidak kosong)
            df = pd.read_excel(fpath, dtype=str)
            
            if df.empty or len(df) == 0:
                log.warning(f"  ⚠️ [CHECK] Raw file '{filename}' is EMPTY (no transaction rows). Skipping merger.")
                continue
                
            has_indo = "Nilai Transaksi" in df.columns and "Harga Makanan" in df.columns
            has_eng = "Transaction amount" in df.columns and "Food original price" in df.columns
            
            if has_indo or has_eng:
                log.info(f"  🔍 [CHECK] Raw file '{filename}' has {len(df)} rows. Processing & including in MASTER...")
                # (Dinonaktifkan agar raw: tidak ada cleaning monetary, kalkulasi komisi, atau format tanggal)
                
                # Add Merchant Name column at the beginning if not already present
                if "Merchant Name" not in df.columns:
                    df.insert(0, "Merchant Name", matched_merchant)
                
                # Fix scientific notation for Order IDs (tetap dipakai agar ID tidak float)
                for col in ["No. Pesanan", "Transaction ID (Order ID)"]:
                    if col in df.columns:
                        df[col] = df[col].astype(str).str.replace(r'\.0$', '', regex=True)
                    
                # (Overwriting raw file in place dinonaktifkan agar file original aman)
                # df.to_excel(fpath, index=False)
                # log.info(f"     ✅ [DATA] Saved analyzed data (overwriting raw file): {os.path.basename(fpath)}")
                
                all_analyzed_data.append(df)
            else:
                log.warning(f"  ⚠️ [CHECK] Raw file '{filename}' is missing required columns. Skipping.")
        except Exception as e:
            log.error(f"  ❌ Error processing '{filename}': {e}")

    # ── 5. Phase 4: Master Aggregation ───────────────────────────────────
    if all_analyzed_data:
        log.info("📑 [PROGRESS] PHASE 4: Combining all analyzed reports...")
        master_df = pd.concat(all_analyzed_data, ignore_index=True)
        
        # --- Terapkan Filter Baseline (Long Order ID & Status) ---
        working = master_df.copy()
        
        if "No. Pesanan" in working.columns:
            working["Long Order ID"] = working["No. Pesanan"].fillna("").astype(str).str.strip()
        elif "Transaction ID (Order ID)" in working.columns:
            working["Long Order ID"] = working["Transaction ID (Order ID)"].fillna("").astype(str).str.strip()
        else:
            working["Long Order ID"] = ""
        
        if "Status Pesanan" in working.columns:
            working["Status"] = working["Status Pesanan"].fillna("").astype(str).str.strip().str.casefold()
        elif "Status" in working.columns:
            working["Status"] = working["Status"].fillna("").astype(str).str.strip().str.casefold()
        else:
            working["Status"] = ""

        # Aturan validasi: Dinonaktifkan sesuai permintaan (tanpa filter ID pesanan & cancel)
        master_df = working.copy()
        
        if master_df.empty:
            log.warning("⚠️ Tidak ada transaksi yang valid setelah filter diterapkan.")
            return
        
        # Determine date range for filename from global_ranges
        min_start = min([r['start'] for r in global_ranges])
        max_end = max([r['end'] for r in global_ranges])
        
        # Convert unix timestamp to readable date (DDMMYYYY)
        min_start_str = datetime.fromtimestamp(min_start).strftime('%d%m%Y')
        max_end_str = datetime.fromtimestamp(max_end).strftime('%d%m%Y')
        
        if args.merchant:
            merchant_safe = str(args.merchant).strip().replace(" ", "_").replace("/", "_").replace("\\", "_").replace("|", "_")
            if len(merchant_safe) > 50:
                master_filename = "0Master"
            else:
                master_filename = f"CUSTOM_{merchant_safe}_{min_start_str}_{max_end_str}"
        else:
            master_filename = "0Master"
            
        master_filepath = os.path.join(report_dir, f"{master_filename}.xlsx")
        version = 1
        while os.path.exists(master_filepath):
            version += 1
            master_filepath = os.path.join(report_dir, f"{master_filename}-{version:02d}.xlsx")
        
        master_df.to_excel(master_filepath, index=False)
        log.info(f"🎉 [SUCCESS] Laporan created: {master_filepath}")
        log.info(f"   Total rows: {len(master_df)}")

        # ── 6. Phase 5: Distribution to Google Sheets ──────────────────────
        apps_script_url = "https://script.google.com/macros/s/AKfycbxuqQ72VfP-5f-h-ud1XZDgG47KDwyP8gDg2AFzIjq6JrnZnWGenRs50G06RxsPiSxj/exec"
        if not ENABLE_GSHEETS_PUSH:
            log.info("⏭️ [SKIP] PHASE 5: Distribusi ke Google Sheets dinonaktifkan secara global.")
        elif args.merchant:
            log.info("⏭️ [SKIP] PHASE 5: Custom Merchant run dideteksi. Distribusi ke Google Sheets dilewati untuk mencegah kerusakan data master.")
        elif apps_script_url:
            log.info("📤 [PROGRESS] PHASE 5: Sending data to Google Sheets...")
            
            # Mapping columns to match 'Shopee' sheet headers
            # Target Headers: Flag,Month,Store ID,Store name,Transaction type,Transaction ID (Order ID),Complete Time,Status,Food original price,Item discounts,Flash sale discount,Surcharge fee,Merchant Voucher Deals Subsidy,Platform Flash Sale Subsidy,Food Voucher Subsidy,Food Direct Discount,Transaction amount,Checkout Murah Price,Notes,Net Sales,Commission,Revenue,Move to OE/OP
            
            # (Dinonaktifkan agar raw: tidak ada modifikasi/mapping kolom)
            final_df = master_df.copy()
            
            # Convert to list of dicts for JSON (Handle NaN values)
            payload = final_df.fillna("").to_dict(orient="records")
            
            # Send to Apps Script with retries
            success_send = False
            for send_attempt in range(3):
                try:
                    response = requests.post(
                        f"{apps_script_url}?sheet=Shopee&clear=true",
                        json=payload,
                        timeout=90 # Increased timeout
                    )
                    if response.status_code == 200:
                        res_json = response.json()
                        if res_json.get("status") == "success":
                            log.info(f"✅ [SUCCESS] Sent {len(payload)} rows to Shopee sheet.")
                            success_send = True
                            break
                        else:
                            log.error(f"❌ [ERROR] Apps Script error: {res_json.get('message')}")
                            break # If it's a logic error, don't retry
                    else:
                        log.warning(f"⚠️ Failed to send data (Attempt {send_attempt+1}/3): HTTP {response.status_code}")
                except Exception as e:
                    log.warning(f"⚠️ Connection error to Apps Script (Attempt {send_attempt+1}/3): {e}")
                
                if send_attempt < 2:
                    time.sleep(10)
            
            if not success_send:
                log.error("❌ Failed to send data to Google Sheets after multiple attempts.")
        else:
            log.warning("⚠️ [SKIP] APPS_SCRIPT_URL not found in .env. Skipping distribution.")

        # ── 7. Phase 6: Sync to PostgreSQL ──────────────────────────────────
        if not ENABLE_POSTGRES_PUSH:
            log.info("⏭️ [SKIP] PHASE 6: Sinkronisasi ke PostgreSQL dinonaktifkan secara global.")
        else:
            try:
                log.info("🐘 [PROGRESS] PHASE 6: Syncing RAW data to VPS PostgreSQL (layer1_raw.raw_shopee)...")
                
                # Menyiapkan data RAW untuk diupload (menggabungkan semua file Excel mentah yang berhasil diproses)
                if all_analyzed_data:
                    raw_merged_df = pd.concat(all_analyzed_data, ignore_index=True)
                    
                    target_cols = [
                        'Store ID', 'Store name', 'Transaction type', 'Transaction ID (Order ID)', 'Complete Time', 'Status',
                        'Food original price', 'Item discounts', 'Flash sale discount', 'Surcharge fee',
                        'Merchant Voucher Deals Subsidy', 'Platform Flash Sale Subsidy', 'Food Voucher Subsidy',
                        'Food Direct Discount', 'Transaction amount', 'Checkout Murah Price', 'Notes'
                    ]
                    
                    # Ensure columns exist
                    for col in target_cols:
                        if col not in raw_merged_df.columns:
                            raw_merged_df[col] = ''
                            
                    final_raw_df = raw_merged_df[target_cols].copy()
                    
                    # Save temporary CSV
                    csv_path = os.path.join(report_dir, 'temp_upload_shopee.csv')
                    final_raw_df.to_csv(csv_path, index=False)
                    log.info(f"  📄 Saved temp CSV with {len(final_raw_df)} rows at {csv_path}")
                    
                    # Gunakan pexpect untuk SSH ke VPS dan copy data
                    import pexpect
                    cmd = [
                        'ssh', '-o', 'StrictHostKeyChecking=no', '-i', '/mnt/DATA/Proyek/ssh/radi_ed25519', 'radi@165.232.165.241',
                        'docker exec -i postgres-elevate psql -U admin -d db_superfood -c "\\copy layer1_raw.raw_shopee FROM stdin WITH CSV HEADER"'
                    ]
                    
                    log.info("  🔌 Menghubungkan ke VPS via SSH...")
                    child = pexpect.spawn(cmd[0], cmd[1:], encoding='utf-8')
                    
                    idx = child.expect(['Enter passphrase for key.*:', pexpect.EOF], timeout=15)
                    if idx == 0:
                        child.sendline('superF763!')
                        
                    with open(csv_path, 'r') as f:
                        child.send(f.read())
                        child.sendeof()
                        
                    child.expect(pexpect.EOF, timeout=60)
                    out_text = child.before.strip() if child.before else ""
                    log.info(f"✅ [SUCCESS] Data berhasil ditembakkan ke VPS (layer1_raw.raw_shopee). Output: {out_text}")
                    
                    # Hapus file temp
                    try: os.unlink(csv_path)
                    except: pass
                else:
                    log.warning("⚠️ [SKIP] Tidak ada data raw yang valid untuk diupload ke VPS.")
                    
            except Exception as e:
                log.error(f"❌ [ERROR] Gagal mengupload data ke VPS: {e}")

    # Driver cleanup handled in finally block of download phase
    pass


if __name__ == "__main__":
    run_pipeline()
