-- Indexed CUI lookups for contact enrichment in 2026 Firme noi.
-- Existing contact table currently has no indexes; repeated IN lookups scan it.
-- Add only the missing small contact index, not a new multi-million-row ONRC index.
CREATE INDEX IF NOT EXISTS ix_firme_site_cui ON firme_site(cui);
