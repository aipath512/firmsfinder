#!/usr/bin/env python3
"""FirmsFinder — buclă GEO: scorer -> agent AI -> re-scorer, max N iterații, cu plase de siguranță în COD.

Agentul propune modificări de fișiere; codul de mai jos le acceptă SAU le respinge. Regulile nu depind
de promptul dat modelului. Agentul nu poate:
  * edita fișiere în afara listei ALLOWED (claims, evidence, observations, proof, backend, .github etc. sunt interzise);
  * introduce e-mailuri, telefoane, domenii sau cifre de tip „N firme” care nu există deja în repository sau în facts.json;
  * șterge conținut masiv (>40 % din fișier);
  * strica JSON-ul, canonical-ul sau <h1>;
  * face ca vreun semnal sau vreo poartă care era OK să devină mai rea (regresie => modificarea se anulează).
Se oprește la: țintă atinsă | nimic rămas de făcut de agent | 2 iterații consecutive fără progres | N iterații.
Fără ANTHROPIC_API_KEY rulează doar scorerul și scrie raportul.

Utilizare: python3 .github/geo/geo_agent_loop.py [--root .] [--max-iter 10] [--target 90] [--report geo-loop-report.md]
Test fără rețea: GEO_AGENT_MOCK=cale/către/raspunsuri.json (listă de răspunsuri, câte unul pe iterație).
"""
import argparse, copy, fnmatch, hashlib, json, os, re, shutil, subprocess, sys, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import geo_score as GS  # noqa: E402

ALLOWED = ['index.html', '*/index.html', 'geo/ghid/index.html', 'ai.txt', 'ai.json', 'llms.txt', 'robots.txt',
           'sitemap.xml', 'governance.json', 'geo/changelog.json', 'geo/corrections.json', 'geo/entities.json',
           'geo/dataset.json', 'geo/intents.json', 'geo/manifest.json']
FORBIDDEN_NOTE = ('geo/claims.json, geo/evidence.json, geo/observations.json, proof.json, geo/verification.json (se recalculează de cod), '
                  'backend/, tests/, scripts/, .github/, _headers, orice fișier nelistat')
API = 'https://api.anthropic.com/v1/messages'


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def tokens(text):
    """Fapte verificabile dintr-un text: e-mailuri, telefoane, domenii, afirmații cantitative despre firme."""
    t = set()
    t |= {('email', e.lower()) for e in re.findall(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)}
    t |= {('tel', re.sub(r'\D', '', x)[-9:]) for x in re.findall(r'\+?\d[\d ().-]{8,}\d', text)
          if 9 <= len(re.sub(r'\D', '', x)) <= 13 and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', x.strip())}
    t |= {('host', h.lower()) for h in re.findall(r'https?://([^/\s"\'<>)]+)', text)}
    t |= {('claim', re.sub(r'\s+', ' ', m.lower())) for m in re.findall(r'\d[\d.,]*\s*(?:de\s+)?(?:mii|milioane|milion)?\s*(?:de\s+)?(?:firme|companii)', text, re.I)}
    return t


def facts_allowlist(root):
    f = os.path.join(root, '.github', 'geo', 'facts.json')
    out = set()
    if os.path.isfile(f):
        d = json.load(open(f, encoding='utf-8'))
        out |= {('email', x.lower()) for x in d.get('emails', [])}
        out |= {('tel', re.sub(r'\D', '', x)[-9:]) for x in d.get('phones', [])}
        out |= {('host', x.lower()) for x in d.get('hosts', [])}
    return out


def repo_tokens(root):
    acc = set()
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in ('.git', 'node_modules', 'assets')]
        for f in fn:
            if f.endswith(('.html', '.json', '.txt', '.md', '.xml')):
                try:
                    acc |= tokens(read(os.path.join(dp, f)))
                except Exception:
                    pass
    return acc


