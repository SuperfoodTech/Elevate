import os
import re
import urllib.parse
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path configuration
db_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(db_dir)
grandparent_dir = os.path.dirname(parent_dir)

# Load database/.env first, then fallback to parent .env, then grandparent .env
load_dotenv(os.path.join(db_dir, ".env"))
load_dotenv(os.path.join(parent_dir, ".env"), override=True)
load_dotenv(os.path.join(grandparent_dir, ".env"), override=True)
load_dotenv() # Load from current working directory as well

# DB Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DB_URL = DATABASE_URL
else:
    DB_HOST = (os.getenv("DB_HOST") or "165.232.165.241").strip("'").strip('"').strip()
    DB_PORT = (os.getenv("DB_Port") or os.getenv("DB_PORT") or "5432").strip("'").strip('"').strip()
    DB_NAME = (os.getenv("DB_NAME") or os.getenv("DB_Name") or "db_superfood").strip("'").strip('"').strip()
    DB_USERNAME = (os.getenv("DB_USERNAME") or os.getenv("DB_Username") or "admin").strip("'").strip('"').strip()
    DB_PASSWORD = (os.getenv("DB_PASSWORD") or os.getenv("DB_PASS") or os.getenv("DB_Password") or "superF777@").strip("'").strip('"').strip()
    SSL_MODE = (os.getenv("SSL_Mode") or os.getenv("SSL_MODE") or os.getenv("SSL_mode") or "disable").strip("'").strip('"').strip()

    # URL-encode credentials to handle special characters (e.g. '@' in password)
    safe_username = urllib.parse.quote_plus(DB_USERNAME)
    safe_password = urllib.parse.quote_plus(DB_PASSWORD)

    DB_URL = f"postgresql://{safe_username}:{safe_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    if SSL_MODE:
        DB_URL += f"?sslmode={SSL_MODE}"

def raw_string_format(val):
    if pd.isna(val) or val is None or val == "":
        return None
    return str(val).strip()

