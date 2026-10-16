#!/usr/bin/env python3
"""Construiește angajamentul public din angajament.json (sursa unică):
 1) calculează amprenta SHA-256 (JSON canonic, fără câmpul content_sha256);
 2) scrie arhiva imutabilă angajament/versiuni/v<versiune>_<data>.json (refuză să o modifice);
 3) generează pagina /angajament/;
 4) injectează blocul din footer în toate paginile HTML și în șabloanele server (firme).
Rulare: python3 scripts/build_angajament.py   (idempotent)"""
import json, hashlib, html, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SURSA = ROOT / 'angajament.json'
SKIP = {'homepage-link.html'}  # fragment, nu pagină
TEMPLATES = [ROOT / 'functions/firme/[cui].js', ROOT / 'backend/onsite.mjs']
MARKER = re.compile(r'<footer><!--angajament:[^>]*-->.*?<!--/angajament--></footer>|<!--angajament:[^>]*-->.*?<!--/angajament-->', re.S)

def canonic(d):
    d = {k: v for k, v in d.items() if k != 'content_sha256'}
    return json.dumps(d, sort_keys=True, ensure_ascii=False, separators=(',', ':'))

def sha(d):
    return hashlib.sha256(canonic(d).encode('utf-8')).hexdigest()

def serializeaza(d):
    return json.dumps(d, indent=2, ensure_ascii=False) + '\n'

def bloc(d):
    ins = d['ai_act']['insigna']
    return (f'<!--angajament:{d["versiune"]}--><div class="angajament"><link rel="stylesheet" href="/angajament.css">'
            f'<a class="angajament-badge" href="{html.escape(ins["trimite_la"])}" rel="noopener">'
            f'<img src="{html.escape(ins["imagine"])}" width="96" height="96" alt="EU AI Act Ready: kit cu 70 de documente, 10 module" loading="lazy"></a>'
            f'<p>{html.escape(d["text_footer"])} <a href="/angajament/">Citiți și verificați amprenta</a> · <a href="/angajament.json">JSON</a><br>'
            f'<small>Insigna trimite la kitul EU AI Act Ready (70 de documente, 10 module). Nu este o certificare oficială și nu atestă conformitatea acestui site.</small></p></div><!--/angajament-->')

def injecteaza(text, b, ext):
    text = MARKER.sub('', text)
    if ext == '.html':
        if '</footer>' in text:
            i = text.rindex('</footer>')
            return text[:i] + b + text[i:]
        for fin in ('</body>', '</html>'):
            if fin in text:
                i = text.rindex(fin)
                return text[:i] + '<footer>' + b + '</footer>' + text[i:]
        return text + '<footer>' + b + '</footer>'
    # șabloane server: înainte de închiderea paginii
    a = '</main></body></html>'
    assert text.count(a) == 1, 'șablon neașteptat'
    return text.replace(a, '</main><footer>' + b + '</footer></body></html>')