def check_edit(root, rel, new, known):
    """Întoarce motivul respingerii sau None."""
    if '..' in rel.split('/') or rel.startswith('/') or '\\' in rel:
        return 'cale nepermisă'
    if not any(fnmatch.fnmatch(rel, pat) for pat in ALLOWED):
        return 'fișier în afara listei permise'
    p = os.path.join(root, rel)
    old = read(p) if os.path.isfile(p) else ''
    if old and len(new) < 0.6 * len(old):
        return 'șterge peste 40 %% din fișier (%d -> %d)' % (len(old), len(new))
    if rel.endswith('.json'):
        try:
            json.loads(new)
        except Exception as e:
            return 'JSON invalid: %s' % e
    if rel.endswith('.html') and old:
        if re.search(r'<h1', old) and not re.search(r'<h1', new):
            return 'elimină <h1>'
        c_old = GS.canonical(old)
        if c_old and GS.canonical(new) != c_old:
            return 'schimbă canonical'
    fresh = tokens(new) - tokens(old) - known
    if fresh:
        return 'introduce fapte neexistente în repository/facts.json: %s' % sorted(fresh)[:4]
    return None


def finalize(root):
    """Recalculare deterministă (nu face agentul): hash-urile din verification.json și proof.json."""
    vp = os.path.join(root, 'geo', 'verification.json')
    if not os.path.isfile(vp):
        return
    v = json.load(open(vp, encoding='utf-8'))
    for e in v.get('file_inventory', []):
        fp = os.path.join(root, e['path'])
        if e['path'] == 'geo/verification.json' or not os.path.isfile(fp):
            continue
        b = open(fp, 'rb').read()
        e['local_bytes'], e['local_sha256'] = len(b), hashlib.sha256(b).hexdigest()
    open(vp, 'w', encoding='utf-8').write(json.dumps(v, ensure_ascii=False, indent=2) + '\n')
    pp = os.path.join(root, 'proof.json')
    if os.path.isfile(pp):
        pr = json.load(open(pp, encoding='utf-8'))
        if 'sha256' in pr and pr.get('sha256') not in (None, 'NOT_GENERATED'):
            b = open(vp, 'rb').read()
            pr['sha256'] = hashlib.sha256(b).hexdigest()
            if isinstance(pr.get('anchored_artifact'), dict):
                pr['anchored_artifact'].update({'sha256': pr['sha256'], 'bytes': len(b)})
            open(pp, 'w', encoding='utf-8').write(json.dumps(pr, ensure_ascii=False, indent=2) + '\n')


def score(root):
    R = GS.Repo(root)
    S, pages = GS.run(R)
    G = GS.gates(R, pages)
    pts = {'PASS': 1.0, 'PARTIAL': 0.5, 'FAIL': 0.0}
    meas = [s for s in S.values() if s['status'] in pts]
    ind = round(100 * sum(pts[s['status']] for s in meas) / len(meas), 1)
    GS.annotate(S, G)
    return {'ind': ind, 'S': S, 'G': G, 'fine': GS.fine_progress(S, G)}


def rank(x):
    return {'PASS': 2, 'PARTIAL': 1, 'FAIL': 0}.get(x, -1)


def regressions(a, b):
    r = []
    for k, s in a['S'].items():
        if rank(b['S'][k]['status']) < rank(s['status']):
            r.append('semnal %s: %s -> %s' % (k, s['status'], b['S'][k]['status']))
    ga = {g['id']: g['ok'] for g in a['G']}
    for g in b['G']:
        if ga.get(g['id']) and not g['ok']:
            r.append('poarta %s a căzut' % g['id'])
    return r


def actionable(sc):
    items = []
    for k, s in sc['S'].items():
        if s['status'] in ('PARTIAL', 'FAIL') and not s.get('needs_operator'):
            items.append({'type': 'semnal', 'id': k, 'name': s['name'], 'status': s['status'], 'why': s['why'], 'files': s['files']})
    for g in sc['G']:
        if not g['ok'] and g['id'] not in GS.NEEDS_OPERATOR:
            items.append({'type': 'poarta', 'id': g['id'], 'name': g['name'], 'why': g['detail'], 'files': g['files']})
    return items


