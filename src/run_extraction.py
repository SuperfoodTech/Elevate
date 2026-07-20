#!/usr/bin/env python3
import os
import sys
import subprocess
from datetime import datetime, timedelta

def get_default_dates():
    # Default to last week (Monday to Sunday)
    today = datetime.now()
    days_to_last_sunday = today.weekday() + 1
    last_sunday = today - timedelta(days=days_to_last_sunday)
    last_monday = last_sunday - timedelta(days=6)
    return last_monday.strftime("%Y-%m-%d"), last_sunday.strftime("%Y-%m-%d")

def main():
    print("=" * 60)
    print("   FOODMASTER MULTI-PLATFORM EXTRACTION UTILITY")
    print("=" * 60)
    
    # 1. Ask for Platform
    print("Select platform to scrape:")
    print("  [1] GrabFood only")
    print("  [2] ShopeeFood only")
    print("  [3] GoFood only")
    print("  [4] All Platforms (GrabFood + ShopeeFood + GoFood)")
    choice = input("Enter choice (1-4, default 4): ").strip()
    if not choice:
        choice = "4"
        
    platform_flags = []
    if choice == "1":
        platform_flags = ["--grab"]
    elif choice == "2":
        platform_flags = ["--shopee"]
    elif choice == "3":
        platform_flags = ["--gofood"]
    elif choice == "4":
        platform_flags = [] # None specifies all
    else:
        print("Invalid choice. Exiting.")
        sys.exit(1)
        
    # 2. Ask for Dates
    default_start, default_end = get_default_dates()
    start_date = input(f"Enter Start Date (YYYY-MM-DD, default '{default_start}'): ").strip() or default_start
    end_date = input(f"Enter End Date (YYYY-MM-DD, default '{default_end}'): ").strip() or default_end
    
    # Validate date formats
    for d_str in (start_date, end_date):
        try:
            datetime.strptime(d_str, "%Y-%m-%d")
        except ValueError:
            print(f"Error: Date '{d_str}' is not in YYYY-MM-DD format.")
            sys.exit(1)
            
    # 3. Ask for Database Ingestion
    db_ingest = input("Enable raw database ingestion to layer1? (y/N): ").strip().lower()
    db_flags = ["--db"] if db_ingest in ("y", "yes") else []
    
    # 4. Construct run_pipeline command
    base_dir = os.path.dirname(os.path.abspath(__file__))
    venv_options = [
        os.path.join(base_dir, ".venv", "bin", "python"),
        os.path.join(os.path.dirname(base_dir), ".venv", "bin", "python"),
    ]
    venv_python = sys.executable
    for opt in venv_options:
        if os.path.exists(opt):
            venv_python = opt
            break
        
    pipeline_script = os.path.join(base_dir, "run_pipeline.py")
    cmd = [
        venv_python, pipeline_script,
        "--start-date", start_date,
        "--end-date", end_date
    ] + platform_flags + db_flags
    
    print("\n" + "=" * 60)
    print("STARTING EXTRACTION PIPELINE")
    print(f"Command: {' '.join(cmd)}")
    print("=" * 60)
    
    try:
        # Run pipeline
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"\nPipeline execution failed: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
        sys.exit(0)

if __name__ == "__main__":
    main()
