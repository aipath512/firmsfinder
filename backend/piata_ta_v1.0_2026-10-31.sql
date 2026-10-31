-- FirmsFinder: pagina Piața ta (INACTIVĂ în producție). Declarată în /angajament.json v1.1, cheia piata_ta.
-- Declarații ale vizitatorilor, nu fapte verificate. Nu se aplică în D1 până la lansarea paginii.
CREATE TABLE IF NOT EXISTS piata_relatii_declarate (
 relation_id TEXT PRIMARY KEY,
 schema_version TEXT NOT NULL DEFAULT '1.0',
 declared_at TEXT NOT NULL,
 relation_type TEXT NOT NULL CHECK(relation_type IN ('concurent_declarat','partener_declarat','client_potential_declarat')),
 source_domain TEXT NOT NULL,
 target_domain TEXT NOT NULL,
 url_storage_consent INTEGER NOT NULL CHECK(url_storage_consent=1),
 retention_until TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_piata_rel_target ON piata_relatii_declarate(target_domain, relation_type);
CREATE TABLE IF NOT EXISTS piata_contacte_confirmate (
 contact_id TEXT PRIMARY KEY,
 schema_version TEXT NOT NULL DEFAULT '1.0',
 confirmed_at TEXT NOT NULL,
 email TEXT NOT NULL,
 email_domain TEXT NOT NULL,
 last_activity_at TEXT NOT NULL,
 retention_until TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_piata_contact_ret ON piata_contacte_confirmate(retention_until);