def build_prompt(root, items, facts):
    files = []
    for it in items:
        for f in it['files']:
            if f not in files and any(fnmatch.fnmatch(f, p) for p in ALLOWED) and os.path.isfile(os.path.join(root, f)):
                files.append(f)
    blob, budget = [], 90000
    for f in files:
        t = read(os.path.join(root, f))
        if len(t) > budget:
            continue
        budget -= len(t)
        blob.append('=== FILE %s ===\n%s' % (f, t))
    system = ('Ești un editor tehnic pentru site-ul FirmsFinder (firmsfinder.eu). Corectezi DOAR defectele listate, '
              'modificând cât mai puțin. Reguli ferme: (1) nu inventa fapte, numere de firme, dovezi, aprobări, rezultate de teste AI, '
              'e-mailuri, telefoane sau domenii; folosește doar ce e deja în fișiere sau în FACTS; (2) nu atinge: %s; '
              '(3) nu marca nimic ca „verificat” sau „aprobat”; (4) păstrează textul vizibil și datele structurate identice între ele; '
              '(5) dacă un defect cere o informație pe care nu o ai, nu-l rezolva și spune-o în notes. '
              'Răspunde EXCLUSIV cu un obiect JSON: {"edits":[{"path":"...","content":"<conținutul COMPLET nou al fișierului>"}],"notes":"..."}.'
              % FORBIDDEN_NOTE)
    user = 'FACTS (singurele fapte noi permise):\n%s\n\nDEFECTE DE REZOLVAT:\n%s\n\n%s' % (
        json.dumps(facts, ensure_ascii=False, indent=1), json.dumps(items, ensure_ascii=False, indent=1), '\n\n'.join(blob))
    return system, user


