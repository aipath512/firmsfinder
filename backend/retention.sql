-- Run daily after operational retention approval; these remove extension history only.
DELETE FROM ff_rate WHERE bucket < CAST(strftime('%s','now') AS INTEGER)/60 - 5;
DELETE FROM ff_tasks WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day');
DELETE FROM ff_audit WHERE at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days');
DELETE FROM ff_contact WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days') AND status='closed';
