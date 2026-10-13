#!/usr/bin/env python3
"""FirmsFinder GEO acceptance: local structural tests and optional live HTTP tests."""
import json,sys,urllib.request,urllib.error,os,re
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parent
checks=[]
def record(name,passed,detail=''):
 checks.append({'control':name,'result':'PASS' if passed else 'FAIL','detail':detail})
def read(p):return (ROOT/p).read_text(encoding='utf-8')
def data(p):return json.loads(read(p))
for p in sorted(ROOT.rglob('*.json')):
 try:json.loads(p.read_text(encoding='utf-8'));record('json:'+str(p.relative_to(ROOT)),True)
 except Exception as e:record('json:'+str(p.relative_to(ROOT)),False,str(e))
manifest=data('geo/manifest.json')
for u in manifest['artifacts']:
 p=u.split('firmsfinder.eu/',1)[-1]
 record('manifest:'+p,(ROOT/p).is_file())
intents=data('geo/intents.json')['intents'];record('intent_count_150',len(intents)==150,str(len(intents)))
for i in intents:
 urls=i.get('target_pages') or []
 record('intent:'+i['id'],bool(urls),'no target' if not urls else '')
 for url in urls:
  if url.startswith('https://firmsfinder.eu/'):
   rel=url.split('firmsfinder.eu/',1)[1].split('#')[0]
   target=ROOT/('index.html' if not rel else (rel+'index.html' if rel.endswith('/') else rel))
   record('target:'+i['id'],target.is_file(),str(target.relative_to(ROOT)))
   if '#' in url and target.is_file():
    frag=url.rsplit('#',1)[1]
    record('anchor:'+i['id'],bool(re.search(r'id=[\"\']'+re.escape(frag)+r'[\"\']',read(target))),frag)
claims=data('geo/claims.json')['claims'];evidence=data('geo/evidence.json')['evidence_records']
ids={e['id'] for e in evidence}
record('claim_count_15',len(claims)==15)
for c in claims:
 record('claim:'+c['id'],bool(c.get('statement')) and all(e in ids for e in c.get('evidence_refs',[])))
record('guide', (ROOT/'geo/ghid/index.html').is_file())
if '--live' in sys.argv:
 urls=['/','/robots.txt','/llms.txt','/despre/','/surse/','/geo/dataset.json','/geo/ghid/']+[u.split('firmsfinder.eu',1)[-1] for u in manifest['artifacts']]
 for path in dict.fromkeys(urls):
  url='https://firmsfinder.eu'+path
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'FirmsFinder-Geo-Acceptance/1.0'})
   with urllib.request.urlopen(req,timeout=12) as r:
    content=r.read(2_000_000);ctype=r.headers.get('Content-Type','')
    ok=r.status==200 and (not path.endswith('.json') or ('json' in ctype.lower() and isinstance(json.loads(content),(dict,list))))
    record('LIVE:'+path,ok,f'HTTP {r.status}; {ctype}; {len(content)} bytes')
  except Exception as e:record('LIVE:'+path,False,str(e))
result={'scope':'LOCAL + LIVE' if '--live' in sys.argv else 'LOCAL ONLY','passed':sum(x['result']=='PASS' for x in checks),'failed':sum(x['result']=='FAIL' for x in checks),'checks':checks}
(ROOT/'GEO_ACCEPTANCE_RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS',result['passed'],'FAIL',result['failed'],'SCOPE',result['scope'])
for c in checks:
 if c['result']=='FAIL':print('FAIL',c['control'],c['detail'])
sys.exit(1 if result['failed'] else 0)
