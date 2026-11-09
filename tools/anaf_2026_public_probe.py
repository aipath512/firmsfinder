#!/usr/bin/env python3
"""Retrieve actual 2026-company phones from ANAF v9 without requiring Cloudflare admin access.
Initial bounded SCARA 4322 cohort, aggregate logs, CSV kept in GitHub Actions artifact.
"""
import csv
import datetime as dt
import json
import sys
import urllib.parse
import urllib.request

API = "https://firmsfinder.eu/api/companies/new"
ANAF = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"
LIMIT = 100

def get_json(url):
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "SCARA-ANAF-2026/1.0"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.load(resp)

def post_json(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"),
        headers={"content-type": "application/json", "accept": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.load(resp)

def main():
    # Diverse searches to avoid 50-row public endpoint limit. Each has current year 2026 built in.
    selectors = [
        {"caen": "4322", "judet": "Bucuresti"},
        {"caen": "4322", "judet": "Ilfov"},
        {"caen": "4322", "judet": "Cluj"},
        {"caen": "4322", "judet": "Iasi"},
        {"caen": "4322"}
    ]
    candidates = {}
    errors = []
    for params in selectors:
        try:
            data = get_json(API + "?" + urllib.parse.urlencode(params))
            if data.get("an_selectat") != 2026 or not isinstance(data.get("results"), list):
                errors.append("Invalid 2026 response for " + str(params)); continue
            for x in data["results"]:
                cui = x.get("cui")
                if isinstance(cui, int) and cui > 0 and str(x.get("data_inmatriculare","")).startswith("2026"):
                    candidates[cui] = {"cui": cui,"denumire": x.get("denumire",""),"judet": x.get("judet",""),
                                       "caen": "4322"}
                if len(candidates) >= LIMIT:
                    break
        except Exception as exc:
            errors.append(str(params) + ": " + type(exc).__name__ + " " + str(exc)[:80])
        if len(candidates) >= LIMIT:
            break
    payload = [{"cui": cui, "data": dt.datetime.now(dt.timezone.utc).date().isoformat()} for cui in candidates]
    if not payload:
        raise RuntimeError("No 2026 CUI candidates from public API; " + "; ".join(errors)[:400])
    result = post_json(ANAF, payload)
    if not isinstance(result, dict) or not isinstance(result.get("found"),list):
        raise RuntimeError("Invalid ANAF v9 response; no phones claimed")
    found = {}
    for item in result["found"]:
        g = item.get("date_generale") or {}
        if g.get("cui"):
            found[int(g["cui"])] = g
    rows = []
    for cui, meta in candidates.items():
        raw = str((found.get(cui) or {}).get("telefon") or "").strip()
        if raw and any(ch.isdigit() for ch in raw):
            rows.append({**meta,"telefon":raw,"sursa":"ANAF_v9","verificat":"nu",
                         "data_interogare": dt.datetime.now(dt.timezone.utc).date().isoformat()})
    with open("anaf-2026-4322-telefoane.csv","w",encoding="utf-8-sig",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=["cui","denumire","judet","caen","telefon","sursa","verificat","data_interogare"])
        writer.writeheader();writer.writerows(rows)
    summary={"status":"completed","year":2026,"caen":"4322",
             "cui_interogate":len(candidates),"telefoane_recuperate":len(rows),
             "fara_telefon_anaf":len(candidates)-len(rows),"erori_selectare":errors,
             "salvare":"CSV artifact; D1 pending token permission"}
    with open("anaf-2026-4322-report.json","w",encoding="utf-8") as f: json.dump(summary,f,indent=2,ensure_ascii=False)
    print("ANAF_PROBE_RESULT="+json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":
    try: main()
    except Exception as e:
        print("ANAF_PROBE_FAILED="+type(e).__name__+": "+str(e)[:350])
        sys.exit(1)
