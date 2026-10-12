-- New extension tables only. Does not modify ONRC/MF or exclusions.
CREATE TABLE IF NOT EXISTS ff_imports(dataset TEXT NOT NULL,version TEXT NOT NULL,source_url TEXT,imported_at TEXT NOT NULL,license TEXT,status TEXT NOT NULL CHECK(status IN ('successful','failed')),PRIMARY KEY(dataset,version));
CREATE TABLE IF NOT EXISTS ff_services(id TEXT PRIMARY KEY,cui INTEGER NOT NULL,name TEXT NOT NULL,description TEXT,source_url TEXT,observed_at TEXT,status TEXT NOT NULL CHECK(status IN ('draft','documented','withdrawn')));
CREATE INDEX IF NOT EXISTS ff_services_cui ON ff_services(cui,status);
CREATE TABLE IF NOT EXISTS ff_rate(actor TEXT NOT NULL,bucket INTEGER NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(actor,bucket));
CREATE TABLE IF NOT EXISTS ff_tasks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,created_at TEXT NOT NULL,task TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ff_audit(id TEXT PRIMARY KEY,owner TEXT NOT NULL,operation TEXT NOT NULL,task_id TEXT,at TEXT NOT NULL,version TEXT NOT NULL,result_sha256 TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ff_contact(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new');
CREATE INDEX IF NOT EXISTS ff_tasks_owner ON ff_tasks(owner,created_at);
CREATE INDEX IF NOT EXISTS ff_audit_at ON ff_audit(at);
