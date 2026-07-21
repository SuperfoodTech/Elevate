import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from layer1_db_manager import DatabaseManager

def refresh_fact():
    db = DatabaseManager()
    print("=" * 60)
    print("   LAYER 3 FACT TABLE REFRESH RUNNER")
    print("=" * 60)
    
    with db.engine.begin() as conn:
        print("[DB] Refreshing public.fact_transactions (Unified Master Table)...")
        conn.execute(text("SELECT refresh_fact_transactions();"))
        
    print("\n[DB] Querying verification counts...")
    with db.engine.connect() as conn:
        fact_cnt = conn.execute(text("SELECT COUNT(*) FROM public.fact_transactions")).scalar()
        print(f"  [VERIFY] public.fact_transactions row count: {fact_cnt}")
        
    print("=" * 60)
    print("   LAYER 3 FACT REFRESH COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    refresh_fact()
