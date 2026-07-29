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

CSV_URL_CREDENTIAL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3tLKBNXDqRgBw0mNhKZFxgvKx-JoiTDzm_s5Ix1cm7O6HCv4IvExOLR2HSRVaXSsx82V348mcr9X4/pub?gid=0&single=true&output=csv"
CSV_URL_VERCEL = "https://docs.google.com/spreadsheets/d/1KGuFkD1vAfSVay-GssS5vXKJbOKD4ngi9LVxjmfGkbk/export?format=csv&gid=71044642"
LOCAL_CREDENTIALS_PATH = os.path.join(elevate_dir, "A. Credential (Outlet & Access)  - Credential.csv")

def clean_val(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s == "" or s == "-":
        return None
    return s

def seed_layer3_dim():
    print("📖 Reading Credential Master CSV...")
    df_cred_raw = pd.read_csv(LOCAL_CREDENTIALS_PATH if os.path.exists(LOCAL_CREDENTIALS_PATH) else CSV_URL_CREDENTIAL)

    print("📖 Reading Vercel Sheet Registration CSV...")
    df_vercel_raw = None
    try:
        res_v = requests.get(CSV_URL_VERCEL, timeout=15)
        if res_v.status_code == 200:
            df_vercel_raw = pd.read_csv(io.StringIO(res_v.text))
            print(f"  ✅ Downloaded latest Vercel Sheet CSV ({len(df_vercel_raw)} rows)")
    except Exception as e:
        print(f"  ⚠️ Could not fetch Vercel Sheet URL: {e}")

    db_url = get_db_url()
    engine = create_engine(db_url)

    # 1. Update layer3_dim tables DDL
    with engine.begin() as conn:
        with open(os.path.join(db_dir, "init_layer3_dim.sql")) as f:
            conn.execute(text(f.read()))

    # Process Credential Sheet rows
    cred_records = []
    map_records = []

    for row_idx in range(len(df_cred_raw)):
        row = df_cred_raw.iloc[row_idx]
        store_id = clean_val(row.iloc[9])  # Store ID (Col J)
        platform = clean_val(row.iloc[3])  # Aplikasi (Col D)

        if not store_id or not platform:
            continue

        # Credential fields
        cred_records.append({
            "store_id": store_id,
            "platform": platform,
            "merchant_id": clean_val(row.iloc[21]),
            "merchant_name": clean_val(row.iloc[22]),
            "nama_akses_mitra": clean_val(row.iloc[14]),
            "email_mitra": clean_val(row.iloc[15]),
            "username_mitra_orig": clean_val(row.iloc[16]),  # Col Q (Nama Pengguna)
            "hp_mitra": clean_val(row.iloc[17]),            # Col R (Nomor HP)
            "password_mitra_orig": clean_val(row.iloc[18]),  # Col S (Kata Sandi)
            "peran_mitra": clean_val(row.iloc[19]),         # Col T (Peran)
            "nama_akses_superfood": clean_val(row.iloc[23]),
            "email_login_go_1": clean_val(row.iloc[24]),
            "email_login_go_2": clean_val(row.iloc[25]),
            "username_superfood": clean_val(row.iloc[26]),  # Col AA (Nama Pengguna SuperFood)
            "hp_superfood": clean_val(row.iloc[27]),        # Col AB (Nomor HP allvbadmin)
            "password_superfood": clean_val(row.iloc[28]),  # Col AC (Kata Sandi SuperFood)
            "peran_superfood": clean_val(row.iloc[29]),     # Col AD (Peran SuperFood)
            "shopee_username_pemilik": None,
            "shopee_password_pemilik": None,
            "shopee_username_staff": None,
            "shopee_password_staff": None
        })

        # Mapping fields
        nama_resto_final = clean_val(row.iloc[5])  # Nama Resto Final
        status_mapping = "MAPPED" if nama_resto_final else "PENDING_REVIEW"

        map_records.append({
            "store_id": store_id,
            "platform": platform,
            "owner_name": clean_val(row.iloc[0]),
            "outlet_name": clean_val(row.iloc[1]),
            "brand": clean_val(row.iloc[2]),
            "nama_resto_final": nama_resto_final,
            "rekomendasi_nama_resto": clean_val(row.iloc[6]),
            "nama_tarikan": clean_val(row.iloc[7]),
            "nama_resto_sebelumnya": clean_val(row.iloc[8]),
            "shopee_short_name_final": clean_val(row.iloc[10]),
            "shopee_short_name_sebelumnya": clean_val(row.iloc[11]),
            "portal": clean_val(row.iloc[12]),
            "s_short_name": clean_val(row.iloc[30]) if len(row) > 30 else None,
            "gr_name": clean_val(row.iloc[31]) if len(row) > 31 else None,
            "group_code": clean_val(row.iloc[20]),
            "bd_pic": clean_val(row.iloc[32]) if len(row) > 32 else None, # BD (Col AG)
            "live_date": clean_val(row.iloc[33]) if len(row) > 33 else None,
            "status": clean_val(row.iloc[34]) if len(row) > 34 else None,
            "churn_date": clean_val(row.iloc[35]) if len(row) > 35 else None,
            "billing_cycle": clean_val(row.iloc[36]) if len(row) > 36 else None,
            "pic": clean_val(row.iloc[37]) if len(row) > 37 else None,
            "fee": clean_val(row.iloc[38]) if len(row) > 38 else None,
            "wag": clean_val(row.iloc[39]) if len(row) > 39 else None,
            "grade": clean_val(row.iloc[40]) if len(row) > 40 else None,
            "priority": clean_val(row.iloc[41]) if len(row) > 41 else None,
            "notes": clean_val(row.iloc[42]) if len(row) > 42 else (clean_val(row.iloc[13]) if len(row) > 13 else None),
            "last_update": clean_val(row.iloc[43]) if len(row) > 43 else None,
            "mapping_status": status_mapping,
            "mapped_by": "GSHEET_SEED"
        })

    # Integrate Vercel Sheet rows if available
    if df_vercel_raw is not None:
        for v_idx in range(len(df_vercel_raw)):
            v_row = df_vercel_raw.iloc[v_idx]
            v_outlet = clean_val(v_row.get("Nama Outlet"))
            v_app = clean_val(v_row.get("Aplikasi"))
            v_bd = clean_val(v_row.get("BD"))
            v_merchant_name = clean_val(v_row.get("Merchant Name"))

            # Shopee Pemilik & Staff credentials (Cols J-N)
            shopee_hp = clean_val(v_row.get("S Nomor HP Akses Pemilik"))
            shopee_user_pemilik = clean_val(v_row.get("S Username Akses Pemilik"))
            shopee_pass_pemilik = clean_val(v_row.get("S Kata Sandi Akses Pemilik"))
            shopee_user_staff = clean_val(v_row.get("S Username Akses Staff"))
            shopee_pass_staff = clean_val(v_row.get("S Kata Sandi Akses Staff"))

            # Update matching records in cred_records
            for cred in cred_records:
                if cred.get("merchant_name") == v_merchant_name or cred.get("nama_akses_mitra") == v_outlet:
                    if shopee_user_pemilik: cred["shopee_username_pemilik"] = shopee_user_pemilik
                    if shopee_pass_pemilik: cred["shopee_password_pemilik"] = shopee_pass_pemilik
                    if shopee_user_staff: cred["shopee_username_staff"] = shopee_user_staff
                    if shopee_pass_staff: cred["shopee_password_staff"] = shopee_pass_staff

            for m in map_records:
                if m.get("outlet_name") == v_outlet and v_bd:
                    m["bd_pic"] = v_bd

    df_cred = pd.DataFrame(cred_records).drop_duplicates(subset=["store_id"], keep="first")
    df_map = pd.DataFrame(map_records).drop_duplicates(subset=["store_id"], keep="first")

    print(f"Unique credentials to upsert: {len(df_cred)}")
    print(f"Unique mappings to upsert: {len(df_map)}")

    with engine.begin() as conn:
        # Recreate table layer3_dim.dim_merchant_credentials
        conn.execute(text("DROP TABLE IF EXISTS layer3_dim.dim_merchant_credentials CASCADE;"))
        conn.execute(text("""
            CREATE TABLE layer3_dim.dim_merchant_credentials (
                store_id TEXT PRIMARY KEY,
                platform TEXT,
                merchant_id TEXT,
                merchant_name TEXT,
                nama_akses_mitra TEXT,
                email_mitra TEXT,
                email_login_go_1 TEXT,
                email_login_go_2 TEXT,
                username_mitra_orig TEXT,
                hp_mitra TEXT,
                password_mitra_orig TEXT,
                peran_mitra TEXT,
                shopee_username_pemilik TEXT,
                shopee_password_pemilik TEXT,
                shopee_username_staff TEXT,
                shopee_password_staff TEXT,
                nama_akses_superfood TEXT,
                username_superfood TEXT,
                hp_superfood TEXT,
                password_superfood TEXT,
                peran_superfood TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # 1. Upsert dim_merchant_credentials
        conn.execute(text("CREATE TEMP TABLE tmp_cred (LIKE layer3_dim.dim_merchant_credentials INCLUDING ALL) ON COMMIT DROP;"))
        df_cred.to_sql("tmp_cred", conn, if_exists="append", index=False)
        
        conn.execute(text("""
            INSERT INTO layer3_dim.dim_merchant_credentials (
                store_id, platform, merchant_id, merchant_name, nama_akses_mitra,
                email_mitra, email_login_go_1, email_login_go_2, username_mitra_orig,
                hp_mitra, password_mitra_orig, peran_mitra,
                shopee_username_pemilik, shopee_password_pemilik,
                shopee_username_staff, shopee_password_staff,
                nama_akses_superfood, username_superfood, hp_superfood, password_superfood, peran_superfood, updated_at
            )
            SELECT store_id, platform, merchant_id, merchant_name, nama_akses_mitra,
                   email_mitra, email_login_go_1, email_login_go_2, username_mitra_orig,
                   hp_mitra, password_mitra_orig, peran_mitra,
                   shopee_username_pemilik, shopee_password_pemilik,
                   shopee_username_staff, shopee_password_staff,
                   nama_akses_superfood, username_superfood, hp_superfood, password_superfood, peran_superfood, CURRENT_TIMESTAMP
            FROM tmp_cred
            ON CONFLICT (store_id) DO UPDATE SET
                platform = EXCLUDED.platform,
                merchant_id = EXCLUDED.merchant_id,
                merchant_name = EXCLUDED.merchant_name,
                nama_akses_mitra = EXCLUDED.nama_akses_mitra,
                email_mitra = EXCLUDED.email_mitra,
                email_login_go_1 = EXCLUDED.email_login_go_1,
                email_login_go_2 = EXCLUDED.email_login_go_2,
                username_mitra_orig = EXCLUDED.username_mitra_orig,
                hp_mitra = EXCLUDED.hp_mitra,
                password_mitra_orig = EXCLUDED.password_mitra_orig,
                peran_mitra = EXCLUDED.peran_mitra,
                shopee_username_pemilik = EXCLUDED.shopee_username_pemilik,
                shopee_password_pemilik = EXCLUDED.shopee_password_pemilik,
                shopee_username_staff = EXCLUDED.shopee_username_staff,
                shopee_password_staff = EXCLUDED.shopee_password_staff,
                nama_akses_superfood = EXCLUDED.nama_akses_superfood,
                username_superfood = EXCLUDED.username_superfood,
                hp_superfood = EXCLUDED.hp_superfood,
                password_superfood = EXCLUDED.password_superfood,
                peran_superfood = EXCLUDED.peran_superfood,
                updated_at = CURRENT_TIMESTAMP;
        """))
        print("  ✅ Upserted layer3_dim.dim_merchant_credentials (with full Shopee Pemilik & Staff credentials)!")

        # 2. Upsert dim_merchant_mapping
        conn.execute(text("CREATE TEMP TABLE tmp_map (LIKE layer3_dim.dim_merchant_mapping INCLUDING ALL) ON COMMIT DROP;"))
        df_map.to_sql("tmp_map", conn, if_exists="append", index=False)

        conn.execute(text("""
            INSERT INTO layer3_dim.dim_merchant_mapping (
                store_id, platform, owner_name, outlet_name, brand,
                nama_resto_final, rekomendasi_nama_resto, nama_tarikan, nama_resto_sebelumnya,
                shopee_short_name_final, shopee_short_name_sebelumnya, portal,
                s_short_name, gr_name, group_code, bd_pic, live_date, status,
                churn_date, billing_cycle, pic, fee, wag, grade, priority, notes,
                last_update, mapping_status, mapped_by, updated_at
            )
            SELECT store_id, platform, owner_name, outlet_name, brand,
                   nama_resto_final, rekomendasi_nama_resto, nama_tarikan, nama_resto_sebelumnya,
                   shopee_short_name_final, shopee_short_name_sebelumnya, portal,
                   s_short_name, gr_name, group_code, bd_pic, live_date, status,
                   churn_date, billing_cycle, pic, fee, wag, grade, priority, notes,
                   last_update, mapping_status, mapped_by, CURRENT_TIMESTAMP
            FROM tmp_map
            ON CONFLICT (store_id) DO UPDATE SET
                platform = EXCLUDED.platform,
                owner_name = EXCLUDED.owner_name,
                outlet_name = EXCLUDED.outlet_name,
                brand = EXCLUDED.brand,
                nama_resto_final = EXCLUDED.nama_resto_final,
                rekomendasi_nama_resto = EXCLUDED.rekomendasi_nama_resto,
                nama_tarikan = EXCLUDED.nama_tarikan,
                nama_resto_sebelumnya = EXCLUDED.nama_resto_sebelumnya,
                shopee_short_name_final = EXCLUDED.shopee_short_name_final,
                shopee_short_name_sebelumnya = EXCLUDED.shopee_short_name_sebelumnya,
                portal = EXCLUDED.portal,
                s_short_name = EXCLUDED.s_short_name,
                gr_name = EXCLUDED.gr_name,
                group_code = EXCLUDED.group_code,
                bd_pic = EXCLUDED.bd_pic,
                live_date = EXCLUDED.live_date,
                status = EXCLUDED.status,
                churn_date = EXCLUDED.churn_date,
                billing_cycle = EXCLUDED.billing_cycle,
                pic = EXCLUDED.pic,
                fee = EXCLUDED.fee,
                wag = EXCLUDED.wag,
                grade = EXCLUDED.grade,
                priority = EXCLUDED.priority,
                notes = EXCLUDED.notes,
                last_update = EXCLUDED.last_update,
                mapping_status = EXCLUDED.mapping_status,
                mapped_by = EXCLUDED.mapped_by,
                updated_at = CURRENT_TIMESTAMP;
        """))
        print("  ✅ Upserted layer3_dim.dim_merchant_mapping (with BD PIC routing)")

    print("🎉 Seeding layer3_dim successfully finished!")

if __name__ == "__main__":
    seed_layer3_dim()
