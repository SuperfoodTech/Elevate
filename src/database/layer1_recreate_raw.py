from db_manager import DatabaseManager
from sqlalchemy import text

def recreate_tables():
    db = DatabaseManager()
    
    ddl_queries = [
        # 1. raw_go
        """
        DROP TABLE IF EXISTS layer1_raw.raw_go CASCADE;
        CREATE TABLE layer1_raw.raw_go (
            "Order Status" TEXT,
            "Outlet Name" TEXT,
            "Merchant ID" TEXT,
            "Feature" TEXT,
            "Order ID" TEXT,
            "Transaction ID" TEXT,
            "Amount" TEXT,
            "Net Amount" TEXT,
            "Transaction Time" TEXT,
            "Payment Type" TEXT,
            "GoPay Promo" TEXT,
            "Promo Type" TEXT,
            "Promo Name" TEXT,
            "Merchant Promo Contribution" TEXT,
            "Voucher Description" TEXT,
            "GoFood Discount" TEXT,
            "Voucher Commission" TEXT,
            "Total Fee" TEXT,
            "Value Added Tax" TEXT,
            "Restaurant Tax" TEXT,
            "Service" TEXT,
            "Withholding Tax" TEXT
        );
        """,
        
        # 2. raw_shopee
        """
        DROP TABLE IF EXISTS layer1_raw.raw_shopee CASCADE;
        CREATE TABLE layer1_raw.raw_shopee (
            "Store ID" TEXT,
            "Store name" TEXT,
            "Transaction type" TEXT,
            "Transaction ID (Order ID)" TEXT,
            "Complete Time" TEXT,
            "Status" TEXT,
            "Food original price" TEXT,
            "Item discounts" TEXT,
            "Flash sale discount" TEXT,
            "Surcharge fee" TEXT,
            "Merchant Voucher Deals Subsidy" TEXT,
            "Platform Flash Sale Subsidy" TEXT,
            "Food Voucher Subsidy" TEXT,
            "Food Direct Discount" TEXT,
            "Transaction amount" TEXT,
            "Checkout Murah Price" TEXT,
            "Notes" TEXT
        );
        """,
        
        # 3. raw_grab
        """
        DROP TABLE IF EXISTS layer1_raw.raw_grab CASCADE;
        CREATE TABLE layer1_raw.raw_grab (
            "Merchant Name" TEXT,
            "Merchant ID" TEXT,
            "Store Name" TEXT,
            "Store ID" TEXT,
            "Updated On" TEXT,
            "Created On" TEXT,
            "Type" TEXT,
            "Category" TEXT,
            "Subcategory" TEXT,
            "Status" TEXT,
            "Transaction ID" TEXT,
            "Linked Transaction ID" TEXT,
            "Partner transaction ID 1" TEXT,
            "Partner transaction ID 2" TEXT,
            "Long Order ID" TEXT,
            "Short Order ID" TEXT,
            "Booking ID" TEXT,
            "Order Channel" TEXT,
            "Order Type" TEXT,
            "Payment Method" TEXT,
            "Receiving account / Source of fund" TEXT,
            "Terminal ID" TEXT,
            "Channel" TEXT,
            "Offer Type" TEXT,
            "Grab Fee (%)" TEXT,
            "Points Multiplier" TEXT,
            "Points Issued" TEXT,
            "Settlement ID" TEXT,
            "Transfer Date" TEXT,
            "Amount" TEXT,
            "Tax on Order Value" TEXT,
            "Restaurant Packaging Charge" TEXT,
            "Non-Member Fee" TEXT,
            "Restaurant Service Charge" TEXT,
            "Offer" TEXT,
            "Discount (Merchant-Funded)" TEXT,
            "Delivery Fee Discount (Merchant-Funded)" TEXT,
            "Delivery Charge (Grab Online Store)" TEXT,
            "Delivery Charge (Merchant Delivery)" TEXT,
            "GrabExpress Delivery Service Fee" TEXT,
            "Net Sales" TEXT,
            "Net MDR" TEXT,
            "Tax on MDR" TEXT,
            "Grab Fee" TEXT,
            "Marketing success fee" TEXT,
            "Delivery Commission" TEXT,
            "Channel Commission" TEXT,
            "Order commission" TEXT,
            "Step-up commission" TEXT,
            "GrabKitchen Commission" TEXT,
            "GrabKitchen Other Commission" TEXT,
            "Withholding Tax" TEXT,
            "Total" TEXT,
            "Tax on MDR (%)" TEXT,
            "Delivery Commission (%)" TEXT,
            "Channel Commission (%)" TEXT,
            "Order Commission (%)" TEXT,
            "Tax on GrabFood/GrabMart commission, adjustments, ads" TEXT,
            "Tax on Total GrabKitchen Commission" TEXT,
            "Cancellation Reason" TEXT,
            "Cancelled by" TEXT,
            "Reason for Refund" TEXT,
            "Description" TEXT,
            "Incident group" TEXT,
            "Incident alias" TEXT,
            "Customer refund Item" TEXT,
            "Appeal link" TEXT,
            "Appeal status" TEXT
        );
        """
    ]
    
    print("[DB] Connecting to remote database and dropping/recreating tables in layer1_raw schema...")
    with db.engine.begin() as conn:
        for query in ddl_queries:
            conn.execute(text(query))
            
    print("[DB] Tables raw_go, raw_shopee, and raw_grab successfully recreated with TEXT columns.")

if __name__ == "__main__":
    recreate_tables()