def pagina(d, versiuni):
    esc = html.escape
    af = ''.join(f'<li><strong>{esc(x["id"])}.</strong> {esc(x["text"])}</li>' for x in d['afirmatii'])
    lim = ''.join(f'<li>{esc(x)}</li>' for x in d['limite_recunoscute'])
    leg = ''.join(f'<li>{esc(x["act"])}, art. {esc(x["articole"])}</li>' for x in d['legislatie_relevanta'])
    nu = ', '.join(esc(x) for x in d['nu_memoram'])
    grup = {'fara_acord': [], 'cu_acord': [], 'tehnic': []}
    for k, v in d['coloane'].items():
        grup[v].append(k)
    cl = ''.join(f'<tr><th scope="row">{t}</th><td>{esc(", ".join(grup[k]))}</td></tr>' for k, t in
                 [('fara_acord', 'Fără acord (numărători)'), ('cu_acord', 'Numai cu acord'), ('tehnic', 'Tehnice (identificator de rând, versiune, date, expirare)')])
    ver = ''.join(f'<li><a href="/angajament/versiuni/{esc(v)}">{esc(v)}</a></li>' for v in versiuni)
    ret = d['retentie']
    return f'''<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angajament de transparență v{esc(d["versiune"])} | FirmsFinder</title><meta name="description" content="Ce memorăm când căutați pe FirmsFinder, cât timp, ce nu memorăm și cum puteți verifica acest angajament."><link rel="canonical" href="https://firmsfinder.eu/angajament/"><link rel="stylesheet" href="/onsite.css"></head><body><main><nav aria-label="Navigație"><a href="/">Acasă</a><a href="/cautare/">Căutare</a><a href="/surse/">Surse</a><a href="/contact/">Contact</a></nav><h1>Angajament de transparență</h1><p><strong>Versiunea {esc(d["versiune"])}, {esc(d["data"])}.</strong> Operator: {esc(d["operator"])}. Stare juridică: <strong>{esc(d["stare_juridica"].replace("_", " ").lower())}</strong>. Jurnal activ în producție: <strong>{"da" if d["jurnal_activ_in_productie"] else "nu"}</strong>.</p><p>{esc(d["principiu"])}</p><p>{esc(d["scop"])}</p><h2>Ce afirmăm</h2><ul>{af}</ul><h2>Ce memorăm, pe coloane</h2><table><tbody>{cl}</tbody></table><p>Păstrare: fără acord {ret["fara_acord_luni"]} de luni; cu acord cel mult {ret["cu_acord_zile"]} de zile. Nu memorăm: {nu}.</p><h2>Limite pe care le recunoaștem</h2><ul>{lim}</ul><h2>Temei legal și AI Act</h2><ul>{leg}</ul><p>{esc(d["ai_act"]["art_50"])}</p><p>{esc(d["ai_act"]["insigna"]["semnificatie"])}</p><h2>Cum verificați</h2><p>Amprenta SHA-256 a acestui angajament este <code id="amprenta">{esc(d["content_sha256"])}</code>. Metoda: {esc(d["verificare"]["metoda"])}.</p><p><button type="button" id="verifica">Verifică amprenta în browserul meu</button></p><p id="verifica-rez" role="status"></p><p>Schema bazei de date și testele care păzesc acest angajament sunt publice în depozitul proiectului (<code>backend/market_intent_events_v1.1_2026-10-16.sql</code>, <code>tests/jurnal.test.mjs</code>, <code>verify_angajament.py</code>).</p><h2>Versiuni anterioare</h2><ul>{ver}</ul></main><script src="/angajament-verifica.js" defer></script></body></html>'''

def main():
    d = json.loads(SURSA.read_text(encoding='utf-8'))
    d['content_sha256'] = sha(d)
    out = serializeaza(d)
    SURSA.write_text(out, encoding='utf-8')
    arh = ROOT / 'angajament' / 'versiuni'
    arh.mkdir(parents=True, exist_ok=True)
    f = arh / f'v{d["versiune"]}_{d["data"]}.json'
    if f.exists() and f.read_text(encoding='utf-8') != out:
        sys.exit(f'REFUZ: {f.name} există și diferă. Creșteți versiunea în angajament.json, nu modificați arhiva.')
    f.write_text(out, encoding='utf-8')
    versiuni = sorted(p.name for p in arh.glob('v*.json'))
    (ROOT / 'angajament' / 'index.html').write_text(pagina(d, versiuni), encoding='utf-8')
    b = bloc(d)
    n = 0
    for p in sorted(ROOT.rglob('*.html')):
        if '.git' in p.parts or p.name in SKIP or p.relative_to(ROOT).parts[0] == 'node_modules':
            continue
        s = p.read_text(encoding='utf-8')
        t = injecteaza(s, b, '.html')
        if t != s:
            p.write_text(t, encoding='utf-8')
        n += 1
    for p in TEMPLATES:
        s = p.read_text(encoding='utf-8')
        t = injecteaza(s, b, p.suffix)
        if t != s:
            p.write_text(t, encoding='utf-8')
        n += 1
    print('OK', d['versiune'], d['content_sha256'], f'{n} fișiere cu bloc')

if __name__ == '__main__':
    main()
