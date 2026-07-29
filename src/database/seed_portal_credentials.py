import os
import sys
import pandas as pd
import requests
import io
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

db_dir = os.path.dirname(os.path.abspath(__file__))
elevate_dir = os.path.dirname(db_dir)

if elevate_dir not in sys.path:
    sys.path.insert(0, elevate_dir)

from config import get_db_url

CSV_URL_PORTAL_REF = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYSUnKOqk29LCktTxdb0wPLbWMbRaWRP3eC_UA4AwYod1FW6zDMhtLMC5ghIvot2B8upCDfBsn-TCP/pub?gid=565510790&single=true&output=csv"

def clean_val(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s == "" or s == "-":
        return None
    return s

def seed_portal_credentials():
    print("📖 Fetching Portal & Virtual Brand Reference CSV...")
    res = requests.get(CSV_URL_PORTAL_REF, timeout=15)
    if res.status_code != 200:
        raise ConnectionError(f"❌ Failed to fetch Portal CSV: HTTP {res.status_code}")

    df = pd.read_csv(io.StringIO(res.text))
    print(f"  ✅ Downloaded {len(df)} portal credential records.")

    engine = create_engine(get_db_url())

    records = []
    for idx, row in df.iterrows():
        portal_code = clean_val(row.get("Portal"))
        username = clean_val(row.get("Username"))
        password = clean_val(row.get("Password"))

        if not portal_code or not username:
            continue

        records.append({
            "portal_code": portal_code,
            "role": clean_val(row.get("Role")),
            "phone_number": clean_val(row.get("Phone")),
            "username": username,
            "password": password or "",
            "notes": clean_val(row.get("Notes")),
            "otp_method": clean_val(row.get("OTP")),
            "bd_pic": clean_val(row.get("BD"))
        })

    print(f"Upserting {len(records)} portal credentials to layer3_dim.dim_portal_credentials...")

    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS layer3_dim.dim_portal_credentials (portal_id SERIAL PRIMARY KEY, portal_code TEXT, role TEXT, phone_number TEXT, username TEXT, password TEXT, notes TEXT, otp_method TEXT, bd_pic TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"))
        conn.execute(text("TRUNCATE TABLE layer3_dim.dim_portal_credentials RESTART IDENTITY;"))

        insert_sql = text("""
            INSERT INTO layer3_dim.dim_portal_credentials (
                portal_code, role, phone_number, username, password, notes, otp_method, bd_pic
            )
            VALUES (
                :portal_code, :role, :phone_number, :username, :password, :notes, :otp_method, :bd_pic
            );
        """)

        for r in records:
            conn.execute(insert_sql, r)

    print("🎉 Successfully seeded layer3_dim.dim_portal_credentials!")

if __name__ == "__main__":
    seed_portal_credentials()
