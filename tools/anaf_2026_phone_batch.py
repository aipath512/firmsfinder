#!/usr/bin/env python3
"""ANAF 2026 phone + profile enrichment — v2.0 (2026-11-11).

What changed from v1 (100 CUI per manual run, phones only):
  * 500 CUI per ANAF request (documented limit), several requests per run, 1 request/s.
  * Priority pass first: CAEN 4322 + București (SCARA pilot), then the national 2026 cursor.
  * Also stores the ANAF address and principal CAEN in a new additive table
    scara_anaf_2026_profil (no change to ONRC tables or to existing contact rows).
  * Multi-row inserts (fewer D1 API calls). Idempotent: UPSERT by CUI.
  * Window = firms registered in the last 12 months versus the current month
    (Nov 2026 -> 2025-11-01 .. 2026-12-01), walked on the date index with a
    (date, CUI) cursor, so no full-table scan.
  * Table names keep the historical '2026' suffix; they hold the rolling window.

Source: ANAF public VAT registry v9 (no authentication). No scraping.
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.request

YEAR = 2026
ANAF_BATCH = 500                                   # ANAF documented maximum per request
MAX_REQUESTS = int(os.environ.get("MAX_REQUESTS", "20"))   # 20 x 500 = 10.000 CUI per run
PRIORITY_CAEN = os.environ.get("PRIORITY_CAEN", "4322").strip()
PRIORITY_JUDET = os.environ.get("PRIORITY_JUDET", "București").strip()
def window12():
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=2)))
    y, m = now.year, now.month
    ny, nm = (y + 1, 1) if m == 12 else (y, m + 1)
    return "%d-%02d-01" % (y - 1, m), "%d-%02d-01" % (ny, nm)


SOURCE_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"
ACCOUNT = os.environ.get("CF_ACCOUNT_ID") or os.environ.get("CLOUDFLARE_ACCOUNT_ID")
DATABASE = os.environ.get("CF_D1_DATABASE_ID")
TOKEN = os.environ.get("CF_D1_WRITE_TOKEN") or os.environ.get("CLOUDFLARE_API_TOKEN")


def request_json(url, payload, token=None, timeout=60):
    headers = {"content-type": "application/json", "accept": "application/json",
               "user-agent": "AiVenture-FirmsFinder-ANAF/2.0"}
    if token:
        headers["authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"),
                                 headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def d1(sql, params=()):
    url = "https://api.cloudflare.com/client/v4/accounts/%s/d1/database/%s/query" % (ACCOUNT, DATABASE)
    response = request_json(url, {"sql": sql, "params": list(params)}, TOKEN)
    if response.get("success") is not True or not response.get("result"):
        raise RuntimeError("D1 query failed: " + json.dumps(response.get("errors", []))[:300])
    part = response["result"][0]
    if part.get("success") is False:
        raise RuntimeError("D1 statement failed: " + json.dumps(part.get("error", "unknown"))[:200])
    return part.get("results", [])


def d1_upsert(table, columns, rows, conflict_update):
    """Multi-row UPSERT; D1 allows max 100 bound parameters per statement."""
    if not rows:
        return
    per = max(1, 99 // len(columns))
    for i in range(0, len(rows), per):
        chunk = rows[i:i + per]
        values = ",".join("(" + ",".join("?" * len(columns)) + ")" for _ in chunk)
        params = [v for row in chunk for v in row]
        d1("INSERT INTO %s (%s) VALUES %s ON CONFLICT(cui) DO UPDATE SET %s"
           % (table, ",".join(columns), values, conflict_update), params)


def report(status, **stats):
    data = {"status": status, "year": YEAR, "version": "2.0", **stats}
    print("ANAF_2026_BATCH=" + json.dumps(data, ensure_ascii=False))
    # Visible in the public run annotations (no secrets, no CUI or phone numbers).
    level = "error" if status == "failed" else "notice"
    print("::%s title=ANAF robot %s::%s" % (level, status, json.dumps(data, ensure_ascii=False)[:900]))
    with open("anaf-2026-batch-report.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def resolve_database():
    global DATABASE
    if DATABASE:
        return
    url = "https://api.cloudflare.com/client/v4/accounts/%s/d1/database?per_page=100" % ACCOUNT
    req = urllib.request.Request(url, headers={"authorization": "Bearer " + TOKEN,
                                               "accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as response:
        listing = json.load(response)
    if listing.get("success") is not True:
        raise RuntimeError("D1 inventory API unavailable: " + json.dumps(listing.get("errors", []))[:220])
    matches = [x for x in (listing.get("result") or []) if x.get("name") == "b2b-romania-db"]
    if len(matches) != 1:
        raise RuntimeError("Expected exactly one D1 database named b2b-romania-db, got %s" % len(matches))
    DATABASE = matches[0].get("uuid") or matches[0].get("id")
    if not DATABASE:
        raise RuntimeError("D1 database listing had no UUID")
    print("D1 target name verified: b2b-romania-db")


def ensure_tables():
    d1("""CREATE TABLE IF NOT EXISTS scara_anaf_2026_phone (
        cui INTEGER PRIMARY KEY,
        telefon_raw TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'ANAF_v9',
        queried_at TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0
    )""")
    d1("""CREATE TABLE IF NOT EXISTS scara_anaf_progress_12m (
        id TEXT PRIMARY KEY,
        last_date TEXT NOT NULL,
        last_cui INTEGER NOT NULL DEFAULT 0,
        last_run_at TEXT NOT NULL
    )""")
    # Every queried CUI gets one profile row (also when ANAF has no phone),
    # so the priority pass never asks ANAF twice for the same firm.
    d1("""CREATE TABLE IF NOT EXISTS scara_anaf_2026_profil (
        cui INTEGER PRIMARY KEY,
        adresa TEXT,
        caen_anaf TEXT,
        stare_anaf TEXT,
        are_telefon INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'ANAF_v9',
        queried_at TEXT NOT NULL
    )""")


def query_anaf(cuis):
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    data = request_json(SOURCE_URL, [{"cui": c, "data": today} for c in cuis], timeout=90)
    if not isinstance(data, dict) or not isinstance(data.get("found"), list):
        raise RuntimeError("Unexpected ANAF JSON response")
    found = {}
    for item in data["found"]:
        general = item.get("date_generale") or {}
        if general.get("cui") is not None:
            found[int(general["cui"])] = general
    return found


def store(cuis, found):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    phones, profiles = [], []
    for cui in cuis:
        g = found.get(cui) or {}
        raw = str(g.get("telefon") or "").strip()
        has_phone = bool(raw) and any(ch.isdigit() for ch in raw)
        if has_phone:
            phones.append((cui, raw, "ANAF_v9", now, 0))
        profiles.append((cui, str(g.get("adresa") or "").strip() or None,
                         str(g.get("cod_CAEN") or "").strip() or None,
                         str(g.get("stare_inregistrare") or "").strip() or None,
                         1 if has_phone else 0, "ANAF_v9", now))
    d1_upsert("scara_anaf_2026_phone",
              ["cui", "telefon_raw", "source", "queried_at", "verified"], phones,
              "telefon_raw=excluded.telefon_raw, queried_at=excluded.queried_at")
    d1_upsert("scara_anaf_2026_profil",
              ["cui", "adresa", "caen_anaf", "stare_anaf", "are_telefon", "source", "queried_at"], profiles,
              "adresa=excluded.adresa, caen_anaf=excluded.caen_anaf, stare_anaf=excluded.stare_anaf, "
              "are_telefon=excluded.are_telefon, queried_at=excluded.queried_at")
    return len(phones)


def priority_candidates(limit):
    """SCARA pilot first: 2026 legal entities with the priority CAEN in the given county,
    not yet queried. Same correlated CAEN filter as /api/companies/new."""
    if not (PRIORITY_CAEN and PRIORITY_JUDET):
        return []
    rows = d1("""SELECT f.cui FROM onrc_firme f INDEXED BY ix_onrc_firme_data
        WHERE f.top=1 AND COALESCE(f.persoana_fizica,0)=0 AND f.cui IS NOT NULL
          AND f.data_inmatriculare>=? AND f.data_inmatriculare<? AND f.judet=?
          AND EXISTS (SELECT 1 FROM onrc_firma_caen fc WHERE fc.cod_inmatriculare=f.cod_inmatriculare
                      AND (',' || REPLACE(fc.caen,' ','') || ',') LIKE ?)
          AND NOT EXISTS (SELECT 1 FROM scara_anaf_2026_profil p WHERE p.cui=f.cui)
        LIMIT ?""",
        (*window12(), PRIORITY_JUDET,
         "%," + PRIORITY_CAEN + ":%", limit))
    return sorted({int(r["cui"]) for r in rows if r.get("cui")})


def national_candidates(last_date, last_cui, limit):
    start, end = window12()
    rows = d1("""SELECT cui, data_inmatriculare FROM onrc_firme INDEXED BY ix_onrc_firme_data
        WHERE top=1 AND COALESCE(persoana_fizica,0)=0 AND cui IS NOT NULL
          AND data_inmatriculare>=? AND data_inmatriculare<?
          AND (data_inmatriculare>? OR (data_inmatriculare=? AND cui>?))
        ORDER BY data_inmatriculare, cui LIMIT ?""",
        (start, end, last_date, last_date, last_cui, limit))
    return [(int(r["cui"]), r["data_inmatriculare"]) for r in rows if r.get("cui")]


def main():
    if not (ACCOUNT and TOKEN):
        raise RuntimeError("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN")
    resolve_database()
    ensure_tables()
    stats = {"priority_processed": 0, "priority_with_phone": 0,
             "national_processed": 0, "national_with_phone": 0, "requests": 0}

    # Pass 1 — SCARA priority set.
    pending = priority_candidates(ANAF_BATCH * MAX_REQUESTS)
    for i in range(0, len(pending), ANAF_BATCH):
        if stats["requests"] >= MAX_REQUESTS:
            break
        chunk = pending[i:i + ANAF_BATCH]
        found = query_anaf(chunk)
        stats["requests"] += 1
        stats["priority_processed"] += len(chunk)
        stats["priority_with_phone"] += store(chunk, found)
        time.sleep(1.2)

    # Pass 2 — national 2026 cursor with the remaining request budget.
    start, _ = window12()
    rows = d1("SELECT last_date, last_cui FROM scara_anaf_progress_12m WHERE id='national'")
    last_date, last = (rows[0]["last_date"], int(rows[0]["last_cui"])) if rows else ("0000-00-00", 0)
    if last_date < start:
        last_date, last = "0000-00-00", 0
    while stats["requests"] < MAX_REQUESTS:
        batch = national_candidates(last_date, last, ANAF_BATCH)
        if not batch:
            break
        chunk = [c for c, _ in batch]
        found = query_anaf(chunk)
        stats["requests"] += 1
        stats["national_processed"] += len(chunk)
        stats["national_with_phone"] += store(chunk, found)
        last, last_date = batch[-1][0], batch[-1][1]
        # Cursor moves only after the rows are written (write first, move last).
        d1("""INSERT INTO scara_anaf_progress_12m(id,last_date,last_cui,last_run_at)
              VALUES('national',?,?,?) ON CONFLICT(id) DO UPDATE SET last_date=excluded.last_date,
              last_cui=excluded.last_cui,last_run_at=excluded.last_run_at""",
           (last_date, last, dt.datetime.now(dt.timezone.utc).isoformat()))
        time.sleep(1.2)

    status = "batch_completed" if stats["requests"] else "complete"
    report(status, last_cui=last, last_date=last_date, window=window12(), source="ANAF_v9", verified_required=False,
           priority={"caen": PRIORITY_CAEN, "judet": PRIORITY_JUDET}, **stats)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, urllib.error.URLError, TimeoutError) as err:
        report("failed", error=type(err).__name__ + ": " + str(err)[:240])
        sys.exit(1)
