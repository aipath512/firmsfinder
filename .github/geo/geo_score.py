#!/usr/bin/env python3
"""FirmsFinder — scorer GEO determinist (fără rețea, fără AI).

Aplică ACELEAȘI criterii la fiecare rulare, pe fișierele din repository:
  * 22 semnale măsurabile on-site din cele 28 GEO ale registrului AI Signals
    (PASS=1, PARTIAL=0.5, FAIL=0; NA și cele 5 externe sunt excluse) -> "indicator";
  * "porți de calitate" suplimentare (nu intră în indicator): lucruri pe care
    structura singură nu le prinde (răspunsuri duplicate, fișier cu nume greșit etc.).

Indicatorul NU este un scor de vizibilitate AI și nu garantează citarea.

Utilizare:  python3 .github/geo/geo_score.py [--root .] [--target 90] [--json out.json] [--md out.md]
Cod de ieșire: 0 = țintă atinsă ȘI nicio poartă de calitate căzută; 1 = altfel.
"""
import argparse, glob, hashlib, html, json, os, re, sys
from urllib.parse import urlparse

SITE = 'https://firmsfinder.eu'
LD_RE = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S)
CORE_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot',
             'Google-Extended', 'Applebot-Extended', 'CCBot']
EXTRA_BOTS = ['Claude-User', 'Perplexity-User', 'Applebot', 'Meta-ExternalAgent']
ORG_ID = 'https://aiventure.ro/#organization'
OFFICIAL = ['onrc.ro', 'mfinante.gov.ro', 'anaf.ro', 'data.gov.ro']


class Repo:
    def __init__(self, root):
        self.root = root

    def p(self, rel):
        return os.path.join(self.root, rel)

    def exists(self, rel):
        return os.path.isfile(self.p(rel))

    def text(self, rel):
        try:
            with open(self.p(rel), encoding='utf-8') as f:
                return f.read()
        except Exception:
            return ''

    def js(self, rel):
        try:
            return json.loads(self.text(rel))
        except Exception:
            return None

    def url_to_file(self, url):
        u = url.split('#')[0].split('?')[0]
        if not u.startswith(SITE):
            return None
        rel = u[len(SITE):].lstrip('/')
        if rel == '' or rel.endswith('/'):
            rel += 'index.html'
        return rel


def load_pages(R):
    """Paginile indexabile = URL-urile din sitemap.xml care există ca fișier."""
    urls = re.findall(r'<loc>(.*?)</loc>', R.text('sitemap.xml'))
    pages = {}
    for u in urls:
        rel = R.url_to_file(u)
        if rel and R.exists(rel):
            pages[u] = rel
    return urls, pages


def graph_nodes(h):
    nodes, ok = [], True
    for raw in LD_RE.findall(h):
        try:
            d = json.loads(raw)
        except Exception:
            ok = False
            continue
        g = d.get('@graph') if isinstance(d, dict) else None
        nodes.extend(g if g is not None else ([d] if isinstance(d, dict) else d))
    return nodes, ok


def collect_refs(o, acc):
    if isinstance(o, dict):
        if set(o.keys()) == {'@id'}:
            acc.add(o['@id'])
        for v in o.values():
            collect_refs(v, acc)
    elif isinstance(o, list):
        for v in o:
            collect_refs(v, acc)


def meta(h, key):
    m = re.search(r'<meta[^>]*(?:property|name)="%s"[^>]*content="([^"]*)"' % re.escape(key), h) or \
        re.search(r'<meta[^>]*content="([^"]*)"[^>]*(?:property|name)="%s"' % re.escape(key), h)
    return html.unescape(m.group(1)) if m else None


