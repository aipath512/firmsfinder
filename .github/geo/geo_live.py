#!/usr/bin/env python3
"""FirmsFinder - evaluator GEO LIVE v1.0.1 (GEO Technical Readiness, masurat pe site-ul PUBLIC).

Metodologia normativa: resurse/audituri/metodologie/GEO_LIVE_METHODOLOGY_v1.0_2026-10-14.md
Acelasi script, aceleasi ponderi si aceleasi reguli se folosesc la T0 si la T1. Orice schimbare => versiune noua.

NU masoara vizibilitatea efectiva in sistemele AI (citari) si nici impactul comercial.

Utilizare:
  python3 .github/geo/geo_live.py --stage T0 --json out.json --md out.md
  python3 .github/geo/geo_live.py --local-root . --json /tmp/x.json   # doar test de logica; NU este o masurare live
Cod de iesire: 0 = evaluare COMPLETA; 2 = INCOMPLETA (cel putin un control UNKNOWN).
"""
import argparse, datetime, hashlib, html, json, os, re, sys, time
import urllib.error, urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

VERSION = "1.0.1"
METHODOLOGY = "GEO_LIVE_METHODOLOGY_v1.0_2026-10-14"
SITE = "https://firmsfinder.eu"
UA = "FirmsFinder-GEO-Live/1.0 (+https://firmsfinder.eu/resurse/audituri/)"
CORE_BOTS = ["gptbot", "oai-searchbot", "chatgpt-user", "claudebot", "claude-searchbot", "perplexitybot",
             "google-extended", "applebot-extended", "ccbot"]
LOCAL_HOSTS = {"firmsfinder.eu", "aiventure.ro"}
LD_RE = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S | re.I)
NEG_RE = re.compile(r"\b(nu|fara|fără|neintegrat|exclus|neverificat|nefolosit)\b", re.I)
SRC_RE = re.compile(r"(provin|surs[ăae]|folosit|utiliz|preluat|extras|date oficiale de la)", re.I)
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}(T[0-9:.+\-Zz]+)?$")


def now_utc():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Unknown(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


class Fetcher:
    """state: OK (2xx) | MISSING (404/410) | REDIRECT (3xx, follow=False) | UNKNOWN (403/429/5xx/retea/alte)."""

    def __init__(self, local_root=None):
        self.ledger, self.cache, self.local = [], {}, local_root

    def get(self, url, follow=True):
        key = (url, follow)
        if key not in self.cache:
            r = self._local(url) if self.local else self._live(url, follow)
            self.cache[key] = r
            self.ledger.append({k: r[k] for k in ("url", "final_url", "status", "state", "content_type", "bytes",
                                                 "sha256", "timestamp", "cf_cache_status", "error") if k in r})
        return self.cache[key]

    def ok(self, url, follow=True):
        r = self.get(url, follow)
        if r["state"] == "UNKNOWN":
            raise Unknown("%s -> %s %s" % (url, r.get("status"), r.get("error", "")))
        return r

    def _mk(self, url, status, state, body=b"", ctype="", final=None, err=None, cache=None, location=None):
        r = {"url": url, "final_url": final or url, "status": status, "state": state, "content_type": ctype,
             "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(), "timestamp": now_utc(), "body": body}
        if err:
            r["error"] = err
        if cache:
            r["cf_cache_status"] = cache
        if location:
            r["location"] = location
        return r

    def _live(self, url, follow):
        opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
        last = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA, "Cache-Control": "no-cache",
                                                           "Accept": "*/*"})
                with opener.open(req, timeout=25) as resp:
                    body = resp.read()
                    return self._mk(url, resp.status, "OK", body, resp.headers.get("Content-Type", ""),
                                    resp.geturl(), cache=resp.headers.get("cf-cache-status"))
            except urllib.error.HTTPError as e:
                body = b""
                try:
                    body = e.read()
                except Exception:
                    pass
                if e.code in (404, 410):
                    return self._mk(url, e.code, "MISSING", body, e.headers.get("Content-Type", ""))
                if 300 <= e.code < 400 and not follow:
                    return self._mk(url, e.code, "REDIRECT", body, location=e.headers.get("Location"))
                last = self._mk(url, e.code, "UNKNOWN", body, err="HTTP %s" % e.code)
            except Exception as e:  # retea, timeout, TLS
                last = self._mk(url, None, "UNKNOWN", err=type(e).__name__ + ": " + str(e)[:120])
            time.sleep(2)
        return last

    def _local(self, url):  # DOAR pentru testul logicii
        p = urlparse(url)
        if p.scheme != "https":
            return self._mk(url, None, "UNKNOWN", err="local mode: no http")
        rel = p.path.lstrip("/")
        if rel == "" or rel.endswith("/"):
            rel += "index.html"
        fp = os.path.join(self.local, rel)
        if not os.path.isfile(fp):
            return self._mk(url, 404, "MISSING")
        ext = rel.rsplit(".", 1)[-1]
        ct = {"html": "text/html", "json": "application/json", "txt": "text/plain", "xml": "application/xml"}.get(ext, "application/octet-stream")
        return self._mk(url, 200, "OK", open(fp, "rb").read(), ct)


