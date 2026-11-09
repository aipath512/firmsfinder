#!/usr/bin/env python3
"""Private GitHub Actions artifact -> Cloudflare Pages D1 import via GitHub OIDC."""
import csv
import json
import os
import urllib.parse
import urllib.request

path = "anaf-recovered/anaf-2026-4322-telefoane.csv"
with open(path, encoding="utf-8-sig", newline="") as f:
    records = [
        {"cui": int(r["cui"]), "telefon": r["telefon"].strip()}
        for r in csv.DictReader(f)
        if r.get("cui", "").isdigit() and r.get("telefon", "").strip()
    ]
if not records:
    raise SystemExit("No phone records in previously recovered ANAF artifact")
if len(records)>100:
    raise SystemExit("Batch too large")
oidc_url = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
separator = "&" if "?" in oidc_url else "?"
oidc_url += separator + urllib.parse.urlencode({"audience": "firmsfinder-anaf-import"})
req = urllib.request.Request(oidc_url, headers={
    "Authorization": "Bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"],
    "Accept": "application/json"})
with urllib.request.urlopen(req, timeout=30) as response:
    identity = json.load(response)["value"]
req = urllib.request.Request("https://firmsfinder.eu/api/scara/anaf-import",
    data=json.dumps({"records": records}).encode("utf-8"),method="POST",
    headers={"Authorization":"Bearer "+identity,
             "Content-Type":"application/json","Accept":"application/json"})
try:
    with urllib.request.urlopen(req, timeout=90) as response:
        result=json.load(response)
except urllib.error.HTTPError as e:
    print("IMPORT_HTTP_STATUS",e.code)
    print(e.read().decode("utf-8")[:250])
    raise
print("ANAF_D1_IMPORT=" + json.dumps(result, ensure_ascii=False))
if not result.get("complete") or result.get("persisted") != len(records):
    raise SystemExit("Import not confirmed in D1")
