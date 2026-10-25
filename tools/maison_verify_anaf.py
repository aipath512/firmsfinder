#!/usr/bin/env python3
"""Verify nine MAISON candidate business phones against ANAF v9. No D1 writes."""
import csv
import datetime
import json
import urllib.request
from pathlib import Path

CANDIDATES = [
    (54542434, "01 PRIMEGAZ SOLUTIONS S.R.L.", "0760144744"),
    (55469625, "11 O'CLOCK TECHNOLOGIES S.R.L.", "+37368755068"),
    (54560643, "22 AUTO SERVICE S.R.L.", "0741967644"),
    (53897803, "1000 YEARS OLD S.R.L.", "0723523700"),
    (54150023, "1001 DANCES S.R.L.", "+40746190133"),
    (54871259, "101 AGENCY S.R.L.", "0760721551"),
    (55343758, "187DEF S.R.L.", "0750474241"),
    (53367130, "2 BROTHERS BY ONIGA S.R.L.", "0752820815"),
    (54250537, "24CONSTRUCT S.R.L.", "0750666531"),
]
URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"

def normalized(phone):
    digits = "".join(c for c in str(phone or "") if c.isdigit())
    if digits.startswith("0040"):
        return "0" + digits[4:]
    if digits.startswith("40") and len(digits) == 11:
        return "0" + digits[2:]
    return digits

payload = [{"cui": cui, "data": datetime.date.today().isoformat()} for cui, _, _ in CANDIDATES]
request = urllib.request.Request(
    URL, data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}, method="POST"
)
try:
    with urllib.request.urlopen(request, timeout=35) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}")
        data = json.load(response)
except Exception as exc:
    raise SystemExit(f"ANAF NOT VERIFIED: {type(exc).__name__}: {exc}")

if not isinstance(data, dict) or not isinstance(data.get("found"), list):
    raise SystemExit("ANAF NOT VERIFIED: unexpected JSON schema")

found = {
    int(item["date_generale"]["cui"]): item["date_generale"]
    for item in data["found"]
    if isinstance(item, dict) and item.get("date_generale", {}).get("cui")
}
rows = []
for cui, name, candidate in CANDIDATES:
    official = found.get(cui)
    phone = (official or {}).get("telefon") or ""
    status = (
        "NOT_FOUND_ANAF" if official is None else
        "NO_PHONE_ANAF" if not phone else
        "MATCH_ANAF" if normalized(phone) == normalized(candidate) else
        "DIFFERENT_ANAF"
    )
    rows.append({
        "cui": cui, "company": name, "candidate_phone": candidate,
        "anaf_phone": phone, "status": status,
        "anaf_name": (official or {}).get("denumire", "")
    })

out = Path("maison_anaf_validation.csv")
with out.open("w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(file, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
for row in rows:
    print(row["cui"], row["status"], row["candidate_phone"], row["anaf_phone"])
print("Saved:", out.resolve())