def text(r):
    return r["body"].decode("utf-8", "replace")


def jparse(r):
    try:
        return json.loads(text(r))
    except Exception:
        return None


def visible_text(h):
    h = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", h, flags=re.S | re.I)
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)))


def ld_blocks(h):
    """(lista de obiecte JSON-LD, numar de blocuri care nu se parseaza)"""
    out, bad = [], 0
    for m in LD_RE.findall(h):
        try:
            out.append(json.loads(m))
        except Exception:
            bad += 1
    return out, bad


def top_nodes(blocks):
    nodes = []
    for b in blocks:
        if isinstance(b, dict) and isinstance(b.get("@graph"), list):
            nodes += [n for n in b["@graph"] if isinstance(n, dict)]
        elif isinstance(b, dict):
            nodes.append(b)
        elif isinstance(b, list):
            nodes += [n for n in b if isinstance(n, dict)]
    return nodes


def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


def types(n):
    t = n.get("@type", [])
    return t if isinstance(t, list) else [t]


class Run:
    def __init__(self, F):
        self.F, self.results = F, []
        self._sitemap = None

    def add(self, cid, cat, w, fn):
        try:
            state, detail, fails = fn()
        except Unknown as e:
            state, detail, fails = "UNKNOWN", "Nedeterminabil: %s" % e, []
        except Exception as e:  # defect de evaluator => nu inventam un rezultat
            state, detail, fails = "UNKNOWN", "Eroare evaluator: %s: %s" % (type(e).__name__, e), []
        self.results.append({"id": cid, "category": cat, "weight": w, "state": state, "detail": detail,
                             "failing_items": fails[:40]})

    # ---- resurse comune
    def sitemap_locs(self):
        if self._sitemap is None:
            r = self.F.ok(SITE + "/sitemap.xml")
            if r["state"] != "OK":
                self._sitemap = ([], None)
            else:
                try:
                    root = ET.fromstring(r["body"])
                    ns = ""
                    urls = []
                    for u in root.iter():
                        if u.tag.split("}")[-1] == "url":
                            loc = lm = None
                            for c in u:
                                t = c.tag.split("}")[-1]
                                if t == "loc":
                                    loc = (c.text or "").strip()
                                elif t == "lastmod":
                                    lm = (c.text or "").strip()
                            urls.append((loc, lm))
                    self._sitemap = (urls, True)
                except ET.ParseError:
                    self._sitemap = ([], False)
        return self._sitemap

    def pages(self):
        urls, _ = self.sitemap_locs()
        out = []
        for loc, _lm in urls:
            if not loc or re.search(r"\.(json|xml|txt|pdf)$", loc):
                continue
            r = self.F.ok(loc)
            if r["state"] == "OK" and "html" in r["content_type"].lower():
                out.append((loc, text(r)))
        return out


