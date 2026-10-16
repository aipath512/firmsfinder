#!/usr/bin/env python3
"""Verifică că angajamentul public (angajament.json) corespunde codului și schemei. Pică dacă:
 - amprenta SHA-256 nu corespunde, sau arhiva versiunii diferă de fișierul curent;
 - schema SQL are coloane nedeclarate (sau declarate dar inexistente);
 - o coloană „cu_acord” nu este blocată de baza de date atunci când nu există acord;
 - endpointul scrie alte coloane decât cele declarate, citește IP/forwarded sau are altă retenție decât cea declarată;
 - o pagină (sau un șablon de firmă) nu are blocul din footer cu textul exact al versiunii curente;
 - pagina /cautare/ declară alte durate decât angajamentul.
Rulare: python3 verify_angajament.py   (cod de ieșire 1 la eșec)"""
import json, re, sys, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
rez = []
def ok(nume, trecut, detaliu=''):
    rez.append((nume, bool(trecut), detaliu))

def citeste(p): return (ROOT / p).read_text(encoding='utf-8')

d = json.loads(citeste('angajament.json'))
decl = d.get('content_sha256')
calc_obj = {k: v for k, v in d.items() if k != 'content_sha256'}
calc = hashlib.sha256(json.dumps(calc_obj, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
ok('amprenta SHA-256 corespunde', decl == calc, f'{decl} vs {calc}')

arh = ROOT / 'angajament' / 'versiuni' / f'v{d["versiune"]}_{d["data"]}.json'
ok('arhiva versiunii există și este identică', arh.is_file() and arh.read_text(encoding='utf-8') == citeste('angajament.json'), str(arh.name))

sql = citeste('backend/market_intent_events_v1.1_2026-10-16.sql')
corp = sql[sql.index('CREATE TABLE'):sql.index(');\nCREATE INDEX')]
coloane = []
for linie in corp.splitlines()[1:]:
    m = re.match(r'^ ([a-z_]+) (TEXT|INTEGER)\b', linie)
    if m: coloane.append(m.group(1))
ok('coloanele din schemă = coloanele declarate', set(coloane) == set(d['coloane']), f'doar în SQL: {set(coloane)-set(d["coloane"])}; doar în JSON: {set(d["coloane"])-set(coloane)}')
ok('clase de coloane valide', set(d['coloane'].values()) <= {'tehnic', 'fara_acord', 'cu_acord'})

mc = re.search(r'CHECK\(consent_state=\'granted\' OR \((.*?)\)\)\n\);', sql, re.S)
bloc_check = mc.group(1) if mc else ''
for col, cls in d['coloane'].items():
    if cls == 'cu_acord':
        gata = (f'{col}=\'{{}}\'' in bloc_check) if col == 'filters_json' else (f'{col} IS NULL' in bloc_check)
        ok(f'baza blochează „{col}” fără acord', gata)
for col, cls in d['coloane'].items():
    if cls == 'fara_acord':
        ok(f'„{col}” (fără acord) nu este blocată fără motiv', (f'{col} IS NULL' not in bloc_check))

js = citeste('functions/api/jurnal.js')
ins = re.search(r'INSERT INTO market_intent_events \((.*?)\)\s+VALUES', js, re.S)
cols_ins = {c.strip() for c in ins.group(1).split(',')} if ins else set()
cu_default = set(re.findall(r'^ ([a-z_]+) [A-Z]+ NOT NULL DEFAULT', corp, re.M))
ok('endpointul scrie doar coloane declarate, iar cele omise au valoare implicită în schemă', cols_ins <= set(d['coloane']) and (set(d['coloane']) - cols_ins) <= cu_default, f'în plus: {cols_ins-set(d["coloane"])}; omise fără default: {(set(d["coloane"])-cols_ins)-cu_default}')
ok('retenție cu acord = declarată', re.search(r'ZILE_CU_ACORD = (\d+)', js).group(1) == str(d['retentie']['cu_acord_zile']))
ok('retenție fără acord = declarată', re.search(r'LUNI_FARA_ACORD = (\d+)', js).group(1) == str(d['retentie']['fara_acord_luni']))
ok('endpointul nu citește IP sau forwarded', not re.search(r'cf-connecting-ip|x-forwarded-for|x-real-ip|request\.cf\b', js, re.I))
heads = re.findall(r'headers\.get\(\'([a-z-]+)\'\)', js)
ok('endpointul citește doar user-agent (filtru boți) și content-length', set(heads) <= {'user-agent', 'content-length'}, str(heads))
ok('user-agent nu ajunge în bază', 'user-agent' not in js.split('INSERT INTO')[1])

versiune = d['versiune']
text = d['text_footer']
import html as h
marker = f'<!--angajament:{versiune}-->'
pagini = [p for p in ROOT.rglob('*.html') if '.git' not in p.parts and p.name != 'homepage-link.html']
sabl = [ROOT / 'functions/firme/[cui].js', ROOT / 'backend/onsite.mjs']
for p in pagini + sabl:
    t = p.read_text(encoding='utf-8')
    rel = str(p.relative_to(ROOT))
    ok(f'footer angajament în {rel}', t.count(marker) == 1 and h.escape(text) in t and '/angajament/' in t and 'angajament.css' in t)
    ok(f'fără versiuni vechi în {rel}', len(re.findall(r'<!--angajament:', t)) == 1)

for p in [ROOT / 'angajament/index.html']:
    t = p.read_text(encoding='utf-8')
    ok('pagina /angajament/ conține amprenta curentă', d['content_sha256'] in t)

cautare = citeste('cautare/index.html')
ok('/cautare/ declară 24 de luni și 30 de zile', f'{d["retentie"]["fara_acord_luni"]} de luni' in cautare and f'{d["retentie"]["cu_acord_zile"]} de zile' in cautare)
ok('/cautare/ spune că jurnalul nu e activ cât timp JSON spune așa', d['jurnal_activ_in_productie'] or 'id="jurnal-inactiv"' in cautare)
ok('/cautare/ are butoane de acord, refuz și retragere', all(i in cautare for i in ('id="jurnal-da"', 'id="jurnal-nu"', 'id="jurnal-retrage"')))

ins_path = ROOT / d['ai_act']['insigna']['imagine'].lstrip('/')
ok('imaginea insignei există', ins_path.is_file(), str(ins_path))

pica = [r for r in rez if not r[1]]
for nume, trecut, det in rez:
    if not trecut:
        print('FAIL', nume, det)
print(f'{len(rez)-len(pica)}/{len(rez)} verificări trecute')
sys.exit(1 if pica else 0)
