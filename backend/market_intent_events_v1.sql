-- FirmsFinder Market Intent Observations v1.0 (schema freeze candidate)
-- No IP, email, user-agent or account identifiers. Not a claim of GDPR anonymity.
-- Run migration only after review; this file does not migrate production.
CREATE TABLE IF NOT EXISTS market_intent_events (
 event_id TEXT PRIMARY KEY,
 schema_version INTEGER NOT NULL DEFAULT 1 CHECK(schema_version=1),
 occurred_at TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK(event_type IN ('search_completed','result_clicked','filter_changed','objective_selected','question_selected','zero_results','search_error')),
 session_id TEXT,
 query_raw TEXT,
 query_norm TEXT,
 intent_family TEXT,
 funnel_stage TEXT,
 objective TEXT,
 target_role TEXT,
 caen TEXT,
 judet TEXT,
 localitate TEXT,
 size_min INTEGER,
 size_max INTEGER,
 filters_json TEXT NOT NULL DEFAULT '{}',
 result_count INTEGER,
 result_count_scope TEXT CHECK(result_count_scope IN ('page','total','unknown')),
 target_kind TEXT,
 target_value TEXT,
 source_page TEXT NOT NULL DEFAULT '/cautare/',
 sanitization_version TEXT NOT NULL,
 consent_state TEXT NOT NULL CHECK(consent_state IN ('granted','not_required')),
 retention_until TEXT NOT NULL,
 CHECK(result_count IS NULL OR result_count>=0)
);
CREATE INDEX IF NOT EXISTS idx_market_intent_date ON market_intent_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_market_intent_caen_judet ON market_intent_events(caen,judet,occurred_at);
CREATE INDEX IF NOT EXISTS idx_market_intent_objective ON market_intent_events(objective,event_type,occurred_at);
CREATE INDEX IF NOT EXISTS idx_market_intent_retention ON market_intent_events(retention_until);
-- Delete expired records with scheduled Worker; never assume D1 performs TTL automatically.