def build(F):
    R = Run(F)
    manifest_url = SITE + "/geo/manifest.json"

    def manifest():
        r = F.ok(manifest_url)
        if r["state"] != "OK":
            return None, r
        return jparse(r), r

    def artifacts():
        m, _ = manifest()
        if not isinstance(m, dict) or not isinstance(m.get("artifacts"), list):
            return []
        return [a for a in m["artifacts"] if isinstance(a, str)]

    # ===== 1. HTTP / JSON (25) =====
    cat = "HTTP/JSON"

    def h1():
        m, r = manifest()
        if r["state"] != "OK":
            return "FAIL", "manifest.json: HTTP %s" % r["status"], [manifest_url]
        if m is None or "json" not in r["content_type"].lower():
            return "FAIL", "manifest.json: JSON invalid sau Content-Type fara 'json' (%s)" % r["content_type"], [manifest_url]
        return "PASS", "manifest.json 200, JSON valid", []
    R.add("H1", cat, 5, h1)

    def h2():
        arts = artifacts()
        if not arts:
            return "FAIL", "manifest fara lista 'artifacts'", []
        fails = [a for a in arts if F.ok(a)["state"] != "OK"]
        return ("PASS" if not fails else "FAIL"), "%d/%d artefacte din manifest raspund 200" % (len(arts) - len(fails), len(arts)), fails
    R.add("H2", cat, 8, h2)

    def h3():
        arts = artifacts()
        if not arts:
            return "FAIL", "manifest fara lista 'artifacts'", []
        fails = []
        for a in arts:
            r = F.ok(a)
            if r["state"] != "OK" or jparse(r) is None or "json" not in r["content_type"].lower():
                fails.append(a)
        return ("PASS" if not fails else "FAIL"), "%d/%d artefacte sunt JSON valid cu Content-Type json" % (len(arts) - len(fails), len(arts)), fails
    R.add("H3", cat, 6, h3)

    def h4():
        fails = []
        for p in ("/signals.json", "/entities.json"):
            r = F.ok(SITE + p)
            if r["state"] != "OK" or jparse(r) is None:
                fails.append(SITE + p)
        return ("PASS" if not fails else "FAIL"), "signals.json si entities.json 200 + JSON valid", fails
    R.add("H4", cat, 3, h4)

    def h5():
        r = F.ok("http://firmsfinder.eu/", follow=False)
        loc = r.get("location") or ""
        if r["state"] == "REDIRECT" and r["status"] in (301, 302, 307, 308) and loc.startswith("https://firmsfinder.eu"):
            return "PASS", "http:// redirectioneaza (%s) catre https" % r["status"], []
        return "FAIL", "http:// nu redirectioneaza catre https (status %s)" % r["status"], ["http://firmsfinder.eu/"]
    R.add("H5", cat, 3, h5)

    # ===== 2. JSON-LD (20) =====
    cat = "JSON-LD"

    def per_page(fn):
        fails, n = [], 0
        for url, h in R.pages():
            n += 1
            if fn(url, h):
                fails.append(url)
        if n == 0:
            return "FAIL", "nicio pagina HTML in sitemap", []
        return ("PASS" if not fails else "FAIL"), "%d/%d pagini conforme" % (n - len(fails), n), fails

    R.add("J1", cat, 5, lambda: per_page(lambda u, h: len(ld_blocks(h)[0]) + ld_blocks(h)[1] == 0))
    R.add("J2", cat, 5, lambda: per_page(lambda u, h: ld_blocks(h)[1] > 0))

    def dup(u, h):
        ids = [n["@id"] for n in top_nodes(ld_blocks(h)[0]) if "@id" in n and len(n) > 1]
        return len(ids) != len(set(ids))
    R.add("J3", cat, 5, lambda: per_page(dup))

    def unresolved(u, h):
        blocks = ld_blocks(h)[0]
        defined = {n["@id"] for b in blocks for n in walk(b) if "@id" in n and len(n) > 1}
        for b in blocks:
            for n in walk(b):
                if list(n.keys()) == ["@id"] and isinstance(n["@id"], str):
                    host = urlparse(n["@id"]).netloc
                    if host in LOCAL_HOSTS and n["@id"] not in defined:
                        return True
        return False
    R.add("J4", cat, 5, lambda: per_page(unresolved))

    # ===== 3. robots / llms / sitemap (15) =====
    cat = "robots/llms/sitemap"

    def robots():
        return F.ok(SITE + "/robots.txt")

    def r1():
        r = robots()
        ok = r["state"] == "OK" and "html" not in r["content_type"].lower() and len(r["body"]) > 0
        return ("PASS" if ok else "FAIL"), "robots.txt: HTTP %s, %s" % (r["status"], r["content_type"]), ([] if ok else [SITE + "/robots.txt"])
    R.add("R1", cat, 3, r1)

    def r2():
        r = robots()
        if r["state"] != "OK":
            return "FAIL", "robots.txt absent", [SITE + "/robots.txt"]
        groups, cur, last_ua = [], None, False
        for ln in text(r).splitlines():
            ln = ln.split("#")[0].strip()
            if ":" not in ln:
                continue
            k, v = [x.strip() for x in ln.split(":", 1)]
            k = k.lower()
            if k == "user-agent":
                if not last_ua:
                    cur = {"uas": [], "dis": []}
                    groups.append(cur)
                cur["uas"].append(v.lower())
                last_ua = True
            else:
                last_ua = False
                if k == "disallow" and cur is not None:
                    cur["dis"].append(v)
        blocked = sorted({u for g in groups if "/" in g["dis"] for u in g["uas"] if u in CORE_BOTS or u == "*"})
        has_map = bool(re.search(r"(?im)^\s*sitemap:\s*\S*sitemap\.xml", text(r)))
        fails = ["blocat: %s" % b for b in blocked] + ([] if has_map else ["fara directiva Sitemap"])
        return ("PASS" if not fails else "FAIL"), "boti AI principali nu sunt blocati; Sitemap declarat" if not fails else "robots.txt: " + "; ".join(fails), fails
    R.add("R2", cat, 3, r2)

    def r3():
        urls, valid = R.sitemap_locs()
        if not valid or not urls:
            return "FAIL", "sitemap.xml absent sau XML invalid", [SITE + "/sitemap.xml"]
        fails = [loc for loc, _ in urls if not loc or F.ok(loc)["state"] != "OK"]
        return ("PASS" if not fails else "FAIL"), "%d/%d URL-uri din sitemap raspund 200" % (len(urls) - len(fails), len(urls)), fails
    R.add("R3", cat, 3, r3)

    def r4():
        urls, valid = R.sitemap_locs()
        if not valid or not urls:
            return "FAIL", "sitemap.xml absent sau XML invalid", []
        fails = []
        for loc, lm in urls:
            ok = bool(lm and ISO_DATE.match(lm))
            if ok:
                try:
                    datetime.date.fromisoformat(lm[:10])
                except ValueError:
                    ok = False
            if not ok:
                fails.append("%s lastmod=%r" % (loc, lm))
        return ("PASS" if not fails else "FAIL"), "%d/%d intrari cu lastmod ISO valid" % (len(urls) - len(fails), len(urls)), fails
    R.add("R4", cat, 2, r4)

    def r5():
        r = F.ok(SITE + "/llms.txt")
        ok = r["state"] == "OK" and "html" not in r["content_type"].lower() and text(r).lstrip().startswith("# ")
        return ("PASS" if ok else "FAIL"), "llms.txt: HTTP %s, %s, titlu H1 %s" % (r["status"], r["content_type"], "prezent" if ok else "absent/neconform"), ([] if ok else [SITE + "/llms.txt"])
    R.add("R5", cat, 2, r5)

    def r6():
        r = F.ok(SITE + "/llms.txt")
        if r["state"] != "OK":
            return "FAIL", "llms.txt absent", [SITE + "/llms.txt"]
        links = sorted(set(re.findall(r"https://firmsfinder\.eu[^\s)>\]\"']*", text(r))))
        fails = [l for l in links if F.ok(l)["state"] != "OK"]
        return ("PASS" if links and not fails else "FAIL"), "%d/%d linkuri firmsfinder.eu din llms.txt raspund 200" % (len(links) - len(fails), len(links)), fails
    R.add("R6", cat, 2, r6)

    # ===== 4. /geo/ghid (15) =====
    cat = "/geo/ghid"
    ghid = SITE + "/geo/ghid/"

    def ghid_html():
        r = F.ok(ghid)
        return (text(r) if r["state"] == "OK" and "html" in r["content_type"].lower() else None), r

    def faq_questions():
        h, _ = ghid_html()
        if h is None:
            return None
        qs = []
        for n in walk(ld_blocks(h)[0]):
            if "FAQPage" in types(n):
                for q in walk(n.get("mainEntity", [])):
                    if "Question" in types(q):
                        a = q.get("acceptedAnswer")
                        a = a.get("text") if isinstance(a, dict) else None
                        qs.append((q.get("name"), a))
        return qs

    def g1():
        h, r = ghid_html()
        if h is None:
            return "FAIL", "/geo/ghid/: HTTP %s sau non-HTML" % r["status"], [ghid]
        urls, _ = R.sitemap_locs()
        in_map = ghid in [u for u, _ in urls]
        can = re.search(r'<link[^>]*rel="canonical"[^>]*>', h) or re.search(r'<link[^>]*canonical[^>]*>', h)
        can_ok = bool(can and ghid in can.group(0))
        fails = ([] if in_map else ["lipseste din sitemap"]) + ([] if can_ok else ["canonical diferit"])
        return ("PASS" if not fails else "FAIL"), "200 HTML; in sitemap: %s; canonical corect: %s" % (in_map, can_ok), fails
    R.add("G1", cat, 3, g1)

    def g2():
        qs = faq_questions()
        ok = bool(qs) and all(q and a for q, a in qs)
        return ("PASS" if ok else "FAIL"), ("FAQPage cu %d intrebari si raspunsuri" % len(qs) if ok else "FAQPage JSON-LD absent sau incomplet"), ([] if ok else [ghid])
    R.add("G2", cat, 4, g2)

    def g3():
        h, r = ghid_html()
        if h is None:
            return "FAIL", "/geo/ghid/ indisponibil", [ghid]
        vis = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", x))).strip() for x in re.findall(r"<h2[^>]*>(.*?)</h2>", h, re.S)]
        vis = [v for v in vis if v.endswith("?")]
        names = {re.sub(r"\s+", " ", (q or "")).strip() for q, _ in (faq_questions() or [])}
        fails = [v for v in vis if v not in names]
        return ("PASS" if vis and not fails else "FAIL"), "%d/%d intrebari vizibile (H2) au pereche in FAQPage" % (len(vis) - len(fails), len(vis)), fails
    R.add("G3", cat, 4, g3)

    def g4():
        qs = faq_questions()
        if not qs:
            return "FAIL", "FAQPage absent", [ghid]
        ans = [re.sub(r"\s+", " ", a or "").strip() for _, a in qs]
        ok = len(set(ans)) == len(ans)
        return ("PASS" if ok else "FAIL"), "%d raspunsuri distincte din %d" % (len(set(ans)), len(ans)), ([] if ok else [ghid])
    R.add("G4", cat, 2, g4)

    def g5():
        h, r = ghid_html()
        if h is None:
            return "FAIL", "/geo/ghid/ indisponibil", [ghid]
        ok = any("BreadcrumbList" in types(n) for n in walk(ld_blocks(h)[0]))
        return ("PASS" if ok else "FAIL"), "BreadcrumbList %s" % ("prezent" if ok else "absent"), ([] if ok else [ghid])
    R.add("G5", cat, 2, g5)

    # ===== 5. coerenta ANAF (15) =====
    cat = "coerenta ANAF"

    def anaf_in_sources():
        r = F.ok(SITE + "/source-provenance.json")
        d = jparse(r) if r["state"] == "OK" else None
        if not isinstance(d, dict):
            return None
        return any("anaf" in (str(s.get("name", "")) + str(s.get("url", ""))).lower() for s in d.get("sources", []) if isinstance(s, dict))

    def a1():
        inP = anaf_in_sources()
        if inP is None:
            return "FAIL", "source-provenance.json indisponibil sau invalid", [SITE + "/source-provenance.json"]
        r = F.ok(SITE + "/llms.txt")
        if r["state"] != "OK":
            return "FAIL", "llms.txt absent", []
        fails = [l.strip()[:160] for l in text(r).splitlines() if "ANAF" in l and not inP and not NEG_RE.search(l)]
        return ("PASS" if not fails else "FAIL"), "ANAF in sursele declarate: %s; linii llms.txt care o prezinta ca sursa fara negatie: %d" % (inP, len(fails)), fails
    R.add("A1", cat, 5, a1)

    def a2():
        inP = anaf_in_sources()
        if inP is None:
            return "FAIL", "source-provenance.json indisponibil sau invalid", []
        fails = []
        for p in ("/entities.json", "/geo/entities.json"):
            r = F.ok(SITE + p)
            if r["state"] == "OK" and "ANAF" in text(r) and not inP:
                fails.append(SITE + p)
        return ("PASS" if not fails else "FAIL"), "fisiere entitati care mentioneaza ANAF fara sa fie in sursele declarate: %d" % len(fails), fails

    R.add("A2", cat, 5, a2)

    def a3():
        inP = anaf_in_sources()
        if inP is None:
            return "FAIL", "source-provenance.json indisponibil sau invalid", []
        fails = []
        for url, h in R.pages():
            for s in re.split(r"(?<=[.!?])\s+", visible_text(h)):
                if "ANAF" in s and SRC_RE.search(s) and not NEG_RE.search(s) and not inP:
                    fails.append("%s: %s" % (url, s[:140]))
        return ("PASS" if not fails else "FAIL"), "propozitii vizibile care prezinta ANAF ca sursa folosita, fara negatie: %d" % len(fails), fails
    R.add("A3", cat, 5, a3)

    # ===== 6. digital-dna.json (10) =====
    cat = "digital-dna.json"
    dna = SITE + "/digital-dna.json"

    def dna_doc():
        r = F.ok(dna)
        return (jparse(r) if r["state"] == "OK" else None), r

    def d1():
        d, r = dna_doc()
        ok = isinstance(d, dict) and "json" in r["content_type"].lower()
        return ("PASS" if ok else "FAIL"), "digital-dna.json: HTTP %s, JSON %s" % (r["status"], "valid" if ok else "invalid/absent"), ([] if ok else [dna])
    R.add("D1", cat, 3, d1)

    def d2():
        d, r = dna_doc()
        if not isinstance(d, dict):
            return "FAIL", "digital-dna.json indisponibil", [dna]
        res = (d.get("verification") or {}).get("result")
        st = str(d.get("status", ""))
        ok = res == "PASS" and "NOT_RUNTIME_VERIFIED" not in st
        return ("PASS" if ok else "FAIL"), "status=%s; verification.result=%s (PASS cere result=PASS si status fara NOT_RUNTIME_VERIFIED)" % (st, res), ([] if ok else [dna])
    R.add("D2", cat, 4, d2)

    def d3():
        d, r = dna_doc()
        if not isinstance(d, dict):
            return "FAIL", "digital-dna.json indisponibil", [dna]
        miss = [k for k in ("signal_id", "site", "organization", "brand") if not d.get(k)]
        if d.get("site") and d["site"].rstrip("/") != SITE:
            miss.append("site!=" + SITE)
        return ("PASS" if not miss else "FAIL"), "campuri obligatorii: %s" % ("complete" if not miss else "lipsa " + ",".join(miss)), miss
    R.add("D3", cat, 3, d3)
    return R


