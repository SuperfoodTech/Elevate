import os
import sys
import argparse
import subprocess
from dotenv import load_dotenv

# Load env variables
load_dotenv()

def resolve_script_path(base_dir, rel_path):
    options = [
        os.path.join(base_dir, rel_path),
    ]
    if rel_path.startswith("src/"):
        options.append(os.path.join(base_dir, rel_path[4:]))
        parent = os.path.dirname(base_dir)
        options.append(os.path.join(parent, rel_path))
    else:
        options.append(os.path.join(base_dir, "src", rel_path))
        parent = os.path.dirname(base_dir)
        options.append(os.path.join(parent, "src", rel_path))
        options.append(os.path.join(parent, rel_path))
            
    for opt in options:
        abs_opt = os.path.abspath(opt)
        if os.path.exists(abs_opt):
            return abs_opt
    return os.path.abspath(os.path.join(base_dir, rel_path))

def run_scraper(scraper_name, script_path, args=None):
    print("=" * 60)
    print(f"STARTING SCRAPER: {scraper_name}")
    print("=" * 60)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    abs_script_path = resolve_script_path(base_dir, script_path)
    
    if not os.path.exists(abs_script_path):
        print(f"Error: Script not found at {abs_script_path}")
        return False
        
    # Look for virtual environment Python in base_dir or project root (parent of src)
    venv_options = [
        os.path.join(base_dir, ".venv", "bin", "python"),
        os.path.join(os.path.dirname(base_dir), ".venv", "bin", "python"),
    ]
    venv_python = sys.executable
    for opt in venv_options:
        if os.path.exists(opt):
            venv_python = opt
            break
        
    cmd = [venv_python, "-u", abs_script_path]
    if args:
        cmd.extend(args)
        
    print(f"Running command: {' '.join(cmd)}")
    try:
        process = subprocess.Popen(
            cmd,
            cwd=os.path.dirname(abs_script_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                sys.stdout.write(output)
                sys.stdout.flush()
                
        rc = process.poll()
        if rc == 0:
            print(f"\nSUCCESS: {scraper_name} completed successfully.")
            return True
        else:
            print(f"\nFAILURE: {scraper_name} exited with return code {rc}")
            return False
            
    except Exception as e:
        print(f"\nError executing {scraper_name}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Unified Ingestion Pipeline for GrabFood, ShopeeFood, and GoFood."
    )
    parser.add_argument(
        "--db",
        action="store_true",
        help="Enable database ingestion to layer1_raw schema."
    )
    parser.add_argument(
        "--grab",
        action="store_true",
        help="Run GrabFood scraper only."
    )
    parser.add_argument(
        "--shopee",
        action="store_true",
        help="Run ShopeeFood scraper only."
    )
    parser.add_argument(
        "--gofood",
        action="store_true",
        help="Run GoFood scraper only."
    )
    parser.add_argument(
        "--start-date",
        type=str,
        default=None,
        help="Start date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--end-date",
        type=str,
        default=None,
        help="End date (YYYY-MM-DD)"
    )
    
    args = parser.parse_args()
    
    # If no specific scraper is flagged, run all of them
    run_all = not (args.grab or args.shopee or args.gofood)
    
    # Prepare arguments to pass to sub-scrapers
    sub_args = []
    if args.db:
        sub_args.append("--db")
        # Set environment variable just in case
        os.environ["INGEST_DB"] = "true"
        
    if args.start_date:
        sub_args.extend(["--start-date", args.start_date])
    if args.end_date:
        sub_args.extend(["--end-date", args.end_date])
        
    results = {}
    
    # 1. GrabFood Ingestion
    if run_all or args.grab:
        results["GrabFood"] = run_scraper(
            scraper_name="GrabFood Scraper",
            script_path="src/grab/main.py",
            args=sub_args
        )
        
    # 2. ShopeeFood Ingestion
    if run_all or args.shopee:
        results["ShopeeFood"] = run_scraper(
            scraper_name="ShopeeFood Scraper",
            script_path="src/shopee/run_omzet.py",
            args=sub_args
        )
        
    # 3. GoFood Ingestion
    if run_all or args.gofood:
        results["GoFood"] = run_scraper(
            scraper_name="GoFood Scraper",
            script_path="src/gofood/gofood.py",
            args=sub_args
        )
        
    # Print execution summary
    print("\n" + "=" * 60)
    print("PIPELINE EXECUTION SUMMARY")
    print("=" * 60)
    for name, success in results.items():
        status = "SUCCESS" if success else "FAILED"
        print(f"{name:<20}: {status}")
    print("=" * 60)

    # 4. Trigger Automatic Normalization & Master Table Refresh if DB Ingestion is enabled
    if args.db:
        any_success = any(results.values())
        if any_success:
            print("\n" + "=" * 60)
            print("RUNNING AUTOMATIC NORMALIZATION & REFRESH")
            print("=" * 60)
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

            norm_script = resolve_script_path(base_dir, "database/layer2_normalize.py")
            if os.path.exists(norm_script):
                try:
                    subprocess.run([venv_python, norm_script], check=True)
                    print("\nSUCCESS: Database normalization (Layer 2) completed.")
                except subprocess.CalledProcessError as e:
                    print(f"\nError: Normalization failed with exit code {e.returncode}")
            else:
                print(f"Error: Normalization script not found at {norm_script}")

            refresh_script = resolve_script_path(base_dir, "database/layer3_refresh_fact.py")
            if os.path.exists(refresh_script):
                try:
                    subprocess.run([venv_python, refresh_script], check=True)
                    print("\nSUCCESS: Master fact table refresh (Layer 3) completed.")
                except subprocess.CalledProcessError as e:
                    print(f"\nError: Refresh failed with exit code {e.returncode}")
            else:
                print(f"Error: Refresh script not found at {refresh_script}")

if __name__ == "__main__":
    main()