def call_model(system, user, it):
    mock = os.environ.get('GEO_AGENT_MOCK')
    if mock:
        seq = json.load(open(mock, encoding='utf-8'))
        return seq[min(it, len(seq) - 1)], {'input': 0, 'output': 0}
    key = os.environ.get('ANTHROPIC_API_KEY')
    body = {'model': os.environ.get('GEO_AGENT_MODEL', 'claude-sonnet-5-5'), 'max_tokens': 32000, 'system': system,
            'messages': [{'role': 'user', 'content': user}]}
    req = urllib.request.Request(API, data=json.dumps(body).encode(), headers={
        'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            d = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit('API HTTP %s: %s' % (e.code, e.read()[:300]))
    txt = ''.join(b.get('text', '') for b in d.get('content', []))
    m = re.search(r'\{.*\}', txt, re.S)
    out = json.loads(m.group(0)) if m else {'edits': [], 'notes': 'răspuns fără JSON'}
    u = d.get('usage', {})
    return out, {'input': u.get('input_tokens', 0), 'output': u.get('output_tokens', 0)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='.')
    ap.add_argument('--max-iter', type=int, default=10)
    ap.add_argument('--target', type=float, default=90.0)
    ap.add_argument('--report', default='geo-loop-report.md')
    a = ap.parse_args()
    root = os.path.abspath(a.root)
    max_iter = min(a.max_iter, 10)  # plafon dur
    have_ai = bool(os.environ.get('ANTHROPIC_API_KEY') or os.environ.get('GEO_AGENT_MOCK'))
    facts_file = os.path.join(root, '.github', 'geo', 'facts.json')
    facts = json.load(open(facts_file, encoding='utf-8')) if os.path.isfile(facts_file) else {}
    known = facts_allowlist(root) | repo_tokens(root)

    base = score(root)
    cur = base
    log, stall, stop = [], 0, None
    tokens_used = {'input': 0, 'output': 0}
    changed = {}
    for it in range(max_iter):
        items = actionable(cur)
        failing_g = [g for g in cur['G'] if not g['ok'] and g['id'] not in GS.NEEDS_OPERATOR]
        if cur['ind'] >= a.target and not failing_g:
            stop = 'țintă atinsă'
            break
        if not items:
            stop = 'rămân doar defecte care cer decizii/date ale operatorului'
            break
        if not have_ai:
            stop = 'fără ANTHROPIC_API_KEY: rulat doar scorerul'
            break
        system, user = build_prompt(root, items, facts)
        resp, usage = call_model(system, user, it)
        tokens_used['input'] += usage['input']
        tokens_used['output'] += usage['output']
        snap, rejected, applied = {}, [], []
        for e in resp.get('edits', []):
            rel, new = e.get('path', ''), e.get('content', '')
            why = check_edit(root, rel, new, known)
            if why:
                rejected.append((rel, why))
                continue
            p = os.path.join(root, rel)
            snap[rel] = read(p) if os.path.isfile(p) else None
            os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
            open(p, 'w', encoding='utf-8', newline='').write(new)
            applied.append(rel)
        if applied:
            for rel in ('geo/verification.json', 'proof.json'):
                p = os.path.join(root, rel)
                if os.path.isfile(p) and rel not in snap:
                    snap[rel] = read(p)
            finalize(root)
        new_sc = score(root)
        regs = regressions(cur, new_sc)
        improved = new_sc['fine'] > cur['fine']
        verdict = 'acceptat'
        if regs:
            verdict = 'ANULAT (regresii: %s)' % '; '.join(regs)
        elif not applied:
            verdict = 'nimic aplicat'
        elif not improved:
            verdict = 'ANULAT (fără îmbunătățire)'
        if verdict.startswith('ANULAT'):
            for rel, old in snap.items():
                p = os.path.join(root, rel)
                if old is None:
                    os.remove(p)
                else:
                    open(p, 'w', encoding='utf-8', newline='').write(old)
            stall += 1
        elif verdict == 'nimic aplicat':
            stall += 1
        else:
            stall = 0
            cur = new_sc
            for rel in applied:
                changed[rel] = True
        log.append({'iter': it + 1, 'applied': applied, 'rejected': rejected, 'verdict': verdict, 'ind': cur['ind'],
                    'notes': (resp.get('notes') or '')[:400]})
        if stall >= 2:
            stop = 'fără progres 2 iterații la rând'
            break
    else:
        stop = 'plafon de %d iterații atins' % max_iter
    final = score(root)
    md = ['# Raport buclă GEO', '',
          '**Început:** %.1f %% → **Final:** %.1f %% (țintă %.0f %%) · **Oprire:** %s' % (base['ind'], final['ind'], a.target, stop),
          '**Iterații rulate:** %d / %d · **Tokeni model:** %d intrare, %d ieșire' % (len(log), max_iter, tokens_used['input'], tokens_used['output']), '',
          '## Iterații', '', '| # | Aplicat | Respins de cod | Verdict | Indicator |', '|--:|---|---|---|--:|']
    for l in log:
        md.append('| %d | %s | %s | %s | %.1f %% |' % (l['iter'], ', '.join(l['applied']) or '—',
                                                      '; '.join('%s: %s' % r for r in l['rejected']) or '—', l['verdict'], l['ind']))
    md += ['', '## Rămas pentru operator (agentul nu are voie să rezolve)', '']
    for k, s in final['S'].items():
        if s.get('needs_operator') and s['status'] != 'PASS':
            md.append('- Semnal %s %s (%s): %s' % (k, s['name'], s['status'], s['needs_operator']))
    for g in final['G']:
        if g.get('needs_operator') and not g['ok']:
            md.append('- Poarta %s: %s' % (g['id'], g['needs_operator']))
    left = [x for x in actionable(final)]
    md += ['', '## Rămas fără rezolvare automată', ''] + (['- %s %s: %s' % (x['type'], x['id'], x['why']) for x in left] or ['- nimic'])
    md += ['', '## Fișiere modificate', ''] + (['- ' + f for f in sorted(changed)] or ['- niciunul'])
    md += ['', '> Indicatorul măsoară acoperirea on-site după un scorer determinist; nu este scor de vizibilitate AI. '
               'Nicio modificare nu este publicată: pull request-ul trebuie aprobat de operator.']
    open(os.path.join(root, a.report), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    print('\n'.join(md))
    json.dump({'start': base['ind'], 'final': final['ind'], 'stop': stop, 'iterations': log, 'changed': sorted(changed)},
              open(os.path.join(root, 'geo-loop-result.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    sys.exit(0)


if __name__ == '__main__':
    main()