def canonical(h):
    m = re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]*)"', h) or \
        re.search(r'<link[^>]*href="([^"]*)"[^>]*rel="canonical"', h)
    return m.group(1) if m else None


def org_nodes(R, pages):
    out = {}
    for u, rel in pages.items():
        nodes, _ = graph_nodes(R.text(rel))
        for n in nodes:
            if n.get('@type') == 'Organization':
                out[u] = n
    return out


# ---------------------------------------------------------------- semnale
def run(R):
    S = {}  # id -> dict(name,status,why,files)
    urls, pages = load_pages(R)
    home = pages.get(SITE + '/')
    orgs = org_nodes(R, pages)
    org = orgs.get(SITE + '/') or (next(iter(orgs.values())) if orgs else {})

    FR = {}

    def put(i, name, status, why, files=()):
        S[i] = {'name': name, 'status': status, 'why': why, 'files': list(files)}

    # externe / neaplicabile
    for i, n in [(1, 'Wikipedia / Wikidata'), (2, 'Crunchbase Profile'), (12, 'Press Mentions'),
                 (20, 'Google Business Profile'), (24, 'Named Entity Density')]:
        put(i, n, 'UNKNOWN', 'Extern sau nemăsurabil din repository.')
    put(6, 'Hreflang', 'NA', 'Un singur limbaj (ro-RO).')

    # 3 proof.json
    pr = R.js('proof.json') or {}
    target = (pr.get('anchored_artifact') or {}).get('path') or 'geo/verification.json'
    sha = pr.get('sha256')
    real = R.exists(target) and isinstance(sha, str) and re.fullmatch(r'[0-9a-f]{64}', sha) and \
        hashlib.sha256(open(R.p(target), 'rb').read()).hexdigest() == sha
    ots = R.exists(target + '.ots')
    if real and ots:
        st, why = 'PASS', 'SHA-256 corect și dovadă OpenTimestamps prezentă.'
    elif real:
        st, why = 'PARTIAL', 'SHA-256 corect; lipsește %s.ots (ștampila OpenTimestamps).' % target
    else:
        st, why = 'FAIL', 'SHA-256 absent, greșit sau nepotrivit cu fișierul ancorat.'
    put(3, 'proof.json IP Anchoring', st, why, ['proof.json', target])

    # 4 sameAs
    same_h = set(org.get('sameAs') or [])
    ents = (R.js('geo/entities.json') or {}).get('entities', [])
    same_g = set(next((e.get('same_as') or [] for e in ents if e.get('id') == ORG_ID), []))
    if len(same_h) >= 3 and same_h == same_g:
        st, why = 'PASS', '%d sameAs identice în JSON-LD și geo/entities.json.' % len(same_h)
    elif same_h or same_g:
        st, why = 'PARTIAL', 'sameAs doar într-un loc sau diferit (HTML=%d, geo=%d).' % (len(same_h), len(same_g))
    else:
        st, why = 'FAIL', 'Zero sameAs în JSON-LD și în geo/entities.json.'
    put(4, 'sameAs External', st, why, ['index.html', 'geo/entities.json'])

    # 5 ai.txt
    t = R.text('ai.txt')
    lines = [l for l in t.splitlines() if l.strip()]
    urls_in = re.findall(r'https://firmsfinder\.eu/\S+', t)
    bullets = [l for l in lines if l.lstrip().startswith('- ')]
    if not lines:
        st, why = 'FAIL', 'ai.txt absent sau gol.'
    elif len(urls_in) >= 4 and len(bullets) >= 4 and re.search(r'@', t) and re.search(r'(?i)politic|policy', t):
        st, why = 'PASS', 'Operator, contact, puncte de intrare și politică.'
    else:
        st, why = 'PARTIAL', 'Există, dar fără politică, contact sau puncte de intrare suficiente (%d rânduri).' % len(lines)
    put(5, 'ai.txt', st, why, ['ai.txt'])

    # 7 changelog
    ch = R.js('geo/changelog.json')
    if not ch:
        st, why = 'FAIL', 'changelog.json absent sau invalid.'
    else:
        ent = ch.get('change_entries') or []
        real_changes = [e for e in ent if e.get('change_type') != 'local_artifact_generated']
        in_release = any(set(r.get('included_change_ids') or []) & {e.get('change_id') for e in real_changes}
                         for r in (ch.get('releases') or []))
        if real_changes and in_release:
            st, why = 'PASS', '%d modificări reale consemnate și legate de o versiune.' % len(real_changes)
        else:
            st, why = 'PARTIAL', 'Doar instantanee locale; nicio modificare reală consemnată.'
    put(7, 'changelog.json', st, why, ['geo/changelog.json'])

    # 8 ai.json
    a = R.js('ai.json') or {}
    need = ['entity', 'discovery', 'machine_readable', 'capabilities']
    have = [k for k in need if a.get(k)]
    bad = []
    for sec in ('discovery', 'machine_readable'):
        for v in (a.get(sec) or {}).values():
            f = R.url_to_file(v) if isinstance(v, str) else None
            if f and not R.exists(f):
                bad.append(v)
    if not a or not have:
        st, why = 'FAIL', 'ai.json absent sau doar antet generic.'
    elif len(have) == 4 and not bad:
        st, why = 'PASS', 'Entitate, descoperire, resurse, capabilități; toate URL-urile se rezolvă.'
    else:
        st, why = 'PARTIAL', 'Incomplet (%d/4 secțiuni) sau URL-uri nerezolvate: %s' % (len(have), bad[:3])
    put(8, 'ai.json', st, why, ['ai.json'])

    # 9 legături externe oficiale
    found = set()
    for rel in pages.values():
        for d in OFFICIAL:
            if d in R.text(rel):
                found.add(d)
    put(9, 'External Entity Links Quality', 'PASS' if len(found) >= 3 else ('PARTIAL' if found else 'FAIL'),
        'Surse oficiale legate: %s' % sorted(found))

    # 10 llms.txt
    L = R.text('llms.txt')
    lu = [u.rstrip('.,)') for u in re.findall(r'https://firmsfinder\.eu/[^\s)]*', L)]
    miss = sorted({u for u in lu if R.url_to_file(u) and not R.exists(R.url_to_file(u))})
    if not L:
        st, why = 'FAIL', 'llms.txt absent.'
    elif len(set(lu)) >= 10 and not miss and re.search(r'(?i)version', L) and re.search(r'20\d\d-\d\d-\d\d', L):
        st, why = 'PASS', '%d URL-uri, toate se rezolvă; versiune și dată.' % len(set(lu))
    else:
        st, why = 'PARTIAL', 'URL-uri nerezolvate: %s' % miss[:4]
    put(10, 'llms.txt', st, why, ['llms.txt'])

    # 11 governance.json
    g = R.js('governance.json')
    if not g:
        st, why, f = 'FAIL', 'governance.json absent.', ['governance.json']
    else:
        stub = []
        for pf in g.get('policy_files') or []:
            rel = (pf.get('path') or '').lstrip('/')
            d = R.js(rel) or {}
            if not rel or set(d.keys()) <= {'schema', 'version', 'signal_id', 'signal_name', 'site', 'scope', 'category',
                                           'status', 'purpose', 'publication_note', 'verification', 'source_basis'}:
                stub.append(rel)
        core = all(g.get(k) for k in ('principles', 'claims', 'human_oversight', 'corrections'))
        if core and not stub and g.get('policy_files'):
            st, why = 'PASS', 'Principii, claims, supraveghere, corecții și politici cu conținut.'
        elif core:
            st, why = 'PARTIAL', 'Principii prezente; %d fișiere de politică referite sunt doar antete goale.' % len(stub)
        else:
            st, why = 'PARTIAL', 'Structură incompletă.'
        f = ['governance.json'] + stub
    put(11, 'governance.json', st, why, f)

    # 13 geo-tagged
    area = org.get('areaServed') or {}
    loc = (org.get('address') or {}).get('addressLocality')
    lh = R.text('localitati/index.html')
    ro = 'România' in json.dumps(area, ensure_ascii=False)
    loc_text = len(re.sub(r'<[^>]+>', ' ', lh.split('<body>')[-1]).split()) if lh else 0
    if ro and loc and loc_text >= 120:
        st, why = 'PASS', 'areaServed România, adresă, pagină de localități cu conținut.'
    elif ro and loc:
        st, why = 'PARTIAL', 'areaServed România și localitate; pagina /localitati/ are doar %d cuvinte.' % loc_text
    else:
        st, why = 'FAIL', 'Fără areaServed=România și adresă în Organization.'
    put(13, 'Geo-Tagged Content', st, why, ['localitati/index.html', 'index.html'])

    # 14 Dataset
    dsets = []
    for u, rel in pages.items():
        nodes, _ = graph_nodes(R.text(rel))
        dsets += [(u, n) for n in nodes if n.get('@type') == 'Dataset']
    gd = (R.js('geo/dataset.json') or {}).get('dataset') or {}
    gd = {k: v for k, v in gd.items() if k != '@context'}
    if not dsets:
        st, why = 'FAIL', 'Niciun Dataset în pagini.'
    else:
        same = all(n == gd for _, n in dsets)
        full = all(n.get('spatialCoverage') and n.get('temporalCoverage') for _, n in dsets)
        if same and full:
            st, why = 'PASS', 'Dataset unic, identic cu geo/dataset.json, cu acoperire spațială și temporală.'
        else:
            miss = []
            if not same:
                miss.append('definiție diferită între HTML și geo/dataset.json')
            if not all(n.get('spatialCoverage') for _, n in dsets):
                miss.append('spatialCoverage lipsă')
            if not all(n.get('temporalCoverage') for _, n in dsets):
                miss.append('temporalCoverage lipsă (necesită date reale de la operator)')
            st, why = 'PARTIAL', '; '.join(miss)
    put(14, 'Dataset Schema Corpus', st, why, ['index.html', 'surse/index.html', 'geo/dataset.json'])

    # 15 intents
    ri = R.js('intents.json') or {}
    rl = ri.get('intents') or ri.get('items') or []
    uniq = {(x.get('query') or x.get('intent') or json.dumps(x, sort_keys=True)) for x in rl} if isinstance(rl, list) else set()
    gi = (R.js('geo/intents.json') or {}).get('intents') or []
    unres = []
    for i in gi:
        for tp in i.get('target_pages') or []:
            f = R.url_to_file(tp)
            if not f or not R.exists(f):
                unres.append(tp)
            elif '#' in tp and not re.search(r'id="%s"' % re.escape(tp.split('#')[1]), R.text(f)):
                unres.append(tp)
    if len(uniq) >= 100 and gi and not unres:
        st, why = 'PASS', '%d intenții unice în rădăcină; toate țintele din geo/intents.json se rezolvă.' % len(uniq)
    elif uniq or gi:
        st, why = 'PARTIAL', 'Intenții %d, ținte nerezolvate %d.' % (len(uniq), len(unres))
    else:
        st, why = 'FAIL', 'Fără intents.json.'
    put(15, 'intents.json', st, why, ['intents.json', 'geo/intents.json'])

    # 16 NAP
    tel, adr = org.get('telephone'), org.get('address') or {}
    ct = R.text('contact/index.html')
    visible = bool(tel) and re.sub(r'\D', '', tel)[-9:] in re.sub(r'\D', '', ct)
    if org.get('name') and tel and adr.get('streetAddress') and visible:
        st, why = 'PASS', 'Nume, adresă cu stradă, telefon — în JSON-LD și vizibile.'
    elif org.get('name') and (tel or adr) and visible:
        st, why = 'PARTIAL', 'Nume și telefon/localitate, fără stradă în adresă.'
    else:
        st, why = 'FAIL', 'Fără telefon/adresă în Organization sau nevizibile pe /contact/.'
    put(16, 'Local Citations NAP', st, why, ['contact/index.html', 'index.html'])

    # 17 entities.json
    ids = [e.get('id') for e in ents]
    defined = set()
    for rel in pages.values():
        nodes, _ = graph_nodes(R.text(rel))
        defined |= {n.get('@id') for n in nodes if n.get('@id')}
    undef = [i for i in ids if i not in defined]
    if ents and not undef:
        st, why = 'PASS', 'Toate cele %d ID-uri sunt definite în JSON-LD.' % len(ids)
    elif ents:
        st, why = 'PARTIAL', '%d din %d ID-uri nedefinite în pagini.' % (len(undef), len(ids))
    else:
        st, why = 'FAIL', 'geo/entities.json absent.'
    put(17, 'entities.json Registry', st, why, ['geo/entities.json', 'index.html'])

    # 18 robots
    rb = R.text('robots.txt')
    uas = set(re.findall(r'(?im)^user-agent:\s*(\S+)', rb))
    miss = [b for b in CORE_BOTS if b not in uas]
    blocked = re.search(r'(?im)^disallow:\s*/\s*$', rb)
    if rb and not miss and not blocked and re.search(r'(?im)^sitemap:', rb):
        st, why = 'PASS', 'Boții AI principali permiși, Sitemap prezent. Lipsesc (informativ): %s' % [b for b in EXTRA_BOTS if b not in uas]
    elif rb:
        st, why = 'PARTIAL', 'Lipsesc: %s' % miss
    else:
        st, why = 'FAIL', 'robots.txt absent.'
    put(18, 'robots.txt AI', st, why, ['robots.txt'])

    # 19 autor
    persons = 0
    byline = False
    for rel in pages.values():
        h = R.text(rel)
        nodes, _ = graph_nodes(h)
        persons += sum(1 for n in nodes if n.get('@type') == 'Person' and n.get('sameAs'))
        if re.search(r'(?i)(redactat|autor)[^<]{0,40}Dan Ionesco', h):
            byline = True
    if persons and byline:
        st, why = 'PASS', 'Person cu sameAs (ORCID) și semnătură vizibilă.'
    elif persons or any(meta(R.text(r), 'author') for r in pages.values()):
        st, why = 'PARTIAL', 'Autor = organizație sau Person fără semnătură vizibilă.'
    else:
        st, why = 'FAIL', 'Niciun autor.'
    put(19, 'Author EEAT', st, why, ['despre/index.html'])

    # 21, 26, 28, 22 pe fiecare pagină
    tw_ok, og_ok, can_ok, graph_ok = [], [], [], []
    og_req = ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'og:image:height',
              'og:site_name', 'og:locale']
    tw_req = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']
    for u, rel in pages.items():
        h = R.text(rel)
        tw_ok.append(all(meta(h, k) for k in tw_req))
        og_ok.append(all(meta(h, k) for k in og_req))
        can_ok.append(canonical(h) == u)
        nodes, valid = graph_nodes(h)
        ids_ = [n.get('@id') for n in nodes if n.get('@id')]
        refs = set()
        collect_refs(nodes, refs)
        graph_ok.append(valid and bool(nodes) and len(ids_) == len(set(ids_)) and all(r in set(ids_) for r in refs))
    n = max(len(pages), 1)

    def tri(lst, nm):
        k = sum(lst)
        FR[nm] = (k / len(lst)) if lst else 0.0
        return ('PASS' if k == len(lst) and lst else ('PARTIAL' if k else 'FAIL'), '%d/%d pagini %s' % (k, len(lst), nm))
    st, why = tri(tw_ok, 'cu Twitter Card complet')
    put(21, 'Twitter Card', st, why, [r for (u, r), ok in zip(pages.items(), tw_ok) if not ok])
    S[21]['frac'] = FR['cu Twitter Card complet']
    st, why = tri(og_ok, 'cu Open Graph complet')
    put(26, 'OpenGraph Completeness', st, why, [r for (u, r), ok in zip(pages.items(), og_ok) if not ok])
    S[26]['frac'] = FR['cu Open Graph complet']
    st, why = tri(can_ok, 'cu canonical corect')
    put(28, 'Canonical URL', st, why, [r for (u, r), ok in zip(pages.items(), can_ok) if not ok])
    S[28]['frac'] = FR['cu canonical corect']
    st, why = tri(graph_ok, 'cu graf JSON-LD valid (ID-uri unice, referințe rezolvate)')
    put(22, 'Entity Graph JSON-LD', st, why, [r for (u, r), ok in zip(pages.items(), graph_ok) if not ok])
    S[22]['frac'] = FR['cu graf JSON-LD valid (ID-uri unice, referințe rezolvate)']

    # 23 LinkedIn (plafon PARTIAL: confirmarea din partea LinkedIn nu e măsurabilă offline)
    li = any('linkedin.com' in s for s in same_h)
    put(23, 'LinkedIn Verification', 'PARTIAL' if li else 'FAIL',
        'LinkedIn în sameAs (confirmarea inversă din LinkedIn nu e măsurabilă offline).' if li else 'Fără LinkedIn în sameAs.',
        ['index.html'])

    # 25 Organization completeness
    props = ['name', 'legalName', 'url', 'foundingDate', 'email', 'telephone', 'address', 'areaServed',
             'contactPoint', 'sameAs', 'founder']
    have = [p for p in props if org.get(p)]
    logo, ident = bool(org.get('logo')), bool(org.get('identifier') or org.get('vatID') or org.get('taxID'))
    if len(have) == len(props) and logo and ident:
        st, why = 'PASS', 'Toate proprietățile, plus logo și identificator.'
    elif len(have) >= 8:
        st, why = 'PARTIAL', '%d/%d proprietăți; lipsesc: %s%s' % (len(have), len(props), [p for p in props if p not in have],
                                                                  '' if logo and ident else ' + logo/identificator')
    else:
        st, why = 'FAIL', 'Doar %d/%d proprietăți.' % (len(have), len(props))
    put(25, 'Organization Completeness', st, why, ['index.html'])

    # 27 consistența brandului
    sig = set()
    for u, rel in pages.items():
        nodes, _ = graph_nodes(R.text(rel))
        core = tuple(sorted(json.dumps(n, sort_keys=True, ensure_ascii=False) for n in nodes
                            if n.get('@id') in (BRAND := 'https://firmsfinder.eu/#brand', 'https://firmsfinder.eu/#software',
                                                'https://firmsfinder.eu/#website')))
        if core:  # paginile fără graf sunt prinse de semnalul #22, nu aici
            sig.add(core)
    sites = {meta(R.text(r), 'og:site_name') for r in pages.values()} - {None}
    hh = R.text(home) if home else ''
    ext_cta = [d for d in set(re.findall(r'href="https?://([^/"]+)', hh)) if d.endswith('.eu') or d.endswith('.fr')]
    declared = {urlparse(s).netloc for s in same_h} | {urlparse(x).netloc for x in (org.get('url'),) if x}
    undeclared_ext = [d for d in ext_cta if d != 'firmsfinder.eu' and d not in declared and d != 'aiventure.ro']
    probs = []
    if len(sig) > 1:
        probs.append('nodurile Brand/Software/WebSite diferă între pagini')
    if len(sites) > 1:
        probs.append('og:site_name diferit: %s' % sorted(sites))
    if undeclared_ext:
        probs.append('homepage trimite către domenii externe nedeclarate: %s' % sorted(undeclared_ext))
    put(27, 'Brand Entity Consistency', 'PASS' if not probs else ('PARTIAL' if len(sig) == 1 else 'FAIL'),
        '; '.join(probs) or 'Graf identic, og:site_name unic, fără CTA extern nedeclarat.', ['index.html'])
    return S, pages


# ---------------------------------------------------------------- porți de calitate
def gates(R, pages):
    G = []

    def gate(i, name, ok, detail, files=()):
        G.append({'id': i, 'name': name, 'ok': bool(ok), 'detail': detail, 'files': list(files)})
    # Q1 ghid: răspunsuri distincte
    g = R.text('geo/ghid/index.html')
    secs = re.findall(r'<section id="[^"]+"><h2>.*?</h2><p>(.*?)</p></section>', g, re.S)
    gate('Q1', 'Ghid: răspunsuri distincte', secs and len(set(secs)) == len(secs),
         '%d distincte din %d' % (len(set(secs)), len(secs)), ['geo/ghid/index.html'])
    # Q2 ghid: date structurate
    gate('Q2', 'Ghid: FAQPage JSON-LD cu aceleași perechi', 'FAQPage' in g and g.count('"@type":"Question"') >= len(secs) > 0,
         'FAQPage prezent' if 'FAQPage' in g else 'fără FAQPage', ['geo/ghid/index.html'])
    # Q3 fișier cu nume greșit
    gate('Q3', 'Fără fișiere cu virgulă în nume', not glob.glob(os.path.join(R.root, '**', '*,*'), recursive=True),
         'găsit: %s' % [os.path.relpath(x, R.root) for x in glob.glob(os.path.join(R.root, '**', '*,*'), recursive=True)][:3])
    # Q4 link-uri interne din homepage
    home = pages.get(SITE + '/')
    hh = R.text(home) if home else ''
    internal = {u for u in re.findall(r'href="(/[^"#?]+)', hh)}
    others = {'/' + r[:-len('index.html')] for r in pages.values() if r != 'index.html'}
    gate('Q4', 'Homepage: linkuri interne spre toate paginile', others <= internal,
         'lipsesc: %s' % sorted(others - internal)[:5], ['index.html'])
    # Q5 linkuri interne rupte
    broken = []
    for r in pages.values():
        for h in set(re.findall(r'href="(/[^"#?]*)', R.text(r))):
            t = h.lstrip('/')
            t = t + 'index.html' if (h.endswith('/') or h == '/') else t
            if not R.exists(t) and not os.path.isdir(R.p(h.lstrip('/'))):
                broken.append((r, h))
    gate('Q5', 'Fără linkuri interne rupte', not broken, str(sorted(set(broken))[:4]))
    # Q6 hash-uri verification.json
    v = R.js('geo/verification.json') or {}
    badh = [e['path'] for e in v.get('file_inventory', []) if e.get('local_sha256') and R.exists(e['path']) and
            hashlib.sha256(open(R.p(e['path']), 'rb').read()).hexdigest() != e['local_sha256']]
    gate('Q6', 'Hash-uri verification.json corecte', v and not badh, 'diferă: %s' % badh[:4], ['geo/verification.json'])
    # Q7 documente interne publicate
    internal_docs = [f for f in os.listdir(R.root) if os.path.isfile(R.p(f)) and
                     re.match(r'(?i)(README|INVENTAR|AUDIT_BIS|PATCH_README|GEO_.*(README|ACCEPTANCE|RESULTS)|DELTA_|PUBLICARE|TESTE_LOCALE|TOATE_)', f)]
    gate('Q7', 'Fără documente interne în rădăcina publică', len(internal_docs) <= 1,
         '%d fișiere de lucru: %s' % (len(internal_docs), internal_docs[:6]))
    # Q8 claims: nimic verificat fără dovadă; CL cu risc marcate
    cl = (R.js('geo/claims.json') or {}).get('claims') or []
    ev = {e['id'] for e in (R.js('geo/evidence.json') or {}).get('evidence_records', [])}
    bad = [c['id'] for c in cl if str(c.get('status', '')).upper().startswith(('VERIFIED', 'APPROVED')) and
           not any(e in ev for e in c.get('evidence_refs', []))]
    gate('Q8', 'Claims: nimic „verificat” fără dovadă', not bad, 'încălcări: %s' % bad, ['geo/claims.json'])
    # Q9 observații inventate
    obs = (R.js('geo/observations.json') or {}).get('observations') or []
    gate('Q9', 'Observații AI: fără rezultate fără dovadă', all(o.get('evidence') or o.get('output_ref') for o in obs),
         '%d observații' % len(obs), ['geo/observations.json'])
    return G


# Semnale/porți care cer date sau decizii ale operatorului: agentul AI NU are voie să le „rezolve” singur.
NEEDS_OPERATOR = {
    3: 'ștampila OpenTimestamps (se face din contul operatorului, pe fișierul publicat)',
    11: 'conținutul real al politicilor (decizii ale operatorului)',
    13: 'conținut real pe localități (date)',
    14: 'temporalCoverage = anii reali încărcați (date)',
    16: 'adresa completă cu stradă (decizie a operatorului)',
    23: 'confirmarea din partea LinkedIn',
    25: 'logo real și identificator (CUI/EUID) — decizie a operatorului',
    27: 'decizia privind butonul CAUTĂ către alt domeniu și forma sloganului',
    'Q7': 'ștergerea fișierelor interne din repository (decizie a operatorului)',
}


def annotate(S, G):
    for k, v in S.items():
        if k in NEEDS_OPERATOR and v['status'] != 'PASS':
            v['needs_operator'] = NEEDS_OPERATOR[k]
    for g in G:
        if g['id'] in NEEDS_OPERATOR and not g['ok']:
            g['needs_operator'] = NEEDS_OPERATOR[g['id']]


def fine_progress(S, G):
    """Progres fin: indicator + fracții pe pagini + porți OK (ca 2 pagini -> 3 pagini să conteze)."""
    pts = {'PASS': 1.0, 'PARTIAL': 0.5, 'FAIL': 0.0}
    base = sum(pts[v['status']] for v in S.values() if v['status'] in pts)
    return round(base + sum(v.get('frac', 0) * 0.5 for v in S.values() if v['status'] == 'PARTIAL') +
                 0.25 * sum(1 for g in G if g['ok']), 4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='.')
    ap.add_argument('--target', type=float, default=100.0)
    ap.add_argument('--json')
    ap.add_argument('--md')
    a = ap.parse_args()
    R = Repo(os.path.abspath(a.root))
    S, pages = run(R)
    G = gates(R, pages)
    pts = {'PASS': 1.0, 'PARTIAL': 0.5, 'FAIL': 0.0}
    meas = [s for s in S.values() if s['status'] in pts]
    ind = round(100 * sum(pts[s['status']] for s in meas) / len(meas), 1)
    cnt = {k: sum(1 for s in S.values() if s['status'] == k) for k in ('PASS', 'PARTIAL', 'FAIL', 'NA', 'UNKNOWN')}
    annotate(S, G)
    out = {'indicator_pct': ind, 'measurable': len(meas), 'counts': cnt, 'target_pct': a.target,
           'signals': {str(k): S[k] for k in sorted(S)}, 'gates': G,
           'gates_failed': [g['id'] for g in G if not g['ok']],
           'note': 'Indicator de acoperire on-site; nu este scor de vizibilitate AI și nu garantează citarea.'}
    ok = ind >= a.target and not out['gates_failed']
    out['accepted'] = ok
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
    md = ['# Raport GEO (scorer determinist)', '',
          '**Indicator:** %.1f %% (țintă %.0f %%) · PASS %d · PARTIAL %d · FAIL %d · NA %d · UNKNOWN %d' %
          (ind, a.target, cnt['PASS'], cnt['PARTIAL'], cnt['FAIL'], cnt['NA'], cnt['UNKNOWN']),
          '**Porți de calitate căzute:** %s' % (', '.join(out['gates_failed']) or 'niciuna'), '',
          '| # | Semnal | Stare | Motiv | Fișiere afectate |', '|--:|---|:-:|---|---|']
    for k in sorted(S):
        s = S[k]
        md.append('| %d | %s | %s | %s | %s |' % (k, s['name'], s['status'],
                                                  (s['why'] + (' **[operator: %s]**' % s['needs_operator'] if s.get('needs_operator') else '')).replace('|', '/'),
                                                  ', '.join(s['files'][:4])))
    md += ['', '| Poartă | Stare | Detaliu |', '|---|:-:|---|']
    for g in G:
        md.append('| %s %s | %s | %s |' % (g['id'], g['name'], 'OK' if g['ok'] else 'CADE', g['detail'].replace('|', '/')))
    text = '\n'.join(md) + '\n'
    if a.md:
        with open(a.md, 'w', encoding='utf-8') as f:
            f.write(text)
    print(text)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
