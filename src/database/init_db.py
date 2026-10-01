import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from layer1_db_manager import DatabaseManager
except ImportError:
    from db_manager import DatabaseManager
from sqlalchemy import text

def init_db():
    db = DatabaseManager()
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Initialize Layer 3 Dim tables (dim_merchant_mapping, fact_transactions, etc.)
    layer3_dim_sql = os.path.join(base_dir, "init_layer3_dim.sql")
    if os.path.exists(layer3_dim_sql):
        print(f"Reading Layer 3 Dim SQL from {layer3_dim_sql}...")
        with open(layer3_dim_sql, "r", encoding="utf-8") as f:
            sql_dim = f.read()
        with db.engine.begin() as conn:
            conn.execute(text(sql_dim))
        print("Layer 3 Dimensions tables successfully initialized!")

    # 1b. Initialize Business Grouping tables & view
    bg_sql = os.path.join(base_dir, "init_business_grouping.sql")
    if os.path.exists(bg_sql):
        print(f"Reading Business Grouping SQL from {bg_sql}...")
        with open(bg_sql, "r", encoding="utf-8") as f:
            sql_bg = f.read()
        with db.engine.begin() as conn:
            conn.execute(text(sql_bg))
        print("Business Grouping schema successfully initialized!")

    # 2. Initialize Fact Transactions & Stored Procedures
    init_sql_path = os.path.join(base_dir, "init_db.sql")
    if not os.path.exists(init_sql_path):
        print(f"Error: {init_sql_path} does not exist.")
        return
        
    print(f"Reading SQL from {init_sql_path}...")
    with open(init_sql_path, "r", encoding="utf-8") as f:
        sql = f.read()
        
    print("Executing SQL statements on database...")
    with db.engine.begin() as conn:
        conn.execute(text(sql))
    print("Stored procedures successfully initialized!")

    # 3. Agency Settlement Rules
    agency_rules_path = os.path.join(base_dir, "agency_settlement_rules.sql")
    if os.path.exists(agency_rules_path):
        print(f"Applying Agency settlement rules from {agency_rules_path}...")
        with open(agency_rules_path, "r", encoding="utf-8") as f:
            conn_rules = f.read()
        with db.engine.begin() as conn:
            conn.execute(text(conn_rules))
        print("Agency settlement rules successfully applied!")

    print("Database schema successfully initialized!")

if __name__ == "__main__":
    init_db()
