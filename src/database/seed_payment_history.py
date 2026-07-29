import sys
import os
import re
import pandas as pd
from datetime import datetime
from sqlalchemy import text

# Add database path to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layer1_db_manager import DatabaseManager

CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8IHFF4i5gM_PZ3zRTUPLtQ5Fgdxr_U5owgi8OVNTEcsQuxy0Ire0USzh6U5srXjvgaZfOiD9OgbMn/pub?gid=2010134040&single=true&output=csv"

MONTH_MAP = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
}

def clean_amount(val):
    if pd.isna(val) or val is None:
        return 0.0
    val_str = str(val).strip()
    if not val_str or val_str == '-':
        return 0.0
    
    is_negative = '-' in val_str
    digits_only = re.sub(r'[^0-9]', '', val_str)
    if not digits_only:
        return 0.0
    
    num = float(digits_only)
    return -num if is_negative else num

def normalize_periode(raw_periode):
    if pd.isna(raw_periode) or not raw_periode:
        return None
    p_str = str(raw_periode).strip()
    
    # Check weekly format e.g. 2026-05-W1 or 2026-05 W1
    if 'W' in p_str.upper():
        clean_w = re.sub(r'\s+', '-', p_str.upper())
        return clean_w
    
    # Check Monthly format e.g. "March 2026", "April 2026", "2026-05"
    if '-' in p_str and len(p_str) == 7:
        return p_str
    
    parts = p_str.split()
    if len(parts) == 2:
        m_name = parts[0].lower()
        yr = parts[1]
        if m_name in MONTH_MAP and yr.isdigit():
            return f"{yr}-{MONTH_MAP[m_name]}"
    
    return p_str

def parse_date(date_val):
    if pd.isna(date_val) or not date_val or str(date_val).strip() in ('-', ''):
        return None
    d_str = str(date_val).strip()
    try:
        dt = pd.to_datetime(d_str)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return None

def run_seed_payment_history():
    print("[ETL INGESTION] Downloading payment history CSV from Google Sheets...")
    df = pd.read_csv(CSV_URL)
    print(f"[ETL INGESTION] Downloaded {len(df)} rows from Google Sheets.")

    db = DatabaseManager()
    
    with db.engine.connect() as conn:
        # Load merchant mapping lookup
        map_rows = conn.execute(text("""
            SELECT store_id, outlet_name, brand, nama_resto_final
            FROM layer3_dim.dim_merchant_mapping
        """)).mappings().all()

        cred_rows = conn.execute(text("""
            SELECT store_id, owner_name, merchant_name
            FROM layer3_dim.dim_merchant_credentials
        """)).mappings().all()

    # Build lookup dictionaries
    lookup_exact = {}
    lookup_cabang = {}
    lookup_brand = {}

    for r in map_rows:
        sid = r['store_id']
        ot = (r['outlet_name'] or '').strip().lower()
        br = (r['brand'] or '').strip().lower()
        rf = (r['nama_resto_final'] or '').strip().lower()

        if rf:
            lookup_exact[rf] = sid
            lookup_cabang[rf] = sid
        if ot and br:
            lookup_exact[f"{ot} | {br}"] = sid
            lookup_brand[br] = sid

    for r in cred_rows:
        sid = r['store_id']
        ow = (r['owner_name'] or '').strip().lower()
        mn = (r['merchant_name'] or '').strip().lower()
        if ow and mn:
            lookup_exact[f"{ow} | {mn}"] = sid
            lookup_cabang[mn] = sid

    print(f"[LOOKUP BUILD] Built lookup tables: {len(lookup_exact)} exact, {len(lookup_cabang)} cabang.")

    success_count = 0
    skipped_count = 0

    upsert_sql = text("""
        INSERT INTO layer3_dim.billing_payments (
            store_id, periode, penyesuaian, tanggal_tagihan, transfer_id,
            tanggal_pembayaran, link_bukti, status_pembayaran, notes, updated_at
        ) VALUES (
            :store_id, :periode, :penyesuaian, CAST(:tanggal_tagihan AS DATE), :transfer_id,
            CAST(:tanggal_pembayaran AS DATE), :link_bukti, :status_pembayaran, :notes, CURRENT_TIMESTAMP
        )
        ON CONFLICT (store_id, periode) DO UPDATE SET
            penyesuaian = EXCLUDED.penyesuaian,
            tanggal_tagihan = COALESCE(EXCLUDED.tanggal_tagihan, layer3_dim.billing_payments.tanggal_tagihan),
            transfer_id = COALESCE(EXCLUDED.transfer_id, layer3_dim.billing_payments.transfer_id),
            tanggal_pembayaran = COALESCE(EXCLUDED.tanggal_pembayaran, layer3_dim.billing_payments.tanggal_pembayaran),
            link_bukti = COALESCE(EXCLUDED.link_bukti, layer3_dim.billing_payments.link_bukti),
            status_pembayaran = EXCLUDED.status_pembayaran,
            updated_at = CURRENT_TIMESTAMP;
    """)

    with db.engine.begin() as conn:
        for idx, row in df.iterrows():
            outlet = str(row.get('Outlet', '')).strip()
            cabang = str(row.get('Cabang', '')).strip()
            raw_p = row.get('Periode')
            
            periode = normalize_periode(raw_p)
            if not periode or not cabang:
                skipped_count += 1
                continue

            # Match store_id
            ot_lower = outlet.lower()
            cb_lower = cabang.lower()

            matched_sid = None
            if cb_lower in lookup_exact:
                matched_sid = lookup_exact[cb_lower]
            elif f"{ot_lower} | {cb_lower}" in lookup_exact:
                matched_sid = lookup_exact[f"{ot_lower} | {cb_lower}"]
            elif cb_lower in lookup_cabang:
                matched_sid = lookup_cabang[cb_lower]
            elif cb_lower in lookup_brand:
                matched_sid = lookup_brand[cb_lower]
            else:
                # Fuzzy partial match
                for k, sid in lookup_cabang.items():
                    if cb_lower in k or k in cb_lower:
                        matched_sid = sid
                        break

            if not matched_sid:
                skipped_count += 1
                continue

            penyesuaian = clean_amount(row.get('Penyesuaian'))
            tgl_tagihan = parse_date(row.get('Tanggal Tagihan'))
            trf_id = str(row.get('Transfer ID', '')).strip()
            if trf_id == '-': trf_id = None

            tgl_bayar = parse_date(row.get('Tanggal Pembayaran'))
            link_bukti = str(row.get('Link Bukti Pembayaran', '')).strip()
            if not link_bukti or link_bukti == '-': link_bukti = None

            status_pembayaran = 'LUNAS' if (tgl_bayar or trf_id or link_bukti) else 'BELUM DIBAYAR'

            conn.execute(upsert_sql, {
                "store_id": matched_sid,
                "periode": periode,
                "penyesuaian": penyesuaian,
                "tanggal_tagihan": tgl_tagihan,
                "transfer_id": trf_id,
                "tanggal_pembayaran": tgl_bayar,
                "link_bukti": link_bukti,
                "status_pembayaran": status_pembayaran,
                "notes": f"Historical Import from Google Sheets (Row Key: {row.get('Row Key', '')})"
            })
            success_count += 1

    print(f"\n✅ [ETL COMPLETE] Ingested {success_count} payment history records into PostgreSQL database.")
    print(f"   Skipped / unmapped: {skipped_count} rows.")

if __name__ == "__main__":
    run_seed_payment_history()
