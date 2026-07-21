#!/usr/bin/env python3
import os
import re
import sys
import pandas as pd
from sqlalchemy import text

# Add database/ directory to path dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(current_dir, "..", "database")):
    sys.path.append(os.path.abspath(os.path.join(current_dir, "..", "database")))
elif os.path.exists(os.path.join(current_dir, "..", "..", "database")):
    sys.path.append(os.path.abspath(os.path.join(current_dir, "..", "..", "database")))

from db_manager import DatabaseManager

def main():
    print("=" * 60)
    print("   GRAB TRANSACTION RE-INGESTION & GFID MAPPER UTILITY")
    print("=" * 60)

    db = DatabaseManager()

    # Load credentials dynamically
    possible_paths = [
        os.path.abspath(os.path.join(current_dir, "..", "..", "A. Credential (Outlet & Access)  - Credential.csv")),
        os.path.abspath(os.path.join(current_dir, "..", "A. Credential (Outlet & Access)  - Credential.csv")),
        os.path.abspath(os.path.join(current_dir, "A. Credential (Outlet & Access)  - Credential.csv"))
    ]
    cred_file = None
    for p in possible_paths:
        if os.path.exists(p):
            cred_file = p
            break
            
    if not cred_file:
        print("Error: Credential file 'A. Credential (Outlet & Access)  - Credential.csv' not found in expected locations.")
        sys.exit(1)

    print(f"Loading credentials from {cred_file}...")
    cred_df = pd.read_csv(cred_file)
    cred_df.columns = [c.strip() for c in cred_df.columns]
    grab_cred = cred_df[cred_df['Aplikasi'].str.contains('Grab', na=False, case=False)]

    def get_active_user(row):
        u1 = row.get('Nama Pengguna.1')
        u2 = row.get('Nama Pengguna')
        user = u1 if pd.notna(u1) and str(u1).strip() != '-' else u2
        return str(user).strip().lower() if pd.notna(user) else None

    grab_cred = grab_cred.copy()
    grab_cred['user'] = grab_cred.apply(get_active_user, axis=1)

    # Load dim_merchants
    print("Loading dim_merchants from PostgreSQL database...")
    try:
        rows = db.engine.connect().execute(text("SELECT store_id, branch_name, outlet_name, username FROM dim_merchants WHERE platform = 'GrabFood'")).fetchall()
    except Exception as e:
        print(f"Warning: Failed to fetch dim_merchants: {e}. Will rely on credentials spreadsheet only.")
        rows = []

    def normalize_text(text):
        if not isinstance(text, str): return ''
        return re.sub(r'[^a-z0-9]', '', text.lower())

    # Build mapping of username -> dict of {store_name: store_id}
    user_store_map = {}

    # 1. Populate from credentials
    for idx, row in grab_cred.iterrows():
        u = row['user']
        if not u: continue
        store_id = str(row['Store ID']).strip()
        names = [row.get('Nama Resto Final'), row.get('Nama Tarikan'), row.get('Nama Outlet')]
        for name in names:
            if pd.notna(name) and str(name).strip() != '-':
                norm = normalize_text(name)
                user_store_map.setdefault(u, {})[norm] = store_id

    # 2. Populate from dim_merchants
    for r in rows:
        u = r[3].strip().lower() if r[3] else None
        if not u: continue
        store_id = r[0]
        for name in [r[1], r[2]]:
            if name:
                norm = normalize_text(name)
                user_store_map.setdefault(u, {})[norm] = store_id

    # Manual overrides with normalized names
    manual_overrides = {
        ('khasjogjafoodmaster', 'warungsederhana'): '6-C2KTLGKJEUDXHE',
        ('buburbangudinfoodmaster2', 'bangudinbuburayamjakarta'): 'AWkoLOMLkk5cOZVWvpE7',
        ('babaamirkedungkandang', 'kebabbabaamirkedungkandang'): '6-CY3ZGNMWKGDZWA',
        ('rotibakar41superfood', 'rotibakar41saxofonejatimulyo'): '6-C6CGG7CWJ7KDLX',
        ('rotibakar41superfood', 'rotibakar41sumbersari'): '6-C3WWVKCVNK4BGE',
    }

    def match_store(u, sname):
        norm_sname = normalize_text(sname)
        # Check manual overrides
        for (mu, ms), gfid in manual_overrides.items():
            if mu == u and ms in norm_sname:
                return gfid
                
        candidates = user_store_map.get(u, {})
        if not candidates:
            return None
            
        # 1. Exact match on normalized store name
        if norm_sname in candidates:
            return candidates[norm_sname]
            
        # 2. Substring or reverse substring match
        for cand_name, gfid in candidates.items():
            if cand_name == norm_sname or cand_name in norm_sname or norm_sname in cand_name:
                return gfid
                
        # 3. Check if all keywords of any candidate name are in the store name
        sname_words = set(re.findall(r'[a-z0-9]+', sname.lower()))
        for cand_name, gfid in candidates.items():
            cand_words = set(re.findall(r'[a-z0-9]+', cand_name))
            if cand_words and cand_words.issubset(sname_words):
                return gfid
                
        # 4. Fallback: if username only has 1 unique store_id in mapping, return it
        unique_gfids = list(set(candidates.values()))
        if len(unique_gfids) == 1:
            return unique_gfids[0]
            
        return None

    def extract_username(filename):
        if not filename.endswith('.csv'): return None
        name = filename[:-4]
        if name.startswith('grab_transactions_api_'):
            name = name[len('grab_transactions_api_'):]
        elif name.startswith('grab_transactions_'):
            name = name[len('grab_transactions_'):]
        else:
            return None
        name = re.sub(r'_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}$', '', name)
        name = re.sub(r'_[0-9a-f]{8}$', '', name)
        return name.lower()

    # Truncate raw_grab table
    print("\nTruncating table layer1_raw.raw_grab...")
    with db.engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE layer1_raw.raw_grab;"))
    print("Table layer1_raw.raw_grab truncated successfully.")

    downloads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "downloads"))
    if not os.path.exists(downloads_dir):
        print(f"Error: downloads directory not found at {downloads_dir}")
        sys.exit(1)

    files = sorted(os.listdir(downloads_dir))
    processed_count = 0
    total_rows = 0

    print("\nProcessing and ingesting Grab CSV files...")
    for f in files:
        if f.startswith('grab_transactions_3months') or not f.endswith('.csv'):
            continue
            
        u = extract_username(f)
        if not u:
            continue
            
        filepath = os.path.join(downloads_dir, f)
        try:
            df = pd.read_csv(filepath)
            if df.empty:
                print(f"  [SKIPPED] {f} (Empty file)")
                continue
                
            # Perform mapping row by row or using vector mapping
            def apply_mapping(row):
                sname = row.get('Store Name')
                if pd.isna(sname):
                    return row.get('Store ID')
                gfid = match_store(u, sname)
                return gfid if gfid else row.get('Store ID')
                
            df['Store ID'] = df.apply(apply_mapping, axis=1)
            
            # Save the modified CSV back to disk
            df.to_csv(filepath, index=False)
            
            # Ingest to database
            db.ingest_grab(df)
            
            processed_count += 1
            total_rows += len(df)
            print(f"  [SUCCESS] {f:<70} | Ingested {len(df)} rows")
            
        except Exception as e:
            print(f"  [FAILED] {f}: {e}")

    print("\n" + "=" * 60)
    print("   RE-INGESTION PROCESS COMPLETE")
    print(f"   Total CSV Files Processed: {processed_count}")
    print(f"   Total Rows Ingested: {total_rows}")
    print("=" * 60)

if __name__ == "__main__":
    main()
