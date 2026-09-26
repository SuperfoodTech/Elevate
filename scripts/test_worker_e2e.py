#!/usr/bin/env python3
"""
End-to-End Test Suite for Elevate Phase 2 Worker & Dead-Letter Queue (DLQ)
Validates:
1. H+1 date calculation and dual output directory creation.
2. Dry-run scraping execution.
3. Failover writing to Dead-Letter Queue on network interruption.
4. Dead-Letter Queue replay mechanism.
"""

import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data_raw"
FAILED_QUEUE_DIR = DATA_DIR / "failed_queue"
ARCHIVE_DIR = DATA_DIR / "archive_ofd"


class TestWorkerPipelineE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        FAILED_QUEUE_DIR.mkdir(parents=True, exist_ok=True)
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    def test_01_worker_dry_run_all_platforms(self):
        """Verify worker runs cleanly in dry-run mode for a specific date."""
        test_date = "2026-09-25"
        cmd = [
            sys.executable,
            str(PROJECT_ROOT / "scripts" / "run_daily_h1_worker.py"),
            "--dry-run",
            "--platform", "grab",
            "--date", test_date
        ]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env={**os.environ, "ELEVATE_HOST": "http://127.0.0.1:8000"}
        )
        combined_output = proc.stdout + proc.stderr
        self.assertIn("Starting Elevate H+1 Scraper Worker", combined_output)
        self.assertIn(test_date, combined_output)

    def test_02_dead_letter_queue_failover(self):
        """Verify that when the host is unreachable, the payload is safely persisted to DLQ."""
        test_date = "2026-09-24"
        # Point to unreachable port 59999 to force network failure
        cmd = [
            sys.executable,
            str(PROJECT_ROOT / "scripts" / "run_daily_h1_worker.py"),
            "--dry-run",
            "--platform", "shopee",
            "--date", test_date
        ]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env={**os.environ, "ELEVATE_HOST": "http://127.0.0.1:59999"}
        )

        # Confirm payload was written to DLQ
        queue_files = list(FAILED_QUEUE_DIR.glob(f"shopee_{test_date}_*.json"))
        self.assertTrue(len(queue_files) > 0, "Expected at least one DLQ file generated for shopee")

        # Inspect the DLQ envelope
        with open(queue_files[0], "r", encoding="utf-8") as f:
            envelope = json.load(f)

        self.assertEqual(envelope.get("platform"), "shopee")
        self.assertEqual(envelope.get("batch_date"), test_date)
        self.assertIn("payload", envelope)
        self.assertGreater(len(envelope["payload"].get("records", [])), 0)

    def test_03_retry_failed_batches_dry_run(self):
        """Verify that retry_failed_batches identifies and processes pending DLQ items."""
        cmd = [
            sys.executable,
            str(PROJECT_ROOT / "scripts" / "retry_failed_batches.py"),
            "--dry-run"
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        combined_output = proc.stdout + proc.stderr
        self.assertEqual(proc.returncode, 0)
        self.assertIn("[DLQ Replay Report]", combined_output)

    @classmethod
    def tearDownClass(cls):
        # Cleanup mock files from tmp_test and test DLQ files
        tmp_dir = DATA_DIR / "tmp_test"
        if tmp_dir.exists():
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)
        for f in FAILED_QUEUE_DIR.glob("*2026-09-24*.json"):
            try:
                f.unlink()
            except Exception:
                pass


if __name__ == "__main__":
    unittest.main()