class DatabaseManager:
    def __init__(self):
        self.engine = create_engine(DB_URL)

    def ingest_shopee(self, df: pd.DataFrame):
        """Ingests Shopee raw data into layer1_raw.raw_shopee."""
        print("[DB] Ingesting Shopee data to layer1_raw.raw_shopee...")
        
        # Support both Indonesian and English headers
        header_mapping = {
            "Store ID": "Store ID",
            "Store name": "Store name",
            "Nama Toko": "Store name",
            "Transaction type": "Transaction type",
            "Tipe Transaksi": "Transaction type",
            "Transaction ID (Order ID)": "Transaction ID (Order ID)",
            "No. Pesanan": "Transaction ID (Order ID)",
            "Order ID": "Transaction ID (Order ID)",
            "Complete Time": "Complete Time",
            "Waktu Penyelesaian": "Complete Time",
            "Status": "Status",
            "Food original price": "Food original price",
            "Harga Makanan": "Food original price",
            "Item discounts": "Item discounts",
            "Diskon": "Item discounts",
            "Flash sale discount": "Flash sale discount",
            "Diskon Flash Sale": "Flash sale discount",
            "Surcharge fee": "Surcharge fee",
            "Biaya Tambahan": "Surcharge fee",
            "Merchant Voucher Deals Subsidy": "Merchant Voucher Deals Subsidy",
            "Subsidi Merchant untuk Voucher Deals": "Merchant Voucher Deals Subsidy",
            "Platform Flash Sale Subsidy": "Platform Flash Sale Subsidy",
            "Subsidi Platform untuk Flash Sale": "Platform Flash Sale Subsidy",
            "Food Voucher Subsidy": "Food Voucher Subsidy",
            "Subsidi Voucher Makanan": "Food Voucher Subsidy",
            "Food Direct Discount": "Food Direct Discount",
            "Diskon Langsung": "Food Direct Discount",
            "Transaction amount": "Transaction amount",
            "Nilai Transaksi": "Transaction amount",
            "Checkout Murah Price": "Checkout Murah Price",
            "Harga Checkout Murah": "Checkout Murah Price",
            "Notes": "Notes"
        }
        
        # Build mapping dynamically based on columns in the dataframe
        resolved_mapping = {}
        for df_col in df.columns:
            if df_col in header_mapping:
                resolved_mapping[df_col] = header_mapping[df_col]
                
        # Fill missing standard targets with defaults
        target_cols = [
            "Store ID", "Store name", "Transaction type", "Transaction ID (Order ID)", 
            "Complete Time", "Status", "Food original price", "Item discounts", 
            "Flash sale discount", "Surcharge fee", "Merchant Voucher Deals Subsidy", 
            "Platform Flash Sale Subsidy", "Food Voucher Subsidy", 
            "Food Direct Discount", "Transaction amount", "Checkout Murah Price", "Notes"
        ]
        
        # Rename and select available columns
        df_mapped = df[list(resolved_mapping.keys())].rename(columns=resolved_mapping).copy()
        df_mapped = df_mapped.loc[:, ~df_mapped.columns.duplicated()]
        
        # Add missing target columns as defaults
        for col in target_cols:
            if col not in df_mapped.columns:
                df_mapped[col] = None

        # Enforce exact column selection and order
        df_stg = df_mapped[target_cols].copy()
        
        # Convert all to raw strings (preserving the exact values, keeping NaN as None/NULL)
        for col in target_cols:
            df_stg[col] = df_stg[col].apply(raw_string_format)
        
        # Write to database schema layer1_raw
        with self.engine.begin() as conn:
            df_stg.to_sql('raw_shopee', conn, schema='layer1_raw', if_exists='append', index=False)
        
        print("[DB] Shopee raw ingestion completed.")

    def ingest_grab(self, df: pd.DataFrame):
        """Ingests Grab raw data into layer1_raw.raw_grab."""
        print("[DB] Ingesting Grab data to layer1_raw.raw_grab...")
        
        cols = [
            "Merchant Name", "Merchant ID", "Store Name", "Store ID", 
            "Updated On", "Created On", "Type", "Category", "Subcategory", 
            "Status", "Transaction ID", "Linked Transaction ID", 
            "Partner transaction ID 1", "Partner transaction ID 2", 
            "Long Order ID", "Short Order ID", "Booking ID", "Order Channel", 
            "Order Type", "Payment Method", "Receiving account / Source of fund", 
            "Terminal ID", "Channel", "Offer Type", "Grab Fee (%)", 
            "Points Multiplier", "Points Issued", "Settlement ID", 
            "Transfer Date", "Amount", "Tax on Order Value", 
            "Restaurant Packaging Charge", "Non-Member Fee", 
            "Restaurant Service Charge", "Offer", "Discount (Merchant-Funded)", 
            "Delivery Fee Discount (Merchant-Funded)", 
            "Delivery Charge (Grab Online Store)", 
            "Delivery Charge (Merchant Delivery)", 
            "GrabExpress Delivery Service Fee", "Net Sales", "Net MDR", 
            "Tax on MDR", "Grab Fee", "Marketing success fee", 
            "Delivery Commission", "Channel Commission", "Order commission", 
            "Step-up commission", "GrabKitchen Commission", 
            "GrabKitchen Other Commission", "Withholding Tax", "Total", 
            "Tax on MDR (%)", "Delivery Commission (%)", "Channel Commission (%)", 
            "Order Commission (%)", 
            "Tax on GrabFood/GrabMart commission, adjustments, ads", 
            "Tax on Total GrabKitchen Commission", "Cancellation Reason", 
            "Cancelled by", "Reason for Refund", "Description", 
            "Incident group", "Incident alias", "Customer refund Item", 
            "Appeal link", "Appeal status"
        ]
        
        # Resolve column naming flexibility
        resolved_mapping = {}
        for df_col in df.columns:
            # Match columns ignoring case and spaces
            cleaned_df_col = re.sub(r'[^a-zA-Z0-9]', '', df_col).lower()
            for target_col in cols:
                cleaned_target = re.sub(r'[^a-zA-Z0-9]', '', target_col).lower()
                if cleaned_df_col == cleaned_target:
                    resolved_mapping[df_col] = target_col
                    break
        
        df_mapped = df[list(resolved_mapping.keys())].rename(columns=resolved_mapping).copy()
        df_mapped = df_mapped.loc[:, ~df_mapped.columns.duplicated()]
        
        # Ensure all columns exist in DF
        for col in cols:
            if col not in df_mapped.columns:
                df_mapped[col] = None
        
        # Select and copy
        df_stg = df_mapped[cols].copy()
        
        # Convert all to raw strings
        for col in cols:
            df_stg[col] = df_stg[col].apply(raw_string_format)

        with self.engine.begin() as conn:
            df_stg.to_sql('raw_grab', conn, schema='layer1_raw', if_exists='append', index=False)
            
        print("[DB] Grab raw ingestion completed.")

    def ingest_gofood(self, df: pd.DataFrame):
        """Ingests GoFood raw data into layer1_raw.raw_go."""
        print("[DB] Ingesting GoFood data to layer1_raw.raw_go...")
        
        header_mapping = {
            "Tanggal": "Tanggal",
            "Outlet Name": "Store Name",
            "Store Name": "Store Name",
            "Store ID": "Store ID",
            "Penjualan Kotor": "Penjualan Kotor",
            "Biaya Komisi": "Biaya Komisi",
            "Pengeluaran Iklan & Diskon": "Pengeluaran Iklan & Diskon",
            "Order Sukses": "Order Sukses",
            "Order Batal": "Order Batal"
        }
        
        resolved_mapping = {}
        for df_col in df.columns:
            if df_col in header_mapping:
                resolved_mapping[df_col] = header_mapping[df_col]
                
        target_cols = [
            "Tanggal", "Store Name", "Store ID", "Penjualan Kotor", 
            "Biaya Komisi", "Pengeluaran Iklan & Diskon", "Order Sukses", "Order Batal"
        ]
        
        df_mapped = df[list(resolved_mapping.keys())].rename(columns=resolved_mapping).copy()
        df_mapped = df_mapped.loc[:, ~df_mapped.columns.duplicated()]
        
        for col in target_cols:
            if col not in df_mapped.columns:
                df_mapped[col] = None
                
        df_stg = df_mapped[target_cols].copy()
        
        # Convert all to raw strings
        for col in target_cols:
            df_stg[col] = df_stg[col].apply(raw_string_format)

        with self.engine.begin() as conn:
            df_stg.to_sql('raw_go', conn, schema='layer1_raw', if_exists='append', index=False)
            
        print("[DB] GoFood raw ingestion completed.")

if __name__ == "__main__":
    db = DatabaseManager()
    print("[DB] DatabaseManager initialized successfully.")
