-- FirmsFinder Market Intent Events v1.1 (2026-10-16). Înlocuiește market_intent_events_v1.sql (rămâne ca istoric).
-- Nu conține IP, email, user-agent sau identificatori de cont. Nu este o declarație de anonimizare GDPR.
-- Regulă impusă de bază: fără acord (consent_state='not_required') coloanele „cu_acord” trebuie să fie NULL / '{}'.
-- Nu se migrează în producție înainte de validarea juridică a textului public și aprobarea dumneavoastră.
-- Ștergerea expirărilor nu este automată în D1: o face endpointul (periodic) sau un Worker programat.
CREATE TABLE IF NOT EXISTS market_intent_events (
 event_id TEXT PRIMARY KEY,
 schema_version TEXT NOT NULL DEFAULT '1.1' CHECK(schema_version='1.1'),
 occurred_at TEXT NOT NULL,
 site TEXT NOT NULL DEFAULT 'firmsfinder',
 event_type TEXT NOT NULL CHECK(event_type IN ('search_completed','zero_results','result_clicked','recovery_action_clicked','export_requested','search_saved','market_panel_opened','service_clicked','filter_changed','objective_selected','question_selected','search_error')),
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
 zero_result_context TEXT CHECK(zero_result_context IN ('text_only','filters_only','text_and_filters','unknown')),
 target_kind TEXT,
 target_value TEXT,
 source_page TEXT NOT NULL DEFAULT '/cautare/',
 referrer_host TEXT,
 utm TEXT,
 sanitization_version TEXT NOT NULL,
 consent_state TEXT NOT NULL CHECK(consent_state IN ('granted','not_required')),
 retention_until TEXT NOT NULL,
 CHECK(result_count IS NULL OR result_count>=0),
 CHECK(zero_result_context IS NULL OR event_type='zero_results'),
 CHECK(consent_state='granted' OR (session_id IS NULL AND query_raw IS NULL AND query_norm IS NULL AND intent_family IS NULL AND funnel_stage IS NULL AND objective IS NULL AND target_role IS NULL AND localitate IS NULL AND size_min IS NULL AND size_max IS NULL AND filters_json='{}'))
);
CREATE INDEX IF NOT EXISTS idx_mie_date ON market_intent_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_mie_caen_judet ON market_intent_events(caen,judet,occurred_at);
CREATE INDEX IF NOT EXISTS idx_mie_type ON market_intent_events(event_type,occurred_at);
CREATE INDEX IF NOT EXISTS idx_mie_retention ON market_intent_events(retention_until);
CREATE INDEX IF NOT EXISTS idx_mie_session ON market_intent_events(session_id) WHERE session_id IS NOT NULL;
