import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text

db_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(db_dir)
project_root = os.path.dirname(src_dir)

for p in [db_dir, src_dir, project_root]:
    if p not in sys.path:
        sys.path.insert(0, p)

from config import get_db_url
from backend.core.dbr_resolver import load_master_dbr_dataframe


def clean_val(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s == "" or s == "-" or s.lower() in ("nan", "none", "null"):
        return None
    return s


def seed_layer3_dim(force_refresh: bool = False):
    print("Reading Master DBR...")
    df_raw = load_master_dbr_dataframe(force_refresh=force_refresh)
    if df_raw.empty:
        raise ValueError("Master DBR data is empty. Unable to seed layer3_dim.")

    print(f"Loaded Master DBR with {len(df_raw)} rows.")

    db_url = get_db_url()
    engine = create_engine(db_url)

    # 1. Update layer3_dim tables DDL
    with engine.begin() as conn:
        with open(os.path.join(db_dir, "init_layer3_dim.sql")) as f:
            conn.execute(text(f.read()))

    # Process Master DBR rows
    cred_records = []
    map_records = []

    for _, row in df_raw.iterrows():
        store_id = clean_val(row.get("Store ID"))
        platform = clean_val(row.get("Aplikator"))

        if not store_id or not platform:
            continue

        owner_name = clean_val(row.get("Nama Pemilik"))
        outlet_name = clean_val(row.get("Outlet"))
        brand = clean_val(row.get("Nama Brand"))
        nama_listing = clean_val(row.get("Nama Listing"))
        group_id = clean_val(row.get("Group ID"))
        portal = clean_val(row.get("Nama Portal"))
        user_mitra = clean_val(row.get("Nama Pengguna"))
        pass_mitra = clean_val(row.get("Kata Sandi"))
        hp_mitra = clean_val(row.get("Nomor HP"))
        nama_akses = clean_val(row.get("Nama Akses"))
        email1 = clean_val(row.get("Email FoodMaster1"))
        email2 = clean_val(row.get("Email FoodMaster2"))

        shopee_hp_pemilik = clean_val(row.get("S Nomor HP Akses Pemilik"))
        shopee_user_pemilik = clean_val(row.get("S Username Akses Pemilik"))
        shopee_pass_pemilik = clean_val(row.get("S Kata Sandi Akses Pemilik"))
        shopee_user_staff = clean_val(row.get("S Allvbadmin Username Akses Staff"))
        shopee_pass_staff = clean_val(row.get("S Allvbadmin Kata Sandi Akses Staff"))

        bd = clean_val(row.get("BD"))
        status_internal = clean_val(row.get("Status Internal"))
        tgl_live = clean_val(row.get("Tanggal Live"))
        tgl_churn = clean_val(row.get("Tanggal Churn"))
        tarif = clean_val(row.get("Tarif"))
        status_listing = clean_val(row.get("Status Listing"))

        # Credential record
        cred_records.append({
            "store_id": store_id,
            "platform": platform,
            "owner_name": owner_name,
            "merchant_id": group_id or store_id,
            "merchant_name": nama_listing or outlet_name,
            "nama_akses_mitra": nama_akses,
            "email_mitra": email1 or email2,
            "email_login_go_1": email1,
            "email_login_go_2": email2,
            "username_mitra_orig": user_mitra,
            "hp_mitra": hp_mitra,
            "password_mitra_orig": pass_mitra,
            "peran_mitra": nama_akses,
            "shopee_username_pemilik": shopee_user_pemilik,
            "shopee_password_pemilik": shopee_pass_pemilik,
            "shopee_username_staff": shopee_user_staff,
            "shopee_password_staff": shopee_pass_staff,
            "nama_akses_superfood": nama_akses,
            "username_superfood": shopee_user_staff,
            "hp_superfood": shopee_hp_pemilik,
            "password_superfood": shopee_pass_staff,
            "peran_superfood": "Staff" if shopee_user_staff else None
        })

        # Mapping record
        status_mapping = "MAPPED" if nama_listing else "PENDING_REVIEW"
        map_records.append({
            "store_id": store_id,
            "platform": platform,
            "owner_name": owner_name,
            "outlet_name": outlet_name,
            "brand": brand,
            "nama_resto_final": nama_listing,
            "rekomendasi_nama_resto": nama_listing,
            "nama_tarikan": nama_listing,
            "nama_resto_sebelumnya": None,
            "shopee_short_name_final": nama_listing,
            "shopee_short_name_sebelumnya": None,
            "portal": portal,
            "s_short_name": None,
            "gr_name": None,
            "group_code": group_id,
            "bd_pic": bd,
            "live_date": tgl_live,
            "status": status_internal,
            "churn_date": tgl_churn,
            "billing_cycle": None,
            "pic": bd,
            "fee": tarif,
            "wag": None,
            "grade": None,
            "priority": None,
            "notes": status_listing,
            "last_update": None,
            "mapping_status": status_mapping,
            "mapped_by": "MASTER_DBR"
        })

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
                owner_name TEXT,
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
                store_id, platform, owner_name, merchant_id, merchant_name, nama_akses_mitra,
                email_mitra, email_login_go_1, email_login_go_2, username_mitra_orig,
                hp_mitra, password_mitra_orig, peran_mitra,
                shopee_username_pemilik, shopee_password_pemilik,
                shopee_username_staff, shopee_password_staff,
                nama_akses_superfood, username_superfood, hp_superfood, password_superfood, peran_superfood, updated_at
            )
            SELECT store_id, platform, owner_name, merchant_id, merchant_name, nama_akses_mitra,
                   email_mitra, email_login_go_1, email_login_go_2, username_mitra_orig,
                   hp_mitra, password_mitra_orig, peran_mitra,
                   shopee_username_pemilik, shopee_password_pemilik,
                   shopee_username_staff, shopee_password_staff,
                   nama_akses_superfood, username_superfood, hp_superfood, password_superfood, peran_superfood, CURRENT_TIMESTAMP
            FROM tmp_cred
            ON CONFLICT (store_id) DO UPDATE SET
                platform = EXCLUDED.platform,
                owner_name = EXCLUDED.owner_name,
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
        print("Upserted layer3_dim.dim_merchant_credentials successfully.")

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
        print("Upserted layer3_dim.dim_merchant_mapping successfully.")

    print("Seeding layer3_dim successfully finished.")


if __name__ == "__main__":
    seed_layer3_dim()
