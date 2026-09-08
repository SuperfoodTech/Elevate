-- Manual business grouping output consumed by Elevate.
-- This is not an auto-matching table: each row is accepted from the
-- published grouping spreadsheet as the current grouping decision.

CREATE SCHEMA IF NOT EXISTS layer3_dim;

CREATE TABLE IF NOT EXISTS layer3_dim.business_grouping_imports (
    import_id BIGSERIAL PRIMARY KEY,
    source_url TEXT NOT NULL,
    source_hash TEXT NOT NULL UNIQUE,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('SCHEDULED', 'MANUAL')),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    row_count INTEGER NOT NULL DEFAULT 0,
    relationship_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    error_message TEXT,
    UNIQUE (source_url, source_hash)
);

CREATE TABLE IF NOT EXISTS layer3_dim.business_grouping_relationships (
    relationship_id BIGSERIAL PRIMARY KEY,
    import_id BIGINT NOT NULL REFERENCES layer3_dim.business_grouping_imports(import_id),
    source_row_number INTEGER NOT NULL,
    owner_name TEXT,
    agency_outlet_name TEXT,
    vb_brand_name TEXT,
    relationship_type TEXT NOT NULL CHECK (
        relationship_type IN ('AGENCY_ONLY', 'VB_ONLY', 'HYBRID', 'UNCLASSIFIED')
    ),
    mapping_status TEXT NOT NULL DEFAULT 'VALID' CHECK (
        mapping_status IN ('VALID', 'PENDING_REVIEW')
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_row_hash TEXT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (import_id, source_row_number, vb_brand_name)
);

CREATE INDEX IF NOT EXISTS idx_grouping_relationship_active
    ON layer3_dim.business_grouping_relationships (is_active);
CREATE INDEX IF NOT EXISTS idx_grouping_relationship_owner
    ON layer3_dim.business_grouping_relationships (owner_name);
CREATE INDEX IF NOT EXISTS idx_grouping_relationship_agency
    ON layer3_dim.business_grouping_relationships (agency_outlet_name);
CREATE INDEX IF NOT EXISTS idx_grouping_relationship_vb
    ON layer3_dim.business_grouping_relationships (vb_brand_name);

CREATE OR REPLACE VIEW layer3_dim.v_current_business_grouping AS
SELECT
    r.relationship_id,
    r.import_id,
    r.source_row_number,
    r.owner_name,
    r.agency_outlet_name,
    r.vb_brand_name,
    r.relationship_type,
    r.mapping_status,
    r.imported_at
FROM layer3_dim.business_grouping_relationships r
WHERE r.is_active = TRUE;
