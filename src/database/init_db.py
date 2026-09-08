import os
from db_manager import DatabaseManager
from sqlalchemy import text

def init_db():
    db = DatabaseManager()
    init_sql_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "init_db.sql")
    if not os.path.exists(init_sql_path):
        print(f"Error: {init_sql_path} does not exist.")
        return
        
    print(f"Reading SQL from {init_sql_path}...")
    with open(init_sql_path, "r") as f:
        sql = f.read()
        
    print("Executing SQL statements on remote database...")
    with db.engine.begin() as conn:
        conn.execute(text(sql))
        agency_rules_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agency_settlement_rules.sql")
        if os.path.exists(agency_rules_path):
            print(f"Applying Agency settlement rules from {agency_rules_path}...")
            with open(agency_rules_path, "r", encoding="utf-8") as f:
                conn.execute(text(f.read()))
    print("Database schema successfully initialized!")

if __name__ == "__main__":
    init_db()
