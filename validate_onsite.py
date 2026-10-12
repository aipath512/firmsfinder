from pathlib import Path
import json, hashlib, xml.etree.ElementTree as ET
r=Path(__file__).resolve().parent
m=json.loads((r/'onsite-manifest.json').read_text(encoding='utf-8'))
assert m['count']==len(m['signals'])==60
for x in m['signals']:
    p=r/x['filename']
    assert p.is_file(), x['filename']
    assert hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256'], x['filename']
    if p.suffix=='.json': json.loads(p.read_text(encoding='utf-8'))
ET.parse(r/'sitemap.xml')
j=json.loads((r/'intents.json').read_text(encoding='utf-8'))
from collections import Counter
c=Counter(x['family'] for x in j['intents'])
assert len(j['intents'])==150 and c=={'CAUTA':50,'FII_GASIT':50,'DELEAGA_AI_ULUI':50},c
assert len({x['id'] for x in j['intents']})==150
print('PASS: 60 semnale, SHA256, JSON/XML, 150 intenții 50/50/50')
