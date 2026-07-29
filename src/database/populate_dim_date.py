import os
import sys
from datetime import date, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

db_dir = os.path.dirname(os.path.abspath(__file__))
elevate_dir = os.path.dirname(db_dir)

if elevate_dir not in sys.path:
    sys.path.insert(0, elevate_dir)

from config import get_db_url

MONTH_NAMES_ID = {
    1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
    5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
    9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
}

DAY_NAMES_ID = {
    1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis',
    5: 'Jumat', 6: 'Sabtu', 7: 'Minggu'
}

def populate_dim_date(start_year=2024, end_year=2030):
    print(f"📅 [DIM_DATE] Populating layer3_dim.dim_date ({start_year} - {end_year})...")
    engine = create_engine(get_db_url())

    start_d = date(start_year, 1, 1)
    end_d = date(end_year, 12, 31)

    records = []
    curr = start_d

    while curr <= end_d:
        date_key = int(curr.strftime("%Y%m%d"))
        year = curr.year
        quarter = (curr.month - 1) // 3 + 1
        quarter_name = f"Q{quarter}"
        month_number = curr.month
        month_name_id = MONTH_NAMES_ID[curr.month]
        month_name_en = curr.strftime("%B")
        week_of_year = curr.isocalendar()[1]
        day_of_month = curr.day
        day_of_week = curr.isoweekday() # 1=Monday, 7=Sunday
        day_name_id = DAY_NAMES_ID[day_of_week]
        is_weekend = day_of_week in (6, 7)

        records.append({
            "date_key": date_key,
            "full_date": curr,
            "year": year,
            "quarter": quarter,
            "quarter_name": quarter_name,
            "month_number": month_number,
            "month_name_id": month_name_id,
            "month_name_en": month_name_en,
            "week_of_year": week_of_year,
            "day_of_month": day_of_month,
            "day_of_week": day_of_week,
            "day_name_id": day_name_id,
            "is_weekend": is_weekend
        })
        curr += timedelta(days=1)

    with engine.begin() as conn:
        insert_sql = text("""
            INSERT INTO layer3_dim.dim_date (
                date_key, full_date, year, quarter, quarter_name,
                month_number, month_name_id, month_name_en,
                week_of_year, day_of_month, day_of_week, day_name_id, is_weekend
            )
            VALUES (
                :date_key, :full_date, :year, :quarter, :quarter_name,
                :month_number, :month_name_id, :month_name_en,
                :week_of_year, :day_of_month, :day_of_week, :day_name_id, :is_weekend
            )
            ON CONFLICT (date_key) DO UPDATE SET
                month_name_id = EXCLUDED.month_name_id,
                day_name_id = EXCLUDED.day_name_id,
                is_weekend = EXCLUDED.is_weekend;
        """)

        # Execute in chunks of 500
        chunk_size = 500
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            conn.execute(insert_sql, chunk)

    print(f"  ✅ [DIM_DATE] Successfully populated {len(records)} dates in layer3_dim.dim_date!")

if __name__ == "__main__":
    populate_dim_date()
