import os
import json
from pathlib import Path

# Load config.json
config_path = Path(__file__).resolve().parent / "config.json"
with open(config_path) as f:
    _config = json.load(f)

def get_db_url():
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    
    defaults = _config["db_defaults"]
    host = os.getenv("DB_HOST", defaults["host"]).strip("'\" ")
    port = os.getenv("DB_PORT", os.getenv("DB_Port", str(defaults["port"]))).strip("'\" ")
    name = os.getenv("DB_NAME", defaults["name"]).strip("'\" ")
    user = os.getenv("DB_USERNAME", defaults["username"]).strip("'\" ")
    password = os.getenv("DB_PASSWORD", defaults["password"]).strip("'\" ")
    sslmode = os.getenv("SSL_MODE", os.getenv("SSL_Mode", defaults["sslmode"])).strip("'\" ")
    
    import urllib.parse
    safe_user = urllib.parse.quote_plus(user)
    safe_password = urllib.parse.quote_plus(password)
    
    url = f"postgresql://{safe_user}:{safe_password}@{host}:{port}/{name}"
    if sslmode:
        url += f"?sslmode={sslmode}"
    return url

def get_sheet_url(key):
    return _config["google_sheets"].get(key)

def get_config_val(key, default=None):
    return _config.get(key, default)
