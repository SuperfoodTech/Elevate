import pandas as pd
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path configuration
db_dir = os.path.dirname(os.path.abspath(__file__))
elevate_dir = os.path.dirname(db_dir)
load_dotenv(os.path.join(elevate_dir, ".env"))

# Add parent directory to sys.path to allow importing config
if elevate_dir not in sys.path:
    sys.path.insert(0, elevate_dir)

from config import get_db_url
DB_URL = get_db_url()

# Extra safety load envs
load_dotenv(os.path.join(db_dir, ".env"))
load_dotenv(os.path.join(elevate_dir, ".env"), override=True)

# Parse host name from URL for printing
DB_HOST = "ConfigDB"
try:
    from urllib.parse import urlparse
    parsed = urlparse(DB_URL)
    DB_HOST = parsed.hostname or "ConfigDB"
except:
    pass

LOCAL_CREDENTIALS_PATH = os.path.join(elevate_dir, "A. Credential (Outlet & Access)  - Credential.csv")

def sync_merchants():
    print(f"🔗 Connecting to database at {DB_HOST}...")
    engine = create_engine(DB_URL)
    
    # --- 1. SYNC DIM_MERCHANTS FROM LOCAL CSV ---
    if not os.path.exists(LOCAL_CREDENTIALS_PATH):
        print(f"❌ Local credentials CSV not found at {LOCAL_CREDENTIALS_PATH}")
        return

    print(f"📖 Reading local credentials from {LOCAL_CREDENTIALS_PATH}...")
    df = pd.read_csv(LOCAL_CREDENTIALS_PATH)
    df.columns = [c.strip() for c in df.columns]

    # Clean data & filter Live status
    df['is_active'] = df['Status'].str.strip().str.lower() == 'live'
    df = df.dropna(subset=['Store ID'])
    df = df[df['Store ID'].astype(str).str.strip() != '-']

    # Username logic (Priority to SuperFood logins)
    def get_active_user(row):
        # Handle duplicate name suffixes in pandas
        u1 = row.get('Nama Pengguna.1')
        u2 = row.get('Nama Pengguna')
        user = u1 if pd.notna(u1) and str(u1).strip() != "-" else u2
        return str(user).strip() if pd.notna(user) else None

    df['active_user'] = df.apply(get_active_user, axis=1)

    # Fallback branch name
    if 'Cabang' not in df.columns:
        df['Cabang'] = df.get('Nama Resto Final', 'UNKNOWN')

    mapping = {
        'Store ID': 'store_id',
        'Aplikasi': 'platform',
        'Nama Outlet': 'outlet_name',
        'Cabang': 'branch_name',
        'Group Code': 'group_code',
        'Owner': 'owner_name',
        'Merchant ID': 'merchant_id',
        'Merchant Name': 'merchant_name',
        'active_user': 'username',
        'Status': 'status',
        'is_active': 'is_active'
    }

    df_merchants = df.rename(columns=mapping)[list(mapping.values())]
    df_merchants = df_merchants.drop_duplicates(subset=['store_id'], keep='first')

    print(f"🔄 Syncing {len(df_merchants)} merchant records...")
    with engine.begin() as conn:
        conn.execute(text("CREATE TEMP TABLE tmp_merchants (LIKE dim_merchants INCLUDING ALL) ON COMMIT DROP"))
        df_merchants.to_sql('tmp_merchants', conn, if_exists='append', index=False)
        
        upsert_query = """
            INSERT INTO dim_merchants (store_id, platform, outlet_name, branch_name, group_code, owner_name, 
                                     merchant_id, merchant_name, username, status, is_active)
            SELECT store_id, platform, outlet_name, branch_name, group_code, owner_name, 
                   merchant_id, merchant_name, username, status, is_active FROM tmp_merchants
            ON CONFLICT (store_id) DO UPDATE SET
                platform = EXCLUDED.platform,
                outlet_name = EXCLUDED.outlet_name,
                branch_name = EXCLUDED.branch_name,
                group_code = EXCLUDED.group_code,
                owner_name = EXCLUDED.owner_name,
                merchant_id = EXCLUDED.merchant_id,
                merchant_name = EXCLUDED.merchant_name,
                username = EXCLUDED.username,
                status = EXCLUDED.status,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP;
        """
        conn.execute(text(upsert_query))
        # Keep only live merchants
        conn.execute(text("DELETE FROM dim_merchants WHERE is_active = FALSE"))
    print("✅ Merchant dim sync completed.")

if __name__ == "__main__":
    try:
        sync_merchants()
    except Exception as e:
        print(f"❌ Error during sync: {e}")