def summarize(results):
    cats, order = {}, []
    for r in results:
        c = cats.setdefault(r["category"], {"weight": 0, "earned": 0, "determinable": 0, "unknown": 0})
        if r["category"] not in order:
            order.append(r["category"])
        c["weight"] += r["weight"]
        if r["state"] == "PASS":
            c["earned"] += r["weight"]; c["determinable"] += r["weight"]
        elif r["state"] == "FAIL":
            c["determinable"] += r["weight"]
        elif r["state"] == "UNKNOWN":
            c["unknown"] += r["weight"]
    det = sum(c["determinable"] for c in cats.values())
    earned = sum(c["earned"] for c in cats.values())
    unknown = sum(c["unknown"] for c in cats.values())
    score = round(100.0 * earned / det, 1) if det else None
    complete = unknown == 0 and det > 0
    grade = None
    if complete:
        grade = "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 55 else "D" if score >= 40 else "F"
    return {"score": score, "earned_weight": earned, "determinable_weight": det, "unknown_weight": unknown,
            "evaluation": "COMPLETE" if complete else "INCOMPLETE", "grade": grade,
            "counts": {s: sum(1 for r in results if r["state"] == s) for s in ("PASS", "FAIL", "UNKNOWN", "N/A")},
            "categories": [dict(name=n, **cats[n]) for n in order]}


