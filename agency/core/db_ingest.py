import os
import re
import glob
import urllib.parse
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path configuration
core_dir = os.path.dirname(os.path.abspath(__file__))
agency_dir = os.path.dirname(core_dir)
root_dir = os.path.dirname(agency_dir)
src_db_dir = os.path.join(root_dir, "src", "database")

# Load .env priority: agency/.env -> src/database/.env -> root .env
load_dotenv(os.path.join(agency_dir, ".env"))
load_dotenv(os.path.join(src_db_dir, ".env"), override=True)
load_dotenv(os.path.join(root_dir, ".env"), override=True)
load_dotenv()

# ANSI Colors for clean terminal logging
RESET   = "\033[0m"
BOLD    = "\033[1m"
GREEN   = "\033[92m"
CYAN    = "\033[96m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
MAGENTA = "\033[95m"
DIM     = "\033[2m"

def get_db_engine():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL:
        db_url = DATABASE_URL
    else:
        DB_HOST = (os.getenv("DB_HOST") or "165.232.165.241").strip("'").strip('"').strip()
        DB_PORT = (os.getenv("DB_Port") or os.getenv("DB_PORT") or "5432").strip("'").strip('"').strip()
        DB_NAME = (os.getenv("DB_NAME") or os.getenv("DB_Name") or "db_superfood").strip("'").strip('"').strip()
        DB_USERNAME = (os.getenv("DB_USERNAME") or os.getenv("DB_Username") or "admin").strip("'").strip('"').strip()
        DB_PASSWORD = (os.getenv("DB_PASSWORD") or os.getenv("DB_PASS") or os.getenv("DB_Password") or "superF777@").strip("'").strip('"').strip()
        SSL_MODE = (os.getenv("SSL_Mode") or os.getenv("SSL_MODE") or os.getenv("SSL_mode") or "disable").strip("'").strip('"').strip()

        safe_username = urllib.parse.quote_plus(DB_USERNAME)
        safe_password = urllib.parse.quote_plus(DB_PASSWORD)

        db_url = f"postgresql://{safe_username}:{safe_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        if SSL_MODE:
            db_url += f"?sslmode={SSL_MODE}"

    return create_engine(db_url)

def raw_string_format(val):
    if pd.isna(val) or val is None or val == "":
        return None
    s = str(val).strip()
    # Handle float formatting like "12345.0" -> "12345" if purely integer string
    if s.endswith(".0") and s[:-2].replace("-", "").isdigit():
        return s[:-2]
    return s if s != "" else None

def _load_excel_dataframe(output_dir: str) -> pd.DataFrame:
    """
    Finds and reads master Excel output or combines Excel files in output_dir.
    """
    if not os.path.exists(output_dir):
        print(f"  {RED}[DB ERROR] Folder output tidak ditemukan: {output_dir}{RESET}")
        return pd.DataFrame()

    # Search for 0Master*.xlsx files first
    master_files = glob.glob(os.path.join(output_dir, "0Master*.xlsx"))
    if master_files:
        # Pick the latest modified master file
        master_files.sort(key=os.path.getmtime, reverse=True)
        master_path = master_files[0]
        print(f"  {CYAN}[DB] Membaca file master: {os.path.basename(master_path)}{RESET}")
        try:
            return pd.read_excel(master_path)
        except Exception as e:
            print(f"  {RED}[DB ERROR] Gagal membaca {master_path}: {e}{RESET}")
            return pd.DataFrame()

    # Fallback: combine all *.xlsx files except temporary (~$)
    all_excels = glob.glob(os.path.join(output_dir, "*.xlsx"))
    valid_excels = [f for f in all_excels if not os.path.basename(f).startswith("~$")]

    if not valid_excels:
        print(f"  {YELLOW}[DB WARNING] Tidak ada file Excel ditemukan di {output_dir}{RESET}")
        return pd.DataFrame()

    dfs = []
    for f in valid_excels:
        try:
            dfs.append(pd.read_excel(f))
        except Exception as e:
            print(f"  {YELLOW}[DB WARNING] Gagal membaca {os.path.basename(f)}: {e}{RESET}")

    if dfs:
        return pd.concat(dfs, ignore_index=True)
    return pd.DataFrame()


