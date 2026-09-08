"""Apply and refresh the authoritative Agency weekly settlement views."""

import argparse
import os
import sys

from sqlalchemy import create_engine, text

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "src"))

from config import get_db_url  # noqa: E402


RULES_SQL = os.path.join(os.path.dirname(__file__), "agency_settlement_rules.sql")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply-rules", action="store_true")
    args = parser.parse_args()

    engine = create_engine(get_db_url())
    with engine.begin() as conn:
        if args.apply_rules:
            with open(RULES_SQL, "r", encoding="utf-8") as handle:
                conn.execute(text(handle.read()))
        conn.execute(text("SELECT layer3_dim.refresh_agency_settlements()"))
        result = conn.execute(text("""
            SELECT COUNT(*) AS reports,
                   COUNT(*) FILTER (WHERE settlement_status = 'READY') AS ready,
                   COUNT(*) FILTER (WHERE settlement_status = 'NEED_REVIEW') AS need_review
            FROM layer3_dim.mv_agency_settlement_owner
        """)).mappings().one()
    print(dict(result))


if __name__ == "__main__":
    main()
