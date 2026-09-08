"""Sync the published manual Agency/VB grouping into PostgreSQL.

The spreadsheet is the authoritative grouping result. This module deliberately
does not fuzzy-match, infer, or rewrite outlet/brand names.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import os
import sys
from dataclasses import dataclass
from typing import Any

import pandas as pd
import requests
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layer1_db_manager import DatabaseManager


GROUPING_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vQ3tLKBNXDqRgBw0mNhKZFxgvKx-JoiTDzm_s5Ix1cm7O6HCv4IvExOLR2HSRVaXSsx82V348mcr9X4/"
    "pub?gid=1789910144&single=true&output=csv"
)

EXPECTED_COLUMNS = ["Owner", "Nama Outlet Agency", "Nama Outlet VB"]


@dataclass(frozen=True)
class GroupingRelationship:
    source_row_number: int
    owner_name: str | None
    agency_outlet_name: str | None
    vb_brand_name: str | None
    relationship_type: str
    mapping_status: str
    source_row_hash: str


def _clean(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    value = str(value).strip()
    return value or None


def _relationship_type(agency: str | None, vb: str | None) -> str:
    if agency and vb:
        return "HYBRID"
    if agency:
        return "AGENCY_ONLY"
    if vb:
        return "VB_ONLY"
    return "UNCLASSIFIED"


def _mapping_status(owner: str | None, agency: str | None, vb: str | None) -> str:
    return "VALID" if owner and (agency or vb) else "PENDING_REVIEW"


def parse_grouping_csv(csv_bytes: bytes) -> tuple[pd.DataFrame, list[GroupingRelationship], str]:
    """Parse and expand the approved grouping CSV without auto-matching."""
    source_hash = hashlib.sha256(csv_bytes).hexdigest()
    df = pd.read_csv(io.BytesIO(csv_bytes), dtype=str, keep_default_na=False)
    missing = [column for column in EXPECTED_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"Grouping CSV missing required columns: {', '.join(missing)}")

    source_df = df[EXPECTED_COLUMNS].copy()
    relationships: list[GroupingRelationship] = []
    for source_index, row in source_df.iterrows():
        owner = _clean(row["Owner"])
        agency = _clean(row["Nama Outlet Agency"])
        vb_cell = _clean(row["Nama Outlet VB"])
        vb_names = [part.strip() for part in vb_cell.split("|") if part.strip()] if vb_cell else [None]

        for vb in vb_names:
            relationship = _relationship_type(agency, vb)
            mapping_status = _mapping_status(owner, agency, vb)
            fingerprint = "|".join(
                [owner or "", agency or "", vb or "", relationship, mapping_status]
            )
            relationships.append(
                GroupingRelationship(
                    source_row_number=source_index + 2,  # header is row 1
                    owner_name=owner,
                    agency_outlet_name=agency,
                    vb_brand_name=vb,
                    relationship_type=relationship,
                    mapping_status=mapping_status,
                    source_row_hash=hashlib.sha256(fingerprint.encode("utf-8")).hexdigest(),
                )
            )
    return source_df, relationships, source_hash


def _ensure_schema(conn) -> None:
    schema_path = os.path.join(os.path.dirname(__file__), "init_business_grouping.sql")
    with open(schema_path, encoding="utf-8") as schema_file:
        conn.execute(text(schema_file.read()))


def fetch_grouping_csv(url: str = GROUPING_CSV_URL, timeout: int = 30) -> bytes:
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    if not response.content:
        raise ValueError("Grouping CSV response was empty")
    return response.content


def sync_business_grouping(
    *,
    url: str = GROUPING_CSV_URL,
    trigger_type: str = "MANUAL",
    csv_bytes: bytes | None = None,
) -> dict[str, Any]:
    if trigger_type not in {"MANUAL", "SCHEDULED"}:
        raise ValueError("trigger_type must be MANUAL or SCHEDULED")

    payload = csv_bytes if csv_bytes is not None else fetch_grouping_csv(url)
    source_df, relationships, source_hash = parse_grouping_csv(payload)
    if not relationships:
        raise ValueError("Grouping CSV contains no data rows")

    db = DatabaseManager()
    with db.engine.begin() as conn:
        conn.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:lock_name))"),
            {"lock_name": "sync:business-grouping"},
        )
        _ensure_schema(conn)

        existing = conn.execute(
            text("""
                SELECT import_id, row_count, relationship_count
                FROM layer3_dim.business_grouping_imports
                WHERE source_url = :source_url AND source_hash = :source_hash
            """),
            {"source_url": url, "source_hash": source_hash},
        ).mappings().first()
        if existing:
            return {
                "status": "already_synced",
                "import_id": existing["import_id"],
                "rows_read": existing["row_count"],
                "relationships_inserted": 0,
                "relationships_skipped": existing["relationship_count"],
            }

        import_id = conn.execute(
            text("""
                INSERT INTO layer3_dim.business_grouping_imports
                    (source_url, source_hash, trigger_type, row_count, relationship_count)
                VALUES (:source_url, :source_hash, :trigger_type, :row_count, :relationship_count)
                RETURNING import_id
            """),
            {
                "source_url": url,
                "source_hash": source_hash,
                "trigger_type": trigger_type,
                "row_count": len(source_df),
                "relationship_count": len(relationships),
            },
        ).scalar_one()

        conn.execute(
            text("UPDATE layer3_dim.business_grouping_relationships SET is_active = FALSE WHERE is_active = TRUE")
        )

        inserted = 0
        for relationship in relationships:
            conn.execute(
                text("""
                    INSERT INTO layer3_dim.business_grouping_relationships
                        (import_id, source_row_number, owner_name, agency_outlet_name,
                         vb_brand_name, relationship_type, mapping_status, source_row_hash)
                    VALUES
                        (:import_id, :source_row_number, :owner_name, :agency_outlet_name,
                         :vb_brand_name, :relationship_type, :mapping_status, :source_row_hash)
                    ON CONFLICT (import_id, source_row_number, vb_brand_name) DO NOTHING
                """),
                {
                    "import_id": import_id,
                    "source_row_number": relationship.source_row_number,
                    "owner_name": relationship.owner_name,
                    "agency_outlet_name": relationship.agency_outlet_name,
                    "vb_brand_name": relationship.vb_brand_name,
                    "relationship_type": relationship.relationship_type,
                    "mapping_status": relationship.mapping_status,
                    "source_row_hash": relationship.source_row_hash,
                },
            )
            inserted += 1

    return {
        "status": "synced",
        "import_id": import_id,
        "rows_read": len(source_df),
        "relationships_inserted": inserted,
        "relationships_skipped": len(relationships) - inserted,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync approved Agency/VB grouping CSV")
    parser.add_argument("--url", default=GROUPING_CSV_URL)
    parser.add_argument("--trigger", choices=["MANUAL", "SCHEDULED"], default="MANUAL")
    args = parser.parse_args()
    print(sync_business_grouping(url=args.url, trigger_type=args.trigger))


if __name__ == "__main__":
    main()
