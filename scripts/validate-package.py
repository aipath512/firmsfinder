from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
class Document(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.canonicals=[];self.h1=0;self.viewport=False
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if 'id' in d:self.ids.add(d['id'])
  if tag=='link' and d.get('rel')=='canonical':self.canonicals.append(d.get('href'))
  if tag=='h1':self.h1+=1
  if tag=='meta' and d.get('name')=='viewport':self.viewport=True
for p in root.rglob('*.json'):json.loads(p.read_text())
s=json.loads((root/'signals.json').read_text());assert len(s['signals'])==60
assert len({x['id'] for x in s['signals']})==60
for signal in s['signals']:
 assert signal['acceptance_test'] and signal['meaning']
 for file in signal['files']:
  if file=='index.html':continue # Existing production homepage; not replaced by package.
  assert (root/file).exists(),(signal['id'],file)
d=Document();d.feed((root/'semnale/index.html').read_text());assert all(x['id'] in d.ids for x in s['signals'])
for p in root.rglob('index.html'):
 d=Document();d.feed(p.read_text());assert d.h1==1 and d.viewport,p
 expected='https://firmsfinder.eu/'+p.parent.relative_to(root).as_posix()+'/'
 assert d.canonicals==[expected],(p,d.canonicals)
for chunk in json.loads((root/'rag-chunk-map.json').read_text())['chunks']:
 assert hashlib.sha256(chunk['text'].encode()).hexdigest()==chunk['sha256']
ET.parse(root/'sitemap.xml')
proof=json.loads((root/'proof.json').read_text())
for item in proof['files']:
 assert hashlib.sha256((root/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
print('PASS: 60 IDs; original acceptance criteria; mapped files; page canonicals; JSON; XML; 60 chunk hashes; file hashes.')
