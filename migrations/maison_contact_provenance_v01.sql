-- MAISON: source provenance for phone, email, website and other firm attributes.
-- Additive migration: does not change existing tables or backfill unknown sources.
CREATE TABLE IF NOT EXISTS maison_contact_provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cui INTEGER NOT NULL,
  field_name TEXT NOT NULL CHECK(field_name IN ('phone','email','website','other')),
  field_value TEXT NOT NULL,
  origin TEXT DEFAULT NULL,          -- NULL = ANAF (legacy/default); explicit values e.g. ALTEX, COMPANY_WEBSITE
  source_url TEXT,                  -- exact evidence URL where available
  source_recorded_at TEXT,          -- timestamp explicitly published by source, if known
  collected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  verified_at TEXT,                 -- last independently checked at source
  verification_status TEXT NOT NULL DEFAULT 'candidate'
    CHECK(verification_status IN ('candidate','verified','rejected')),
  UNIQUE(cui,field_name,field_value,origin,source_url)
);
CREATE INDEX IF NOT EXISTS idx_maison_provenance_cui_field
  ON maison_contact_provenance(cui,field_name);
CREATE INDEX IF NOT EXISTS idx_maison_provenance_origin
  ON maison_contact_provenance(origin,collected_at);
