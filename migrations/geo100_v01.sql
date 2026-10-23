-- GEO-100 pilot migration; not yet executed against Cloudflare D1.
CREATE TABLE IF NOT EXISTS geo100_questions (
 question_id TEXT PRIMARY KEY,
 question_text TEXT NOT NULL,
 origin TEXT CHECK (origin IN ('SITE','AI') OR origin IS NULL),
 funnel TEXT CHECK (funnel IN ('TOFU','MOFU','BOFU') OR funnel IS NULL),
 intent_ref TEXT,
 registry_version TEXT NOT NULL,
 created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS geo100_answers (
 answer_id TEXT PRIMARY KEY,
 question_id TEXT NOT NULL REFERENCES geo100_questions(question_id),
 phase TEXT NOT NULL CHECK (phase IN ('BEFORE','AFTER')),
 provider TEXT NOT NULL CHECK (provider IN ('ChatGPT','Gemini','Claude')),
 model TEXT,
 answer_text TEXT NOT NULL,
 asked_at_utc TEXT NOT NULL,
 received_at_utc TEXT NOT NULL,
 saved_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 run_id TEXT NOT NULL UNIQUE,
 raw_r2_key TEXT,
 raw_sha256 TEXT
);
CREATE INDEX IF NOT EXISTS idx_geo100_answers_history
 ON geo100_answers(question_id,provider,phase,asked_at_utc);