def ingest_grab_to_db(output_dir: str) -> bool:
    """
    Ingests Grab data from output_dir into layer1_raw.raw_grab with anti-duplication protection.
    Deduplication Key: 'Transaction ID'
    """
    print(f"\n{GREEN}{BOLD}🐘 [DB INGEST] Single/Weekly Grab → layer1_raw.raw_grab{RESET}")
    df = _load_excel_dataframe(output_dir)
    if df.empty:
        print(f"  {YELLOW}⚠ Tidak ada data Grab yang dapat di-ingest.{RESET}")
        return False

    cols = [
        "Merchant Name", "Merchant ID", "Store Name", "Store ID", 
        "Updated On", "Created On", "Type", "Category", "Subcategory", 
        "Status", "Transaction ID", "Linked Transaction ID", 
        "Partner transaction ID 1", "Partner transaction ID 2", 
        "Long Order ID", "Short Order ID", "Booking ID", "Order Channel", 
        "Order Type", "Payment Method", "Receiving account / Source of fund", 
        "Terminal ID", "Channel", "Offer Type", "Grab Fee (%)", 
        "Points Multiplier", "Points Issued", "Settlement ID", 
        "Transfer Date", "Amount", "Tax on Order Value", 
        "Restaurant Packaging Charge", "Non-Member Fee", 
        "Restaurant Service Charge", "Offer", "Discount (Merchant-Funded)", 
        "Delivery Fee Discount (Merchant-Funded)", 
        "Delivery Charge (Grab Online Store)", 
        "Delivery Charge (Merchant Delivery)", 
        "GrabExpress Delivery Service Fee", "Net Sales", "Net MDR", 
        "Tax on MDR", "Grab Fee", "Marketing success fee", 
        "Delivery Commission", "Channel Commission", "Order commission", 
        "Step-up commission", "GrabKitchen Commission", 
        "GrabKitchen Other Commission", "Withholding Tax", "Total", 
        "Tax on MDR (%)", "Delivery Commission (%)", "Channel Commission (%)", 
        "Order Commission (%)", 
        "Tax on GrabFood/GrabMart commission, adjustments, ads", 
        "Tax on Total GrabKitchen Commission", "Cancellation Reason", 
        "Cancelled by", "Reason for Refund", "Description", 
        "Incident group", "Incident alias", "Customer refund Item", 
        "Appeal link", "Appeal status"
    ]

    # Flexible column mapping
    resolved_mapping = {}
    for df_col in df.columns:
        cleaned_df_col = re.sub(r'[^a-zA-Z0-9]', '', str(df_col)).lower()
        for target_col in cols:
            cleaned_target = re.sub(r'[^a-zA-Z0-9]', '', target_col).lower()
            if cleaned_df_col == cleaned_target:
                resolved_mapping[df_col] = target_col
                break

    df_mapped = df[list(resolved_mapping.keys())].rename(columns=resolved_mapping).copy()
    df_mapped = df_mapped.loc[:, ~df_mapped.columns.duplicated()]

    for col in cols:
        if col not in df_mapped.columns:
            df_mapped[col] = None

    df_stg = df_mapped[cols].copy()
    for col in cols:
        df_stg[col] = df_stg[col].apply(raw_string_format)

    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            # Query existing Transaction IDs from DB
            query_sql = text('SELECT DISTINCT "Transaction ID" FROM layer1_raw.raw_grab WHERE "Transaction ID" IS NOT NULL AND "Transaction ID" != \'\'')
            existing_result = conn.execute(query_sql).fetchall()
            existing_ids = {str(r[0]).strip() for r in existing_result if r[0] is not None}

        total_rows = len(df_stg)
        # Clean Transaction ID in DataFrame for exact set comparison
        df_stg["_clean_tx_id"] = df_stg["Transaction ID"].astype(str).str.strip()

        # Deduplicate
        new_df = df_stg[~df_stg["_clean_tx_id"].isin(existing_ids) & df_stg["_clean_tx_id"].notna() & (df_stg["_clean_tx_id"] != "None") & (df_stg["_clean_tx_id"] != "")].copy()
        new_df = new_df.drop(columns=["_clean_tx_id"])

        new_count = len(new_df)
        skipped_count = total_rows - new_count

        if new_count == 0:
            print(f"  {CYAN}ℹ [DUPLICATE CHECK] Semua {total_rows} baris sudah ada di database (0 baris baru di-insert).{RESET}")
            return True

        with engine.begin() as conn:
            new_df.to_sql('raw_grab', conn, schema='layer1_raw', if_exists='append', index=False)

        print(f"  {GREEN}✅ [SUCCESS] Ingest Grab ke layer1_raw.raw_grab selesai:{RESET}")
        print(f"     • Total baris dalam file : {total_rows}")
        print(f"     • Baris baru ter-insert  : {new_count}")
        print(f"     • Baris di-skip (duplikat): {skipped_count}")
        return True

    except Exception as e:
        print(f"  {RED}❌ [DB ERROR] Gagal ingest Grab ke DB: {e}{RESET}")
        return False


