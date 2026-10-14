#!/usr/bin/env python3
"""FirmsFinder - DELTA T0 -> T1 (GEO LIVE). Compara doua rapoarte produse de geo_live.py cu aceeasi versiune si aceleasi ponderi.
Utilizare: python3 geo_delta.py T0.json T1.json out.json"""
import hashlib, json, sys

def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

t0p, t1p, outp = sys.argv[1:4]
a, b = json.load(open(t0p, encoding="utf-8")), json.load(open(t1p, encoding="utf-8"))
if a["evaluator"]["version"] != b["evaluator"]["version"] or a["methodology"] != b["methodology"]:
    sys.exit("Versiuni diferite de evaluator/metodologie: DELTA nu este valid.")
rows, bm = [], {c["id"]: c for c in b["checks"]}
for c in a["checks"]:
    d = bm[c["id"]]
    pts = (d["weight"] if d["state"] == "PASS" else 0) - (c["weight"] if c["state"] == "PASS" else 0)
    rows.append({"id": c["id"], "category": c["category"], "weight": c["weight"], "before": c["state"], "after": d["state"],
                 "points": pts, "after_detail": d["detail"]})
doc = {"kind": "GEO_LIVE_DELTA", "methodology": a["methodology"], "evaluator_version": a["evaluator"]["version"],
       "evaluator_sha256_t0": a["evaluator"]["sha256"], "evaluator_sha256_t1": b["evaluator"]["sha256"],
       "before": {"stage": a["stage"], "score": a["summary"]["score"], "grade": a["summary"]["grade"], "commit": a["ci"]["commit"],
                  "run_url": a["ci"]["run_url"], "started": a["started"], "evidence_sha256": sha(t0p)},
       "after": {"stage": b["stage"], "score": b["summary"]["score"], "grade": b["summary"]["grade"], "commit": b["ci"]["commit"],
                 "run_url": b["ci"]["run_url"], "started": b["started"], "evidence_sha256": sha(t1p)},
       "delta_points": round(b["summary"]["score"] - a["summary"]["score"], 1),
       "improved": [r["id"] for r in rows if r["points"] > 0], "regressed": [r["id"] for r in rows if r["points"] < 0],
       "still_failing": [r["id"] for r in rows if r["after"] != "PASS"], "controls": rows,
       "limits": "GEO Technical Readiness. Nu masoara vizibilitatea in sistemele AI si nici impactul comercial. Setul de pagini evaluate poate diferi intre T0 si T1."}
json.dump(doc, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(outp, "a").write("\n")
print("DELTA %+.1f (%s -> %s)" % (doc["delta_points"], doc["before"]["score"], doc["after"]["score"]))
