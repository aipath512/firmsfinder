#!/usr/bin/env python3
"""One bounded, idempotent ANAF 2026 phone-enrichment batch. D1 + ANAF, no scraping."""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

YEAR = 2026
BATCH_SIZE = 100
SOURCE_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"
ACCOUNT = os.environ.get("CF_ACCOUNT_ID") or os.environ.get("CLOUDFLARE_ACCOUNT_ID")
DATABASE = os.environ.get("CF_D1_DATABASE_ID")
TOKEN = os.environ.get("CF_D1_WRITE_TOKEN") or os.environ.get("CLOUDFLARE_API_TOKEN")

def request_json(url, payload, token=None):
    headers = {"content-type": "application/json", "accept": "application/json"}
    if token:
        headers["authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=45) as response:
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

def report(status, **stats):
    data = {"status": status, "year": YEAR, **stats}
    print("ANAF_2026_BATCH=" + json.dumps(data, ensure_ascii=False))
    with open("anaf-2026-batch-report.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    global DATABASE
    if not (ACCOUNT and TOKEN):
        raise RuntimeError("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN")
    if not DATABASE:
        url = "https://api.cloudflare.com/client/v4/accounts/%s/d1/database?per_page=100" % ACCOUNT
        req = urllib.request.Request(url, headers={
            "authorization": "Bearer " + TOKEN, "accept": "application/json"
        })
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
    # State and phone tables are additive; no alteration of ONRC or existing contact records.
    d1("""CREATE TABLE IF NOT EXISTS scara_anaf_2026_phone (
        cui INTEGER PRIMARY KEY,
        telefon_raw TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'ANAF_v9',
        queried_at TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0
    )""")
    d1("""CREATE TABLE IF NOT EXISTS scara_anaf_2026_progress (
        year INTEGER PRIMARY KEY,
        last_cui INTEGER NOT NULL DEFAULT 0,
        last_run_at TEXT NOT NULL
    )""")
    last_rows = d1("SELECT last_cui FROM scara_anaf_2026_progress WHERE year=?", (YEAR,))
    last = int(last_rows[0]["last_cui"]) if last_rows else 0
    # Bound the D1 candidate scan to 100. Do NOT load 1.7m companies in memory.
    companies = d1("""SELECT DISTINCT cui FROM onrc_firme
        WHERE top=1 AND persoana_fizica=0 AND cui IS NOT NULL
          AND data_inmatriculare>=? AND data_inmatriculare<?
          AND cui>? ORDER BY cui LIMIT ?""",
        ("%s-01-01" % YEAR, "%s-01-01" % (YEAR+1), last, BATCH_SIZE))
    cuis = [int(x["cui"]) for x in companies if x.get("cui")]
    if not cuis:
        report("complete", processed=0, with_phone=0, last_cui=last)
        return
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    data = request_json(SOURCE_URL, [{"cui": cui, "data": today} for cui in cuis])
    if not isinstance(data, dict) or not isinstance(data.get("found"), list):
        raise RuntimeError("Unexpected ANAF JSON response; cursor not advanced")
    found = {}
    for item in data["found"]:
        general = item.get("date_generale") or {}
        if general.get("cui") is not None:
            found[int(general["cui"])] = general
    phone_rows = []
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    for cui in cuis:
        raw = str((found.get(cui) or {}).get("telefon") or "").strip()
        if raw and any(ch.isdigit() for ch in raw):
            phone_rows.append((cui, raw, now))
    # Write first, move cursor last. Repeated attempts are safe (UPSERT by CUI).
    for cui, phone, queried_at in phone_rows:
        d1("""INSERT INTO scara_anaf_2026_phone (cui, telefon_raw, source, queried_at, verified)
              VALUES (?, ?, 'ANAF_v9', ?, 0)
              ON CONFLICT(cui) DO UPDATE SET
                telefon_raw=excluded.telefon_raw, queried_at=excluded.queried_at""",
           (cui, phone, queried_at))
    next_cursor = max(cuis)
    d1("""INSERT INTO scara_anaf_2026_progress(year,last_cui,last_run_at)
          VALUES(?,?,?) ON CONFLICT(year) DO UPDATE SET
          last_cui=excluded.last_cui,last_run_at=excluded.last_run_at""",
        (YEAR, next_cursor, now))
    report("batch_completed", processed=len(cuis), with_phone=len(phone_rows),
           without_phone=len(cuis)-len(phone_rows), last_cui=next_cursor,
           source="ANAF_v9", verified_required=False)
if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, urllib.error.URLError, TimeoutError) as err:
        report("failed", error=type(err).__name__ + ": " + str(err)[:240])
        sys.exit(1)