def markdown(doc):
    s = doc["summary"]
    L = ["# GEO LIVE %s - raport" % doc["stage"], "",
         "**GEO Technical Readiness (live):** %s / 100 - evaluare %s%s" % (s["score"], s["evaluation"], (" - clasa " + s["grade"]) if s["grade"] else ""),
         "", "- Tinta: %s" % doc["target"], "- Evaluator: geo_live.py v%s (sha256 %s)" % (doc["evaluator"]["version"], doc["evaluator"]["sha256"]),
         "- Metodologie: %s" % doc["methodology"],
         "- Rulare: %s ... %s (UTC)" % (doc["started"], doc["finished"]),
         "- Commit evaluat: %s; rulare CI: %s" % (doc["ci"].get("commit"), doc["ci"].get("run_url")),
         "- Cereri HTTP inregistrate: %d" % len(doc["requests"]), "",
         "Nu masoara vizibilitatea efectiva in sistemele AI si nici impactul comercial.", "",
         "| Categorie | Obtinut | Disponibil | UNKNOWN |", "|---|--:|--:|--:|"]
    for c in s["categories"]:
        L.append("| %s | %s | %s | %s |" % (c["name"], c["earned"], c["determinable"], c["unknown"]))
    L += ["", "| ID | Categorie | Pondere | Stare | Detaliu |", "|---|---|--:|:-:|---|"]
    for r in doc["checks"]:
        L.append("| %s | %s | %s | %s | %s |" % (r["id"], r["category"], r["weight"], r["state"], r["detail"].replace("|", "/")))
    L.append("")
    for r in doc["checks"]:
        if r["failing_items"]:
            L.append("**%s - elemente care nu corespund:**" % r["id"])
            L += ["- " + str(x) for x in r["failing_items"]]
            L.append("")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", default="T0")
    ap.add_argument("--json", default="geo-live.json")
    ap.add_argument("--md", default="geo-live.md")
    ap.add_argument("--local-root", default=None, help="DOAR test de logica; rezultatul nu este o masurare live")
    a = ap.parse_args()
    started = now_utc()
    F = Fetcher(a.local_root)
    R = build(F)
    results = R.results
    finished = now_utc()
    me = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
    env = os.environ
    doc = {"stage": a.stage, "kind": "LOCAL_LOGIC_TEST_NOT_A_MEASUREMENT" if a.local_root else "LIVE",
           "target": SITE + "/", "methodology": METHODOLOGY,
           "evaluator": {"name": "geo_live.py", "version": VERSION, "sha256": me},
           "started": started, "finished": finished,
           "ci": {"commit": env.get("GITHUB_SHA"), "run_id": env.get("GITHUB_RUN_ID"),
                  "run_url": ("%s/%s/actions/runs/%s" % (env.get("GITHUB_SERVER_URL"), env.get("GITHUB_REPOSITORY"), env.get("GITHUB_RUN_ID"))) if env.get("GITHUB_RUN_ID") else None},
           "limits": "GEO Technical Readiness pe site-ul public. Nu masoara vizibilitatea efectiva in sistemele AI, citarile sau impactul comercial.",
           "summary": summarize(results), "checks": results, "requests": F.ledger}
    with open(a.json, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(a.md, "w", encoding="utf-8") as f:
        f.write(markdown(doc))
    s = doc["summary"]
    print("GEO LIVE %s: %s/100 %s (PASS %d FAIL %d UNKNOWN %d)" % (a.stage, s["score"], s["evaluation"], s["counts"]["PASS"], s["counts"]["FAIL"], s["counts"]["UNKNOWN"]))
    return 0 if s["evaluation"] == "COMPLETE" else 2


if __name__ == "__main__":
    sys.exit(main())