def ingest_shopee_to_db(output_dir: str) -> bool:
    """
    Ingests Shopee data from output_dir into layer1_raw.raw_shopee with anti-duplication protection.
    Deduplication Key: 'Transaction ID (Order ID)'
    """
    print(f"\n{MAGENTA}{BOLD}🐘 [DB INGEST] Single/Weekly Shopee → layer1_raw.raw_shopee{RESET}")
    df = _load_excel_dataframe(output_dir)
    if df.empty:
        print(f"  {YELLOW}⚠ Tidak ada data Shopee yang dapat di-ingest.{RESET}")
        return False

    header_mapping = {
        "Store ID": "Store ID",
        "Store name": "Store name",
        "Nama Toko": "Store name",
        "Transaction type": "Transaction type",
        "Tipe Transaksi": "Transaction type",
        "Transaction ID (Order ID)": "Transaction ID (Order ID)",
        "No. Pesanan": "Transaction ID (Order ID)",
        "Order ID": "Transaction ID (Order ID)",
        "Complete Time": "Complete Time",
        "Waktu Penyelesaian": "Complete Time",
        "Status": "Status",
        "Food original price": "Food original price",
        "Harga Makanan": "Food original price",
        "Item discounts": "Item discounts",
        "Diskon": "Item discounts",
        "Flash sale discount": "Flash sale discount",
        "Diskon Flash Sale": "Flash sale discount",
        "Surcharge fee": "Surcharge fee",
        "Biaya Tambahan": "Surcharge fee",
        "Merchant Voucher Deals Subsidy": "Merchant Voucher Deals Subsidy",
        "Subsidi Merchant untuk Voucher Deals": "Merchant Voucher Deals Subsidy",
        "Platform Flash Sale Subsidy": "Platform Flash Sale Subsidy",
        "Subsidi Platform untuk Flash Sale": "Platform Flash Sale Subsidy",
        "Food Voucher Subsidy": "Food Voucher Subsidy",
        "Subsidi Voucher Makanan": "Food Voucher Subsidy",
        "Food Direct Discount": "Food Direct Discount",
        "Diskon Langsung": "Food Direct Discount",
        "Transaction amount": "Transaction amount",
        "Nilai Transaksi": "Transaction amount",
        "Checkout Murah Price": "Checkout Murah Price",
        "Harga Checkout Murah": "Checkout Murah Price",
        "Notes": "Notes"
    }

    resolved_mapping = {}
    for df_col in df.columns:
        if df_col in header_mapping:
            resolved_mapping[df_col] = header_mapping[df_col]

    target_cols = [
        "Store ID", "Store name", "Transaction type", "Transaction ID (Order ID)", 
        "Complete Time", "Status", "Food original price", "Item discounts", 
        "Flash sale discount", "Surcharge fee", "Merchant Voucher Deals Subsidy", 
        "Platform Flash Sale Subsidy", "Food Voucher Subsidy", 
        "Food Direct Discount", "Transaction amount", "Checkout Murah Price", "Notes"
    ]

    df_mapped = df[list(resolved_mapping.keys())].rename(columns=resolved_mapping).copy()
    df_mapped = df_mapped.loc[:, ~df_mapped.columns.duplicated()]

    for col in target_cols:
        if col not in df_mapped.columns:
            df_mapped[col] = None

    df_stg = df_mapped[target_cols].copy()
    for col in target_cols:
        df_stg[col] = df_stg[col].apply(raw_string_format)

    engine = get_db_engine()
    try:
        with engine.connect() as conn:
            query_sql = text('SELECT DISTINCT "Transaction ID (Order ID)" FROM layer1_raw.raw_shopee WHERE "Transaction ID (Order ID)" IS NOT NULL AND "Transaction ID (Order ID)" != \'\'')
            existing_result = conn.execute(query_sql).fetchall()
            existing_ids = {str(r[0]).strip() for r in existing_result if r[0] is not None}

        total_rows = len(df_stg)
        df_stg["_clean_tx_id"] = df_stg["Transaction ID (Order ID)"].astype(str).str.strip()

        new_df = df_stg[~df_stg["_clean_tx_id"].isin(existing_ids) & df_stg["_clean_tx_id"].notna() & (df_stg["_clean_tx_id"] != "None") & (df_stg["_clean_tx_id"] != "")].copy()
        new_df = new_df.drop(columns=["_clean_tx_id"])

        new_count = len(new_df)
        skipped_count = total_rows - new_count

        if new_count == 0:
            print(f"  {CYAN}ℹ [DUPLICATE CHECK] Semua {total_rows} baris sudah ada di database (0 baris baru di-insert).{RESET}")
            return True

        with engine.begin() as conn:
            new_df.to_sql('raw_shopee', conn, schema='layer1_raw', if_exists='append', index=False)

        print(f"  {GREEN}✅ [SUCCESS] Ingest Shopee ke layer1_raw.raw_shopee selesai:{RESET}")
        print(f"     • Total baris dalam file : {total_rows}")
        print(f"     • Baris baru ter-insert  : {new_count}")
        print(f"     • Baris di-skip (duplikat): {skipped_count}")
        return True

    except Exception as e:
        print(f"  {RED}❌ [DB ERROR] Gagal ingest Shopee ke DB: {e}{RESET}")
        return False
