# database/recreate_clean_tables.py
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from db_manager import DatabaseManager

def recreate_clean_tables():
    db = DatabaseManager()
    
    ddl_queries = [
        # 1. Create Schema
        "CREATE SCHEMA IF NOT EXISTS layer2_clean;",
        
        # 2. Create clean stg_grab_orders
        """
        DROP TABLE IF EXISTS layer2_clean.stg_grab_orders CASCADE;
        CREATE TABLE layer2_clean.stg_grab_orders (
            id SERIAL PRIMARY KEY,
            month TEXT,
            merchant_name TEXT,
            merchant_id TEXT,
            store_name TEXT,
            store_id TEXT,
            updated_on TEXT,
            created_on TEXT,
            type TEXT,
            category TEXT,
            subcategory TEXT,
            status TEXT,
            transaction_id TEXT,
            linked_transaction_id TEXT,
            partner_transaction_id_1 TEXT,
            partner_transaction_id_2 TEXT,
            long_order_id TEXT,
            short_order_id TEXT,
            booking_id TEXT,
            order_channel TEXT,
            order_type TEXT,
            payment_method TEXT,
            receiving_account_source_of_fund TEXT,
            terminal_id TEXT,
            channel TEXT,
            offer_type TEXT,
            grab_fee_percent NUMERIC(15,2),
            points_multiplier NUMERIC(15,2),
            points_issued NUMERIC(15,2),
            settlement_id TEXT,
            transfer_date TEXT,
            amount NUMERIC(15,2),
            tax_on_order_value NUMERIC(15,2),
            restaurant_packaging_charge NUMERIC(15,2),
            non_member_fee NUMERIC(15,2),
            restaurant_service_charge NUMERIC(15,2),
            offer TEXT,
            discount_merchant_funded NUMERIC(15,2),
            delivery_fee_discount_merchant_funded NUMERIC(15,2),
            delivery_charge_grab_online_store NUMERIC(15,2),
            delivery_charge_merchant_delivery NUMERIC(15,2),
            grabexpress_delivery_service_fee NUMERIC(15,2),
            net_sales NUMERIC(15,2),
            net_mdr NUMERIC(15,2),
            tax_on_mdr NUMERIC(15,2),
            grab_fee NUMERIC(15,2),
            marketing_success_fee NUMERIC(15,2),
            delivery_commission NUMERIC(15,2),
            channel_commission NUMERIC(15,2),
            order_commission NUMERIC(15,2),
            step_up_commission NUMERIC(15,2),
            grabkitchen_commission NUMERIC(15,2),
            grabkitchen_other_commission NUMERIC(15,2),
            withholding_tax NUMERIC(15,2),
            total NUMERIC(15,2),
            tax_on_mdr_percent NUMERIC(15,2),
            delivery_commission_percent NUMERIC(15,2),
            channel_commission_percent NUMERIC(15,2),
            order_commission_percent NUMERIC(15,2),
            tax_on_grabfood_grabmart_commission_adjustments_ads NUMERIC(15,2),
            tax_on_total_grabkitchen_commission NUMERIC(15,2),
            cancellation_reason TEXT,
            cancelled_by TEXT,
            reason_for_refund TEXT,
            description TEXT,
            incident_group TEXT,
            incident_alias TEXT,
            customer_refund_item TEXT,
            appeal_link TEXT,
            appeal_status TEXT,
            package_voucher_used TEXT,
            attributed_service_fee TEXT,
            attributed_promo TEXT,
            raw_metadata JSONB,
            ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        
        # 3. Create clean stg_go_orders
        """
        DROP TABLE IF EXISTS layer2_clean.stg_go_orders CASCADE;
        CREATE TABLE layer2_clean.stg_go_orders (
            id SERIAL PRIMARY KEY,
            period_id TEXT UNIQUE,
            month TEXT,
            date DATE,
            store_name TEXT,
            store_id TEXT,
            gross_sales NUMERIC(15,2),
            commission_fee NUMERIC(15,2),
            marketing_fee_and_discount NUMERIC(15,2),
            total_platform_deduction NUMERIC(15,2),
            net_sales NUMERIC(15,2),
            average_order_customer NUMERIC(15,2),
            completed_order NUMERIC(15,2),
            cancelled_order NUMERIC(15,2),
            total_order NUMERIC(15,2),
            ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        
        # 4. Create clean stg_shopee_orders
        """
        DROP TABLE IF EXISTS layer2_clean.stg_shopee_orders CASCADE;
        CREATE TABLE layer2_clean.stg_shopee_orders (
            id SERIAL PRIMARY KEY,
            month TEXT,
            store_id TEXT,
            store_name TEXT,
            transaction_type TEXT,
            order_id TEXT UNIQUE,
            complete_time TEXT,
            status TEXT,
            food_original_price NUMERIC(15,2),
            item_discounts NUMERIC(15,2),
            flash_sale_discount NUMERIC(15,2),
            surcharge_fee NUMERIC(15,2),
            merchant_voucher_deals_subsidy NUMERIC(15,2),
            platform_flash_sale_subsidy NUMERIC(15,2),
            food_voucher_subsidy NUMERIC(15,2),
            food_direct_discount NUMERIC(15,2),
            transaction_amount NUMERIC(15,2),
            checkout_murah_price NUMERIC(15,2),
            notes TEXT,
            net_sales NUMERIC(15,2),
            commission NUMERIC(15,2),
            revenue NUMERIC(15,2),
            raw_metadata JSONB,
            ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    ]
    
    print("[DB] Connecting to remote database and dropping/recreating tables in layer2_clean schema...")
    with db.engine.begin() as conn:
        for query in ddl_queries:
            conn.execute(text(query))
            
    print("[DB] Schema layer2_clean, stg_grab_orders, stg_go_orders, and stg_shopee_orders successfully created.")

if __name__ == "__main__":
    recreate_clean_tables()
