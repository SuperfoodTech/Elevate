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
    print("Database schema successfully initialized!")

if __name__ == "__main__":
    init_db()
